"use client";

import * as React from "react";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { CheckCircle2, XCircle, Loader2, Sparkles, Scale, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { reviewProgress } from "@/actions/progress";
import { toast } from "sonner";

interface PendingSubmissionItem {
  id: string;
  pieceNo: string;
  category: string;
  artisanName: string;
  stageName: string;
  submittedWeightMg: number;
  submittedAt: string | Date;
  remarks: string;
  photos: any[];
}

interface PendingSubmissionsCardProps {
  submissions: PendingSubmissionItem[];
  stages: Array<{ id: string; name: string }>;
}

export function PendingSubmissionsCard({
  submissions = [],
  stages = [],
}: PendingSubmissionsCardProps) {
  const [selectedSub, setSelectedSub] = React.useState<PendingSubmissionItem | null>(null);
  const [actionType, setActionType] = React.useState<"APPROVED" | "REJECTED" | null>(null);
  const [verificationRemarks, setVerificationRemarks] = React.useState("");
  const [nextStageId, setNextStageId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenReview = (sub: PendingSubmissionItem, type: "APPROVED" | "REJECTED") => {
    setSelectedSub(sub);
    setActionType(type);
    setVerificationRemarks(type === "APPROVED" ? "Verified weight and workmanship. Approved." : "Needs rework. Please check tolerances.");
  };

  const handleConfirmReview = async () => {
    if (!selectedSub || !actionType) return;
    if (verificationRemarks.trim().length < 3) {
      toast.error("Verification remarks are mandatory (min 3 chars)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reviewProgress({
        progressId: selectedSub.id,
        verificationStatus: actionType,
        verificationRemarks,
        nextStageId: nextStageId || undefined,
      });

      if (res.ok) {
        toast.success(res.message || "Review submitted successfully");
        setSelectedSub(null);
        setActionType(null);
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200/80 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs">
        <Sparkles className="mx-auto h-8 w-8 text-amber-500 mb-2 opacity-60" />
        <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          All Submissions Reviewed!
        </h4>
        <p className="text-[11px] text-neutral-400 mt-1">
          No pending artisan submissions awaiting workshop verification.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs hover:border-amber-300 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {sub.pieceNo}
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  {sub.category}
                </span>
                <span className="text-[11px] text-neutral-400">•</span>
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                  {sub.artisanName}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                <span>Stage: <strong className="text-neutral-700 dark:text-neutral-300">{sub.stageName}</strong></span>
                <span className="flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400 font-semibold">
                  <Scale className="h-3 w-3" />
                  {formatWeight(sub.submittedWeightMg)}
                </span>
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  {sub.photos?.length || 0} photo(s)
                </span>
                <span className="text-neutral-400">
                  {formatISTDate(sub.submittedAt)}
                </span>
              </div>

              {sub.remarks && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                  &ldquo;{sub.remarks}&rdquo;
                </p>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenReview(sub, "REJECTED")}
                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => handleOpenReview(sub, "APPROVED")}
                className="h-8 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve & Advance
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Review Dialog */}
      {selectedSub && (
        <Dialog open={!!selectedSub} onOpenChange={(open) => !open && setSelectedSub(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {actionType === "APPROVED" ? "Approve Artisan Work" : "Return for Rework"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg text-xs space-y-1">
                <p>Piece: <strong>{selectedSub.pieceNo}</strong> ({selectedSub.category})</p>
                <p>Artisan: <strong>{selectedSub.artisanName}</strong></p>
                <p>Submitted Weight: <strong className="font-mono text-amber-600">{formatWeight(selectedSub.submittedWeightMg)}</strong></p>
              </div>

              {/* Photos */}
              {selectedSub.photos && selectedSub.photos.length > 0 && (
                <PhotoGallery photos={selectedSub.photos} title="Submitted Verification Photos" />
              )}

              {actionType === "APPROVED" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Next Stage (Optional override):
                  </label>
                  <select
                    value={nextStageId}
                    onChange={(e) => setNextStageId(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
                  >
                    <option value="">Auto Next Stage</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <RemarksField
                value={verificationRemarks}
                onChange={setVerificationRemarks}
                label="Verification Remarks"
                required
                minChars={3}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSub(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === "APPROVED" ? "gold" : "destructive"}
                size="sm"
                onClick={handleConfirmReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirm {actionType}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
