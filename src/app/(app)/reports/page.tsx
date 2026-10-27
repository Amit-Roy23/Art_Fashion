"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Download, Lock } from "lucide-react";
import { useCan, useDB } from "@/lib/store";
import {
  artisanLoad,
  customerOf,
  orderOf,
  orderProgress,
  orderStatus,
  pieceOf,
  piecesOf,
  stageOf,
  vendorOf,
  weightJourney,
  jobStatus,
  overTolerance,
} from "@/lib/queries";
import { date, g } from "@/lib/format";
import { Button, Empty, PageHeader, Panel, Segmented } from "@/components/ui";

type R = "orders" | "karigars" | "variance" | "jobwork" | "deliveries" | "pieces";

export default function ReportsPage() {
  const db = useDB();
  const allowed = useCan("reports.view");
  const [r, setR] = useState<R>("orders");

  const table = useMemo((): { head: string[]; rows: (string | number)[][]; flag?: boolean[] } => {
    if (r === "orders")
      return {
        head: ["Order", "Type", "Title", "Customer", "Received", "Due", "Pieces", "Est. weight", "Progress", "Status"],
        rows: db.orders.map((o) => [
          o.number,
          o.type,
          o.title,
          customerOf(db, o.customerId)?.name ?? "",
          date(o.orderDate),
          date(o.dueDate),
          piecesOf(db, o.id).length,
          g(piecesOf(db, o.id).reduce((s, p) => s + p.estWeightMg, 0)),
          `${Math.round(orderProgress(db, o) * 100)}%`,
          orderStatus(db, o)?.label ?? "",
        ]),
      };
    if (r === "pieces")
      return {
        head: ["Piece", "Name", "Order", "Stage", "Location", "Received", "Est.", "Current", "Final", "Delivered"],
        rows: db.pieces.map((p) => [
          p.code,
          p.name,
          orderOf(db, p.orderId)?.number ?? "",
          stageOf(db, p.stageId)?.name ?? "",
          p.location,
          date(p.receivedAt),
          g(p.estWeightMg),
          g(p.currentWeightMg),
          g(p.finalWeightMg),
          date(p.deliveredAt),
        ]),
      };
    if (r === "karigars")
      return {
        head: ["Karigar", "Speciality", "Open", "To review", "Overdue", "Completed", "Metal in hand", "Net diff (done)", "Avg %"],
        rows: db.artisans.map((a) => {
          const l = artisanLoad(db, a.id);
          const iss = l.done.reduce((s, w) => s + w.issuedWeightMg, 0);
          return [
            a.name,
            a.speciality,
            l.open.length,
            l.submitted.length,
            l.overdue.length,
            l.done.length,
            g(l.metalOutMg),
            g(l.lossMg),
            iss ? `${((l.lossMg / iss) * 100).toFixed(2)}%` : "—",
          ];
        }),
      };
    if (r === "variance") {
      const rows: (string | number)[][] = [];
      const flag: boolean[] = [];
      db.pieces.forEach((p) =>
        weightJourney(db, p)
          .filter((x) => x.baseMg && x.kind !== "final")
          .forEach((x) => {
            rows.push([
              p.code,
              p.name,
              x.label,
              x.sub,
              date(x.at),
              g(x.baseMg),
              g(x.mg),
              g(x.mg - x.baseMg!),
              `${(((x.mg - x.baseMg!) / x.baseMg!) * 100).toFixed(2)}%`,
            ]);
            flag.push(overTolerance(db, x.baseMg, x.mg));
          }),
      );
      return { head: ["Piece", "Name", "Event", "Ref", "Date", "Out", "In", "Diff", "%"], rows, flag };
    }
    if (r === "jobwork")
      return {
        head: ["Challan", "Piece", "Vendor", "Process", "Sent", "Expected", "Returned", "Sent wt", "Return wt", "Charges", "Status"],
        rows: db.jobWorks.map((j) => [
          j.number,
          pieceOf(db, j.pieceId)?.code ?? "",
          vendorOf(db, j.vendorId)?.name ?? "",
          j.process,
          date(j.dispatchDate),
          date(j.expectedDate),
          date(j.returnedAt),
          g(j.sentWeightMg),
          g(j.returnedWeightMg),
          j.charges ?? "",
          jobStatus(db, j)?.label ?? "",
        ]),
      };
    return {
      head: ["Note", "Customer", "Order", "Date", "Pieces", "Weight", "Mode", "Received by"],
      rows: db.deliveries.map((d) => [
        d.number,
        customerOf(db, d.customerId)?.name ?? "",
        orderOf(db, d.orderId)?.number ?? "",
        date(d.date),
        d.items.length,
        g(d.items.reduce((s, i) => s + i.weightMg, 0)),
        d.mode,
        d.receivedBy,
      ]),
    };
  }, [db, r]);

  const csv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [table.head, ...table.rows].map((row) => row.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = `${r}-report.csv`;
    a.click();
  };

  if (!allowed)
    return (
      <Panel>
        <Empty icon={<Lock className="size-7" />} title="Reports are restricted" sub="Ask the owner to enable reports for your role." />
      </Panel>
    );
  return (
    <div>
      <PageHeader
        kicker="Registers"
        title="Reports"
        sub="Operational registers for follow-ups and audits. Export any of them to Excel (CSV)."
        actions={
          <Button variant="gold" icon={<Download className="size-4" />} onClick={csv}>
            Export CSV
          </Button>
        }
      />
      <Segmented
        className="mb-5"
        value={r}
        onChange={setR}
        options={[
          { value: "orders", label: "Orders" },
          { value: "pieces", label: "Pieces" },
          { value: "karigars", label: "Karigar performance" },
          { value: "variance", label: "Weight variance" },
          { value: "jobwork", label: "Job work" },
          { value: "deliveries", label: "Deliveries" },
        ]}
      />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-faint">
              {table.head.map((h) => (
                <th key={h} className="p-3.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className={table.flag?.[i] ? "border-b border-line bg-danger/5" : "border-b border-line last:border-0 hover:bg-panel"}>
                {row.map((c, j) => (
                  <td key={j} className="tabular p-3.5">
                    {j === 0 && table.flag?.[i] && <AlertTriangle className="mr-1 inline size-3.5 text-danger" />}
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {r === "variance" && <p className="mt-3 text-xs text-faint">Rows in red exceed the {db.settings.weightTolerancePct}% tolerance set in Settings.</p>}
    </div>
  );
}
