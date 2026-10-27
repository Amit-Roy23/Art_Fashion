import * as React from "react";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { StatusOption } from "@/models/StatusOption";
import { OrderListClient, OrderRow } from "@/components/orders/OrderListClient";


export default async function OrdersPage() {
  await connectDB();
  const now = new Date();

  const orders = await Order.find({ isDeleted: false })
    .populate("customerId")
    .populate("statusId")
    .sort({ createdAt: -1 })
    .lean();

  const orderRows: OrderRow[] = orders.map((o: any) => {
    const isOverdue =
      o.systemStatus !== "DELIVERED" &&
      o.expectedDeliveryDate &&
      new Date(o.expectedDeliveryDate) < now;

    return {
      id: o._id.toString(),
      orderNo: o.orderNo,
      type: o.type,
      projectName: o.projectName,
      customerName: o.customerId?.name || "Customer",
      customerPhone: o.customerId?.phone || "",
      orderDate: o.orderDate,
      expectedDeliveryDate: o.expectedDeliveryDate,
      priority: o.priority,
      systemStatus: o.systemStatus,
      statusName: o.statusId?.name || o.systemStatus,
      statusColour: o.statusId?.colour,
      itemCount: o.itemCount,
      deliveredCount: o.deliveredCount,
      totalEstimatedWeightMg: o.totalEstimatedWeightMg,
      isOverdue,
    };
  });

  return <OrderListClient initialOrders={orderRows} />;
}
