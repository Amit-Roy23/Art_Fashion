"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Phone, RefreshCcw, Send, Sparkles, Workflow } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { coverPhoto, jobCategory, pieceOf, vendorOf } from "@/lib/queries";
import { date, daysLeft, g, inr } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf-client";
import { Button, Empty, KeyVal, PageHeader, Panel, Segmented } from "@/components/ui";
import { DueChip, JobStatusPill, WeightDelta } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { ReceiveJobDialog, SendJobDialog, StatusDialog } from "@/components/actions";

type T = "out" | "late" | "back" | "all";

export default function JobWorkPage() {
  const db = useDB();
  const can = useCan("jobwork.manage");
  const [t, setT] = useState<T>("out");
  const [dlg, setDlg] = useState<null | "send" | { receive: string } | { status: string }>(null);
  const is = (k: T, j: (typeof db.jobWorks)[number]) =>
    k === "all"
      ? true
      : k === "out"
        ? !j.returnedAt
        : k === "back"
          ? !!j.returnedAt
          : !j.returnedAt && (daysLeft(j.expectedDate) < 0 || jobCategory(db, j.statusId) === "HOLD");
  const rows = db.jobWorks.filter((j) => is(t, j));
  const d = typeof dlg === "object" && dlg ? dlg : null;
  return (
    <div>
      <PageHeader
        kicker="Outside processes"
        title="Job work & finishing"
        sub="Pieces sent out for polishing, plating, meenakari or hallmarking — with dispatch dates, challans, weights in/out and photos."
        actions={
          can && (
            <Button variant="gold" icon={<Send className="size-4" />} onClick={() => setDlg("send")}>
              Send for job work
            </Button>
          )
        }
      />
      <div className="no-scrollbar mb-5 flex gap-3 overflow-x-auto pb-1">
        {db.settings.vendors.map((v) => {
          const out = db.jobWorks.filter((j) => j.vendorId === v.id && !j.returnedAt);
          return (
            <Panel key={v.id} className="w-60 shrink-0 p-4">
              <div className="truncate font-semibold">{v.name}</div>
              <div className="truncate text-xs text-muted">{v.processes.join(", ")}</div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <span className="font-display tabular text-3xl font-semibold">{out.length}</span>{" "}
                  <span className="text-xs text-muted">out · {g(out.reduce((s, j) => s + j.sentWeightMg, 0))}</span>
                </div>
                <a href={`tel:${v.phone}`} className="text-faint hover:text-gold">
                  <Phone className="size-4" />
                </a>
              </div>
            </Panel>
          );
        })}
      </div>
      <Segmented
        className="mb-5"
        value={t}
        onChange={setT}
        options={[
          { value: "out", label: "Currently out", count: db.jobWorks.filter((j) => is("out", j)).length },
          { value: "late", label: "Delayed / overdue", count: db.jobWorks.filter((j) => is("late", j)).length },
          { value: "back", label: "Returned", count: db.jobWorks.filter((j) => is("back", j)).length },
          { value: "all", label: "All", count: db.jobWorks.length },
        ]}
      />
      {!rows.length ? (
        <Panel>
          <Empty icon={<Sparkles className="size-7" />} title="Nothing here" />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((j) => {
            const p = pieceOf(db, j.pieceId)!;
            const v = vendorOf(db, j.vendorId);
            return (
              <Panel key={j.id} className="p-3">
                <div className="flex gap-3">
                  <Thumb photo={coverPhoto(p)} photos={[...j.photos]} className="size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-gold">
                        {j.number} · {j.process}
                      </span>
                      <JobStatusPill jw={j} />
                    </div>
                    <Link href={`/pieces/${p.id}`} className="block truncate font-semibold hover:text-gold">
                      {p.name} <span className="text-faint">· {p.code}</span>
                    </Link>
                    <div className="truncate text-xs text-muted">{v?.name}</div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <KeyVal k="Sent" v={date(j.dispatchDate)} />
                      <KeyVal k="Sent wt" v={<span className="tabular">{g(j.sentWeightMg)}</span>} />
                      <KeyVal k={j.returnedAt ? "Returned" : "Expected"} v={j.returnedAt ? date(j.returnedAt) : <DueChip iso={j.expectedDate} />} />
                      <KeyVal
                        k={j.returnedAt ? "Diff" : "Charges"}
                        v={j.returnedAt ? <WeightDelta base={j.sentWeightMg} value={j.returnedWeightMg} /> : inr(j.charges)}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-line pt-2">
                  {!j.returnedAt && can && (
                    <Button size="sm" variant="gold" icon={<RefreshCcw className="size-3.5" />} onClick={() => setDlg({ receive: j.id })}>
                      Receive back
                    </Button>
                  )}
                  {!j.returnedAt && can && (
                    <Button size="sm" variant="ghost" icon={<Workflow className="size-3.5" />} onClick={() => setDlg({ status: j.id })}>
                      Status
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("job-challan", j.id)}>
                    Challan
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <SendJobDialog open={dlg === "send"} onClose={() => setDlg(null)} />
      {d && "receive" in d && <ReceiveJobDialog open onClose={() => setDlg(null)} jwId={d.receive} />}
      {d && "status" in d && <StatusDialog open onClose={() => setDlg(null)} kind="job" id={d.status} />}
    </div>
  );
}
