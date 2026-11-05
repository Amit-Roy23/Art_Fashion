import { commit, HttpError } from "@/server/data";
import { body, requireUser, route } from "@/server/session";
import type { Diff } from "@/lib/diff";

// Saves one change set from the browser (see src/server/data.ts commit()).
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const b = await body<{ baseRev: number; diff: Diff }>(req);
  if (!Number.isInteger(b.baseRev) || !b.diff || typeof b.diff.arrays !== "object") throw new HttpError(400, "Bad change set");
  const out = await commit(user, b.baseRev, b.diff);
  return Response.json(user.role === "KARIGAR" ? { rev: out.rev, applied: out.applied, missed: null } : out);
});
