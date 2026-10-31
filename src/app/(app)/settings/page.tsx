"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Building2, KeyRound, Layers, ListChecks, Lock, Plus, RotateCcw, Scale, Tags, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { OpError, uid } from "@/lib/ops";
import { resetDemo, run, useCan, useDB } from "@/lib/store";
import type { DB, Stage, StatusOption } from "@/lib/types";
import { cn } from "@/lib/format";
import { Button, Empty, Field, Input, Modal, PageHeader, Panel, SectionTitle, Segmented, Select } from "@/components/ui";
import { MetalSwatch } from "@/components/domain";

const SWATCHES = ["#a78bfa", "#60a5fa", "#38bdf8", "#2dd4bf", "#34d399", "#facc15", "#f59e0b", "#fb923c", "#f87171", "#f472b6", "#c084fc", "#9ca3af"];

const PERM_LABELS: Record<string, string> = {
  "orders.create": "Create orders & customers",
  "orders.status": "Change order status",
  "artisans.assign": "Assign work to karigars",
  "artisans.review": "Approve / reject karigar submissions",
  "artisans.manage": "Add & edit karigars",
  "jobwork.manage": "Send & receive job work",
  "delivery.create": "Record deliveries",
  "weights.view": "View weights",
  "reports.view": "View reports",
  "settings.manage": "Manage settings",
};

const CAT_OPTIONS = {
  order: ["NEW", "ACTIVE", "HOLD", "READY", "PARTIAL", "DONE", "CANCELLED"],
  work: ["ISSUED", "ACTIVE", "HOLD", "SUBMITTED", "REWORK", "DONE"],
  job: ["SENT", "ACTIVE", "HOLD", "RETURNED"],
} as const;
const STATUS_KEY = { order: "orderStatuses", work: "workStatuses", job: "jobStatuses" } as const;

