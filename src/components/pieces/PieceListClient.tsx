"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { Gem, ArrowRight, AlertTriangle, Calendar, Scale } from "lucide-react";
import { CurrentLocation } from "@/models/OrderItem";

export interface PieceRow {
  id: string;
  pieceNo: string;
  orderNo: string;
  orderId: string;
  customerName: string;
  category: string;
  description: string;
  metal: string;
  purity: string;
  estimatedWeightMg: number;
  currentLocation: CurrentLocation;
  stageName: string;
  artisanName?: string;
  dueDate: string | Date;
  isOverdue: boolean;
  systemStatus: any;
}

interface PieceListClientProps {
  initialPieces: PieceRow[];
}

export function PieceListClient({ initialPieces }: PieceListClientProps) {
  const searchParams = useSearchParams();
  const filterOverdueParam = searchParams.get("overdue") === "true";

  const [locationFilter, setLocationFilter] = React.useState<string>("ALL");
  const [overdueOnly, setOverdueOnly] = React.useState<boolean>(filterOverdueParam);

  const filteredPieces = React.useMemo(() => {
    return initialPieces.filter((p) => {
      if (locationFilter !== "ALL" && p.currentLocation !== locationFilter) return false;
      if (overdueOnly && !p.isOverdue) return false;
      return true;
    });
  }, [initialPieces, locationFilter, overdueOnly]);

  const columns: ColumnDef<PieceRow>[] = [
    {
      accessorKey: "pieceNo",
      header: "Piece No",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/pieces/${row.original.id}`}
            className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 hover:underline"
          >
            {row.original.pieceNo}
          </Link>
          {row.original.isOverdue && (
            <span title="Overdue Piece">
              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category & Specs",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {row.original.category}
          </span>
          <p className="text-[11px] text-neutral-500 truncate max-w-xs">
            {row.original.description}
          </p>
          <span className="text-[10px] text-neutral-400">
            {row.original.metal} • {row.original.purity}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "orderNo",
      header: "Order / Customer",
      cell: ({ row }) => (
        <div className="text-xs">
          <Link
            href={`/orders/${row.original.orderId}`}
            className="font-mono text-neutral-600 hover:underline dark:text-neutral-300"
          >
            {row.original.orderNo}
          </Link>
          <p className="text-[11px] text-neutral-500">{row.original.customerName}</p>
        </div>
      ),
    },
    {
      accessorKey: "currentLocation",
      header: "Location",
      cell: ({ row }) => (
        <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {row.original.currentLocation.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "stageName",
      header: "Stage / Karigar",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {row.original.stageName}
          </span>
          {row.original.artisanName && (
            <p className="text-[11px] text-neutral-500">
              Artisan: {row.original.artisanName}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "estimatedWeightMg",
      header: "Est. Weight",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {formatWeight(row.original.estimatedWeightMg)}
        </span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span
          className={`text-xs font-mono ${
            row.original.isOverdue ? "text-red-600 font-bold" : "text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {formatISTDate(row.original.dueDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/pieces/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
            View <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Gem className="h-5 w-5 text-amber-600" />
            Piece-Level Production Registry (WIP)
          </h2>
          <p className="text-xs text-neutral-500">
            Track individual piece handoffs, stages, weights, and locations across workshop.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-neutral-400 font-medium">Location:</span>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="ALL">All Locations</option>
          <option value="IN_HOUSE">IN HOUSE (Workshop)</option>
          <option value="WITH_KARIGAR">WITH KARIGAR</option>
          <option value="AT_JOB_WORK">AT JOB WORK</option>
          <option value="READY">READY (In Vault)</option>
          <option value="DELIVERED">DELIVERED</option>
        </select>

        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
            overdueOnly
              ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300"
              : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700"
          }`}
        >
          {overdueOnly ? "Showing Overdue Only ✕" : "Filter Overdue Only"}
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredPieces}
        searchPlaceholder="Search piece no, description, metal, karigar..."
        exportFilename="bms_pieces_wip.csv"
        renderMobileCard={(p) => (
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                {p.pieceNo}
              </span>
              <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                {p.currentLocation.replace(/_/g, " ")}
              </span>
            </div>

            <div>
              <Link
                href={`/pieces/${p.id}`}
                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {p.category} — {p.description}
              </Link>
              <p className="text-xs text-neutral-500">
                Stage: {p.stageName} {p.artisanName ? `• ${p.artisanName}` : ""}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <span className="font-mono">{formatWeight(p.estimatedWeightMg)}</span>
              <span className={p.isOverdue ? "text-red-600 font-bold" : ""}>
                Due: {formatISTDate(p.dueDate)}
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <Link href={`/pieces/${p.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View Piece →
                </Button>
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
