import { meta } from "@/server/data";
import { mongo } from "@/server/mongo";
import { requireUser, route } from "@/server/session";

// Latest save number — browsers poll this to pick up other people's changes.
export const GET = route(async (req) => {
  await requireUser(req);
  return Response.json({ rev: (await meta(await mongo()))?.rev ?? 0 });
});
