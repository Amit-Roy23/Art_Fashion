"use client";
import {
  useEffect,
  useId,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { cn, initials } from "@/lib/format";

// ─────────────────────────────────────────────── buttons
type Variant = "gold" | "ghost" | "outline" | "soft" | "danger";
const variants: Record<Variant, string> = {
  gold: "gold-fill shadow-[0_8px_24px_-10px_var(--gold)] hover:brightness-110",
  ghost: "text-muted hover:text-text hover:bg-panel-2",
  outline: "border border-line-2 text-text hover:border-gold/60 hover:bg-panel",
  soft: "bg-panel-2 text-text hover:bg-gold/15 border border-line",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  icon,
  href,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; icon?: ReactNode; href?: string }) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap select-none",
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-[15px]",
    variants[variant],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  return (
    <button type="button" className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid size-10 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-text active:scale-95", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────── surfaces
export function Panel({ className, lux, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { lux?: boolean }) {
  return (
    <div className={cn(lux ? "panel-lux" : "panel", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, kicker, action, className }: { title: ReactNode; kicker?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker && <div className="text-[10px] font-bold uppercase tracking-[.22em] text-gold/80">{kicker}</div>}
        <h2 className="font-display truncate text-[1.45rem] leading-tight font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, kicker, sub, actions }: { title: ReactNode; kicker?: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rise mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {kicker && <div className="mb-1 text-[11px] font-bold uppercase tracking-[.26em] text-gold">{kicker}</div>}
        <h1 className="font-display text-[2.2rem] leading-[1.05] font-semibold md:text-[2.7rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-line-2 bg-panel text-gold">{icon}</div>
      <div className="font-display text-xl font-semibold">{title}</div>
      {sub && <p className="mt-1 max-w-sm text-sm text-muted">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────── badges
export function Pill({ color, children, className, dot = true }: { color?: string; children: ReactNode; className?: string; dot?: boolean }) {
  const c = color ?? "var(--muted)";
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap", className)}
      style={{ color: c, background: `color-mix(in oklab, ${c} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 28%, transparent)` }}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full" style={{ background: c }} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Tone({ tone, children, className }: { tone: "ok" | "warn" | "danger" | "info" | "muted" | "gold"; children: ReactNode; className?: string }) {
  const map = { ok: "var(--ok)", warn: "var(--warn)", danger: "var(--danger)", info: "var(--info)", muted: "var(--muted)", gold: "var(--gold)" };
  return (
    <Pill color={map[tone]} className={className}>
      {children}
    </Pill>
  );
}

export function Avatar({ name, hue = 35, size = 36, className, ring }: { name: string; hue?: number; size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold text-white", ring && "ring-2 ring-bg", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 52%), hsl(${(hue + 40) % 360} 60% 30%))`,
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line-2 bg-panel px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted">{children}</kbd>;
}

// ─────────────────────────────────────────────── form controls
export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
        {label}
        {required && <span className="text-gold">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("field min-h-[84px] resize-y", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("field", className)} {...rest}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-panel p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
            value === o.value ? "gold-fill shadow" : "text-muted hover:text-text",
          )}
        >
          {o.label}
          {o.count != null && (
            <span className={cn("tabular rounded-full px-1.5 text-[10px]", value === o.value ? "bg-black/15" : "bg-panel-2")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────── overlays
const noop = () => () => {};
/** document.body once mounted on the client (null during SSR). */
export function usePortal() {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return mounted ? document.body : null;
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  icon,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const host = usePortal();
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || !host) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-labelledby={id}>
      <div className="fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "sheet-up sm:pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-line-2 bg-solid shadow-2xl sm:rounded-[1.75rem]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          {icon && <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h3 id={id} className="font-display text-2xl leading-tight font-semibold">
              {title}
            </h3>
            {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-panel px-5 py-3.5 pb-[max(.875rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    host,
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const host = usePortal();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !host) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="fade absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="slide-in absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-line-2 bg-solid">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="font-display text-2xl font-semibold">{title}</div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    host,
  );
}

// ─────────────────────────────────────────────── data viz bits
export function Ring({
  value,
  size = 44,
  stroke = 4,
  color = "var(--gold)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold">{children}</span>
    </span>
  );
}

export function Bar({ value, color = "var(--gold)", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-line", className)}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} />
    </div>
  );
}

export function KeyVal({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] font-bold uppercase tracking-[.16em] text-faint">{k}</div>
      <div className="mt-0.5 truncate text-sm font-medium">{v}</div>
    </div>
  );
}
