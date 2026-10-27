import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
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
  changes?: Record<string, { before: unknown; after: unknown }>;
  remarks?: string;
  userId?: mongoose.Types.ObjectId | string;
  userName?: string;
  userRole?: string;
  at: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    entityType: {
      type: String,
      required: true,
      enum: [
        "ORDER",
        "ORDER_ITEM",
        "ASSIGNMENT",
        "JOB_WORK",
        "JOBWORK",
        "DELIVERY",
        "CUSTOMER",
        "ARTISAN",
        "SETTINGS",
      ],
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    remarks: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    userRole: { type: String },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ActivityLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
