import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export type DeliveryMode = "IN_PERSON" | "COURIER" | "OTHER";

export interface IDeliveryItem {
  orderItemId: mongoose.Types.ObjectId;
  finalWeightMg: number;
}

const DeliveryItemSchema = new Schema<IDeliveryItem>(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    finalWeightMg: { type: Number, required: true },
  },
  { _id: true }
);

export interface IDelivery extends Document {
  deliveryNo: string;
  customerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  items: IDeliveryItem[];
  deliveryDate: Date;
  receivedBy: string;
  receiverPhone?: string;
  mode: DeliveryMode;
  photos: IPhoto[];
  signaturePhoto?: IPhoto;
  remarks: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    items: { type: [DeliveryItemSchema], required: true },
    deliveryDate: { type: Date, required: true, default: Date.now },
    receivedBy: { type: String, required: true, trim: true },
    receiverPhone: { type: String, trim: true },
    mode: {
      type: String,
      required: true,
      enum: ["IN_PERSON", "COURIER", "OTHER"],
      default: "IN_PERSON",
    },
    photos: { type: [PhotoSchema], required: true },
    signaturePhoto: { type: PhotoSchema },
    remarks: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

DeliverySchema.index({ deliveryNo: 1 }, { unique: true });
DeliverySchema.index({ customerId: 1, deliveryDate: -1 });
DeliverySchema.index({ orderId: 1 });

export const Delivery: Model<IDelivery> =
  mongoose.models.Delivery ||
  mongoose.model<IDelivery>("Delivery", DeliverySchema);
