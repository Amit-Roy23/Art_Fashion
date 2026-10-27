import * as React from "react";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Artisan } from "@/models/Artisan";
import { ProductionStage } from "@/models/ProductionStage";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { JobWork } from "@/models/JobWork";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { PendingSubmissionsCard } from "@/components/dashboard/PendingSubmissionsCard";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  ShoppingBag,
  Clock,
  Wrench,
  Flame,
  CheckCircle2,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  User,
  Calendar,
} from "lucide-react";


export default async function DashboardPage() {
  await connectDB();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const next7Days = new Date(now.getTime() + 7 * 86400000);

  // 1. KPI Counts
  const [
    totalOrders,
    pendingOrders,
    inProdOrders,
    atJobWorkOrders,
    readyOrders,
    deliveredThisMonth,
    overduePiecesCount,
  ] = await Promise.all([
    Order.countDocuments({ isDeleted: false }),
    Order.countDocuments({ systemStatus: "PENDING", isDeleted: false }),
    Order.countDocuments({ systemStatus: "IN_PRODUCTION", isDeleted: false }),
    Order.countDocuments({ systemStatus: "AT_JOB_WORK", isDeleted: false }),
    Order.countDocuments({ systemStatus: "READY", isDeleted: false }),
    Order.countDocuments({
      systemStatus: "DELIVERED",
      updatedAt: { $gte: startOfMonth },
      isDeleted: false,
    }),
    OrderItem.countDocuments({
      currentLocation: { $ne: "DELIVERED" },
      dueDate: { $lt: now },
      isDeleted: false,
    }),
  ]);

  // 2. Overdue Pieces List
  const overduePieces = await OrderItem.find({
    currentLocation: { $ne: "DELIVERED" },
    dueDate: { $lt: now },
    isDeleted: false,
  })
    .populate("currentArtisanId")
    .populate("currentStageId")
    .sort({ dueDate: 1 })
    .limit(5)
    .lean();

  // 3. Pieces Due in Next 7 Days
  const dueSoonPieces = await OrderItem.find({
    currentLocation: { $ne: "DELIVERED" },
    dueDate: { $gte: now, $lte: next7Days },
    isDeleted: false,
  })
    .populate("currentArtisanId")
    .populate("currentStageId")
    .sort({ dueDate: 1 })
    .limit(5)
    .lean();

  // 4. Pending Karigar Submissions
  const pendingSubmissions = await ProgressUpdate.find({
    verificationStatus: "PENDING",
    isDeleted: false,
  })
    .populate("orderItemId")
    .populate("artisanId")
    .populate("stageId")
    .sort({ submittedAt: -1 })
    .lean();

  // 5. Items at Job Work beyond expected return
  const overdueJobWorks = await JobWork.find({
    "items.status": "SENT",
    expectedReturnDate: { $lt: now },
    isDeleted: false,
  })
    .populate("vendorId")
    .populate("items.orderItemId")
    .lean();

  // 6. Ready but Not Delivered Pieces
  const readyNotDelivered = await OrderItem.find({
    currentLocation: "READY",
    isDeleted: false,
  })
    .populate("customerId")
    .populate("orderId")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  // 7. Artisans Workload Table
  const artisans = await Artisan.find({ isActive: true, isDeleted: false }).lean();
  const artisanWorkloads = await Promise.all(
    artisans.map(async (art) => {
      const activePieces = await OrderItem.find({
        currentArtisanId: art._id,
        currentLocation: "WITH_KARIGAR",
        isDeleted: false,
      }).lean();

      const overdue = activePieces.filter(
        (p) => p.dueDate && new Date(p.dueDate) < now
      ).length;

      const pendingSubs = await ProgressUpdate.countDocuments({
        artisanId: art._id,
        verificationStatus: "PENDING",
        isDeleted: false,
      });

      return {
        id: art._id.toString(),
        code: art.code,
        name: art.name,
        phone: art.phone,
        inHandCount: activePieces.length,
        overdueCount: overdue,
        pendingReviewCount: pendingSubs,
      };
    })
  );

  // 8. Stages & Charts Data
  const allStages = await ProductionStage.find({ isActive: true, isDeleted: false })
    .sort({ sortOrder: 1 })
    .lean();

  const stageDistribution = await Promise.all(
    allStages.map(async (st) => {
      const count = await OrderItem.countDocuments({
        currentStageId: st._id,
        currentLocation: { $ne: "DELIVERED" },
        isDeleted: false,
      });
      return {
        stageName: st.name,
        count,
        colour: st.colour,
      };
    })
  );

  // Monthly Trend sample (6 months)
  const monthlyTrend = [
    { month: "May", received: 8, delivered: 6 },
    { month: "Jun", received: 11, delivered: 9 },
    { month: "Jul", received: 14, delivered: 12 },
    { month: "Aug", received: 18, delivered: 15 },
    { month: "Sep", received: 15, delivered: 16 },
    { month: "Oct", received: totalOrders, delivered: deliveredThisMonth },
  ];

  const formattedSubmissions = pendingSubmissions.map((s: any) => ({
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

  const stageOptions = allStages.map((s) => ({
    id: s._id.toString(),
    name: s.name,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            Jewellery Production Dashboard
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
              Live Workshop
            </span>
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time tracking of customer orders, artisan work orders, and outside job work.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/orders/new">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer">
              + New Order
            </button>
          </Link>
        </div>
      </div>

      {/* 1. KPI Cards Grid (Clickable to Filtered Views) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Orders */}
        <Link href="/orders" className="group">
          <Card className="hover:border-neutral-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-medium">Total Orders</span>
                <ShoppingBag className="h-3.5 w-3.5 text-neutral-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {totalOrders}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                View all <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Pending */}
        <Link href="/orders?status=PENDING" className="group">
          <Card className="hover:border-amber-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-[11px] font-medium">Pending</span>
                <Clock className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                {pendingOrders}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                Unassigned <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* In Production */}
        <Link href="/orders?status=IN_PRODUCTION" className="group">
          <Card className="hover:border-blue-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
                <span className="text-[11px] font-medium">In Production</span>
                <Wrench className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {inProdOrders}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                With Karigars <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* At Job Work */}
        <Link href="/job-work" className="group">
          <Card className="hover:border-purple-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
                <span className="text-[11px] font-medium">At Job Work</span>
                <Flame className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                {atJobWorkOrders}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                Outside vendor <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Ready for Delivery */}
        <Link href="/orders?status=READY" className="group">
          <Card className="hover:border-emerald-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="text-[11px] font-medium">Ready</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {readyOrders}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                Vault / QC passed <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Delivered this month */}
        <Link href="/deliveries" className="group">
          <Card className="hover:border-cyan-400 transition-all shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-400">
                <span className="text-[11px] font-medium">Delivered</span>
                <Truck className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400">
                {deliveredThisMonth}
              </p>
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                This month <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Overdue */}
        <Link href="/pieces?overdue=true" className="group">
          <Card className="hover:border-red-400 bg-red-50/20 dark:bg-red-950/20 transition-all shadow-2xs border-red-200 dark:border-red-900/40">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span className="text-[11px] font-medium">Overdue</span>
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {overduePiecesCount}
              </p>
              <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                Action required <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 2. Charts Row */}
      <DashboardCharts
        stageDistribution={stageDistribution}
        monthlyTrend={monthlyTrend}
      />

      {/* 3. Artisan Workload Table */}
      <Card className="border-neutral-200/80 dark:border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-amber-600" />
            Artisan (Karigar) Workload & Turnaround
          </CardTitle>
          <Link href="/artisans" className="text-xs text-amber-600 hover:underline">
            Manage Karigars →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-neutral-200 bg-neutral-50/75 dark:border-neutral-800 dark:bg-neutral-900/75 text-neutral-500 uppercase">
                <tr>
                  <th className="p-3">Artisan</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-center">Pieces in Hand</th>
                  <th className="p-3 text-center">Overdue</th>
                  <th className="p-3 text-center">Pending Review</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {artisanWorkloads.map((art) => (
                  <tr key={art.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="p-3 font-semibold text-neutral-800 dark:text-neutral-200">
                      {art.name}{" "}
                      <span className="text-[10px] text-neutral-400 font-normal">
                        ({art.code})
                      </span>
                    </td>
                    <td className="p-3 text-neutral-500 font-mono">{art.phone}</td>
                    <td className="p-3 text-center font-bold text-amber-700 dark:text-amber-400">
                      {art.inHandCount}
                    </td>
                    <td className="p-3 text-center">
                      {art.overdueCount > 0 ? (
                        <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-bold text-[10px] dark:bg-red-950 dark:text-red-300">
                          {art.overdueCount} Overdue
                        </span>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {art.pendingReviewCount > 0 ? (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-bold text-[10px] dark:bg-amber-950 dark:text-amber-200">
                          {art.pendingReviewCount} Needs Review
                        </span>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/artisans/${art.id}`}
                        className="text-amber-600 hover:underline font-medium text-[11px]"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Action Queues: Pending Reviews & Overdue Pieces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Karigar Submissions Review Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
              Submission Review Queue ({formattedSubmissions.length})
            </h3>
            <span className="text-[10px] text-neutral-400">
              Needs staff verification
            </span>
          </div>

          <PendingSubmissionsCard
            submissions={formattedSubmissions}
            stages={stageOptions}
          />
        </div>

        {/* Urgent & Overdue Pieces */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue Pieces Requiring Attention ({overduePieces.length})
            </h3>
            <Link href="/pieces?overdue=true" className="text-[11px] text-red-600 hover:underline">
              View all overdue →
            </Link>
          </div>

          <div className="space-y-2">
            {overduePieces.length > 0 ? (
              overduePieces.map((p: any) => (
                <div
                  key={p._id.toString()}
                  className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/20 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/pieces/${p._id.toString()}`}
                        className="font-bold text-xs text-neutral-900 dark:text-neutral-100 hover:underline"
                      >
                        {p.pieceNo}
                      </Link>
                      <span className="rounded bg-neutral-200 px-1.5 py-0.2 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {p.category}
                      </span>
                      <StatusBadge systemCategory={p.systemStatus} />
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-xs">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-red-600 font-medium">
                      <Calendar className="h-3 w-3" />
                      Due on {formatISTDate(p.dueDate)}
                      {p.currentArtisanId && (
                        <span>• Karigar: {p.currentArtisanId.name}</span>
                      )}
                    </div>
                  </div>

                  <Link href={`/pieces/${p._id.toString()}`}>
                    <button className="px-2.5 py-1 text-xs rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-50 dark:bg-neutral-900 dark:border-red-800 dark:text-red-300 font-semibold cursor-pointer">
                      View Piece
                    </button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                🎉 No overdue pieces! All production schedules are on time.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Due Next 7 Days & Ready for Delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Due Next 7 Days */}
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Delivery Milestones in Next 7 Days ({dueSoonPieces.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueSoonPieces.length > 0 ? (
              dueSoonPieces.map((p: any) => (
                <div
                  key={p._id.toString()}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/40 text-xs"
                >
                  <div>
                    <Link
                      href={`/pieces/${p._id.toString()}`}
                      className="font-bold text-neutral-900 dark:text-neutral-100 hover:underline"
                    >
                      {p.pieceNo}
                    </Link>
                    <p className="text-[11px] text-neutral-500 truncate max-w-xs">
                      {p.category} — {p.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {formatISTDate(p.dueDate)}
                    </span>
                    <p className="text-[10px] text-neutral-400">{p.currentLocation}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No orders due in the next 7 days.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ready in Vault — Not Delivered */}
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Ready Pieces Awaiting Customer Handover ({readyNotDelivered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readyNotDelivered.length > 0 ? (
              readyNotDelivered.map((p: any) => (
                <div
                  key={p._id.toString()}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-xs"
                >
                  <div>
                    <Link
                      href={`/pieces/${p._id.toString()}`}
                      className="font-bold text-neutral-900 dark:text-neutral-100 hover:underline"
                    >
                      {p.pieceNo}
                    </Link>
                    <p className="text-[11px] text-neutral-500">
                      Customer: {p.customerId?.name || "Customer"} ({p.customerId?.phone || ""})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatWeight(p.finalWeightMg || p.estimatedWeightMg)}
                    </span>
                    <p className="text-[10px] text-neutral-400">{p.metal} {p.purity}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No pieces pending handover in vault.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
