import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { JobWork } from "@/models/JobWork";
import { ActivityLog } from "@/models/ActivityLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { Timeline, TimelineEvent } from "@/components/timeline/Timeline";
import { formatISTDate, formatISTDateTime, formatCurrencyINR } from "@/lib/utils";
import { formatWeight, computeWeightDiff } from "@/lib/weight";
import {
  ArrowLeft,
  FileText,
  Share2,
  Calendar,
  Building2,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobWorkDetailPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const [jobWork, logsRaw] = await Promise.all([
    JobWork.findById(id)
      .populate("vendorId")
      .populate("items.orderItemId")
      .lean(),
    ActivityLog.find({ entityType: "JOBWORK", entityId: id })
      .populate("userId", "name role")
      .sort({ at: -1 })
      .lean(),
  ]);

  if (!jobWork || jobWork.isDeleted) {
    notFound();
  }

  const vendor: any = jobWork.vendorId || {};
  const isOverdue =
    !jobWork.returnDate &&
    jobWork.expectedReturnDate &&
    new Date(jobWork.expectedReturnDate).getTime() < Date.now();

  const totalPieces = jobWork.items?.length || 0;
  const returnedCount = jobWork.items?.filter((it: any) => it.status === "RETURNED").length || 0;
  const isFullyReturned = totalPieces > 0 && totalPieces === returnedCount;

  // Calculate total sent, returned, and total loss
  let totalSentMg = 0;
  let totalReturnedMg = 0;
  let totalLossMg = 0;

  jobWork.items?.forEach((item: any) => {
    totalSentMg += item.sentWeightMg || 0;
    if (item.status === "RETURNED") {
      totalReturnedMg += item.returnedWeightMg || 0;
      totalLossMg += item.lossMg || 0;
    }
  });

  const timelineEvents: TimelineEvent[] = logsRaw.map((log: any) => ({
    id: log._id.toString(),
    title: log.action.replace(/_/g, " "),
    timestamp: log.at,
    userName: log.userId?.name || "System",
    userRole: log.userId?.role,
    remarks: log.remarks,
    changes: log.changes,
  }));

  const shareText = encodeURIComponent(
    `Namaste ${vendor.name || "Vendor"}, here is Job Work Challan ${jobWork.challanNo} for ${jobWork.processType} (${totalPieces} pieces). View Challan: ${process.env.NEXT_PUBLIC_APP_URL || ""}/api/pdf/job-work/${jobWork._id}`
  );
  const waUrl = vendor.phone
    ? `https://wa.me/91${vendor.phone.replace(/\D/g, "")}?text=${shareText}`
    : `https://wa.me/?text=${shareText}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/job-work"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Job Work
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {jobWork.challanNo}
            </h1>
            <Badge
              variant={isFullyReturned ? "default" : isOverdue ? "destructive" : "secondary"}
              className="font-medium"
            >
              {isFullyReturned ? "COMPLETED" : isOverdue ? "OVERDUE" : "IN PROCESS"}
            </Badge>
            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">
              {jobWork.processType}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Dispatched on {formatISTDate(jobWork.dispatchDate)} • Vendor:{" "}
            <span className="font-medium text-slate-900">{vendor.name || "Unknown"}</span> (
            {vendor.phone || "No phone"})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href={`/api/pdf/job-work/${jobWork._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              Download Challan PDF
            </a>
          </Button>

          <Button
            variant="outline"
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            asChild
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <Share2 className="w-4 h-4 mr-2 text-emerald-600" />
              Share on WhatsApp
            </a>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Total Pieces</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {returnedCount} / {totalPieces}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Pieces returned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Total Sent Weight</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {formatWeight(totalSentMg)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Dispatched weight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Total Returned Weight</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {formatWeight(totalReturnedMg)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Received so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Process Loss</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-700 font-mono">
              {formatWeight(totalLossMg)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalSentMg > 0 ? ((totalLossMg / totalSentMg) * 100).toFixed(2) : "0"}% of sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details & Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Pieces Table Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Pieces in this Challan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50 border-b text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Piece</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Sent Wt</th>
                      <th className="px-4 py-3 text-right">Ret. Wt</th>
                      <th className="px-4 py-3 text-right">Loss</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobWork.items?.map((item: any, idx: number) => {
                      const piece = item.orderItemId || {};
                      const isReturned = item.status === "RETURNED";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              href={`/pieces/${piece._id}`}
                              className="font-medium text-amber-700 hover:underline"
                            >
                              {piece.pieceNo || "Unknown"}
                            </Link>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {piece.description || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium capitalize">
                            {piece.category || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            {formatWeight(item.sentWeightMg)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            {isReturned ? (
                              <span className="text-emerald-700">
                                {formatWeight(item.returnedWeightMg)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {isReturned ? (
                              <span
                                className={
                                  item.lossMg > 0
                                    ? "text-amber-700 font-semibold"
                                    : "text-slate-500"
                                }
                              >
                                {formatWeight(item.lossMg)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={isReturned ? "default" : "outline"}
                              className={
                                isReturned
                                  ? "bg-emerald-600 text-white"
                                  : "text-amber-800 border-amber-300"
                              }
                            >
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Challan & Return Photos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Dispatch Photos ({jobWork.dispatchPhotos?.length || 0})
                </p>
                {jobWork.dispatchPhotos && jobWork.dispatchPhotos.length > 0 ? (
                  <PhotoGallery photos={jobWork.dispatchPhotos} />
                ) : (
                  <p className="text-xs text-slate-400 italic">No dispatch photos attached</p>
                )}
              </div>

              {jobWork.items?.some((it: any) => it.returnPhotos?.length > 0) && (
                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Return Photos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {jobWork.items.flatMap((it: any) =>
                      (it.returnPhotos || []).map((ph: any, pIdx: number) => (
                        <div key={pIdx} className="space-y-1">
                          <img
                            src={ph.url}
                            alt="Return"
                            className="w-full h-24 object-cover rounded-lg border shadow-xs"
                          />
                          <p className="text-[10px] text-slate-500 truncate">
                            {ph.caption || "Return photo"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Info & Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Vendor & Logistics</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Vendor Name</span>
                <span className="font-semibold text-slate-900">{vendor.name || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Phone</span>
                <span className="font-medium text-slate-800">{vendor.phone || "—"}</span>
              </div>
              {vendor.address && (
                <div>
                  <span className="text-xs text-slate-500 block">Address</span>
                  <span className="text-slate-700">{vendor.address}</span>
                </div>
              )}
              <div className="pt-2 border-t grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-500 block">Dispatch Date</span>
                  <span className="font-medium text-slate-800">
                    {formatISTDate(jobWork.dispatchDate)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Expected Return</span>
                  <span
                    className={`font-medium ${
                      isOverdue ? "text-red-600 font-bold" : "text-slate-800"
                    }`}
                  >
                    {jobWork.expectedReturnDate
                      ? formatISTDate(jobWork.expectedReturnDate)
                      : "Not set"}
                  </span>
                </div>
              </div>

              {jobWork.returnDate && (
                <div>
                  <span className="text-xs text-slate-500 block">Final Return Date</span>
                  <span className="font-medium text-emerald-700">
                    {formatISTDate(jobWork.returnDate)}
                  </span>
                </div>
              )}

              {jobWork.chargesAmount ? (
                <div className="pt-2 border-t">
                  <span className="text-xs text-slate-500 block">Job Work Charges</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrencyINR(jobWork.chargesAmount)}
                  </span>
                </div>
              ) : null}

              {jobWork.remarks && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-slate-500 block">Remarks</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border text-xs leading-relaxed">
                    {jobWork.remarks}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Challan Activity Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Timeline events={timelineEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
