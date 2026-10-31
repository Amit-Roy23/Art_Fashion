// Register builders shared by screens, PDF and Excel export, so all three show the same rows.
import { artisanOf, coverPhoto, customerOf, orderOf, overTolerance, pieceOf, stageOf, vendorOf, jobCategory, workCategory } from "./queries";
import type { DB, JobWork, WorkOrder } from "./types";
import type { RegisterSpec } from "./pdf-client";
import { date } from "./format";

const grams = (mg?: number) => (mg == null ? "—" : (mg / 1000).toFixed(3));
const diffText = (base: number, v?: number) =>
  v == null ? "—" : `${v - base >= 0 ? "+" : ""}${((v - base) / 1000).toFixed(3)} (${(((v - base) / base) * 100).toFixed(2)}%)`;

export type WorkFilter = "pending" | "completed" | "all";

export function filterWork(db: DB, list: WorkOrder[], f: WorkFilter) {
  return list.filter((w) => {
    const done = workCategory(db, w.statusId) === "DONE";
    return f === "all" || (f === "completed" ? done : !done);
  });
}

/** Karigar work register: one row per work order, with issue and submission dates and weights. */
export function workRegister(db: DB, wos: WorkOrder[], opts: { title: string; fileName: string; subtitle: string; showKarigar?: boolean }): RegisterSpec {
  const status = (w: WorkOrder) => db.settings.workStatuses.find((s) => s.id === w.statusId)?.label ?? "";
  const columns: RegisterSpec["columns"] = [
    { label: "WO no.", width: 1.25 },
    ...(opts.showKarigar ? [{ label: "Karigar", width: 1.3 }] : []),
    { label: "Piece", width: 2 },
    { label: "Order", width: 1.25 },
    { label: "Metal", width: 0.8 },
    { label: "Stage", width: 1.4 },
    { label: "Issued on", width: 1.1 },
    { label: "Due", width: 1 },
    { label: "Submitted on", width: 1.15 },
    { label: "Issued wt (g)", width: 1, align: "right" },
    { label: "Submitted wt (g)", width: 1.1, align: "right" },
    { label: "Diff g (%)", width: 1.35, align: "right" },
    { label: "Status", width: 1.3 },
  ];
  const rows = wos.map((w) => {
    const p = pieceOf(db, w.pieceId);
    const o = p && orderOf(db, p.orderId);
    return {
      cells: [
        w.number,
        ...(opts.showKarigar ? [artisanOf(db, w.artisanId)?.name ?? ""] : []),
        `${p?.name ?? ""} (${p?.code ?? ""})`,
        o?.number ?? "",
        o?.metal ?? "",
        stageOf(db, w.stageId)?.name ?? "",
        date(w.issuedAt),
        date(w.dueDate),
        w.submittedAt ? date(w.submittedAt) : "—",
        grams(w.issuedWeightMg),
        grams(w.submittedWeightMg),
        diffText(w.issuedWeightMg, w.submittedWeightMg),
        status(w),
      ],
      photoUrl: p ? coverPhoto(p)?.url : undefined,
      flag: overTolerance(db, w.issuedWeightMg, w.submittedWeightMg),
    };
  });
  const issued = wos.reduce((s, w) => s + w.issuedWeightMg, 0);
  const sub = wos.filter((w) => w.submittedWeightMg);
  const subIssued = sub.reduce((s, w) => s + w.issuedWeightMg, 0);
  const subWeight = sub.reduce((s, w) => s + (w.submittedWeightMg ?? 0), 0);
  const totals = columns.map(() => "");
  totals[0] = `${wos.length} work orders`;
  totals[columns.length - 4] = grams(issued);
  totals[columns.length - 3] = grams(subWeight);
  totals[columns.length - 2] = sub.length ? diffText(subIssued, subWeight) : "—";
  const pending = wos.filter((w) => workCategory(db, w.statusId) !== "DONE");
  return {
    title: opts.title,
    fileName: opts.fileName,
    subtitle: opts.subtitle,
    stats: [
      { label: "Work orders", value: String(wos.length) },
      { label: "Pending", value: String(pending.length) },
      { label: "Completed", value: String(wos.length - pending.length) },
      { label: "Metal issued", value: `${grams(issued)} g` },
      { label: "Metal in hand (pending)", value: `${grams(pending.filter((w) => !w.submittedAt).reduce((s, w) => s + w.issuedWeightMg, 0))} g` },
    ],
    columns,
    rows,
    totals,
    note: `Rows in red differ by more than the ${db.settings.weightTolerancePct}% weight tolerance. Diff = submitted − issued.`,
  };
}

