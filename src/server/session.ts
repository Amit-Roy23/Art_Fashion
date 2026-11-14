// Request helpers for the live-mode API routes.
import type { User } from "@/lib/types";
import { readSession } from "./auth";
import { credentials, currentSettings, findUser, HttpError } from "./data";
import { idleLimitMs } from "@/lib/autologout";
import { isLive, mongo } from "./mongo";

/** The signed-in user, or null. A password reset or a disabled account ends existing sessions. */
export async function currentUser(req: Request): Promise<User | null> {
  const s = readSession(req);
  if (!s) return null;
  const db = await mongo();
  const cred = await credentials(db).findOne({ _id: s.uid });
  if (!cred || cred.sid !== s.sid) return null;
  const user = await findUser(s.uid);
  if (!user || user.active === false) return null;
  // signed out automatically after a period without activity (the browser reports activity to /api/auth/touch)
  const limit = idleLimitMs(await currentSettings(), user.role);
  if (limit && Date.now() - s.last > limit + IDLE_GRACE_MS) return null;
  return user;
}

/** Allowance for a slow network between the browser's own timer and the server's check. */
const IDLE_GRACE_MS = 30_000;

export async function requireUser(req: Request): Promise<User> {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, "Please sign in again");
  return u;
}

/** Wraps a route handler: live mode only, JSON errors, no caching. */
export function route(handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    if (!isLive()) return Response.json({ error: "Live mode is not configured" }, { status: 404 });
    try {
      const res = await handler(req, ctx);
      if (!res.headers.has("Cache-Control")) res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Server error — please try again" }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Bad request");
  }
}

/** Normalises an Indian mobile number to its last 10 digits. */
export const cleanPhone = (p: string) =>
  String(p ?? "")
    .replace(/\D/g, "")
    .slice(-10);
