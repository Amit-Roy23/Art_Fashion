// Read-side helpers shared by pages (derived data, no mutation).
import { jobCategory, orderCategory, workCategory } from "./ops";
import type { Activity, DB, JobWork, Order, Piece, WorkOrder } from "./types";

export const customerOf = (db: DB, id: string) => db.customers.find((c) => c.id === id);
export const orderOf = (db: DB, id: string) => db.orders.find((o) => o.id === id);
export const pieceOf = (db: DB, id: string) => db.pieces.find((p) => p.id === id);
export const artisanOf = (db: DB, id?: string) => (id ? db.artisans.find((a) => a.id === id) : undefined);
export const vendorOf = (db: DB, id: string) => db.settings.vendors.find((v) => v.id === id);
export const stageOf = (db: DB, id: string) => db.settings.stages.find((s) => s.id === id);
export const piecesOf = (db: DB, orderId: string) => db.pieces.filter((p) => p.orderId === orderId);

export const orderStatus = (db: DB, o: Order) => db.settings.orderStatuses.find((s) => s.id === o.statusId);
export const workStatus = (db: DB, w: WorkOrder) => db.settings.workStatuses.find((s) => s.id === w.statusId);
export const jobStatus = (db: DB, j: JobWork) => db.settings.jobStatuses.find((s) => s.id === j.statusId);

export const isOpenWO = (db: DB, w: WorkOrder) => workCategory(db, w.statusId) !== "DONE";
export const isOpenJW = (j: JobWork) => !j.returnedAt;

export const activeWO = (db: DB, p: Piece) => (p.location === "ARTISAN" ? db.workOrders.find((w) => w.pieceId === p.id && isOpenWO(db, w)) : undefined);
export const activeJW = (db: DB, p: Piece) => (p.location === "JOBWORK" ? db.jobWorks.find((j) => j.pieceId === p.id && isOpenJW(j)) : undefined);

export function stageProgress(db: DB, p: Piece) {
  if (p.location === "DELIVERED" || p.location === "READY") return 1;
  const st = db.settings.stages;
  const i = st.findIndex((s) => s.id === p.stageId);
  return st.length > 1 ? Math.max(0, i) / (st.length - 1) : 0;
}

export function orderProgress(db: DB, o: Order) {
  const ps = piecesOf(db, o.id);
  if (!ps.length) return 0;
  return ps.reduce((s, p) => s + stageProgress(db, p), 0) / ps.length;
}

export const orderCat = (db: DB, o: Order) => orderCategory(db, o);
export const isOrderOpen = (db: DB, o: Order) => !["DONE", "CANCELLED"].includes(orderCategory(db, o));

export function coverPhoto(p: Piece) {
  return [...p.photos].reverse().find((x) => x.kind === "final" || x.kind === "submission") ?? p.photos.at(-1);
}

export interface WeightPoint {
  label: string;
  sub: string;
  at: string;
  mg: number;
  baseMg?: number;
  kind: "est" | "issue" | "submit" | "send" | "return" | "final" | "deliver";
}

