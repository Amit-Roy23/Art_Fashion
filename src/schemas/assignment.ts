import { z } from "zod";
import { photoSchema } from "./photo";

export const assignmentItemSchema = z.object({
  orderItemId: z.string().min(1, "Piece is required"),
  stageId: z.string().min(1, "Stage is required"),
  issuedWeightMg: z.coerce
    .number()
    .min(1, "Issued weight must be greater than 0"),
  instructions: z.string().optional().default(""),
});

export const createAssignmentSchema = z.object({
  artisanId: z.string().min(1, "Artisan is required"),
  dueDate: z.union([z.string(), z.date()]),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  photos: z.array(photoSchema).optional().default([]),
  items: z
    .array(assignmentItemSchema)
    .min(1, "At least one piece must be assigned"),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
