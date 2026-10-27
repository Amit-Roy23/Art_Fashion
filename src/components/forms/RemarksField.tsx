import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemarksFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minChars?: number;
  className?: string;
  error?: string;
}

export function RemarksField({
  value,
  onChange,
  label = "Remarks / Notes",
  placeholder = "Enter mandatory remarks (min 3 characters)...",
  required = true,
  minChars = 3,
  className,
  error,
}: RemarksFieldProps) {
  const isInvalid = required && value.trim().length > 0 && value.trim().length < minChars;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span
          className={cn(
            "text-[11px]",
            isInvalid ? "text-red-500" : "text-neutral-400"
          )}
        >
          {value.length} / {minChars} min chars
        </span>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={cn(
          (isInvalid || error) &&
            "border-red-400 focus-visible:ring-red-500 bg-red-50/20"
        )}
      />

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {isInvalid && !error && (
        <p className="text-[11px] text-red-500">
          Remarks must be at least {minChars} characters long.
        </p>
      )}
    </div>
  );
}