export function weightJourney(db: DB, p: Piece): WeightPoint[] {
  const pts: WeightPoint[] = [{ label: "Estimated", sub: "At order booking", at: p.receivedAt, mg: p.estWeightMg, kind: "est" }];
  db.workOrders
    .filter((w) => w.pieceId === p.id)
    .forEach((w) => {
      const a = artisanOf(db, w.artisanId)?.name ?? "karigar";
      const st = stageOf(db, w.stageId)?.name ?? "";
      pts.push({ label: `Issued to ${a}`, sub: `${w.number} · ${st}`, at: w.issuedAt, mg: w.issuedWeightMg, kind: "issue" });
      if (w.submittedWeightMg)
        pts.push({
          label: `Submitted by ${a}`,
          sub: `${w.number} · ${st}`,
          at: w.submittedAt!,
          mg: w.submittedWeightMg,
          baseMg: w.issuedWeightMg,
          kind: "submit",
        });
    });
  db.jobWorks
    .filter((j) => j.pieceId === p.id)
    .forEach((j) => {
      const v = vendorOf(db, j.vendorId)?.name ?? "vendor";
      pts.push({ label: `Sent for ${j.process}`, sub: `${j.number} · ${v}`, at: j.sentAt ?? j.dispatchDate, mg: j.sentWeightMg, kind: "send" });
      if (j.returnedWeightMg)
        pts.push({
          label: `Returned from ${v}`,
          sub: `${j.number} · ${j.process}`,
          at: j.returnedAt!,
          mg: j.returnedWeightMg,
          baseMg: j.sentWeightMg,
          kind: "return",
        });
    });
  if (p.finalWeightMg)
    pts.push({ label: "Final (QC)", sub: "Recorded at quality check", at: p.readyAt!, mg: p.finalWeightMg, baseMg: p.estWeightMg, kind: "final" });
  const d = db.deliveries.find((x) => x.items.some((i) => i.pieceId === p.id));
  if (d)
    pts.push({ label: "Delivered", sub: `${d.number} · ${d.receivedBy}`, at: d.date, mg: d.items.find((i) => i.pieceId === p.id)!.weightMg, kind: "deliver" });
  // estimate first, QC & delivery last; the hand-offs in between by when they were recorded
  const rank = (k: WeightPoint["kind"]) => (k === "est" ? 0 : k === "final" ? 2 : k === "deliver" ? 3 : 1);
  return pts.sort((a, b) => rank(a.kind) - rank(b.kind) || a.at.localeCompare(b.at));
}

export function overTolerance(db: DB, baseMg?: number, mg?: number) {
  if (!baseMg || !mg) return false;
  return (Math.abs(mg - baseMg) / baseMg) * 100 > db.settings.weightTolerancePct;
}

export function activityFor(db: DB, f: { orderId?: string; pieceId?: string; artisanId?: string }): Activity[] {
  return db.activity.filter(
    (a) =>
      (f.orderId && a.orderId === f.orderId) ||
      (f.pieceId &&
        (a.pieceId === f.pieceId ||
          a.pieceIds?.includes(f.pieceId) ||
          (!a.pieceId && !a.pieceIds && a.orderId === pieceOf(db, f.pieceId)?.orderId && a.icon === "order"))) ||
      (f.artisanId && a.artisanId === f.artisanId),
  );
}

export function artisanLoad(db: DB, artisanId: string) {
  const open = db.workOrders.filter((w) => w.artisanId === artisanId && isOpenWO(db, w));
  const submitted = open.filter((w) => workCategory(db, w.statusId) === "SUBMITTED");
  const overdue = open.filter((w) => workCategory(db, w.statusId) !== "SUBMITTED" && new Date(w.dueDate) < new Date());
  const metalOutMg = open.filter((w) => workCategory(db, w.statusId) !== "SUBMITTED").reduce((s, w) => s + w.issuedWeightMg, 0);
  const done = db.workOrders.filter((w) => w.artisanId === artisanId && workCategory(db, w.statusId) === "DONE");
  const lossMg = done.reduce((s, w) => s + ((w.submittedWeightMg ?? w.issuedWeightMg) - w.issuedWeightMg), 0);
  return { open, submitted, overdue, metalOutMg, done, lossMg };
}

/** Weight of a piece as best known now: final, else last measured, else estimate. */
export const liveWeight = (p: Piece) => p.finalWeightMg ?? p.currentWeightMg ?? p.estWeightMg;

/** Running (open, undelivered) work per metal, in the order metals are configured. */
export function runningByMetal(db: DB) {
  return db.settings.metals.map((m) => {
    const orders = db.orders.filter((o) => o.metal === m.name && isOrderOpen(db, o));
    const pieces = orders.flatMap((o) => piecesOf(db, o.id)).filter((p) => p.location !== "DELIVERED");
    return {
      metal: m.name,
      orders: orders.length,
      pieces: pieces.length,
      weightMg: pieces.reduce((s, p) => s + liveWeight(p), 0),
      valueRs: pieces.reduce((s, p) => s + (p.valueRs ?? 0), 0),
    };
  });
}

export { jobCategory, workCategory, orderCategory };
