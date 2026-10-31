"use client";
import { AlertTriangle, FileDown, FileSpreadsheet } from "lucide-react";
import { downloadRegisterExcel, downloadRegisterPdf, type RegisterSpec } from "@/lib/pdf-client";
import { cn } from "@/lib/format";
import { Button } from "./ui";

/** PDF + Excel buttons for a register. */
export function RegisterExport({ spec, compact }: { spec: RegisterSpec; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={compact ? "sm" : "md"}
        variant="soft"
        icon={<FileDown className="size-4" />}
        onClick={() => downloadRegisterPdf(spec)}
        disabled={!spec.rows.length}
      >
        PDF
      </Button>
      <Button
        size={compact ? "sm" : "md"}
        variant="soft"
        icon={<FileSpreadsheet className="size-4" />}
        onClick={() => downloadRegisterExcel(spec)}
        disabled={!spec.rows.length}
      >
        Excel
      </Button>
    </div>
  );
}

// Long descriptive columns may wrap; everything else (numbers, dates, codes) stays on one line.
const WRAPS = ["Piece", "Order / customer", "Stage"];

/** On-screen version of a register (same rows as the PDF / Excel export). */
export function RegisterTable({ spec, empty = "No records" }: { spec: RegisterSpec; empty?: string }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-faint">
            <th className="w-14 py-2.5 pr-2">Photo</th>
            {spec.columns.map((c) => (
              <th key={c.label} className={cn("py-2.5 pr-3 whitespace-nowrap", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((r, i) => (
            <tr key={i} className={cn("border-b border-line last:border-0", r.flag ? "bg-danger/5" : "hover:bg-panel")}>
              <td className="py-2 pr-2">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" className="size-10 rounded-lg object-cover" />
                ) : (
                  <span className="block size-10 rounded-lg bg-panel-2" />
                )}
              </td>
              {r.cells.map((c, j) => (
                <td
                  key={j}
                  className={cn(
                    "tabular py-2 pr-4",
                    WRAPS.includes(spec.columns[j]?.label ?? "") ? "min-w-[170px]" : "whitespace-nowrap",
                    spec.columns[j]?.align === "right" && "text-right",
                    j === 0 && "font-semibold whitespace-nowrap",
                    r.flag && spec.columns[j]?.label.startsWith("Diff") && "text-danger",
                  )}
                >
                  {r.flag && spec.columns[j]?.label.startsWith("Diff") && <AlertTriangle className="mr-1 inline size-3" />}
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {!spec.rows.length && (
            <tr>
              <td colSpan={spec.columns.length + 1} className="py-8 text-center text-faint">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
        {spec.totals && !!spec.rows.length && (
          <tfoot>
            <tr className="border-t-2 border-line-2 font-semibold">
              <td />
              {spec.totals.map((t, j) => (
                <td key={j} className={cn("tabular py-2.5 pr-3", spec.columns[j]?.align === "right" && "text-right whitespace-nowrap")}>
                  {t}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
