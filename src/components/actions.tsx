"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Hammer,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  Send,
  Share2,
  Sparkles,
  Truck,
  Undo2,
  UserPlus,
  Workflow,
} from "lucide-react";
import * as ops from "@/lib/ops";
import { act, run, useDB } from "@/lib/store";
import type { Artisan, Customer, Piece } from "@/lib/types";
import { activeJW, activeWO, artisanLoad, artisanOf, customerOf, orderOf, pieceOf, piecesOf, stageOf, vendorOf } from "@/lib/queries";
import { cn, diff, fromInputDate, g, inputDate, toMg } from "@/lib/format";
import { downloadPdf, sharePdf, type DocKind } from "@/lib/pdf-client";
import { Avatar, Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { PhotoGrid, PhotoInput, type DraftPhoto } from "./photos";

// ─────────────────────────────────────────────── shared fields
const CHIPS = ["Checked and verified", "As per customer instruction", "Handle with care", "Urgent — priority work", "Weighed in front of karigar"];

export function RemarksField({
  value,
  onChange,
  label = "Remarks",
  chips = CHIPS,
  placeholder = "Mandatory — what happened, why, any instructions…",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  chips?: string[];
  placeholder?: string;
}) {
  const ok = value.trim().length >= 3;
  return (
    <div>
      <Field
        label={label}
        required
        hint={<span className={cn(ok ? "text-ok" : "")}>{ok ? "✓ Remarks added" : "Remarks are mandatory for every update (min 3 characters)"}</span>}
      >
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
      </Field>
      <div className="no-scrollbar -mt-0.5 mt-2 flex gap-1.5 overflow-x-auto">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value ? `${value.trim()} ${c}.` : `${c}.`)}
            className="shrink-0 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-muted hover:border-gold/40 hover:text-text"
          >
            + {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WeightField({
  label,
  value,
  onChange,
  baseMg,
  baseLabel,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  baseMg?: number;
  baseLabel?: string;
  required?: boolean;
}) {
  const db = useDB();
  const d = diff(baseMg, toMg(value));
  const bad = d && Math.abs(d.pct) > db.settings.weightTolerancePct;
  return (
    <Field
      label={label}
      required={required}
      hint={
        d ? (
          <span className={cn("tabular font-semibold", bad ? "text-danger" : d.mg < 0 ? "text-warn" : "text-ok")}>
            {bad && <AlertTriangle className="mr-1 inline size-3" />}
            {d.label} ({d.pct.toFixed(2)}%) vs {baseLabel} {g(baseMg)}
            {bad && ` — above ${db.settings.weightTolerancePct}% tolerance`}
          </span>
        ) : baseMg ? (
          `${baseLabel}: ${g(baseMg)}`
        ) : undefined
      }
    >
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step="0.001"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.000"
          className="tabular pr-10 text-lg font-semibold"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-faint">g</span>
      </div>
    </Field>
  );
}

function PieceHeader({ piece }: { piece: Piece }) {
  const db = useDB();
  const order = orderOf(db, piece.orderId);
  const cover = [...piece.photos].reverse()[0];
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-panel p-2.5">
      {cover && <img src={cover.url} alt="" className="size-14 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-wider text-gold">{piece.code}</div>
        <div className="truncate font-semibold">{piece.name}</div>
        <div className="truncate text-xs text-muted">
          {order?.title} · {piece.purity} · est. {g(piece.estWeightMg)}
        </div>
      </div>
    </div>
  );
}

/** Success state shown after creating a document, with PDF + WhatsApp actions. */
function DocDone({
  kind,
  id,
  title,
  sub,
  phone,
  shareText,
  onClose,
}: {
  kind: DocKind;
  id: string;
  title: string;
  sub: string;
  phone?: string;
  shareText: string;
  onClose: () => void;
}) {
  return (
    <div className="pop py-4 text-center">
      <div className="gold-fill mx-auto grid size-16 place-items-center rounded-full">
        <CheckCircle2 className="size-8" />
      </div>
      <div className="font-display mt-4 text-2xl font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button variant="soft" size="lg" icon={<Download className="size-4" />} onClick={() => downloadPdf(kind, id)}>
          Download PDF
        </Button>
        <Button variant="soft" size="lg" icon={<Share2 className="size-4" />} onClick={() => sharePdf(kind, id, phone, shareText)}>
          Share on WhatsApp
        </Button>
      </div>
      <Button variant="ghost" className="mt-3" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

/** Mounts a dialog's body only while open, so its form state starts fresh every time. */
function gate<P extends { open: boolean }>(Body: (p: P) => ReactNode) {
  const Gated = (p: P) => (p.open ? <Body {...p} /> : null);
  Gated.displayName = `Gated(${Body.name})`;
  return Gated;
}

const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
const asPhotos = (ps: DraftPhoto[]) => ps.map((p) => ({ url: p.url, caption: p.caption }));

// ─────────────────────────────────────────────── issue work order (assign karigar)
function IssueWorkBody({
  open,
  onClose,
  pieceId: fixedPiece,
  artisanId: fixedArtisan,
}: {
  open: boolean;
  onClose: () => void;
  pieceId?: string;
  artisanId?: string;
}) {
  const db = useDB();
  const eligible = db.pieces.filter((p) => p.location === "OFFICE");
  const [pieceId, setPieceId] = useState(fixedPiece ?? "");
  const piece = pieceOf(db, pieceId);
  const initial = pieceOf(db, fixedPiece ?? "");
  const artisanStages = db.settings.stages.filter((s) => s.handledBy === "ARTISAN");
  const defaultStage = (p?: Piece) => {
    if (!p) return artisanStages[0]?.id ?? "";
    const st = stageOf(db, p.stageId);
    if (st?.handledBy === "ARTISAN") return st.id;
    const idx = db.settings.stages.findIndex((s) => s.id === p.stageId);
    return db.settings.stages.slice(idx).find((s) => s.handledBy === "ARTISAN")?.id ?? artisanStages[0]?.id ?? "";
  };
  const [f, setF] = useState(() => ({
    artisanId: fixedArtisan ?? "",
    stageId: defaultStage(initial),
    due: inputDate(plusDays(4)),
    weight: initial ? ((initial.currentWeightMg ?? Math.round(initial.estWeightMg * 1.06)) / 1000).toFixed(3) : "",
    instructions: initial ? `${initial.specs}${initial.stones ? `. Stones: ${initial.stones}` : ""}` : "",
    remarks: "",
  }));
  const [done, setDone] = useState<string | null>(null);

  const pickPiece = (id: string) => {
    setPieceId(id);
    const p = pieceOf(db, id);
    if (p)
      setF((x) => ({
        ...x,
        stageId: defaultStage(p),
        weight: ((p.currentWeightMg ?? Math.round(p.estWeightMg * 1.06)) / 1000).toFixed(3),
        instructions: `${p.specs}${p.stones ? `. Stones: ${p.stones}` : ""}`,
      }));
  };

  const submit = () => {
    const id = act(
      (d, ctx) =>
        ops.issueWorkOrder(
          d,
          {
            pieceId,
            artisanId: f.artisanId,
            stageId: f.stageId,
            dueDate: fromInputDate(f.due),
            issuedWeightMg: toMg(f.weight),
            instructions: f.instructions,
            remarks: f.remarks,
          },
          ctx,
        ),
      "Work order issued",
    );
    if (id) setDone(id);
  };
  const wo = done ? db.workOrders.find((w) => w.id === done) : undefined;
  const art = artisanOf(db, f.artisanId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? "Work order ready" : "Assign to karigar"}
      sub={done ? undefined : "Issue a work order with weighed metal. The karigar sees it instantly on their phone."}
      icon={<Hammer className="size-5" />}
      footer={
        !done && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gold" icon={<FileText className="size-4" />} onClick={submit} disabled={!pieceId || !f.artisanId}>
              Issue work order
            </Button>
          </>
        )
      }
    >
      {done && wo ? (
        <DocDone
          kind="work-order"
          id={wo.id}
          title={wo.number}
          sub={`Issued to ${art?.name} · ${g(wo.issuedWeightMg)}`}
          phone={art?.phone}
          shareText={`Work order ${wo.number} for ${piece?.name} (${piece?.code}). Issued weight ${g(wo.issuedWeightMg)}. Please check the attached PDF.`}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-4">
          {fixedPiece && piece ? (
            <PieceHeader piece={piece} />
          ) : (
            <Field label="Piece" required>
              <Select value={pieceId} onChange={(e) => pickPiece(e.target.value)}>
                <option value="">Select a piece in office…</option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name} ({stageOf(db, p.stageId)?.name})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
              Karigar <span className="text-gold">*</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {db.artisans
                .filter((a) => a.active)
                .map((a) => {
                  const load = artisanLoad(db, a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setF({ ...f, artisanId: a.id })}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition",
                        f.artisanId === a.id ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
                      )}
                    >
                      <Avatar name={a.name} hue={a.hue} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{a.name}</span>
                        <span className="block truncate text-[11px] text-muted">{a.speciality}</span>
                      </span>
                      <span
                        className={cn(
                          "tabular rounded-full px-2 py-0.5 text-[10px] font-bold",
                          load.open.length >= 4 ? "bg-danger/15 text-danger" : "bg-panel-2 text-muted",
                        )}
                      >
                        {load.open.length} open
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Production stage" required>
              <Select value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })}>
                {db.settings.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date" required>
              <Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
            </Field>
          </div>
          <WeightField
            label="Issued weight (metal handed over)"
            value={f.weight}
            onChange={(v) => setF({ ...f, weight: v })}
            baseMg={piece?.currentWeightMg ?? piece?.estWeightMg}
            baseLabel={piece?.currentWeightMg ? "current" : "estimate"}
          />
          <Field label="Instructions for karigar">
            <Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} rows={2} />
          </Field>
          <RemarksField value={f.remarks} onChange={(v) => setF({ ...f, remarks: v })} />
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────── review karigar submission
function ReviewBody({ open, onClose, woId }: { open: boolean; onClose: () => void; woId: string }) {
  const db = useDB();
  const wo = db.workOrders.find((w) => w.id === woId);
  const piece = wo && pieceOf(db, wo.pieceId);
  const nextIdx = wo ? db.settings.stages.findIndex((s) => s.id === wo.stageId) + 1 : 0;
  const [next, setNext] = useState(db.settings.stages[Math.min(nextIdx, db.settings.stages.length - 1)]?.id ?? "");
  const [note, setNote] = useState("");
  if (!wo || !piece) return null;
  const a = artisanOf(db, wo.artisanId);
  const d = diff(wo.issuedWeightMg, wo.submittedWeightMg);
  const bad = d && Math.abs(d.pct) > db.settings.weightTolerancePct;
  const decide = (approve: boolean) =>
    run(
      (x, ctx) => ops.reviewWork(x, wo.id, { approve, note, nextStageId: approve ? next : undefined }, ctx),
      approve ? "Approved — piece back in office" : "Sent back for rework",
    ) && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review submission"
      sub={`${wo.number} · ${a?.name} · ${stageOf(db, wo.stageId)?.name}`}
      icon={<BadgeCheck className="size-5" />}
      wide
      footer={
        <>
          <Button variant="danger" icon={<Undo2 className="size-4" />} onClick={() => decide(false)}>
            Send for rework
          </Button>
          <Button variant="gold" icon={<BadgeCheck className="size-4" />} onClick={() => decide(true)}>
            Approve & receive
          </Button>
        </>
      }
    >
      <PieceHeader piece={piece} />
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Karigar&apos;s photos</div>
          <PhotoGrid photos={wo.submissionPhotos} className="grid-cols-2 sm:grid-cols-3" />
          {wo.submissionNote && (
            <div className="mt-3 rounded-xl border-l-2 border-gold/50 bg-panel px-3 py-2 text-sm text-muted italic">“{wo.submissionNote}”</div>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-panel p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Issued</div>
              <div className="font-display tabular text-2xl font-semibold">{g(wo.issuedWeightMg)}</div>
            </div>
            <div className={cn("rounded-xl border p-3", bad ? "border-danger/40 bg-danger/10" : "border-line bg-panel")}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Submitted</div>
              <div className="font-display tabular text-2xl font-semibold">{g(wo.submittedWeightMg)}</div>
            </div>
          </div>
          {d && (
            <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", bad ? "bg-danger/10 text-danger" : "bg-ok/10 text-ok")}>
              {bad ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
              {d.label} ({d.pct.toFixed(2)}%) {bad ? `exceeds ${db.settings.weightTolerancePct}% tolerance` : "within tolerance"}
            </div>
          )}
          <Field label="If approved, move piece to">
            <Select value={next} onChange={(e) => setNext(e.target.value)}>
              {db.settings.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <RemarksField value={note} onChange={setNote} chips={["Finish OK", "Weight verified", "Stones secure", "Redo the joint", "Return the filings"]} />
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── generic status change (custom options)
function StatusBody({ open, onClose, kind, id }: { open: boolean; onClose: () => void; kind: "order" | "work" | "job"; id: string }) {
  const db = useDB();
  // submit / approve / return have their own flows (weights + photos), so they are not offered here
  const list =
    kind === "order"
      ? db.settings.orderStatuses
      : kind === "work"
        ? db.settings.workStatuses.filter((s) => !["SUBMITTED", "DONE"].includes(s.category))
        : db.settings.jobStatuses.filter((s) => s.category !== "RETURNED");
  const current =
    kind === "order"
      ? db.orders.find((o) => o.id === id)?.statusId
      : kind === "work"
        ? db.workOrders.find((w) => w.id === id)?.statusId
        : db.jobWorks.find((j) => j.id === id)?.statusId;
  const [statusId, setStatusId] = useState(current ?? "");
  const [remarks, setRemarks] = useState("");
  const save = () => {
    const ok = run(
      (d, ctx) =>
        kind === "order"
          ? ops.updateOrderStatus(d, id, statusId, remarks, ctx)
          : kind === "work"
            ? ops.updateWorkStatus(d, id, statusId, remarks, ctx)
            : ops.updateJobStatus(d, id, statusId, remarks, ctx),
      "Status updated",
    );
    if (ok) onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update status"
      sub="Status options are configurable in Settings."
      icon={<Workflow className="size-5" />}
      footer={
        <Button variant="gold" onClick={save}>
          Save status
        </Button>
      }
    >
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusId(s.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition",
              statusId === s.id ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
            )}
          >
            <span className="size-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
            {s.label}
            {s.id === current && <span className="ml-auto text-[10px] font-bold uppercase text-faint">current</span>}
          </button>
        ))}
      </div>
      <RemarksField value={remarks} onChange={setRemarks} />
    </Modal>
  );
}

// ─────────────────────────────────────────────── progress update (karigar or office)
function ProgressBody({ open, onClose, woId }: { open: boolean; onClose: () => void; woId: string }) {
  const db = useDB();
  const wo = db.workOrders.find((w) => w.id === woId);
  const last = wo?.updates.at(-1)?.percent ?? 0;
  const [pct, setPct] = useState(Math.min(90, last + 20));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  if (!wo) return null;
  const save = () => run((d, ctx) => ops.addWorkUpdate(d, wo.id, { percent: pct, note, photos: asPhotos(photos) }, ctx), "Progress posted") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post progress"
      sub={wo.number}
      icon={<Camera className="size-5" />}
      footer={
        <Button variant="gold" size="lg" className="w-full sm:w-auto" onClick={save}>
          Post update
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Work done</span>
            <span className="font-display gold-text text-4xl font-semibold">{pct}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} className="w-full accent-[var(--gold)]" />
        </div>
        <PhotoInput value={photos} onChange={setPhotos} label="Work photos" look="raw" />
        <RemarksField
          label="Progress note"
          value={note}
          onChange={setNote}
          chips={["Casting done", "Filing in progress", "Half the stones set", "Waiting for stones", "Almost finished"]}
        />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── karigar submits finished work
function SubmitWorkBody({ open, onClose, woId }: { open: boolean; onClose: () => void; woId: string }) {
  const db = useDB();
  const wo = db.workOrders.find((w) => w.id === woId);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  if (!wo) return null;
  const save = () =>
    run((d, ctx) => ops.submitWork(d, wo.id, { weightMg: toMg(weight), note, photos: asPhotos(photos) }, ctx), "Submitted for review") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit finished work"
      sub={`${wo.number} · weigh the piece and take a clear photo`}
      icon={<Send className="size-5" />}
      footer={
        <Button variant="gold" size="lg" className="w-full sm:w-auto" icon={<Send className="size-4" />} onClick={save}>
          Submit to office
        </Button>
      }
    >
      <div className="space-y-5">
        <PhotoInput value={photos} onChange={setPhotos} label="Photos of finished work" required look="raw" />
        <WeightField label="Submitted weight" value={weight} onChange={setWeight} baseMg={wo.issuedWeightMg} baseLabel="issued" />
        <RemarksField
          label="Submission remarks"
          value={note}
          onChange={setNote}
          chips={["Work complete", "Filings returned", "All stones set", "Ready for polish"]}
        />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── outside job work
function SendJobBody({ open, onClose, pieceId: fixedPiece }: { open: boolean; onClose: () => void; pieceId?: string }) {
  const db = useDB();
  const eligible = db.pieces.filter((p) => p.location === "OFFICE");
  const jobStages = db.settings.stages.filter((s) => s.handledBy === "JOBWORK");
  const [f, setF] = useState(() => {
    const p = pieceOf(db, fixedPiece ?? "");
    const v = db.settings.vendors[0];
    return {
      pieceId: fixedPiece ?? "",
      vendorId: v?.id ?? "",
      process: v?.processes[0] ?? "",
      dispatch: inputDate(),
      expected: inputDate(plusDays(3)),
      weight: p ? ((p.currentWeightMg ?? p.estWeightMg) / 1000).toFixed(3) : "",
      remarks: "",
      stageId: jobStages[0]?.id ?? p?.stageId ?? "",
    };
  });
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const piece = pieceOf(db, f.pieceId);
  const vendor = vendorOf(db, f.vendorId);
  const submit = () => {
    const id = act(
      (d, ctx) =>
        ops.sendJobWork(
          d,
          {
            pieceId: f.pieceId,
            vendorId: f.vendorId,
            process: f.process,
            dispatchDate: fromInputDate(f.dispatch),
            expectedDate: fromInputDate(f.expected),
            sentWeightMg: toMg(f.weight),
            remarks: f.remarks,
            photos: asPhotos(photos),
            stageId: f.stageId || undefined,
          },
          ctx,
        ),
      "Sent for job work",
    );
    if (id) setDone(id);
  };
  const jw = done ? db.jobWorks.find((j) => j.id === done) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? "Challan ready" : "Send for outside job work"}
      sub={done ? undefined : "Polishing, plating, meenakari, hallmarking — tracked with weight and photos."}
      icon={<Sparkles className="size-5" />}
      footer={
        !done && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gold" icon={<Send className="size-4" />} onClick={submit} disabled={!f.pieceId}>
              Dispatch with challan
            </Button>
          </>
        )
      }
    >
      {done && jw ? (
        <DocDone
          kind="job-challan"
          id={jw.id}
          title={jw.number}
          sub={`${piece?.name} → ${vendor?.name} · ${g(jw.sentWeightMg)}`}
          phone={vendor?.phone}
          shareText={`Job work challan ${jw.number}: ${piece?.name} (${piece?.code}) for ${jw.process}. Sent weight ${g(jw.sentWeightMg)}.`}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-4">
          {fixedPiece && piece ? (
            <PieceHeader piece={piece} />
          ) : (
            <Field label="Piece" required>
              <Select
                value={f.pieceId}
                onChange={(e) => {
                  const p = pieceOf(db, e.target.value);
                  setF({ ...f, pieceId: e.target.value, weight: p ? ((p.currentWeightMg ?? p.estWeightMg) / 1000).toFixed(3) : "" });
                }}
              >
                <option value="">Select a piece in office…</option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name} ({stageOf(db, p.stageId)?.name})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job worker / vendor" required>
              <Select
                value={f.vendorId}
                onChange={(e) => setF({ ...f, vendorId: e.target.value, process: vendorOf(db, e.target.value)?.processes[0] ?? f.process })}
              >
                {db.settings.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Process" required>
              <Select value={f.process} onChange={(e) => setF({ ...f, process: e.target.value })}>
                {db.settings.processes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Dispatch date" required>
              <Input type="date" value={f.dispatch} onChange={(e) => setF({ ...f, dispatch: e.target.value })} />
            </Field>
            <Field label="Expected return" required>
              <Input type="date" value={f.expected} onChange={(e) => setF({ ...f, expected: e.target.value })} />
            </Field>
          </div>
          <Field label="Production stage while out">
            <Select value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })}>
              {db.settings.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <WeightField
            label="Sent weight"
            value={f.weight}
            onChange={(v) => setF({ ...f, weight: v })}
            baseMg={piece?.currentWeightMg}
            baseLabel="last recorded"
          />
          <PhotoInput value={photos} onChange={setPhotos} label="Photos before dispatch" look="raw" />
          <RemarksField value={f.remarks} onChange={(v) => setF({ ...f, remarks: v })} />
        </div>
      )}
    </Modal>
  );
}

function ReceiveJobBody({ open, onClose, jwId }: { open: boolean; onClose: () => void; jwId: string }) {
  const db = useDB();
  const jw = db.jobWorks.find((j) => j.id === jwId);
  const [weight, setWeight] = useState("");
  const [charges, setCharges] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  if (!jw) return null;
  const piece = pieceOf(db, jw.pieceId)!;
  const save = () =>
    run(
      (d, ctx) =>
        ops.receiveJobWork(d, jw.id, { returnedWeightMg: toMg(weight), charges: charges ? +charges : undefined, remarks, photos: asPhotos(photos) }, ctx),
      "Received back in office",
    ) && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receive from job work"
      sub={`${jw.number} · ${vendorOf(db, jw.vendorId)?.name} · ${jw.process}`}
      icon={<RefreshCcw className="size-5" />}
      footer={
        <Button variant="gold" icon={<PackageCheck className="size-4" />} onClick={save}>
          Receive in office
        </Button>
      }
    >
      <PieceHeader piece={piece} />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <WeightField label="Returned weight" value={weight} onChange={setWeight} baseMg={jw.sentWeightMg} baseLabel="sent" />
          <Field label="Job charges (₹)">
            <Input type="number" inputMode="numeric" value={charges} onChange={(e) => setCharges(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <PhotoInput value={photos} onChange={setPhotos} label="Photos after process" look="final" />
        <RemarksField
          value={remarks}
          onChange={setRemarks}
          chips={["Finish checked under loupe", "Weight verified", "Minor scratches — accepted", "Plating uniform"]}
        />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── QC → ready
function ReadyBody({ open, onClose, pieceId }: { open: boolean; onClose: () => void; pieceId: string }) {
  const db = useDB();
  const piece = pieceOf(db, pieceId);
  const [weight, setWeight] = useState(piece ? ((piece.currentWeightMg ?? piece.estWeightMg) / 1000).toFixed(3) : "");
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  if (!piece) return null;
  const save = () =>
    run((d, ctx) => ops.markReady(d, piece.id, { finalWeightMg: toMg(weight), remarks, photos: asPhotos(photos) }, ctx), "Ready for delivery ✨") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quality check & ready"
      sub="Record the final weight and the studio photo."
      icon={<PackageCheck className="size-5" />}
      footer={
        <Button variant="gold" icon={<PackageCheck className="size-4" />} onClick={save}>
          Mark ready for delivery
        </Button>
      }
    >
      <PieceHeader piece={piece} />
      <div className="space-y-4">
        <WeightField label="Final weight" value={weight} onChange={setWeight} baseMg={piece.estWeightMg} baseLabel="estimate" />
        <PhotoInput value={photos} onChange={setPhotos} label="Final photograph" required look="final" />
        <RemarksField value={remarks} onChange={setRemarks} chips={["QC passed", "Hallmark done (HUID recorded)", "Packed in box", "Certificate attached"]} />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── delivery
function DeliveryBody({ open, onClose, orderId: fixedOrder }: { open: boolean; onClose: () => void; orderId?: string }) {
  const db = useDB();
  const ordersWithReady = db.orders.filter((o) => piecesOf(db, o.id).some((p) => p.location === "READY"));
  const fixed = orderOf(db, fixedOrder ?? "");
  const [orderId, setOrderId] = useState(fixedOrder ?? "");
  const [sel, setSel] = useState<string[]>(() =>
    fixed
      ? piecesOf(db, fixed.id)
          .filter((p) => p.location === "READY")
          .map((p) => p.id)
      : [],
  );
  const [f, setF] = useState({
    date: inputDate(),
    mode: "Hand delivery" as "Hand delivery" | "Courier" | "Showroom pickup",
    receivedBy: fixed ? (customerOf(db, fixed.customerId)?.name ?? "") : "",
    remarks: "",
  });
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const order = orderOf(db, orderId);
  const customer = order && customerOf(db, order.customerId);
  const ready = useMemo(() => (order ? piecesOf(db, order.id).filter((p) => p.location === "READY") : []), [db, order]);
  const pick = (id: string) => {
    setOrderId(id);
    const o = orderOf(db, id);
    setSel(
      o
        ? piecesOf(db, id)
            .filter((p) => p.location === "READY")
            .map((p) => p.id)
        : [],
    );
    setF((x) => ({ ...x, receivedBy: o ? (customerOf(db, o.customerId)?.name ?? "") : "" }));
  };
  const submit = () => {
    const id = act(
      (d, ctx) =>
        ops.createDelivery(
          d,
          { orderId, pieceIds: sel, date: fromInputDate(f.date), mode: f.mode, receivedBy: f.receivedBy, remarks: f.remarks, photos: asPhotos(photos) },
          ctx,
        ),
      "Delivery recorded",
    );
    if (id) setDone(id);
  };
  const del = done ? db.deliveries.find((x) => x.id === done) : undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? "Delivered 🎉" : "Deliver to customer"}
      sub={done ? undefined : "Full or partial delivery — select the ready pieces handed over."}
      icon={<Truck className="size-5" />}
      wide
      footer={
        !done && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gold" icon={<Truck className="size-4" />} onClick={submit} disabled={!sel.length}>
              Record delivery ({sel.length})
            </Button>
          </>
        )
      }
    >
      {done && del ? (
        <DocDone
          kind="delivery-note"
          id={del.id}
          title={del.number}
          sub={`${del.items.length} piece(s) · ${g(del.items.reduce((s, i) => s + i.weightMg, 0))} · ${del.receivedBy}`}
          phone={customer?.phone}
          shareText={`Dear ${customer?.name}, your order ${order?.number} has been delivered (${del.number}). Thank you for choosing ${db.settings.company.name}!`}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-4">
          {!fixedOrder && (
            <Field label="Order" required>
              <Select value={orderId} onChange={(e) => pick(e.target.value)}>
                <option value="">Select an order with ready pieces…</option>
                {ordersWithReady.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} · {o.title} — {customerOf(db, o.customerId)?.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {order && (
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Ready pieces</div>
              {ready.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ready.map((p) => {
                    const on = sel.includes(p.id);
                    const cover = [...p.photos].reverse().find((x) => x.kind === "final") ?? p.photos.at(-1);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSel(on ? sel.filter((x) => x !== p.id) : [...sel, p.id])}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-2 text-left transition",
                          on ? "border-gold bg-gold/10" : "border-line bg-panel",
                        )}
                      >
                        {cover && <img src={cover.url} alt="" className="size-12 rounded-lg object-cover" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="tabular block text-[11px] text-muted">
                            {p.code} · {g(p.finalWeightMg)}
                          </span>
                        </span>
                        <span className={cn("grid size-5 place-items-center rounded-md border", on ? "gold-fill border-transparent" : "border-line-2")}>
                          {on && <CheckCircle2 className="size-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line-2 p-4 text-center text-sm text-faint">No pieces of this order are ready yet.</div>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Delivery date" required>
              <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
            <Field label="Mode" required>
              <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as typeof f.mode })}>
                <option>Hand delivery</option>
                <option>Showroom pickup</option>
                <option>Courier</option>
              </Select>
            </Field>
            <Field label="Received by" required>
              <Input value={f.receivedBy} onChange={(e) => setF({ ...f, receivedBy: e.target.value })} />
            </Field>
          </div>
          <PhotoInput value={photos} onChange={setPhotos} label="Handover photo" look="final" />
          <RemarksField
            value={f.remarks}
            onChange={(v) => setF({ ...f, remarks: v })}
            chips={["Delivered with bill", "Hallmark certificate given", "Customer satisfied", "Balance payment received"]}
          />
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────── stage move / photos / note
function MoveStageBody({ open, onClose, pieceId, stageId: target }: { open: boolean; onClose: () => void; pieceId: string; stageId?: string }) {
  const db = useDB();
  const piece = pieceOf(db, pieceId);
  const [stageId, setStageId] = useState(target ?? piece?.stageId ?? "");
  const [remarks, setRemarks] = useState("");
  if (!piece) return null;
  const save = () => run((d, ctx) => ops.moveStage(d, piece.id, stageId, remarks, ctx), "Stage updated") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move production stage"
      icon={<Workflow className="size-5" />}
      footer={
        <Button variant="gold" onClick={save}>
          Move piece
        </Button>
      }
    >
      <PieceHeader piece={piece} />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {db.settings.stages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStageId(s.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                stageId === s.id ? "border-transparent text-black" : "border-line text-muted",
              )}
              style={stageId === s.id ? { background: s.color } : undefined}
            >
              {s.name}
            </button>
          ))}
        </div>
        <RemarksField value={remarks} onChange={setRemarks} />
      </div>
    </Modal>
  );
}

function AddPhotosBody({ open, onClose, target }: { open: boolean; onClose: () => void; target: { orderId?: string; pieceId?: string } }) {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const save = () => run((d, ctx) => ops.addPhotos(d, target, asPhotos(photos), caption, ctx), "Photos added") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add photographs"
      icon={<Camera className="size-5" />}
      footer={
        <Button variant="gold" onClick={save} disabled={!photos.length}>
          Save photos
        </Button>
      }
    >
      <div className="space-y-4">
        <PhotoInput value={photos} onChange={setPhotos} required />
        <Field label="Caption">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Customer's old jewellery reference" />
        </Field>
      </div>
    </Modal>
  );
}

function NoteBody({ open, onClose, target }: { open: boolean; onClose: () => void; target: { orderId?: string; pieceId?: string } }) {
  const [note, setNote] = useState("");
  const save = () => run((d, ctx) => ops.addNote(d, target, note, ctx), "Note saved") && onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Follow-up note"
      icon={<MessageSquareText className="size-5" />}
      footer={
        <Button variant="gold" onClick={save}>
          Save note
        </Button>
      }
    >
      <RemarksField
        label="Note"
        value={note}
        onChange={setNote}
        chips={["Called customer", "Customer asked for update", "Payment reminder sent", "Design change requested"]}
      />
    </Modal>
  );
}

// ─────────────────────────────────────────────── masters
function CustomerBody({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: Customer; onSaved?: (id: string) => void }) {
  const [f, setF] = useState(
    customer
      ? { name: customer.name, phone: customer.phone, city: customer.city, email: customer.email ?? "", type: customer.type, notes: customer.notes ?? "" }
      : { name: "", phone: "", city: "", email: "", type: "Retail" as Customer["type"], notes: "" },
  );
  const save = () => {
    const id = customer
      ? run((d) => ops.updateCustomer(d, customer.id, f), "Customer updated") && customer.id
      : act((d, ctx) => ops.createCustomer(d, f, ctx), "Customer added");
    if (id) {
      onSaved?.(id);
      onClose();
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "New customer"}
      icon={<UserPlus className="size-5" />}
      footer={
        <Button variant="gold" onClick={save}>
          Save customer
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Phone" required>
          <Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="10-digit mobile" />
        </Field>
        <Field label="City / area">
          <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Customer["type"] })}>
            <option>Retail</option>
            <option>Showroom</option>
            <option>Wholesale</option>
          </Select>
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

function ArtisanBody({ open, onClose, artisan }: { open: boolean; onClose: () => void; artisan?: Artisan }) {
  const [f, setF] = useState(
    artisan
      ? { name: artisan.name, phone: artisan.phone, speciality: artisan.speciality, city: artisan.city, active: artisan.active }
      : { name: "", phone: "", speciality: "", city: "", active: true },
  );
  const save = () =>
    run((d, ctx) => ops.saveArtisan(d, { ...f, id: artisan?.id }, ctx), artisan ? "Karigar updated" : "Karigar added — they can log in from the demo screen") &&
    onClose();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={artisan ? "Edit karigar" : "Add karigar"}
      icon={<Hammer className="size-5" />}
      footer={
        <Button variant="gold" onClick={save}>
          Save karigar
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Phone">
          <Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Area">
          <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label="Speciality" className="sm:col-span-2">
          <Input value={f.speciality} onChange={(e) => setF({ ...f, speciality: e.target.value })} placeholder="e.g. Casting & Ghat, Stone setting" />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-[var(--gold)]" /> Active (can
          receive work)
        </label>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────── piece "next step" helper
/** Returns the primary actions available for a piece in its current state. */
export function usePieceActions(piece: Piece) {
  const db = useDB();
  const wo = activeWO(db, piece);
  const jw = activeJW(db, piece);
  const woCat = wo ? db.settings.workStatuses.find((s) => s.id === wo.statusId)?.category : undefined;
  return { wo, jw, woCat };
}

export function ActionTile({ icon, title, sub, onClick, primary }: { icon: ReactNode; title: string; sub: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5",
        primary ? "border-gold/50 bg-gradient-to-r from-gold/15 to-transparent" : "border-line bg-panel hover:border-line-2",
      )}
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", primary ? "gold-fill" : "border border-line-2 bg-panel-2 text-gold")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}
export const IssueWorkDialog = gate(IssueWorkBody);
export const ReviewDialog = gate(ReviewBody);
export const StatusDialog = gate(StatusBody);
export const ProgressDialog = gate(ProgressBody);
export const SubmitWorkDialog = gate(SubmitWorkBody);
export const SendJobDialog = gate(SendJobBody);
export const ReceiveJobDialog = gate(ReceiveJobBody);
export const ReadyDialog = gate(ReadyBody);
export const DeliveryDialog = gate(DeliveryBody);
export const MoveStageDialog = gate(MoveStageBody);
export const AddPhotosDialog = gate(AddPhotosBody);
export const NoteDialog = gate(NoteBody);
export const CustomerDialog = gate(CustomerBody);
export const ArtisanDialog = gate(ArtisanBody);
