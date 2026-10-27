"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, MessageCircle, Pencil, Phone, Plus, Users } from "lucide-react";
import { useDB } from "@/lib/store";
import { coverPhoto, isOrderOpen, orderProgress, pieceOf, piecesOf } from "@/lib/queries";
import { date, g } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf-client";
import { Avatar, Bar, Button, Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { DueChip, OrderStatusPill, Timeline } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { CustomerDialog } from "@/components/actions";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const [edit, setEdit] = useState(false);
  const c = db.customers.find((x) => x.id === id);
  if (!c)
    return (
      <Panel>
        <Empty icon={<Users className="size-7" />} title="Customer not found" />
      </Panel>
    );
  const orders = db.orders.filter((o) => o.customerId === c.id);
  const dels = db.deliveries.filter((d) => d.customerId === c.id);
  const pieces = orders.flatMap((o) => piecesOf(db, o.id));
  const deliveredMg = dels.reduce((s, d) => s + d.items.reduce((a, i) => a + i.weightMg, 0), 0);
  const acts = db.activity.filter((a) => a.orderId && orders.some((o) => o.id === a.orderId)).slice(0, 25);

  return (
    <div>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        kicker={`${c.code} · ${c.type}`}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={c.name} hue={(c.name.charCodeAt(0) * 37) % 360} size={56} />
            {c.name}
          </span>
        }
        sub={
          <>
            {c.city} · {c.phone}
            {c.email ? ` · ${c.email}` : ""}
            {c.notes && <span className="mt-1 block italic">“{c.notes}”</span>}
          </>
        }
        actions={
          <>
            <Button variant="soft" icon={<Phone className="size-4" />} href={`tel:${c.phone}`}>
              Call
            </Button>
            <Button variant="soft" icon={<MessageCircle className="size-4" />} onClick={() => window.open(`https://wa.me/91${c.phone.slice(-10)}`, "_blank")}>
              WhatsApp
            </Button>
            <Button variant="soft" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button variant="gold" icon={<Plus className="size-4" />} href="/orders/new">
              New order
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total orders", orders.length],
          ["Open orders", orders.filter((o) => isOrderOpen(db, o)).length],
          ["Pieces", pieces.length],
          ["Gold delivered", g(deliveredMg)],
        ].map(([k, v]) => (
          <Panel key={k as string} className="p-4">
            <div className="font-display tabular text-3xl font-semibold">{v}</div>
            <div className="text-xs text-muted">{k}</div>
          </Panel>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel className="p-5">
            <SectionTitle kicker="Order history" title="Orders" />
            <div className="space-y-2">
              {orders.map((o) => {
                const ps = piecesOf(db, o.id);
                return (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3 transition hover:border-gold/40"
                  >
                    <Thumb photos={ps.map(coverPhoto).filter(Boolean) as never} className="size-14" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{o.title}</div>
                      <div className="text-xs text-muted">
                        {o.number} · received {date(o.orderDate)} · {ps.length} pcs
                      </div>
                      <Bar value={orderProgress(db, o)} className="mt-2 max-w-xs" />
                    </div>
                    <div className="hidden flex-col items-end gap-1 sm:flex">
                      <OrderStatusPill order={o} />
                      <DueChip iso={o.dueDate} done={!isOrderOpen(db, o)} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>
          <Panel className="p-5">
            <SectionTitle kicker="Handover record" title="Delivery history" />
            {dels.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-faint">
                      <th className="py-2">Note</th>
                      <th>Date</th>
                      <th>Pieces</th>
                      <th>Weight</th>
                      <th>Received by</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {dels.map((d) => (
                      <tr key={d.id} className="border-t border-line">
                        <td className="py-3 font-semibold">{d.number}</td>
                        <td>{date(d.date)}</td>
                        <td className="text-muted">{d.items.map((i) => pieceOf(db, i.pieceId)?.name).join(", ")}</td>
                        <td className="tabular">{g(d.items.reduce((s, i) => s + i.weightMg, 0))}</td>
                        <td>{d.receivedBy}</td>
                        <td>
                          <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("delivery-note", d.id)}>
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-faint">No deliveries yet.</div>
            )}
          </Panel>
        </div>
        <Panel className="p-5">
          <SectionTitle kicker="Follow-ups" title="Activity" />
          <Timeline items={acts} dense />
        </Panel>
      </div>
      <CustomerDialog open={edit} onClose={() => setEdit(false)} customer={c} />
    </div>
  );
}
