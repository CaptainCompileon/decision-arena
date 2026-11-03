import "server-only";
import type { ModelId } from "../types";

// Keys from .env.local, so a local run works without pasting keys into the
// page. Leave these unset on a public deployment: there every visitor brings
// their own key.
export function serverKey(model: ModelId): string | undefined {
  const value = model === "elephant" ? process.env.BASETEN_API_KEY : process.env.CHALLENGER_API_KEY;
  return value?.trim() || undefined;
}
