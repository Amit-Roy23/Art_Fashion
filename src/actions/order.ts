"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { ProductionStage } from "@/models/ProductionStage";
import {
  orderCreateSchema,
  OrderCreateInput,
  updateOrderStatusSchema,
  UpdateOrderStatusInput,
} from "@/schemas/order";
import { getNextSequenceNumber, formatPieceNumber } from "@/lib/numbering";
import { logActivity } from "@/lib/audit";
import { ActionResult } from "@/types/actions";

export async function createOrder(
  input: OrderCreateInput
): Promise<ActionResult<{ orderId: string; orderNo: string }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    if (!hasPermission((session.user as any).role, "orders:create")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = orderCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await connectDB();

    // Find default status for Order and Piece
    const defaultOrderStatus = await StatusOption.findOne({
      scope: "ORDER",
      isActive: true,
      $or: [{ isDefault: true }, { systemCategory: "PENDING" }],
    }).sort({ sortOrder: 1 });

    const defaultPieceStatus = await StatusOption.findOne({
      scope: "PIECE",
      isActive: true,
      $or: [{ isDefault: true }, { systemCategory: "PENDING" }],
    }).sort({ sortOrder: 1 });

    // Initial production stage (e.g. Design/CAD or first stage)
    const firstStage = await ProductionStage.findOne({ isActive: true }).sort({
      sortOrder: 1,
    });

    const orderNo = await getNextSequenceNumber("ORDER");
    const totalEstimatedWeightMg = parsed.data.pieces.reduce(
      (sum, p) => sum + (p.estimatedWeightMg || 0),
      0
    );

    const order = await Order.create({
      orderNo,
      type: parsed.data.type,
      customerId: parsed.data.customerId,
      projectName: parsed.data.projectName,
      orderDate: new Date(parsed.data.orderDate),
      expectedDeliveryDate: new Date(parsed.data.expectedDeliveryDate),
      priority: parsed.data.priority,
      statusId: defaultOrderStatus?._id,
      systemStatus: defaultOrderStatus?.systemCategory || "PENDING",
      totalEstimatedWeightMg,
      remarks: parsed.data.remarks,
      photos: parsed.data.photos || [],
      designReferences: parsed.data.designReferences || [],
      itemCount: parsed.data.pieces.length,
      deliveredCount: 0,
      createdBy: session.user.id,
    });

    // Create OrderItems (pieces)
    const userId = session.user.id;
    const piecesToInsert = parsed.data.pieces.map((p, idx) => ({
      pieceNo: formatPieceNumber(orderNo, idx + 1),
      orderId: order._id,
      customerId: parsed.data.customerId,
      category: p.category,
      description: p.description,
      metal: p.metal,
      purity: p.purity,
      size: p.size,
      quantity: p.quantity,
      stoneDetails: p.stoneDetails,
      estimatedWeightMg: p.estimatedWeightMg,
      specifications: p.specifications,
      photos: p.photos,
      currentStageId: firstStage?._id,
      statusId: defaultPieceStatus?._id,
      systemStatus: defaultPieceStatus?.systemCategory || "PENDING",
      currentLocation: "IN_HOUSE",
      dueDate: new Date(p.dueDate || parsed.data.expectedDeliveryDate),
      remarks: p.remarks,
      createdBy: userId,
    }));

    const insertedPieces = await OrderItem.insertMany(piecesToInsert);

    // Audit log
    await logActivity({
      entityType: "ORDER",
      entityId: order._id.toString(),
      action: "CREATED",
      remarks: `Order ${orderNo} created with ${insertedPieces.length} piece(s). ${parsed.data.remarks}`,
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    for (const piece of insertedPieces) {
      await logActivity({
        entityType: "ORDER_ITEM",
        entityId: piece._id.toString(),
        action: "CREATED",
        remarks: `Piece ${piece.pieceNo} initialized with estimated weight ${piece.estimatedWeightMg / 1000}g`,
        userId: session.user.id,
        userName: session.user.name || "Staff",
        userRole: (session.user as any).role,
      });
    }

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: { orderId: order._id.toString(), orderNo },
      message: `Order ${orderNo} created successfully with ${insertedPieces.length} pieces.`,
    };
  } catch (error: any) {
    console.error("createOrder error:", error);
    return { ok: false, error: error.message || "Failed to create order" };
  }
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput
): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, error: "Unauthorized." };
    }

    if (!hasPermission((session.user as any).role, "orders:edit")) {
      return { ok: false, error: "Permission denied." };
    }

    const parsed = updateOrderStatusSchema.safeParse(input);
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

    const statusOpt = await StatusOption.findById(parsed.data.statusId);
    if (!statusOpt) {
      return { ok: false, error: "Status option not found." };
    }

    const prevStatus = order.systemStatus;
    order.statusId = statusOpt._id as any;
    order.systemStatus = statusOpt.systemCategory;
    order.updatedBy = session.user.id as any;
    if (parsed.data.photos && parsed.data.photos.length > 0) {
      order.photos.push(...(parsed.data.photos as any));
    }
    await order.save();

    await logActivity({
      entityType: "ORDER",
      entityId: order._id.toString(),
      action: "STATUS_CHANGED",
      remarks: parsed.data.remarks,
      changes: {
        status: { before: prevStatus, after: statusOpt.systemCategory },
      },
      userId: session.user.id,
      userName: session.user.name || "Staff",
      userRole: (session.user as any).role,
    });

    revalidatePath(`/orders/${parsed.data.orderId}`);
    revalidatePath("/orders");
    revalidatePath("/dashboard");

    return { ok: true, data: undefined, message: "Order status updated" };
  } catch (error: any) {
    console.error("updateOrderStatus error:", error);
    return { ok: false, error: error.message || "Failed to update order status" };
  }
}
