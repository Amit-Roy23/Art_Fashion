"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, Minus, Plus, Printer, RotateCcw, Save, ScanLine, Search, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { run, useDB } from "@/lib/store";
import { coverPhoto, customerOf, orderOf } from "@/lib/queries";
import { DEFAULT_TAG, netMg, pieceByTagCode, tagCode, tagFor, tagProblem, tagSettings, type TagData } from "@/lib/tags";
import { downloadTags } from "@/lib/pdf-client";
import { cn, g } from "@/lib/format";
import type { Piece, TagSettings } from "@/lib/types";
import { Button, Empty, Field, Input, PageHeader, Panel, SectionTitle, Segmented, Select } from "@/components/ui";
import { LocationPill } from "@/components/domain";
import { TagPreview } from "@/components/tag";

type F = "ready" | "production" | "delivered" | "all";
const IN: Record<F, (p: Piece) => boolean> = {
  ready: (p) => p.location === "READY",
  production: (p) => p.location !== "READY" && p.location !== "DELIVERED",
  delivered: (p) => p.location === "DELIVERED",
  all: () => true,
};

/** Pixels per millimetre so the whole tag (body + tail) fits the preview box. */
function useFit(totalMm: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPx(Math.max(2, Math.min(6, e.contentRect.width / totalMm))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalMm]);
  return [ref, px] as const;
}

/** Reads the query string with Next's hook (correct on client-side navigation) and
 * remounts the page when it changes, so ?filters from links always apply. */
export default function TagsPage() {
  return (
    <Suspense fallback={null}>
      <WithParams />
    </Suspense>
  );
}

function WithParams() {
  const sp = useSearchParams();
  return <TagsBody key={sp.toString()} sp={sp} />;
}

