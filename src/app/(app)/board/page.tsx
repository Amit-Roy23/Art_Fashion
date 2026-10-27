"use client";
import { useState } from "react";
import Link from "next/link";
import { GripVertical, Hand } from "lucide-react";
import { useDB } from "@/lib/store";
import { activeWO, artisanOf, coverPhoto, orderOf, customerOf, workCategory } from "@/lib/queries";
import { cn, gShort } from "@/lib/format";
import { Avatar, PageHeader, Select } from "@/components/ui";
import { DueChip, LocationPill, PriorityBadge, WorkStatusPill } from "@/components/domain";
import { MoveStageDialog } from "@/components/actions";

export default function BoardPage() {
  const db = useDB();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [move, setMove] = useState<{ pieceId: string; stageId: string } | null>(null);
  const [art, setArt] = useState("");
  const [loc, setLoc] = useState("");
  const live = db.pieces.filter((p) => p.location !== "DELIVERED" && (!art || p.artisanId === art) && (!loc || p.location === loc));

  return (
    <div>
      <PageHeader
        kicker="Workshop floor"
        title="Production board"
        sub={
          <span className="inline-flex items-center gap-1.5">
            <Hand className="size-4 text-gold" /> Drag a piece to another stage — you&apos;ll be asked for remarks. Stage names are customisable in Settings.
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-40 rounded-full">
              <option value="">Everywhere</option>
              <option value="OFFICE">In office</option>
              <option value="ARTISAN">With karigars</option>
              <option value="JOBWORK">At job work</option>
              <option value="READY">Ready</option>
            </Select>
            <Select value={art} onChange={(e) => setArt(e.target.value)} className="w-44 rounded-full">
              <option value="">All karigars</option>
              {db.artisans.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {db.settings.stages.map((s) => {
          const ps = live.filter((p) => p.stageId === s.id);
          return (
            <section
              key={s.id}
              id={s.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const pid = e.dataTransfer.getData("text/plain");
                const p = db.pieces.find((x) => x.id === pid);
                if (p && p.stageId !== s.id) setMove({ pieceId: pid, stageId: s.id });
              }}
              className={cn("panel flex w-[290px] shrink-0 snap-start flex-col transition", over === s.id && "border-gold bg-gold/5")}
            >
              <header className="flex items-center gap-2 border-b border-line p-3.5">
                <span className="size-3 rounded-full" style={{ background: s.color, boxShadow: `0 0 14px ${s.color}` }} />
                <span className="flex-1 truncate text-sm font-semibold">{s.name}</span>
                <span className="tabular rounded-full bg-panel-2 px-2 py-0.5 text-xs font-bold">{ps.length}</span>
              </header>
              <div className="scroll-thin flex max-h-[calc(100dvh-280px)] min-h-[200px] flex-col gap-2.5 overflow-y-auto p-2.5">
                {ps.map((p) => {
                  const o = orderOf(db, p.orderId)!;
                  const wo = activeWO(db, p);
                  const a = artisanOf(db, p.artisanId);
                  const cover = coverPhoto(p);
                  return (
                    <Link
                      key={p.id}
                      href={`/pieces/${p.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", p.id);
                        setDrag(p.id);
                      }}
                      onDragEnd={() => setDrag(null)}
                      className={cn(
                        "group rounded-2xl border border-line bg-solid/70 p-2.5 transition hover:border-gold/40",
                        drag === p.id && "rotate-2 opacity-50",
                      )}
                    >
                      <div className="flex gap-2.5">
                        {cover && <img src={cover.url} alt="" className="size-14 rounded-xl object-cover" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold tracking-wider text-gold">{p.code}</span>
                            <PriorityBadge p={o.priority} />
                          </div>
                          <div className="truncate text-[13px] font-semibold">{p.name}</div>
                          <div className="truncate text-[11px] text-muted">
                            {customerOf(db, o.customerId)?.name} · {gShort(p.currentWeightMg ?? p.estWeightMg)}
                          </div>
                        </div>
                        <GripVertical className="size-4 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <LocationPill piece={p} />
                        {wo && <WorkStatusPill wo={wo} />}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        {a ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted">
                            <Avatar name={a.name} hue={a.hue} size={20} /> {a.name}
                          </span>
                        ) : (
                          <span />
                        )}
                        {!(wo && workCategory(db, wo.statusId) === "SUBMITTED") && <DueChip iso={wo?.dueDate ?? o.dueDate} done={p.location === "READY"} />}
                      </div>
                    </Link>
                  );
                })}
                {!ps.length && (
                  <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line-2 py-10 text-xs text-faint">Drop pieces here</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {move && <MoveStageDialog open onClose={() => setMove(null)} pieceId={move.pieceId} stageId={move.stageId} />}
    </div>
  );
}
