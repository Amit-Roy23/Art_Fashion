"use client";
import { useMemo, useState } from "react";
import { Gem, Search } from "lucide-react";
import { useDB } from "@/lib/store";
import { orderOf, customerOf } from "@/lib/queries";
import type { Piece } from "@/lib/types";
import { Empty, Input, PageHeader, Panel, Segmented, Select } from "@/components/ui";
import { PieceCard } from "@/components/domain";

type L = "ALL" | Piece["location"];

export default function PiecesPage() {
  const db = useDB();
  const [loc, setLoc] = useState<L>("ALL");
  const [stage, setStage] = useState("");
  const [art, setArt] = useState("");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.pieces
      .filter((p) => (loc === "ALL" || p.location === loc) && (!stage || p.stageId === stage) && (!art || p.artisanId === art))
      .filter((p) => !s || [p.code, p.name, p.category, customerOf(db, orderOf(db, p.orderId)!.customerId)?.name].some((x) => x?.toLowerCase().includes(s)))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [db, loc, stage, art, q]);
  const n = (l: L) => db.pieces.filter((p) => l === "ALL" || p.location === l).length;
  return (
    <div>
      <PageHeader
        kicker="Piece register"
        title="Every piece, every place"
        sub="Individual jewellery items across all orders — where each one is, who has it, and its latest photo."
      />
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmented
          value={loc}
          onChange={setLoc}
          options={[
            { value: "ALL", label: "All", count: n("ALL") },
            { value: "OFFICE", label: "In office", count: n("OFFICE") },
            { value: "ARTISAN", label: "With karigars", count: n("ARTISAN") },
            { value: "JOBWORK", label: "Job work", count: n("JOBWORK") },
            { value: "READY", label: "Ready", count: n("READY") },
            { value: "DELIVERED", label: "Delivered", count: n("DELIVERED") },
          ]}
        />
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-[1fr_200px_200px]">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, name, customer…" className="rounded-full pl-10" />
          </div>
          <Select value={stage} onChange={(e) => setStage(e.target.value)} className="rounded-full">
            <option value="">All stages</option>
            {db.settings.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={art} onChange={(e) => setArt(e.target.value)} className="rounded-full">
            <option value="">All karigars</option>
            {db.artisans.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((p) => (
            <PieceCard key={p.id} piece={p} />
          ))}
        </div>
      ) : (
        <Panel>
          <Empty icon={<Gem className="size-7" />} title="No pieces match" sub="Clear a filter to see more." />
        </Panel>
      )}
    </div>
  );
}
