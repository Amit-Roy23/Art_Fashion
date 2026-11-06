import { readPhoto } from "@/server/data";
import { requireUser, route } from "@/server/session";

export const GET = route(async (req, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  const p = /^[a-f0-9]{32}$/.test(id) ? await readPhoto(id) : null;
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(p.data.buffer), {
    headers: {
      "Content-Type": p.type,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
