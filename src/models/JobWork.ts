import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export type JobWorkItemStatus = "SENT" | "RETURNED";

export interface IJobWorkItem {
  orderItemId: mongoose.Types.ObjectId;
  sentWeightMg: number;
  returnedWeightMg?: number | null;
  lossMg?: number | null;
  status: JobWorkItemStatus;
  returnPhotos: IPhoto[];
  returnRemarks?: string;
}

const JobWorkItemSchema = new Schema<IJobWorkItem>(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    sentWeightMg: { type: Number, required: true },
    returnedWeightMg: { type: Number, default: null },
    lossMg: { type: Number, default: null },
    status: {
      type: String,
      required: true,
      enum: ["SENT", "RETURNED"],
      default: "SENT",
    },
    returnPhotos: { type: [PhotoSchema], default: [] },
    returnRemarks: { type: String, default: "" },
  },
  { _id: true }
);

export interface IJobWork extends Document {
  challanNo: string;
  vendorId: mongoose.Types.ObjectId;
  processType: string;
  items: IJobWorkItem[];
  dispatchDate: Date;
  expectedReturnDate: Date;
  returnDate?: Date | null;
  statusId?: mongoose.Types.ObjectId;
  dispatchPhotos: IPhoto[];
  remarks: string;
  chargesAmount?: number | null;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobWorkSchema = new Schema<IJobWork>(
  {
    challanNo: { type: String, required: true, unique: true, uppercase: true },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "JobWorkVendor",
      required: true,
      index: true,
    },
    processType: { type: String, required: true },
    items: { type: [JobWorkItemSchema], required: true },
    dispatchDate: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date, required: true, index: true },
    returnDate: { type: Date, default: null },
    statusId: { type: Schema.Types.ObjectId, ref: "StatusOption" },
    dispatchPhotos: { type: [PhotoSchema], default: [] },
    remarks: { type: String, required: true },
    chargesAmount: { type: Number, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

JobWorkSchema.index({ challanNo: 1 }, { unique: true });
JobWorkSchema.index({ vendorId: 1, isDeleted: 1 });
JobWorkSchema.index({ expectedReturnDate: 1 });

export const JobWork: Model<IJobWork> =
  mongoose.models.JobWork || mongoose.model<IJobWork>("JobWork", JobWorkSchema);
