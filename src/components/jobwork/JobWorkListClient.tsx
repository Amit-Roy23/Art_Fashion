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
import { Textarea } from "@/components/ui/textarea";
import { WeightInput } from "@/components/forms/WeightInput";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import {
  createJobWorkVendor,
  createJobWorkDispatch,
  receiveJobWorkReturn,
} from "@/actions/jobwork";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  Flame,
  Plus,
  FileText,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PhotoInput } from "@/schemas/photo";

export interface JobWorkRow {
  id: string;
  challanNo: string;
  vendorName: string;
  vendorPhone: string;
  processType: string;
  totalPieces: number;
  returnedPieces: number;
  dispatchDate: string | Date;
  expectedReturnDate: string | Date;
  returnDate?: string | Date;
  chargesAmount?: number;
  isOverdue: boolean;
  remarks: string;
  items: any[];
}

interface PieceOption {
  id: string;
  pieceNo: string;
  category: string;
  description: string;
  estimatedWeightMg: number;
  currentLocation: string;
}

interface VendorOption {
  id: string;
  name: string;
  phone: string;
  processTypes: string[];
}

interface StageOption {
  id: string;
  name: string;
}

interface JobWorkListClientProps {
  initialJobWorks: JobWorkRow[];
  vendors: VendorOption[];
  eligiblePieces: PieceOption[];
  stages: StageOption[];
  processTypes: string[];
}

