import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Delivery } from "@/models/Delivery";
import { ActivityLog } from "@/models/ActivityLog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { Timeline, TimelineEvent } from "@/components/timeline/Timeline";
import { formatISTDate, formatISTDateTime } from "@/lib/utils";
import { formatWeight, computeWeightDiff } from "@/lib/weight";
import {
  ArrowLeft,
  FileText,
  Share2,
  Calendar,
  CheckCircle2,
  Truck,
  User,
  Package,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeliveryDetailPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const [delivery, logsRaw] = await Promise.all([
    Delivery.findById(id)
      .populate("customerId")
      .populate("orderId")
      .populate("items.orderItemId")
      .lean(),
    ActivityLog.find({ entityType: "DELIVERY", entityId: id })
      .populate("userId", "name role")
      .sort({ at: -1 })
      .lean(),
  ]);

  if (!delivery || delivery.isDeleted) {
    notFound();
  }

  const customer: any = delivery.customerId || {};
  const order: any = delivery.orderId || {};

  let totalDeliveredWeightMg = 0;
  delivery.items?.forEach((it: any) => {
    totalDeliveredWeightMg += it.finalWeightMg || 0;
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
    `Namaste ${customer.name || "Customer"}, thank you for choosing BMS! Here is your Delivery Note for Order ${order.orderNo || ""}. View Document: ${process.env.NEXT_PUBLIC_APP_URL || ""}/api/pdf/delivery/${delivery._id}`
  );
  const waUrl = customer.phone
    ? `https://wa.me/91${customer.phone.replace(/\D/g, "")}?text=${shareText}`
    : `https://wa.me/?text=${shareText}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back navigation */}
      <div>
        <Link
          href="/deliveries"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Deliveries
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {delivery.deliveryNo}
            </h1>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              DELIVERED
            </Badge>
            <Badge variant="outline" className="capitalize text-slate-600">
              {delivery.mode.toLowerCase().replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Handed over on {formatISTDate(delivery.deliveryDate)} • Ref Order:{" "}
            <Link
              href={`/orders/${order._id}`}
              className="font-semibold text-amber-800 hover:underline"
            >
              {order.orderNo || "Unknown"}
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href={`/api/pdf/delivery/${delivery._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <FileText className="w-4 h-4 mr-2 text-slate-600" />
              Download Delivery Note PDF
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

      {/* Highlights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Customer</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Link
              href={`/customers/${customer._id}`}
              className="text-lg font-bold text-slate-900 hover:text-amber-800 hover:underline block"
            >
              {customer.name || "Unknown"}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5">{customer.phone || "No phone"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Delivered Pieces</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {delivery.items?.length || 0} Pieces
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Handover to {delivery.receivedBy || "Customer"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <p className="text-xs font-medium text-slate-500">Total Delivered Weight</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {formatWeight(totalDeliveredWeightMg)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Verified at handover</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Left Pieces & Photos, Right Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivered Pieces Table */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Pieces Handed Over</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50 border-b text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Piece No</th>
                      <th className="px-4 py-3">Category & Details</th>
                      <th className="px-4 py-3 text-right">Est. Weight</th>
                      <th className="px-4 py-3 text-right">Final Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delivery.items?.map((item: any, idx: number) => {
                      const piece = item.orderItemId || {};
                      const diff = computeWeightDiff(
                        piece.estimatedWeightMg || 0,
                        item.finalWeightMg || 0
                      );

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <Link
                              href={`/pieces/${piece._id}`}
                              className="font-medium text-amber-800 hover:underline"
                            >
                              {piece.pieceNo || "Unknown"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="font-medium capitalize text-slate-900 block">
                              {piece.category || "Jewellery"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {piece.description || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {formatWeight(piece.estimatedWeightMg || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {formatWeight(item.finalWeightMg)}
                            <div className="text-[10px] font-normal text-slate-400">
                              {diff.diffMg >= 0 ? "+" : ""}
                              {formatWeight(diff.diffMg)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Handover Photos */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">
                Handover & Piece Photos ({delivery.photos?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {delivery.photos && delivery.photos.length > 0 ? (
                <PhotoGallery photos={delivery.photos} />
              ) : (
                <p className="text-xs text-slate-400 italic">No handover photos uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Receiver Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Received By</span>
                <span className="font-semibold text-slate-900">{delivery.receivedBy}</span>
              </div>
              {delivery.receiverPhone && (
                <div>
                  <span className="text-xs text-slate-500 block">Phone</span>
                  <span className="font-medium text-slate-800">{delivery.receiverPhone}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500 block">Handover Mode</span>
                <span className="font-medium text-slate-800 capitalize">
                  {delivery.mode.toLowerCase().replace(/_/g, " ")}
                </span>
              </div>
              <div className="pt-2 border-t">
                <span className="text-xs text-slate-500 block">Delivery Date</span>
                <span className="font-medium text-slate-800">
                  {formatISTDate(delivery.deliveryDate)}
                </span>
              </div>

              {delivery.remarks && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-slate-500 block">Handover Remarks</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border text-xs leading-relaxed">
                    {delivery.remarks}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Delivery Log</CardTitle>
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
