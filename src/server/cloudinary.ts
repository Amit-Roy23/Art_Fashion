// Optional photo storage on Cloudinary (CDN). Configure either
//   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
// or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.
// Without it, photos are stored in MongoDB. Uses Cloudinary's signed upload REST API (no SDK).
import { createHash } from "node:crypto";

interface Config {
  cloud: string;
  key: string;
  secret: string;
  folder: string;
}

export function cloudinaryConfig(): Config | null {
  const folder = process.env.CLOUDINARY_FOLDER || "arts-fashion";
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/.exec(url.trim());
    if (m) return { key: decodeURIComponent(m[1]), secret: decodeURIComponent(m[2]), cloud: m[3], folder };
  }
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  return cloud && key && secret ? { cloud, key, secret, folder } : null;
}

/** Cloudinary request signature: SHA-1 of the sorted parameters followed by the API secret. */
export function sign(params: Record<string, string | number>, secret: string) {
  const base = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(base + secret)
    .digest("hex");
}

/** Uploads one image (data: URL). The id is the image's content hash, so the same photo is stored once. */
export async function uploadToCloudinary(cfg: Config, dataUrl: string, id: string): Promise<string> {
  const params = { folder: cfg.folder, overwrite: "false", public_id: id, timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  form.set("api_key", cfg.key);
  form.set("signature", sign(params, cfg.secret));
  form.set("file", dataUrl);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloud)}/image/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) throw new Error(`Cloudinary upload failed (${res.status}): ${json.error?.message ?? "no URL returned"}`);
  return json.secure_url;
}
