// Pure business operations on the DB. They mutate the draft they are given:
// the client store wraps them in immer, and the backend seed replays them on a
// plain object to build a realistic history. No React / browser APIs here.
import type { Activity, Artisan, Challan, Customer, DB, JobCategory, Order, OrderCategory, Photo, Piece, Vendor, WorkCategory } from "./types";

export interface Ctx {
  now: string;
  by: string;
}

export class OpError extends Error {}

let idSeq = 0;
export function uid(prefix = "") {
  idSeq = (idSeq + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${idSeq.toString(36)}`;
}

function nextNumber(db: DB, key: string, prefix: string, at: string) {
  db.counters[key] = (db.counters[key] ?? 0) + 1;
  const yy = at.slice(2, 4);
  return `${prefix}-${yy}-${String(db.counters[key]).padStart(4, "0")}`;
}

function requireRemarks(remarks: string | undefined, what = "Remarks") {
  if (!remarks || remarks.trim().length < 3) throw new OpError(`${what} are mandatory (min 3 characters).`);
  return remarks.trim();
}

function log(db: DB, ctx: Ctx, a: Omit<Activity, "id" | "at" | "by">) {
  db.activity.unshift({ id: uid("a"), at: ctx.now, by: ctx.by, ...a });
}

export function statusByCategory<C extends string>(list: { id: string; category: C }[], cat: C) {
  return list.find((s) => s.category === cat)?.id ?? list[0]?.id;
}

export function orderCategory(db: DB, o: Order): OrderCategory {
  return db.settings.orderStatuses.find((s) => s.id === o.statusId)?.category ?? "NEW";
}
export function workCategory(db: DB, statusId: string): WorkCategory {
  return db.settings.workStatuses.find((s) => s.id === statusId)?.category ?? "ISSUED";
}
export function jobCategory(db: DB, statusId: string): JobCategory {
  return db.settings.jobStatuses.find((s) => s.id === statusId)?.category ?? "SENT";
}

function get<T extends { id: string }>(list: T[], id: string, what: string): T {
  const x = list.find((i) => i.id === id);
  if (!x) throw new OpError(`${what} not found`);
  return x;
}

function stamp(photos: Partial<Photo>[] | undefined, kind: Photo["kind"], ctx: Ctx): Photo[] {
  return (photos ?? []).map((p) => ({
    id: p.id ?? uid("p"),
    url: p.url!,
    caption: p.caption,
    kind: p.kind ?? kind,
    by: p.by ?? ctx.by,
    at: p.at ?? ctx.now,
  }));
}

function nextStageId(db: DB, stageId: string) {
  const st = db.settings.stages;
  const i = st.findIndex((s) => s.id === stageId);
  return st[Math.min(st.length - 1, i + 1)]?.id ?? stageId;
}

/** Re-derives the order status from its pieces after a production event (manual HOLD/CANCELLED wins). */
function syncOrder(db: DB, orderId: string, ctx: Ctx) {
  const o = db.orders.find((x) => x.id === orderId);
  if (!o) return;
  const cat = orderCategory(db, o);
  if (cat === "CANCELLED") return;
  const ps = db.pieces.filter((p) => p.orderId === orderId);
  const delivered = ps.filter((p) => p.location === "DELIVERED").length;
  const ready = ps.filter((p) => p.location === "READY").length;
  let target: OrderCategory | null = null;
  if (ps.length && delivered === ps.length) target = "DONE";
  else if (delivered > 0) target = "PARTIAL";
  else if (ps.length && ready === ps.length) target = "READY";
  else if (ps.some((p) => p.location !== "OFFICE" || p.stageId !== db.settings.stages[0]?.id)) target = cat === "HOLD" ? null : "ACTIVE";
  if (target && target !== cat) {
    const sid = statusByCategory(db.settings.orderStatuses, target);
    if (sid && sid !== o.statusId) {
      o.statusId = sid;
      const label = db.settings.orderStatuses.find((s) => s.id === sid)?.label;
      log(db, ctx, { icon: "status", text: `Order ${o.number} moved to “${label}” automatically`, orderId });
    }
  }
}

// ---------------------------------------------------------------- customers
export function createCustomer(db: DB, input: Omit<Customer, "id" | "code" | "createdAt">, ctx: Ctx) {
  if (!input.name.trim()) throw new OpError("Customer name is required");
  if (!/^\d{10}$/.test(input.phone.replace(/\D/g, "").slice(-10))) throw new OpError("Enter a valid 10-digit phone number");
  const c: Customer = { ...input, id: uid("c"), code: nextNumber(db, "customer", "CUS", ctx.now), createdAt: ctx.now };
  db.customers.unshift(c);
  return c.id;
}

export function updateCustomer(db: DB, id: string, patch: Partial<Customer>) {
  Object.assign(get(db.customers, id, "Customer"), patch);
}

// ---------------------------------------------------------------- orders
export interface NewPiece {
  name: string;
  category: string;
  purity: string;
  size?: string;
  qty: number;
  specs: string;
  stones?: string;
  estWeightMg: number;
  valueRs?: number;
  remarks: string;
  photos: Partial<Photo>[];
}

export interface NewOrder {
  customerId: string;
  type: "PROJECT" | "PIECE";
  title: string;
  orderDate: string;
  dueDate: string;
  priority: Order["priority"];
  metal: string;
  remarks: string;
  photos: Partial<Photo>[];
  pieces: NewPiece[];
}

export function createOrder(db: DB, input: NewOrder, ctx: Ctx) {
  get(db.customers, input.customerId, "Customer");
  if (!input.title.trim()) throw new OpError("Order title is required");
  requireRemarks(input.remarks, "Order remarks");
  if (!input.pieces.length) throw new OpError("Add at least one piece");
  if (input.type === "PIECE" && input.pieces.length !== 1) throw new OpError("A piece-wise order has exactly one piece");
  if (!db.settings.metals.some((m) => m.name === input.metal)) throw new OpError("Choose the metal for this order");
  input.pieces.forEach((p, i) => {
    if (!p.name.trim()) throw new OpError(`Piece ${i + 1}: name is required`);
    if (!(p.estWeightMg > 0)) throw new OpError(`Piece ${i + 1}: estimated weight is required`);
    requireRemarks(p.remarks, `Piece ${i + 1} remarks`);
  });
  const number = nextNumber(db, "order", "ORD", ctx.now);
  const order: Order = {
    id: uid("o"),
    number,
    type: input.type,
    title: input.title.trim(),
    customerId: input.customerId,
    orderDate: input.orderDate,
    dueDate: input.dueDate,
    priority: input.priority,
    metal: input.metal,
    statusId: statusByCategory(db.settings.orderStatuses, "NEW"),
    remarks: input.remarks.trim(),
    photos: stamp(input.photos, "reference", ctx),
    createdBy: ctx.by,
    createdAt: ctx.now,
  };
  db.orders.unshift(order);
  input.pieces.forEach((p, i) => {
    const piece: Piece = {
      id: uid("pc"),
      code: `${number}-${String.fromCharCode(65 + i)}`,
      orderId: order.id,
      name: p.name.trim(),
      category: p.category,
      purity: p.purity,
      size: p.size,
      qty: p.qty || 1,
      specs: p.specs,
      stones: p.stones,
      estWeightMg: Math.round(p.estWeightMg),
      valueRs: p.valueRs && p.valueRs > 0 ? Math.round(p.valueRs) : undefined,
      stageId: db.settings.stages[0]?.id ?? "",
      location: "OFFICE",
      photos: stamp(p.photos, "reference", ctx),
      remarks: p.remarks.trim(),
      receivedAt: input.orderDate,
    };
    db.pieces.push(piece);
  });
  const c = db.customers.find((x) => x.id === input.customerId);
  log(db, ctx, {
    icon: "order",
    text: `${input.type === "PROJECT" ? "Project" : "Piece"} order ${number} received from ${c?.name} · ${input.pieces.length} piece${input.pieces.length > 1 ? "s" : ""}`,
    remarks: order.remarks,
    orderId: order.id,
    photos: order.photos.slice(0, 3),
  });
  return order.id;
}

export function updateOrderStatus(db: DB, orderId: string, statusId: string, remarks: string, ctx: Ctx) {
  const o = get(db.orders, orderId, "Order");
  const r = requireRemarks(remarks);
  const st = get(db.settings.orderStatuses, statusId, "Status");
  o.statusId = statusId;
  log(db, ctx, { icon: "status", text: `Order ${o.number} status → ${st.label}`, remarks: r, orderId });
}

export function addPhotos(db: DB, target: { orderId?: string; pieceId?: string }, photos: Partial<Photo>[], caption: string, ctx: Ctx) {
  const ps = stamp(photos, "progress", ctx).map((p) => ({ ...p, caption: p.caption ?? caption }));
  if (!ps.length) throw new OpError("Choose at least one photo");
  if (target.pieceId) {
    const p = get(db.pieces, target.pieceId, "Piece");
    p.photos.push(...ps);
    log(db, ctx, {
      icon: "photo",
      text: `${ps.length} photo${ps.length > 1 ? "s" : ""} added to ${p.code}`,
      remarks: caption,
      pieceId: p.id,
      orderId: p.orderId,
      photos: ps,
    });
  } else if (target.orderId) {
    const o = get(db.orders, target.orderId, "Order");
    o.photos.push(...ps);
    log(db, ctx, { icon: "photo", text: `${ps.length} photo${ps.length > 1 ? "s" : ""} added to ${o.number}`, remarks: caption, orderId: o.id, photos: ps });
  }
}

export function addNote(db: DB, target: { orderId?: string; pieceId?: string }, remarks: string, ctx: Ctx) {
  const r = requireRemarks(remarks, "Note");
  const piece = target.pieceId ? get(db.pieces, target.pieceId, "Piece") : undefined;
  const orderId = piece?.orderId ?? target.orderId;
  const order = orderId ? get(db.orders, orderId, "Order") : undefined;
  log(db, ctx, { icon: "note", text: `Follow-up note on ${piece?.code ?? order?.number}`, remarks: r, pieceId: piece?.id, orderId });
}

// ---------------------------------------------------------------- artisans
export function issueWorkOrder(
  db: DB,
  input: { pieceId: string; artisanId: string; stageId: string; dueDate: string; issuedWeightMg: number; instructions: string; remarks: string },
  ctx: Ctx,
) {
  const p = get(db.pieces, input.pieceId, "Piece");
  const a = get(db.artisans, input.artisanId, "Karigar");
  if (p.location === "ARTISAN" || p.location === "JOBWORK")
    throw new OpError(`${p.code} is already out (${p.location === "ARTISAN" ? "with a karigar" : "at job work"})`);
  if (p.location === "DELIVERED") throw new OpError(`${p.code} is already delivered`);
  if (!(input.issuedWeightMg > 0)) throw new OpError("Issued weight is required");
  const r = requireRemarks(input.remarks);
  const wo = {
    id: uid("w"),
    number: nextNumber(db, "wo", "WO", ctx.now),
    pieceId: p.id,
    artisanId: a.id,
    stageId: input.stageId,
    statusId: statusByCategory(db.settings.workStatuses, "ISSUED"),
    issuedAt: ctx.now,
    dueDate: input.dueDate,
    issuedWeightMg: Math.round(input.issuedWeightMg),
    instructions: input.instructions,
    remarks: r,
    updates: [],
    submissionPhotos: [],
  };
  db.workOrders.unshift(wo);
  p.location = "ARTISAN";
  p.artisanId = a.id;
  p.stageId = input.stageId;
  p.currentWeightMg = wo.issuedWeightMg;
  const stage = db.settings.stages.find((s) => s.id === input.stageId)?.name;
  log(db, ctx, {
    icon: "assign",
    text: `${p.code} issued to ${a.name} for ${stage} · ${wo.number}`,
    remarks: r,
    pieceId: p.id,
    orderId: p.orderId,
    artisanId: a.id,
    weightMg: wo.issuedWeightMg,
  });
  syncOrder(db, p.orderId, ctx);
  return wo.id;
}

export function updateWorkStatus(db: DB, woId: string, statusId: string, remarks: string, ctx: Ctx) {
  const wo = get(db.workOrders, woId, "Work order");
  const r = requireRemarks(remarks);
  const st = get(db.settings.workStatuses, statusId, "Status");
  if (st.category === "SUBMITTED" || st.category === "DONE") throw new OpError("Use “Submit work” / “Review submission” for this step");
  if (["SUBMITTED", "DONE"].includes(workCategory(db, wo.statusId))) throw new OpError("This work order is already submitted");
  wo.statusId = statusId;
  const p = db.pieces.find((x) => x.id === wo.pieceId);
  log(db, ctx, {
    icon: "status",
    text: `${wo.number} (${p?.code}) → ${st.label}`,
    remarks: r,
    pieceId: wo.pieceId,
    orderId: p?.orderId,
    artisanId: wo.artisanId,
  });
}

export function addWorkUpdate(db: DB, woId: string, input: { percent: number; note: string; photos: Partial<Photo>[] }, ctx: Ctx) {
  const wo = get(db.workOrders, woId, "Work order");
  const note = requireRemarks(input.note, "Progress note");
  const photos = stamp(input.photos, "progress", ctx);
  wo.updates.push({ id: uid("u"), at: ctx.now, by: ctx.by, percent: input.percent, note, photos });
  if (["ISSUED", "REWORK"].includes(workCategory(db, wo.statusId))) wo.statusId = statusByCategory(db.settings.workStatuses, "ACTIVE");
  const p = get(db.pieces, wo.pieceId, "Piece");
  p.photos.push(...photos);
  log(db, ctx, {
    icon: "photo",
    text: `${ctx.by} posted progress on ${p.code} · ${input.percent}%`,
    remarks: note,
    pieceId: p.id,
    orderId: p.orderId,
    artisanId: wo.artisanId,
    photos,
  });
}

export function submitWork(db: DB, woId: string, input: { weightMg: number; note: string; photos: Partial<Photo>[] }, ctx: Ctx) {
  const wo = get(db.workOrders, woId, "Work order");
  if (!(input.weightMg > 0)) throw new OpError("Submitted weight is required");
  const note = requireRemarks(input.note, "Submission remarks");
  const photos = stamp(input.photos, "submission", ctx);
  if (!photos.length) throw new OpError("Attach at least one photo of the finished work");
  wo.statusId = statusByCategory(db.settings.workStatuses, "SUBMITTED");
  wo.submittedAt = ctx.now;
  wo.submittedWeightMg = Math.round(input.weightMg);
  wo.submissionNote = note;
  wo.submissionPhotos = photos;
  const p = get(db.pieces, wo.pieceId, "Piece");
  p.photos.push(...photos);
  p.currentWeightMg = wo.submittedWeightMg;
  const diff = wo.submittedWeightMg - wo.issuedWeightMg;
  log(db, ctx, {
    icon: "submit",
    text: `${p.code} submitted by karigar · ${(wo.submittedWeightMg / 1000).toFixed(3)} g (${diff >= 0 ? "+" : ""}${(diff / 1000).toFixed(3)} g)`,
    remarks: note,
    pieceId: p.id,
    orderId: p.orderId,
    artisanId: wo.artisanId,
    weightMg: wo.submittedWeightMg,
    photos,
  });
}

export function reviewWork(db: DB, woId: string, input: { approve: boolean; note: string; nextStageId?: string }, ctx: Ctx) {
  const wo = get(db.workOrders, woId, "Work order");
  const note = requireRemarks(input.note);
  const p = get(db.pieces, wo.pieceId, "Piece");
  wo.reviewedAt = ctx.now;
  wo.reviewNote = note;
  if (input.approve) {
    wo.statusId = statusByCategory(db.settings.workStatuses, "DONE");
    p.location = "OFFICE";
    p.artisanId = undefined;
    p.stageId = input.nextStageId ?? nextStageId(db, wo.stageId);
    const stage = db.settings.stages.find((s) => s.id === p.stageId)?.name;
    log(db, ctx, {
      icon: "approve",
      text: `${wo.number} approved · ${p.code} moves to ${stage}`,
      remarks: note,
      pieceId: p.id,
      orderId: p.orderId,
      artisanId: wo.artisanId,
    });
  } else {
    wo.statusId = statusByCategory(db.settings.workStatuses, "REWORK");
    log(db, ctx, { icon: "rework", text: `${wo.number} sent back for rework`, remarks: note, pieceId: p.id, orderId: p.orderId, artisanId: wo.artisanId });
  }
  syncOrder(db, p.orderId, ctx);
}

export function saveArtisan(db: DB, input: Omit<Artisan, "id" | "code" | "joinedAt" | "hue"> & { id?: string }, ctx: Ctx) {
  if (!input.name.trim()) throw new OpError("Name is required");
  if (input.id) {
    Object.assign(get(db.artisans, input.id, "Karigar"), input);
    return input.id;
  }
  const a: Artisan = { ...input, id: uid("k"), code: nextNumber(db, "artisan", "KAR", ctx.now), joinedAt: ctx.now, hue: Math.floor(Math.random() * 360) };
  db.artisans.push(a);
  db.users.push({ id: uid("u"), name: a.name, role: "KARIGAR", title: a.speciality, phone: a.phone, artisanId: a.id });
  return a.id;
}

// ---------------------------------------------------------------- job work
export function sendJobWork(
  db: DB,
  input: {
    pieceId: string;
    vendorId: string;
    process: string;
    dispatchDate: string;
    expectedDate: string;
    sentWeightMg: number;
    remarks: string;
    photos: Partial<Photo>[];
    stageId?: string;
  },
  ctx: Ctx,
) {
  const p = get(db.pieces, input.pieceId, "Piece");
  const v = get(db.settings.vendors, input.vendorId, "Vendor");
  if (p.location === "ARTISAN" || p.location === "JOBWORK") throw new OpError(`${p.code} is not in the office right now`);
  if (p.location === "DELIVERED") throw new OpError(`${p.code} is already delivered`);
  if (!(input.sentWeightMg > 0)) throw new OpError("Sent weight is required");
  const r = requireRemarks(input.remarks);
  const photos = stamp(input.photos, "jobwork", ctx);
  const jw = {
    id: uid("j"),
    number: nextNumber(db, "jw", "JW", ctx.now),
    pieceId: p.id,
    vendorId: v.id,
    process: input.process,
    statusId: statusByCategory(db.settings.jobStatuses, "SENT"),
    dispatchDate: input.dispatchDate,
    sentAt: ctx.now,
    expectedDate: input.expectedDate,
    sentWeightMg: Math.round(input.sentWeightMg),
    remarks: r,
    photos,
  };
  db.jobWorks.unshift(jw);
  p.location = "JOBWORK";
  p.currentWeightMg = jw.sentWeightMg;
  p.stageId = input.stageId ?? db.settings.stages.find((s) => s.handledBy === "JOBWORK")?.id ?? p.stageId;
  p.photos.push(...photos);
  log(db, ctx, {
    icon: "jobout",
    text: `${p.code} sent to ${v.name} for ${input.process} · challan ${jw.number}`,
    remarks: r,
    pieceId: p.id,
    orderId: p.orderId,
    weightMg: jw.sentWeightMg,
    photos,
  });
  syncOrder(db, p.orderId, ctx);
  return jw.id;
}

export function updateJobStatus(db: DB, jwId: string, statusId: string, remarks: string, ctx: Ctx) {
  const jw = get(db.jobWorks, jwId, "Job work");
  const r = requireRemarks(remarks);
  const st = get(db.settings.jobStatuses, statusId, "Status");
  if (st.category === "RETURNED") throw new OpError("Use “Receive back” to record the return with weight");
  jw.statusId = statusId;
  const p = db.pieces.find((x) => x.id === jw.pieceId);
  log(db, ctx, { icon: "status", text: `${jw.number} (${p?.code}) → ${st.label}`, remarks: r, pieceId: jw.pieceId, orderId: p?.orderId });
}

export function receiveJobWork(
  db: DB,
  jwId: string,
  input: { returnedWeightMg: number; charges?: number; remarks: string; photos: Partial<Photo>[] },
  ctx: Ctx,
) {
  const jw = get(db.jobWorks, jwId, "Job work");
  if (jw.returnedAt) throw new OpError("Already received");
  if (!(input.returnedWeightMg > 0)) throw new OpError("Returned weight is required");
  const r = requireRemarks(input.remarks);
  const photos = stamp(input.photos, "jobwork", ctx);
  jw.returnedAt = ctx.now;
  jw.returnedWeightMg = Math.round(input.returnedWeightMg);
  jw.charges = input.charges;
  jw.returnRemarks = r;
  jw.photos.push(...photos);
  jw.statusId = statusByCategory(db.settings.jobStatuses, "RETURNED");
  const p = get(db.pieces, jw.pieceId, "Piece");
  p.location = "OFFICE";
  p.currentWeightMg = jw.returnedWeightMg;
  p.stageId = nextStageId(db, p.stageId);
  p.photos.push(...photos);
  const v = db.settings.vendors.find((x) => x.id === jw.vendorId);
  const diff = jw.returnedWeightMg - jw.sentWeightMg;
  log(db, ctx, {
    icon: "jobin",
    text: `${p.code} received back from ${v?.name} · ${(jw.returnedWeightMg / 1000).toFixed(3)} g (${diff >= 0 ? "+" : ""}${(diff / 1000).toFixed(3)} g)`,
    remarks: r,
    pieceId: p.id,
    orderId: p.orderId,
    weightMg: jw.returnedWeightMg,
    photos,
  });
  syncOrder(db, p.orderId, ctx);
}

// ---------------------------------------------------------------- production flow
export function moveStage(db: DB, pieceId: string, stageId: string, remarks: string, ctx: Ctx) {
  const p = get(db.pieces, pieceId, "Piece");
  const r = requireRemarks(remarks);
  if (p.location === "DELIVERED") throw new OpError("Delivered pieces cannot move");
  const from = db.settings.stages.find((s) => s.id === p.stageId)?.name;
  const to = get(db.settings.stages, stageId, "Stage").name;
  p.stageId = stageId;
  log(db, ctx, { icon: "stage", text: `${p.code} moved ${from} → ${to}`, remarks: r, pieceId: p.id, orderId: p.orderId });
  syncOrder(db, p.orderId, ctx);
}

export function markReady(db: DB, pieceId: string, input: { finalWeightMg: number; remarks: string; photos: Partial<Photo>[] }, ctx: Ctx) {
  const p = get(db.pieces, pieceId, "Piece");
  if (p.location !== "OFFICE") throw new OpError(`${p.code} must be in the office (not with a karigar / vendor)`);
  if (!(input.finalWeightMg > 0)) throw new OpError("Final weight is required");
  const r = requireRemarks(input.remarks);
  const photos = stamp(input.photos, "final", ctx);
  if (!photos.length && !p.photos.some((x) => x.kind === "final")) throw new OpError("Attach a final photograph of the piece");
  p.location = "READY";
  p.finalWeightMg = Math.round(input.finalWeightMg);
  p.currentWeightMg = p.finalWeightMg;
  p.readyAt = ctx.now;
  p.stageId = db.settings.stages[db.settings.stages.length - 1]?.id ?? p.stageId;
  p.photos.push(...photos);
  log(db, ctx, {
    icon: "ready",
    text: `${p.code} passed QC · ready for delivery at ${(p.finalWeightMg / 1000).toFixed(3)} g`,
    remarks: r,
    pieceId: p.id,
    orderId: p.orderId,
    weightMg: p.finalWeightMg,
    photos,
  });
  syncOrder(db, p.orderId, ctx);
}

export function createDelivery(
  db: DB,
  input: {
    orderId: string;
    pieceIds: string[];
    date: string;
    mode: "Hand delivery" | "Courier" | "Showroom pickup";
    receivedBy: string;
    remarks: string;
    photos: Partial<Photo>[];
  },
  ctx: Ctx,
) {
  const o = get(db.orders, input.orderId, "Order");
  if (!input.pieceIds.length) throw new OpError("Select at least one piece to deliver");
  if (!input.receivedBy.trim()) throw new OpError("Receiver name is required");
  const r = requireRemarks(input.remarks);
  const pieces = input.pieceIds.map((id) => get(db.pieces, id, "Piece"));
  const notReady = pieces.find((p) => p.location !== "READY");
  if (notReady) throw new OpError(`${notReady.code} is not ready for delivery`);
  const photos = stamp(input.photos, "delivery", ctx);
  const d = {
    id: uid("d"),
    number: nextNumber(db, "del", "DEL", ctx.now),
    orderId: o.id,
    customerId: o.customerId,
    items: pieces.map((p) => ({ pieceId: p.id, weightMg: p.finalWeightMg ?? p.currentWeightMg ?? p.estWeightMg })),
    date: input.date,
    mode: input.mode,
    receivedBy: input.receivedBy.trim(),
    remarks: r,
    photos,
  };
  db.deliveries.unshift(d);
  pieces.forEach((p) => {
    p.location = "DELIVERED";
    p.deliveredAt = input.date;
    p.photos.push(...photos);
  });
  log(db, ctx, {
    icon: "deliver",
    text: `${d.number}: ${pieces.length} piece${pieces.length > 1 ? "s" : ""} of ${o.number} delivered to ${d.receivedBy} (${d.mode})`,
    remarks: r,
    orderId: o.id,
    pieceIds: pieces.map((p) => p.id),
    weightMg: d.items.reduce((s, i) => s + i.weightMg, 0),
    photos,
  });
  syncOrder(db, o.id, ctx);
  return d.id;
}

// ---------------------------------------------------------------- delivery / road challan
export function createChallan(db: DB, input: Omit<Challan, "id" | "number" | "customerId" | "createdBy">, ctx: Ctx) {
  const o = get(db.orders, input.orderId, "Order");
  if (!input.items.length) throw new OpError("Select at least one piece for the challan");
  if (!input.toPlace.trim()) throw new OpError("Destination is required");
  if (input.mode === "Road transport" && !input.vehicleNo?.trim()) throw new OpError("Vehicle number is required for road transport");
  const r = requireRemarks(input.remarks);
  input.items.forEach((i) => {
    const p = get(db.pieces, i.pieceId, "Piece");
    if (p.orderId !== o.id) throw new OpError(`${p.code} is not part of ${o.number}`);
    if (!(i.weightMg > 0)) throw new OpError(`${p.code}: weight is required`);
    if (!(i.valueRs >= 0)) throw new OpError(`${p.code}: value is required`);
  });
  const c: Challan = {
    ...input,
    id: uid("dc"),
    number: nextNumber(db, "challan", "DC", ctx.now),
    customerId: o.customerId,
    items: input.items.map((i) => ({ pieceId: i.pieceId, weightMg: Math.round(i.weightMg), valueRs: Math.round(i.valueRs) })),
    remarks: r,
    createdBy: ctx.by,
  };
  db.challans.unshift(c);
  const total = c.items.reduce((s, i) => s + i.valueRs, 0);
  log(db, ctx, {
    icon: "challan",
    text: `${c.mode === "Road transport" ? "Road" : "Delivery"} challan ${c.number} for ${o.number} · ${c.items.length} piece${c.items.length > 1 ? "s" : ""} · ₹${total.toLocaleString("en-IN")}`,
    remarks: r,
    orderId: o.id,
    pieceIds: c.items.map((i) => i.pieceId),
    weightMg: c.items.reduce((s, i) => s + i.weightMg, 0),
  });
  return c.id;
}

// ---------------------------------------------------------------- vendors (outside job workers)
export function saveVendor(db: DB, input: Omit<Vendor, "id"> & { id?: string }) {
  if (!input.name.trim()) throw new OpError("Vendor name is required");
  if (!input.processes.length) throw new OpError("Select at least one process this vendor does");
  if (input.id) {
    Object.assign(get(db.settings.vendors, input.id, "Vendor"), input);
    return input.id;
  }
  const v: Vendor = { ...input, name: input.name.trim(), id: uid("v") };
  db.settings.vendors.push(v);
  return v.id;
}

export function deleteVendor(db: DB, id: string) {
  if (db.jobWorks.some((j) => j.vendorId === id)) throw new OpError("This vendor has job work history — it cannot be deleted");
  db.settings.vendors = db.settings.vendors.filter((v) => v.id !== id);
}
