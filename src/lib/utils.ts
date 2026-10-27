import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIMEZONE_KOLKATA = "Asia/Kolkata";

/**
 * Format date in Asia/Kolkata timezone: dd MMM yyyy
 */
export function formatISTDate(
  date: Date | string | number | null | undefined,
  pattern: string = "dd MMM yyyy"
): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return formatInTimeZone(d, TIMEZONE_KOLKATA, pattern);
  } catch {
    return "—";
  }
}

/**
 * Format datetime in Asia/Kolkata timezone: dd MMM yyyy, hh:mm a
 */
export function formatISTDateTime(
  date: Date | string | number | null | undefined
): string {
  return formatISTDate(date, "dd MMM yyyy, hh:mm a");
}

/**
 * Indian Rupee currency formatter (en-IN)
 */
export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Standard Indian number grouping
 */
export function formatIndianNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}
