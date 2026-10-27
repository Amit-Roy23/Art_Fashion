import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const g = (mg?: number | null) => (mg == null ? "—" : `${(mg / 1000).toFixed(3)} g`);
export const gShort = (mg?: number | null) => (mg == null ? "—" : `${(mg / 1000).toFixed(mg >= 100000 ? 1 : 2)} g`);
export const toMg = (grams: string | number) => {
  const n = typeof grams === "number" ? grams : parseFloat(grams);
  return Number.isFinite(n) ? Math.round(n * 1000) : 0;
};

export function diff(baseMg?: number, actMg?: number) {
  if (!baseMg || !actMg) return null;
  const d = actMg - baseMg;
  return { mg: d, pct: (d / baseMg) * 100, label: `${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d / 1000).toFixed(3)} g` };
}

export const date = (iso?: string) => (iso ? format(new Date(iso), "dd MMM yyyy") : "—");
export const dateShort = (iso?: string) => (iso ? format(new Date(iso), "dd MMM") : "—");
export const dateTime = (iso?: string) => (iso ? format(new Date(iso), "dd MMM yyyy, h:mm a") : "—");
export const ago = (iso?: string) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : "—");
export const daysLeft = (iso?: string) => (iso ? differenceInCalendarDays(new Date(iso), new Date()) : 0);
export const inputDate = (iso?: string) => (iso ? format(new Date(iso), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
export const fromInputDate = (v: string) => new Date(`${v}T12:00:00`).toISOString();

export function dueLabel(iso?: string) {
  const d = daysLeft(iso);
  if (d < 0) return { text: `${-d}d overdue`, tone: "danger" as const };
  if (d === 0) return { text: "Due today", tone: "warn" as const };
  if (d <= 3) return { text: `${d}d left`, tone: "warn" as const };
  return { text: `${d}d left`, tone: "ok" as const };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const inr = (n?: number) => (n == null ? "—" : `₹${n.toLocaleString("en-IN")}`);
