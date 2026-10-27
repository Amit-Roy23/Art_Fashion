"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Images, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/types";
import { cn, dateTime } from "@/lib/format";
import { compressToDataUrl, SAMPLE_KEYS, sampleUrl } from "@/lib/photos";
import { Modal, Button, usePortal } from "./ui";

// ─────────────────────────────────────────────── lightbox
const LightboxCtx = createContext<(photos: Photo[], index?: number) => void>(() => {});
export const useLightbox = () => useContext(LightboxCtx);

const KIND_LABEL: Record<Photo["kind"], string> = {
  reference: "Customer reference",
  design: "Design",
  progress: "Work in progress",
  submission: "Karigar submission",
  jobwork: "Job work",
  final: "Final",
  delivery: "Delivery",
};

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ photos: Photo[]; i: number } | null>(null);
  const open = useCallback((photos: Photo[], index = 0) => photos.length && setState({ photos, i: index }), []);
  const host = usePortal();
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
      if (e.key === "ArrowRight") setState((s) => s && { ...s, i: (s.i + 1) % s.photos.length });
      if (e.key === "ArrowLeft") setState((s) => s && { ...s, i: (s.i - 1 + s.photos.length) % s.photos.length });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);
  const p = state?.photos[state.i];
  return (
    <LightboxCtx.Provider value={open}>
      {children}
      {state &&
        p &&
        host &&
        createPortal(
          <div className="fade fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 text-white/80">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e6bb6a]">{KIND_LABEL[p.kind]}</div>
                <div className="truncate text-sm">
                  {p.caption || "Photo"} · {p.by} · {dateTime(p.at)}
                </div>
              </div>
              <button className="grid size-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setState(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
              <img key={p.id} src={p.url} alt={p.caption ?? ""} className="pop max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
              {state.photos.length > 1 && (
                <>
                  <button
                    className="absolute left-3 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setState({ ...state, i: (state.i - 1 + state.photos.length) % state.photos.length })}
                    aria-label="Previous"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="absolute right-3 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setState({ ...state, i: (state.i + 1) % state.photos.length })}
                    aria-label="Next"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>
            <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto p-4">
              {state.photos.map((ph, i) => (
                <img
                  key={ph.id}
                  src={ph.url}
                  alt=""
                  onClick={() => setState({ ...state, i })}
                  className={cn(
                    "size-14 shrink-0 cursor-pointer rounded-lg object-cover transition",
                    i === state.i ? "ring-2 ring-[#e6bb6a]" : "opacity-50 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>,
          host,
        )}
    </LightboxCtx.Provider>
  );
}

// ─────────────────────────────────────────────── display
export function Thumb({ photo, photos, className, size }: { photo?: Photo; photos?: Photo[]; className?: string; size?: number }) {
  const open = useLightbox();
  const list = photos ?? (photo ? [photo] : []);
  const p = photo ?? list[0];
  if (!p)
    return (
      <div
        className={cn("grid shrink-0 place-items-center rounded-xl border border-dashed border-line-2 bg-panel text-faint", className)}
        style={size ? { width: size, height: size } : undefined}
      >
        <Images className="size-1/3" />
      </div>
    );
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(list, Math.max(0, list.indexOf(p)));
      }}
      className={cn("group relative shrink-0 overflow-hidden rounded-xl bg-bg-2", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-110" />
      {list.length > 1 && (
        <span className="absolute right-1 bottom-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          +{list.length - 1}
        </span>
      )}
    </button>
  );
}

export function PhotoGrid({ photos, className, empty = "No photos yet" }: { photos: Photo[]; className?: string; empty?: string }) {
  const open = useLightbox();
  if (!photos.length) return <div className="rounded-2xl border border-dashed border-line-2 p-6 text-center text-sm text-faint">{empty}</div>;
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)}>
      {photos.map((p, i) => (
        <button key={p.id} type="button" onClick={() => open(photos, i)} className="group relative aspect-square overflow-hidden rounded-xl bg-bg-2 text-left">
          <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-110" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[#e6bb6a]">{KIND_LABEL[p.kind]}</span>
            <span className="block truncate text-[11px] text-white/85">{p.caption}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────── capture
export type DraftPhoto = { url: string; caption?: string };

export function PhotoInput({
  value,
  onChange,
  label = "Photos",
  required,
  hint,
  look = "final",
}: {
  value: DraftPhoto[];
  onChange: (v: DraftPhoto[]) => void;
  label?: string;
  required?: boolean;
  hint?: string;
  look?: "sketch" | "raw" | "final";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const out: DraftPhoto[] = [];
      for (const f of Array.from(files).slice(0, 8)) {
        if (!f.type.startsWith("image/")) continue;
        out.push({ url: await compressToDataUrl(f), caption: f.name.replace(/\.[^.]+$/, "") });
      }
      onChange([...value, ...out]);
    } catch {
      toast.error("Couldn't read that image");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          {label} {required && <span className="text-gold">*</span>}
        </span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((p, i) => (
          <div key={i} className="pop group relative size-20 overflow-hidden rounded-xl border border-line-2">
            <img src={p.url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70 text-white"
              aria-label="Remove photo"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 bg-gold/5 text-[10px] font-semibold text-gold transition hover:bg-gold/10"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          Camera
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-2 text-[10px] font-semibold text-muted transition hover:border-gold/50 hover:text-text"
        >
          <ImagePlus className="size-5" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-2 text-[10px] font-semibold text-muted transition hover:border-gold/50 hover:text-text"
        >
          <Sparkles className="size-5" />
          Sample
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />
      {picker && (
        <SamplePicker
          open
          look={look}
          onClose={() => setPicker(false)}
          onPick={(url, caption) => {
            onChange([...value, { url, caption }]);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}

function SamplePicker({
  open,
  onClose,
  onPick,
  look,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, caption: string) => void;
  look: "sketch" | "raw" | "final";
}) {
  const [tab, setTab] = useState(look);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sample photos"
      sub="Demo only — pick a bundled photo instead of using your camera."
      icon={<Sparkles className="size-5" />}
      wide
    >
      <div className="mb-4 flex gap-2">
        {(["sketch", "raw", "final"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "gold" : "soft"} onClick={() => setTab(t)}>
            {t === "sketch" ? "Design sketch" : t === "raw" ? "Raw / in work" : "Finished"}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SAMPLE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(sampleUrl(k, tab), k.replace(/-/g, " "))}
            className="group aspect-square overflow-hidden rounded-xl border border-line"
          >
            <img src={sampleUrl(k, tab)} alt={k} loading="lazy" className="size-full object-cover transition group-hover:scale-110" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
