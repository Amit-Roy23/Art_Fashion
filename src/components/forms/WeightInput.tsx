"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { mgToGrams, gramsToMg, computeWeightDiff, isOverTolerance } from "@/lib/weight";
import { Scale, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightInputProps {
  valueMg: number | undefined | null;
  onChangeMg?: (mg: number) => void;
  onChange?: (mg: number) => void;
  baselineMg?: number | null;
  previousWeightMg?: number | null;
  tolerancePercent?: number;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function WeightInput({
  valueMg,
  onChangeMg,
  onChange,
  baselineMg,
  previousWeightMg,
  tolerancePercent = 0.5,
  label = "Weight (Grams)",
  required = false,
  disabled = false,
  className,
  placeholder = "0.000",
}: WeightInputProps) {
  const triggerChange = onChangeMg || onChange || (() => {});
  const effectiveBaseline = baselineMg !== undefined ? baselineMg : previousWeightMg;
  // Local display state in grams: e.g. "12.345"
  const [displayVal, setDisplayVal] = React.useState<string>(() => {
    if (valueMg === undefined || valueMg === null || valueMg === 0) return "";
    return mgToGrams(valueMg).toFixed(3);
  });

  // Sync if parent updates valueMg externally
  React.useEffect(() => {
    if (valueMg !== undefined && valueMg !== null && valueMg > 0) {
      const g = mgToGrams(valueMg);
      if (parseFloat(displayVal) !== g) {
        setDisplayVal(g.toFixed(3));
      }
    } else if (valueMg === 0 && displayVal !== "") {
      setDisplayVal("");
    }
  }, [valueMg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow numbers and a single decimal point up to 3 places
    if (raw === "" || /^\d*\.?\d{0,3}$/.test(raw)) {
      setDisplayVal(raw);
      const mg = gramsToMg(raw);
      triggerChange(mg);
    }
  };

  const handleBlur = () => {
    if (displayVal && !isNaN(parseFloat(displayVal))) {
      const formatted = parseFloat(displayVal).toFixed(3);
      setDisplayVal(formatted);
      triggerChange(gramsToMg(formatted));
    }
  };

  const diff =
    effectiveBaseline && effectiveBaseline > 0 && valueMg && valueMg > 0
      ? computeWeightDiff(effectiveBaseline, valueMg)
      : null;

  const exceeded = diff ? isOverTolerance(diff.diffPercent, tolerancePercent) : false;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-amber-600" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[11px] text-neutral-400">Unit: Grams (g)</span>
      </div>

      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={displayVal}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "pr-10 font-mono text-sm tracking-wide",
            exceeded && "border-red-400 focus-visible:ring-red-500 bg-red-50/20"
          )}
        />
        <span className="absolute right-3 top-2 text-xs font-semibold text-neutral-400 pointer-events-none">
          g
        </span>
      </div>

      {/* Variance calculation against baseline */}
      {diff && (
        <div
          className={cn(
            "flex items-center justify-between rounded-md px-2 py-1 text-[11px]",
            exceeded
              ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          )}
        >
          <span className="flex items-center gap-1">
            {exceeded && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
            Diff: {diff.formattedDiff}
          </span>
          <span className="text-[10px]">
            {exceeded
              ? `Exceeds ±${tolerancePercent}% tolerance!`
              : `Within ±${tolerancePercent}% tolerance`}
          </span>
        </div>
      )}
    </div>
  );
}