export default function SettingsPage() {
  const db = useDB();
  const allowed = useCan("settings.manage");
  const [tab, setTab] = useState<"production" | "statuses" | "masters" | "access" | "company">("production");
  if (!allowed)
    return (
      <Panel>
        <Empty icon={<Lock className="size-7" />} title="Owner only" sub="Settings are managed by the owner. Switch to the Owner role to try them." />
      </Panel>
    );
  return (
    <div>
      <PageHeader
        kicker="Configuration"
        title="Settings"
        sub="Everything the client confirms before go-live is editable here: stages, status options, masters, vendors, access and tolerances."
      />
      <Segmented
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: "production", label: "Production stages" },
          { value: "statuses", label: "Status options" },
          { value: "masters", label: "Masters & vendors" },
          { value: "access", label: "Access" },
          { value: "company", label: "Company & demo" },
        ]}
      />
      {tab === "production" && <StagesEditor db={db} />}
      {tab === "statuses" && <StatusEditor db={db} />}
      {tab === "masters" && <Masters db={db} />}
      {tab === "access" && <Access db={db} />}
      {tab === "company" && <Company db={db} />}
    </div>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          className={cn("size-5 rounded-full transition", value === c && "ring-2 ring-text ring-offset-2 ring-offset-bg")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function StagesEditor({ db }: { db: DB }) {
  const stages = db.settings.stages;
  const save = (fn: (s: Stage[]) => void, msg?: string) => run((d) => fn(d.settings.stages), msg);
  const remove = (id: string) =>
    run((d) => {
      if (d.pieces.some((p) => p.stageId === id && p.location !== "DELIVERED")) throw new OpError("Pieces are currently in this stage — move them first");
      if (d.settings.stages.length <= 2) throw new OpError("Keep at least two stages");
      d.settings.stages = d.settings.stages.filter((s) => s.id !== id);
    }, "Stage removed");
  return (
    <Panel className="p-5">
      <SectionTitle
        kicker="Pipeline"
        title="Production stages"
        action={
          <Button
            size="sm"
            variant="gold"
            icon={<Plus className="size-3.5" />}
            onClick={() =>
              save((s) => void s.splice(s.length - 1, 0, { id: uid("st"), name: "New stage", color: "#60a5fa", handledBy: "ARTISAN" }), "Stage added")
            }
          >
            Add stage
          </Button>
        }
      />
      <p className="mb-4 text-sm text-muted">
        Rename, recolour, reorder. “Handled by” decides where a piece goes in that stage (karigar / outside vendor / in-house). The last two stages act as QC
        and Ready.
      </p>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3 md:w-[40%]">
              <span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-black" style={{ background: s.color }}>
                {i + 1}
              </span>
              <Input value={s.name} onChange={(e) => save((st) => void (st[i].name = e.target.value))} className="font-semibold" />
            </div>
            <Swatches value={s.color} onChange={(c) => save((st) => void (st[i].color = c))} />
            <Select value={s.handledBy} onChange={(e) => save((st) => void (st[i].handledBy = e.target.value as Stage["handledBy"]))} className="md:w-40">
              <option value="ARTISAN">Karigar</option>
              <option value="JOBWORK">Outside job work</option>
              <option value="INHOUSE">In-house</option>
            </Select>
            <div className="flex gap-1 md:ml-auto">
              <Button
                size="sm"
                variant="ghost"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => save((st) => void st.splice(i - 1, 2, st[i], st[i - 1]))}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Move down"
                disabled={i === stages.length - 1}
                onClick={() => save((st) => void st.splice(i, 2, st[i + 1], st[i]))}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(s.id)}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function StatusEditor({ db }: { db: DB }) {
  const [scope, setScope] = useState<"order" | "work" | "job">("order");
  const key = STATUS_KEY[scope];
  const list = db.settings[key] as StatusOption[];
  const edit = (fn: (l: StatusOption[]) => void, msg?: string) => run((d) => fn(d.settings[key] as StatusOption[]), msg);
  const remove = (id: string) =>
    run((d) => {
      const inUse =
        scope === "order"
          ? d.orders.some((o) => o.statusId === id)
          : scope === "work"
            ? d.workOrders.some((w) => w.statusId === id)
            : d.jobWorks.some((j) => j.statusId === id);
      if (inUse) throw new OpError("This status is in use — it can be renamed but not deleted");
      (d.settings[key] as StatusOption[]).splice(
        (d.settings[key] as StatusOption[]).findIndex((s) => s.id === id),
        1,
      );
    }, "Status removed");
  return (
    <Panel className="p-5">
      <SectionTitle
        kicker="Custom options"
        title="Status options"
        action={
          <Button
            size="sm"
            variant="gold"
            icon={<Plus className="size-3.5" />}
            onClick={() => edit((l) => void l.push({ id: uid("s"), label: "New status", color: "#60a5fa", category: CAT_OPTIONS[scope][1] }), "Status added")}
          >
            Add status
          </Button>
        }
      />
      <Segmented
        className="mb-4"
        value={scope}
        onChange={setScope}
        options={[
          { value: "order", label: "Order" },
          { value: "work", label: "Karigar work order" },
          { value: "job", label: "Job work" },
        ]}
      />
      <p className="mb-4 text-sm text-muted">
        Name statuses the way your workshop speaks. Each maps to a system meaning so dashboards and automation keep working.
      </p>
      <div className="space-y-2">
        {list.map((s, i) => (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3 md:flex-row md:items-center">
            <span className="hidden size-3 shrink-0 rounded-full md:block" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
            <Input value={s.label} onChange={(e) => edit((l) => void (l[i].label = e.target.value))} className="font-semibold md:w-72" />
            <Swatches value={s.color} onChange={(c) => edit((l) => void (l[i].color = c))} />
            <Select value={s.category} onChange={(e) => edit((l) => void (l[i].category = e.target.value))} className="md:ml-auto md:w-40">
              {CAT_OPTIONS[scope].map((c) => (
                <option key={c} value={c}>
                  means: {c.toLowerCase()}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(s.id)}>
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ChipList({ title, icon, items, onChange }: { title: string; icon: React.ReactNode; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <span className="text-gold">{icon}</span>
        {title}
      </div>
      <ChipEditor items={items} onChange={onChange} />
    </Panel>
  );
}

function ChipEditor({ items, onChange, placeholder = "Add…" }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-panel px-3 py-1 text-xs">
            {x}
            <button onClick={() => onChange(items.filter((i) => i !== x))} aria-label={`Remove ${x}`} className="text-faint hover:text-danger">
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim() && !items.includes(v.trim())) {
            onChange([...items, v.trim()]);
            setV("");
          }
        }}
      >
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
        <Button type="submit" variant="soft">
          <Plus className="size-4" />
        </Button>
      </form>
    </>
  );
}

function Masters({ db }: { db: DB }) {
  const [metal, setMetal] = useState("");
  const set = (k: "categories" | "processes") => (v: string[]) => run((d) => void (d.settings[k] = v), "Saved");
  const setPurities = (name: string) => (v: string[]) =>
    run((d) => {
      if (!v.length) throw new OpError("Keep at least one purity for each metal");
      d.settings.metals.find((m) => m.name === name)!.purities = v;
    }, "Saved");
  const removeMetal = (name: string) =>
    run((d) => {
      if (d.orders.some((o) => o.metal === name)) throw new OpError(`Orders use ${name} — it cannot be removed`);
      if (d.settings.metals.length <= 1) throw new OpError("Keep at least one metal");
      d.settings.metals = d.settings.metals.filter((m) => m.name !== name);
    }, "Metal removed");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5 lg:col-span-2">
        <SectionTitle
          kicker="Order metals"
          title={
            <span className="flex items-center gap-2">
              <Scale className="size-5 text-gold" />
              Metals & purities
            </span>
          }
        />
        <p className="mb-4 text-sm text-muted">
          Each order is booked in one metal; its pieces pick a purity from that metal&apos;s list. Dashboard totals are shown metal-wise.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {db.settings.metals.map((m) => (
            <div key={m.name} className="rounded-2xl border border-line bg-panel p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <MetalSwatch metal={m.name} size={24} />
                <span className="flex-1 font-semibold">{m.name}</span>
                <button aria-label={`Remove ${m.name}`} onClick={() => removeMetal(m.name)} className="text-faint hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <ChipEditor items={m.purities} onChange={setPurities(m.name)} placeholder="Add purity…" />
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = metal.trim();
            if (!n) return;
            if (
              run((d) => {
                if (d.settings.metals.some((x) => x.name.toLowerCase() === n.toLowerCase())) throw new OpError(`${n} already exists`);
                d.settings.metals.push({ name: n, purities: ["Standard"] });
              }, "Metal added")
            )
              setMetal("");
          }}
        >
          <Input value={metal} onChange={(e) => setMetal(e.target.value)} placeholder="Add a metal, e.g. Platinum" />
          <Button type="submit" variant="soft">
            <Plus className="size-4" />
          </Button>
        </form>
      </Panel>
      <ChipList title="Jewellery categories" icon={<Tags className="size-4" />} items={db.settings.categories} onChange={set("categories")} />
      <ChipList title="Outside processes" icon={<Layers className="size-4" />} items={db.settings.processes} onChange={set("processes")} />
      <Panel className="flex items-center gap-4 p-5 lg:col-span-2">
        <Truck className="size-6 text-gold" />
        <div className="flex-1">
          <div className="font-semibold">Vendors (outside job workers)</div>
          <div className="text-sm text-muted">Vendors now have their own page with a vendor-wise work register.</div>
        </div>
        <Button variant="soft" href="/vendors">
          Open vendors
        </Button>
      </Panel>
    </div>
  );
}

function Access({ db }: { db: DB }) {
  return (
    <Panel className="p-5">
      <SectionTitle kicker="Permissions" title="Who can do what" />
      <p className="mb-4 text-sm text-muted">
        Owner always has full access. Karigars only see their own work orders in the mobile portal — never customer contact details or other karigars&apos;
        work.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-faint">
              <th className="py-2">Permission</th>
              <th className="text-center">Owner</th>
              <th className="text-center">Manager</th>
              <th className="text-center">Staff</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(db.settings.permissions).map(([perm, v]) => (
              <tr key={perm} className="border-t border-line">
                <td className="py-3 font-medium">
                  <KeyRound className="mr-2 inline size-3.5 text-gold" />
                  {PERM_LABELS[perm] ?? perm}
                </td>
                <td className="text-center">
                  <Toggle on disabled />
                </td>
                {(["MANAGER", "STAFF"] as const).map((r) => (
                  <td key={r} className="text-center">
                    <Toggle on={v[r]} onClick={() => run((d) => void (d.settings.permissions[perm][r] = !v[r]), "Permission updated")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative inline-flex h-6 w-11 rounded-full transition disabled:opacity-50", on ? "gold-fill" : "bg-line-2")}
    >
      <span className={cn("absolute top-1 size-4 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
    </button>
  );
}

function Company({ db }: { db: DB }) {
  const c = db.settings.company;
  const [confirm, setConfirm] = useState(false);
  const field = (k: keyof typeof c, label: string) => (
    <Field label={label}>
      <Input value={c[k]} onChange={(e) => run((d) => void (d.settings.company[k] = e.target.value))} />
    </Field>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Panel className="p-5">
        <SectionTitle
          kicker="Printed on every PDF"
          title={
            <span className="flex items-center gap-2">
              <Building2 className="size-5 text-gold" />
              Company profile
            </span>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Business name")}
          {field("tagline", "Tagline")}
          {field("phone", "Phone")}
          {field("email", "Email")}
          {field("gstin", "GSTIN")}
          {field("address", "Address")}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel className="p-5">
          <SectionTitle
            kicker="Weight control"
            title={
              <span className="flex items-center gap-2">
                <Scale className="size-5 text-gold" />
                Tolerance
              </span>
            }
          />
          <Field label="Allowed loss / gain per hand-off (%)" hint="Differences above this are flagged red everywhere and listed in the variance report.">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={db.settings.weightTolerancePct}
              onChange={(e) => run((d) => void (d.settings.weightTolerancePct = Math.max(0, +e.target.value || 0)))}
            />
          </Field>
        </Panel>
        <Panel className="p-5">
          <SectionTitle
            kicker="Demo"
            title={
              <span className="flex items-center gap-2">
                <ListChecks className="size-5 text-gold" />
                Demo data
              </span>
            }
          />
          <p className="text-sm text-muted">Data is stored privately in this browser. Reset to bring back the original sample orders, karigars and photos.</p>
          <Button className="mt-4" variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirm(true)}>
            Reset demo data
          </Button>
        </Panel>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset all demo data?"
        sub="Every change you made in this browser will be replaced by fresh sample data."
        icon={<RotateCcw className="size-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await resetDemo();
                setConfirm(false);
                toast.success("Demo data restored");
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">You&apos;ll stay signed in as the current role.</p>
      </Modal>
    </div>
  );
}
