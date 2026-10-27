"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, Download, Send, Workflow } from "lucide-react";
import { useDB, useUser } from "@/lib/store";
import { pieceOf, stageOf, workCategory } from "@/lib/queries";
import { date, dateTime, g } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf-client";
import { Button, Empty, KeyVal, Panel, SectionTitle } from "@/components/ui";
import { DueChip, WeightDelta, WorkStatusPill } from "@/components/domain";
import { PhotoGrid, useLightbox } from "@/components/photos";
import { ProgressDialog, StatusDialog, SubmitWorkDialog } from "@/components/actions";

export default function KarigarWork() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const user = useUser()!;
  const open = useLightbox();
  const [dlg, setDlg] = useState<null | "progress" | "submit" | "status">(null);
  const wo = db.workOrders.find((w) => w.id === id && w.artisanId === user.artisanId);
  if (!wo)
    return (
      <Panel>
        <Empty icon={<Workflow className="size-7" />} title="Work order not found" action={<Button href="/k">Back</Button>} />
      </Panel>
    );
  const p = pieceOf(db, wo.pieceId)!;
  const cat = workCategory(db, wo.statusId);
  const canWork = !["SUBMITTED", "DONE"].includes(cat);
  const refs = p.photos.filter((x) => x.kind === "design" || x.kind === "reference");
  const hero = refs.at(-1) ?? p.photos.at(-1);
  const mine = [...wo.updates.flatMap((u) => u.photos), ...wo.submissionPhotos];
  const last = wo.updates.at(-1)?.percent ?? (cat === "SUBMITTED" || cat === "DONE" ? 100 : 0);

  return (
    <div className="pb-24">
      <Link href="/k" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft className="size-4" /> My work
      </Link>
      {hero && (
        <button
          onClick={() => open(p.photos, p.photos.indexOf(hero))}
          className="relative block aspect-[4/3] w-full overflow-hidden rounded-[1.6rem] border border-line-2"
        >
          <img src={hero.url} alt="" className="size-full object-cover" />
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">Design reference · tap to zoom</span>
        </button>
      )}
      <div className="mt-4">
        <div className="text-xs font-bold tracking-wider text-gold">
          {wo.number} · {p.code}
        </div>
        <h1 className="font-display text-3xl font-semibold">{p.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <WorkStatusPill wo={wo} />
          {canWork && <DueChip iso={wo.dueDate} />}
        </div>
      </div>

      <Panel className="mt-4 grid grid-cols-2 gap-4 p-4">
        <KeyVal k="Stage" v={stageOf(db, wo.stageId)?.name} />
        <KeyVal k="Due" v={date(wo.dueDate)} />
        <KeyVal k="Gold issued" v={<span className="gold-text tabular text-lg font-bold">{g(wo.issuedWeightMg)}</span>} />
        <KeyVal
          k="Submitted"
          v={
            <span className="tabular">
              {g(wo.submittedWeightMg)} <WeightDelta base={wo.issuedWeightMg} value={wo.submittedWeightMg} />
            </span>
          }
        />
        <KeyVal k="Purity" v={p.purity} />
        <KeyVal k="Qty / size" v={`${p.qty}${p.size ? ` · ${p.size}` : ""}`} />
        <KeyVal k="Stones" v={p.stones ?? "—"} className="col-span-2" />
        <div className="col-span-2 rounded-xl border-l-2 border-gold/50 bg-panel px-3 py-2 text-sm">{wo.instructions}</div>
        {wo.reviewNote && cat === "REWORK" && <div className="col-span-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">Office: “{wo.reviewNote}”</div>}
      </Panel>

      <Panel className="mt-4 p-4">
        <SectionTitle kicker={`${last}% done`} title="My progress" />
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gradient-to-r from-gold-3 to-gold-2" style={{ width: `${last}%` }} />
        </div>
        <div className="space-y-3">
          {wo.updates.map((u) => (
            <div key={u.id} className="rounded-xl border border-line bg-panel p-3 text-sm">
              <div className="flex justify-between">
                <b>{u.percent}%</b>
                <span className="text-xs text-faint">{dateTime(u.at)}</span>
              </div>
              <div className="text-muted">{u.note}</div>
            </div>
          ))}
        </div>
        {!!mine.length && <PhotoGrid photos={mine} className="mt-3" />}
      </Panel>

      <Button variant="soft" size="lg" className="mt-4 w-full" icon={<Download className="size-4" />} onClick={() => downloadPdf("work-order", wo.id)}>
        Download work order PDF
      </Button>

      {canWork && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 p-3 backdrop-blur-xl"
          style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr_1fr] gap-2">
            <Button variant="soft" size="lg" aria-label="Status" onClick={() => setDlg("status")}>
              <Workflow className="size-5" />
            </Button>
            <Button variant="soft" size="lg" icon={<Camera className="size-5" />} onClick={() => setDlg("progress")}>
              Progress
            </Button>
            <Button variant="gold" size="lg" icon={<Send className="size-5" />} onClick={() => setDlg("submit")}>
              Submit work
            </Button>
          </div>
        </div>
      )}
      <ProgressDialog open={dlg === "progress"} onClose={() => setDlg(null)} woId={wo.id} />
      <SubmitWorkDialog open={dlg === "submit"} onClose={() => setDlg(null)} woId={wo.id} />
      <StatusDialog open={dlg === "status"} onClose={() => setDlg(null)} kind="work" id={wo.id} />
    </div>
  );
}
