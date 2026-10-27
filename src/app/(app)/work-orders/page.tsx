"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Download, FileText, Plus, Share2, Workflow } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { artisanOf, coverPhoto, pieceOf, stageOf, workCategory } from "@/lib/queries";
import { date, daysLeft, g } from "@/lib/format";
import { downloadPdf, sharePdf } from "@/lib/pdf-client";
import { Avatar, Button, Empty, PageHeader, Panel, Segmented } from "@/components/ui";
import { DueChip, WeightDelta, WorkStatusPill } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { IssueWorkDialog, ReviewDialog, StatusDialog } from "@/components/actions";

type T = "active" | "review" | "late" | "done" | "all";

export default function WorkOrdersPage() {
  const db = useDB();
  const canAssign = useCan("artisans.assign");
  const canReview = useCan("artisans.review");
  const [t, setT] = useState<T>("active");
  const [dlg, setDlg] = useState<null | "new" | { review: string } | { status: string }>(null);
  const test = useMemo(
    () => ({
      active: (c: string) => !["DONE", "SUBMITTED"].includes(c),
      review: (c: string) => c === "SUBMITTED",
      late: (c: string, due: string) => !["DONE", "SUBMITTED"].includes(c) && daysLeft(due) < 0,
      done: (c: string) => c === "DONE",
      all: () => true,
    }),
    [],
  );
  const n = (k: T) => db.workOrders.filter((w) => test[k](workCategory(db, w.statusId), w.dueDate)).length;
  const rows = db.workOrders.filter((w) => test[t](workCategory(db, w.statusId), w.dueDate));
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
      <Segmented
        className="mb-5"
        value={t}
        onChange={setT}
        options={[
          { value: "active", label: "In progress", count: n("active") },
          { value: "review", label: "To review", count: n("review") },
          { value: "late", label: "Overdue", count: n("late") },
          { value: "done", label: "Approved", count: n("done") },
          { value: "all", label: "All", count: n("all") },
        ]}
      />
      {!rows.length ? (
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
                  <Thumb photo={coverPhoto(p)} photos={p.photos} className="size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
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
