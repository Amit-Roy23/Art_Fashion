"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, LayoutGrid, Plus, Rows3, Search } from "lucide-react";
import { useDB } from "@/lib/store";
import { coverPhoto, customerOf, orderCat, orderProgress, piecesOf } from "@/lib/queries";
import { cn, date, g } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Bar, Button, Empty, Input, PageHeader, Panel, Segmented } from "@/components/ui";
import { DueChip, OrderStatusPill, PriorityBadge } from "@/components/domain";

type F = "all" | "pending" | "production" | "ready" | "done";
const MATCH: Record<F, (c: string) => boolean> = {
  all: () => true,
  pending: (c) => c === "NEW" || c === "HOLD",
  production: (c) => c === "ACTIVE",
  ready: (c) => c === "READY" || c === "PARTIAL",
  done: (c) => c === "DONE" || c === "CANCELLED",
};

export default function OrdersPage() {
  const db = useDB();
  // pages render client-side only (behind <Ready>), so reading the URL here is safe
  const [f, setF] = useState<F>(() => {
    const v = new URLSearchParams(location.search).get("f");
    return v && v in MATCH ? (v as F) : "all";
  });
  const [type, setType] = useState<"ALL" | Order["type"]>("ALL");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.orders.filter((o) => {
      const c = customerOf(db, o.customerId);
      return (
        MATCH[f](orderCat(db, o)) &&
        (type === "ALL" || o.type === type) &&
        (!s || [o.number, o.title, c?.name, c?.phone].some((x) => x?.toLowerCase().includes(s)))
      );
    });
  }, [db, f, type, q]);

  const count = (k: F) => db.orders.filter((o) => MATCH[k](orderCat(db, o))).length;

  return (
    <div>
      <PageHeader
        kicker="Order book"
        title="Customer orders"
        sub="Project orders (sets with many pieces) and single piece orders — every one tracked piece-by-piece from receipt to delivery."
        actions={
          <Button variant="gold" href="/orders/new" icon={<Plus className="size-4" />}>
            New order
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmented
          value={f}
          onChange={setF}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "pending", label: "Pending", count: count("pending") },
            { value: "production", label: "In production", count: count("production") },
            { value: "ready", label: "Ready", count: count("ready") },
            { value: "done", label: "Completed", count: count("done") },
          ]}
        />
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no., title, customer, phone" className="rounded-full pl-10" />
          </div>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "ALL", label: "All types" },
              { value: "PROJECT", label: "Project" },
              { value: "PIECE", label: "Piece" },
            ]}
            className="hidden md:inline-flex"
          />
          <div className="flex rounded-full border border-line bg-panel p-1">
            <button
              onClick={() => setView("cards")}
              aria-label="Card view"
              className={cn("grid size-8 place-items-center rounded-full", view === "cards" ? "bg-gold/20 text-gold" : "text-faint")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              aria-label="Table view"
              className={cn("grid size-8 place-items-center rounded-full", view === "table" ? "bg-gold/20 text-gold" : "text-faint")}
            >
              <Rows3 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {!rows.length ? (
        <Panel>
          <Empty
            icon={<ClipboardList className="size-7" />}
            title="No orders here"
            sub="Try another filter or create a new order."
            action={
              <Button variant="gold" href="/orders/new">
                New order
              </Button>
            }
          />
        </Panel>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((o, i) => (
            <OrderCard key={o.id} order={o} delay={i} />
          ))}
        </div>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-[.16em] text-faint">
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Received</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Status</th>
                <th className="p-4">Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const ps = piecesOf(db, o.id);
                const cat = orderCat(db, o);
                return (
                  <tr key={o.id} className="border-b border-line transition last:border-0 hover:bg-panel">
                    <td className="p-4">
                      <Link href={`/orders/${o.id}`} className="flex items-center gap-3">
                        <img src={coverPhoto(ps[0])?.url ?? o.photos[0]?.url} alt="" className="size-10 rounded-lg object-cover" />
                        <span>
                          <span className="block font-semibold hover:text-gold">{o.title}</span>
                          <span className="text-xs text-faint">{o.number}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-4">{customerOf(db, o.customerId)?.name}</td>
                    <td className="p-4 text-muted">
                      {o.type === "PROJECT" ? "Project" : "Piece"} · {ps.length}
                    </td>
                    <td className="p-4 text-muted">{date(o.orderDate)}</td>
                    <td className="w-40 p-4">
                      <Bar value={orderProgress(db, o)} />
                    </td>
                    <td className="p-4">
                      <OrderStatusPill order={o} />
                    </td>
                    <td className="p-4">
                      <DueChip iso={o.dueDate} done={cat === "DONE"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function OrderCard({ order: o, delay }: { order: Order; delay: number }) {
  const db = useDB();
  const ps = piecesOf(db, o.id);
  const c = customerOf(db, o.customerId);
  const prog = orderProgress(db, o);
  const covers = ps.map(coverPhoto).filter(Boolean);
  const cat = orderCat(db, o);
  return (
    <Link
      href={`/orders/${o.id}`}
      className="panel rise group block overflow-hidden transition hover:-translate-y-1 hover:border-gold/40"
      style={{ animationDelay: `${Math.min(delay, 10) * 0.04}s` }}
    >
      <div
        className={cn(
          "grid h-44 gap-0.5 overflow-hidden",
          covers.length >= 3 ? "grid-cols-[2fr_1fr] grid-rows-2" : covers.length === 2 ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {covers.slice(0, 3).map((p, i) => (
          <div key={p!.id} className={cn("relative overflow-hidden", covers.length >= 3 && i === 0 && "row-span-2")}>
            <img src={p!.url} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
            {i === 2 && covers.length > 3 && (
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-bold text-white">+{covers.length - 3}</span>
            )}
          </div>
        ))}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-bold tracking-wider text-gold">{o.number}</span>
          <span className="rounded-md border border-line-2 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted uppercase">
            {o.type === "PROJECT" ? `Project · ${ps.length} pcs` : "Piece"}
          </span>
          <PriorityBadge p={o.priority} />
        </div>
        <div className="font-display mt-1 truncate text-xl font-semibold">{o.title}</div>
        <div className="truncate text-xs text-muted">
          {c?.name} · {c?.city} · est. {g(ps.reduce((s, p) => s + p.estWeightMg, 0))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Bar value={prog} className="flex-1" />
          <span className="tabular text-xs font-semibold text-muted">{Math.round(prog * 100)}%</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <OrderStatusPill order={o} />
          <DueChip iso={o.dueDate} done={cat === "DONE" || cat === "CANCELLED"} />
        </div>
      </div>
    </Link>
  );
}
