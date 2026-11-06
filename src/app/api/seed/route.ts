import { buildSeed } from "@/lib/seed";
import { isLive } from "@/server/mongo";

// Fresh demo data with dates relative to the request time. Not available in live mode.
export async function GET() {
  if (isLive()) return Response.json({ error: "Not available" }, { status: 404 });
  return Response.json(buildSeed(), {
    headers: { "Cache-Control": "no-store" },
  });
}
