import * as React from "react";
import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { JobWork } from "@/models/JobWork";
import { JobWorkVendor } from "@/models/JobWorkVendor";
import { OrderItem } from "@/models/OrderItem";
import { ProductionStage } from "@/models/ProductionStage";
import { Settings } from "@/models/Settings";
import { JobWorkListClient, JobWorkRow } from "@/components/jobwork/JobWorkListClient";

export const metadata: Metadata = {
  title: "Outside Job Work | BMS",
  description: "Track external polishing, finishing, plating, and job work challans",
};

export default async function JobWorkPage() {
  await connectDB();

  const [jobWorksRaw, vendorsRaw, eligiblePiecesRaw, stagesRaw, settings] = await Promise.all([
    JobWork.find({ isDeleted: false })
      .populate("vendorId", "name phone")
      .populate("items.orderItemId", "pieceNo category description estimatedWeightMg")
      .sort({ createdAt: -1 })
      .lean(),
    JobWorkVendor.find({ isDeleted: false, isActive: true }).sort({ name: 1 }).lean(),
    OrderItem.find({
      isDeleted: false,
      currentLocation: "IN_HOUSE",
      systemStatus: { $nin: ["DELIVERED", "CANCELLED"] },
    })
      .select("_id pieceNo category description estimatedWeightMg currentLocation")
      .sort({ pieceNo: 1 })
      .lean(),
    ProductionStage.find({ isDeleted: false, isActive: true }).sort({ sortOrder: 1 }).lean(),
    Settings.getSettings(),
  ]);

  const initialJobWorks: JobWorkRow[] = jobWorksRaw.map((jw: any) => {
    const totalPieces = jw.items?.length || 0;
    const returnedPieces = jw.items?.filter((it: any) => it.status === "RETURNED").length || 0;
    const isOverdue =
      !jw.returnDate &&
      jw.expectedReturnDate &&
      new Date(jw.expectedReturnDate).getTime() < Date.now();

    return {
      id: jw._id.toString(),
      challanNo: jw.challanNo,
      vendorName: jw.vendorId?.name || "Unknown Vendor",
      vendorPhone: jw.vendorId?.phone || "",
      processType: jw.processType,
      totalPieces,
      returnedPieces,
      dispatchDate: jw.dispatchDate,
      expectedReturnDate: jw.expectedReturnDate,
      returnDate: jw.returnDate,
      chargesAmount: jw.chargesAmount,
      isOverdue,
      remarks: jw.remarks || "",
      items: (jw.items || []).map((it: any) => ({
        id: it._id?.toString() || "",
        orderItemId: it.orderItemId?._id?.toString() || it.orderItemId?.toString(),
        pieceNo: it.orderItemId?.pieceNo || "Unknown Piece",
        category: it.orderItemId?.category || "",
        sentWeightMg: it.sentWeightMg || 0,
        returnedWeightMg: it.returnedWeightMg || 0,
        lossMg: it.lossMg || 0,
        status: it.status || "DISPATCHED",
        returnPhotos: it.returnPhotos || [],
        returnRemarks: it.returnRemarks || "",
      })),
    };
  });

  const vendors = vendorsRaw.map((v: any) => ({
    id: v._id.toString(),
    name: v.name,
    phone: v.phone,
    processTypes: v.processTypes || [],
  }));

  const eligiblePieces = eligiblePiecesRaw.map((p: any) => ({
    id: p._id.toString(),
    pieceNo: p.pieceNo,
    category: p.category,
    description: p.description,
    estimatedWeightMg: p.estimatedWeightMg,
    currentLocation: p.currentLocation,
  }));

  const stages = stagesRaw.map((s: any) => ({
    id: s._id.toString(),
    name: s.name,
  }));

  const processTypes = settings.processTypes || [
    "Polishing",
    "Finishing",
    "Rhodium",
    "Plating",
    "Engraving",
    "Stone Setting",
    "Other",
  ];

  return (
    <div className="space-y-6">
      <JobWorkListClient
        initialJobWorks={initialJobWorks}
        vendors={vendors}
        eligiblePieces={eligiblePieces}
        stages={stages}
        processTypes={processTypes}
      />
    </div>
  );
}
