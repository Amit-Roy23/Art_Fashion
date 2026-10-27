"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, Search, UserPlus, Users } from "lucide-react";
import { useDB } from "@/lib/store";
import { isOrderOpen, piecesOf } from "@/lib/queries";
import { date } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { Avatar, Button, Empty, Input, PageHeader, Panel, Segmented } from "@/components/ui";
import { CustomerDialog } from "@/components/actions";

export default function CustomersPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | Customer["type"]>("ALL");
  const [add, setAdd] = useState(false);
  const rows = useMemo(
    () =>
      db.customers.filter(
        (c) => (type === "ALL" || c.type === type) && (!q || [c.name, c.phone, c.city, c.code].some((x) => x.toLowerCase().includes(q.toLowerCase()))),
      ),
    [db, q, type],
  );
  return (
    <div>
      <PageHeader
        kicker="Clientele"
        title="Customers"
        sub="Customer-wise orders, deliveries and follow-ups."
        actions={
          <Button variant="gold" icon={<UserPlus className="size-4" />} onClick={() => setAdd(true)}>
            New customer
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, city…" className="rounded-full pl-10" />
        </div>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "ALL", label: "All" },
            { value: "Retail", label: "Retail" },
            { value: "Showroom", label: "Showroom" },
            { value: "Wholesale", label: "Wholesale" },
          ]}
        />
      </div>
      {!rows.length ? (
        <Panel>
          <Empty icon={<Users className="size-7" />} title="No customers found" />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c, i) => {
            const orders = db.orders.filter((o) => o.customerId === c.id);
            const open = orders.filter((o) => isOrderOpen(db, o)).length;
            const delivered = orders.flatMap((o) => piecesOf(db, o.id)).filter((p) => p.location === "DELIVERED").length;
            const last = orders
              .map((o) => o.orderDate)
              .sort()
              .at(-1);
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="panel rise group block p-5 transition hover:-translate-y-0.5 hover:border-gold/40"
                style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} hue={(c.name.charCodeAt(0) * 37) % 360} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display truncate text-xl font-semibold group-hover:text-gold">{c.name}</div>
                    <div className="truncate text-xs text-muted">
                      {c.type} · {c.city}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-faint">{c.code}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Orders", orders.length],
                    ["Open", open],
                    ["Delivered pcs", delivered],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl bg-panel-2 py-2">
                      <div className="font-display tabular text-2xl font-semibold">{v}</div>
                      <div className="text-[10px] text-muted">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" /> {c.phone}
                  </span>
                  <span>Last order {date(last)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <CustomerDialog open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
