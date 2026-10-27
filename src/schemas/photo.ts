import { z } from "zod";

export const photoSchema = z.object({
  publicId: z.string().min(1, "Photo publicId is required"),
  url: z.string().url("Valid photo URL is required"),
  width: z.number().optional(),
  height: z.number().optional(),
  caption: z.string().optional().default(""),
  uploadedBy: z.string().optional(),
  uploadedAt: z.union([z.date(), z.string()]).optional(),
});

export type PhotoInput = z.infer<typeof photoSchema>;
