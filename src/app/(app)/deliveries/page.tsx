"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, PackageCheck, ScrollText, Share2, Truck } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { coverPhoto, customerOf, orderOf, pieceOf, piecesOf } from "@/lib/queries";
import { date, g, inr } from "@/lib/format";
import { downloadPdf, sharePdf } from "@/lib/pdf-client";
import { Button, Empty, PageHeader, Panel, SectionTitle, Select } from "@/components/ui";
import { DueChip } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { ChallanDialog, DeliveryDialog } from "@/components/actions";

export default function DeliveriesPage() {
  const db = useDB();
  const can = useCan("delivery.create");
  const [deliver, setDeliver] = useState<string | null>(null);
  const [challan, setChallan] = useState(false);
  const [cust, setCust] = useState("");
  const readyOrders = db.orders.filter((o) => piecesOf(db, o.id).some((p) => p.location === "READY"));
  const dels = db.deliveries.filter((d) => !cust || d.customerId === cust);
  const challans = db.challans.filter((c) => !cust || c.customerId === cust);
  return (
    <div>
      <PageHeader
        kicker="Dispatch"
        title="Customer deliveries"
        sub="Ready pieces waiting for handover, delivery / road challans with weight and value, and the customer-wise delivery register."
        actions={
          can && (
            <Button variant="gold" icon={<ScrollText className="size-4" />} onClick={() => setChallan(true)}>
              New delivery challan
            </Button>
          )
        }
      />
      <SectionTitle kicker={`${readyOrders.length} orders`} title="Ready for handover" />
      {readyOrders.length ? (
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {readyOrders.map((o) => {
            const ready = piecesOf(db, o.id).filter((p) => p.location === "READY");
            const total = piecesOf(db, o.id).length;
            const c = customerOf(db, o.customerId);
            return (
              <Panel lux key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-gold">{o.number}</span>
                  <DueChip iso={o.dueDate} />
                </div>
                <Link href={`/orders/${o.id}`} className="font-display mt-1 block truncate text-xl font-semibold hover:text-gold">
                  {o.title}
                </Link>
                <div className="text-xs text-muted">
                  {c?.name} · {c?.phone}
                </div>
                <div className="mt-3 flex gap-2">
                  {ready.map((p) => (
                    <Thumb key={p.id} photo={coverPhoto(p)} photos={p.photos} className="size-16" />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {ready.length} of {total} ready · <b className="tabular text-text">{g(ready.reduce((s, p) => s + (p.finalWeightMg ?? 0), 0))}</b>
                  </span>
                  {can && (
                    <Button size="sm" variant="gold" icon={<Truck className="size-3.5" />} onClick={() => setDeliver(o.id)}>
                      Deliver
                    </Button>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="mb-8">
          <Empty icon={<PackageCheck className="size-7" />} title="Nothing waiting" sub="Pieces appear here after QC." />
        </Panel>
      )}

      <SectionTitle kicker="Goods out" title="Delivery / road challans" />
      <Panel className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-faint">
              <th className="p-4">Challan</th>
              <th>Customer</th>
              <th>Order</th>
              <th>Date</th>
              <th>Mode / vehicle</th>
              <th className="text-right">Weight</th>
              <th className="text-right">Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {challans.map((c) => {
              const cu = customerOf(db, c.customerId);
              const o = orderOf(db, c.orderId);
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-panel">
                  <td className="p-4 font-semibold">{c.number}</td>
                  <td>{cu?.name}</td>
                  <td>
                    <Link href={`/orders/${o?.id}`} className="text-muted hover:text-gold">
                      {o?.number}
                    </Link>
                  </td>
                  <td>{date(c.date)}</td>
                  <td className="text-muted">
                    {c.mode}
                    {c.vehicleNo ? ` · ${c.vehicleNo}` : ""}
                  </td>
                  <td className="tabular text-right">{g(c.items.reduce((s, i) => s + i.weightMg, 0))}</td>
                  <td className="tabular text-right">{inr(c.items.reduce((s, i) => s + i.valueRs, 0))}</td>
                  <td className="pr-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("delivery-challan", c.id)}>
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Share challan"
                      icon={<Share2 className="size-3.5" />}
                      onClick={() => sharePdf("delivery-challan", c.id, cu?.phone, `Delivery challan ${c.number} from ${db.settings.company.name}`)}
                    />
                  </td>
                </tr>
              );
            })}
            {!challans.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-faint">
                  No challans yet — create one from an order or with “New delivery challan”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <SectionTitle
        kicker="History"
        title="Delivery register"
        action={
          <Select value={cust} onChange={(e) => setCust(e.target.value)} className="w-52 rounded-full">
            <option value="">All customers</option>
            {db.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        }
      />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-faint">
              <th className="p-4">Note</th>
              <th>Customer</th>
              <th>Order</th>
              <th>Pieces</th>
              <th>Weight</th>
              <th>Date</th>
              <th>Mode / received by</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dels.map((d) => {
              const c = customerOf(db, d.customerId);
              const o = orderOf(db, d.orderId);
              return (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-panel">
                  <td className="p-4 font-semibold">{d.number}</td>
                  <td>
                    <Link href={`/customers/${c?.id}`} className="hover:text-gold">
                      {c?.name}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/orders/${o?.id}`} className="text-muted hover:text-gold">
                      {o?.number}
                    </Link>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {d.items.map((i) => {
                        const p = pieceOf(db, i.pieceId)!;
                        return <Thumb key={i.pieceId} photo={coverPhoto(p)} photos={p.photos} className="size-9" />;
                      })}
                    </div>
                  </td>
                  <td className="tabular">{g(d.items.reduce((s, i) => s + i.weightMg, 0))}</td>
                  <td>{date(d.date)}</td>
                  <td className="text-muted">
                    {d.mode} · {d.receivedBy}
                  </td>
                  <td className="pr-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("delivery-note", d.id)}>
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Share2 className="size-3.5" />}
                      onClick={() => sharePdf("delivery-note", d.id, c?.phone, `Delivery note ${d.number} from ${db.settings.company.name}`)}
                    />
                  </td>
                </tr>
              );
            })}
            {!dels.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-faint">
                  No deliveries recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      <DeliveryDialog open={!!deliver} onClose={() => setDeliver(null)} orderId={deliver ?? undefined} />
      <ChallanDialog open={challan} onClose={() => setChallan(false)} />
    </div>
  );
}
