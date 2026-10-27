"use client";
import { useEffect, type ReactNode } from "react";
import { boot, useStore } from "@/lib/store";
import { LightboxProvider } from "./photos";
import { Gem, RefreshCw } from "lucide-react";
import { Button } from "./ui";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    boot();
  }, []);
  return <LightboxProvider>{children}</LightboxProvider>;
}

/** Renders children only once the demo database is loaded. */
export function Ready({ children }: { children: ReactNode }) {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  if (status === "ready") return <>{children}</>;
  if (status === "error")
    return (
      <div className="relative z-10 grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <div className="font-display text-3xl">Couldn&apos;t open the atelier</div>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Button className="mt-5" variant="gold" icon={<RefreshCw className="size-4" />} onClick={() => location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  return <Loader />;
}

export function Loader() {
  return (
    <div className="relative z-10 grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          <Gem className="size-6 text-gold" />
        </div>
        <div className="font-display text-lg text-muted italic">Opening the atelier…</div>
      </div>
    </div>
  );
}
