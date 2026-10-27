"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Download,
  Gem,
  Hammer,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  Share2,
  Sparkles,
  Truck,
  Workflow,
} from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { activeJW, activeWO, activityFor, artisanOf, customerOf, orderOf, stageOf, vendorOf, workCategory } from "@/lib/queries";
import { cn, date, g, inr } from "@/lib/format";
import { downloadPdf, sharePdf } from "@/lib/pdf-client";
import { Avatar, Button, Empty, KeyVal, Panel, SectionTitle } from "@/components/ui";
import { DueChip, JobStatusPill, LocationPill, StagePill, StageRail, Timeline, WeightDelta, WeightJourney, WorkStatusPill } from "@/components/domain";
import { PhotoGrid, Thumb, useLightbox } from "@/components/photos";
import {
  ActionTile,
  AddPhotosDialog,
  DeliveryDialog,
  IssueWorkDialog,
  MoveStageDialog,
  NoteDialog,
  ProgressDialog,
  ReadyDialog,
  ReceiveJobDialog,
  ReviewDialog,
  SendJobDialog,
  StatusDialog,
} from "@/components/actions";

type Dlg =
  | null
  | "assign"
  | "job"
  | "move"
  | "ready"
  | "photos"
  | "note"
  | "deliver"
  | { review: string }
  | { wstatus: string }
  | { progress: string }
  | { receive: string }
  | { jstatus: string };

