import * as React from "react";
import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { Delivery } from "@/models/Delivery";
import { OrderItem } from "@/models/OrderItem";
import { DeliveryListClient, DeliveryRow, ReadyOrderOption } from "@/components/deliveries/DeliveryListClient";

export const metadata: Metadata = {
  title: "Deliveries | BMS",
  description: "Track customer handovers, final weights, and delivery notes",
};

export default async function DeliveriesPage() {
  await connectDB();

  const [deliveriesRaw, readyPiecesRaw] = await Promise.all([
    Delivery.find({ isDeleted: false })
      .populate("customerId", "name phone")
      .populate("orderId", "orderNo")
      .populate("items.orderItemId", "pieceNo category")
      .sort({ deliveryDate: -1 })
      .lean(),
    OrderItem.find({
      isDeleted: false,
      systemStatus: "READY",
    })
      .populate("orderId", "orderNo")
      .populate("customerId", "name phone")
      .lean(),
  ]);

  const initialDeliveries: DeliveryRow[] = deliveriesRaw.map((d: any) => ({
    id: d._id.toString(),
    deliveryNo: d.deliveryNo,
    customerId: d.customerId?._id?.toString() || d.customerId?.toString(),
    customerName: d.customerId?.name || "Unknown Customer",
    customerPhone: d.customerId?.phone || "",
    orderId: d.orderId?._id?.toString() || d.orderId?.toString(),
    orderNo: d.orderId?.orderNo || "Unknown Order",
    piecesCount: d.items?.length || 0,
    deliveryDate: d.deliveryDate,
    receivedBy: d.receivedBy,
    receiverPhone: d.receiverPhone,
    mode: d.mode || "IN_PERSON",
    remarks: d.remarks || "",
    photos: d.photos || [],
    items: (d.items || []).map((it: any) => ({
      pieceNo: it.orderItemId?.pieceNo || "Unknown Piece",
      category: it.orderItemId?.category || "",
      finalWeightMg: it.finalWeightMg || 0,
    })),
  }));

  // Group ready pieces by order
  const orderMap = new Map<string, ReadyOrderOption>();
  readyPiecesRaw.forEach((p: any) => {
    if (!p.orderId || !p.customerId) return;
    const orderId = p.orderId._id?.toString() || p.orderId.toString();
    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        orderId,
        orderNo: p.orderId.orderNo || "Unknown Order",
        customerId: p.customerId._id?.toString() || p.customerId.toString(),
        customerName: p.customerId.name || "Customer",
        customerPhone: p.customerId.phone || "",
        readyPieces: [],
      });
    }

    orderMap.get(orderId)!.readyPieces.push({
      pieceId: p._id.toString(),
      pieceNo: p.pieceNo,
      category: p.category,
      description: p.description,
      estimatedWeightMg: p.estimatedWeightMg || 0,
    });
  });

  const readyOrders = Array.from(orderMap.values());

  return (
    <div className="space-y-6">
      <DeliveryListClient initialDeliveries={initialDeliveries} readyOrders={readyOrders} />
    </div>
  );
}
