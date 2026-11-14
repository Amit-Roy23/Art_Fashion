import { createSession, readSession, sessionCookie } from "@/server/auth";
import { requireUser, route } from "@/server/session";

// The browser calls this (at most once a minute) while the person is using the app,
// which keeps them signed in. Background checks for updates do not call it.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const s = readSession(req)!;
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(createSession(user.id, s.sid)) } });
});
