import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IProgressUpdate extends Document {
  assignmentId: mongoose.Types.ObjectId;
  orderItemId: mongoose.Types.ObjectId;
  artisanId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  submittedWeightMg: number;
  completionPercent: number;
  isStageComplete: boolean;
  photos: IPhoto[];
  remarks: string;
  verifiedBy?: mongoose.Types.ObjectId | null;
  verifiedAt?: Date | null;
  verificationStatus: VerificationStatus;
  verificationRemarks?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProgressUpdateSchema = new Schema<IProgressUpdate>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
      index: true,
    },
    artisanId: {
      type: Schema.Types.ObjectId,
      ref: "Artisan",
      required: true,
      index: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: "ProductionStage",
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: { type: Date, default: Date.now },
    submittedWeightMg: { type: Number, required: true },
    completionPercent: { type: Number, default: 100, min: 0, max: 100 },
    isStageComplete: { type: Boolean, default: true },
    photos: { type: [PhotoSchema], required: true },
    remarks: { type: String, required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    verificationStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    verificationRemarks: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ProgressUpdateSchema.index({ verificationStatus: 1, submittedAt: -1 });
ProgressUpdateSchema.index({ orderItemId: 1, submittedAt: -1 });

export const ProgressUpdate: Model<IProgressUpdate> =
  mongoose.models.ProgressUpdate ||
  mongoose.model<IProgressUpdate>("ProgressUpdate", ProgressUpdateSchema);
