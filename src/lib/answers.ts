import type { Answer, Question } from "./types";

// The option names an answer's probabilities are keyed by.
export function optionsOf(q: Question): string[] {
  if (q.type === "choice") return Object.keys(q.criteria);
  if (q.type === "noul") return ["yes", "no"];
  return q.criteria.map((_, i) => String(i));
}

export function optionLabel(q: Question, option: string): string {
  if (q.type === "score") return q.criteria[Number(option)] ?? option;
  return option;
}

// Fills in missing options, clamps junk and rescales to sum to 1, so a sloppy
// model reply can still be scored.
export function toAnswer(q: Question, raw: Record<string, unknown>): Answer {
  const options = optionsOf(q);
  const probs: Record<string, number> = {};
  for (const o of options) {
    const v = Number(raw[o]);
    probs[o] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  const total = options.reduce((s, o) => s + probs[o], 0);
  for (const o of options) probs[o] = total > 0 ? probs[o] / total : 1 / options.length;

  let pick = options[0];
  for (const o of options) if (probs[o] > probs[pick]) pick = o;
  return { type: q.type, probabilities: probs, pick, confidence: probs[pick] };
}

// Mean of the score levels weighted by probability, e.g. 1.4 = just above level 1.
export function expectedScore(a: Answer): number {
  return Object.entries(a.probabilities).reduce((s, [k, p]) => s + Number(k) * p, 0);
}
