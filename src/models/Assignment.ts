import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export interface IAssignmentItem {
  orderItemId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  issuedWeightMg: number;
  instructions?: string;
}

const AssignmentItemSchema = new Schema<IAssignmentItem>(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: "ProductionStage",
      required: true,
    },
    issuedWeightMg: { type: Number, required: true },
    instructions: { type: String, default: "" },
  },
  { _id: true }
);

export interface IAssignment extends Document {
  workOrderNo: string;
  artisanId: mongoose.Types.ObjectId;
  items: IAssignmentItem[];
  issueDate: Date;
  dueDate: Date;
  statusId?: mongoose.Types.ObjectId;
  issuedBy?: mongoose.Types.ObjectId;
  remarks: string;
  photos: IPhoto[];
  pdfGeneratedAt?: Date | null;
  closedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    workOrderNo: { type: String, required: true, unique: true, uppercase: true },
    artisanId: {
      type: Schema.Types.ObjectId,
      ref: "Artisan",
      required: true,
      index: true,
    },
    items: { type: [AssignmentItemSchema], required: true },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    statusId: { type: Schema.Types.ObjectId, ref: "StatusOption" },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, required: true },
    photos: { type: [PhotoSchema], default: [] },
    pdfGeneratedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

AssignmentSchema.index({ workOrderNo: 1 }, { unique: true });
AssignmentSchema.index({ artisanId: 1, isDeleted: 1 });
AssignmentSchema.index({ dueDate: 1 });

export const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);
