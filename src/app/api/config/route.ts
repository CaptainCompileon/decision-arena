import { connection } from "next/server";
import { serverKey } from "@/lib/server/keys";

// Tells the page which keys the server already has, never the keys themselves.
export async function GET() {
  await connection();
  return Response.json({
    serverKeys: { elephant: !!serverKey("elephant"), challenger: !!serverKey("challenger") },
  });
}
