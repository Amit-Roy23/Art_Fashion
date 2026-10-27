import { z } from "zod";
import { photoSchema } from "./photo";

export const artisanSchema = z.object({
  name: z.string().min(2, "Artisan name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  address: z.string().optional().default(""),
  speciality: z
    .array(z.string())
    .min(1, "Select at least one speciality for the artisan"),
  photo: photoSchema.optional(),
  idProof: z.array(photoSchema).optional().default([]),
  notes: z.string().optional().default(""),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4 to 6 numeric digits")
    .optional()
    .or(z.literal("")),
});

export type ArtisanInput = z.infer<typeof artisanSchema>;
