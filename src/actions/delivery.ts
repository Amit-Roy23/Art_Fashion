"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Delivery } from "@/models/Delivery";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { createDeliverySchema, CreateDeliveryInput } from "@/schemas/delivery";
import { getNextSequenceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function createDelivery(
  input: CreateDeliveryInput
): Promise<ActionResult<{ deliveryId: string; deliveryNo: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "deliveries:create")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = createDeliverySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();
    const order = await Order.findById(parsed.data.orderId);
    if (!order || order.isDeleted) {
      return { ok: false, error: "Order not found." };
    }

    const deliveredStatus = await StatusOption.findOne({
      scope: "PIECE",
      systemCategory: "DELIVERED",
      isActive: true,
    });

    const deliveryNo = await getNextSequenceNumber("DELIVERY");

    const delivery = await Delivery.create({
      deliveryNo,
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId,
      items: parsed.data.items,
      deliveryDate: new Date(),
      receivedBy: parsed.data.receivedBy,
      receiverPhone: parsed.data.receiverPhone,
      mode: parsed.data.mode,
      photos: parsed.data.photos,
      signaturePhoto: parsed.data.signaturePhoto,
      remarks: parsed.data.remarks,
      createdBy: session.user.id,
    });

    // Mark each delivered piece as DELIVERED
    for (const item of parsed.data.items) {
      const piece = await OrderItem.findById(item.orderItemId);
      if (piece) {
        piece.currentLocation = "DELIVERED";
        piece.systemStatus = "DELIVERED";
        piece.finalWeightMg = item.finalWeightMg;
        if (deliveredStatus) {
          piece.statusId = deliveredStatus._id as any;
        }
        if (parsed.data.photos && parsed.data.photos.length > 0) {
          piece.photos.push(...(parsed.data.photos as any));
        }
        await piece.save();

        await logActivity({
          entityType: "ORDER_ITEM",
          entityId: piece._id.toString(),
          action: "DELIVERED",
          remarks: `Handed over to ${parsed.data.receivedBy} via Delivery ${deliveryNo}. Certified Final Weight: ${item.finalWeightMg / 1000}g. Remarks: ${parsed.data.remarks}`,
          userId: session.user.id,
          userName: session.user.name || "Staff",
          userRole: (session.user as any).role,
        });
      }
    }

    // Check parent order delivered count
    const totalDeliveredForOrder = await OrderItem.countDocuments({
      orderId: order._id,
      currentLocation: "DELIVERED",
      isDeleted: false,
    });

    order.deliveredCount = totalDeliveredForOrder;

    // Auto-complete order when all pieces are delivered
    if (order.deliveredCount >= order.itemCount) {
      const orderDeliveredStatus = await StatusOption.findOne({
        scope: "ORDER",
        systemCategory: "DELIVERED",
        isActive: true,
      });

      if (orderDeliveredStatus) {
        order.statusId = orderDeliveredStatus._id as any;
        order.systemStatus = "DELIVERED";
      }

      await logActivity({
        entityType: "ORDER",
        entityId: order._id.toString(),
        action: "COMPLETED",
        remarks: `All ${order.itemCount} piece(s) delivered to customer. Order successfully completed.`,
        userId: session.user.id,
        userName: session.user.name || "Staff",
        userRole: (session.user as any).role,
      });
    }

    await order.save();

    await logActivity({
      entityType: "DELIVERY",
      entityId: delivery._id.toString(),
      action: "CREATED",
      remarks: `Delivery Note ${deliveryNo} generated for ${parsed.data.items.length} pieces handed over to ${parsed.data.receivedBy}.`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath("/deliveries");
    revalidatePath(`/orders/${parsed.data.orderId}`);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: { deliveryId: delivery._id.toString(), deliveryNo },
      message: `Delivery ${deliveryNo} processed successfully.`,
    };
  } catch (error: any) {
    console.error("createDelivery error:", error);
    return { ok: false, error: error.message || "Failed to process delivery" };
  }
}
