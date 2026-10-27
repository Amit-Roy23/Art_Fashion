"use client";

import * as React from "react";
import Link from "next/link";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { WeightInput } from "@/components/forms/WeightInput";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoUploader } from "@/components/photo/PhotoUploader";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { submitProgress } from "@/actions/progress";
import { toast } from "sonner";
import {
  Gem,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Scale,
  Camera,
  Loader2,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import { PhotoInput } from "@/schemas/photo";

interface KarigarWorkDetailClientProps {
  piece: any;
  assignment: any;
  submissions: any[];
}

export function KarigarWorkDetailClient({
  piece,
  assignment,
  submissions = [],
}: KarigarWorkDetailClientProps) {
  const [submittedWeightMg, setSubmittedWeightMg] = React.useState<number>(
    piece.estimatedWeightMg || 0
  );
  const [completionPercent, setCompletionPercent] = React.useState<number>(100);
  const [isStageComplete, setIsStageComplete] = React.useState<boolean>(true);
  const [remarks, setRemarks] = React.useState("");
  const [photos, setPhotos] = React.useState<PhotoInput[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) {
      toast.error("Work order record not found");
      return;
    }
    if (!submittedWeightMg || submittedWeightMg <= 0) {
      toast.error("Please enter the recorded piece weight in grams");
      return;
    }
    if (photos.length === 0) {
      toast.error("At least one verification photo from camera is required");
      return;
    }
    if (remarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitProgress({
        assignmentId: assignment._id.toString(),
        orderItemId: piece._id.toString(),
        artisanId: piece.currentArtisanId?.toString() || "",
        stageId: piece.currentStageId?._id?.toString() || "",
        submittedWeightMg,
        completionPercent,
        isStageComplete,
        photos,
        remarks,
      });

      if (res.ok) {
        toast.success(res.message || "Progress submitted for verification!");
        setRemarks("");
        setPhotos([]);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to submit progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignedItem = assignment?.items?.find(
    (it: any) => it.orderItemId?.toString() === piece._id.toString()
  );

  return (
    <div className="space-y-4">
      {/* Piece Header */}
      <div className="p-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
            {piece.pieceNo}
          </span>
          <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold dark:bg-amber-950 dark:text-amber-200">
            {piece.category}
          </span>
        </div>

        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {piece.description}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="rounded bg-neutral-50 p-2 dark:bg-neutral-800/60">
            <span className="text-[10px] text-neutral-400">Metal & Purity</span>
            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
              {piece.metal} {piece.purity}
            </p>
          </div>
          <div className="rounded bg-neutral-50 p-2 dark:bg-neutral-800/60">
            <span className="text-[10px] text-neutral-400">Current Stage</span>
            <p className="font-semibold text-amber-600">
              {piece.currentStageId?.name || "Manufacturing"}
            </p>
          </div>
        </div>

        {assignedItem?.instructions && (
          <div className="p-2.5 rounded bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-800">
            <strong>Supervisor Instructions:</strong> {assignedItem.instructions}
          </div>
        )}

        {/* Download PDF button */}
        {assignment && (
          <div className="pt-1">
            <a
              href={`/api/pdf/work-order/${assignment._id.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              <FileText className="h-4 w-4 text-red-500" />
              Download Official Work Order PDF ({assignment.workOrderNo})
            </a>
          </div>
        )}
      </div>

      {/* Progress Submission Form */}
      <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Camera className="h-4 w-4 text-amber-600" />
            Submit Work & Recorded Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Weight Input */}
            <WeightInput
              valueMg={submittedWeightMg}
              onChangeMg={setSubmittedWeightMg}
              baselineMg={assignedItem?.issuedWeightMg || piece.estimatedWeightMg}
              label="Completed / Deposited Weight"
              required
            />

            {/* Stage completion toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Is this stage complete?
                </p>
                <p className="text-[11px] text-neutral-400">
                  Ready to return piece to workshop inspection
                </p>
              </div>
              <input
                type="checkbox"
                checked={isStageComplete}
                onChange={(e) => setIsStageComplete(e.target.checked)}
                className="h-5 w-5 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Photo Uploader with Camera Capture */}
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              label="Take Verification Photo (Camera)"
              allowCamera={true}
              required
            />

            {/* Remarks */}
            <RemarksField
              value={remarks}
              onChange={setRemarks}
              label="Work Notes & Gemstone Details"
              placeholder="e.g. Setting completed, stones secured, filed edges..."
              required
              minChars={3}
            />

            <Button
              type="submit"
              variant="gold"
              className="w-full h-11 text-sm font-bold shadow-md cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Photos & Submitting...
                </>
              ) : (
                "Submit Work to Workshop"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Submission History & Supervisor Notes */}
      {submissions.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
            Submission History & Review Notes
          </h3>

          <div className="space-y-2">
            {submissions.map((sub: any) => (
              <div
                key={sub._id.toString()}
                className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Stage: {sub.stageId?.name || "Manufacturing"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.verificationStatus === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : sub.verificationStatus === "REJECTED"
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {sub.verificationStatus}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Weight: {formatWeight(sub.submittedWeightMg)}</span>
                  <span>{formatISTDate(sub.submittedAt)}</span>
                </div>

                {sub.remarks && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                    My note: &ldquo;{sub.remarks}&rdquo;
                  </p>
                )}

                {sub.verificationRemarks && (
                  <p className="text-[11px] text-neutral-800 dark:text-neutral-200 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <strong>Workshop Feedback:</strong> {sub.verificationRemarks}
                  </p>
                )}

                {sub.photos && sub.photos.length > 0 && (
                  <div className="pt-1">
                    <PhotoGallery photos={sub.photos} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
