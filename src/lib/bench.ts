import type { DecideOutcome } from "./client";
import type { Answer, ChallengerConfig, DecisionRequest, ModelId, Question } from "./types";
import type { UseCase } from "./usecases";

export type ItemRun = {
  itemId: string;
  runs: Partial<Record<ModelId, DecideOutcome>>;
  // Same item with choice options in reverse order, to catch position bias.
  flipped: Partial<Record<ModelId, DecideOutcome>>;
};

export type BenchRun = {
  useCaseId: string;
  finishedAt: string;
  challenger: ChallengerConfig;
  items: ItemRun[];
};

export const MODELS: ModelId[] = ["elephant", "challenger"];

// Reverses option order of every choice question. The option names stay the
// same, so answers can be compared directly with the original run.
export function flipRequest(req: DecisionRequest): DecisionRequest {
  const questions: Record<string, Question> = {};
  for (const [name, q] of Object.entries(req.questions)) {
    questions[name] =
      q.type === "choice"
        ? { ...q, criteria: Object.fromEntries(Object.entries(q.criteria).reverse()) }
        : q;
  }
  return { ...req, questions };
}

export const hasChoice = (u: UseCase) => Object.values(u.questions).some((q) => q.type === "choice");

// One scored (question, answer) pair.
type Scored = { answer: Answer; label: string; correct: boolean };

// Brier score over all options, halved so it runs 0 (perfect) to 1 (confidently wrong).
function brier(a: Answer, label: string) {
  let sum = 0;
  for (const [o, p] of Object.entries(a.probabilities)) sum += (p - (o === label ? 1 : 0)) ** 2;
  return sum / 2;
}

export type CalibrationBin = { lo: number; hi: number; n: number; confidence: number; accuracy: number };

export type ModelStats = {
  answered: number; // question-answers scored
  calls: number;
  errors: number;
  unsupported: number;
  accuracy: number;
  brier: number;
  ece: number;
  bins: CalibrationBin[];
  flipRate: number | null; // null when the run has no choice questions to flip
  flipChecked: number;
  medianLatencyMs: number;
  costUsd: number;
  costPer1k: number; // USD per 1,000 decisions (one call per item)
};

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function calibrationBins(scored: Scored[], count = 5): CalibrationBin[] {
  const bins: CalibrationBin[] = Array.from({ length: count }, (_, i) => ({
    lo: i / count,
    hi: (i + 1) / count,
    n: 0,
    confidence: 0,
    accuracy: 0,
  }));
  for (const s of scored) {
    const i = Math.min(count - 1, Math.floor(s.answer.confidence * count));
    bins[i].n++;
    bins[i].confidence += s.answer.confidence;
    bins[i].accuracy += s.correct ? 1 : 0;
  }
  for (const b of bins) {
    if (b.n) {
      b.confidence /= b.n;
      b.accuracy /= b.n;
    }
  }
  return bins;
}

// With sharedOnly, items that any model couldn't answer are left out, so the
// headline numbers compare the same questions.
export function score(
  useCases: UseCase[],
  runs: BenchRun[],
  model: ModelId,
  { sharedOnly = false } = {},
): ModelStats {
  const scored: Scored[] = [];
  const latencies: number[] = [];
  let calls = 0;
  let errors = 0;
  let unsupported = 0;
  let cost = 0;
  let flipChecked = 0;
  let flips = 0;

  for (const run of runs) {
    const uc = useCases.find((u) => u.id === run.useCaseId);
    if (!uc) continue;
    for (const ir of run.items) {
      const item = uc.items.find((i) => i.id === ir.itemId);
      const out = ir.runs[model];
      if (!item || !out) continue;
      if (sharedOnly && MODELS.some((m) => ir.runs[m]?.ok === false)) continue;
      if (!out.ok) {
        if (out.unsupported) unsupported++;
        else errors++;
        continue;
      }
      calls++;
      latencies.push(out.result.latencyMs);
      cost += out.result.costUsd;
      for (const [name, a] of Object.entries(out.result.answers)) {
        const label = item.labels[name];
        if (label != null) scored.push({ answer: a, label, correct: a.pick === label });
      }
      const flipped = ir.flipped[model];
      if (flipped?.ok) {
        for (const [name, q] of Object.entries(uc.questions)) {
          if (q.type !== "choice") continue;
          flipChecked++;
          if (flipped.result.answers[name]?.pick !== out.result.answers[name]?.pick) flips++;
        }
      }
    }
  }

  const bins = calibrationBins(scored);
  const n = scored.length;
  const ece = n ? bins.reduce((s, b) => s + (b.n / n) * Math.abs(b.accuracy - b.confidence), 0) : 0;
  return {
    answered: n,
    calls,
    errors,
    unsupported,
    accuracy: n ? scored.filter((s) => s.correct).length / n : 0,
    brier: n ? scored.reduce((s, x) => s + brier(x.answer, x.label), 0) / n : 0,
    ece,
    bins,
    flipRate: flipChecked ? flips / flipChecked : null,
    flipChecked,
    medianLatencyMs: median(latencies),
    costUsd: cost,
    costPer1k: calls ? (cost / calls) * 1000 : 0,
  };
}

export type CascadePoint = {
  threshold: number;
  accuracy: number;
  escalated: number; // share of items handed to the challenger
  costPer1k: number;
  answered: number;
};

// Elephant answers first; any item where its least-confident answer is below
// the threshold goes to the challenger. Simulated from benchmark runs, so
// moving the slider costs nothing.
export function cascade(useCases: UseCase[], runs: BenchRun[], threshold: number): CascadePoint {
  let correct = 0;
  let answered = 0;
  let items = 0;
  let escalated = 0;
  let cost = 0;

  for (const run of runs) {
    const uc = useCases.find((u) => u.id === run.useCaseId);
    if (!uc) continue;
    for (const ir of run.items) {
      const item = uc.items.find((i) => i.id === ir.itemId);
      const e = ir.runs.elephant;
      if (!item || !e?.ok) continue;
      const c = ir.runs.challenger;
      items++;
      cost += e.result.costUsd;
      const minConfidence = Math.min(...Object.values(e.result.answers).map((a) => a.confidence));
      let answers = e.result.answers;
      if (minConfidence < threshold && c?.ok) {
        escalated++;
        cost += c.result.costUsd;
        answers = c.result.answers;
      }
      for (const [name, a] of Object.entries(answers)) {
        const label = item.labels[name];
        if (label == null) continue;
        answered++;
        if (a.pick === label) correct++;
      }
    }
  }
  return {
    threshold,
    accuracy: answered ? correct / answered : 0,
    escalated: items ? escalated / items : 0,
    costPer1k: items ? (cost / items) * 1000 : 0,
    answered,
  };
}
