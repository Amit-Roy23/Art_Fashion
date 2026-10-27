import mongoose, { Schema, Document, Model } from "mongoose";
import { PhotoSchema, IPhoto } from "./PhotoSchema";

export interface IArtisan extends Document {
  code: string;
  name: string;
  phone: string;
  address?: string;
  speciality: string[];
  photo?: IPhoto;
  idProof: IPhoto[];
  isActive: boolean;
  notes?: string;
  userId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ArtisanSchema = new Schema<IArtisan>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    speciality: { type: [String], default: [] },
    photo: { type: PhotoSchema },
    idProof: { type: [PhotoSchema], default: [] },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ArtisanSchema.index({ code: 1 }, { unique: true });
ArtisanSchema.index({ phone: 1 });
ArtisanSchema.index({ isActive: 1 });
ArtisanSchema.index({ name: "text", phone: "text" });

export const Artisan: Model<IArtisan> =
  mongoose.models.Artisan || mongoose.model<IArtisan>("Artisan", ArtisanSchema);
