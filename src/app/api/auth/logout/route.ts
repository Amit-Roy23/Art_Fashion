import { sessionCookie } from "@/server/auth";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": sessionCookie(null),
        "Cache-Control": "no-store",
      },
    },
  );
}
