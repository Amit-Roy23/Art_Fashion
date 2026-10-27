import * as React from "react";
import { connectDB } from "@/lib/db";
import { Assignment } from "@/models/Assignment";
import { OrderItem } from "@/models/OrderItem";
import { Artisan } from "@/models/Artisan";
import { ProductionStage } from "@/models/ProductionStage";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import {
  AssignmentListClient,
  AssignmentRow,
} from "@/components/assignments/AssignmentListClient";


export default async function AssignmentsPage() {
  await connectDB();

  const [assignments, eligiblePiecesDocs, artisansDocs, stagesDocs, pendingSubsDocs] =
    await Promise.all([
      Assignment.find({ isDeleted: false })
        .populate("artisanId")
        .populate("issuedBy")
        .sort({ issueDate: -1 })
        .lean(),
      OrderItem.find({
        currentLocation: { $in: ["IN_HOUSE", "READY"] },
        currentArtisanId: null,
        isDeleted: false,
      })
        .sort({ dueDate: 1 })
        .lean(),
      Artisan.find({ isActive: true, isDeleted: false })
        .sort({ name: 1 })
        .lean(),
      ProductionStage.find({ isActive: true, isDeleted: false })
        .sort({ sortOrder: 1 })
        .lean(),
      ProgressUpdate.find({ verificationStatus: "PENDING", isDeleted: false })
        .populate("orderItemId")
        .populate("artisanId")
        .populate("stageId")
        .sort({ submittedAt: -1 })
        .lean(),
    ]);

  const assignmentRows: AssignmentRow[] = assignments.map((asgn: any) => {
    const totalWt = asgn.items.reduce(
      (acc: number, it: any) => acc + (it.issuedWeightMg || 0),
      0
    );

    return {
      id: asgn._id.toString(),
      workOrderNo: asgn.workOrderNo,
      artisanName: asgn.artisanId?.name || "Artisan",
      artisanPhone: asgn.artisanId?.phone || "",
      artisanCode: asgn.artisanId?.code || "KAR",
      itemsCount: asgn.items.length,
      totalIssuedWeightMg: totalWt,
      issueDate: asgn.issueDate,
      dueDate: asgn.dueDate,
      issuedByName: asgn.issuedBy?.name || "Supervisor",
      remarks: asgn.remarks || "",
    };
  });

  const eligiblePieces = eligiblePiecesDocs.map((p) => ({
    id: p._id.toString(),
    pieceNo: p.pieceNo,
    category: p.category,
    description: p.description,
    metal: p.metal,
    purity: p.purity,
    estimatedWeightMg: p.estimatedWeightMg,
    currentStageId: p.currentStageId?.toString(),
    currentLocation: p.currentLocation,
  }));

  const artisans = artisansDocs.map((a) => ({
    id: a._id.toString(),
    code: a.code,
    name: a.name,
    phone: a.phone,
    speciality: a.speciality || [],
  }));

  const stages = stagesDocs.map((s) => ({
    id: s._id.toString(),
    name: s.name,
  }));

  const pendingSubmissions = pendingSubsDocs.map((s: any) => ({
    id: s._id.toString(),
    pieceNo: s.orderItemId?.pieceNo || "Piece",
    category: s.orderItemId?.category || "Jewellery",
    artisanName: s.artisanId?.name || "Artisan",
    stageName: s.stageId?.name || "Stage",
    submittedWeightMg: s.submittedWeightMg,
    submittedAt: s.submittedAt,
    remarks: s.remarks,
    photos: s.photos || [],
  }));

  return (
    <AssignmentListClient
      initialAssignments={assignmentRows}
      eligiblePieces={eligiblePieces}
      artisans={artisans}
      stages={stages}
      pendingSubmissions={pendingSubmissions}
    />
  );
}
