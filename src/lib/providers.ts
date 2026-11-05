import type { ChallengerProviderId } from "./types";

// Prices are USD per 1M tokens. elephant-1's come from its Baseten library
// page. The DeepSeek prices are off-peak list prices from a third-party
// write-up and are only an estimate: an OpenCode Go plan is a flat monthly fee.
export const ELEPHANT = {
  url: "https://inference.baseten.co/v1/systemone",
  model: "decision-models/baseten-elephant-9b-latest",
  label: "elephant-1 (9B)",
  price: { input: 0.035, output: 0 },
};

// The community MLX conversion, served by the repo's own serve.py with the
// same /v1/systemone API. Local, so it costs nothing per call. Only enabled
// off Vercel, where 127.0.0.1 is the developer's own machine.
export const LOCAL_ELEPHANT = {
  model: "elephant-1",
  label: "elephant-1 · MLX 4-bit (local)",
  repo: "0x36/elephant-1-9B-MLX-4bit",
  price: { input: 0, output: 0 },
};

type ChallengerProvider = {
  label: string;
  baseUrl: string;
  defaultModel: string;
  price: { input: number; output: number };
  keyHint: string;
};

// The proxy only ever forwards to these hosts, so a deployed copy can't be
// used to relay requests anywhere else.
export const CHALLENGER_PROVIDERS: Record<ChallengerProviderId, ChallengerProvider> = {
  "opencode-go": {
    label: "OpenCode Go",
    baseUrl: "https://opencode.ai/inference/go/openai/v1",
    defaultModel: "deepseek-v4.1-flash",
    price: { input: 0.15, output: 0.6 },
    keyHint: "opencode.ai console → API keys",
  },
  deepseek: {
    label: "DeepSeek API",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-v4.1-flash",
    price: { input: 0.15, output: 0.6 },
    keyHint: "platform.deepseek.com → API keys",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "deepseek/deepseek-v4.1-flash",
    price: { input: 0.15, output: 0.6 },
    keyHint: "openrouter.ai → Keys",
  },
};

export const DEFAULT_CHALLENGER = {
  provider: "opencode-go" as const,
  model: CHALLENGER_PROVIDERS["opencode-go"].defaultModel,
};

export function costUsd(
  price: { input: number; output: number },
  usage: { inputTokens: number; outputTokens: number },
) {
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1e6;
}
