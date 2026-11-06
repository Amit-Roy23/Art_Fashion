import { hashSecret, newId } from "@/server/auth";
import { credentials, findUser, HttpError } from "@/server/data";
import { mongo } from "@/server/mongo";
import { body, requireUser, route } from "@/server/session";

// Owner sets a user's password (staff, 8+ characters) or PIN (karigar, 4–6 digits).
// Setting a new one signs that user out everywhere.
export const POST = route(async (req) => {
  const me = await requireUser(req);
  if (me.role !== "OWNER") throw new HttpError(403, "Only the owner can set passwords");
  const b = await body<{ userId: string; secret: string }>(req);
  const user = await findUser(String(b.userId));
  if (!user) throw new HttpError(404, "User not found — wait a moment for the new user to save, then try again");
  const secret = String(b.secret ?? "");
  if (user.role === "KARIGAR" ? !/^\d{4,6}$/.test(secret) : secret.length < 8)
    throw new HttpError(400, user.role === "KARIGAR" ? "PIN must be 4 to 6 digits" : "Password must be at least 8 characters");
  const db = await mongo();
  await credentials(db).replaceOne({ _id: user.id }, { hash: await hashSecret(secret), sid: newId(), failed: 0, lockedUntil: 0 }, { upsert: true });
  return Response.json({ ok: true });
});

// Which users have a login set (no secrets returned).
export const GET = route(async (req) => {
  const me = await requireUser(req);
  if (me.role !== "OWNER") throw new HttpError(403, "Only the owner can see logins");
  const db = await mongo();
  const list = await credentials(db)
    .find({}, { projection: { _id: 1, lockedUntil: 1 } })
    .toArray();
  return Response.json({
    users: list.map((c) => ({ id: c._id, locked: c.lockedUntil > Date.now() })),
  });
});
