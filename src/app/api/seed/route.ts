import { buildSeed } from "@/lib/seed";

// Fresh demo data with dates relative to the request time.
export async function GET() {
  return Response.json(buildSeed(), { headers: { "Cache-Control": "no-store" } });
}
