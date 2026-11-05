import { createSession, hashSecret, newId, sessionCookie } from "@/server/auth";
import { credentials, HttpError, meta, setupDatabase } from "@/server/data";
import { mongo } from "@/server/mongo";
import { body, cleanPhone, route } from "@/server/session";
import type { User } from "@/lib/types";

// First run: creates the owner login on an empty database. Needs BMS_SETUP_KEY.
export const POST = route(async (req) => {
  const b = await body<{
    key: string;
    name: string;
    phone: string;
    password: string;
  }>(req);
  const key = process.env.BMS_SETUP_KEY;
  if (!key) throw new HttpError(403, "Set BMS_SETUP_KEY on the server first");
  if (b.key !== key) throw new HttpError(403, "Wrong setup key");
  const db = await mongo();
  if (await meta(db)) throw new HttpError(409, "Already set up — sign in instead");
  const phone = cleanPhone(b.phone);
  if (!b.name?.trim() || phone.length !== 10) throw new HttpError(400, "Enter your name and 10-digit mobile number");
  if ((b.password ?? "").length < 8) throw new HttpError(400, "Owner password must be at least 8 characters");
  const owner: User = {
    id: "u-" + newId(6),
    name: b.name.trim(),
    role: "OWNER",
    title: "Owner",
    phone,
    active: true,
  };
  const sid = newId();
  await credentials(db).replaceOne({ _id: owner.id }, { hash: await hashSecret(b.password), sid, failed: 0, lockedUntil: 0 }, { upsert: true });
  await setupDatabase(owner, {});
  return Response.json({ ok: true, user: owner }, { headers: { "Set-Cookie": sessionCookie(createSession(owner.id, sid)) } });
});
