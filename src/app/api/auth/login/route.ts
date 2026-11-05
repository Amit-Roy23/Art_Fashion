import { createSession, sessionCookie, verifySecret } from "@/server/auth";
import { allUsers, credentials, HttpError } from "@/server/data";
import { mongo } from "@/server/mongo";
import { body, cleanPhone, route } from "@/server/session";

const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;

// Sign in with mobile number + password (staff) or PIN (karigar).
export const POST = route(async (req) => {
  const b = await body<{ phone: string; secret: string }>(req);
  const phone = cleanPhone(b.phone);
  const wrong = new HttpError(401, "Wrong mobile number or password");
  if (phone.length !== 10 || !b.secret) throw wrong;
  const db = await mongo();
  const candidates = (await allUsers()).filter((u) => cleanPhone(u.phone) === phone);
  for (const user of candidates) {
    const cred = await credentials(db).findOne({ _id: user.id });
    if (!cred) continue;
    if (cred.lockedUntil > Date.now()) {
      const mins = Math.ceil((cred.lockedUntil - Date.now()) / 60000);
      throw new HttpError(429, `Too many wrong attempts — try again in ${mins} minute${mins > 1 ? "s" : ""}`);
    }
    if (await verifySecret(String(b.secret), cred.hash)) {
      if (user.active === false) throw new HttpError(403, "This login is switched off — ask the owner");
      await credentials(db).updateOne({ _id: user.id }, { $set: { failed: 0, lockedUntil: 0 } });
      return Response.json(
        { ok: true, user },
        {
          headers: {
            "Set-Cookie": sessionCookie(createSession(user.id, cred.sid)),
          },
        },
      );
    }
    const failed = cred.failed + 1;
    await credentials(db).updateOne(
      { _id: user.id },
      {
        $set: failed >= MAX_TRIES ? { failed: 0, lockedUntil: Date.now() + LOCK_MS } : { failed },
      },
    );
    if (failed >= MAX_TRIES) throw new HttpError(429, "Too many wrong attempts — this login is locked for 15 minutes");
  }
  throw wrong;
});
