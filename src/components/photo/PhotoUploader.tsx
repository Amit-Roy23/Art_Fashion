"use client";

import * as React from "react";
import imageCompression from "browser-image-compression";
import { Camera, Upload, Trash2, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoInput } from "@/schemas/photo";
import { toast } from "sonner";

interface PhotoUploaderProps {
  photos: PhotoInput[];
  onChange: (photos: PhotoInput[]) => void;
  required?: boolean;
  maxPhotos?: number;
  label?: string;
  allowCamera?: boolean;
  capture?: string;
}

export function PhotoUploader({
  photos = [],
  onChange,
  required = false,
  maxPhotos = 10,
  label = "Upload Photos",
  allowCamera = true,
  capture,
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (photos.length + fileList.length > maxPhotos) {
      toast.error(`Maximum of ${maxPhotos} photos allowed`);
      return;
    }

    setIsUploading(true);
    const uploadedPhotos: PhotoInput[] = [];

    try {
      // 1. Fetch Cloudinary signature from API
      let signData: {
        timestamp: number;
        folder: string;
        signature: string;
        apiKey: string;
        cloudName: string;
      } | null = null;

      try {
        const signRes = await fetch("/api/upload/sign", { method: "POST" });
        if (signRes.ok) {
          signData = await signRes.json();
        }
      } catch (err) {
        console.warn("Sign endpoint not accessible, using fallback preview", err);
      }

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // 2. Client-side compression (max ~1600px, ~300KB)
        const compressionOptions = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        };

        let compressedFile: File = file;
        try {
          compressedFile = await imageCompression(file, compressionOptions);
        } catch (e) {
          console.warn("Image compression skipped:", e);
        }

        // 3. Upload directly to Cloudinary if configured, or generate base64/placeholder
        if (
          signData &&
          signData.apiKey &&
          signData.apiKey !== "demo_key" &&
          signData.cloudName !== "demo"
        ) {
          const formData = new FormData();
          formData.append("file", compressedFile);
          formData.append("api_key", signData.apiKey);
          formData.append("timestamp", String(signData.timestamp));
          formData.append("signature", signData.signature);
          formData.append("folder", signData.folder);

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!uploadRes.ok) {
            throw new Error("Failed to upload to Cloudinary");
          }

          const resData = await uploadRes.json();
          uploadedPhotos.push({
            publicId: resData.public_id,
            url: resData.secure_url,
            width: resData.width,
            height: resData.height,
            caption: "",
            uploadedAt: new Date().toISOString(),
          });
        } else {
          // Dev / Preview fallback: convert to base64 Data URL so local testing works without cloud keys
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(compressedFile);
          });

          uploadedPhotos.push({
            publicId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            url: dataUrl,
            caption: "",
            uploadedAt: new Date().toISOString(),
          });
        }
      }

      onChange([...photos, ...uploadedPhotos]);
      toast.success(
        `Uploaded ${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? "s" : ""}`
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading photos. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const updated = [...photos];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[11px] text-neutral-400">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      {/* Hidden file and camera inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}

      {/* Upload button triggers */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading || photos.length >= maxPhotos}
          onClick={() => fileInputRef.current?.click()}
          className="border-dashed border-amber-400/80 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-600" />
          ) : (
            <Upload className="mr-2 h-4 w-4 text-amber-600" />
          )}
          {isUploading ? "Compressing & Uploading..." : "Choose Files"}
        </Button>

        {allowCamera && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || photos.length >= maxPhotos}
            onClick={() => cameraInputRef.current?.click()}
            className="border-dashed border-neutral-300 hover:border-neutral-400 dark:border-neutral-700"
          >
            <Camera className="mr-2 h-4 w-4 text-amber-600" />
            Take Photo
          </Button>
        )}
      </div>

      {/* Photo previews list */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 pt-1">
          {photos.map((photo, index) => (
            <div
              key={photo.publicId || index}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 p-1.5 text-white opacity-90 transition-opacity hover:opacity-100 cursor-pointer shadow-sm"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              <div className="p-1.5">
                <Input
                  placeholder="Caption (e.g. Back hook, Gross weight)"
                  value={photo.caption || ""}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  className="h-7 text-[11px]"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {required && photos.length === 0 && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <ImagePlus className="h-3.5 w-3.5" />
          At least one verification photo is required.
        </p>
      )}
    </div>
  );
}
