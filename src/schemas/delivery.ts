import { z } from "zod";
import { photoSchema } from "./photo";

export const deliveryItemSchema = z.object({
  orderItemId: z.string().min(1, "Piece is required"),
  finalWeightMg: z.coerce
    .number()
    .min(1, "Final weight must be greater than 0"),
});

export const createDeliverySchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().min(1, "Order is required"),
  receivedBy: z.string().min(2, "Receiver name must be at least 2 characters"),
  receiverPhone: z.string().optional().default(""),
  mode: z.enum(["IN_PERSON", "COURIER", "OTHER"]).default("IN_PERSON"),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  photos: z.array(photoSchema).min(1, "Handover/piece photo is mandatory"),
  signaturePhoto: photoSchema.optional(),
  items: z
    .array(deliveryItemSchema)
    .min(1, "At least one piece must be delivered"),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
