import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Artisan } from "@/models/Artisan";
import { OrderItem } from "@/models/OrderItem";
import { Assignment } from "@/models/Assignment";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge/StatusBadge";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import {
  Hammer,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Gem,
  Scale,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";


export default async function ArtisanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const now = new Date();

  const artisan = await Artisan.findById(id).lean();
  if (!artisan || artisan.isDeleted) {
    notFound();
  }

  const [activePieces, assignments, submissions] = await Promise.all([
    OrderItem.find({
      currentArtisanId: artisan._id,
      currentLocation: "WITH_KARIGAR",
      isDeleted: false,
    })
      .populate("orderId")
      .populate("currentStageId")
      .sort({ dueDate: 1 })
      .lean(),
    Assignment.find({ artisanId: artisan._id, isDeleted: false })
      .sort({ issueDate: -1 })
      .lean(),
    ProgressUpdate.find({ artisanId: artisan._id, isDeleted: false })
      .populate("orderItemId")
      .populate("stageId")
      .sort({ submittedAt: -1 })
      .lean(),
  ]);

  const overduePieces = activePieces.filter(
    (p) => p.dueDate && new Date(p.dueDate) < now
  );

  const approvedSubmissions = submissions.filter(
    (s) => s.verificationStatus === "APPROVED"
  );
  const pendingSubmissions = submissions.filter(
    (s) => s.verificationStatus === "PENDING"
  );

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/artisans">
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {artisan.name}
              </h1>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded">
                {artisan.code}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  artisan.isActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {artisan.isActive ? "Active Artisan" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Speciality: {artisan.speciality.join(", ")}
            </p>
          </div>
        </div>

        <Link href={`/assignments?artisanId=${artisan._id.toString()}`}>
          <button className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer">
            + Issue New Work Order
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Pieces in Hand</span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            {activePieces.length}
          </p>
          <span className="text-[10px] text-neutral-400">Current active workload</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Overdue Items</span>
          <p className="text-xl font-bold text-red-600">
            {overduePieces.length}
          </p>
          <span className="text-[10px] text-neutral-400">Passed committed due date</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Pending Reviews</span>
          <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {pendingSubmissions.length}
          </p>
          <span className="text-[10px] text-neutral-400">Awaiting supervisor QC</span>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] text-neutral-400">Approved Submissions</span>
          <p className="text-xl font-bold text-emerald-600">
            {approvedSubmissions.length}
          </p>
          <span className="text-[10px] text-neutral-400">Completed jobs</span>
        </div>
      </div>

      {/* Profile Details & Bench Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Artisan Profile & Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <Phone className="h-3.5 w-3.5 text-neutral-400" />
              <span className="font-mono">{artisan.phone}</span>
              <span className="text-[11px] text-neutral-400">(Used for Karigar PIN login)</span>
            </div>

            {artisan.address && (
              <div className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                <MapPin className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
                <span>{artisan.address}</span>
              </div>
            )}

            {artisan.notes && (
              <p className="text-xs text-neutral-500 italic pt-1">
                Note: {artisan.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Artisan & Identity Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artisan.photo || (artisan.idProof && artisan.idProof.length > 0) ? (
              <PhotoGallery
                photos={[
                  ...(artisan.photo ? [artisan.photo] : []),
                  ...(artisan.idProof || []),
                ]}
              />
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No artisan photos attached
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Pieces in Hand */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Gem className="h-4 w-4 text-amber-600" />
          Active Pieces Currently with {artisan.name} ({activePieces.length})
        </h3>

        {activePieces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePieces.map((piece: any) => (
              <div
                key={piece._id.toString()}
                className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    {piece.pieceNo}
                  </span>
                  <StatusBadge systemCategory={piece.systemStatus} />
                </div>

                <div>
                  <Link
                    href={`/pieces/${piece._id.toString()}`}
                    className="font-bold text-xs text-neutral-900 dark:text-neutral-100 hover:underline"
                  >
                    {piece.category} — {piece.description}
                  </Link>
                  <p className="text-[11px] text-neutral-500">
                    Stage: <strong>{piece.currentStageId?.name || "Stage"}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="font-mono">{formatWeight(piece.estimatedWeightMg)}</span>
                  <span
                    className={
                      piece.dueDate && new Date(piece.dueDate) < now
                        ? "text-red-600 font-bold"
                        : ""
                    }
                  >
                    Due: {formatISTDate(piece.dueDate)}
                  </span>
                </div>

                <div className="flex justify-end pt-1">
                  <Link href={`/pieces/${piece._id.toString()}`}>
                    <button className="px-2.5 py-1 text-xs rounded-md border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer">
                      View Details →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 bg-white p-6 rounded-xl border text-center dark:bg-neutral-900 dark:border-neutral-800">
            No pieces currently assigned to this artisan.
          </p>
        )}
      </div>

      {/* Work Order (Assignments) History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          Issued Work Orders History ({assignments.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assignments.map((asgn: any) => (
            <div
              key={asgn._id.toString()}
              className="p-3.5 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {asgn.workOrderNo}
                </span>
                <span className="text-neutral-400 font-mono">
                  {formatISTDate(asgn.issueDate)}
                </span>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300">
                {asgn.items.length} pieces assigned • Due: {formatISTDate(asgn.dueDate)}
              </p>
              <div className="pt-1 flex items-center gap-3">
                <a
                  href={`/api/pdf/work-order/${asgn._id.toString()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-600 font-semibold hover:underline"
                >
                  Download PDF →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
