import { ActivityLog } from "@/models/ActivityLog";
import { connectDB } from "@/lib/db";

interface LogActionParams {
  entityType:
    | "ORDER"
    | "ORDER_ITEM"
    | "ASSIGNMENT"
    | "JOB_WORK"
    | "JOBWORK"
    | "DELIVERY"
    | "CUSTOMER"
    | "ARTISAN"
    | "SETTINGS";
  entityId: string;
  action: string;
  remarks?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  userId?: string;
  userName?: string;
  userRole?: string;
}

export async function logActivity(params: LogActionParams): Promise<void> {
  try {
    await connectDB();
    await ActivityLog.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      remarks: params.remarks || "",
      changes: params.changes,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      at: new Date(),
    });
  } catch (error) {
    console.error("Failed to write ActivityLog:", error);
    // Don't let audit log failure break the main operation flow, but report it
  }
}

export async function getEntityAuditTrail(
  entityType: string,
  entityId: string
) {
  await connectDB();
  return ActivityLog.find({ entityType: entityType as any, entityId })
    .sort({ at: -1 })
    .lean();
}
