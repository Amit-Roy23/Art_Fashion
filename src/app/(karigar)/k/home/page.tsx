import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { OrderItem } from "@/models/OrderItem";
import { Artisan } from "@/models/Artisan";
import { ProgressUpdate } from "@/models/ProgressUpdate";
import { formatISTDate } from "@/lib/utils";
import { formatWeight } from "@/lib/weight";
import { Gem, Calendar, AlertTriangle, ArrowRight, CheckCircle2, Clock } from "lucide-react";


export default async function KarigarHomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  await connectDB();
  const now = new Date();
  const artisanId = (session.user as any).artisanId;

  let artisan = null;
  if (artisanId) {
    artisan = await Artisan.findById(artisanId).lean();
  } else {
    // If logged in as owner testing the portal, grab first artisan
    artisan = await Artisan.findOne().lean();
  }

  if (!artisan) {
    return (
      <div className="p-6 text-center text-xs text-neutral-500 bg-white rounded-xl shadow-xs">
        No artisan profile linked to this account.
      </div>
    );
  }

  // Find pieces assigned to this artisan
  const assignedPieces = await OrderItem.find({
    currentArtisanId: artisan._id,
    currentLocation: "WITH_KARIGAR",
    isDeleted: false,
  })
    .populate("currentStageId")
    .sort({ dueDate: 1 })
    .lean();

  // Find recent submissions
  const recentSubmissions = await ProgressUpdate.find({
    artisanId: artisan._id,
    isDeleted: false,
  })
    .populate("orderItemId")
    .populate("stageId")
    .sort({ submittedAt: -1 })
    .limit(5)
    .lean();

  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white shadow-md space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-amber-100 font-semibold">
          Artisan Workstation
        </p>
        <h1 className="text-xl font-bold">{artisan.name}</h1>
        <p className="text-xs text-amber-100">
          {assignedPieces.length} active piece(s) assigned to your bench
        </p>
      </div>

      {/* Active Work List */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
          Assigned Pieces — My Work ({assignedPieces.length})
        </h2>

        {assignedPieces.length > 0 ? (
          assignedPieces.map((piece: any) => {
            const isOverdue = piece.dueDate && new Date(piece.dueDate) < now;
            return (
              <Link
                key={piece._id.toString()}
                href={`/k/work/${piece._id.toString()}`}
                className="block p-4 rounded-xl border border-neutral-200/90 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-xs hover:border-amber-400 active:scale-[0.99] transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    {piece.pieceNo}
                  </span>
                  {isOverdue && (
                    <span className="flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold dark:bg-red-950 dark:text-red-300">
                      <AlertTriangle className="h-3 w-3" /> Overdue
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  {piece.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={piece.photos[0].url}
                      alt={piece.category}
                      className="h-16 w-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                      <Gem className="h-6 w-6" />
                    </div>
                  )}

                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {piece.category}
                    </p>
                    <p className="text-[11px] text-neutral-500 line-clamp-2">
                      {piece.description}
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      Target Stage: {piece.currentStageId?.name || "Manufacturing"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="font-mono font-semibold">
                    Est: {formatWeight(piece.estimatedWeightMg)}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3 text-neutral-400" />
                    Due: {formatISTDate(piece.dueDate)}
                  </span>
                </div>

                <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 font-semibold text-xs">
                  <span>Submit Progress & Photos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
            <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
              No Work in Hand
            </p>
            <p>You have submitted all assigned pieces. Check back soon for new work orders.</p>
          </div>
        )}
      </div>

      {/* Recent Submissions Status Tracker */}
      {recentSubmissions.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
            My Submissions & Supervisor Review
          </h2>

          <div className="space-y-2">
            {recentSubmissions.map((sub: any) => (
              <div
                key={sub._id.toString()}
                className="p-3 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {sub.orderItemId?.pieceNo || "Piece"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.verificationStatus === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : sub.verificationStatus === "REJECTED"
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {sub.verificationStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Weight: {formatWeight(sub.submittedWeightMg)}</span>
                  <span>{formatISTDate(sub.submittedAt)}</span>
                </div>

                {sub.verificationRemarks && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded italic">
                    Supervisor Note: &ldquo;{sub.verificationRemarks}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
