import { z } from "zod";
import { photoSchema } from "./photo";

export const jobWorkVendorSchema = z.object({
  name: z.string().min(2, "Vendor name must be at least 2 characters"),
  processTypes: z
    .array(z.string())
    .min(1, "Select at least one process type"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  address: z.string().optional().default(""),
});

export const jobWorkDispatchSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  processType: z.string().min(1, "Process type is required"),
  expectedReturnDate: z.union([z.string(), z.date()]),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  dispatchPhotos: z.array(photoSchema).optional().default([]),
  chargesAmount: z.coerce.number().optional().nullable(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1, "Piece is required"),
        sentWeightMg: z.coerce
          .number()
          .min(1, "Sent weight must be greater than 0"),
      })
    )
    .min(1, "At least one piece must be dispatched"),
});

export const jobWorkReturnItemSchema = z.object({
  orderItemId: z.string().min(1, "Piece is required"),
  returnedWeightMg: z.coerce
    .number()
    .min(1, "Returned weight must be greater than 0"),
  returnPhotos: z
    .array(photoSchema)
    .min(1, "Return verification photo is mandatory"),
  returnRemarks: z.string().min(3, "Item return remarks are mandatory"),
  nextStageId: z.string().optional(),
});

export const jobWorkReturnSchema = z.object({
  jobWorkId: z.string().min(1, "Job Work ID is required"),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  returnItems: z
    .array(jobWorkReturnItemSchema)
    .min(1, "Select at least one piece to return"),
});

export type JobWorkVendorInput = z.infer<typeof jobWorkVendorSchema>;
export type JobWorkDispatchInput = z.infer<typeof jobWorkDispatchSchema>;
export type JobWorkReturnInput = z.infer<typeof jobWorkReturnSchema>;
