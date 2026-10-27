export async function GET() {
  return Response.json({ ok: true, service: "aurum-bms", time: new Date().toISOString() });
}
