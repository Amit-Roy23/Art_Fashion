"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Hammer,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  Send,
  Sparkles,
  Tag,
  Truck,
  Undo2,
  Workflow,
  BadgeCheck,
  ScrollText,
} from "lucide-react";
import { useDB } from "@/lib/store";
import type { Activity, JobWork, Order, Piece, WorkOrder } from "@/lib/types";
import {
  activeJW,
  activeWO,
  activityFor,
  artisanOf,
  coverPhoto,
  jobStatus,
  orderOf,
  orderStatus,
  overTolerance,
  stageOf,
  vendorOf,
  weightJourney,
  workCategory,
  workStatus,
} from "@/lib/queries";
import { ago, cn, date, dateShort, dateTime, diff, dueLabel, g } from "@/lib/format";
import { Avatar, Pill, Tone } from "./ui";
import { Thumb } from "./photos";

// ─────────────────────────────────────────────── status pills
export function OrderStatusPill({ order }: { order: Order }) {
  const db = useDB();
  const s = orderStatus(db, order);
  return <Pill color={s?.color}>{s?.label ?? "—"}</Pill>;
}
export function WorkStatusPill({ wo }: { wo: WorkOrder }) {
  const db = useDB();
  const s = workStatus(db, wo);
  return <Pill color={s?.color}>{s?.label ?? "—"}</Pill>;
}
export function JobStatusPill({ jw }: { jw: JobWork }) {
  const db = useDB();
  const s = jobStatus(db, jw);
  return <Pill color={s?.color}>{s?.label ?? "—"}</Pill>;
}
export function StagePill({ stageId, className }: { stageId: string; className?: string }) {
  const db = useDB();
  const s = stageOf(db, stageId);
  return (
    <Pill color={s?.color} className={className}>
      {s?.name ?? "—"}
    </Pill>
  );
}

const LOC: Record<Piece["location"], { label: string; tone: "info" | "warn" | "gold" | "ok" | "muted" }> = {
  OFFICE: { label: "In office", tone: "info" },
  ARTISAN: { label: "With karigar", tone: "warn" },
  JOBWORK: { label: "At job work", tone: "gold" },
  READY: { label: "Ready", tone: "ok" },
  DELIVERED: { label: "Delivered", tone: "muted" },
};
export function LocationPill({ piece }: { piece: Piece }) {
  const db = useDB();
  const l = LOC[piece.location];
  const who =
    piece.location === "ARTISAN"
      ? artisanOf(db, piece.artisanId)?.name.split(" ")[0]
      : piece.location === "JOBWORK"
        ? vendorOf(db, activeJW(db, piece)?.vendorId ?? "")?.name.split(" ")[0]
        : undefined;
  return <Tone tone={l.tone}>{who ? `${l.label} · ${who}` : l.label}</Tone>;
}

export function DueChip({ iso, done }: { iso?: string; done?: boolean }) {
  if (done) return <span className="text-xs text-faint">{date(iso)}</span>;
  const d = dueLabel(iso);
  return <Tone tone={d.tone === "danger" ? "danger" : d.tone === "warn" ? "warn" : "muted"}>{d.text}</Tone>;
}

export function PriorityBadge({ p }: { p: Order["priority"] }) {
  if (p === "Normal") return null;
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", p === "VIP" ? "gold-fill" : "bg-danger/15 text-danger")}>
      {p}
    </span>
  );
}

