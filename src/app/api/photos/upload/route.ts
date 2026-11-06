import { savePhoto } from "@/server/data";
import { body, requireUser, route } from "@/server/session";

// Stores one photo (data: URL) and returns its permanent URL.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const b = await body<{ data: string }>(req);
  return Response.json({
    url: await savePhoto(String(b.data ?? ""), user.name),
  });
});
