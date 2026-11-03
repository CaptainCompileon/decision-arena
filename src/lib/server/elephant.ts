import "server-only";
import { toAnswer } from "../answers";
import { ELEPHANT, costUsd } from "../providers";
import type { Answer, DecisionRequest, DecisionResult } from "../types";

type SystemOneAnswer = {
  type: string;
  choice?: string;
  noul?: number;
  probabilities?: Record<string, number>;
};

type SystemOneResponse = {
  answers: Record<string, SystemOneAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

function toSystemOneState(state: DecisionRequest["state"]) {
  if (typeof state === "string") return state;
  return {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: state.text },
          ...state.images.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
  };
}

export async function decideWithElephant(
  req: DecisionRequest,
  apiKey: string,
): Promise<DecisionResult> {
  const started = performance.now();
  const res = await fetch(ELEPHANT.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ELEPHANT.model,
      state: toSystemOneState(req.state),
      questions: req.questions,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    throw new Error(`Baseten ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = (await res.json()) as SystemOneResponse;

  const answers: Record<string, Answer> = {};
  for (const [name, q] of Object.entries(req.questions)) {
    const a = body.answers?.[name];
    if (!a) throw new Error(`Baseten returned no answer for "${name}"`);
    if (q.type === "noul") {
      const p = Number(a.noul);
      answers[name] = toAnswer(q, { yes: p, no: 1 - p });
    } else if (q.type === "score") {
      // Levels come back keyed by index; accept the level text as well.
      const byIndex: Record<string, number> = {};
      for (const [k, p] of Object.entries(a.probabilities ?? {})) {
        const i = /^\d+$/.test(k) ? Number(k) : q.criteria.indexOf(k);
        if (i >= 0) byIndex[String(i)] = p;
      }
      answers[name] = toAnswer(q, byIndex);
    } else {
      answers[name] = toAnswer(q, a.probabilities ?? {});
    }
  }

  const usage = {
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  };
  return {
    model: "elephant",
    answers,
    latencyMs,
    usage,
    costUsd: costUsd(ELEPHANT.price, usage),
  };
}
