import mongoose, { Schema, Document, Model } from "mongoose";
import { SystemStatus } from "./Order";

export type StatusScope = "ORDER" | "PIECE" | "ASSIGNMENT" | "JOBWORK";

export interface IStatusOption extends Document {
  scope: StatusScope;
  name: string;
  colour: string;
  systemCategory: SystemStatus;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const StatusOptionSchema = new Schema<IStatusOption>(
  {
    scope: {
      type: String,
      required: true,
      enum: ["ORDER", "PIECE", "ASSIGNMENT", "JOBWORK"],
    },
    name: { type: String, required: true, trim: true },
    colour: { type: String, default: "#3b82f6" },
    systemCategory: {
      type: String,
      required: true,
      enum: [
        "PENDING",
        "IN_PRODUCTION",
        "AT_JOB_WORK",
        "READY",
        "DELIVERED",
        "CANCELLED",
        "ON_HOLD",
      ],
      default: "PENDING",
    },
    sortOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

StatusOptionSchema.index({ scope: 1, sortOrder: 1, isActive: 1 });

export const StatusOption: Model<IStatusOption> =
  mongoose.models.StatusOption ||
  mongoose.model<IStatusOption>("StatusOption", StatusOptionSchema);
