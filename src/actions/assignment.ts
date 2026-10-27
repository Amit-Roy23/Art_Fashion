"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Assignment } from "@/models/Assignment";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { createAssignmentSchema, CreateAssignmentInput } from "@/schemas/assignment";
import { getNextSequenceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<ActionResult<{ assignmentId: string; workOrderNo: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "assignments:create")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = createAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();

    // Verify pieces are eligible (must be IN_HOUSE or READY for new assignment)
    const pieceIds = parsed.data.items.map((it) => it.orderItemId);
    const pieces = await OrderItem.find({
      _id: { $in: pieceIds },
      isDeleted: false,
    });

    for (const p of pieces) {
      if (p.currentLocation === "WITH_KARIGAR") {
        return {
          ok: false,
          error: `Piece ${p.pieceNo} is already assigned to a karigar!`,
        };
      }
      if (p.currentLocation === "AT_JOB_WORK") {
        return {
          ok: false,
          error: `Piece ${p.pieceNo} is currently dispatched to outside job work!`,
        };
      }
      if (p.currentLocation === "DELIVERED") {
        return {
          ok: false,
          error: `Piece ${p.pieceNo} has already been delivered to customer!`,
        };
      }
    }

    // Default In Production status
    const inProdStatus = await StatusOption.findOne({
      scope: "PIECE",
      systemCategory: "IN_PRODUCTION",
      isActive: true,
    });

    const workOrderNo = await getNextSequenceNumber("WORK_ORDER");

    const assignment = await Assignment.create({
      workOrderNo,
      artisanId: parsed.data.artisanId,
      items: parsed.data.items,
      issueDate: new Date(),
      dueDate: new Date(parsed.data.dueDate),
      statusId: inProdStatus?._id,
      issuedBy: session.user.id,
      remarks: parsed.data.remarks,
      photos: parsed.data.photos || [],
      createdBy: session.user.id,
    });

    // Update piece locations and current artisan
    for (const item of parsed.data.items) {
      const piece = await OrderItem.findById(item.orderItemId);
      if (piece) {
        piece.currentLocation = "WITH_KARIGAR";
        piece.currentArtisanId = parsed.data.artisanId as any;
        piece.currentStageId = item.stageId as any;
        if (inProdStatus) {
          piece.statusId = inProdStatus._id as any;
          piece.systemStatus = "IN_PRODUCTION";
        }
        await piece.save();

        await logActivity({
          entityType: "ORDER_ITEM",
          entityId: piece._id.toString(),
          action: "ASSIGNED",
          remarks: `Issued to Karigar via Work Order ${workOrderNo} with issued weight ${item.issuedWeightMg / 1000}g. Note: ${item.instructions || ""}`,
          userId: session.user.id,
          userName: session.user.name || "Staff",
          userRole: (session.user as any).role,
        });
      }
    }

    await logActivity({
      entityType: "ASSIGNMENT",
      entityId: assignment._id.toString(),
      action: "CREATED",
      remarks: `Work Order ${workOrderNo} created with ${parsed.data.items.length} piece(s). ${parsed.data.remarks}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/assignments");
    revalidatePath("/k/home");
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: { assignmentId: assignment._id.toString(), workOrderNo },
      message: `Work Order ${workOrderNo} created successfully.`,
    };
  } catch (error: any) {
    console.error("createAssignment error:", error);
    return { ok: false, error: error.message || "Failed to create work order" };
  }
}
