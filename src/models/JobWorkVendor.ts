import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJobWorkVendor extends Document {
  name: string;
  processTypes: string[];
  phone: string;
  address?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobWorkVendorSchema = new Schema<IJobWorkVendor>(
  {
    name: { type: String, required: true, trim: true },
    processTypes: { type: [String], default: ["Polishing", "Finishing"] },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

JobWorkVendorSchema.index({ name: 1 });
JobWorkVendorSchema.index({ phone: 1 });
JobWorkVendorSchema.index({ isActive: 1 });

export const JobWorkVendor: Model<IJobWorkVendor> =
  mongoose.models.JobWorkVendor ||
  mongoose.model<IJobWorkVendor>("JobWorkVendor", JobWorkVendorSchema);
