import { Schema } from "mongoose";

export interface IPhoto {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
}

export const PhotoSchema = new Schema<IPhoto>(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    caption: { type: String, default: "" },
    uploadedBy: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
