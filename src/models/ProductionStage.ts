import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductionStage extends Document {
  name: string;
  sortOrder: number;
  colour: string;
  requiresPhoto: boolean;
  requiresWeight: boolean;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductionStageSchema = new Schema<IProductionStage>(
  {
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, required: true, default: 0 },
    colour: { type: String, default: "#d4af37" },
    requiresPhoto: { type: Boolean, default: true },
    requiresWeight: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ProductionStageSchema.index({ sortOrder: 1, isActive: 1 });

export const ProductionStage: Model<IProductionStage> =
  mongoose.models.ProductionStage ||
  mongoose.model<IProductionStage>("ProductionStage", ProductionStageSchema);
