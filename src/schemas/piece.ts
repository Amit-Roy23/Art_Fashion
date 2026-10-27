import { z } from "zod";
import { photoSchema } from "./photo";

export const pieceInputSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(2, "Description must be at least 2 characters"),
  metal: z.enum(["Gold", "Silver", "Platinum", "Other"]).default("Gold"),
  purity: z.string().min(1, "Purity is required"),
  size: z.string().optional().default(""),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  stoneDetails: z.string().optional().default(""),
  estimatedWeightMg: z.coerce
    .number()
    .min(1, "Estimated weight must be greater than 0"),
  specifications: z.string().optional().default(""),
  photos: z.array(photoSchema).default([]),
  dueDate: z.union([z.string(), z.date()]),
  remarks: z.string().min(3, "Remarks must be at least 3 characters"),
});

export const updatePieceStatusSchema = z.object({
  pieceId: z.string().min(1, "Piece ID is required"),
  statusId: z.string().min(1, "Status is required"),
  stageId: z.string().optional(),
  currentLocation: z
    .enum(["IN_HOUSE", "WITH_KARIGAR", "AT_JOB_WORK", "READY", "DELIVERED"])
    .optional(),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  photos: z.array(photoSchema).optional().default([]),
});

export type PieceInput = z.infer<typeof pieceInputSchema>;
export type UpdatePieceStatusInput = z.infer<typeof updatePieceStatusSchema>;
