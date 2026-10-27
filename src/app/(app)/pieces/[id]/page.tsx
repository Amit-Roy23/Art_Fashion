import * as React from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { OrderItem } from "@/models/OrderItem";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { ProductionStage } from "@/models/ProductionStage";
import { StatusOption } from "@/models/StatusOption";
import { ActivityLog } from "@/models/ActivityLog";
import { Settings } from "@/models/Settings";
import { getPieceWeightJourney } from "@/actions/piece";
import { PieceDetailClient } from "@/components/pieces/PieceDetailClient";


export default async function PieceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();

  const piece = await OrderItem.findById(id)
    .populate("currentStageId")
    .populate("currentArtisanId")
    .populate("statusId")
    .lean();

  if (!piece || piece.isDeleted) {
    notFound();
  }

  const [order, customer, stages, statuses, settings, weightJourney, logs] =
    await Promise.all([
      Order.findById(piece.orderId).lean(),
      Customer.findById(piece.customerId).lean(),
      ProductionStage.find({ isActive: true, isDeleted: false })
        .sort({ sortOrder: 1 })
        .lean(),
      StatusOption.find({ scope: "PIECE", isActive: true, isDeleted: false })
        .sort({ sortOrder: 1 })
        .lean(),
      Settings.findOne().lean(),
      getPieceWeightJourney(piece._id.toString()),
      ActivityLog.find({
        entityType: "ORDER_ITEM",
        entityId: piece._id.toString(),
      })
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
    <PieceDetailClient
      piece={piece}
      order={order}
      customer={customer}
      stages={stages}
      statuses={statuses}
      weightJourney={weightJourney || []}
      timelineEvents={timelineEvents}
      tolerancePercent={settings?.weightTolerancePercent || 0.5}
    />
  );
}
