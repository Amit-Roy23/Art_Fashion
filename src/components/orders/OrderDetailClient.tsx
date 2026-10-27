"use client";

import * as React from "react";
import Link from "next/link";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RemarksField } from "@/components/forms/RemarksField";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { Timeline, TimelineEvent } from "@/components/timeline/Timeline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { updateOrderStatus } from "@/actions/order";
import { toast } from "sonner";
import {
  ShoppingBag,
  ArrowLeft,
  Calendar,
  Gem,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Flame,
  Truck,
  Edit,
} from "lucide-react";

interface OrderDetailClientProps {
  order: any;
  pieces: any[];
  statuses: any[];
  timelineEvents: TimelineEvent[];
}

export function OrderDetailClient({
  order,
  pieces = [],
  statuses = [],
  timelineEvents = [],
}: OrderDetailClientProps) {
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [selectedStatusId, setSelectedStatusId] = React.useState(
    order.statusId?._id?.toString() || ""
  );
  const [statusRemarks, setStatusRemarks] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleUpdateStatus = async () => {
    if (!selectedStatusId) {
      toast.error("Please select a status");
      return;
    }
    if (statusRemarks.trim().length < 3) {
      toast.error("Remarks are mandatory (min 3 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateOrderStatus({
        orderId: order._id.toString(),
        statusId: selectedStatusId,
        remarks: statusRemarks,
        photos: [],
      });

      if (res.ok) {
        toast.success("Order status updated successfully");
        setIsStatusModalOpen(false);
        setStatusRemarks("");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryProgressPercent =
    order.itemCount > 0 ? (order.deliveredCount / order.itemCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {order.orderNo}
              </h1>
              <span className="font-semibold text-xs rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5">
                {order.type}
              </span>
              <StatusBadge
                statusName={order.statusId?.name}
                systemCategory={order.systemStatus}
                customColour={order.statusId?.colour}
              />
              {order.priority === "URGENT" && (
                <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              {order.type === "PROJECT" ? order.projectName : "Single Piece Order"} • Customer:{" "}
              <Link
                href={`/customers/${order.customerId?._id?.toString()}`}
                className="text-amber-600 font-semibold hover:underline"
              >
                {order.customerId?.name}
              </Link>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="text-xs h-8"
          >
            <Edit className="h-3 w-3 mr-1" /> Change Status
          </Button>

          <Link href={`/assignments?orderId=${order._id.toString()}`}>
            <Button variant="outline" size="sm" className="text-xs h-8">
              <ClipboardList className="h-3 w-3 mr-1 text-amber-600" />
              Assign Karigar
            </Button>
          </Link>

          <Link href={`/job-work?orderId=${order._id.toString()}`}>
            <Button variant="outline" size="sm" className="text-xs h-8">
              <Flame className="h-3 w-3 mr-1 text-purple-600" />
              Job Work
            </Button>
          </Link>

          {order.deliveredCount < order.itemCount && (
            <Link href={`/deliveries?orderId=${order._id.toString()}`}>
              <Button variant="gold" size="sm" className="text-xs h-8">
                <Truck className="h-3 w-3 mr-1" />
                Handover / Deliver
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Total Pieces</span>
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {order.itemCount} piece(s)
          </p>
          <span className="text-[10px] text-neutral-400">
            {order.deliveredCount} Delivered
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Total Est. Weight</span>
          <p className="text-lg font-bold font-mono text-amber-600">
            {formatWeight(order.totalEstimatedWeightMg)}
          </p>
          <span className="text-[10px] text-neutral-400">Combined gross</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Ordered On</span>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {formatISTDate(order.orderDate)}
          </p>
          <span className="text-[10px] text-neutral-400">Production intake</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Delivery Deadline</span>
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            {formatISTDate(order.expectedDeliveryDate)}
          </p>
          <span className="text-[10px] text-neutral-400">Committed date</span>
        </div>
      </div>

      {/* Delivery Progress Bar */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            Delivery Fulfillment Progress
          </span>
          <span className="font-bold text-amber-700 dark:text-amber-400">
            {order.deliveredCount} of {order.itemCount} pieces delivered ({deliveryProgressPercent.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden dark:bg-neutral-800">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${deliveryProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Pieces Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-600" />
            Pieces in this Order ({pieces.length})
          </h2>
          <span className="text-xs text-neutral-400">
            Click on any piece for weight journey & full timeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pieces.map((piece: any) => (
            <div
              key={piece._id.toString()}
              className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3 flex flex-col justify-between hover:border-amber-400 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    {piece.pieceNo}
                  </span>
                  <StatusBadge systemCategory={piece.systemStatus} />
                </div>

                {/* Photo & Description */}
                <div className="flex gap-3">
                  {piece.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={piece.photos[0].url}
                      alt={piece.description}
                      className="h-16 w-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                      <Gem className="h-6 w-6" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {piece.category}
                    </p>
                    <p className="text-[11px] text-neutral-500 line-clamp-2">
                      {piece.description}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {piece.metal} • {piece.purity}
                    </p>
                  </div>
                </div>

                {/* Location & Stage */}
                <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Location:</span>
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {piece.currentLocation.replace(/_/g, " ")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Current Stage:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      {piece.currentStageId?.name || "Stage 1"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Estimated Wt:</span>
                    <span className="font-mono font-semibold">
                      {formatWeight(piece.estimatedWeightMg)}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Piece Detail */}
              <Link href={`/pieces/${piece._id.toString()}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  View Piece Details & Timeline <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Order Remarks & Reference Photos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Order Instructions & Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 italic bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
              &ldquo;{order.remarks}&rdquo;
            </p>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Design References & Sketches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.designReferences && order.designReferences.length > 0 ? (
              <PhotoGallery photos={order.designReferences} />
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No design references attached
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Audit Timeline */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Order Activity & Movement History
        </h3>
        <Timeline events={timelineEvents} />
      </div>

      {/* Change Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Change Order Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
                className="w-full h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-xs dark:border-neutral-700"
              >
                {statuses.map((st: any) => (
                  <option key={st._id.toString()} value={st._id.toString()}>
                    {st.name} ({st.systemCategory})
                  </option>
                ))}
              </select>
            </div>

            <RemarksField
              value={statusRemarks}
              onChange={setStatusRemarks}
              label="Status Change Remarks"
              placeholder="Explain why this status is being changed (min 3 chars)..."
              required
              minChars={3}
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