function TagsBody({ sp }: { sp: URLSearchParams }) {
  const db = useDB();
  const [selected, setSelected] = useState<TagData[]>(() => {
    const q = sp;
    const ids = q.get("pieces")?.split(",") ?? (q.get("order") ? db.pieces.filter((p) => p.orderId === q.get("order")).map((p) => p.id) : []);
    return ids
      .map((id) => db.pieces.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => tagFor(db, p!));
  });
  const [s, setS] = useState<TagSettings>(() => tagSettings(db));
  const [f, setF] = useState<F>(sp.has("order") || sp.has("pieces") ? "all" : "ready");
  const [orderId, setOrderId] = useState(sp.get("order") ?? "");
  const [q, setQ] = useState("");
  const [scan, setScan] = useState("");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [boxRef, px] = useFit(s.bodyMm + s.tailMm + 4);

  const isSel = (id: string) => selected.some((t) => t.pieceId === id);
  const toggle = (p: Piece) => setSelected(isSel(p.id) ? selected.filter((t) => t.pieceId !== p.id) : [...selected, tagFor(db, p)]);
  const patch = (id: string, v: Partial<TagData>) => setSelected(selected.map((t) => (t.pieceId === id ? { ...t, ...v } : t)));

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.pieces
      .filter((p) => IN[f](p) && (!orderId || p.orderId === orderId))
      .filter(
        (p) =>
          !term ||
          [p.code, p.name, tagCode(p), orderOf(db, p.orderId)?.title, customerOf(db, orderOf(db, p.orderId)?.customerId ?? "")?.name].some((x) =>
            x?.toLowerCase().includes(term),
          ),
      );
  }, [db, f, orderId, q]);

  const onScan = () => {
    const p = pieceByTagCode(db, scan);
    if (!p) return toast.error(`No piece found for “${scan}”`);
    if (!isSel(p.id)) setSelected((cur) => [...cur, tagFor(db, p)]);
    toast.success(`${p.code} added`);
    setScan("");
  };

  const saved = JSON.stringify(s) === JSON.stringify(tagSettings(db));
  const totalTags = selected.reduce((n, t) => n + Math.max(1, t.copies), 0);
  const print = (mode: "roll" | "sheet") => {
    const bad = selected.map(tagProblem).find(Boolean);
    if (bad) return toast.error(bad);
    // remember the less weight on each piece for its next tag
    const changed = selected.filter((t) => (db.pieces.find((p) => p.id === t.pieceId)?.lessWeightMg ?? 0) !== t.lessMg);
    if (changed.length) run((d) => changed.forEach((t) => (d.pieces.find((p) => p.id === t.pieceId)!.lessWeightMg = t.lessMg)));
    downloadTags(selected, s, mode);
  };
  const preview = selected[Math.min(previewIdx, selected.length - 1)] ?? (list[0] ? tagFor(db, list[0]) : undefined);
  const pageW = s.pageIncludesTail ? s.bodyMm + s.tailMm : s.bodyMm;
  const num = (v: string, min: number, max: number) => Math.max(min, Math.min(max, +v || min));

  return (
    <div>
      <PageHeader
        kicker="Labels"
        title="Jewellery tags"
        sub="Barcode tags with gross, less and net weight, purity and tag number — printed on the rat-tail tag roll from the label printer, or on A4 to test first."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        {/* ───── pick pieces */}
        <Panel className="p-5">
          <SectionTitle kicker="Step 1" title="Choose pieces" />
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gold" />
              <Input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && scan.trim() && onScan()}
                placeholder="Scan or type a tag / piece code, press Enter"
                className="rounded-full pl-10"
              />
            </div>
          </div>
          <div className="mb-3 flex flex-col gap-2">
            <Segmented
              value={f}
              onChange={setF}
              options={[
                { value: "ready", label: "Ready", count: db.pieces.filter(IN.ready).length },
                { value: "production", label: "In production", count: db.pieces.filter(IN.production).length },
                { value: "delivered", label: "Delivered", count: db.pieces.filter(IN.delivered).length },
                { value: "all", label: "All", count: db.pieces.length },
              ]}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="rounded-full">
                <option value="">All orders</option>
                {db.orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} · {o.title}
                  </option>
                ))}
              </Select>
              <div className="relative">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="rounded-full pl-10" />
              </div>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>{list.length} pieces</span>
            <div className="flex gap-3">
              <button
                className="font-semibold text-gold hover:underline"
                onClick={() => setSelected([...selected, ...list.filter((p) => !isSel(p.id)).map((p) => tagFor(db, p))])}
              >
                Select all
              </button>
              {!!selected.length && (
                <button className="font-semibold text-muted hover:text-text" onClick={() => setSelected([])}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="scroll-thin max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
            {list.map((p) => {
              const on = isSel(p.id);
              const c = coverPhoto(p);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition",
                    on ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border text-[11px]",
                      on ? "gold-fill border-transparent" : "border-line-2",
                    )}
                  >
                    {on ? "✓" : ""}
                  </span>
                  {c ? <img src={c.url} alt="" className="size-11 rounded-lg object-cover" /> : <span className="size-11 rounded-lg bg-panel-2" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="tabular block truncate text-[11px] text-muted">
                      {p.code} · {g(p.finalWeightMg ?? p.currentWeightMg ?? p.estWeightMg)}
                      {` · ${p.purity}`}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <LocationPill piece={p} />
                  </span>
                </button>
              );
            })}
            {!list.length && <div className="py-8 text-center text-sm text-faint">No pieces in this view</div>}
          </div>
        </Panel>

        {/* ───── design + print */}
        <div className="space-y-6">
          <Panel lux className="p-5">
            <SectionTitle
              kicker="Step 2"
              title="Tag preview"
              action={
                selected.length > 1 && (
                  <span className="text-xs text-muted">
                    {Math.min(previewIdx, selected.length - 1) + 1} / {selected.length}
                  </span>
                )
              }
            />
            <div ref={boxRef} className="facet-bg flex min-h-[150px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-bg-2 p-4">
              {preview ? <TagPreview tag={preview} settings={s} pxPerMm={px} /> : <div className="text-sm text-faint">Select a piece to preview its tag</div>}
            </div>
            {selected.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
                {selected.map((t, i) => (
                  <button
                    key={t.pieceId}
                    onClick={() => setPreviewIdx(i)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                      i === Math.min(previewIdx, selected.length - 1) ? "border-gold bg-gold/15" : "border-line text-muted",
                    )}
                  >
                    {t.barcode}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-faint">
              Actual size {s.bodyMm} × {s.heightMm} mm body + {s.tailMm} mm tail. Barcode: Code 128, readable by any USB barcode scanner — scanning a tag in the
              search box opens the piece.
            </p>
          </Panel>

          <Panel className="p-5">
            <SectionTitle
              kicker="Step 3"
              title={`Tags to print (${totalTags})`}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" icon={<FileDown className="size-4" />} disabled={!selected.length} onClick={() => print("sheet")}>
                    A4 test sheet
                  </Button>
                  <Button variant="gold" icon={<Printer className="size-4" />} disabled={!selected.length} onClick={() => print("roll")}>
                    Print tags
                  </Button>
                </div>
              }
            />
            {!selected.length ? (
              <Empty icon={<Tag className="size-7" />} title="No tags yet" sub="Pick pieces on the left, or scan their codes." />
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-faint">
                      <th className="py-2">Piece</th>
                      <th>WT (g)</th>
                      <th>Less (g)</th>
                      <th>Net (g)</th>
                      <th className="text-center">Copies</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((t, i) => (
                      <tr key={t.pieceId} className="border-b border-line last:border-0" onClick={() => setPreviewIdx(i)}>
                        <td className="py-2 pr-2">
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-[11px] text-muted">
                            {t.code} · {t.metal} {t.purity}
                          </div>
                        </td>
                        <td className="pr-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            inputMode="decimal"
                            aria-label="Gross weight in grams"
                            value={(t.weightMg / 1000).toString()}
                            onChange={(e) => patch(t.pieceId, { weightMg: Math.round((+e.target.value || 0) * 1000) })}
                            className="tabular w-[5.5rem]"
                          />
                        </td>
                        <td className="pr-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            inputMode="decimal"
                            aria-label="Less weight in grams"
                            value={(t.lessMg / 1000).toString()}
                            onChange={(e) => patch(t.pieceId, { lessMg: Math.round((+e.target.value || 0) * 1000) })}
                            className={cn("tabular w-[5.5rem]", tagProblem(t) && "border-danger")}
                          />
                        </td>
                        <td className={cn("tabular pr-2 font-semibold whitespace-nowrap", netMg(t) <= 0 && "text-danger")}>{(netMg(t) / 1000).toFixed(3)}</td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              aria-label="Fewer copies"
                              className="grid size-7 place-items-center rounded-full border border-line"
                              onClick={() => patch(t.pieceId, { copies: Math.max(1, t.copies - 1) })}
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="tabular w-6 text-center font-semibold">{t.copies}</span>
                            <button
                              aria-label="More copies"
                              className="grid size-7 place-items-center rounded-full border border-line"
                              onClick={() => patch(t.pieceId, { copies: Math.min(50, t.copies + 1) })}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="text-right">
                          <button
                            aria-label="Remove"
                            className="text-faint hover:text-danger"
                            onClick={() => setSelected(selected.filter((x) => x.pieceId !== t.pieceId))}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 rounded-xl border border-line bg-panel p-3 text-xs leading-relaxed text-muted">
              <b className="text-text">Printing on the tag roll:</b> “Print tags” makes one tag per page at exactly {pageW} × {s.heightMm} mm. In the label
              printer’s print dialog choose that paper size, scale <b className="text-text">100% / actual size</b>, and no margins. Use the A4 test sheet first
              to check text and barcode on plain paper.
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle
              kicker="Layout"
              title="Tag size"
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => setS(DEFAULT_TAG)}>
                    Defaults
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<Save className="size-3.5" />}
                    disabled={saved}
                    onClick={() => run((d) => void (d.settings.tag = s), "Tag layout saved")}
                  >
                    {saved ? "Saved" : "Save layout"}
                  </Button>
                </div>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Body length (mm)">
                <Input type="number" min="30" max="120" value={s.bodyMm} onChange={(e) => setS({ ...s, bodyMm: num(e.target.value, 30, 120) })} />
              </Field>
              <Field label="Height (mm)">
                <Input type="number" min="8" max="40" value={s.heightMm} onChange={(e) => setS({ ...s, heightMm: num(e.target.value, 8, 40) })} />
              </Field>
              <Field label="Tail (mm)">
                <Input type="number" min="0" max="120" value={s.tailMm} onChange={(e) => setS({ ...s, tailMm: num(e.target.value, 0, 120) })} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {([["pageIncludesTail", "Printer page includes tail"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setS({ ...s, [k]: !s[k] })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    s[k] ? "gold-fill border-transparent" : "border-line text-muted",
                  )}
                >
                  {s[k] ? "✓ " : ""}
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-faint">
              Sizes start from the client&apos;s sample tags — measure the actual roll once and save the layout; every user then prints the same size.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
