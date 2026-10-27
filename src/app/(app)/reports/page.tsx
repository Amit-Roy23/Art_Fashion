import * as React from "react";
import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Artisan } from "@/models/Artisan";
import { Assignment } from "@/models/Assignment";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { JobWork } from "@/models/JobWork";
import { Delivery } from "@/models/Delivery";
import { Settings } from "@/models/Settings";
import {
  ReportsClient,
  OrderReportRow,
  ArtisanReportRow,
  JobWorkReportRow,
  DeliveryReportRow,
  WeightVarianceRow,
} from "@/components/reports/ReportsClient";
import { isOverTolerance } from "@/lib/weight";

export const metadata: Metadata = {
  title: "Reports & Registers | BMS",
  description: "Export order registers, artisan loss summaries, and weight audits",
};

export default async function ReportsPage() {
  await connectDB();

  const [
    ordersRaw,
    artisansRaw,
    assignmentsRaw,
    jobWorksRaw,
    deliveriesRaw,
    progressUpdatesRaw,
    settings,
  ] = await Promise.all([
    Order.find({ isDeleted: false })
      .populate("customerId", "name phone")
      .sort({ orderDate: -1 })
      .lean(),
    Artisan.find({ isDeleted: false }).sort({ name: 1 }).lean(),
    Assignment.find({ isDeleted: false }).lean(),
    JobWork.find({ isDeleted: false })
      .populate("vendorId", "name phone")
      .sort({ dispatchDate: -1 })
      .lean(),
    Delivery.find({ isDeleted: false })
      .populate("customerId", "name phone")
      .populate("orderId", "orderNo")
      .sort({ deliveryDate: -1 })
      .lean(),
    ProgressUpdate.find({ verificationStatus: "APPROVED" })
      .populate("orderItemId", "pieceNo orderId")
      .populate("artisanId", "name")
      .populate("stageId", "name")
      .lean(),
    Settings.getSettings(),
  ]);

  const tolerance = settings.weightTolerancePercent || 0.5;

  // 1. Order Register
  const orders: OrderReportRow[] = ordersRaw.map((o: any) => ({
    orderNo: o.orderNo,
    orderDate: o.orderDate ? new Date(o.orderDate).toISOString() : "",
    type: o.type,
    customerName: o.customerId?.name || "Unknown",
    customerPhone: o.customerId?.phone || "",
    projectName: o.projectName,
    itemCount: o.itemCount || 0,
    deliveredCount: o.deliveredCount || 0,
    totalEstimatedWeightMg: o.totalEstimatedWeightMg || 0,
    systemStatus: o.systemStatus || "PENDING",
    priority: o.priority || "NORMAL",
  }));

  // 2. Artisan Report
  const artisans: ArtisanReportRow[] = artisansRaw.map((art: any) => {
    const artId = art._id.toString();
    const artAssignments = assignmentsRaw.filter(
      (a: any) => a.artisanId?.toString() === artId
    );

    let activePieces = 0;
    let completedPieces = 0;
    let totalIssuedMg = 0;
    let totalSubmittedMg = 0;
    let overduePieces = 0;

    artAssignments.forEach((assign: any) => {
      const isDue = assign.dueDate && new Date(assign.dueDate).getTime() < Date.now();
      const isClosed = !!assign.closedAt;

      (assign.items || []).forEach((item: any) => {
        totalIssuedMg += item.issuedWeightMg || 0;
        if (isClosed) {
          completedPieces++;
        } else {
          activePieces++;
          if (isDue) overduePieces++;
        }
      });
    });

    const artProgress = progressUpdatesRaw.filter(
      (p: any) => p.artisanId?._id?.toString() === artId || p.artisanId?.toString() === artId
    );
    artProgress.forEach((p: any) => {
      totalSubmittedMg += p.submittedWeightMg || 0;
    });

    return {
      artisanCode: art.code || "",
      artisanName: art.name,
      phone: art.phone,
      activePieces,
      completedPieces,
      overduePieces,
      totalIssuedWeightMg: totalIssuedMg,
      totalSubmittedWeightMg: totalSubmittedMg,
      totalVarianceMg: Math.abs(totalIssuedMg - totalSubmittedMg),
    };
  });

  // 3. Job Work Register
  const jobWorks: JobWorkReportRow[] = jobWorksRaw.map((j: any) => {
    let sentMg = 0;
    let retMg = 0;
    let lossMg = 0;

    (j.items || []).forEach((it: any) => {
      sentMg += it.sentWeightMg || 0;
      if (it.status === "RETURNED") {
        retMg += it.returnedWeightMg || 0;
        lossMg += it.lossMg || 0;
      }
    });

    const lossPct = sentMg > 0 ? ((lossMg / sentMg) * 100).toFixed(2) : "0.00";

    return {
      challanNo: j.challanNo,
      dispatchDate: j.dispatchDate ? new Date(j.dispatchDate).toISOString() : "",
      vendorName: j.vendorId?.name || "Unknown",
      processType: j.processType,
      piecesCount: j.items?.length || 0,
      totalSentWeightMg: sentMg,
      totalReturnedWeightMg: retMg,
      totalLossMg: lossMg,
      lossPercent: lossPct,
      status: j.returnDate ? "RETURNED" : "IN_PROCESS",
    };
  });

  // 4. Delivery Register
  const deliveries: DeliveryReportRow[] = deliveriesRaw.map((d: any) => {
    let totalDeliveredMg = 0;
    (d.items || []).forEach((it: any) => {
      totalDeliveredMg += it.finalWeightMg || 0;
    });

    return {
      deliveryNo: d.deliveryNo,
      deliveryDate: d.deliveryDate ? new Date(d.deliveryDate).toISOString() : "",
      customerName: d.customerId?.name || "Unknown",
      orderNo: d.orderId?.orderNo || "Unknown",
      piecesCount: d.items?.length || 0,
      totalDeliveredWeightMg: totalDeliveredMg,
      receivedBy: d.receivedBy,
      mode: d.mode || "IN_PERSON",
    };
  });

  // 5. Weight Variance Audits (items exceeding tolerance)
  const variances: WeightVarianceRow[] = [];

  // Check JobWorks with returned pieces exceeding tolerance
  jobWorksRaw.forEach((jw: any) => {
    (jw.items || []).forEach((it: any) => {
      if (it.status === "RETURNED" && it.sentWeightMg > 0) {
        if (isOverTolerance(it.sentWeightMg, it.returnedWeightMg, tolerance)) {
          const varMg = it.sentWeightMg - it.returnedWeightMg;
          const varPct = ((Math.abs(varMg) / it.sentWeightMg) * 100).toFixed(2);
          variances.push({
            pieceNo: it.orderItemId?.pieceNo || "Piece",
            orderNo: jw.challanNo,
            stageName: jw.processType,
            partyName: jw.vendorId?.name || "Vendor",
            partyType: "JOBWORK",
            recordedAt: jw.returnDate ? new Date(jw.returnDate).toISOString() : "",
            initialWeightMg: it.sentWeightMg,
            finalWeightMg: it.returnedWeightMg,
            varianceMg: varMg,
            variancePercent: varPct,
            tolerancePercent: tolerance,
          });
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      <ReportsClient
        orders={orders}
        artisans={artisans}
        jobWorks={jobWorks}
        deliveries={deliveries}
        variances={variances}
        weightTolerancePercent={tolerance}
      />
    </div>
  );
}
