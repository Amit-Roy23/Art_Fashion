import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "demo_key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo_secret",
  secure: true,
});

export interface CloudinarySignatureParams {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

/**
 * Generates a signed upload ticket for direct, client-to-Cloudinary upload
 */
export function generateUploadSignature(): CloudinarySignatureParams {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const env = process.env.NODE_ENV || "development";
  const folder = `bms/${env}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET || "demo_secret"
  );

  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "demo_key",
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo",
  };
}

/**
 * Returns an optimized thumbnail URL using Cloudinary URL transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;

  const width = options.width || 300;
  const height = options.height || 300;
  const crop = options.crop || "fill";
  const transformation = `w_${width},h_${height},c_${crop},q_auto,f_auto`;

  return url.replace("/upload/", `/upload/${transformation}/`);
}
