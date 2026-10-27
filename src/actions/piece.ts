"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { ProductionStage } from "@/models/ProductionStage";
import { Assignment } from "@/models/Assignment";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { JobWork } from "@/models/JobWork";
import { Delivery } from "@/models/Delivery";
import { ActivityLog } from "@/models/ActivityLog";
import { updatePieceStatusSchema, UpdatePieceStatusInput } from "@/schemas/piece";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function updatePieceStatus(
  input: UpdatePieceStatusInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "pieces:edit")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = updatePieceStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const piece = await OrderItem.findById(parsed.data.pieceId);
    if (!piece || piece.isDeleted) {
      return { ok: false, error: "Piece not found." };
    }

    const statusOpt = await StatusOption.findById(parsed.data.statusId);
    if (!statusOpt) {
      return { ok: false, error: "Status option not found." };
    }

    const prevStatus = piece.systemStatus;
    const prevLocation = piece.currentLocation;

    piece.statusId = statusOpt._id as any;
    piece.systemStatus = statusOpt.systemCategory;

    if (parsed.data.currentLocation) {
      piece.currentLocation = parsed.data.currentLocation;
    }

    if (parsed.data.stageId) {
      piece.currentStageId = parsed.data.stageId as any;
    }

    if (parsed.data.photos && parsed.data.photos.length > 0) {
      piece.photos.push(...(parsed.data.photos as any));
    }

    piece.remarks = parsed.data.remarks;
    piece.updatedBy = session.user.id as any;
    await piece.save();

    await logActivity({
      entityType: "ORDER_ITEM",
      entityId: piece._id.toString(),
      action: "STATUS_CHANGED",
      remarks: parsed.data.remarks,
      changes: {
        status: { before: prevStatus, after: statusOpt.systemCategory },
        location: { before: prevLocation, after: piece.currentLocation },
      },
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath(`/pieces/${parsed.data.pieceId}`);
    revalidatePath(`/orders/${piece.orderId}`);
    revalidatePath("/dashboard");

    return { ok: true, data: undefined, message: "Piece status updated successfully." };
  } catch (error: any) {
    console.error("updatePieceStatus error:", error);
    return { ok: false, error: error.message || "Failed to update piece" };
  }
}

export async function advancePieceStage(
  pieceId: string,
  stageId: string,
  remarks: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "pieces:edit")) {
      return { ok: false, error: "Permission denied." };
    }

    if (!remarks || remarks.trim().length < 3) {
      return { ok: false, error: "Remarks are mandatory (min 3 characters)." };
    }

    await connectDB();
    const piece = await OrderItem.findById(pieceId);
    if (!piece || piece.isDeleted) {
      return { ok: false, error: "Piece not found." };
    }

    const stage = await ProductionStage.findById(stageId);
    if (!stage) {
      return { ok: false, error: "Stage not found." };
    }

    const prevStage = piece.currentStageId;
    piece.currentStageId = stage._id as any;
    piece.updatedBy = session.user.id as any;
    await piece.save();

    await logActivity({
      entityType: "ORDER_ITEM",
      entityId: piece._id.toString(),
      action: "STAGE_ADVANCED",
      remarks: `Advanced to stage ${stage.name}. ${remarks}`,
      changes: {
        stage: { before: prevStage, after: stage.name },
      },
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath(`/pieces/${pieceId}`);
    revalidatePath(`/orders/${piece.orderId}`);
    return { ok: true, data: undefined, message: `Advanced to stage ${stage.name}` };
  } catch (error: any) {
    console.error("advancePieceStage error:", error);
    return { ok: false, error: error.message || "Failed to advance stage" };
  }
}

