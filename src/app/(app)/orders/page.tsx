"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Hammer, LayoutGrid, Plus, Rows3, Search } from "lucide-react";
import { useDB } from "@/lib/store";
import { coverPhoto, customerOf, liveWeight, orderCat, orderOf, orderProgress, pieceOf, piecesOf } from "@/lib/queries";
import { cn, date, g } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Avatar, Bar, Button, Empty, Input, PageHeader, Panel, Segmented } from "@/components/ui";
import { DueChip, MetalPill, MetalSwatch, OrderStatusPill, PriorityBadge } from "@/components/domain";
import { RegisterExport, RegisterTable } from "@/components/register";
import { filterWork, workRegister, type WorkFilter } from "@/lib/registers";

type F = "all" | "pending" | "production" | "ready" | "done";
const MATCH: Record<F, (c: string) => boolean> = {
  all: () => true,
  pending: (c) => c === "NEW" || c === "HOLD",
  production: (c) => c === "ACTIVE",
  ready: (c) => c === "READY" || c === "PARTIAL",
  done: (c) => c === "DONE" || c === "CANCELLED",
};

const orderWeight = (db: ReturnType<typeof useDB>, o: Order) => piecesOf(db, o.id).reduce((s, p) => s + liveWeight(p), 0);

export default function OrdersPage() {
  // pages render client-side only (behind <Ready>), so reading the URL here is safe
  const [tab, setTab] = useState<"orders" | "karigar">(() => (new URLSearchParams(location.search).get("tab") === "karigar" ? "karigar" : "orders"));
  const [metal, setMetal] = useState(() => new URLSearchParams(location.search).get("metal") ?? "");
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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "orders",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="size-3.5" /> Orders
                </span>
              ),
            },
            {
              value: "karigar",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Hammer className="size-3.5" /> Karigar-wise
                </span>
              ),
            },
          ]}
        />
        <MetalFilter value={metal} onChange={setMetal} />
      </div>
      {tab === "orders" ? <OrderList metal={metal} /> : <KarigarWise metal={metal} />}
    </div>
  );
}

/** Metal chips with the running (undelivered) weight per metal. */
function MetalFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const db = useDB();
  const running = (m: string) =>
    db.orders
      .filter((o) => o.metal === m && !["DONE", "CANCELLED"].includes(orderCat(db, o)))
      .flatMap((o) => piecesOf(db, o.id))
      .filter((p) => p.location !== "DELIVERED")
      .reduce((s, p) => s + liveWeight(p), 0);
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      <button
        onClick={() => onChange("")}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
          !value ? "border-gold bg-gold/15 text-text" : "border-line text-muted hover:text-text",
        )}
      >
        All metals
      </button>
      {db.settings.metals.map((m) => (
        <button
          key={m.name}
          onClick={() => onChange(value === m.name ? "" : m.name)}
          title={`Running ${m.name.toLowerCase()} weight (undelivered pieces)`}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-xs font-semibold transition",
            value === m.name ? "border-gold bg-gold/15 text-text" : "border-line text-muted hover:text-text",
          )}
        >
          <MetalSwatch metal={m.name} size={20} />
          {m.name}
          <span className="tabular font-normal text-faint">{g(running(m.name))}</span>
        </button>
      ))}
    </div>
  );
}

