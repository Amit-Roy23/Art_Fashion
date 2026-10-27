"use client";
import imageCompression from "browser-image-compression";

/** Compresses a camera/gallery image and returns a data URL small enough for browser storage. */
export async function compressToDataUrl(file: File): Promise<string> {
  const small = await imageCompression(file, { maxWidthOrHeight: 1100, maxSizeMB: 0.18, useWebWorker: true, initialQuality: 0.8, fileType: "image/jpeg" });
  return imageCompression.getDataUrlFromFile(small);
}

/** Fetches any image URL (bundled demo photo or data URL) as a data URL — used to embed photos in PDFs. */
export async function urlToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const SAMPLE_KEYS = [
  "ring-solitaire",
  "ring-ruby",
  "ring-emerald",
  "necklace-ruby",
  "necklace-sapphire",
  "choker-emerald",
  "choker-ruby",
  "jhumka-ruby",
  "jhumka-emerald",
  "bangle",
  "pendant-sapphire",
  "pendant-ruby",
  "tikka",
  "bracelet",
  "nath",
  "chain",
];
export const sampleUrl = (key: string, look: "sketch" | "raw" | "final") => `/demo/${key}-${look}.jpg`;