export async function getPieceWeightJourney(pieceId: string) {
  await connectDB();
  const piece = await OrderItem.findById(pieceId).lean();
  if (!piece) return null;

  // 1. Estimated Weight
  const steps: Array<{
    step: string;
    weightMg: number;
    differenceMg?: number;
    diffPercent?: number;
    actor?: string;
    date?: Date | string;
    remarks?: string;
  }> = [
    {
      step: "Estimated (Order Creation)",
      weightMg: piece.estimatedWeightMg,
      actor: "Showroom / Sales",
      date: piece.createdAt,
      remarks: piece.remarks,
    },
  ];

  let prevWeightMg = piece.estimatedWeightMg;

  // 2. Issued to Karigar (Assignments)
  const assignments = await Assignment.find({
    "items.orderItemId": piece._id,
    isDeleted: false,
  })
    .populate("artisanId")
    .lean();

  for (const asgn of assignments) {
    const item = asgn.items.find(
      (it: any) => it.orderItemId.toString() === piece._id.toString()
    );
    if (item && item.issuedWeightMg) {
      const diffMg = item.issuedWeightMg - prevWeightMg;
      const diffPercent = prevWeightMg > 0 ? (diffMg / prevWeightMg) * 100 : 0;
      steps.push({
        step: `Issued to Karigar (${(asgn.artisanId as any)?.name || "Artisan"})`,
        weightMg: item.issuedWeightMg,
        differenceMg: diffMg,
        diffPercent: Number(diffPercent.toFixed(2)),
        actor: (asgn.artisanId as any)?.name || "Artisan",
        date: asgn.issueDate,
        remarks: item.instructions || asgn.remarks,
      });
      prevWeightMg = item.issuedWeightMg;
    }
  }

  // 3. Karigar Submissions
  const submissions = await ProgressUpdate.find({
    orderItemId: piece._id,
    verificationStatus: "APPROVED",
    isDeleted: false,
  })
    .populate("artisanId")
    .sort({ submittedAt: 1 })
    .lean();

  for (const sub of submissions) {
    const diffMg = sub.submittedWeightMg - prevWeightMg;
    const diffPercent = prevWeightMg > 0 ? (diffMg / prevWeightMg) * 100 : 0;
    steps.push({
      step: `Submitted by Karigar (${(sub.artisanId as any)?.name || "Artisan"})`,
      weightMg: sub.submittedWeightMg,
      differenceMg: diffMg,
      diffPercent: Number(diffPercent.toFixed(2)),
      actor: (sub.artisanId as any)?.name || "Artisan",
      date: sub.submittedAt,
      remarks: sub.remarks,
    });
    prevWeightMg = sub.submittedWeightMg;
  }

  // 4. Job Work movements
  const jobWorks = await JobWork.find({
    "items.orderItemId": piece._id,
    isDeleted: false,
  })
    .populate("vendorId")
    .lean();

  for (const jw of jobWorks) {
    const item = jw.items.find(
      (it: any) => it.orderItemId.toString() === piece._id.toString()
    );
    if (item) {
      // Sent
      const sentDiffMg = item.sentWeightMg - prevWeightMg;
      const sentDiffPct = prevWeightMg > 0 ? (sentDiffMg / prevWeightMg) * 100 : 0;
      steps.push({
        step: `Job Work Dispatched (${jw.processType} - ${(jw.vendorId as any)?.name || "Vendor"})`,
        weightMg: item.sentWeightMg,
        differenceMg: sentDiffMg,
        diffPercent: Number(sentDiffPct.toFixed(2)),
        actor: (jw.vendorId as any)?.name || "Vendor",
        date: jw.dispatchDate,
        remarks: jw.remarks,
      });
      prevWeightMg = item.sentWeightMg;

      // Returned
      if (item.returnedWeightMg) {
        const retDiffMg = item.returnedWeightMg - prevWeightMg;
        const retDiffPct = prevWeightMg > 0 ? (retDiffMg / prevWeightMg) * 100 : 0;
        steps.push({
          step: `Job Work Returned (${jw.processType})`,
          weightMg: item.returnedWeightMg,
          differenceMg: retDiffMg,
          diffPercent: Number(retDiffPct.toFixed(2)),
          actor: (jw.vendorId as any)?.name || "Vendor",
          date: jw.returnDate || jw.updatedAt,
          remarks: item.returnRemarks || "Received back",
        });
        prevWeightMg = item.returnedWeightMg;
      }
    }
  }

  // 5. Final Delivery
  const delivery = await Delivery.findOne({
    "items.orderItemId": piece._id,
    isDeleted: false,
  }).lean();

  if (delivery) {
    const item = delivery.items.find(
      (it: any) => it.orderItemId.toString() === piece._id.toString()
    );
    if (item && item.finalWeightMg) {
      const diffMg = item.finalWeightMg - prevWeightMg;
      const diffPercent = prevWeightMg > 0 ? (diffMg / prevWeightMg) * 100 : 0;
      steps.push({
        step: "Final Certified Delivery Weight",
        weightMg: item.finalWeightMg,
        differenceMg: diffMg,
        diffPercent: Number(diffPercent.toFixed(2)),
        actor: delivery.receivedBy,
        date: delivery.deliveryDate,
        remarks: delivery.remarks,
      });
    }
  }

  return steps;
}
