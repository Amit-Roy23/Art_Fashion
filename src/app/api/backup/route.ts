import { HttpError, loadAll } from "@/server/data";
import { requireUser, route } from "@/server/session";

// Owner: download everything (except photos and passwords) as one JSON file.
export const GET = route(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Only the owner can download a backup");
  const { rev, db } = await loadAll();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(
    JSON.stringify(
      {
        app: "arts-fashion-bms",
        rev,
        exportedAt: new Date().toISOString(),
        db,
      },
      null,
      1,
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="arts-fashion-backup-${stamp}.json"`,
      },
    },
  );
});
