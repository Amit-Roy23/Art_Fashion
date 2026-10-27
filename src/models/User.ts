import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  pinHash?: string;
  role: "OWNER" | "MANAGER" | "STAFF" | "KARIGAR";
  artisanId?: mongoose.Types.ObjectId;
  isActive: boolean;
  failedPinAttempts: number;
  pinLockedUntil?: Date | null;
  lastLoginAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    passwordHash: { type: String },
    pinHash: { type: String },
    role: {
      type: String,
      required: true,
      enum: ["OWNER", "MANAGER", "STAFF", "KARIGAR"],
      default: "STAFF",
    },
    artisanId: { type: Schema.Types.ObjectId, ref: "Artisan" },
    isActive: { type: Boolean, default: true },
    failedPinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ role: 1, isActive: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
