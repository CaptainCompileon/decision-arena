import { DEFAULT_CHALLENGER } from "./providers";
import type { ChallengerConfig, DecisionRequest, DecisionResult, ModelId } from "./types";
import type { BenchItem } from "./usecases";

export type Settings = {
  basetenKey: string;
  challengerKey: string;
  challenger: ChallengerConfig;
};

export const DEFAULT_SETTINGS: Settings = {
  basetenKey: "",
  challengerKey: "",
  challenger: DEFAULT_CHALLENGER,
};

const SETTINGS_KEY = "decision-arena:settings";

// Keys stay in this browser's localStorage and only travel to our own /api
// proxy, one request at a time.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Private mode or blocked storage: settings last for this visit only.
  }
}

export type DecideOutcome =
  | { ok: true; result: DecisionResult }
  | { ok: false; error: string; unsupported?: boolean };

export async function decide(
  model: ModelId,
  request: DecisionRequest,
  settings: Settings,
  sessionId: string,
): Promise<DecideOutcome> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.basetenKey) headers["x-baseten-key"] = settings.basetenKey;
  if (settings.challengerKey) headers["x-challenger-key"] = settings.challengerKey;
  try {
    const res = await fetch("/api/decide", {
      method: "POST",
      headers,
      body: JSON.stringify({ model, request, challenger: settings.challenger, sessionId }),
    });
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}`, unsupported: body.unsupported };
    return { ok: true, result: body as DecisionResult };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const dataUrlCache = new Map<string, Promise<string>>();

// Baseten wants images inline (or on a cloud bucket), so public/ paths are
// fetched once and turned into data URLs.
export function toDataUrl(path: string): Promise<string> {
  let cached = dataUrlCache.get(path);
  if (!cached) {
    cached = fetch(path)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      );
    dataUrlCache.set(path, cached);
  }
  return cached;
}

export async function stateOf(item: Pick<BenchItem, "text" | "images">): Promise<DecisionRequest["state"]> {
  if (!item.images?.length) return item.text;
  return { text: item.text, images: await Promise.all(item.images.map(toDataUrl)) };
}

// Runs tasks with at most `limit` in flight, to stay under provider rate limits.
export async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
