"use client";
import { useState } from "react";
import Link from "next/link";
import { Hammer, Phone, Plus, UserPlus } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { artisanLoad, coverPhoto, pieceOf } from "@/lib/queries";
import { cn, gShort } from "@/lib/format";
import { Avatar, Button, PageHeader, Ring, Tone } from "@/components/ui";
import { ArtisanDialog, IssueWorkDialog } from "@/components/actions";

export default function KarigarsPage() {
  const db = useDB();
  const canManage = useCan("artisans.manage");
  const canAssign = useCan("artisans.assign");
  const [add, setAdd] = useState(false);
  const [assign, setAssign] = useState<string | null>(null);
  return (
    <div>
      <PageHeader
        kicker="Workshop"
        title="Karigars"
        sub="Artisan-wise work allocation, metal in hand, pending submissions and weight performance."
        actions={
          canManage && (
            <Button variant="gold" icon={<UserPlus className="size-4" />} onClick={() => setAdd(true)}>
              Add karigar
            </Button>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {db.artisans.map((a, i) => {
          const l = artisanLoad(db, a.id);
          const issued = l.done.reduce((s, w) => s + w.issuedWeightMg, 0);
          const lossPct = issued ? (l.lossMg / issued) * 100 : 0;
          return (
            <div key={a.id} className="panel-lux rise overflow-hidden p-5" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-4">
                <Ring value={l.open.length / 5} size={66} stroke={4} color={l.overdue.length ? "var(--danger)" : "var(--gold)"}>
                  <Avatar name={a.name} hue={a.hue} size={52} />
                </Ring>
                <div className="min-w-0 flex-1">
                  <Link href={`/karigars/${a.id}`} className="font-display block truncate text-2xl font-semibold hover:text-gold">
                    {a.name}
                  </Link>
                  <div className="truncate text-sm text-gold">{a.speciality}</div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Phone className="size-3" /> {a.phone} · {a.city}
                  </div>
                </div>
                {!a.active && <Tone tone="muted">Inactive</Tone>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Open", l.open.length, ""],
                  ["Review", l.submitted.length, l.submitted.length ? "text-info" : ""],
                  ["Late", l.overdue.length, l.overdue.length ? "text-danger" : ""],
                  ["Done", l.done.length, ""],
                ].map(([k, v, c]) => (
                  <div key={k as string} className="rounded-xl bg-panel-2 py-2">
                    <div className={cn("font-display tabular text-2xl font-semibold", c as string)}>{v}</div>
                    <div className="text-[10px] text-muted">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted">
                  Metal in hand <b className="tabular text-text">{gShort(l.metalOutMg)}</b>
                </span>
                <span className={cn("tabular font-semibold", Math.abs(lossPct) > db.settings.weightTolerancePct ? "text-danger" : "text-ok")}>
                  Avg. loss {lossPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-3 flex h-12 gap-1.5">
                {l.open.slice(0, 6).map((w) => {
                  const p = pieceOf(db, w.pieceId);
                  const c = p && coverPhoto(p);
                  return c ? (
                    <Link key={w.id} href={`/pieces/${p.id}`} title={p.name}>
                      <img src={c.url} alt="" className="size-12 rounded-xl object-cover" />
                    </Link>
                  ) : null;
                })}
                {!l.open.length && <span className="self-center text-xs text-faint">No work in hand — available</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="soft" className="flex-1" href={`/karigars/${a.id}`} icon={<Hammer className="size-4" />}>
                  Work sheet
                </Button>
                {canAssign && (
                  <Button variant="gold" className="flex-1" icon={<Plus className="size-4" />} onClick={() => setAssign(a.id)}>
                    Assign work
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ArtisanDialog open={add} onClose={() => setAdd(false)} />
      <IssueWorkDialog open={!!assign} onClose={() => setAssign(null)} artisanId={assign ?? undefined} />
    </div>
  );
}
