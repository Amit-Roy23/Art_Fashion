export async function GET() {
  return Response.json({ ok: true, service: "layek-jewels-bms", time: new Date().toISOString() });
}
