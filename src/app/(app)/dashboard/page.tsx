"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar as RBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hammer,
  Hourglass,
  PackageCheck,
  Plus,
  Sparkles,
  Truck,
  Factory,
} from "lucide-react";
import { startOfWeek, subWeeks, format } from "date-fns";
import { useDB, useUser } from "@/lib/store";
import { useChartColors } from "@/lib/theme";
import { artisanLoad, coverPhoto, customerOf, orderCat, orderOf, pieceOf, piecesOf, stageOf, vendorOf, workCategory } from "@/lib/queries";
import { cn, dateShort, daysLeft, g, gShort } from "@/lib/format";
import { Avatar, Button, Panel, Ring, SectionTitle, Tone } from "@/components/ui";
import { DueChip, OrderStatusPill, PriorityBadge, Timeline, WeightDelta } from "@/components/domain";
import { Thumb, useLightbox } from "@/components/photos";
import { DeliveryDialog, IssueWorkDialog, ReviewDialog, SendJobDialog } from "@/components/actions";

export default function Dashboard() {
  const db = useDB();
  const user = useUser()!;
  const open = useLightbox();
  const chart = useChartColors();
  const [dlg, setDlg] = useState<null | "assign" | "job" | "deliver" | { review: string }>(null);

  const k = useMemo(() => {
    const cats = db.orders.map((o) => orderCat(db, o));
    return {
      total: db.orders.length,
      pending: cats.filter((c) => c === "NEW" || c === "HOLD").length,
      production: cats.filter((c) => c === "ACTIVE").length,
      ready: cats.filter((c) => c === "READY" || c === "PARTIAL").length,
      done: cats.filter((c) => c === "DONE").length,
    };
  }, [db]);

  const submissions = db.workOrders.filter((w) => workCategory(db, w.statusId) === "SUBMITTED");
  const overdueWO = db.workOrders.filter((w) => !["SUBMITTED", "DONE"].includes(workCategory(db, w.statusId)) && daysLeft(w.dueDate) < 0);
  const openJobs = db.jobWorks.filter((j) => !j.returnedAt);
  const readyPieces = db.pieces.filter((p) => p.location === "READY");
  const dueSoon = db.orders
    .filter((o) => !["DONE", "CANCELLED"].includes(orderCat(db, o)) && daysLeft(o.dueDate) <= 5)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const photos = useMemo(
    () =>
      db.pieces
        .flatMap((p) => p.photos)
        .filter((p) => p.kind !== "design" && p.kind !== "reference")
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 9),
    [db],
  );

  const weekly = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 }));
    return weeks.map((w, i) => {
      const end = weeks[i + 1] ?? new Date(8.64e15);
      const inW = (iso: string) => new Date(iso) >= w && new Date(iso) < end;
      return {
        week: format(w, "dd MMM"),
        Received: db.pieces.filter((p) => inW(p.receivedAt)).length,
        Delivered: db.deliveries.filter((d) => inW(d.date)).reduce((s, d) => s + d.items.length, 0),
      };
    });
  }, [db]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const metalOut = db.artisans.reduce((s, a) => s + artisanLoad(db, a.id).metalOutMg, 0) + openJobs.reduce((s, j) => s + j.sentWeightMg, 0);

  return (
    <div className="space-y-6">
      {/* hero */}
      <Panel lux className="rise overflow-hidden p-6 md:p-8">
        <div className="facet-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,transparent,black)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.26em] text-gold">{format(new Date(), "EEEE, dd MMMM yyyy")}</div>
            <h1 className="font-display mt-2 text-4xl leading-tight font-semibold md:text-5xl">
              {greet}, <span className="gold-text italic">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              <b className="text-text">{submissions.length}</b> submissions await review, <b className="text-text">{overdueWO.length}</b> karigar jobs are
              overdue, <b className="text-text">{openJobs.length}</b> pieces are out for job work and <b className="text-text">{readyPieces.length}</b> are
              ready to deliver.
              <span className="mt-1 block">
                Metal out of the vault right now: <b className="gold-text tabular">{g(metalOut)}</b>
              </span>
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[360px]">
            <Button variant="gold" href="/orders/new" icon={<Plus className="size-4" />}>
              New order
            </Button>
            <Button variant="soft" icon={<Hammer className="size-4" />} onClick={() => setDlg("assign")}>
              Assign karigar
            </Button>
            <Button variant="soft" icon={<Sparkles className="size-4" />} onClick={() => setDlg("job")}>
              Send job work
            </Button>
            <Button variant="soft" icon={<Truck className="size-4" />} onClick={() => setDlg("deliver")}>
              Deliver
            </Button>
          </div>
        </div>
      </Panel>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Total orders", v: k.total, icon: ClipboardList, href: "/orders", tone: "var(--gold)" },
          { label: "Pending start", v: k.pending, icon: Hourglass, href: "/orders?f=pending", tone: "#c084fc" },
          { label: "In production", v: k.production, icon: Factory, href: "/orders?f=production", tone: "var(--warn)" },
          { label: "Ready to deliver", v: k.ready, icon: PackageCheck, href: "/orders?f=ready", tone: "var(--info)" },
          { label: "Completed", v: k.done, icon: CheckCircle2, href: "/orders?f=done", tone: "var(--ok)" },
        ].map((t, i) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn("panel rise group p-4 transition hover:-translate-y-0.5 hover:border-gold/40", i === 4 && "col-span-2 md:col-span-1")}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="grid size-9 place-items-center rounded-xl"
                style={{ color: t.tone, background: `color-mix(in oklab, ${t.tone} 14%, transparent)` }}
              >
                <t.icon className="size-[18px]" />
              </span>
              <ArrowRight className="size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-gold" />
            </div>
            <div className="font-display tabular mt-3 text-4xl font-semibold">{t.v}</div>
            <div className="text-xs font-medium text-muted">{t.label}</div>
          </Link>
        ))}
      </div>

      {/* production river */}
      <Panel className="p-5">
        <SectionTitle
          kicker="Live pipeline"
          title="Production river"
          action={
            <Button size="sm" variant="ghost" href="/board">
              Open board <ArrowRight className="size-3.5" />
            </Button>
          }
        />
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max items-stretch gap-0">
            {db.settings.stages.map((s, i) => {
              const ps = db.pieces.filter(
                (p) =>
                  p.stageId === s.id &&
                  p.location !== "DELIVERED" &&
                  (s.id === db.settings.stages.at(-1)?.id ? p.location === "READY" : p.location !== "READY"),
              );
              return (
                <div key={s.id} className="flex items-center">
                  <Link href={`/board#${s.id}`} className="group w-[150px] rounded-2xl border border-line bg-panel p-3 transition hover:border-gold/40">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
                      <span className="truncate text-[11px] font-semibold text-muted">{s.name}</span>
                    </div>
                    <div className="font-display tabular mt-1 text-3xl font-semibold">{ps.length}</div>
                    <div className="mt-1 flex h-7 -space-x-2">
                      {ps.slice(0, 5).map((p) => {
                        const c = coverPhoto(p);
                        return c ? <img key={p.id} src={c.url} alt="" className="size-7 rounded-full object-cover ring-2 ring-bg" /> : null;
                      })}
                      {ps.length > 5 && (
                        <span className="grid size-7 place-items-center rounded-full bg-panel-2 text-[10px] font-bold ring-2 ring-bg">+{ps.length - 5}</span>
                      )}
                    </div>
                  </Link>
                  {i < db.settings.stages.length - 1 && <span className="h-px w-5 bg-gradient-to-r from-gold/60 to-gold/10" />}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* attention */}
        <Panel className="p-5">
          <SectionTitle kicker="Act now" title="Needs your attention" />
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-info">
                <BadgeCheck className="size-4" /> Karigar submissions to review · {submissions.length}
              </div>
              {submissions.length ? (
                <div className="space-y-2">
                  {submissions.map((w) => {
                    const p = pieceOf(db, w.pieceId)!;
                    const a = db.artisans.find((x) => x.id === w.artisanId)!;
                    return (
                      <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-2.5">
                        <Thumb photo={w.submissionPhotos[0]} photos={w.submissionPhotos} className="size-14" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/pieces/${p.id}`} className="block truncate text-sm font-semibold hover:text-gold">
                            {p.name} <span className="text-faint">· {p.code}</span>
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Avatar name={a.name} hue={a.hue} size={16} /> {a.name}
                            </span>
                            <span>· {stageOf(db, w.stageId)?.name}</span>
                            <WeightDelta base={w.issuedWeightMg} value={w.submittedWeightMg} />
                          </div>
                        </div>
                        <Button size="sm" variant="gold" onClick={() => setDlg({ review: w.id })}>
                          Review
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-faint">All caught up ✨</div>
              )}
            </div>

            {!!overdueWO.length && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-danger">
                  <AlertTriangle className="size-4" /> Overdue with karigars · {overdueWO.length}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {overdueWO.map((w) => {
                    const p = pieceOf(db, w.pieceId)!;
                    const a = db.artisans.find((x) => x.id === w.artisanId)!;
                    return (
                      <Link key={w.id} href={`/pieces/${p.id}`} className="flex items-center gap-2.5 rounded-xl border border-danger/25 bg-danger/5 p-2.5">
                        <Avatar name={a.name} hue={a.hue} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{p.name}</div>
                          <div className="text-[11px] text-muted">
                            {a.name} · {w.number}
                          </div>
                        </div>
                        <DueChip iso={w.dueDate} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warn">
                <Clock className="size-4" /> Orders due within 5 days · {dueSoon.length}
              </div>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {dueSoon.map((o) => {
                  const ps = piecesOf(db, o.id);
                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 bg-panel px-3 py-2.5 transition hover:bg-panel-2">
                      <Thumb photos={ps.map(coverPhoto).filter(Boolean) as never} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{o.title}</span>
                          <PriorityBadge p={o.priority} />
                        </div>
                        <div className="truncate text-[11px] text-muted">
                          {o.number} · {customerOf(db, o.customerId)?.name} · {ps.length} pcs
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <OrderStatusPill order={o} />
                      </div>
                      <DueChip iso={o.dueDate} />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        {/* karigar bench */}
        <Panel className="p-5">
          <SectionTitle
            kicker="Workshop"
            title="Karigar bench"
            action={
              <Button size="sm" variant="ghost" href="/karigars">
                All <ArrowRight className="size-3.5" />
              </Button>
            }
          />
          <div className="space-y-2">
            {db.artisans.map((a) => {
              const l = artisanLoad(db, a.id);
              return (
                <Link key={a.id} href={`/karigars/${a.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-panel">
                  <Ring value={l.open.length / 5} size={46} color={l.overdue.length ? "var(--danger)" : "var(--gold)"}>
                    <Avatar name={a.name} hue={a.hue} size={34} />
                  </Ring>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="truncate text-[11px] text-muted">{a.speciality}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-sm font-semibold">{l.open.length} open</div>
                    <div className="tabular text-[11px] text-muted">{gShort(l.metalOutMg)} out</div>
                  </div>
                  {!!l.overdue.length && <Tone tone="danger">{l.overdue.length} late</Tone>}
                  {!!l.submitted.length && <Tone tone="info">{l.submitted.length} to review</Tone>}
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* chart */}
        <Panel className="p-5 lg:col-span-2">
          <SectionTitle kicker="Throughput" title="Pieces received vs delivered" />
          <div className="h-[260px]" role="img" aria-label="Weekly pieces received and delivered, last 8 weeks">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} barGap={2} margin={{ left: -18, right: 6, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "var(--panel-2)" }}
                  contentStyle={{ background: "var(--panel-solid)", border: "1px solid var(--line-2)", borderRadius: 12, color: "var(--text)", fontSize: 12 }}
                  labelStyle={{ color: "var(--muted)" }}
                  itemStyle={{ color: "var(--text)" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
                <RBar dataKey="Received" fill={chart[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <RBar dataKey="Delivered" fill={chart[1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* outside + ready */}
        <Panel className="p-5">
          <SectionTitle kicker="Out & ready" title="Job work & dispatch" />
          <div className="space-y-2">
            {openJobs.map((j) => {
              const p = pieceOf(db, j.pieceId)!;
              return (
                <Link key={j.id} href={`/pieces/${p.id}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-panel p-2">
                  <Thumb photo={coverPhoto(p)} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{p.name}</div>
                    <div className="truncate text-[11px] text-muted">
                      {j.process} · {vendorOf(db, j.vendorId)?.name}
                    </div>
                  </div>
                  <DueChip iso={j.expectedDate} />
                </Link>
              );
            })}
            <div className="hairline my-3" />
            {readyPieces.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-xl border border-ok/25 bg-ok/5 p-2">
                <Thumb photo={coverPhoto(p)} className="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{p.name}</div>
                  <div className="truncate text-[11px] text-muted">
                    {customerOf(db, orderOf(db, p.orderId)!.customerId)?.name} · {g(p.finalWeightMg)}
                  </div>
                </div>
                <Truck className="size-4 text-ok" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="p-5">
          <SectionTitle
            kicker="Photo vault"
            title="Fresh from the bench"
            action={
              <Button size="sm" variant="ghost" href="/photos">
                Vault <ArrowRight className="size-3.5" />
              </Button>
            }
          />
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => open(photos, i)}
                className={cn("group relative overflow-hidden rounded-xl", i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square")}
              >
                <img src={p.url} alt="" className="size-full object-cover transition duration-700 group-hover:scale-110" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-left text-[10px] text-white/90">
                  {p.caption} · {dateShort(p.at)}
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle kicker="Audit trail" title="Latest activity" />
          <div className="scroll-thin max-h-[440px] overflow-y-auto pr-1">
            <Timeline items={db.activity.slice(0, 14)} dense />
          </div>
        </Panel>
      </div>

      <IssueWorkDialog open={dlg === "assign"} onClose={() => setDlg(null)} />
      <SendJobDialog open={dlg === "job"} onClose={() => setDlg(null)} />
      <DeliveryDialog open={dlg === "deliver"} onClose={() => setDlg(null)} />
      {typeof dlg === "object" && dlg && <ReviewDialog open onClose={() => setDlg(null)} woId={dlg.review} />}
    </div>
  );
}
