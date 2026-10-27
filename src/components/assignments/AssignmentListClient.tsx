"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { PendingSubmissionsCard } from "@/components/dashboard/PendingSubmissionsCard";
import { createAssignment } from "@/actions/assignment";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  ClipboardList,
  Plus,
  FileText,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface AssignmentRow {
  id: string;
  workOrderNo: string;
  artisanName: string;
  artisanPhone: string;
  artisanCode: string;
  itemsCount: number;
  totalIssuedWeightMg: number;
  issueDate: string | Date;
  dueDate: string | Date;
  issuedByName: string;
  remarks: string;
}

interface PieceOption {
  id: string;
  pieceNo: string;
  category: string;
  description: string;
  metal: string;
  purity: string;
  estimatedWeightMg: number;
  currentStageId?: string;
  currentLocation: string;
}

interface ArtisanOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  speciality: string[];
}

interface StageOption {
  id: string;
  name: string;
}

interface AssignmentListClientProps {
  initialAssignments: AssignmentRow[];
  eligiblePieces: PieceOption[];
  artisans: ArtisanOption[];
  stages: StageOption[];
  pendingSubmissions: any[];
}

export function AssignmentListClient({
  initialAssignments,
  eligiblePieces = [],
  artisans = [],
  stages = [],
  pendingSubmissions = [],
}: AssignmentListClientProps) {
  const searchParams = useSearchParams();
  const preselectedArtisanId = searchParams.get("artisanId") || "";
  const preselectedOrderId = searchParams.get("orderId") || "";

  const [assignments, setAssignments] = React.useState<AssignmentRow[]>(initialAssignments);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [artisanId, setArtisanId] = React.useState<string>(preselectedArtisanId);
  const [dueDate, setDueDate] = React.useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = React.useState("Work Order issued for jewellery production");
  const [selectedPieceItems, setSelectedPieceItems] = React.useState<
    Array<{
      orderItemId: string;
      stageId: string;
      issuedWeightMg: number;
      instructions: string;
    }>
  >([]);

  // Automatically select piece if available
  const togglePieceSelection = (piece: PieceOption) => {
    const exists = selectedPieceItems.find((it) => it.orderItemId === piece.id);
    if (exists) {
      setSelectedPieceItems((prev) => prev.filter((it) => it.orderItemId !== piece.id));
    } else {
      setSelectedPieceItems((prev) => [
        ...prev,
        {
          orderItemId: piece.id,
          stageId: stages[0]?.id || "",
          issuedWeightMg: piece.estimatedWeightMg || 0,
          instructions: "",
        },
      ]);
    }
  };

  const updateItemField = (orderItemId: string, field: string, value: any) => {
    setSelectedPieceItems((prev) =>
      prev.map((it) =>
        it.orderItemId === orderItemId ? { ...it, [field]: value } : it
      )
    );
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artisanId) {
      toast.error("Please pick an artisan");
      return;
    }
    if (selectedPieceItems.length === 0) {
      toast.error("Please pick at least one piece to assign");
      return;
    }
    if (remarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAssignment({
        artisanId,
        dueDate,
        remarks,
        photos: [],
        items: selectedPieceItems,
      });

      if (res.ok) {
        toast.success(res.message || "Work order generated!");
        const art = artisans.find((a) => a.id === artisanId);
        const totalWt = selectedPieceItems.reduce(
          (sum, it) => sum + it.issuedWeightMg,
          0
        );

        setAssignments((prev) => [
          {
            id: res.data.assignmentId,
            workOrderNo: res.data.workOrderNo,
            artisanName: art?.name || "Artisan",
            artisanPhone: art?.phone || "",
            artisanCode: art?.code || "KAR",
            itemsCount: selectedPieceItems.length,
            totalIssuedWeightMg: totalWt,
            issueDate: new Date(),
            dueDate,
            issuedByName: "Supervisor",
            remarks,
          },
          ...prev,
        ]);

        setIsModalOpen(false);
        setSelectedPieceItems([]);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to create work order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<AssignmentRow>[] = [
    {
      accessorKey: "workOrderNo",
      header: "Work Order No",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
          {row.original.workOrderNo}
        </span>
      ),
    },
    {
      accessorKey: "artisanName",
      header: "Artisan (Karigar)",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {row.original.artisanName}
          </span>
          <p className="text-[11px] font-mono text-neutral-400">
            {row.original.artisanPhone} ({row.original.artisanCode})
          </p>
        </div>
      ),
    },
    {
      accessorKey: "itemsCount",
      header: "Assigned Pieces",
      cell: ({ row }) => (
        <span className="font-semibold text-xs">
          {row.original.itemsCount} piece(s)
        </span>
      ),
    },
    {
      accessorKey: "totalIssuedWeightMg",
      header: "Issued Weight",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
          {formatWeight(row.original.totalIssuedWeightMg)}
        </span>
      ),
    },
    {
      accessorKey: "issueDate",
      header: "Issue / Due Date",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="text-neutral-600 dark:text-neutral-300">
            Issued: {formatISTDate(row.original.issueDate)}
          </p>
          <p className="text-[11px] text-neutral-400">
            Due: {formatISTDate(row.original.dueDate)}
          </p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const appUrl = typeof window !== "undefined" ? window.location.origin : "";
        const pdfUrl = `${appUrl}/api/pdf/work-order/${row.original.id}`;
        const encodedMsg = encodeURIComponent(
          `Namaste ${row.original.artisanName}, here is your Work Order ${row.original.workOrderNo} from BMS Jewellery. Download Work Order PDF: ${pdfUrl}`
        );
        const whatsappUrl = `https://wa.me/${row.original.artisanPhone.replace(/\D/g, "")}?text=${encodedMsg}`;

        return (
          <div className="flex items-center gap-1.5">
            {/* View PDF */}
            <a
              href={`/api/pdf/work-order/${row.original.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 font-medium cursor-pointer"
              title="Download Work Order PDF"
            >
              <FileText className="h-3 w-3 text-red-500" /> PDF
            </a>

            {/* WhatsApp Share Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer"
              title="Share on WhatsApp with Karigar"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Issue Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            Work Orders & Artisan Assignments
          </h2>
          <p className="text-xs text-neutral-500">
            Issue pieces to karigars with weights & instructions, generate A4 PDFs, and share via WhatsApp.
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs self-start sm:self-auto"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Issue New Work Order
        </Button>
      </div>

      {/* Review Queue (If any pending) */}
      {pendingSubmissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pending Karigar Submissions Requiring Review ({pendingSubmissions.length})
          </h3>
          <PendingSubmissionsCard
            submissions={pendingSubmissions}
            stages={stages}
          />
        </div>
      )}

      {/* Work Orders Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          All Issued Work Orders ({assignments.length})
        </h3>
        <DataTable
          columns={columns}
          data={assignments}
          searchPlaceholder="Search work order no, artisan name, phone..."
          exportFilename="bms_work_orders.csv"
          renderMobileCard={(asgn) => {
            const appUrl = typeof window !== "undefined" ? window.location.origin : "";
            const pdfUrl = `${appUrl}/api/pdf/work-order/${asgn.id}`;
            const encodedMsg = encodeURIComponent(
              `Namaste ${asgn.artisanName}, Work Order ${asgn.workOrderNo} from BMS Jewellery: ${pdfUrl}`
            );
            const whatsappUrl = `https://wa.me/${asgn.artisanPhone.replace(/\D/g, "")}?text=${encodedMsg}`;

            return (
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    {asgn.workOrderNo}
                  </span>
                  <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatWeight(asgn.totalIssuedWeightMg)}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                    Artisan: {asgn.artisanName} ({asgn.artisanCode})
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {asgn.itemsCount} piece(s) assigned
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Issued: {formatISTDate(asgn.issueDate)}</span>
                  <span>Due: {formatISTDate(asgn.dueDate)}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <a
                    href={`/api/pdf/work-order/${asgn.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 font-medium"
                  >
                    <FileText className="h-3 w-3 text-red-500" /> PDF
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-emerald-600 text-white font-medium"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Create Work Order Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Issue Work Order to Artisan (Karigar)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-1">
            {/* Pick Artisan & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Assign To Karigar <span className="text-red-500">*</span>
                </label>
                <select
                  value={artisanId}
                  onChange={(e) => setArtisanId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
                >
                  <option value="">Select Karigar</option>
                  {artisans.map((art) => (
                    <option key={art.id} value={art.id}>
                      {art.name} ({art.code}) — {art.speciality.join(", ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Work Order Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Pick Eligible Pieces (Checklist) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                <span>Select Pieces to Assign ({selectedPieceItems.length} selected)</span>
                <span className="text-[10px] text-neutral-400">
                  Only in-house unassigned pieces shown
                </span>
              </label>

              {eligiblePieces.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-neutral-50/50 dark:bg-neutral-900/40">
                  {eligiblePieces.map((p) => {
                    const isSelected = !!selectedPieceItems.find(
                      (it) => it.orderItemId === p.id
                    );
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePieceSelection(p)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 font-semibold"
                            : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100">
                            {p.pieceNo} — {p.category}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {p.description} ({p.metal} {p.purity})
                          </p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {formatWeight(p.estimatedWeightMg)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 p-4 border border-dashed rounded-lg text-center">
                  No eligible unassigned pieces in workshop.
                </p>
              )}
            </div>

            {/* Piece Specific Weights & Instructions */}
            {selectedPieceItems.length > 0 && (
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Configure Issued Weights & Bench Instructions
                </h4>

                {selectedPieceItems.map((item, idx) => {
                  const piece = eligiblePieces.find(
                    (p) => p.id === item.orderItemId
                  );
                  return (
                    <div
                      key={item.orderItemId}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/60 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                        <span>Piece: {piece?.pieceNo} ({piece?.category})</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          Estimated: {formatWeight(piece?.estimatedWeightMg)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                            Target Stage
                          </label>
                          <select
                            value={item.stageId}
                            onChange={(e) =>
                              updateItemField(item.orderItemId, "stageId", e.target.value)
                            }
                            className="w-full h-8 rounded border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                          >
                            {stages.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Issued Weight */}
                        <WeightInput
                          valueMg={item.issuedWeightMg}
                          onChangeMg={(mg) =>
                            updateItemField(item.orderItemId, "issuedWeightMg", mg)
                          }
                          label="Issued Weight"
                          baselineMg={piece?.estimatedWeightMg}
                          required
                        />
                      </div>

                      <Input
                        placeholder="Specific instructions for this piece (e.g. seat 42 stones, high polish)..."
                        value={item.instructions}
                        onChange={(e) =>
                          updateItemField(item.orderItemId, "instructions", e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <RemarksField
              value={remarks}
              onChange={setRemarks}
              label="Work Order Remarks & Overall Instructions"
              required
              minChars={3}
            />

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={isSubmitting || selectedPieceItems.length === 0}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Generate Work Order & PDF
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
