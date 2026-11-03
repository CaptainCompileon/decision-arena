import "server-only";
import { optionsOf, toAnswer } from "../answers";
import { CHALLENGER_PROVIDERS, costUsd } from "../providers";
import type { Answer, ChallengerConfig, DecisionRequest, DecisionResult, Question } from "../types";

export class ImagesNotSupported extends Error {}

const SYSTEM_PROMPT = `You are a decision engine. You get a STATE and named QUESTIONS.
For every question, give a probability for every option, as calibrated as you can:
an option you give 0.8 should be right about 80% of the time.
Reply with JSON only, no prose and no code fences, in exactly this shape:
{"answers": {"<question name>": {"<option>": <probability>, ...}, ...}, "reason": "<one short sentence>"}
Use the option names exactly as given. Probabilities of one question sum to 1.`;

function describeQuestion(name: string, q: Question): string {
  const options =
    q.type === "choice"
      ? Object.entries(q.criteria).map(([k, v]) => `  - "${k}": ${v}`)
      : q.type === "noul"
        ? [`  - "yes"`, `  - "no"`]
        : q.criteria.map((level, i) => `  - "${i}": ${level}`);
  const kind = q.type === "score" ? " (ordered levels, lowest first)" : "";
  return `"${name}": ${q.instructions}${kind}\n${options.join("\n")}`;
}

export function buildPrompt(req: DecisionRequest): string {
  const state = typeof req.state === "string" ? req.state : req.state.text;
  const questions = Object.entries(req.questions).map(([n, q]) => describeQuestion(n, q));
  return `STATE:\n${state}\n\nQUESTIONS:\n${questions.join("\n\n")}`;
}

// Takes the first {...} block, since some models wrap JSON in prose or fences.
function parseJson(text: string): { answers?: Record<string, Record<string, unknown>>; reason?: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Challenger reply had no JSON");
  return JSON.parse(text.slice(start, end + 1));
}

export async function decideWithChallenger(
  req: DecisionRequest,
  config: ChallengerConfig,
  apiKey: string,
  sessionId: string,
): Promise<DecisionResult> {
  if (typeof req.state !== "string" && req.state.images.length > 0) {
    throw new ImagesNotSupported("This challenger model can't see images");
  }
  const provider = CHALLENGER_PROVIDERS[config.provider];
  const started = performance.now();
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenCode Go asks clients to name themselves and keep a stable session id.
      "User-Agent": "decision-arena/0.1",
      "x-opencode-session": sessionId,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(req) },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    throw new Error(`${provider.label} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  const text: string = body.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(text);

  const answers: Record<string, Answer> = {};
  for (const [name, q] of Object.entries(req.questions)) {
    const raw = parsed.answers?.[name] ?? {};
    // Tolerate {"p_yes": 0.8} or {"yes": true}-style slips on yes/no questions.
    if (q.type === "noul" && !("yes" in raw) && "p_yes" in raw) {
      const p = Number(raw.p_yes);
      answers[name] = toAnswer(q, { yes: p, no: 1 - p });
    } else {
      const keyed = Object.fromEntries(optionsOf(q).map((o) => [o, raw[o]]));
      answers[name] = toAnswer(q, keyed);
    }
  }

  const usage = {
    inputTokens: body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
  };
  return {
    model: "challenger",
    answers,
    latencyMs,
    usage,
    costUsd: costUsd(provider.price, usage),
    reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
  };
}