export function JobWorkListClient({
  initialJobWorks,
  vendors = [],
  eligiblePieces = [],
  stages = [],
  processTypes = [],
}: JobWorkListClientProps) {
  const [jobWorks, setJobWorks] = React.useState<JobWorkRow[]>(initialJobWorks);

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = React.useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = React.useState(false);
  const [activeReturnJobWork, setActiveReturnJobWork] = React.useState<JobWorkRow | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dispatch Form State
  const [vendorId, setVendorId] = React.useState("");
  const [processType, setProcessType] = React.useState(processTypes[0] || "Polishing");
  const [expectedReturnDate, setExpectedReturnDate] = React.useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0]
  );
  const [dispatchRemarks, setDispatchRemarks] = React.useState("Dispatched for outside finishing");
  const [dispatchPhotos, setDispatchPhotos] = React.useState<PhotoInput[]>([]);
  const [chargesAmount, setChargesAmount] = React.useState<string>("");
  const [selectedPieces, setSelectedPieces] = React.useState<
    Array<{ orderItemId: string; sentWeightMg: number }>
  >([]);

  // Vendor Form State
  const [newVendorName, setNewVendorName] = React.useState("");
  const [newVendorPhone, setNewVendorPhone] = React.useState("");
  const [newVendorAddress, setNewVendorAddress] = React.useState("");
  const [newVendorProcesses, setNewVendorProcesses] = React.useState("Polishing, Finishing");

  // Receive Return State (per piece return weights and return photos)
  const [returnItemsState, setReturnItemsState] = React.useState<
    Record<
      string,
      {
        selected: boolean;
        returnedWeightMg: number;
        returnPhotos: PhotoInput[];
        returnRemarks: string;
        nextStageId?: string;
      }
    >
  >({});
  const [overallReturnRemarks, setOverallReturnRemarks] = React.useState("Received back from job work");

  const togglePieceForDispatch = (piece: PieceOption) => {
    const exists = selectedPieces.find((it) => it.orderItemId === piece.id);
    if (exists) {
      setSelectedPieces((prev) => prev.filter((it) => it.orderItemId !== piece.id));
    } else {
      setSelectedPieces((prev) => [
        ...prev,
        { orderItemId: piece.id, sentWeightMg: piece.estimatedWeightMg },
      ]);
    }
  };

  const updateSentWeight = (orderItemId: string, sentWeightMg: number) => {
    setSelectedPieces((prev) =>
      prev.map((p) => (p.orderItemId === orderItemId ? { ...p, sentWeightMg } : p))
    );
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (selectedPieces.length === 0) {
      toast.error("Select at least one piece to dispatch");
      return;
    }
    if (dispatchRemarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createJobWorkDispatch({
        vendorId,
        processType,
        expectedReturnDate,
        remarks: dispatchRemarks,
        dispatchPhotos,
        chargesAmount: chargesAmount ? parseFloat(chargesAmount) : undefined,
        items: selectedPieces,
      });

      if (res.ok) {
        toast.success(res.message || "Job work challan generated!");
        const v = vendors.find((v) => v.id === vendorId);
        setJobWorks((prev) => [
          {
            id: res.data.jobWorkId,
            challanNo: res.data.challanNo,
            vendorName: v?.name || "Vendor",
            vendorPhone: v?.phone || "",
            processType,
            totalPieces: selectedPieces.length,
            returnedPieces: 0,
            dispatchDate: new Date(),
            expectedReturnDate,
            isOverdue: false,
            remarks: dispatchRemarks,
            items: selectedPieces.map((p) => ({
              orderItemId: p.orderItemId,
              sentWeightMg: p.sentWeightMg,
              status: "SENT",
            })),
          },
          ...prev,
        ]);
        setIsDispatchModalOpen(false);
        setSelectedPieces([]);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to create dispatch challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName || !newVendorPhone) {
      toast.error("Name and phone are required");
      return;
    }

    const procs = newVendorProcesses.split(",").map((p) => p.trim()).filter(Boolean);
    try {
      const res = await createJobWorkVendor({
        name: newVendorName,
        phone: newVendorPhone,
        address: newVendorAddress,
        processTypes: procs,
      });

      if (res.ok) {
        toast.success("Vendor added successfully!");
        setVendorId(res.data.vendorId);
        setIsVendorModalOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to create vendor");
    }
  };

  const openReturnModal = (jw: JobWorkRow) => {
    setActiveReturnJobWork(jw);
    const initialMap: typeof returnItemsState = {};
    jw.items.forEach((it: any) => {
      const pieceId = it.orderItemId?._id?.toString() || it.orderItemId;
      if (it.status === "SENT") {
        initialMap[pieceId] = {
          selected: true,
          returnedWeightMg: it.sentWeightMg,
          returnPhotos: [],
          returnRemarks: "Returned from polishing with standard loss",
          nextStageId: stages[stages.length - 2]?.id, // Quality Check
        };
      }
    });
    setReturnItemsState(initialMap);
  };

  const handleConfirmReturn = async () => {
    if (!activeReturnJobWork) return;

    const returnItemsPayload = Object.entries(returnItemsState)
      .filter(([_, state]) => state.selected)
      .map(([orderItemId, state]) => ({
        orderItemId,
        returnedWeightMg: state.returnedWeightMg,
        returnPhotos: state.returnPhotos,
        returnRemarks: state.returnRemarks,
        nextStageId: state.nextStageId,
      }));

    if (returnItemsPayload.length === 0) {
      toast.error("Please select at least one piece to mark as returned");
      return;
    }

    // Validate mandatory return photos
    for (const item of returnItemsPayload) {
      if (!item.returnPhotos || item.returnPhotos.length === 0) {
        toast.error("Verification photos are mandatory on job work return!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await receiveJobWorkReturn({
        jobWorkId: activeReturnJobWork.id,
        remarks: overallReturnRemarks,
        returnItems: returnItemsPayload,
      });

      if (res.ok) {
        toast.success(res.message || "Pieces received back and losses calculated!");
        setActiveReturnJobWork(null);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to record return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<JobWorkRow>[] = [
    {
      accessorKey: "challanNo",
      header: "Challan No",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">
          {row.original.challanNo}
        </span>
      ),
    },
    {
      accessorKey: "vendorName",
      header: "Outside Vendor",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {row.original.vendorName}
          </span>
          <p className="text-[11px] font-mono text-neutral-400">
            {row.original.vendorPhone}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "processType",
      header: "Process Type",
      cell: ({ row }) => (
        <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 text-xs font-semibold">
          {row.original.processType}
        </span>
      ),
    },
    {
      accessorKey: "totalPieces",
      header: "Return Progress",
      cell: ({ row }) => (
        <span className="text-xs font-semibold">
          {row.original.returnedPieces} / {row.original.totalPieces} pieces back
        </span>
      ),
    },
    {
      accessorKey: "expectedReturnDate",
      header: "Expected Return",
      cell: ({ row }) => (
        <span
          className={`text-xs font-mono ${
            row.original.isOverdue ? "text-red-600 font-bold" : "text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {formatISTDate(row.original.expectedReturnDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const hasPending = row.original.returnedPieces < row.original.totalPieces;
        return (
          <div className="flex items-center gap-1.5">
            <a
              href={`/api/pdf/job-work/${row.original.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 font-medium"
            >
              <FileText className="h-3 w-3 text-red-500" /> Challan PDF
            </a>

            {hasPending && (
              <Button
                variant="gold"
                size="sm"
                onClick={() => openReturnModal(row.original)}
                className="h-7 text-xs"
              >
                Receive Back
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Flame className="h-5 w-5 text-purple-600" />
            Outside Job Work & Finishing Challans
          </h2>
          <p className="text-xs text-neutral-500">
            Manage vendor dispatches for polishing, plating, enameling, and track weight losses on return.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVendorModalOpen(true)}
            className="text-xs"
          >
            + Add Vendor
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsDispatchModalOpen(true)}
            className="text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dispatch Challan
          </Button>
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        columns={columns}
        data={jobWorks}
        searchPlaceholder="Search challan no, vendor name, process..."
        exportFilename="bms_job_work.csv"
        renderMobileCard={(jw) => (
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                {jw.challanNo}
              </span>
              <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                {jw.processType}
              </span>
            </div>

            <div>
              <p className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                {jw.vendorName}
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">{jw.vendorPhone}</p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <span>{jw.returnedPieces}/{jw.totalPieces} pieces back</span>
              <span className={jw.isOverdue ? "text-red-600 font-bold" : ""}>
                Due: {formatISTDate(jw.expectedReturnDate)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <a
                href={`/api/pdf/job-work/${jw.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 font-medium inline-flex items-center gap-1"
              >
                <FileText className="h-3 w-3 text-red-500" /> PDF
              </a>
              {jw.returnedPieces < jw.totalPieces && (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => openReturnModal(jw)}
                  className="h-7 text-xs"
                >
                  Receive Back
                </Button>
              )}
            </div>
          </div>
        )}
      />

      {/* Dispatch Modal */}
      <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Dispatch Pieces to Outside Job Work</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDispatch} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Select Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.processTypes.join(", ")})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Process Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={processType}
                  onChange={(e) => setProcessType(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                >
                  {processTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Expected Return Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Estimated Vendor Charges (₹)
                </label>
                <Input
                  type="number"
                  placeholder="Optional (e.g. 1500)"
                  value={chargesAmount}
                  onChange={(e) => setChargesAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Pick Pieces */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Select Workshop Pieces to Dispatch ({selectedPieces.length} selected)
              </label>

              {eligiblePieces.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-neutral-50/50">
                  {eligiblePieces.map((p) => {
                    const isSelected = !!selectedPieces.find(
                      (it) => it.orderItemId === p.id
                    );
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePieceForDispatch(p)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 font-semibold"
                            : "border-neutral-200"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{p.pieceNo} ({p.category})</p>
                          <p className="text-[11px] text-neutral-500">{p.description}</p>
                        </div>
                        <span className="font-mono font-semibold">
                          {formatWeight(p.estimatedWeightMg)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 p-3 border border-dashed rounded text-center">
                  No eligible unassigned pieces in workshop.
                </p>
              )}
            </div>

            {/* Dispatched Weights */}
            {selectedPieces.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-800">
                  Verify Dispatched Weights
                </h4>
                {selectedPieces.map((it) => {
                  const piece = eligiblePieces.find((p) => p.id === it.orderItemId);
                  return (
                    <div
                      key={it.orderItemId}
                      className="flex items-center justify-between p-2 rounded bg-neutral-100 text-xs gap-3"
                    >
                      <span className="font-bold">{piece?.pieceNo}</span>
                      <WeightInput
                        valueMg={it.sentWeightMg}
                        onChangeMg={(mg) => updateSentWeight(it.orderItemId, mg)}
                        label="Dispatched Gross Weight"
                        className="w-48"
                        required
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <PhotoUploader
              photos={dispatchPhotos}
              onChange={setDispatchPhotos}
              label="Dispatch Verification Photos (Optional)"
              maxPhotos={3}
            />

            <RemarksField
              value={dispatchRemarks}
              onChange={setDispatchRemarks}
              label="Process Instructions & Finish Details"
              required
              minChars={3}
            />

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDispatchModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={isSubmitting || selectedPieces.length === 0}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Generate Challan & PDF
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Return Modal (Supports Partial Returns & Loss Calculation) */}
      {activeReturnJobWork && (
        <Dialog
          open={!!activeReturnJobWork}
          onOpenChange={(open) => !open && setActiveReturnJobWork(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Receive Pieces Back — Challan {activeReturnJobWork.challanNo}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-xs space-y-1">
                <p>Vendor: <strong>{activeReturnJobWork.vendorName}</strong></p>
                <p>Process: <strong>{activeReturnJobWork.processType}</strong></p>
                <p className="text-[11px] text-neutral-500">
                  Check each returned piece, enter verified return weight, and attach photos to auto-compute loss.
                </p>
              </div>

              {/* Per Piece Return Rows */}
              <div className="space-y-3">
                {activeReturnJobWork.items
                  .filter((it: any) => it.status === "SENT")
                  .map((it: any) => {
                    const pieceId = it.orderItemId?._id?.toString() || it.orderItemId;
                    const pieceNo = it.orderItemId?.pieceNo || "Piece";
                    const state = returnItemsState[pieceId] || {
                      selected: true,
                      returnedWeightMg: it.sentWeightMg,
                      returnPhotos: [],
                      returnRemarks: "",
                    };

                    const sentMg = it.sentWeightMg;
                    const retMg = state.returnedWeightMg;
                    const lossMg = sentMg - retMg;
                    const lossPct = sentMg > 0 ? (lossMg / sentMg) * 100 : 0;

                    return (
                      <div
                        key={pieceId}
                        className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 space-y-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.selected}
                              onChange={(e) =>
                                setReturnItemsState((prev) => ({
                                  ...prev,
                                  [pieceId]: {
                                    ...state,
                                    selected: e.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4 accent-amber-600"
                            />
                            <span>{pieceNo}</span>
                          </label>
                          <span className="font-mono text-neutral-400">
                            Sent Wt: {formatWeight(sentMg)}
                          </span>
                        </div>

                        {state.selected && (
                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              <WeightInput
                                valueMg={state.returnedWeightMg}
                                onChangeMg={(mg) =>
                                  setReturnItemsState((prev) => ({
                                    ...prev,
                                    [pieceId]: { ...state, returnedWeightMg: mg },
                                  }))
                                }
                                label="Returned Weight"
                                baselineMg={sentMg}
                                required
                              />

                              {/* Loss Calculation */}
                              <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-2 text-xs">
                                <span className="text-[10px] text-neutral-400">Process Loss:</span>
                                <p
                                  className={`font-mono font-bold ${
                                    lossMg > 0 ? "text-amber-600" : "text-emerald-600"
                                  }`}
                                >
                                  {(lossMg / 1000).toFixed(3)} g ({lossPct.toFixed(2)}%)
                                </p>
                              </div>
                            </div>

                            {/* Return Verification Photos (MANDATORY) */}
                            <PhotoUploader
                              photos={state.returnPhotos}
                              onChange={(photos) =>
                                setReturnItemsState((prev) => ({
                                  ...prev,
                                  [pieceId]: { ...state, returnPhotos: photos },
                                }))
                              }
                              label="Return Verification Photos (Mandatory)"
                              required
                            />

                            <Input
                              placeholder="Piece return remarks..."
                              value={state.returnRemarks}
                              onChange={(e) =>
                                setReturnItemsState((prev) => ({
                                  ...prev,
                                  [pieceId]: {
                                    ...state,
                                    returnRemarks: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <RemarksField
                value={overallReturnRemarks}
                onChange={setOverallReturnRemarks}
                label="Overall Return Remarks"
                required
                minChars={3}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveReturnJobWork(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={handleConfirmReturn}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirm Return & Update Pieces
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Vendor Modal */}
      <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Register Outside Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVendor} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Vendor / Workshop Name *</label>
              <Input
                placeholder="e.g. Golden Touch Rhodium Works"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Mobile Number *</label>
              <Input
                placeholder="9830055551"
                value={newVendorPhone}
                onChange={(e) => setNewVendorPhone(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Process Types (comma separated)</label>
              <Input
                placeholder="Polishing, Rhodium Plating, Finishing"
                value={newVendorProcesses}
                onChange={(e) => setNewVendorProcesses(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Address / Workshop Location</label>
              <Input
                placeholder="e.g. 2nd Floor, Zaveri Bazaar, Mumbai"
                value={newVendorAddress}
                onChange={(e) => setNewVendorAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsVendorModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm">
                Save Vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