export default function PieceDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const open = useLightbox();
  const canAssign = useCan("artisans.assign");
  const canReview = useCan("artisans.review");
  const canJob = useCan("jobwork.manage");
  const canDeliver = useCan("delivery.create");
  const [dlg, setDlg] = useState<Dlg>(null);
  const [active, setActive] = useState(-1);
  const p = db.pieces.find((x) => x.id === id);
  if (!p)
    return (
      <Panel>
        <Empty icon={<Gem className="size-7" />} title="Piece not found" action={<Button href="/pieces">All pieces</Button>} />
      </Panel>
    );

  const order = orderOf(db, p.orderId)!;
  const c = customerOf(db, order.customerId);
  const wo = activeWO(db, p);
  const jw = activeJW(db, p);
  const woCat = wo ? workCategory(db, wo.statusId) : undefined;
  const wos = db.workOrders.filter((w) => w.pieceId === p.id);
  const jws = db.jobWorks.filter((j) => j.pieceId === p.id);
  const photos = p.photos;
  const hero = photos[active < 0 ? photos.length - 1 : active];
  const stIdx = db.settings.stages.findIndex((s) => s.id === p.stageId);
  // the last two configured stages are treated as QC / ready
  const lateStage = stIdx >= db.settings.stages.length - 2;
  const dlgObj = typeof dlg === "object" && dlg ? dlg : null;

  return (
    <div>
      <Link href={`/orders/${order.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft className="size-4" /> {order.number} · {order.title}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* gallery */}
        <div className="rise">
          <button
            onClick={() => open(photos, photos.indexOf(hero))}
            className="group relative block aspect-square w-full overflow-hidden rounded-[1.75rem] border border-line-2 bg-bg-2 shadow-lux"
          >
            {hero && (
              <img
                key={hero.id}
                src={hero.url}
                alt={hero.caption ?? ""}
                className="fade size-full object-cover transition duration-700 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-left">
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e6bb6a]">{hero?.kind}</div>
              <div className="text-sm text-white/90">
                {hero?.caption} · {hero?.by} · {date(hero?.at)}
              </div>
            </div>
          </button>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {photos.map((ph, i) => (
              <button
                key={ph.id}
                onClick={() => setActive(i)}
                className={cn(
                  "size-16 shrink-0 overflow-hidden rounded-xl border-2 transition",
                  ph === hero ? "border-gold" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={ph.url} alt="" className="size-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => setDlg("photos")}
              className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-gold/40 text-gold"
            >
              <Camera className="size-5" />
            </button>
          </div>
        </div>

        {/* summary + next step */}
        <div className="rise space-y-5" style={{ animationDelay: ".08s" }}>
          <div>
            <div className="text-xs font-bold tracking-wider text-gold">{p.code}</div>
            <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">{p.name}</h1>
            <div className="mt-1 text-sm text-muted">
              for{" "}
              <Link href={`/customers/${c?.id}`} className="font-semibold text-text hover:text-gold">
                {c?.name}
              </Link>{" "}
              · due {date(order.dueDate)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StagePill stageId={p.stageId} />
              <LocationPill piece={p} />
            </div>
          </div>

          <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
            <KeyVal k="Category" v={p.category} />
            <KeyVal k="Purity" v={p.purity} />
            <KeyVal k="Qty / size" v={`${p.qty}${p.size ? ` · ${p.size}` : ""}`} />
            <KeyVal k="Estimated" v={<span className="tabular">{g(p.estWeightMg)}</span>} />
            <KeyVal k="Current" v={<span className="tabular">{g(p.currentWeightMg)}</span>} />
            <KeyVal k="Final" v={<span className="tabular gold-text font-semibold">{g(p.finalWeightMg)}</span>} />
            <KeyVal k="Stones" v={p.stones ?? "—"} className="col-span-2 sm:col-span-3" />
            <div className="col-span-2 text-sm text-muted sm:col-span-3">{p.specs}</div>
            <div className="col-span-2 rounded-xl border-l-2 border-gold/50 bg-panel px-3 py-2 text-sm text-muted italic sm:col-span-3">“{p.remarks}”</div>
          </Panel>

          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-gold">Next step</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {p.location === "OFFICE" && (
                <>
                  {!lateStage && canAssign && (
                    <ActionTile
                      primary
                      icon={<Hammer className="size-5" />}
                      title="Assign to karigar"
                      sub="Issue work order + metal"
                      onClick={() => setDlg("assign")}
                    />
                  )}
                  {lateStage && (
                    <ActionTile
                      primary
                      icon={<PackageCheck className="size-5" />}
                      title="QC passed — mark ready"
                      sub="Final weight & photo"
                      onClick={() => setDlg("ready")}
                    />
                  )}
                  {canJob && (
                    <ActionTile
                      icon={<Sparkles className="size-5" />}
                      title="Send for job work"
                      sub="Polish, plating, hallmark…"
                      onClick={() => setDlg("job")}
                    />
                  )}
                  {lateStage && canAssign && (
                    <ActionTile icon={<Hammer className="size-5" />} title="Assign to karigar" sub="Rework / extra work" onClick={() => setDlg("assign")} />
                  )}
                  {!lateStage && (
                    <ActionTile icon={<PackageCheck className="size-5" />} title="Mark ready" sub="Skip to QC & delivery" onClick={() => setDlg("ready")} />
                  )}
                </>
              )}
              {wo && (
                <>
                  {woCat === "SUBMITTED" && canReview && (
                    <ActionTile
                      primary
                      icon={<BadgeCheck className="size-5" />}
                      title="Review submission"
                      sub={`${artisanOf(db, wo.artisanId)?.name} submitted ${g(wo.submittedWeightMg)}`}
                      onClick={() => setDlg({ review: wo.id })}
                    />
                  )}
                  <ActionTile
                    icon={<Workflow className="size-5" />}
                    title="Update work status"
                    sub="Custom status + remarks"
                    onClick={() => setDlg({ wstatus: wo.id })}
                  />
                  <ActionTile
                    icon={<Camera className="size-5" />}
                    title="Post progress"
                    sub="Photos from the bench"
                    onClick={() => setDlg({ progress: wo.id })}
                  />
                  <ActionTile icon={<Download className="size-5" />} title="Work order PDF" sub={wo.number} onClick={() => downloadPdf("work-order", wo.id)} />
                  <ActionTile
                    icon={<Share2 className="size-5" />}
                    title="Send to karigar"
                    sub="WhatsApp / share sheet"
                    onClick={() => sharePdf("work-order", wo.id, artisanOf(db, wo.artisanId)?.phone, `Work order ${wo.number} — ${p.name}`)}
                  />
                </>
              )}
              {jw && (
                <>
                  <ActionTile
                    primary
                    icon={<RefreshCcw className="size-5" />}
                    title="Receive back"
                    sub={`From ${vendorOf(db, jw.vendorId)?.name}`}
                    onClick={() => setDlg({ receive: jw.id })}
                  />
                  <ActionTile
                    icon={<Workflow className="size-5" />}
                    title="Update job status"
                    sub="Delayed, in process…"
                    onClick={() => setDlg({ jstatus: jw.id })}
                  />
                  <ActionTile icon={<Download className="size-5" />} title="Challan PDF" sub={jw.number} onClick={() => downloadPdf("job-challan", jw.id)} />
                </>
              )}
              {p.location === "READY" && canDeliver && (
                <ActionTile
                  primary
                  icon={<Truck className="size-5" />}
                  title="Deliver to customer"
                  sub={`${c?.name} · ${g(p.finalWeightMg)}`}
                  onClick={() => setDlg("deliver")}
                />
              )}
              {p.location === "DELIVERED" && (
                <ActionTile
                  icon={<Download className="size-5" />}
                  title="Delivery note PDF"
                  sub={`Delivered ${date(p.deliveredAt)}`}
                  onClick={() => {
                    const d = db.deliveries.find((x) => x.items.some((i) => i.pieceId === p.id));
                    if (d) downloadPdf("delivery-note", d.id);
                  }}
                />
              )}
              {p.location !== "DELIVERED" && (
                <ActionTile icon={<Workflow className="size-5" />} title="Move stage" sub="Manual stage change" onClick={() => setDlg("move")} />
              )}
              <ActionTile
                icon={<MessageSquareText className="size-5" />}
                title="Add follow-up note"
                sub="Logged in the timeline"
                onClick={() => setDlg("note")}
              />
            </div>
          </div>
        </div>
      </div>

      <Panel className="mt-6 p-5">
        <SectionTitle kicker="Production stages" title="Where is it now?" />
        <StageRail piece={p} />
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="p-5">
          <SectionTitle kicker="Weight ledger" title="Weight journey" />
          <WeightJourney piece={p} />
          <p className="mt-4 text-[11px] text-faint">Tolerance {db.settings.weightTolerancePct}% — differences above it are flagged red.</p>
        </Panel>

        <Panel className="p-5">
          <SectionTitle kicker="Karigar & job work" title="Work history" />
          <div className="space-y-3">
            {wos.map((w) => {
              const a = artisanOf(db, w.artisanId)!;
              return (
                <div key={w.id} className="rounded-2xl border border-line bg-panel p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.name} hue={a.hue} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <div className="truncate text-[11px] text-muted">
                        {w.number} · {stageOf(db, w.stageId)?.name}
                      </div>
                    </div>
                    <WorkStatusPill wo={w} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <KeyVal k="Issued" v={<span className="tabular">{g(w.issuedWeightMg)}</span>} />
                    <KeyVal k="Submitted" v={<span className="tabular">{g(w.submittedWeightMg)}</span>} />
                    <KeyVal k="Diff" v={<WeightDelta base={w.issuedWeightMg} value={w.submittedWeightMg} />} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      {[...w.updates.flatMap((u) => u.photos), ...w.submissionPhotos].slice(-4).map((ph, i, arr) => (
                        <Thumb key={ph.id} photo={ph} photos={arr} className="size-9" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {!w.submittedAt && <DueChip iso={w.dueDate} />}
                      <Button size="sm" variant="ghost" onClick={() => downloadPdf("work-order", w.id)} icon={<Download className="size-3.5" />}>
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {jws.map((j) => (
              <div key={j.id} className="rounded-2xl border border-gold/25 bg-gold/5 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-gold/15 text-gold">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{vendorOf(db, j.vendorId)?.name}</div>
                    <div className="truncate text-[11px] text-muted">
                      {j.number} · {j.process} · sent {date(j.dispatchDate)}
                    </div>
                  </div>
                  <JobStatusPill jw={j} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <KeyVal k="Sent" v={<span className="tabular">{g(j.sentWeightMg)}</span>} />
                  <KeyVal k="Returned" v={<span className="tabular">{g(j.returnedWeightMg)}</span>} />
                  <KeyVal k="Charges" v={inr(j.charges)} />
                </div>
              </div>
            ))}
            {!wos.length && !jws.length && <div className="py-6 text-center text-sm text-faint">Not issued to anyone yet.</div>}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle kicker="Audit trail" title="Piece timeline" />
          <div className="scroll-thin max-h-[640px] overflow-y-auto pr-1">
            <Timeline items={activityFor(db, { pieceId: p.id })} dense />
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 p-5">
        <SectionTitle kicker="All photographs" title={`Photo record (${photos.length})`} />
        <PhotoGrid photos={photos} className="sm:grid-cols-6" />
      </Panel>

      <IssueWorkDialog open={dlg === "assign"} onClose={() => setDlg(null)} pieceId={p.id} />
      <SendJobDialog open={dlg === "job"} onClose={() => setDlg(null)} pieceId={p.id} />
      <MoveStageDialog open={dlg === "move"} onClose={() => setDlg(null)} pieceId={p.id} />
      <ReadyDialog open={dlg === "ready"} onClose={() => setDlg(null)} pieceId={p.id} />
      <AddPhotosDialog open={dlg === "photos"} onClose={() => setDlg(null)} target={{ pieceId: p.id }} />
      <NoteDialog open={dlg === "note"} onClose={() => setDlg(null)} target={{ pieceId: p.id }} />
      <DeliveryDialog open={dlg === "deliver"} onClose={() => setDlg(null)} orderId={order.id} />
      {dlgObj && "review" in dlgObj && <ReviewDialog open onClose={() => setDlg(null)} woId={dlgObj.review} />}
      {dlgObj && "wstatus" in dlgObj && <StatusDialog open onClose={() => setDlg(null)} kind="work" id={dlgObj.wstatus} />}
      {dlgObj && "progress" in dlgObj && <ProgressDialog open onClose={() => setDlg(null)} woId={dlgObj.progress} />}
      {dlgObj && "receive" in dlgObj && <ReceiveJobDialog open onClose={() => setDlg(null)} jwId={dlgObj.receive} />}
      {dlgObj && "jstatus" in dlgObj && <StatusDialog open onClose={() => setDlg(null)} kind="job" id={dlgObj.jstatus} />}
    </div>
  );
}
