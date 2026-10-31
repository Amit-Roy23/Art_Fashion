"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Gem, Layers, Plus, Search, Trash2, UserPlus } from "lucide-react";
import * as ops from "@/lib/ops";
import { act, useCan, useDB } from "@/lib/store";
import { cn, fromInputDate, g, inputDate, inr, toMg } from "@/lib/format";
import { Avatar, Button, Field, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { PhotoInput, type DraftPhoto } from "@/components/photos";
import { CustomerDialog, RemarksField } from "@/components/actions";
import { MetalSwatch } from "@/components/domain";

interface DraftPiece {
  name: string;
  category: string;
  purity: string;
  size: string;
  qty: string;
  est: string;
  value: string;
  stones: string;
  specs: string;
  remarks: string;
  photos: DraftPhoto[];
}

const STEPS = ["Customer", "Order details", "Pieces", "Review"];

export default function NewOrderPage() {
  const db = useDB();
  const router = useRouter();
  const allowed = useCan("orders.create");
  const metals = db.settings.metals;
  const puritiesOf = (metal: string) => metals.find((m) => m.name === metal)?.purities ?? [];
  // 22K for gold, the first listed purity for other metals
  const defaultPurity = (metal: string) => {
    const list = puritiesOf(metal);
    return list.find((x) => x.startsWith("22K")) ?? list[0] ?? "";
  };
  const blankPiece = (metal = metals[0]?.name ?? ""): DraftPiece => ({
    name: "",
    category: db.settings.categories[0],
    purity: defaultPurity(metal),
    size: "",
    qty: "1",
    est: "",
    value: "",
    stones: "",
    specs: "",
    remarks: "",
    photos: [],
  });

  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [cq, setCq] = useState("");
  const [newCust, setNewCust] = useState(false);
  const [o, setO] = useState(() => ({
    type: "PIECE" as "PROJECT" | "PIECE",
    title: "",
    orderDate: inputDate(),
    dueDate: inputDate(new Date(Date.now() + 14 * 864e5).toISOString()),
    priority: "Normal" as "Normal" | "Urgent" | "VIP",
    metal: metals[0]?.name ?? "",
    remarks: "",
  }));
  const pickMetal = (metal: string) => {
    setO({ ...o, metal });
    // keep each piece's purity valid for the newly chosen metal
    setPieces(pieces.map((p) => (puritiesOf(metal).includes(p.purity) ? p : { ...p, purity: defaultPurity(metal) })));
  };
  const [orderPhotos, setOrderPhotos] = useState<DraftPhoto[]>([]);
  const [pieces, setPieces] = useState<DraftPiece[]>([blankPiece()]);

  const customer = db.customers.find((c) => c.id === customerId);
  const upd = (i: number, patch: Partial<DraftPiece>) => setPieces(pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const check = (s: number): string | null => {
    if (s === 0 && !customerId) return "Choose a customer";
    if (s === 1 && !o.title.trim()) return "Give the order a title";
    if (s === 1 && o.remarks.trim().length < 3) return "Order remarks are mandatory";
    if (s === 2) {
      for (const [i, p] of pieces.entries()) {
        if (!p.name.trim()) return `Piece ${i + 1}: name is required`;
        if (!(toMg(p.est) > 0)) return `Piece ${i + 1}: estimated weight is required`;
        if (p.remarks.trim().length < 3) return `Piece ${i + 1}: remarks are mandatory`;
      }
    }
    return null;
  };
  const err = check(step);

  const create = () => {
    const id = act(
      (d, ctx) =>
        ops.createOrder(
          d,
          {
            customerId,
            type: o.type,
            title: o.title,
            orderDate: fromInputDate(o.orderDate),
            dueDate: fromInputDate(o.dueDate),
            priority: o.priority,
            metal: o.metal,
            remarks: o.remarks,
            photos: orderPhotos.map((p) => ({ ...p, kind: "reference" as const })),
            pieces: pieces.map((p) => ({
              name: p.name,
              category: p.category,
              purity: p.purity,
              size: p.size || undefined,
              qty: +p.qty || 1,
              specs: p.specs,
              stones: p.stones || undefined,
              estWeightMg: toMg(p.est),
              valueRs: p.value ? Math.round(+p.value) : undefined,
              remarks: p.remarks,
              photos: p.photos.map((x) => ({ ...x, kind: "design" as const })),
            })),
          },
          ctx,
        ),
      "Order created ✨",
    );
    if (id) router.push(`/orders/${id}`);
  };

  if (!allowed)
    return <Panel className="p-10 text-center text-muted">Your role can&apos;t create orders. Ask the owner to enable it in Settings → Access.</Panel>;

  const customers = db.customers.filter((c) => !cq || [c.name, c.phone, c.city].some((x) => x.toLowerCase().includes(cq.toLowerCase())));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        kicker="New order"
        title="Book an order"
        sub="Customer → details → pieces with photos & weights → confirm. Remarks are mandatory at every step."
      />

      {/* stepper */}
      <div className="mb-6 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <button onClick={() => i < step && setStep(i)} className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full border-2 text-sm font-bold transition",
                  i < step
                    ? "gold-fill border-transparent"
                    : i === step
                      ? "border-gold text-gold shadow-[0_0_20px_-4px_var(--gold)]"
                      : "border-line-2 text-faint",
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-semibold sm:block", i === step ? "text-text" : "text-faint")}>{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className={cn("mx-3 h-0.5 flex-1 rounded-full", i < step ? "bg-gold/60" : "bg-line-2")} />}
          </div>
        ))}
      </div>

      <Panel lux className="pop p-5 md:p-7" key={step}>
        {step === 0 && (
          <div>
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
                <Input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search by name, phone or city" className="pl-10" autoFocus />
              </div>
              <Button variant="soft" icon={<UserPlus className="size-4" />} onClick={() => setNewCust(true)}>
                New
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCustomerId(c.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                    customerId === c.id ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
                  )}
                >
                  <Avatar name={c.name} hue={(c.name.charCodeAt(0) * 37) % 360} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.type} · {c.city} · {c.phone}
                    </span>
                  </span>
                  {customerId === c.id && <Check className="size-5 text-gold" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["PIECE", Gem, "Single piece", "One ring, pendant, chain…"],
                  ["PROJECT", Layers, "Project / set", "Bridal set, showroom lot — many pieces, tracked individually"],
                ] as const
              ).map(([v, I, t, s]) => (
                <button
                  key={v}
                  onClick={() => {
                    setO({ ...o, type: v });
                    if (v === "PIECE") setPieces(pieces.slice(0, 1));
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                    o.type === v ? "border-gold bg-gold/10" : "border-line bg-panel",
                  )}
                >
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", o.type === v ? "gold-fill" : "bg-panel-2 text-gold")}>
                    <I className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="block text-xs text-muted">{s}</span>
                  </span>
                </button>
              ))}
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                Metal <span className="text-gold">*</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {metals.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => pickMetal(m.name)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border p-3 text-left transition",
                      o.metal === m.name ? "border-gold bg-gold/10" : "border-line bg-panel hover:border-line-2",
                    )}
                  >
                    <MetalSwatch metal={m.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.name}</span>
                      <span className="block truncate text-[10px] text-muted">{m.purities.join(", ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Order title" required>
              <Input
                value={o.title}
                onChange={(e) => setO({ ...o, title: e.target.value })}
                placeholder={o.type === "PROJECT" ? "e.g. Bridal kundan set" : "e.g. Solitaire engagement ring"}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Order date" required>
                <Input type="date" value={o.orderDate} onChange={(e) => setO({ ...o, orderDate: e.target.value })} />
              </Field>
              <Field label="Delivery due" required>
                <Input type="date" value={o.dueDate} onChange={(e) => setO({ ...o, dueDate: e.target.value })} />
              </Field>
              <Field label="Priority">
                <Select value={o.priority} onChange={(e) => setO({ ...o, priority: e.target.value as typeof o.priority })}>
                  <option>Normal</option>
                  <option>Urgent</option>
                  <option>VIP</option>
                </Select>
              </Field>
            </div>
            <PhotoInput
              value={orderPhotos}
              onChange={setOrderPhotos}
              label="Customer reference photos"
              hint="Old jewellery, catalogue, WhatsApp images"
              look="sketch"
            />
            <RemarksField
              label="Order remarks"
              value={o.remarks}
              onChange={(v) => setO({ ...o, remarks: v })}
              chips={["Old gold adjusted in bill", "Advance received", "Customer will supply stones", "Copy design from photo", "Hallmark required"]}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {pieces.map((p, i) => (
              <div key={i} className="rounded-2xl border border-line bg-panel p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-display text-xl font-semibold">
                    <span className="text-gold">{String.fromCharCode(65 + i)}.</span> {p.name || "New piece"}
                  </div>
                  {o.type === "PROJECT" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Copy className="size-3.5" />}
                        onClick={() => setPieces([...pieces.slice(0, i + 1), { ...p, photos: [...p.photos] }, ...pieces.slice(i + 1)])}
                      >
                        Duplicate
                      </Button>
                      {pieces.length > 1 && (
                        <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setPieces(pieces.filter((_, j) => j !== i))}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field label="Piece name" required className="sm:col-span-2">
                    <Input value={p.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="e.g. Jhumka pair" />
                  </Field>
                  <Field label="Category">
                    <Select value={p.category} onChange={(e) => upd(i, { category: e.target.value })}>
                      {db.settings.categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={`Purity (${o.metal})`}>
                    <Select value={p.purity} onChange={(e) => upd(i, { purity: e.target.value })}>
                      {puritiesOf(o.metal).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Est. weight (g)" required>
                    <Input
                      type="number"
                      step="0.001"
                      inputMode="decimal"
                      value={p.est}
                      onChange={(e) => upd(i, { est: e.target.value })}
                      placeholder="0.000"
                      className="tabular"
                    />
                  </Field>
                  <Field label="Est. value (₹)" hint="Optional · used on challans">
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={p.value}
                      onChange={(e) => upd(i, { value: e.target.value })}
                      placeholder="0"
                      className="tabular"
                    />
                  </Field>
                  <Field label="Qty">
                    <Input type="number" min="1" value={p.qty} onChange={(e) => upd(i, { qty: e.target.value })} />
                  </Field>
                  <Field label="Size">
                    <Input value={p.size} onChange={(e) => upd(i, { size: e.target.value })} placeholder="Ring 12 / 2.6" />
                  </Field>
                  <Field label="Stones">
                    <Input value={p.stones} onChange={(e) => upd(i, { stones: e.target.value })} placeholder="Ruby 4, pearls 12" />
                  </Field>
                  <Field label="Specifications" className="sm:col-span-4">
                    <Textarea value={p.specs} onChange={(e) => upd(i, { specs: e.target.value })} rows={2} placeholder="Design, finish, clasp, length…" />
                  </Field>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <PhotoInput value={p.photos} onChange={(v) => upd(i, { photos: v })} label="Design photos / sketch" look="sketch" />
                  <RemarksField
                    label="Piece remarks"
                    value={p.remarks}
                    onChange={(v) => upd(i, { remarks: v })}
                    chips={["Match the set", "Lightweight", "Customer's stone", "Matte finish"]}
                  />
                </div>
              </div>
            ))}
            {o.type === "PROJECT" && (
              <button
                onClick={() => setPieces([...pieces, blankPiece(o.metal)])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 py-4 text-sm font-semibold text-gold transition hover:bg-gold/5"
              >
                <Plus className="size-4" /> Add another piece
              </button>
            )}
          </div>
        )}

        {step === 3 && customer && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-faint">Customer</div>
                <div className="mt-1 font-semibold">{customer.name}</div>
                <div className="text-xs text-muted">{customer.phone}</div>
              </div>
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-faint">Order</div>
                <div className="mt-1 truncate font-semibold">{o.title}</div>
                <div className="text-xs text-muted">
                  {o.type === "PROJECT" ? "Project" : "Single piece"} · {o.metal} · {o.priority} · due {o.dueDate}
                </div>
              </div>
              <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-faint">Estimated {o.metal.toLowerCase()}</div>
                <div className="font-display gold-text tabular text-3xl font-semibold">{g(pieces.reduce((s, p) => s + toMg(p.est), 0))}</div>
                {pieces.some((p) => +p.value > 0) && (
                  <div className="tabular text-xs text-muted">Value {inr(pieces.reduce((s, p) => s + (+p.value || 0), 0))}</div>
                )}
              </div>
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line">
              {pieces.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  {p.photos[0] ? (
                    <img src={p.photos[0].url} alt="" className="size-12 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-lg bg-panel-2 text-faint">
                      <Gem className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {String.fromCharCode(65 + i)}. {p.name}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {p.category} · {p.purity} · qty {p.qty} {p.stones && `· ${p.stones}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular font-semibold">{g(toMg(p.est))}</div>
                    {+p.value > 0 && <div className="tabular text-xs text-muted">{inr(+p.value)}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border-l-2 border-gold/50 bg-panel px-3 py-2 text-sm text-muted italic">“{o.remarks}”</div>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => (step ? setStep(step - 1) : router.back())}>
            {step ? "Back" : "Cancel"}
          </Button>
          <div className="flex items-center gap-3">
            {err && <span className="hidden text-xs text-warn sm:block">{err}</span>}
            {step < 3 ? (
              <Button variant="gold" disabled={!!err} onClick={() => setStep(step + 1)}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="gold" size="lg" icon={<Check className="size-4" />} onClick={create}>
                Create order
              </Button>
            )}
          </div>
        </div>
        {err && <div className="mt-2 text-right text-xs text-warn sm:hidden">{err}</div>}
      </Panel>
      <CustomerDialog open={newCust} onClose={() => setNewCust(false)} onSaved={(id) => setCustomerId(id)} />
    </div>
  );
}
