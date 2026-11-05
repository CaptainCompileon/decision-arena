import { connection } from "next/server";
import { serverKey } from "@/lib/server/keys";
import { localBackend } from "@/lib/server/local";

// Tells the page which keys the server already has (never the keys themselves)
// and which self-hosted elephant-1 answers, if any.
export async function GET() {
  await connection();
  return Response.json({
    serverKeys: { elephant: !!serverKey("elephant"), challenger: !!serverKey("challenger") },
    local: await localBackend(),
  });
}
