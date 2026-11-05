import "server-only";
import { toAnswer } from "../answers";
import { ELEPHANT, LOCAL_ELEPHANT, costUsd } from "../providers";
import type { Answer, DecisionRequest, DecisionResult, ModelId } from "../types";
import { ImagesNotSupported } from "./challenger";
import { localBackend, localElephantUrl } from "./local";

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

type Endpoint = {
  model: ModelId;
  name: string; // for error messages
  url: string;
  body: { model: string };
  headers: Record<string, string>;
  price: { input: number; output: number };
  timeoutMs: number;
};

export function decideWithElephant(req: DecisionRequest, apiKey: string) {
  return systemOne(req, {
    model: "elephant",
    name: "Baseten",
    url: ELEPHANT.url,
    body: { model: ELEPHANT.model },
    headers: { Authorization: `Bearer ${apiKey}` },
    price: ELEPHANT.price,
    timeoutMs: 60_000,
  });
}

// The MLX conversion has no vision tower, so there image items are skipped
// like they are for the challenger. llama-server sees images when it was
// started with the GGUF's --mmproj.
export async function decideWithLocal(req: DecisionRequest) {
  const base = localElephantUrl();
  const backend = await localBackend();
  if (!base || !backend) throw new Error("No local elephant-1 server found");
  if (typeof req.state !== "string" && !backend.images) {
    throw new ImagesNotSupported(
      backend.kind === "mlx"
        ? "The MLX conversion is text-only (no vision tower)"
        : "llama-server was started without --mmproj, so it can't see images",
    );
  }
  return systemOne(req, {
    model: "local",
    name: `Local ${backend.kind} server`,
    url: `${base}/v1/systemone`,
    body: { model: LOCAL_ELEPHANT.model },
    headers: {},
    price: LOCAL_ELEPHANT.price,
    // A Mac runs one request at a time and can be slow, so give it room.
    timeoutMs: 180_000,
  });
}

async function systemOne(req: DecisionRequest, ep: Endpoint): Promise<DecisionResult> {
  const started = performance.now();
  const res = await fetch(ep.url, {
    method: "POST",
    headers: { ...ep.headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...ep.body,
      state: toSystemOneState(req.state),
      questions: req.questions,
    }),
    signal: AbortSignal.timeout(ep.timeoutMs),
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    throw new Error(`${ep.name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = (await res.json()) as SystemOneResponse;

  const answers: Record<string, Answer> = {};
  for (const [name, q] of Object.entries(req.questions)) {
    const a = body.answers?.[name];
    if (!a) throw new Error(`${ep.name} returned no answer for "${name}"`);
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
    model: ep.model,
    answers,
    latencyMs,
    usage,
    costUsd: costUsd(ep.price, usage),
  };
}
