import { isLive, mongo } from "@/server/mongo";
import { meta } from "@/server/data";
import { currentUser } from "@/server/session";

// Tells the app whether it runs as the browser-only demo or against the live database.
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isLive()) return Response.json({ live: false }, { headers });
  try {
    const ready = !!(await meta(await mongo()));
    const user = ready ? await currentUser(req) : null;
    return Response.json({ live: true, ready, user }, { headers });
  } catch (e) {
    console.error(e);
    return Response.json(
      {
        live: true,
        error: "Can't reach the database — please try again in a minute",
      },
      { status: 503, headers },
    );
  }
}
