"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Briefcase,
  Truck,
  Layers,
} from "lucide-react";

export interface OrderReportRow {
  orderNo: string;
  orderDate: string;
  type: string;
  customerName: string;
  customerPhone: string;
  projectName?: string;
  itemCount: number;
  deliveredCount: number;
  totalEstimatedWeightMg: number;
  systemStatus: string;
  priority: string;
}

export interface ArtisanReportRow {
  artisanCode: string;
  artisanName: string;
  phone: string;
  activePieces: number;
  completedPieces: number;
  overduePieces: number;
  totalIssuedWeightMg: number;
  totalSubmittedWeightMg: number;
  totalVarianceMg: number;
}

export interface JobWorkReportRow {
  challanNo: string;
  dispatchDate: string;
  vendorName: string;
  processType: string;
  piecesCount: number;
  totalSentWeightMg: number;
  totalReturnedWeightMg: number;
  totalLossMg: number;
  lossPercent: string;
  status: string;
}

export interface DeliveryReportRow {
  deliveryNo: string;
  deliveryDate: string;
  customerName: string;
  orderNo: string;
  piecesCount: number;
  totalDeliveredWeightMg: number;
  receivedBy: string;
  mode: string;
}

export interface WeightVarianceRow {
  pieceNo: string;
  orderNo: string;
  stageName: string;
  partyName: string;
  partyType: "ARTISAN" | "JOBWORK" | "DELIVERY";
  recordedAt: string;
  initialWeightMg: number;
  finalWeightMg: number;
  varianceMg: number;
  variancePercent: string;
  tolerancePercent: number;
}

interface ReportsClientProps {
  orders: OrderReportRow[];
  artisans: ArtisanReportRow[];
  jobWorks: JobWorkReportRow[];
  deliveries: DeliveryReportRow[];
  variances: WeightVarianceRow[];
  weightTolerancePercent: number;
}