function OrderList({ metal }: { metal: string }) {
  const db = useDB();
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
        (!metal || o.metal === metal) &&
        (type === "ALL" || o.type === type) &&
        (!s || [o.number, o.title, c?.name, c?.phone].some((x) => x?.toLowerCase().includes(s)))
      );
    });
  }, [db, f, type, q, metal]);

  const count = (k: F) => db.orders.filter((o) => MATCH[k](orderCat(db, o)) && (!metal || o.metal === metal)).length;
  const totalMg = rows.reduce((s, o) => s + orderWeight(db, o), 0);

  return (
    <div>
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

      {!!rows.length && (
        <div className="mb-3 text-xs text-muted">
          {rows.length} order{rows.length === 1 ? "" : "s"}
          {metal ? ` in ${metal.toLowerCase()}` : ""} · total weight <b className="tabular text-text">{g(totalMg)}</b>
          <span className="text-faint"> (final weight where QC is done, otherwise latest / estimated)</span>
        </div>
      )}
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
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-[.16em] text-faint">
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Metal</th>
                <th className="p-4 text-right">Weight</th>
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
                    <td className="p-4">
                      <MetalPill metal={o.metal} />
                    </td>
                    <td className="tabular p-4 text-right whitespace-nowrap">{g(orderWeight(db, o))}</td>
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
          <span className="ml-auto">
            <MetalPill metal={o.metal} />
          </span>
        </div>
        <div className="font-display mt-1 truncate text-xl font-semibold">{o.title}</div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">
            {c?.name} · {c?.city}
          </span>
          <span className="tabular shrink-0 font-semibold text-text">{g(orderWeight(db, o))}</span>
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

/** Shortlist karigars and see / export their work orders with weights. */
function KarigarWise({ metal }: { metal: string }) {
  const db = useDB();
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState<WorkFilter>("pending");
  const [q, setQ] = useState("");
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const base = db.workOrders.filter((w) => {
    const p = pieceOf(db, w.pieceId);
    const o = p && orderOf(db, p.orderId);
    const s = q.trim().toLowerCase();
    return (
      (!picked.length || picked.includes(w.artisanId)) &&
      (!metal || o?.metal === metal) &&
      (!s || [w.number, p?.name, p?.code, o?.number, o?.title].some((x) => x?.toLowerCase().includes(s)))
    );
  });
  const list = filterWork(db, base, filter);
  const names = picked.map((id) => db.artisans.find((a) => a.id === id)?.name).filter(Boolean);
  const spec = workRegister(db, list, {
    title: "Karigar-wise Work List",
    fileName: `Karigar-work-${names.length === 1 ? names[0]!.replace(/\s+/g, "-") : "list"}-${new Date().toISOString().slice(0, 10)}`,
    subtitle: `${names.length ? names.join(", ") : "All karigars"} · ${filter} work orders${metal ? ` · ${metal}` : ""}`,
    showKarigar: true,
  });
  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">
            Shortlist karigars {picked.length ? `(${picked.length})` : "· showing all"}
          </div>
          {!!picked.length && (
            <button onClick={() => setPicked([])} className="text-xs text-gold hover:underline">
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-5">
          {db.artisans.map((a) => {
            const open = db.workOrders.filter((w) => w.artisanId === a.id && filterWork(db, [w], "pending").length);
            const inHand = open.filter((w) => !w.submittedAt).reduce((s, w) => s + w.issuedWeightMg, 0);
            const on = picked.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition",
                  on ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
                )}
              >
                <Avatar name={a.name} hue={a.hue} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.name}</span>
                  <span className="tabular block truncate text-[11px] text-muted">
                    {open.length} pending · {g(inHand)} in hand
                  </span>
                </span>
                <span
                  className={cn("grid size-5 shrink-0 place-items-center rounded-md border text-[11px]", on ? "gold-fill border-transparent" : "border-line-2")}
                >
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "Pending", count: filterWork(db, base, "pending").length },
            { value: "completed", label: "Completed", count: filterWork(db, base, "completed").length },
            { value: "all", label: "All", count: base.length },
          ]}
        />
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="WO no., piece, order…" className="rounded-full pl-10" />
        </div>
        <RegisterExport spec={spec} />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {spec.stats!.map((x) => (
          <Panel key={x.label} className="p-3">
            <div className="font-display tabular text-xl font-semibold break-words">{x.value}</div>
            <div className="text-[11px] text-muted">{x.label}</div>
          </Panel>
        ))}
      </div>
      <Panel className="p-4">
        <RegisterTable spec={spec} empty="No work orders for this selection" />
      </Panel>
    </div>
  );
}
