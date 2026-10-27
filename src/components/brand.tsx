import { cn } from "@/lib/format";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-3)" />
          <stop offset=".45" stopColor="var(--gold-2)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <path d="M24 4 L42 18 L24 44 L6 18 Z" fill="none" stroke="url(#lg-gold)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 18 H42 M16 18 L24 4 L32 18 M16 18 L24 44 L32 18" fill="none" stroke="url(#lg-gold)" strokeWidth="1.3" strokeLinejoin="round" opacity=".8" />
    </svg>
  );
}

export function Wordmark({ company, className }: { company?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <div className="leading-none">
        <div className="font-display gold-text text-[1.55rem] font-semibold tracking-wide">Aurum</div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[.28em] text-faint">{company ?? "Jewellery BMS"}</div>
      </div>
    </div>
  );
}
