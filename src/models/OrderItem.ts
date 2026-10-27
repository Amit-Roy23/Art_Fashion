import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";
import { SystemStatus } from "./Order";

export type CurrentLocation =
  | "IN_HOUSE"
  | "WITH_KARIGAR"
  | "AT_JOB_WORK"
  | "READY"
  | "DELIVERED";

export interface IOrderItem extends Document {
  pieceNo: string;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  category: string;
  description: string;
  metal: "Gold" | "Silver" | "Platinum" | "Other";
  purity: string;
  size?: string;
  quantity: number;
  stoneDetails?: string;
  estimatedWeightMg: number;
  specifications?: string;
  photos: IPhoto[];
  currentStageId?: mongoose.Types.ObjectId;
  statusId?: mongoose.Types.ObjectId;
  systemStatus: SystemStatus;
  currentLocation: CurrentLocation;
  currentArtisanId?: mongoose.Types.ObjectId | null;
  currentJobWorkId?: mongoose.Types.ObjectId | null;
  dueDate: Date;
  finalWeightMg?: number | null;
  remarks: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    pieceNo: { type: String, required: true, unique: true },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    metal: {
      type: String,
      required: true,
      enum: ["Gold", "Silver", "Platinum", "Other"],
      default: "Gold",
    },
    purity: { type: String, required: true, default: "22K" },
    size: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    stoneDetails: { type: String, default: "" },
    estimatedWeightMg: { type: Number, required: true },
    specifications: { type: String, default: "" },
    photos: { type: [PhotoSchema], default: [] },
    currentStageId: { type: Schema.Types.ObjectId, ref: "ProductionStage" },
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
    currentLocation: {
      type: String,
      required: true,
      enum: [
        "IN_HOUSE",
        "WITH_KARIGAR",
        "AT_JOB_WORK",
        "READY",
        "DELIVERED",
      ],
      default: "IN_HOUSE",
      index: true,
    },
    currentArtisanId: {
      type: Schema.Types.ObjectId,
      ref: "Artisan",
      default: null,
      index: true,
    },
    currentJobWorkId: {
      type: Schema.Types.ObjectId,
      ref: "JobWork",
      default: null,
    },
    dueDate: { type: Date, required: true, index: true },
    finalWeightMg: { type: Number, default: null },
    remarks: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

OrderItemSchema.index({ pieceNo: 1 }, { unique: true });
OrderItemSchema.index({ orderId: 1, isDeleted: 1 });
OrderItemSchema.index({ customerId: 1 });
OrderItemSchema.index({ currentArtisanId: 1, currentLocation: 1 });
OrderItemSchema.index({ currentLocation: 1, systemStatus: 1 });
OrderItemSchema.index({ dueDate: 1 });

export const OrderItem: Model<IOrderItem> =
  mongoose.models.OrderItem ||
  mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);