/** Vendor (outside job work) register: one row per challan, weights out and in. */
export function vendorRegister(db: DB, jws: JobWork[], opts: { title: string; fileName: string; subtitle: string; showVendor?: boolean }): RegisterSpec {
  const columns: RegisterSpec["columns"] = [
    { label: "Challan", width: 1.2 },
    ...(opts.showVendor ? [{ label: "Vendor", width: 1.6 }] : []),
    { label: "Piece", width: 2 },
    { label: "Order / customer", width: 1.7 },
    { label: "Process", width: 1.2 },
    { label: "Sent on", width: 1.05 },
    { label: "Expected", width: 1.05 },
    { label: "Returned on", width: 1.1 },
    { label: "Sent wt (g)", width: 1, align: "right" },
    { label: "Return wt (g)", width: 1, align: "right" },
    { label: "Diff g (%)", width: 1.35, align: "right" },
    { label: "Charges", width: 0.9, align: "right" },
    { label: "Status", width: 1 },
  ];
  const rows = jws.map((j) => {
    const p = pieceOf(db, j.pieceId);
    const o = p && orderOf(db, p.orderId);
    return {
      cells: [
        j.number,
        ...(opts.showVendor ? [vendorOf(db, j.vendorId)?.name ?? ""] : []),
        `${p?.name ?? ""} (${p?.code ?? ""})`,
        `${o?.number ?? ""} · ${o ? (customerOf(db, o.customerId)?.name ?? "") : ""}`,
        j.process,
        date(j.dispatchDate),
        date(j.expectedDate),
        j.returnedAt ? date(j.returnedAt) : "—",
        grams(j.sentWeightMg),
        grams(j.returnedWeightMg),
        diffText(j.sentWeightMg, j.returnedWeightMg),
        j.charges != null ? `Rs. ${j.charges.toLocaleString("en-IN")}` : "—",
        db.settings.jobStatuses.find((s) => s.id === j.statusId)?.label ?? "",
      ],
      photoUrl: p ? coverPhoto(p)?.url : undefined,
      flag: overTolerance(db, j.sentWeightMg, j.returnedWeightMg),
    };
  });
  const out = jws.filter((j) => !j.returnedAt);
  const back = jws.filter((j) => j.returnedAt);
  const totals = columns.map(() => "");
  totals[0] = `${jws.length} challans`;
  totals[columns.length - 5] = grams(jws.reduce((s, j) => s + j.sentWeightMg, 0));
  totals[columns.length - 4] = grams(back.reduce((s, j) => s + (j.returnedWeightMg ?? 0), 0));
  totals[columns.length - 2] = `Rs. ${jws.reduce((s, j) => s + (j.charges ?? 0), 0).toLocaleString("en-IN")}`;
  return {
    title: opts.title,
    fileName: opts.fileName,
    subtitle: opts.subtitle,
    stats: [
      { label: "Challans", value: String(jws.length) },
      { label: "Currently out", value: String(out.length) },
      { label: "Weight out now", value: `${grams(out.reduce((s, j) => s + j.sentWeightMg, 0))} g` },
      { label: "Returned", value: String(back.length) },
      {
        label: "Net diff (returned)",
        value: back.length
          ? `${diffText(
              back.reduce((s, j) => s + j.sentWeightMg, 0),
              back.reduce((s, j) => s + (j.returnedWeightMg ?? 0), 0),
            )} g`
          : "—",
      },
    ],
    columns,
    rows,
    totals,
    note: `Rows in red differ by more than the ${db.settings.weightTolerancePct}% weight tolerance. Diff = returned − sent.`,
  };
}

export const isOpenJob = (db: DB, j: JobWork) => jobCategory(db, j.statusId) !== "RETURNED";
