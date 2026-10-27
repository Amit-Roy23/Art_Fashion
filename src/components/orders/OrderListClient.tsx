"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { Plus, ShoppingBag, ArrowRight, AlertTriangle, Calendar } from "lucide-react";
import { SystemStatus } from "@/models/Order";

export interface OrderRow {
  id: string;
  orderNo: string;
  type: "PROJECT" | "PIECE";
  projectName?: string;
  customerName: string;
  customerPhone: string;
  orderDate: string | Date;
  expectedDeliveryDate: string | Date;
  priority: "NORMAL" | "URGENT";
  systemStatus: SystemStatus;
  statusName: string;
  statusColour?: string;
  itemCount: number;
  deliveredCount: number;
  totalEstimatedWeightMg: number;
  isOverdue: boolean;
}

interface OrderListClientProps {
  initialOrders: OrderRow[];
}

export function OrderListClient({ initialOrders }: OrderListClientProps) {
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedType, setSelectedType] = React.useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("ALL");

  const filteredOrders = React.useMemo(() => {
    return initialOrders.filter((ord) => {
      if (selectedStatus !== "ALL" && ord.systemStatus !== selectedStatus) return false;
      if (selectedType !== "ALL" && ord.type !== selectedType) return false;
      if (selectedPriority !== "ALL" && ord.priority !== selectedPriority) return false;
      return true;
    });
  }, [initialOrders, selectedStatus, selectedType, selectedPriority]);

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: "orderNo",
      header: "Order No",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/orders/${row.original.id}`}
            className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 hover:underline"
          >
            {row.original.orderNo}
          </Link>
          {row.original.isOverdue && (
            <span title="Overdue Order">
              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type & Project",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {row.original.type === "PROJECT" ? row.original.projectName : "Single Piece"}
          </span>
          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {row.original.type}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
            {row.original.customerName}
          </p>
          <p className="text-[11px] font-mono text-neutral-400">
            {row.original.customerPhone}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "systemStatus",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          statusName={row.original.statusName}
          systemCategory={row.original.systemStatus}
          customColour={row.original.statusColour}
        />
      ),
    },
    {
      accessorKey: "itemCount",
      header: "Pieces / Progress",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {row.original.deliveredCount} / {row.original.itemCount} delivered
          </span>
          <div className="w-20 bg-neutral-200 h-1 rounded-full mt-1 overflow-hidden dark:bg-neutral-800">
            <div
              className="bg-amber-600 h-full rounded-full transition-all"
              style={{
                width: `${
                  row.original.itemCount > 0
                    ? (row.original.deliveredCount / row.original.itemCount) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: "totalEstimatedWeightMg",
      header: "Est. Weight",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {formatWeight(row.original.totalEstimatedWeightMg)}
        </span>
      ),
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Due Date",
      cell: ({ row }) => (
        <div className="text-xs">
          <span
            className={
              row.original.isOverdue
                ? "text-red-600 font-bold"
                : "text-neutral-700 dark:text-neutral-300"
            }
          >
            {formatISTDate(row.original.expectedDeliveryDate)}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
            View <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            Jewellery Orders
          </h2>
          <p className="text-xs text-neutral-500">
            Track individual piece orders and multi-item bridal/collection project orders.
          </p>
        </div>

        <Link href="/orders/new">
          <Button variant="gold" size="sm" className="text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create Order
          </Button>
        </Link>
      </div>

      {/* Filter Tabs / Selectors */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-neutral-400 font-medium">Filters:</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="AT_JOB_WORK">At Job Work</option>
          <option value="READY">Ready</option>
          <option value="DELIVERED">Delivered</option>
          <option value="ON_HOLD">On Hold</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="ALL">All Types</option>
          <option value="PROJECT">PROJECT (Multi-Piece)</option>
          <option value="PIECE">PIECE (Single Piece)</option>
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="ALL">All Priorities</option>
          <option value="NORMAL">Normal</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* TanStack Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        searchPlaceholder="Search by order no, project, customer name..."
        exportFilename="bms_orders.csv"
        renderMobileCard={(ord) => (
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                {ord.orderNo}
              </span>
              <StatusBadge
                statusName={ord.statusName}
                systemCategory={ord.systemStatus}
              />
            </div>

            <div>
              <Link
                href={`/orders/${ord.id}`}
                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {ord.type === "PROJECT" ? ord.projectName : "Single Piece Order"}
              </Link>
              <p className="text-xs text-neutral-500">Customer: {ord.customerName}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <span>{ord.deliveredCount}/{ord.itemCount} pieces</span>
              <span className="font-mono">{formatWeight(ord.totalEstimatedWeightMg)}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due {formatISTDate(ord.expectedDeliveryDate)}
              </span>
              <Link href={`/orders/${ord.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View Order →
                </Button>
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