// ─────────────────────────────────────────────── piece card
export function PieceCard({ piece, compact, footer }: { piece: Piece; compact?: boolean; footer?: ReactNode }) {
  const db = useDB();
  const order = orderOf(db, piece.orderId);
  const wo = activeWO(db, piece);
  const art = artisanOf(db, piece.artisanId);
  const cover = coverPhoto(piece);
  return (
    <Link href={`/pieces/${piece.id}`} className="group panel block overflow-hidden transition hover:-translate-y-0.5 hover:border-gold/40">
      <div className={cn("relative overflow-hidden", compact ? "aspect-[16/10]" : "aspect-[4/3]")}>
        {cover && <img src={cover.url} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">{order && <PriorityBadge p={order.priority} />}</div>
        <div className="absolute top-2.5 right-2.5">
          <span className="rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">{piece.photos.length} 📷</span>
        </div>
        <div className="absolute inset-x-3 bottom-2.5">
          <div className="text-[10px] font-bold tracking-wider text-[#f8dfa2]">{piece.code}</div>
          <div className="font-display truncate text-lg leading-tight font-semibold text-white">{piece.name}</div>
        </div>
      </div>
      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StagePill stageId={piece.stageId} />
          <LocationPill piece={piece} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="tabular">
            {piece.purity} · {g(piece.currentWeightMg ?? piece.estWeightMg)}
          </span>
          {art && <Avatar name={art.name} hue={art.hue} size={22} />}
        </div>
        {wo && (
          <div className="flex items-center justify-between text-[11px]">
            <WorkStatusPill wo={wo} />
            {workCategory(db, wo.statusId) !== "SUBMITTED" && <DueChip iso={wo.dueDate} />}
          </div>
        )}
        {footer}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────── stage rail
export function StageRail({ piece }: { piece: Piece }) {
  const db = useDB();
  const stages = db.settings.stages;
  const cur = stages.findIndex((s) => s.id === piece.stageId);
  const finished = piece.location === "READY" || piece.location === "DELIVERED";
  return (
    <div className="no-scrollbar overflow-x-auto">
      <ol className="flex min-w-max items-start">
        {stages.map((s, i) => {
          const done = finished || i < cur;
          const now = !finished && i === cur;
          return (
            <li key={s.id} className="flex items-start">
              <div className="flex w-[104px] flex-col items-center text-center">
                <span
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full border-2 text-xs font-bold transition",
                    done ? "border-transparent text-black" : now ? "border-gold bg-gold/15 text-gold" : "border-line-2 text-faint",
                  )}
                  style={
                    done
                      ? { background: s.color }
                      : now
                        ? { boxShadow: `0 0 0 6px color-mix(in oklab, ${s.color} 18%, transparent), 0 0 24px ${s.color}` }
                        : undefined
                  }
                >
                  {done ? <CheckCircle2 className="size-4" /> : i + 1}
                  {now && <span className="absolute -inset-1 animate-ping rounded-full border border-gold/40" />}
                </span>
                <span className={cn("mt-2 text-[11px] leading-tight font-semibold", now ? "text-text" : done ? "text-muted" : "text-faint")}>{s.name}</span>
              </div>
              {i < stages.length - 1 && <span className={cn("mt-[17px] h-0.5 w-6 rounded-full", i < cur || finished ? "bg-gold/60" : "bg-line-2")} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────── weight journey
export function WeightJourney({ piece }: { piece: Piece }) {
  const db = useDB();
  const pts = weightJourney(db, piece);
  const max = Math.max(...pts.map((p) => p.mg));
  return (
    <div className="space-y-0">
      {pts.map((p, i) => {
        const d = diff(p.baseMg, p.mg);
        const flagged = overTolerance(db, p.baseMg, p.mg) && p.kind !== "final";
        return (
          <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < pts.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-line-2" />}
            <span
              className={cn(
                "z-10 mt-1 grid size-[27px] shrink-0 place-items-center rounded-full border text-[10px]",
                flagged ? "border-danger/50 bg-danger/15 text-danger" : "border-gold/40 bg-gold/10 text-gold",
              )}
            >
              {p.kind === "issue" || p.kind === "send" ? (
                <ArrowUpRight className="size-3.5" />
              ) : p.kind === "est" ? (
                <Tag className="size-3.5" />
              ) : p.kind === "deliver" ? (
                <Truck className="size-3.5" />
              ) : (
                <ArrowDownLeft className="size-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate text-sm font-semibold">{p.label}</div>
                <div className="tabular font-display shrink-0 text-lg font-semibold whitespace-nowrap">{g(p.mg)}</div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span className="truncate">
                  {p.sub} · {dateShort(p.at)}
                </span>
                {d && (
                  <span className={cn("tabular shrink-0 font-semibold", flagged ? "text-danger" : d.mg < 0 ? "text-warn" : "text-ok")}>
                    {flagged && <AlertTriangle className="mr-0.5 inline size-3" />}
                    {d.label} ({d.pct.toFixed(2)}%)
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-3 to-gold-2" style={{ width: `${(p.mg / max) * 100}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────── activity
const ICONS: Record<Activity["icon"], { icon: typeof Send; color: string }> = {
  order: { icon: ClipboardList, color: "var(--info)" },
  assign: { icon: Hammer, color: "var(--warn)" },
  submit: { icon: Send, color: "#38bdf8" },
  approve: { icon: BadgeCheck, color: "var(--ok)" },
  rework: { icon: Undo2, color: "var(--danger)" },
  jobout: { icon: Sparkles, color: "var(--gold)" },
  jobin: { icon: RefreshCcw, color: "var(--gold)" },
  deliver: { icon: Truck, color: "var(--ok)" },
  challan: { icon: ScrollText, color: "var(--info)" },
  status: { icon: Workflow, color: "#c084fc" },
  photo: { icon: Camera, color: "var(--rose)" },
  stage: { icon: Workflow, color: "#fb923c" },
  note: { icon: MessageSquareText, color: "var(--muted)" },
  ready: { icon: PackageCheck, color: "var(--ok)" },
};

export function Timeline({ items, dense }: { items: Activity[]; dense?: boolean }) {
  if (!items.length) return <div className="py-8 text-center text-sm text-faint">No activity yet</div>;
  return (
    <ol className="relative">
      {items.map((a, i) => {
        const I = ICONS[a.icon];
        return (
          <li key={a.id} className={cn("relative flex gap-3", dense ? "pb-4" : "pb-5", "last:pb-0")}>
            {i < items.length - 1 && <span className="absolute top-9 bottom-1 left-[17px] w-px bg-line" />}
            <span
              className="z-10 grid size-9 shrink-0 place-items-center rounded-xl border"
              style={{
                color: I.color,
                borderColor: `color-mix(in oklab, ${I.color} 35%, transparent)`,
                background: `color-mix(in oklab, ${I.color} 10%, transparent)`,
              }}
            >
              <I.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[13px] leading-snug font-medium">{a.text}</div>
              {a.remarks && <div className="mt-1 rounded-lg border-l-2 border-gold/40 bg-panel px-2.5 py-1.5 text-xs text-muted italic">“{a.remarks}”</div>}
              {!!a.photos?.length && (
                <div className="mt-2 flex gap-1.5">
                  {a.photos.slice(0, 4).map((p) => (
                    <Thumb key={p.id} photo={p} photos={a.photos} className="size-12" />
                  ))}
                </div>
              )}
              <div className="mt-1 text-[11px] text-faint" title={dateTime(a.at)}>
                {a.by} · {ago(a.at)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityFeed({ limit = 30, filter }: { limit?: number; filter?: { orderId?: string; pieceId?: string; artisanId?: string } }) {
  const db = useDB();
  const items = (filter ? activityFor(db, filter) : db.activity).slice(0, limit);
  return (
    <div className="p-5">
      <Timeline items={items} />
    </div>
  );
}

export function WeightDelta({ base, value }: { base?: number; value?: number }) {
  const db = useDB();
  const d = diff(base, value);
  if (!d) return <span className="text-faint">—</span>;
  const bad = overTolerance(db, base, value);
  return (
    <span className={cn("tabular text-xs font-semibold", bad ? "text-danger" : d.mg < 0 ? "text-warn" : "text-ok")}>
      {bad && <AlertTriangle className="mr-0.5 inline size-3" />}
      {d.label} · {d.pct.toFixed(2)}%
    </span>
  );
}

// ─────────────────────────────────────────────── metal
const METAL_COLORS: Record<string, [string, string]> = {
  Gold: ["#f8dfa2", "#a8772b"],
  Silver: ["#f3f6f9", "#8a939d"],
  Copper: ["#ffc7a6", "#9a4b27"],
};
export const metalColor = (metal?: string) => METAL_COLORS[metal ?? ""]?.[1] ?? "var(--muted)";

export function MetalSwatch({ metal, size = 28 }: { metal: string; size?: number }) {
  const [a, b] = METAL_COLORS[metal] ?? ["#d6d3d1", "#57534e"];
  return (
    <span
      className="inline-block shrink-0 rounded-full shadow-inner ring-1 ring-black/20"
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${a}, ${b})` }}
      aria-hidden
    />
  );
}

export function MetalPill({ metal }: { metal?: string }) {
  if (!metal) return null;
  return <Pill color={metalColor(metal)}>{metal}</Pill>;
}
