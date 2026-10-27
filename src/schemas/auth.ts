import { z } from "zod";

export const staffLoginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Enter your registered email address or phone number"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export const karigarLoginSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter your 10-digit registered mobile number")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  pin: z.string().regex(/^\d{4,6}$/, "Enter your 4 to 6 digit security PIN"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["OWNER", "MANAGER", "STAFF", "KARIGAR"]),
  password: z.string().optional(),
  pin: z.string().optional(),
  artisanId: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type KarigarLoginInput = z.infer<typeof karigarLoginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
