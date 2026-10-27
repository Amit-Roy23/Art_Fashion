"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WeightInput } from "@/components/forms/WeightInput";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import { createDelivery } from "@/actions/delivery";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  Truck,
  Plus,
  FileText,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Package,
  User,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { PhotoInput } from "@/schemas/photo";

export interface DeliveryRow {
  id: string;
  deliveryNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderId: string;
  orderNo: string;
  piecesCount: number;
  deliveryDate: string | Date;
  receivedBy: string;
  receiverPhone?: string;
  mode: string;
  remarks: string;
  photos: PhotoInput[];
  items: Array<{
    pieceNo: string;
    category: string;
    finalWeightMg: number;
  }>;
}

export interface ReadyOrderOption {
  orderId: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  readyPieces: Array<{
    pieceId: string;
    pieceNo: string;
    category: string;
    description: string;
    estimatedWeightMg: number;
  }>;
}

interface DeliveryListClientProps {
  initialDeliveries: DeliveryRow[];
  readyOrders: ReadyOrderOption[];
}

export function DeliveryListClient({
  initialDeliveries,
  readyOrders = [],
}: DeliveryListClientProps) {
  const [deliveries, setDeliveries] = React.useState<DeliveryRow[]>(initialDeliveries);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = React.useState("");
  const [receivedBy, setReceivedBy] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [mode, setMode] = React.useState<"IN_PERSON" | "COURIER" | "OTHER">("IN_PERSON");
  const [remarks, setRemarks] = React.useState("Handed over in good condition");
  const [photos, setPhotos] = React.useState<PhotoInput[]>([]);
  const [selectedPieces, setSelectedPieces] = React.useState<
    Array<{ orderItemId: string; finalWeightMg: number }>
  >([]);

  // Derived current selected order
  const currentOrder = React.useMemo(() => {
    return readyOrders.find((o) => o.orderId === selectedOrderId);
  }, [readyOrders, selectedOrderId]);

  // When order changes, preset receiver name and phone from customer
  React.useEffect(() => {
    if (currentOrder) {
      setReceivedBy(currentOrder.customerName || "");
      setReceiverPhone(currentOrder.customerPhone || "");
      // Default select all ready pieces in this order
      setSelectedPieces(
        currentOrder.readyPieces.map((p) => ({
          orderItemId: p.pieceId,
          finalWeightMg: p.estimatedWeightMg || 0,
        }))
      );
    } else {
      setSelectedPieces([]);
    }
  }, [currentOrder]);

  const handlePieceToggle = (pieceId: string, estimatedWeight: number) => {
    const exists = selectedPieces.some((p) => p.orderItemId === pieceId);
    if (exists) {
      setSelectedPieces(selectedPieces.filter((p) => p.orderItemId !== pieceId));
    } else {
      setSelectedPieces([...selectedPieces, { orderItemId: pieceId, finalWeightMg: estimatedWeight }]);
    }
  };

  const handleWeightChange = (pieceId: string, mg: number) => {
    setSelectedPieces((prev) =>
      prev.map((item) =>
        item.orderItemId === pieceId ? { ...item, finalWeightMg: mg } : item
      )
    );
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) {
      toast.error("Please select an order to deliver");
      return;
    }
    if (selectedPieces.length === 0) {
      toast.error("Please select at least one piece to deliver");
      return;
    }
    if (photos.length === 0) {
      toast.error("Handover photo is mandatory for deliveries");
      return;
    }
    if (!receivedBy.trim()) {
      toast.error("Receiver name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDelivery({
        customerId: currentOrder.customerId,
        orderId: currentOrder.orderId,
        receivedBy: receivedBy.trim(),
        receiverPhone: receiverPhone.trim(),
        mode,
        remarks: remarks.trim(),
        photos,
        items: selectedPieces,
      });

      if (res.ok) {
        toast.success(`Delivery recorded: ${res.data.deliveryNo}`);
        setIsDeliveryModalOpen(false);
        // Reload page to refresh state cleanly
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to create delivery");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<DeliveryRow>[] = [
    {
      accessorKey: "deliveryNo",
      header: "Delivery No",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/deliveries/${row.original.id}`}
            className="font-bold text-amber-800 hover:underline"
          >
            {row.original.deliveryNo}
          </Link>
          <div className="text-xs text-slate-500 font-normal">
            Ref: {row.original.orderNo}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/customers/${row.original.customerId}`}
            className="font-medium text-slate-900 hover:text-amber-800 hover:underline"
          >
            {row.original.customerName}
          </Link>
          <div className="text-xs text-slate-500">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      accessorKey: "piecesCount",
      header: "Pieces",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Package className="w-3 h-3 mr-1" />
          {row.original.piecesCount} Delivered
        </span>
      ),
    },
    {
      accessorKey: "receivedBy",
      header: "Receiver & Mode",
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> {row.original.receivedBy}
          </div>
          <div className="text-slate-500 capitalize">{row.original.mode.toLowerCase()}</div>
        </div>
      ),
    },
    {
      accessorKey: "deliveryDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 font-medium">
          {formatISTDate(row.original.deliveryDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/pdf/delivery/${row.original.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Download Delivery Note PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
            </a>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/deliveries/${row.original.id}`}>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Deliveries
          </h1>
          <p className="text-sm text-slate-500">
            Record customer handovers, final weights, delivery notes, and photos
          </p>
        </div>

        <Button
          onClick={() => setIsDeliveryModalOpen(true)}
          className="bg-amber-700 hover:bg-amber-800 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Record Delivery
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={deliveries}
        searchKey="deliveryNo"
        searchPlaceholder="Search delivery no or customer..."
      />

      {/* Record Delivery Dialog */}
      <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-700" />
              Record New Customer Delivery
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDelivery} className="space-y-5 pt-2">
            {/* Step 1: Select Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Select Order with Ready Pieces <span className="text-red-500">*</span>
              </label>
              {readyOrders.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No orders currently have pieces marked as <strong>READY</strong>. Check your pieces
                  in the Order or Piece screens to mark them ready first.
                </div>
              ) : (
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                >
                  <option value="">-- Choose an order --</option>
                  {readyOrders.map((ord) => (
                    <option key={ord.orderId} value={ord.orderId}>
                      {ord.orderNo} — {ord.customerName} ({ord.readyPieces.length} pieces ready)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Piece Selection & Final Weights */}
            {currentOrder && (
              <div className="space-y-3 p-4 bg-slate-50 border rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Pieces to Deliver (Partial delivery allowed)
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedPieces.length} of {currentOrder.readyPieces.length} selected
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {currentOrder.readyPieces.map((piece) => {
                    const isSelected = selectedPieces.some((p) => p.orderItemId === piece.pieceId);
                    const selectedItem = selectedPieces.find(
                      (p) => p.orderItemId === piece.pieceId
                    );

                    return (
                      <div
                        key={piece.pieceId}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-white border-amber-500 shadow-xs"
                            : "bg-white/60 border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handlePieceToggle(piece.pieceId, piece.estimatedWeightMg)
                              }
                              className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-semibold text-sm text-slate-900">
                                {piece.pieceNo} — {piece.category}
                              </div>
                              <div className="text-xs text-slate-500">
                                Est: {formatWeight(piece.estimatedWeightMg)} • {piece.description}
                              </div>
                            </div>
                          </label>

                          {isSelected && (
                            <div className="w-36">
                              <label className="text-[10px] font-semibold text-slate-500 block">
                                Final Wt (g) <span className="text-red-500">*</span>
                              </label>
                              <WeightInput
                                valueMg={selectedItem?.finalWeightMg || 0}
                                onChange={(mg) => handleWeightChange(piece.pieceId, mg)}
                                previousWeightMg={piece.estimatedWeightMg}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Receiver & Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Received By (Name) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Person receiving jewellery"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Receiver Phone</label>
                <Input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Delivery Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full text-sm border rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="IN_PERSON">In Person / Counter Handover</option>
                  <option value="COURIER">Secured Courier / Armoured</option>
                  <option value="OTHER">Other Handover</option>
                </select>
              </div>
            </div>

            {/* Step 4: Handover Photos (Mandatory) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Handover / Piece Photos <span className="text-red-500">*</span>
              </label>
              <PhotoUploader
                photos={photos}
                onChange={setPhotos}
                maxPhotos={4}
                required
                capture="environment"
              />
            </div>

            {/* Step 5: Remarks (Mandatory) */}
            <RemarksField
              value={remarks}
              onChange={setRemarks}
              label="Delivery Remarks"
              placeholder="Record any balance settlement, customer remarks, box / pouch details..."
              required
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeliveryModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || readyOrders.length === 0}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                {isSubmitting ? "Generating Delivery Note..." : "Confirm & Deliver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
