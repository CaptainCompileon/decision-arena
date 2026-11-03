import { CHALLENGER_PROVIDERS } from "@/lib/providers";
import { decideWithChallenger, ImagesNotSupported } from "@/lib/server/challenger";
import { decideWithElephant } from "@/lib/server/elephant";
import { serverKey } from "@/lib/server/keys";
import type { ChallengerConfig, DecisionRequest, ModelId } from "@/lib/types";

type Body = {
  model: ModelId;
  request: DecisionRequest;
  challenger?: ChallengerConfig;
  sessionId?: string;
};

// A pass-through proxy: the browser sends the user's own key in a header, we
// forward it to the provider and never store or log it.
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!body?.request?.questions || body.request.state == null) {
    return Response.json({ error: "Missing request.state or request.questions" }, { status: 400 });
  }

  try {
    if (body.model === "elephant") {
      const key = request.headers.get("x-baseten-key") || serverKey("elephant");
      if (!key) return Response.json({ error: "No Baseten API key" }, { status: 401 });
      return Response.json(await decideWithElephant(body.request, key));
    }

    if (body.model === "challenger") {
      const config = body.challenger;
      if (!config || !(config.provider in CHALLENGER_PROVIDERS) || !config.model) {
        return Response.json({ error: "Unknown challenger provider" }, { status: 400 });
      }
      const key = request.headers.get("x-challenger-key") || serverKey("challenger");
      if (!key) return Response.json({ error: "No challenger API key" }, { status: 401 });
      const session = body.sessionId || crypto.randomUUID();
      return Response.json(await decideWithChallenger(body.request, config, key, session));
    }

    return Response.json({ error: "model must be elephant or challenger" }, { status: 400 });
  } catch (err) {
    if (err instanceof ImagesNotSupported) {
      return Response.json({ error: err.message, unsupported: true }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
