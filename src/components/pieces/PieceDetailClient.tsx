"use client";

import * as React from "react";
import Link from "next/link";
import { formatISTDate } from "@/lib/utils";
import { formatWeight, computeWeightDiff, isOverTolerance } from "@/lib/weight";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { Timeline, TimelineEvent } from "@/components/timeline/Timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RemarksField } from "@/components/forms/RemarksField";
import { updatePieceStatus, advancePieceStage } from "@/actions/piece";
import { toast } from "sonner";
import {
  Gem,
  ArrowLeft,
  Scale,
  Calendar,
  User,
  MapPin,
  Clock,
  ArrowRight,
  AlertTriangle,
  Edit,
  Sparkles,
} from "lucide-react";

interface PieceDetailClientProps {
  piece: any;
  order: any;
  customer: any;
  stages: any[];
  statuses: any[];
  weightJourney: any[];
  timelineEvents: TimelineEvent[];
  tolerancePercent?: number;
}

export function PieceDetailClient({
  piece,
  order,
  customer,
  stages = [],
  statuses = [],
  weightJourney = [],
  timelineEvents = [],
  tolerancePercent = 0.5,
}: PieceDetailClientProps) {
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [isAdvanceStageModalOpen, setIsAdvanceStageModalOpen] = React.useState(false);
  const [selectedStatusId, setSelectedStatusId] = React.useState(
    piece.statusId?._id?.toString() || ""
  );
  const [selectedStageId, setSelectedStageId] = React.useState(
    piece.currentStageId?._id?.toString() || ""
  );
  const [remarks, setRemarks] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleUpdateStatus = async () => {
    if (!selectedStatusId) {
      toast.error("Please select a status");
      return;
    }
    if (remarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updatePieceStatus({
        pieceId: piece._id.toString(),
        statusId: selectedStatusId,
        remarks,
        photos: [],
      });

      if (res.ok) {
        toast.success("Piece status updated");
        setIsStatusModalOpen(false);
        setRemarks("");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!selectedStageId) {
      toast.error("Please select a stage");
      return;
    }
    if (remarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await advancePieceStage(
        piece._id.toString(),
        selectedStageId,
        remarks
      );

      if (res.ok) {
        toast.success(res.message || "Stage advanced");
        setIsAdvanceStageModalOpen(false);
        setRemarks("");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to advance stage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/orders/${piece.orderId?._id?.toString() || ""}`}>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {piece.pieceNo}
              </h1>
              <span className="font-semibold text-xs rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2 py-0.5">
                {piece.category}
              </span>
              <StatusBadge
                statusName={piece.statusId?.name}
                systemCategory={piece.systemStatus}
                customColour={piece.statusId?.colour}
              />
            </div>
            <p className="text-xs text-neutral-500">
              Parent Order:{" "}
              <Link
                href={`/orders/${piece.orderId?._id?.toString()}`}
                className="text-amber-600 font-semibold hover:underline"
              >
                {order?.orderNo}
              </Link>{" "}
              • Customer:{" "}
              <Link
                href={`/customers/${customer?._id?.toString()}`}
                className="text-amber-600 font-semibold hover:underline"
              >
                {customer?.name}
              </Link>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="text-xs h-8"
          >
            <Edit className="h-3 w-3 mr-1" />
            Change Status
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsAdvanceStageModalOpen(true)}
            className="text-xs h-8"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Advance Stage
          </Button>
        </div>
      </div>

      {/* Specifications & Stage Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Piece Specs */}
        <div className="md:col-span-2 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Craftsmanship & Material Specifications
          </h3>

          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {piece.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Metal & Purity</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {piece.metal} ({piece.purity})
              </p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Size / Dimensions</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {piece.size || "Standard"}
              </p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Estimated Weight</span>
              <p className="font-mono font-bold text-amber-600">
                {formatWeight(piece.estimatedWeightMg)}
              </p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Quantity</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {piece.quantity || 1} unit(s)
              </p>
            </div>
          </div>

          {piece.stoneDetails && (
            <div className="rounded-lg bg-neutral-50 p-2.5 text-xs dark:bg-neutral-800/60">
              <span className="text-[10px] text-neutral-400">Gemstones / Stones:</span>
              <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                {piece.stoneDetails}
              </p>
            </div>
          )}
        </div>

        {/* Current Location & Artisan Tracking */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Current Status & Assignment
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-400">Location:</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {piece.currentLocation.replace(/_/g, " ")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-400">Current Stage:</span>
              <span className="font-bold text-amber-600">
                {piece.currentStageId?.name || "Stage 1"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-400">Assigned Karigar:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {piece.currentArtisanId?.name || "None (In House)"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-400">Due Date:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {formatISTDate(piece.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WEIGHT JOURNEY TABLE (Estimated -> Issued -> Submitted -> Job Work -> Final) */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-600" />
            Comprehensive Weight Journey & Variance Record
          </h3>
          <span className="text-[11px] text-neutral-400">
            Allowed Loss Tolerance: ±{tolerancePercent}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-neutral-500 uppercase">
              <tr>
                <th className="p-3">Stage / Milestone</th>
                <th className="p-3">Recorded Weight</th>
                <th className="p-3">Variance / Loss</th>
                <th className="p-3">Tolerance Check</th>
                <th className="p-3">Actor / Receiver</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {weightJourney.map((step, idx) => {
                const isOver =
                  step.diffPercent !== undefined
                    ? isOverTolerance(step.diffPercent, tolerancePercent)
                    : false;

                return (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="p-3 font-semibold text-neutral-800 dark:text-neutral-200">
                      {step.step}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                      {formatWeight(step.weightMg)}
                    </td>
                    <td className="p-3 font-mono">
                      {step.differenceMg !== undefined ? (
                        <span
                          className={
                            step.differenceMg < 0
                              ? "text-red-600 font-semibold"
                              : "text-emerald-600 font-semibold"
                          }
                        >
                          {step.differenceMg > 0 ? "+" : ""}
                          {(step.differenceMg / 1000).toFixed(3)} g (
                          {step.diffPercent}%)
                        </span>
                      ) : (
                        <span className="text-neutral-400">— Baseline</span>
                      )}
                    </td>
                    <td className="p-3">
                      {step.diffPercent !== undefined ? (
                        isOver ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                            <AlertTriangle className="h-3 w-3" /> Exceeds {tolerancePercent}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            ✓ Within Limit
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-300">
                      {step.actor || "Staff"}
                    </td>
                    <td className="p-3 text-neutral-400 font-mono">
                      {formatISTDate(step.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lifecycle Photos Gallery */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Lifecycle Verification Photos ({piece.photos?.length || 0})
        </h3>
        {piece.photos && piece.photos.length > 0 ? (
          <PhotoGallery photos={piece.photos} />
        ) : (
          <p className="text-xs text-neutral-400 text-center py-4">
            No photos captured yet for this piece
          </p>
        )}
      </div>

      {/* Piece Activity Timeline */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Piece Audit & Movement Timeline
        </h3>
        <Timeline events={timelineEvents} />
      </div>

      {/* Advance Stage Modal */}
      <Dialog open={isAdvanceStageModalOpen} onOpenChange={setIsAdvanceStageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Advance Production Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Target Stage <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
              >
                {stages.map((st: any) => (
                  <option key={st._id.toString()} value={st._id.toString()}>
                    {st.sortOrder}. {st.name}
                  </option>
                ))}
              </select>
            </div>

            <RemarksField
              value={remarks}
              onChange={setRemarks}
              label="Stage Advance Remarks"
              placeholder="Inspection results and notes (min 3 chars)..."
              required
              minChars={3}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvanceStageModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleAdvanceStage}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Advancing..." : "Confirm Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Update Piece Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
                className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
              >
                {statuses.map((st: any) => (
                  <option key={st._id.toString()} value={st._id.toString()}>
                    {st.name} ({st.systemCategory})
                  </option>
                ))}
              </select>
            </div>

            <RemarksField
              value={remarks}
              onChange={setRemarks}
              label="Status Change Remarks"
              placeholder="Reason for status change (min 3 chars)..."
              required
              minChars={3}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
