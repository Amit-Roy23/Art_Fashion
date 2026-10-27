import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounter extends Document {
  key: string;
  year?: number;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true },
    year: { type: Number, default: () => new Date().getFullYear() },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CounterSchema.index({ key: 1, year: 1 }, { unique: true });

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);
