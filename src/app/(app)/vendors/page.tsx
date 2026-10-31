"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import * as ops from "@/lib/ops";
import { run, useCan, useDB } from "@/lib/store";
import { coverPhoto, pieceOf } from "@/lib/queries";
import { date, g } from "@/lib/format";
import type { Vendor } from "@/lib/types";
import { Button, Empty, IconButton, PageHeader, Panel } from "@/components/ui";
import { VendorDialog } from "@/components/actions";

export default function VendorsPage() {
  const db = useDB();
  const can = useCan("jobwork.manage");
  const [edit, setEdit] = useState<Vendor | "new" | null>(null);
  const vendors = db.settings.vendors;
  return (
    <div>
      <PageHeader
        kicker="Outside job workers"
        title="Vendors"
        sub="Polishing, plating, meenakari and hallmarking partners — open a vendor to see their complete work register."
        actions={
          can && (
            <Button variant="gold" icon={<Plus className="size-4" />} onClick={() => setEdit("new")}>
              Add vendor
            </Button>
          )
        }
      />
      {!vendors.length ? (
        <Panel>
          <Empty icon={<Truck className="size-7" />} title="No vendors yet" sub="Add the job workers you send pieces to." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v, i) => {
            const jobs = db.jobWorks.filter((j) => j.vendorId === v.id);
            const out = jobs.filter((j) => !j.returnedAt);
            const back = jobs.filter((j) => j.returnedAt);
            const late = out.filter((j) => new Date(j.expectedDate) < new Date());
            const last = jobs
              .map((j) => j.dispatchDate)
              .sort()
              .at(-1);
            return (
              <Panel lux key={v.id} className="rise flex flex-col p-5" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                    <Truck className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/vendors/${v.id}`} className="font-display block truncate text-2xl font-semibold hover:text-gold">
                      {v.name}
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Phone className="size-3" /> {v.phone || "—"} · {v.city || "—"}
                    </div>
                  </div>
                  {can && (
                    <div className="flex">
                      <IconButton label="Edit vendor" onClick={() => setEdit(v)} className="size-8">
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Delete vendor"
                        onClick={() => run((d) => ops.deleteVendor(d, v.id), "Vendor removed")}
                        className="size-8 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {v.processes.map((p) => (
                    <span key={p} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                      {p}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Out now", out.length],
                    ["Late", late.length],
                    ["Returned", back.length],
                    ["Total", jobs.length],
                  ].map(([k, n]) => (
                    <div key={k as string} className="rounded-xl bg-panel-2 py-2">
                      <div className={`font-display tabular text-xl font-semibold ${k === "Late" && n ? "text-danger" : ""}`}>{n}</div>
                      <div className="text-[10px] text-muted">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>
                    Weight out <b className="tabular text-text">{g(out.reduce((s, j) => s + j.sentWeightMg, 0))}</b>
                  </span>
                  <span>Last sent {date(last)}</span>
                </div>
                <div className="mt-3 flex h-10 gap-1.5">
                  {out.slice(0, 6).map((j) => {
                    const p = pieceOf(db, j.pieceId);
                    const c = p && coverPhoto(p);
                    return c ? <img key={j.id} src={c.url} alt={p.name} title={p.name} className="size-10 rounded-lg object-cover" /> : null;
                  })}
                  {!out.length && <span className="self-center text-xs text-faint">Nothing with this vendor right now</span>}
                </div>
                <Button href={`/vendors/${v.id}`} variant="soft" className="mt-4">
                  Work register <ArrowRight className="size-4" />
                </Button>
              </Panel>
            );
          })}
        </div>
      )}
      <VendorDialog open={!!edit} onClose={() => setEdit(null)} vendor={edit && edit !== "new" ? edit : undefined} />
    </div>
  );
}
