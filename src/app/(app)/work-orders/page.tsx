"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Download, FileText, LayoutGrid, Plus, Rows3, Share2, Workflow } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { artisanOf, coverPhoto, pieceOf, stageOf, workCategory } from "@/lib/queries";
import { cn, date, daysLeft, g } from "@/lib/format";
import { workRegister } from "@/lib/registers";
import { RegisterExport, RegisterTable } from "@/components/register";
import { downloadPdf, sharePdf } from "@/lib/pdf-client";
import { Avatar, Button, Empty, PageHeader, Panel, Segmented } from "@/components/ui";
import { DueChip, WeightDelta, WorkStatusPill } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { IssueWorkDialog, ReviewDialog, StatusDialog } from "@/components/actions";

type T = "all" | "pending" | "review" | "late" | "done";

export default function WorkOrdersPage() {
  const db = useDB();
  const canAssign = useCan("artisans.assign");
  const canReview = useCan("artisans.review");
  const [t, setT] = useState<T>("all");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [dlg, setDlg] = useState<null | "new" | { review: string } | { status: string }>(null);
  const test = useMemo(
    () => ({
      // pending = everything not yet approved (with the karigar, on hold, rework, or awaiting review)
      pending: (c: string) => c !== "DONE",
      review: (c: string) => c === "SUBMITTED",
      late: (c: string, due: string) => !["DONE", "SUBMITTED"].includes(c) && daysLeft(due) < 0,
      done: (c: string) => c === "DONE",
      all: () => true,
    }),
    [],
  );
  const n = (k: T) => db.workOrders.filter((w) => test[k](workCategory(db, w.statusId), w.dueDate)).length;
  const rows = db.workOrders.filter((w) => test[t](workCategory(db, w.statusId), w.dueDate));
  const label = { all: "All", pending: "Pending", review: "To review", late: "Overdue", done: "Completed" }[t];
  const spec = workRegister(db, rows, {
    title: "Work Order Register",
    fileName: `Work-orders-${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`,
    subtitle: `${label} work orders · all karigars`,
    showKarigar: true,
  });
  const d = typeof dlg === "object" && dlg ? dlg : null;
  return (
    <div>
      <PageHeader
        kicker="Karigar allocation"
        title="Work orders"
        sub="Every piece issued to a karigar — with issued metal, due date, custom status, submitted weight and photos. Each one prints as a PDF."
        actions={
          canAssign && (
            <Button variant="gold" icon={<Plus className="size-4" />} onClick={() => setDlg("new")}>
              Issue work order
            </Button>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          value={t}
          onChange={setT}
          options={[
            { value: "all", label: "All orders", count: n("all") },
            { value: "pending", label: "Pending", count: n("pending") },
            { value: "review", label: "To review", count: n("review") },
            { value: "late", label: "Overdue", count: n("late") },
            { value: "done", label: "Completed", count: n("done") },
          ]}
        />
        <div className="flex items-center gap-2 lg:ml-auto">
          <RegisterExport spec={spec} />
          <div className="flex rounded-full border border-line bg-panel p-1">
            <button
              onClick={() => setView("cards")}
              aria-label="Card view"
              className={cn("grid size-8 place-items-center rounded-full", view === "cards" ? "bg-gold/20 text-gold" : "text-faint")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={cn("grid size-8 place-items-center rounded-full", view === "list" ? "bg-gold/20 text-gold" : "text-faint")}
            >
              <Rows3 className="size-4" />
            </button>
          </div>
        </div>
      </div>
      {view === "list" ? (
        <Panel className="p-4">
          <RegisterTable spec={spec} empty="Nothing here" />
        </Panel>
      ) : !rows.length ? (
        <Panel>
          <Empty icon={<FileText className="size-7" />} title="Nothing here" />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((w) => {
            const p = pieceOf(db, w.pieceId)!;
            const a = artisanOf(db, w.artisanId)!;
            const cat = workCategory(db, w.statusId);
            return (
              <Panel key={w.id} className="p-3">
                <div className="flex gap-3">
                  <Thumb photo={coverPhoto(p)} photos={p.photos} className="size-16 sm:size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[11px] font-bold tracking-wider text-gold">{w.number}</span>
                      <WorkStatusPill wo={w} />
                    </div>
                    <Link href={`/pieces/${p.id}`} className="block truncate font-semibold hover:text-gold">
                      {p.name} <span className="text-faint">· {p.code}</span>
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Avatar name={a.name} hue={a.hue} size={18} /> {a.name} · {stageOf(db, w.stageId)?.name}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>Issued {date(w.issuedAt)}</span>
                      {w.submittedAt && <span>Submitted {date(w.submittedAt)}</span>}
                      <span className="tabular">
                        {g(w.issuedWeightMg)} → {g(w.submittedWeightMg)}
                      </span>
                      <WeightDelta base={w.issuedWeightMg} value={w.submittedWeightMg} />
                      {cat !== "DONE" && cat !== "SUBMITTED" && <DueChip iso={w.dueDate} />}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-line pt-2">
                  {cat === "SUBMITTED" && canReview && (
                    <Button size="sm" variant="gold" icon={<BadgeCheck className="size-3.5" />} onClick={() => setDlg({ review: w.id })}>
                      Review
                    </Button>
                  )}
                  {cat !== "DONE" && (
                    <Button size="sm" variant="ghost" icon={<Workflow className="size-3.5" />} onClick={() => setDlg({ status: w.id })}>
                      Status
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("work-order", w.id)}>
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Share2 className="size-3.5" />}
                    onClick={() => sharePdf("work-order", w.id, a.phone, `Work order ${w.number} — ${p.name}`)}
                  >
                    WhatsApp
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <IssueWorkDialog open={dlg === "new"} onClose={() => setDlg(null)} />
      {d && "review" in d && <ReviewDialog open onClose={() => setDlg(null)} woId={d.review} />}
      {d && "status" in d && <StatusDialog open onClose={() => setDlg(null)} kind="work" id={d.status} />}
    </div>
  );
}
