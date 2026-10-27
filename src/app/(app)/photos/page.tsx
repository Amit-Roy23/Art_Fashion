"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Images, Search } from "lucide-react";
import { useDB } from "@/lib/store";
import { customerOf, orderOf } from "@/lib/queries";
import type { Photo } from "@/lib/types";
import { dateShort } from "@/lib/format";
import { Empty, Input, PageHeader, Panel, Segmented } from "@/components/ui";
import { useLightbox } from "@/components/photos";

type K = "all" | Photo["kind"];

export default function PhotoVault() {
  const db = useDB();
  const open = useLightbox();
  const [k, setK] = useState<K>("all");
  const [q, setQ] = useState("");
  const all = useMemo(() => {
    const out: { p: Photo; href: string; label: string; sub: string }[] = [];
    const seen = new Set<string>();
    db.orders.forEach((o) =>
      o.photos.forEach((p) => out.push({ p, href: `/orders/${o.id}`, label: o.number, sub: `${o.title} · ${customerOf(db, o.customerId)?.name}` })),
    );
    db.pieces.forEach((pc) => {
      const o = orderOf(db, pc.orderId);
      pc.photos.forEach((p) => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        out.push({ p, href: `/pieces/${pc.id}`, label: pc.code, sub: `${pc.name} · ${customerOf(db, o!.customerId)?.name}` });
      });
    });
    return out.sort((a, b) => b.p.at.localeCompare(a.p.at));
  }, [db]);
  const rows = all.filter(
    (r) => (k === "all" || r.p.kind === k) && (!q || [r.label, r.sub, r.p.caption, r.p.by].some((x) => x?.toLowerCase().includes(q.toLowerCase()))),
  );
  const n = (x: K) => all.filter((r) => x === "all" || r.p.kind === x).length;
  return (
    <div>
      <PageHeader
        kicker="Centralised"
        title="Photo vault"
        sub="Every photograph — customer references, design sketches, karigar progress, job work, final and delivery shots — searchable in one place."
      />
      <div className="mb-5 flex flex-col gap-3 xl:flex-row">
        <Segmented
          value={k}
          onChange={setK}
          options={[
            { value: "all", label: "All", count: n("all") },
            { value: "design", label: "Design", count: n("design") + n("reference") },
            { value: "progress", label: "Progress", count: n("progress") },
            { value: "submission", label: "Karigar", count: n("submission") },
            { value: "jobwork", label: "Job work", count: n("jobwork") },
            { value: "final", label: "Final", count: n("final") },
            { value: "delivery", label: "Delivery", count: n("delivery") },
          ]}
        />
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Piece code, customer, caption, uploaded by…" className="rounded-full pl-10" />
        </div>
      </div>
      {!rows.length ? (
        <Panel>
          <Empty icon={<Images className="size-7" />} title="No photos" />
        </Panel>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 2xl:columns-5">
          {rows.map((r, i) => (
            <div key={r.p.id + i} className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-line">
              <button
                onClick={() =>
                  open(
                    rows.map((x) => x.p),
                    i,
                  )
                }
                className="block w-full"
              >
                <img
                  src={r.p.url}
                  alt=""
                  loading="lazy"
                  className={
                    i % 3 === 0
                      ? "aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"
                      : "aspect-square w-full object-cover transition duration-700 group-hover:scale-105"
                  }
                />
              </button>
              <Link href={r.href} className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 text-white">
                <div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#e6bb6a]">
                  {r.p.kind} · {dateShort(r.p.at)}
                </div>
                <div className="truncate text-sm font-semibold">{r.label}</div>
                <div className="truncate text-[11px] text-white/70">{r.sub}</div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
