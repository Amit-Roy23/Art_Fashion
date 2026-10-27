import * as React from "react";
import { connectDB } from "@/lib/db";
import { OrderItem } from "@/models/OrderItem";
import { PieceListClient, PieceRow } from "@/components/pieces/PieceListClient";


export default async function PiecesPage() {
  await connectDB();
  const now = new Date();

  const pieces = await OrderItem.find({ isDeleted: false })
    .populate("orderId")
    .populate("customerId")
    .populate("currentStageId")
    .populate("currentArtisanId")
    .sort({ dueDate: 1 })
    .lean();

  const pieceRows: PieceRow[] = pieces.map((p: any) => {
    const isOverdue =
      p.currentLocation !== "DELIVERED" &&
      p.dueDate &&
      new Date(p.dueDate) < now;

    return {
      id: p._id.toString(),
      pieceNo: p.pieceNo,
      orderNo: p.orderId?.orderNo || "Order",
      orderId: p.orderId?._id?.toString() || "",
      customerName: p.customerId?.name || "Customer",
      category: p.category,
      description: p.description,
      metal: p.metal,
      purity: p.purity,
      estimatedWeightMg: p.estimatedWeightMg,
      currentLocation: p.currentLocation,
      stageName: p.currentStageId?.name || "Design / CAD",
      artisanName: p.currentArtisanId?.name,
      dueDate: p.dueDate,
      isOverdue,
      systemStatus: p.systemStatus,
    };
  });

  return <PieceListClient initialPieces={pieceRows} />;
}
