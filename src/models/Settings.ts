import mongoose, { Schema, Document, Model } from "mongoose";
import { DEFAULT_PERMISSION_MATRIX, PermissionMatrix } from "@/lib/rbac";

export interface IPhotoRequiredConfig {
  pieceCreation: boolean;
  karigarSubmission: boolean;
  jobWorkReturn: boolean;
  delivery: boolean;
}

export interface INumberingPrefixes {
  order: string;
  workOrder: string;
  jobWork: string;
  delivery: string;
  customer: string;
  artisan: string;
}

export interface ISettings extends Document {
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  gstin?: string;
  weightTolerancePercent: number;
  photoRequired: IPhotoRequiredConfig;
  categories: string[];
  purities: string[];
  processTypes: string[];
  numberingPrefixes: INumberingPrefixes;
  pdfFooterText: string;
  permissionMatrix: PermissionMatrix;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    companyName: {
      type: String,
      required: true,
      default: "BMS Fine Jewellery Manufacturers",
    },
    tagline: {
      type: String,
      default: "Handcrafted Luxury & Master Jewellery Production",
    },
    logoUrl: { type: String, default: "" },
    address: {
      type: String,
      default: "45, Zaveri Bazaar, Kalbadevi",
    },
    city: { type: String, default: "Mumbai, Maharashtra - 400002" },
    phone: { type: String, default: "+91 98200 12345" },
    email: { type: String, default: "production@bmsjewels.com" },
    gstin: { type: String, default: "27AAAAA0000A1Z5" },
    weightTolerancePercent: { type: Number, default: 0.5 },
    photoRequired: {
      pieceCreation: { type: Boolean, default: true },
      karigarSubmission: { type: Boolean, default: true },
      jobWorkReturn: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
    },
    categories: {
      type: [String],
      default: [
        "Ring",
        "Necklace",
        "Earrings",
        "Bangles",
        "Bracelet",
        "Pendant",
        "Chain",
        "Mangalsutra",
        "Bridal Set",
        "Kada",
        "Nose Pin",
      ],
    },
    purities: {
      type: [String],
      default: [
        "22K (916)",
        "18K (750)",
        "14K (585)",
        "24K (999)",
        "925 Sterling Silver",
        "Platinum 950",
      ],
    },
    processTypes: {
      type: [String],
      default: [
        "Polishing",
        "Finishing",
        "Rhodium Plating",
        "Gold Flash Plating",
        "Laser Engraving",
        "Micro Setting",
        "Meenakari / Enameling",
      ],
    },
    numberingPrefixes: {
      order: { type: String, default: "ORD" },
      workOrder: { type: String, default: "WO" },
      jobWork: { type: String, default: "JW" },
      delivery: { type: String, default: "DEL" },
      customer: { type: String, default: "CUS" },
      artisan: { type: String, default: "KAR" },
    },
    pdfFooterText: {
      type: String,
      default:
        "BMS Jewellery Manufacturing — Confidential & Internal Production Record. Computer generated.",
    },
    permissionMatrix: {
      type: Schema.Types.Mixed,
      default: DEFAULT_PERMISSION_MATRIX,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export interface SettingsModel extends Model<ISettings> {
  getSettings(): Promise<ISettings>;
}

SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const Settings: SettingsModel =
  (mongoose.models.Settings as SettingsModel) ||
  mongoose.model<ISettings, SettingsModel>("Settings", SettingsSchema);
