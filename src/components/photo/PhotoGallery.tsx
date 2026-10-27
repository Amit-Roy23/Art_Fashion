"use client";

import * as React from "react";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { PhotoInput } from "@/schemas/photo";
import { formatISTDate } from "@/lib/utils";

export interface PhotoItem {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  uploadedBy?: string;
  uploadedAt?: any;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
  title?: string;
}

export function PhotoGallery({ photos = [], title }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200/60 bg-neutral-50/50 p-4 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/30">
        No photos attached
      </div>
    );
  }

  const activePhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title} ({photos.length})
        </h4>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {photos.map((photo, idx) => (
          <div
            key={photo.publicId || idx}
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs hover:border-amber-400 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || `Jewellery photo ${idx + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn className="h-5 w-5" />
            </div>
            {photo.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 text-[10px] text-white truncate">
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer transition-colors"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous Button */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer transition-colors"
              title="Previous Photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image & Caption */}
          <div
            className="flex flex-col items-center max-w-4xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.url}
              alt={activePhoto.caption || "Enlarged jewellery photo"}
              className="max-h-[75vh] max-w-full rounded-md object-contain shadow-2xl"
            />
            <div className="mt-3 text-center text-white space-y-1">
              {activePhoto.caption && (
                <p className="text-sm font-medium">{activePhoto.caption}</p>
              )}
              {activePhoto.uploadedAt && (
                <p className="text-xs text-neutral-400">
                  Uploaded {formatISTDate(activePhoto.uploadedAt)}
                </p>
              )}
              <p className="text-[11px] text-neutral-500">
                {selectedIndex! + 1} of {photos.length}
              </p>
            </div>
          </div>

          {/* Next Button */}
          {selectedIndex !== null && selectedIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer transition-colors"
              title="Next Photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
