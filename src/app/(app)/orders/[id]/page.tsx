"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Download,
  MessageCircle,
  MessageSquareText,
  Phone,
  Truck,
  Workflow,
  CalendarCheck2,
  Hammer,
  PackageCheck,
  ClipboardList,
} from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { customerOf, orderCat, orderProgress, orderStatus, piecesOf } from "@/lib/queries";
import { cn, date, g } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf-client";
import { Bar, Button, Empty, KeyVal, Panel, SectionTitle } from "@/components/ui";
import { DueChip, OrderStatusPill, PieceCard, PriorityBadge, Timeline } from "@/components/domain";
import { PhotoGrid } from "@/components/photos";
import { AddPhotosDialog, DeliveryDialog, NoteDialog, StatusDialog } from "@/components/actions";
import { activityFor } from "@/lib/queries";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const canStatus = useCan("orders.status");
  const canDeliver = useCan("delivery.create");
  const [dlg, setDlg] = useState<null | "status" | "photos" | "note" | "deliver">(null);
  const o = db.orders.find((x) => x.id === id);
  if (!o)
    return (
      <Panel>
        <Empty icon={<ClipboardList className="size-7" />} title="Order not found" action={<Button href="/orders">Back to orders</Button>} />
      </Panel>
    );

  const c = customerOf(db, o.customerId);
  const ps = piecesOf(db, o.id);
  const cat = orderCat(db, o);
  const prog = orderProgress(db, o);
  const wos = db.workOrders.filter((w) => ps.some((p) => p.id === w.pieceId));
  const dels = db.deliveries.filter((d) => d.orderId === o.id);
  const readyCount = ps.filter((p) => p.location === "READY").length;
  const firstWork = wos.map((w) => w.issuedAt).sort()[0];
  const lastReady = ps
    .map((p) => p.readyAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const lastDel = dels
    .map((d) => d.date)
    .sort()
    .at(-1);
  const allPhotos = [...o.photos, ...ps.flatMap((p) => p.photos)];
  const estTotal = ps.reduce((s, p) => s + p.estWeightMg, 0);
  const finalTotal = ps.every((p) => p.finalWeightMg) ? ps.reduce((s, p) => s + (p.finalWeightMg ?? 0), 0) : undefined;
  const st = orderStatus(db, o);
  const waText = `Dear ${c?.name}, update from ${db.settings.company.name}: your order ${o.number} (${o.title}) is now “${st?.label}”. ${Math.round(prog * 100)}% complete. Thank you!`;

  const milestones = [
    { icon: ClipboardList, label: "Order received", at: o.orderDate, done: true },
    { icon: Hammer, label: "Production started", at: firstWork, done: !!firstWork },
    { icon: PackageCheck, label: ps.length > 1 ? `Ready (${ps.filter((p) => p.readyAt).length}/${ps.length})` : "Ready", at: lastReady, done: !!lastReady },
    { icon: Truck, label: cat === "PARTIAL" ? "Partially delivered" : "Delivered", at: lastDel, done: !!lastDel },
  ];

  return (
    <div>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft className="size-4" /> Orders
      </Link>

      <Panel lux className="rise mb-6 overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold tracking-wider text-gold">{o.number}</span>
              <span className="rounded-md border border-line-2 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted uppercase">
                {o.type === "PROJECT" ? `Project · ${ps.length} pieces` : "Single piece"}
              </span>
              <PriorityBadge p={o.priority} />
            </div>
            <h1 className="font-display mt-1 text-4xl leading-tight font-semibold md:text-5xl">{o.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <Link href={`/customers/${c?.id}`} className="font-semibold text-text hover:text-gold">
                {c?.name}
              </Link>
              <span>{c?.city}</span>
              <a href={`tel:${c?.phone}`} className="inline-flex items-center gap-1 hover:text-gold">
                <Phone className="size-3.5" /> {c?.phone}
              </a>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <OrderStatusPill order={o} />
              <DueChip iso={o.dueDate} done={cat === "DONE"} />
              <span className="text-xs text-faint">Due {date(o.dueDate)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canDeliver && readyCount > 0 && (
              <Button variant="gold" icon={<Truck className="size-4" />} onClick={() => setDlg("deliver")}>
                Deliver ({readyCount})
              </Button>
            )}
            {canStatus && (
              <Button variant="soft" icon={<Workflow className="size-4" />} onClick={() => setDlg("status")}>
                Update status
              </Button>
            )}
            <Button variant="soft" icon={<Camera className="size-4" />} onClick={() => setDlg("photos")}>
              Photos
            </Button>
            <Button variant="soft" icon={<MessageSquareText className="size-4" />} onClick={() => setDlg("note")}>
              Note
            </Button>
            <Button
              variant="soft"
              icon={<MessageCircle className="size-4" />}
              onClick={() => window.open(`https://wa.me/91${c?.phone.slice(-10)}?text=${encodeURIComponent(waText)}`, "_blank")}
            >
              WhatsApp update
            </Button>
          </div>
        </div>

        {/* lifecycle */}
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {milestones.map((m, i) => (
            <div key={m.label} className={cn("relative rounded-2xl border p-3", m.done ? "border-gold/40 bg-gold/10" : "border-line bg-panel")}>
              <div className="flex items-center gap-2">
                <m.icon className={cn("size-4", m.done ? "text-gold" : "text-faint")} />
                <span className={cn("text-xs font-semibold", m.done ? "text-text" : "text-faint")}>{m.label}</span>
              </div>
              <div className={cn("font-display mt-1 text-xl font-semibold", !m.done && "text-faint")}>{m.done ? date(m.at) : "—"}</div>
              {i < 3 && <span className="absolute top-1/2 -right-3 hidden h-px w-3 bg-gold/40 md:block" />}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <CalendarCheck2 className="size-4 text-gold" />
          <Bar value={prog} className="h-2 flex-1" />
          <span className="tabular text-sm font-semibold">{Math.round(prog * 100)}%</span>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div>
            <SectionTitle kicker="Piece-wise tracking" title={`Pieces (${ps.length})`} />
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {ps.map((p) => (
                <PieceCard key={p.id} piece={p} />
              ))}
            </div>
          </div>
          <Panel className="p-5">
            <SectionTitle kicker="Every photo of this order" title={`Gallery (${allPhotos.length})`} />
            <PhotoGrid photos={allPhotos} className="sm:grid-cols-5" />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-5">
            <SectionTitle kicker="Details" title="Order record" />
            <div className="grid grid-cols-2 gap-4">
              <KeyVal k="Received" v={date(o.orderDate)} />
              <KeyVal k="Booked by" v={o.createdBy} />
              <KeyVal k="Est. weight" v={<span className="tabular">{g(estTotal)}</span>} />
              <KeyVal k="Final weight" v={<span className="tabular">{finalTotal ? g(finalTotal) : "In progress"}</span>} />
              <KeyVal k="Work orders" v={wos.length} />
              <KeyVal k="Customer type" v={c?.type} />
            </div>
            <div className="mt-4 rounded-xl border-l-2 border-gold/50 bg-panel px-3 py-2 text-sm text-muted italic">“{o.remarks}”</div>
          </Panel>

          {!!dels.length && (
            <Panel className="p-5">
              <SectionTitle kicker="Handover" title="Deliveries" />
              <div className="space-y-2">
                {dels.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
                    <Truck className="size-5 text-ok" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {d.number} · {d.items.length} pc
                      </div>
                      <div className="text-xs text-muted">
                        {date(d.date)} · {d.mode} · {d.receivedBy}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("delivery-note", d.id)}>
                      PDF
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel className="p-5">
            <SectionTitle kicker="Audit trail" title="Order timeline" />
            <Timeline items={activityFor(db, { orderId: o.id })} dense />
          </Panel>
        </div>
      </div>

      <StatusDialog open={dlg === "status"} onClose={() => setDlg(null)} kind="order" id={o.id} />
      <AddPhotosDialog open={dlg === "photos"} onClose={() => setDlg(null)} target={{ orderId: o.id }} />
      <NoteDialog open={dlg === "note"} onClose={() => setDlg(null)} target={{ orderId: o.id }} />
      <DeliveryDialog open={dlg === "deliver"} onClose={() => setDlg(null)} orderId={o.id} />
    </div>
  );
}
