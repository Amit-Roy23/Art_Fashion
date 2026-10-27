import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export type OrderType = "PROJECT" | "PIECE";
export type OrderPriority = "NORMAL" | "URGENT";
export type SystemStatus =
  | "PENDING"
  | "IN_PRODUCTION"
  | "AT_JOB_WORK"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "ON_HOLD";

export interface IOrder extends Document {
  orderNo: string;
  type: OrderType;
  customerId: mongoose.Types.ObjectId;
  projectName?: string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  priority: OrderPriority;
  statusId?: mongoose.Types.ObjectId | string;
  systemStatus: SystemStatus;
  totalEstimatedWeightMg: number;
  remarks: string;
  photos: IPhoto[];
  designReferences: IPhoto[];
  itemCount: number;
  deliveredCount: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNo: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, required: true, enum: ["PROJECT", "PIECE"] },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    projectName: { type: String, trim: true },
    orderDate: { type: Date, required: true, default: Date.now },
    expectedDeliveryDate: { type: Date, required: true, index: true },
    priority: {
      type: String,
      required: true,
      enum: ["NORMAL", "URGENT"],
      default: "NORMAL",
    },
    statusId: { type: Schema.Types.ObjectId, ref: "StatusOption" },
    systemStatus: {
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
      index: true,
    },
    totalEstimatedWeightMg: { type: Number, default: 0 },
    remarks: { type: String, required: true },
    photos: { type: [PhotoSchema], default: [] },
    designReferences: { type: [PhotoSchema], default: [] },
    itemCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNo: 1 }, { unique: true });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ systemStatus: 1, expectedDeliveryDate: 1 });
OrderSchema.index({ projectName: "text", orderNo: "text" });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
