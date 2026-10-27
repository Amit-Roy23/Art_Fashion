"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { JobWork } from "@/models/JobWork";
import { JobWorkVendor } from "@/models/JobWorkVendor";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { ProductionStage } from "@/models/ProductionStage";
import {
  jobWorkVendorSchema,
  JobWorkVendorInput,
  jobWorkDispatchSchema,
  JobWorkDispatchInput,
  jobWorkReturnSchema,
  JobWorkReturnInput,
} from "@/schemas/jobwork";
import { getNextSequenceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function createJobWorkVendor(
  input: JobWorkVendorInput
): Promise<ActionResult<{ vendorId: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "jobwork:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = jobWorkVendorSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const vendor = await JobWorkVendor.create({
      name: parsed.data.name,
      processTypes: parsed.data.processTypes,
      phone: parsed.data.phone,
      address: parsed.data.address,
      createdBy: session.user.id,
    });

    revalidatePath("/job-work");
    return {
      ok: true,
      data: { vendorId: vendor._id.toString() },
      message: `Vendor ${vendor.name} added successfully.`,
    };
  } catch (error: any) {
    console.error("createJobWorkVendor error:", error);
    return { ok: false, error: error.message || "Failed to create vendor" };
  }
}

export async function createJobWorkDispatch(
  input: JobWorkDispatchInput
): Promise<ActionResult<{ jobWorkId: string; challanNo: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "jobwork:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = jobWorkDispatchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const challanNo = await getNextSequenceNumber("JOB_WORK");

    const jwStatus = await StatusOption.findOne({
      scope: "JOBWORK",
      systemCategory: "AT_JOB_WORK",
      isActive: true,
    });

    const jobWork = await JobWork.create({
      challanNo,
      vendorId: parsed.data.vendorId,
      processType: parsed.data.processType,
      items: parsed.data.items.map((it) => ({
        orderItemId: it.orderItemId,
        sentWeightMg: it.sentWeightMg,
        status: "SENT",
        returnPhotos: [],
        returnRemarks: "",
      })),
      dispatchDate: new Date(),
      expectedReturnDate: new Date(parsed.data.expectedReturnDate),
      statusId: jwStatus?._id,
      dispatchPhotos: parsed.data.dispatchPhotos || [],
      remarks: parsed.data.remarks,
      chargesAmount: parsed.data.chargesAmount,
      createdBy: session.user.id,
    });

    // Update pieces: location AT_JOB_WORK, currentJobWorkId
    for (const item of parsed.data.items) {
      const piece = await OrderItem.findById(item.orderItemId);
      if (piece) {
        piece.currentLocation = "AT_JOB_WORK";
        piece.currentJobWorkId = jobWork._id as any;
        piece.systemStatus = "AT_JOB_WORK";
        await piece.save();

        await logActivity({
          entityType: "ORDER_ITEM",
          entityId: piece._id.toString(),
          action: "JOB_WORK_DISPATCHED",
          remarks: `Sent to outside job work (${parsed.data.processType}) via Challan ${challanNo} with dispatched weight ${item.sentWeightMg / 1000}g. Remarks: ${parsed.data.remarks}`,
          userId: session.user.id,
          userName: session.user.name || "Staff",
          userRole: (session.user as any).role,
        });
      }
    }

    await logActivity({
      entityType: "JOB_WORK",
      entityId: jobWork._id.toString(),
      action: "CREATED",
      remarks: `Job Work Challan ${challanNo} created for ${parsed.data.items.length} pieces. Remarks: ${parsed.data.remarks}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/job-work");
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: { jobWorkId: jobWork._id.toString(), challanNo },
      message: `Challan ${challanNo} created and pieces dispatched.`,
    };
  } catch (error: any) {
    console.error("createJobWorkDispatch error:", error);
    return { ok: false, error: error.message || "Failed to dispatch job work" };
  }
}

export async function receiveJobWorkReturn(
  input: JobWorkReturnInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "jobwork:manage")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = jobWorkReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const jobWork = await JobWork.findById(parsed.data.jobWorkId);
    if (!jobWork || jobWork.isDeleted) {
      return { ok: false, error: "Job Work not found." };
    }

    // Process each return item
    for (const ret of parsed.data.returnItems) {
      const itemIndex = jobWork.items.findIndex(
        (it) => it.orderItemId.toString() === ret.orderItemId
      );

      if (itemIndex !== -1) {
        const item = jobWork.items[itemIndex];
        const sentMg = item.sentWeightMg;
        const retMg = ret.returnedWeightMg;
        const lossMg = sentMg - retMg;

        item.returnedWeightMg = retMg;
        item.lossMg = lossMg;
        item.status = "RETURNED";
        item.returnPhotos = ret.returnPhotos as any;
        item.returnRemarks = ret.returnRemarks;

        // Update the piece
        const piece = await OrderItem.findById(ret.orderItemId);
        if (piece) {
          piece.currentLocation = "IN_HOUSE";
          piece.currentJobWorkId = null;
          piece.systemStatus = "IN_PRODUCTION";

          if (ret.nextStageId) {
            piece.currentStageId = ret.nextStageId as any;
          } else {
            // Find next stage
            const stages = await ProductionStage.find({ isActive: true }).sort({
              sortOrder: 1,
            });
            const nextIdx = stages.findIndex(
              (s) => s.name.toLowerCase().includes("quality") || s.name.toLowerCase().includes("ready")
            );
            if (nextIdx !== -1) {
              piece.currentStageId = stages[nextIdx]._id as any;
            }
          }

          if (ret.returnPhotos && ret.returnPhotos.length > 0) {
            piece.photos.push(...(ret.returnPhotos as any));
          }

          await piece.save();

          await logActivity({
            entityType: "ORDER_ITEM",
            entityId: piece._id.toString(),
            action: "JOB_WORK_RETURNED",
            remarks: `Received back from ${jobWork.processType}. Returned weight: ${retMg / 1000}g, Process loss: ${(lossMg / 1000).toFixed(3)}g. Note: ${ret.returnRemarks}`,
            userId: session.user.id,
            userName: session.user.name || "Staff",
            userRole: (session.user as any).role,
          });
        }
      }
    }

    // Check if all items in challan are returned
    const allReturned = jobWork.items.every((it) => it.status === "RETURNED");
    if (allReturned) {
      jobWork.returnDate = new Date();
    }
    await jobWork.save();

    await logActivity({
      entityType: "JOB_WORK",
      entityId: jobWork._id.toString(),
      action: allReturned ? "COMPLETED" : "PARTIAL_RETURN",
      remarks: `Recorded return for ${parsed.data.returnItems.length} piece(s). ${parsed.data.remarks}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath(`/job-work/${parsed.data.jobWorkId}`);
    revalidatePath("/job-work");
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: undefined,
      message: `Return recorded for ${parsed.data.returnItems.length} piece(s). Weight losses calculated.`,
    };
  } catch (error: any) {
    console.error("receiveJobWorkReturn error:", error);
    return { ok: false, error: error.message || "Failed to record return" };
  }
}
