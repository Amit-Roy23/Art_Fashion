import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Delivery } from "@/models/Delivery";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Gem,
  Truck,
  ArrowLeft,
  Calendar,
} from "lucide-react";


export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();

  const customer = await Customer.findById(id).lean();
  if (!customer || customer.isDeleted) {
    notFound();
  }

  const [orders, pieces, deliveries] = await Promise.all([
    Order.find({ customerId: customer._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean(),
    OrderItem.find({ customerId: customer._id, isDeleted: false })
      .populate("currentStageId")
      .sort({ createdAt: -1 })
      .lean(),
    Delivery.find({ customerId: customer._id, isDeleted: false })
      .sort({ deliveryDate: -1 })
      .lean(),
  ]);

  // Turnaround days calculation for delivered pieces
  const deliveredPieces = pieces.filter((p) => p.currentLocation === "DELIVERED");
  const turnaroundDaysArray = deliveredPieces.map((p) => {
    const start = new Date(p.createdAt).getTime();
    const end = new Date(p.updatedAt).getTime();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  });

  const avgTurnaroundDays =
    turnaroundDaysArray.length > 0
      ? (
          turnaroundDaysArray.reduce((a, b) => a + b, 0) /
          turnaroundDaysArray.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {customer.name}
              </h1>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded">
                {customer.code}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Customer Profile, Orders & Delivery History
            </p>
          </div>
        </div>

        <Link href={`/orders/new?customerId=${customer._id.toString()}`}>
          <button className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer">
            + Create Order for {customer.name.split(" ")[0]}
          </button>
        </Link>
      </div>

      {/* Customer Contact & Lifecycle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info Card */}
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Contact & Tax Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <Phone className="h-3.5 w-3.5 text-neutral-400" />
              <span className="font-mono">{customer.phone}</span>
              {customer.altPhone && (
                <span className="text-neutral-400 font-mono">/ {customer.altPhone}</span>
              )}
            </div>

            {customer.email && (
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                <Mail className="h-3.5 w-3.5 text-neutral-400" />
                <span>{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                <MapPin className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
                <span>
                  {customer.address}
                  {customer.city ? `, ${customer.city}` : ""}
                </span>
              </div>
            )}

            {customer.gstin && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-[11px] text-neutral-400">GSTIN:</span>{" "}
                <span className="font-mono font-semibold uppercase">{customer.gstin}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turnaround & Performance Summary */}
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Turnaround & Lifecycle Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <p className="text-[10px] text-neutral-400">Total Orders</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {orders.length}
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <p className="text-[10px] text-neutral-400">Total Pieces</p>
                <p className="text-lg font-bold text-amber-600">
                  {pieces.length}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50/50 p-2.5 dark:bg-amber-950/20 text-center border border-amber-100 dark:border-amber-900/30">
              <p className="text-[11px] text-neutral-500">Avg Manufacturing Turnaround</p>
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                {avgTurnaroundDays ? `${avgTurnaroundDays} days` : "— In Progress"}
              </p>
              <p className="text-[10px] text-neutral-400">
                Order Received → Final Customer Delivery
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Photos / Identity Proof */}
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Client References / ID Proofs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.photos && customer.photos.length > 0 ? (
              <PhotoGallery photos={customer.photos} />
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No identity or reference photos attached
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders List for this Customer */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-amber-600" />
          Customer Orders ({orders.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((ord: any) => (
            <Link
              key={ord._id.toString()}
              href={`/orders/${ord._id.toString()}`}
              className="p-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs hover:border-amber-400 transition-all space-y-2 block"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                  {ord.orderNo}
                </span>
                <StatusBadge systemCategory={ord.systemStatus} />
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {ord.type === "PROJECT" ? ord.projectName : "Individual Piece Order"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {ord.itemCount} piece(s) • Est: {formatWeight(ord.totalEstimatedWeightMg)}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <span>Ordered: {formatISTDate(ord.orderDate)}</span>
                <span>Due: {formatISTDate(ord.expectedDeliveryDate)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Deliveries History */}
      {deliveries.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            Handover & Delivery Receipts ({deliveries.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deliveries.map((del: any) => (
              <div
                key={del._id.toString()}
                className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {del.deliveryNo}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatISTDate(del.deliveryDate)}
                  </span>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300">
                  Received by: <strong>{del.receivedBy}</strong> ({del.mode})
                </p>
                <p className="text-[11px] text-neutral-500 italic">
                  &ldquo;{del.remarks}&rdquo;
                </p>
                <div className="pt-1">
                  <a
                    href={`/api/pdf/delivery/${del._id.toString()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-semibold"
                  >
                    Download Delivery Note PDF →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
