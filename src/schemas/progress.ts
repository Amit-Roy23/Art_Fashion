import { z } from "zod";
import { photoSchema } from "./photo";

export const progressSubmissionSchema = z.object({
  assignmentId: z.string().min(1, "Assignment ID is required"),
  orderItemId: z.string().min(1, "Piece ID is required"),
  artisanId: z.string().min(1, "Artisan ID is required"),
  stageId: z.string().min(1, "Stage ID is required"),
  submittedWeightMg: z.coerce
    .number()
    .min(1, "Submitted weight must be greater than 0"),
  completionPercent: z.coerce
    .number()
    .min(1, "Completion percentage is required")
    .max(100)
    .default(100),
  isStageComplete: z.boolean().default(true),
  photos: z.array(photoSchema).min(1, "At least one progress photo is mandatory"),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
});

export const progressReviewSchema = z.object({
  progressId: z.string().min(1, "Progress ID is required"),
  verificationStatus: z.enum(["APPROVED", "REJECTED"]),
  nextStageId: z.string().optional(),
  verificationRemarks: z
    .string()
    .min(3, "Verification remarks are mandatory (min 3 characters)"),
});

export type ProgressSubmissionInput = z.infer<typeof progressSubmissionSchema>;
export type ProgressReviewInput = z.infer<typeof progressReviewSchema>;
