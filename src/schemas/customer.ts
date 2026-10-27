import { z } from "zod";
import { photoSchema } from "./photo";

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  altPhone: z.string().optional().default(""),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  gstin: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  photos: z.array(photoSchema).optional().default([]),
});

export type CustomerInput = z.infer<typeof customerSchema>;
