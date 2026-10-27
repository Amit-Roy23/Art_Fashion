"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Download, Hammer, MessageCircle, Pencil, Phone, Plus, Share2, Workflow } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import { activityFor, artisanLoad, coverPhoto, pieceOf, stageOf, workCategory } from "@/lib/queries";
import { date, g, gShort } from "@/lib/format";
import { downloadPdf, sharePdf } from "@/lib/pdf-client";
import { Avatar, Button, Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { DueChip, Timeline, WeightDelta, WorkStatusPill } from "@/components/domain";
import { Thumb } from "@/components/photos";
import { ArtisanDialog, IssueWorkDialog, ReviewDialog, StatusDialog } from "@/components/actions";

export default function KarigarDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const canAssign = useCan("artisans.assign");
  const canReview = useCan("artisans.review");
  const [dlg, setDlg] = useState<null | "assign" | "edit" | { review: string } | { status: string }>(null);
  const a = db.artisans.find((x) => x.id === id);
  if (!a)
    return (
      <Panel>
        <Empty icon={<Hammer className="size-7" />} title="Karigar not found" />
      </Panel>
    );
  const l = artisanLoad(db, a.id);
  const all = db.workOrders.filter((w) => w.artisanId === a.id);
  const d = typeof dlg === "object" && dlg ? dlg : null;

  return (
    <div>
      <Link href="/karigars" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
        <ArrowLeft className="size-4" /> Karigars
      </Link>
      <PageHeader
        kicker={`${a.code} · ${a.speciality}`}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={a.name} hue={a.hue} size={58} />
            {a.name}
          </span>
        }
        sub={`${a.phone} · ${a.city} · working with us since ${date(a.joinedAt)}`}
        actions={
          <>
            <Button variant="soft" icon={<Phone className="size-4" />} href={`tel:${a.phone}`}>
              Call
            </Button>
            <Button variant="soft" icon={<MessageCircle className="size-4" />} onClick={() => window.open(`https://wa.me/91${a.phone.slice(-10)}`, "_blank")}>
              WhatsApp
            </Button>
            <Button variant="soft" icon={<Pencil className="size-4" />} onClick={() => setDlg("edit")}>
              Edit
            </Button>
            {canAssign && (
              <Button variant="gold" icon={<Plus className="size-4" />} onClick={() => setDlg("assign")}>
                Assign work
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Open jobs", l.open.length],
          ["Awaiting review", l.submitted.length],
          ["Overdue", l.overdue.length],
          ["Metal in hand", gShort(l.metalOutMg)],
          ["Net loss (done)", g(l.lossMg)],
        ].map(([k, v]) => (
          <Panel key={k as string} className="p-4">
            <div className="font-display tabular text-2xl font-semibold whitespace-nowrap sm:text-3xl">{v}</div>
            <div className="text-xs text-muted">{k}</div>
          </Panel>
        ))}
      </div>

      <SectionTitle kicker="Current allocation" title="Work in hand" />
      {l.open.length ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {l.open.map((w) => {
            const p = pieceOf(db, w.pieceId)!;
            const cat = workCategory(db, w.statusId);
            return (
              <Panel key={w.id} className="overflow-hidden">
                <Link href={`/pieces/${p.id}`} className="flex gap-3 p-3">
                  <Thumb photo={coverPhoto(p)} photos={p.photos} className="size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold tracking-wider text-gold">
                      {w.number} · {p.code}
                    </div>
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-muted">
                      {stageOf(db, w.stageId)?.name} · issued {g(w.issuedWeightMg)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <WorkStatusPill wo={w} />
                      {cat !== "SUBMITTED" && <DueChip iso={w.dueDate} />}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-1 border-t border-line p-2">
                  {cat === "SUBMITTED" && canReview && (
                    <Button size="sm" variant="gold" icon={<BadgeCheck className="size-3.5" />} onClick={() => setDlg({ review: w.id })}>
                      Review
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<Workflow className="size-3.5" />} onClick={() => setDlg({ status: w.id })}>
                    Status
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => downloadPdf("work-order", w.id)}>
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Share2 className="size-3.5" />}
                    onClick={() => sharePdf("work-order", w.id, a.phone, `Work order ${w.number} — ${p.name}`)}
                  >
                    Share
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="mb-6">
          <Empty icon={<Hammer className="size-7" />} title="Nothing in hand" sub="This karigar is free for new work." />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="p-5">
          <SectionTitle kicker="All work orders" title="Work & weight register" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-faint">
                  <th className="py-2">WO</th>
                  <th>Piece</th>
                  <th>Issued</th>
                  <th>Issued wt</th>
                  <th>Submitted wt</th>
                  <th>Diff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {all.map((w) => {
                  const p = pieceOf(db, w.pieceId);
                  return (
                    <tr key={w.id} className="border-t border-line">
                      <td className="py-2.5 font-semibold">{w.number}</td>
                      <td>
                        <Link href={`/pieces/${p?.id}`} className="hover:text-gold">
                          {p?.name}
                        </Link>
                      </td>
                      <td className="text-muted">{date(w.issuedAt)}</td>
                      <td className="tabular">{g(w.issuedWeightMg)}</td>
                      <td className="tabular">{g(w.submittedWeightMg)}</td>
                      <td>
                        <WeightDelta base={w.issuedWeightMg} value={w.submittedWeightMg} />
                      </td>
                      <td>
                        <WorkStatusPill wo={w} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle kicker="Audit trail" title="Activity" />
          <Timeline items={activityFor(db, { artisanId: a.id }).slice(0, 25)} dense />
        </Panel>
      </div>

      <IssueWorkDialog open={dlg === "assign"} onClose={() => setDlg(null)} artisanId={a.id} />
      <ArtisanDialog open={dlg === "edit"} onClose={() => setDlg(null)} artisan={a} />
      {d && "review" in d && <ReviewDialog open onClose={() => setDlg(null)} woId={d.review} />}
      {d && "status" in d && <StatusDialog open onClose={() => setDlg(null)} kind="work" id={d.status} />}
    </div>
  );
}
