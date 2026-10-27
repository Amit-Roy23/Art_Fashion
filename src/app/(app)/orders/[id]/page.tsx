import * as React from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { StatusOption } from "@/models/StatusOption";
import { ActivityLog } from "@/models/ActivityLog";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";


export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();

  const order = await Order.findById(id)
    .populate("customerId")
    .populate("statusId")
    .lean();

  if (!order || order.isDeleted) {
    notFound();
  }

  const [pieces, statuses, logs] = await Promise.all([
    OrderItem.find({ orderId: order._id, isDeleted: false })
      .populate("currentStageId")
      .populate("currentArtisanId")
      .lean(),
    StatusOption.find({ scope: "ORDER", isActive: true, isDeleted: false })
      .sort({ sortOrder: 1 })
      .lean(),
    ActivityLog.find({ entityType: "ORDER", entityId: order._id.toString() })
      .sort({ at: -1 })
      .lean(),
  ]);

  const timelineEvents = logs.map((l) => ({
    id: l._id.toString(),
    action: l.action,
    remarks: l.remarks,
    userName: l.userName,
    userRole: l.userRole,
    at: l.at,
    changes: l.changes,
  }));

  return (
    <OrderDetailClient
      order={order}
      pieces={pieces}
      statuses={statuses}
      timelineEvents={timelineEvents}
    />
  );
}
