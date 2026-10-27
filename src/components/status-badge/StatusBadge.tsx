import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { SystemStatus } from "@/models/Order";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  statusName?: string;
  systemCategory?: SystemStatus;
  customColour?: string;
  className?: string;
}

const SYSTEM_CATEGORY_STYLES: Record<
  SystemStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "Pending",
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-300 dark:border-amber-700/60",
  },
  IN_PRODUCTION: {
    label: "In Production",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-blue-300 dark:border-blue-700/60",
  },
  AT_JOB_WORK: {
    label: "At Job Work",
    bg: "bg-purple-100 dark:bg-purple-950/60",
    text: "text-purple-800 dark:text-purple-200",
    border: "border-purple-300 dark:border-purple-700/60",
  },
  READY: {
    label: "Ready",
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-300 dark:border-emerald-700/60",
  },
  DELIVERED: {
    label: "Delivered",
    bg: "bg-cyan-100 dark:bg-cyan-950/60",
    text: "text-cyan-800 dark:text-cyan-200",
    border: "border-cyan-300 dark:border-cyan-700/60",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-red-100 dark:bg-red-950/60",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700/60",
  },
  ON_HOLD: {
    label: "On Hold",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-300 dark:border-neutral-700",
  },
};

export function StatusBadge({
  statusName,
  systemCategory = "PENDING",
  customColour,
  className,
}: StatusBadgeProps) {
  const style =
    SYSTEM_CATEGORY_STYLES[systemCategory] || SYSTEM_CATEGORY_STYLES.PENDING;
  const label = statusName || style.label;

  if (customColour) {
    return (
      <span
        style={{
          backgroundColor: `${customColour}18`,
          color: customColour,
          borderColor: `${customColour}55`,
        }}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
          className
        )}
      >
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: customColour }}
        />
        {label}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-semibold text-[11px] tracking-wide",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          systemCategory === "PENDING" && "bg-amber-500",
          systemCategory === "IN_PRODUCTION" && "bg-blue-500",
          systemCategory === "AT_JOB_WORK" && "bg-purple-500",
          systemCategory === "READY" && "bg-emerald-500",
          systemCategory === "DELIVERED" && "bg-cyan-500",
          systemCategory === "CANCELLED" && "bg-red-500",
          systemCategory === "ON_HOLD" && "bg-neutral-500"
        )}
      />
      {label}
    </Badge>
  );
}
