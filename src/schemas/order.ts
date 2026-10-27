import { z } from "zod";
import { photoSchema } from "./photo";
import { pieceInputSchema } from "./piece";

export const orderCreateSchema = z
  .object({
    type: z.enum(["PROJECT", "PIECE"]).default("PIECE"),
    customerId: z.string().min(1, "Customer is required"),
    projectName: z.string().optional().default(""),
    orderDate: z.union([z.string(), z.date()]),
    expectedDeliveryDate: z.union([z.string(), z.date()]),
    priority: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
    remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
    photos: z.array(photoSchema).optional().default([]),
    designReferences: z.array(photoSchema).optional().default([]),
    pieces: z.array(pieceInputSchema).min(1, "At least one piece is required"),
  })
  .refine(
    (data) => {
      if (data.type === "PROJECT") {
        return !!data.projectName && data.projectName.trim().length >= 2;
      }
      return true;
    },
    {
      message: "Project Name is required for PROJECT orders",
      path: ["projectName"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "PIECE") {
        return data.pieces.length === 1;
      }
      return data.pieces.length >= 1;
    },
    {
      message: "PIECE orders must contain exactly one piece",
      path: ["pieces"],
    }
  );

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  statusId: z.string().min(1, "Status is required"),
  remarks: z.string().min(3, "Remarks are mandatory (min 3 characters)"),
  photos: z.array(photoSchema).optional().default([]),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
