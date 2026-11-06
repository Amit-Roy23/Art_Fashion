import { changesSince, karigarView, loadAll } from "@/server/data";
import { requireUser, route } from "@/server/session";

// GET /api/db            → the whole database (what this user may see) at the latest save
// GET /api/db?since=REV  → only what changed after save REV (staff)
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const since = Number(new URL(req.url).searchParams.get("since"));
  if (user.role !== "KARIGAR" && Number.isInteger(since) && since > 0) {
    const { rev, diff } = await changesSince(since);
    return Response.json({ rev, diff, user });
  }
  const { rev, db } = await loadAll();
  return Response.json({
    rev,
    db: user.role === "KARIGAR" ? karigarView(db, user) : db,
    user,
  });
});