export function ReportsClient({
  orders,
  artisans,
  jobWorks,
  deliveries,
  variances,
  weightTolerancePercent,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = React.useState("orders");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const exportToCSV = (filename: string, rows: any[], headers: string[]) => {
    if (!rows || !rows.length) {
      alert("No data available to export");
      return;
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            let val = row[header] !== undefined ? row[header] : "";
            if (typeof val === "string") {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Reports & Registers
          </h1>
          <p className="text-sm text-slate-500">
            Export registers, Karigar loss summaries, and weight tolerance audits
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Order Register ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="artisans" className="flex items-center gap-1.5 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" /> Karigar Work ({artisans.length})
          </TabsTrigger>
          <TabsTrigger value="jobworks" className="flex items-center gap-1.5 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" /> Job Work Losses ({jobWorks.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-1.5 text-xs font-semibold">
            <Truck className="w-3.5 h-3.5" /> Delivery Register ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="variances" className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Weight Variances ({variances.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. ORDER REGISTER */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Customer Orders Register</CardTitle>
                <CardDescription>Comprehensive log of all received jewellery orders</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    "bms_order_register",
                    orders.map((o) => ({
                      "Order No": o.orderNo,
                      "Date": o.orderDate,
                      "Type": o.type,
                      "Customer": o.customerName,
                      "Phone": o.customerPhone,
                      "Project": o.projectName || "",
                      "Pieces": o.itemCount,
                      "Delivered": o.deliveredCount,
                      "Est Wt (g)": (o.totalEstimatedWeightMg / 1000).toFixed(3),
                      "Status": o.systemStatus,
                      "Priority": o.priority,
                    })),
                    [
                      "Order No",
                      "Date",
                      "Type",
                      "Customer",
                      "Phone",
                      "Project",
                      "Pieces",
                      "Delivered",
                      "Est Wt (g)",
                      "Status",
                      "Priority",
                    ]
                  )
                }
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Order No</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5 text-center">Pieces</th>
                      <th className="px-4 py-2.5 text-right">Est. Weight</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{o.orderNo}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatISTDate(o.orderDate)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{o.customerName}</td>
                        <td className="px-4 py-2.5 capitalize">{o.type.toLowerCase()}</td>
                        <td className="px-4 py-2.5 text-center">
                          {o.deliveredCount}/{o.itemCount}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatWeight(o.totalEstimatedWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {o.systemStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ARTISAN WORK REPORT */}
        <TabsContent value="artisans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Karigar Performance & Losses</CardTitle>
                <CardDescription>Pieces processed and cumulative weight variances</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    "bms_karigar_report",
                    artisans.map((a) => ({
                      "Code": a.artisanCode,
                      "Karigar Name": a.artisanName,
                      "Phone": a.phone,
                      "In Hand": a.activePieces,
                      "Completed": a.completedPieces,
                      "Overdue": a.overduePieces,
                      "Issued Wt (g)": (a.totalIssuedWeightMg / 1000).toFixed(3),
                      "Submitted Wt (g)": (a.totalSubmittedWeightMg / 1000).toFixed(3),
                      "Variance (g)": (a.totalVarianceMg / 1000).toFixed(3),
                    })),
                    [
                      "Code",
                      "Karigar Name",
                      "Phone",
                      "In Hand",
                      "Completed",
                      "Overdue",
                      "Issued Wt (g)",
                      "Submitted Wt (g)",
                      "Variance (g)",
                    ]
                  )
                }
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Karigar</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5 text-center">In Hand</th>
                      <th className="px-4 py-2.5 text-center">Completed</th>
                      <th className="px-4 py-2.5 text-center">Overdue</th>
                      <th className="px-4 py-2.5 text-right">Issued Wt</th>
                      <th className="px-4 py-2.5 text-right">Submitted Wt</th>
                      <th className="px-4 py-2.5 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {artisans.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {a.artisanName} ({a.artisanCode})
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{a.phone}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-amber-700">
                          {a.activePieces}
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-emerald-700">
                          {a.completedPieces}
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-red-600">
                          {a.overduePieces}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatWeight(a.totalIssuedWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatWeight(a.totalSubmittedWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">
                          {formatWeight(a.totalVarianceMg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. JOB WORK LOSSES */}
        <TabsContent value="jobworks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Outside Job Work & Process Losses</CardTitle>
                <CardDescription>Track metal lost during external polishing, plating, and finishing</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    "bms_jobwork_loss_register",
                    jobWorks.map((j) => ({
                      "Challan No": j.challanNo,
                      "Date": j.dispatchDate,
                      "Vendor": j.vendorName,
                      "Process": j.processType,
                      "Pieces": j.piecesCount,
                      "Sent Wt (g)": (j.totalSentWeightMg / 1000).toFixed(3),
                      "Returned Wt (g)": (j.totalReturnedWeightMg / 1000).toFixed(3),
                      "Loss (g)": (j.totalLossMg / 1000).toFixed(3),
                      "Loss %": j.lossPercent,
                      "Status": j.status,
                    })),
                    [
                      "Challan No",
                      "Date",
                      "Vendor",
                      "Process",
                      "Pieces",
                      "Sent Wt (g)",
                      "Returned Wt (g)",
                      "Loss (g)",
                      "Loss %",
                      "Status",
                    ]
                  )
                }
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Challan</th>
                      <th className="px-4 py-2.5">Vendor</th>
                      <th className="px-4 py-2.5">Process</th>
                      <th className="px-4 py-2.5 text-center">Pieces</th>
                      <th className="px-4 py-2.5 text-right">Sent Wt</th>
                      <th className="px-4 py-2.5 text-right">Ret. Wt</th>
                      <th className="px-4 py-2.5 text-right">Loss</th>
                      <th className="px-4 py-2.5 text-right">Loss %</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobWorks.map((j, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{j.challanNo}</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{j.vendorName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{j.processType}</td>
                        <td className="px-4 py-2.5 text-center">{j.piecesCount}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatWeight(j.totalSentWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatWeight(j.totalReturnedWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">
                          {formatWeight(j.totalLossMg)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">
                          {j.lossPercent}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {j.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. DELIVERY REGISTER */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Customer Delivery Register</CardTitle>
                <CardDescription>Log of delivered jewellery with verified handover weights</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    "bms_delivery_register",
                    deliveries.map((d) => ({
                      "Delivery No": d.deliveryNo,
                      "Date": d.deliveryDate,
                      "Customer": d.customerName,
                      "Order No": d.orderNo,
                      "Pieces": d.piecesCount,
                      "Final Wt (g)": (d.totalDeliveredWeightMg / 1000).toFixed(3),
                      "Receiver": d.receivedBy,
                      "Mode": d.mode,
                    })),
                    [
                      "Delivery No",
                      "Date",
                      "Customer",
                      "Order No",
                      "Pieces",
                      "Final Wt (g)",
                      "Receiver",
                      "Mode",
                    ]
                  )
                }
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-slate-600 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Delivery No</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Order</th>
                      <th className="px-4 py-2.5 text-center">Pieces</th>
                      <th className="px-4 py-2.5 text-right">Final Delivered Wt</th>
                      <th className="px-4 py-2.5">Receiver</th>
                      <th className="px-4 py-2.5">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveries.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{d.deliveryNo}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatISTDate(d.deliveryDate)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{d.customerName}</td>
                        <td className="px-4 py-2.5 text-amber-800 font-medium">{d.orderNo}</td>
                        <td className="px-4 py-2.5 text-center font-bold">{d.piecesCount}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                          {formatWeight(d.totalDeliveredWeightMg)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">{d.receivedBy}</td>
                        <td className="px-4 py-2.5 capitalize">{d.mode.toLowerCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. WEIGHT VARIANCE AUDIT */}
        <TabsContent value="variances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Weight Variance Audit (Threshold: {weightTolerancePercent}%)
                </CardTitle>
                <CardDescription>
                  List of hand-offs where metal variance exceeded the configured tolerance threshold
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(
                    "bms_weight_variance_audit",
                    variances.map((v) => ({
                      "Piece No": v.pieceNo,
                      "Order No": v.orderNo,
                      "Stage": v.stageName,
                      "Party": v.partyName,
                      "Type": v.partyType,
                      "Date": v.recordedAt,
                      "Initial Wt (g)": (v.initialWeightMg / 1000).toFixed(3),
                      "Final Wt (g)": (v.finalWeightMg / 1000).toFixed(3),
                      "Diff (g)": (v.varianceMg / 1000).toFixed(3),
                      "Variance %": v.variancePercent,
                      "Tolerance %": v.tolerancePercent,
                    })),
                    [
                      "Piece No",
                      "Order No",
                      "Stage",
                      "Party",
                      "Type",
                      "Date",
                      "Initial Wt (g)",
                      "Final Wt (g)",
                      "Diff (g)",
                      "Variance %",
                      "Tolerance %",
                    ]
                  )
                }
              >
                <Download className="w-4 h-4 mr-2 text-slate-600" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-50/50 uppercase text-amber-900 border-y font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Piece</th>
                      <th className="px-4 py-2.5">Order</th>
                      <th className="px-4 py-2.5">Stage / Process</th>
                      <th className="px-4 py-2.5">Party</th>
                      <th className="px-4 py-2.5 text-right">Initial Wt</th>
                      <th className="px-4 py-2.5 text-right">Recorded Wt</th>
                      <th className="px-4 py-2.5 text-right">Difference</th>
                      <th className="px-4 py-2.5 text-right">Variance %</th>
                      <th className="px-4 py-2.5 text-center">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variances.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No weight hand-offs exceeded the tolerance limit of {weightTolerancePercent}%.
                        </td>
                      </tr>
                    ) : (
                      variances.map((v, i) => (
                        <tr key={i} className="hover:bg-amber-50/30">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{v.pieceNo}</td>
                          <td className="px-4 py-2.5 text-slate-600">{v.orderNo}</td>
                          <td className="px-4 py-2.5 font-medium">{v.stageName}</td>
                          <td className="px-4 py-2.5 text-slate-700">{v.partyName}</td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {formatWeight(v.initialWeightMg)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {formatWeight(v.finalWeightMg)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600 font-bold">
                            {formatWeight(v.varianceMg)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">
                            {v.variancePercent}%
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge className="bg-red-600 text-white text-[10px]">
                              &gt; {v.tolerancePercent}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
