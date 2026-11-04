import { cn } from "@/lib/format";

export const APP_NAME = "Layek Jewels";

/** The Layek Jewels star emblem on its own (icons, loaders, compact headers). */
export function Logo({ className }: { className?: string }) {
  return <img src="/brand/layek-jewels-mark.png" alt="" width={360} height={138} className={cn("h-7 w-auto", className)} aria-hidden />;
}

/** The full Layek Jewels logo (emblem + name), used wherever the software is branded. */
export function Wordmark({ className, compact, caption = true }: { className?: string; compact?: boolean; caption?: boolean }) {
  return (
    <div className={cn("flex flex-col items-start", className)}>
      <img
        src="/brand/layek-jewels-logo.png"
        alt={APP_NAME}
        width={720}
        height={293}
        className={cn("w-auto drop-shadow-[0_2px_10px_rgba(230,187,106,0.18)]", compact ? "h-10" : "h-16")}
      />
      {caption && !compact && <div className="mt-1.5 text-[9px] font-bold whitespace-nowrap uppercase tracking-[.3em] text-faint">Business Management</div>}
    </div>
  );
}
