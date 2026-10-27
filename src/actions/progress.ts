"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { OrderItem } from "@/models/OrderItem";
import { ProductionStage } from "@/models/ProductionStage";
import { StatusOption } from "@/models/StatusOption";
import {
  progressSubmissionSchema,
  ProgressSubmissionInput,
  progressReviewSchema,
  ProgressReviewInput,
} from "@/schemas/progress";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function submitProgress(
  input: ProgressSubmissionInput
): Promise<ActionResult<{ progressId: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    const parsed = progressSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const userRole = (session.user as any).role;
    const isStaff = userRole === "OWNER" || userRole === "MANAGER" || userRole === "STAFF";

    const update = await ProgressUpdate.create({
      assignmentId: parsed.data.assignmentId,
      orderItemId: parsed.data.orderItemId,
      artisanId: parsed.data.artisanId,
      stageId: parsed.data.stageId,
      submittedBy: session.user.id,
      submittedAt: new Date(),
      submittedWeightMg: parsed.data.submittedWeightMg,
      completionPercent: parsed.data.completionPercent,
      isStageComplete: parsed.data.isStageComplete,
      photos: parsed.data.photos,
      remarks: parsed.data.remarks,
      verificationStatus: "PENDING",
      createdBy: session.user.id,
    });

    const piece = await OrderItem.findById(parsed.data.orderItemId);
    const pieceNo = piece?.pieceNo || "Piece";

    await logActivity({
      entityType: "ORDER_ITEM",
      entityId: parsed.data.orderItemId,
      action: "PROGRESS_SUBMITTED",
      remarks: `Submitted progress (${parsed.data.completionPercent}%, weight: ${parsed.data.submittedWeightMg / 1000}g). Remarks: ${parsed.data.remarks}`,
      userId: session.user.id,
      userName: session.user.name || "Artisan",
      userRole,
    });

    revalidatePath("/assignments");
    revalidatePath("/k/home");
    revalidatePath(`/k/work/${parsed.data.orderItemId}`);
    revalidatePath(`/pieces/${parsed.data.orderItemId}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: { progressId: update._id.toString() },
      message: `Progress submitted for ${pieceNo}. Awaiting workshop verification.`,
    };
  } catch (error: any) {
    console.error("submitProgress error:", error);
    return { ok: false, error: error.message || "Failed to submit progress" };
  }
}

export async function reviewProgress(
  input: ProgressReviewInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "submissions:approve")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = progressReviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const update = await ProgressUpdate.findById(parsed.data.progressId);
    if (!update || update.isDeleted) {
      return { ok: false, error: "Submission record not found." };
    }

    update.verificationStatus = parsed.data.verificationStatus;
    update.verificationRemarks = parsed.data.verificationRemarks;
    update.verifiedBy = session.user.id as any;
    update.verifiedAt = new Date();
    await update.save();

    const piece = await OrderItem.findById(update.orderItemId);
    if (piece) {
      if (parsed.data.verificationStatus === "APPROVED") {
        if (update.isStageComplete) {
          // If a next stage is specified or available
          if (parsed.data.nextStageId) {
            piece.currentStageId = parsed.data.nextStageId as any;
          } else {
            // Find next stage in sequence
            const allStages = await ProductionStage.find({ isActive: true }).sort({
              sortOrder: 1,
            });
            const currentIdx = allStages.findIndex(
              (s) => s._id.toString() === update.stageId.toString()
            );
            if (currentIdx !== -1 && currentIdx < allStages.length - 1) {
              piece.currentStageId = allStages[currentIdx + 1]._id as any;
            }
          }

          // Return piece to in-house workshop
          piece.currentLocation = "IN_HOUSE";
          piece.currentArtisanId = null;
        }

        // Add photos to piece gallery
        if (update.photos && update.photos.length > 0) {
          piece.photos.push(...(update.photos as any));
        }

        await piece.save();

        await logActivity({
          entityType: "ORDER_ITEM",
          entityId: piece._id.toString(),
          action: "PROGRESS_APPROVED",
          remarks: `Progress approved with deposit weight ${update.submittedWeightMg / 1000}g. Verification note: ${parsed.data.verificationRemarks}`,
          userId: session.user.id,
          userName: session.user.name || "Supervisor",
          userRole: (session.user as any).role,
        });
      } else {
        // REJECTED
        await logActivity({
          entityType: "ORDER_ITEM",
          entityId: piece._id.toString(),
          action: "PROGRESS_REJECTED",
          remarks: `Submission returned for rework: ${parsed.data.verificationRemarks}`,
          userId: session.user.id,
          userName: session.user.name || "Supervisor",
          userRole: (session.user as any).role,
        });
      }
    }

    revalidatePath("/assignments");
    revalidatePath("/k/home");
    revalidatePath(`/pieces/${update.orderItemId}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: undefined,
      message: `Submission marked as ${parsed.data.verificationStatus}.`,
    };
  } catch (error: any) {
    console.error("reviewProgress error:", error);
    return { ok: false, error: error.message || "Failed to review progress" };
  }
}
