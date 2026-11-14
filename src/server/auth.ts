// Passwords / PINs (scrypt) and signed session cookies (HMAC-SHA256). Node built-ins only.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const COOKIE = "lj_session";
const SESSION_DAYS = 14;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters");
  return s;
}

export async function hashSecret(pw: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(pw, salt, 64)).toString("hex");
  return ["scrypt", salt, hash].join("$");
}

export async function verifySecret(pw: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = await scryptAsync(pw, salt, 64);
  const want = Buffer.from(hash, "hex");
  return want.length === got.length && timingSafeEqual(want, got);
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

/**
 * Session token: user id + login id + expiry + last activity, signed. The login id lets a password
 * reset end old sessions; `last` lets the server sign people out after a period without activity.
 */
export function createSession(uid: string, sid: string, last = Date.now()) {
  const body = b64(JSON.stringify({ uid, sid, exp: Date.now() + SESSION_DAYS * 864e5, last }));
  return body + "." + sign(body);
}

export interface Session {
  uid: string;
  sid: string;
  /** last time the person used the app (ms); 0 for sessions made before auto sign-out existed */
  last: number;
}

export function readSession(req: Request): Session | null {
  const raw = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [body, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const v = JSON.parse(Buffer.from(body, "base64url").toString());
    return v.exp > Date.now() && typeof v.uid === "string" ? { uid: v.uid, sid: v.sid, last: Number(v.last) || 0 } : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string | null) {
  const secure = process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1" ? "; Secure" : "";
  return token
    ? `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`
    : `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export const newId = (bytes = 12) => randomBytes(bytes).toString("hex");
