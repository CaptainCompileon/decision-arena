import "server-only";
import { LOCAL_ELEPHANT } from "../providers";
import type { LocalBackend } from "../types";

// Where a self-hosted elephant-1 answers /v1/systemone: the MLX server on
// this Mac (npm run mlx) by default, or llama-server on another machine via
// LOCAL_ELEPHANT_URL. Never on Vercel: there 127.0.0.1 is the function's own
// sandbox, not the visitor's machine.
export function localElephantUrl(): string | undefined {
  const url = process.env.LOCAL_ELEPHANT_URL?.trim() || (process.env.VERCEL ? undefined : "http://127.0.0.1:8765");
  return url?.replace(/\/$/, "");
}

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(1500), cache: "no-store" });
  return res.ok ? res.json() : null;
}

// Something else may be on the port, so each kind of server has to name the
// model. serve.py does it in /health; llama-server only reports the file it
// loaded, in /props, along with whether a vision projector is loaded.
async function detect(url: string): Promise<LocalBackend | null> {
  const health = await getJson(`${url}/health`).catch(() => null);
  if (health?.model === LOCAL_ELEPHANT.model) {
    return { kind: "mlx", label: LOCAL_ELEPHANT.label, images: false };
  }
  const props = await getJson(`${url}/props`).catch(() => null);
  const file = String(props?.model_path ?? "").split(/[\\/]/).pop() ?? "";
  if (/elephant/i.test(file)) {
    const quant = file.match(/(I?Q\d_[A-Z0-9_]+?|BF16|F16)(?=\.gguf$)/i)?.[1] ?? "GGUF";
    return { kind: "llama.cpp", label: `elephant-1 · llama.cpp ${quant} (local)`, images: !!props?.modalities?.vision };
  }
  return null;
}

// Checked on every page load and before every local call; a short cache keeps
// a benchmark from asking ~100 times.
let cached: { at: number; value: Promise<LocalBackend | null> } | null = null;

export function localBackend(): Promise<LocalBackend | null> {
  const url = localElephantUrl();
  if (!url) return Promise.resolve(null);
  if (!cached || Date.now() - cached.at > 5_000) {
    cached = { at: Date.now(), value: detect(url).catch(() => null) };
  }
  return cached.value;
}
