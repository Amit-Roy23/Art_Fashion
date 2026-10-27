import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  tagline: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  phone: z.string().min(10, "Phone is required"),
  email: z.string().email("Valid email required"),
  gstin: z.string().optional().default(""),
  weightTolerancePercent: z.coerce.number().min(0).max(10).default(0.5),
  pdfFooterText: z.string().optional().default(""),
  photoRequired: z.object({
    pieceCreation: z.boolean().default(true),
    karigarSubmission: z.boolean().default(true),
    jobWorkReturn: z.boolean().default(true),
    delivery: z.boolean().default(true),
  }),
  categories: z.array(z.string()).min(1),
  purities: z.array(z.string()).min(1),
  processTypes: z.array(z.string()).min(1),
});

export const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Stage name is required"),
  sortOrder: z.coerce.number().default(0),
  colour: z.string().default("#d4af37"),
  requiresPhoto: z.boolean().default(true),
  requiresWeight: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const statusOptionSchema = z.object({
  id: z.string().optional(),
  scope: z.enum(["ORDER", "PIECE", "ASSIGNMENT", "JOBWORK"]),
  name: z.string().min(2, "Status name is required"),
  colour: z.string().default("#3b82f6"),
  systemCategory: z.enum([
    "PENDING",
    "IN_PRODUCTION",
    "AT_JOB_WORK",
    "READY",
    "DELIVERED",
    "CANCELLED",
    "ON_HOLD",
  ]),
  sortOrder: z.coerce.number().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type StageInput = z.infer<typeof stageSchema>;
export type StatusOptionInput = z.infer<typeof statusOptionSchema>;
