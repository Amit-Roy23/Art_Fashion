"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Hammer } from "lucide-react";
import { useDB, useUser } from "@/lib/store";
import { coverPhoto, pieceOf, stageOf, workCategory } from "@/lib/queries";
import { daysLeft, g, gShort } from "@/lib/format";
import { Empty, Panel, Segmented } from "@/components/ui";
import { DueChip, WorkStatusPill } from "@/components/domain";

export default function KarigarHome() {
  const db = useDB();
  const user = useUser()!;
  const [t, setT] = useState<"now" | "sent" | "done">("now");
  const mine = db.workOrders.filter((w) => w.artisanId === user.artisanId);
  const groups = {
    now: mine.filter((w) => !["SUBMITTED", "DONE"].includes(workCategory(db, w.statusId))),
    sent: mine.filter((w) => workCategory(db, w.statusId) === "SUBMITTED"),
    done: mine.filter((w) => workCategory(db, w.statusId) === "DONE"),
  };
  const list = [...groups[t]].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const metal = groups.now.reduce((s, w) => s + w.issuedWeightMg, 0);
  const late = groups.now.filter((w) => daysLeft(w.dueDate) < 0).length;
  return (
    <div>
      <div className="rise">
        <div className="text-[11px] font-bold uppercase tracking-[.24em] text-gold">Namaste</div>
        <h1 className="font-display text-4xl font-semibold">{user.name}</h1>
        <p className="text-sm text-muted">{user.title}</p>
      </div>
      <div className="rise mt-5 grid grid-cols-3 gap-2" style={{ animationDelay: ".05s" }}>
        {[
          ["In hand", groups.now.length],
          ["Gold with you", gShort(metal)],
          ["Late", late],
        ].map(([k, v], i) => (
          <Panel key={k as string} lux={i === 1} className="p-3 text-center">
            <div className={i === 2 && late ? "font-display tabular text-3xl font-semibold text-danger" : "font-display tabular text-3xl font-semibold"}>
              {v}
            </div>
            <div className="text-[11px] text-muted">{k}</div>
          </Panel>
        ))}
      </div>
      <Segmented
        className="mt-5 w-full"
        value={t}
        onChange={setT}
        options={[
          { value: "now", label: "To do", count: groups.now.length },
          { value: "sent", label: "Submitted", count: groups.sent.length },
          { value: "done", label: "Done", count: groups.done.length },
        ]}
      />
      <div className="mt-4 space-y-3">
        {list.map((w, i) => {
          const p = pieceOf(db, w.pieceId)!;
          const c = coverPhoto(p);
          return (
            <Link
              key={w.id}
              href={`/k/${w.id}`}
              className="panel rise flex items-center gap-3 p-2.5 active:scale-[.99]"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {c && <img src={c.url} alt="" className="size-[84px] rounded-2xl object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-wider text-gold">{w.number}</div>
                <div className="truncate text-[15px] font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted">
                  {stageOf(db, w.stageId)?.name} · {g(w.issuedWeightMg)}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <WorkStatusPill wo={w} />
                  {t === "now" && <DueChip iso={w.dueDate} />}
                </div>
              </div>
              <ChevronRight className="size-5 text-faint" />
            </Link>
          );
        })}
        {!list.length && (
          <Panel>
            <Empty
              icon={<Hammer className="size-7" />}
              title={t === "now" ? "No work in hand" : "Nothing here"}
              sub={t === "now" ? "New work orders from the office appear here instantly." : undefined}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
