"use client";
// Collects the data a document needs, embeds its photos, and asks the backend
// (/api/pdf) to render the PDF. Registers can also be exported to Excel.
// Karigar work orders deliberately omit customer contact details and prices.
import { toast } from "sonner";
import { getDB } from "./store";
import { artisanOf, coverPhoto, customerOf, orderOf, orderStatus, pieceOf, stageOf, vendorOf } from "./queries";
import type { Photo, Piece } from "./types";

export type DocKind = "work-order" | "job-challan" | "delivery-note" | "delivery-challan" | "order-summary";

/**
 * Re-encodes any image the browser can show (JPEG, PNG, WebP, HEIC on iPhone…) as a
 * resized JPEG data URL — the PDF engine only reads JPEG/PNG, and this keeps requests small.
 */
export async function toJpeg(url: string, max = 700): Promise<string | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

async function gallery(list: (Photo | undefined)[], max = 4) {
  const seen = new Set<string>();
  const out: { url: string; caption: string }[] = [];
  for (const p of list) {
    if (!p || seen.has(p.url) || out.length >= max) continue;
    seen.add(p.url);
    const url = await toJpeg(p.url);
    if (url) out.push({ url, caption: p.caption ?? "" });
  }
  return out;
}

const itemPhoto = async (p: Piece) => {
  const ph = coverPhoto(p) ?? p.photos.at(-1);
  return ph ? ((await toJpeg(ph.url, 300)) ?? undefined) : undefined;
};

const LOCATION: Record<Piece["location"], string> = {
  OFFICE: "In office",
  ARTISAN: "With karigar",
  JOBWORK: "At job work",
  READY: "Ready",
  DELIVERED: "Delivered",
};

// ─────────────────────────────────────────────── amount in words (Indian system)
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? " " + ONES[r % 10] : ""}`;
  return [h ? `${ONES[h]} Hundred` : "", rest].filter(Boolean).join(" ");
}
export function rupeesInWords(n: number) {
  n = Math.round(n);
  if (!n) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return `Rupees ${parts.join(" ")} Only`;
}

// ─────────────────────────────────────────────── documents
async function payload(kind: DocKind, id: string) {
  const db = getDB();
  const company = db.settings.company;
  if (kind === "work-order") {
    const wo = db.workOrders.find((w) => w.id === id)!;
    const piece = pieceOf(db, wo.pieceId)!;
    const order = orderOf(db, piece.orderId)!;
    const a = artisanOf(db, wo.artisanId);
    const ref = piece.photos.filter((p) => ["design", "reference"].includes(p.kind));
    return {
      company,
      title: "Karigar Work Order",
      number: wo.number,
      date: wo.issuedAt,
      dueDate: wo.dueDate,
      party: { label: "Karigar", name: a?.name, sub: a?.speciality, phone: a?.phone },
      ref: {
        order: order.number,
        orderTitle: order.title,
        metal: order.metal,
        priority: order.priority,
        stage: stageOf(db, wo.stageId)?.name,
        issuedBy: db.activity.find((x) => x.icon === "assign" && x.text.includes(wo.number))?.by,
      },
      rows: [
        {
          code: piece.code,
          name: piece.name,
          purity: piece.purity,
          qty: piece.qty,
          size: piece.size,
          weightMg: wo.issuedWeightMg,
          specs: piece.specs,
          stones: piece.stones,
          photo: await itemPhoto(piece),
        },
      ],
      weightLabel: "Issued weight",
      instructions: wo.instructions,
      remarks: wo.remarks,
      photos: await gallery([...ref, ...order.photos, coverPhoto(piece)]),
      signatures: ["Issued by", `Karigar (${a?.name ?? ""})`],
    };
  }
  if (kind === "job-challan") {
    const jw = db.jobWorks.find((j) => j.id === id)!;
    const piece = pieceOf(db, jw.pieceId)!;
    const v = vendorOf(db, jw.vendorId);
    return {
      company,
      title: "Job Work Challan",
      number: jw.number,
      date: jw.dispatchDate,
      dueDate: jw.expectedDate,
      party: { label: "Job worker", name: v?.name, sub: `${v?.city} · ${jw.process}`, phone: v?.phone },
      ref: { order: orderOf(db, piece.orderId)?.number, metal: orderOf(db, piece.orderId)?.metal, process: jw.process },
      rows: [
        {
          code: piece.code,
          name: piece.name,
          purity: piece.purity,
          qty: piece.qty,
          size: piece.size,
          weightMg: jw.sentWeightMg,
          specs: piece.specs,
          stones: piece.stones,
          returnedMg: jw.returnedWeightMg,
          photo: await itemPhoto(piece),
        },
      ],
      weightLabel: "Sent weight",
      instructions: `Process: ${jw.process}. Return with the same challan number. Report weight on return.`,
      remarks: jw.remarks,
      photos: await gallery(jw.photos, 3),
      signatures: ["Dispatched by", "Received by (job worker)"],
    };
  }
  if (kind === "delivery-challan") {
    const c = db.challans.find((x) => x.id === id)!;
    const cust = customerOf(db, c.customerId);
    const order = orderOf(db, c.orderId);
    const rows = [];
    for (const i of c.items) {
      const p = pieceOf(db, i.pieceId)!;
      rows.push({
        code: p.code,
        name: p.name,
        purity: p.purity,
        qty: p.qty,
        size: p.size,
        weightMg: i.weightMg,
        specs: p.specs,
        stones: p.stones,
        valueRs: i.valueRs,
        photo: await itemPhoto(p),
      });
    }
    const total = c.items.reduce((s, i) => s + i.valueRs, 0);
    return {
      company,
      title: c.mode === "Road transport" ? "Road / Delivery Challan" : "Delivery Challan",
      number: c.number,
      date: c.date,
      party: { label: "Consignee", name: cust?.name, sub: `${cust?.city}${cust?.type ? ` · ${cust.type}` : ""}`, phone: cust?.phone },
      ref: { order: order?.number, orderTitle: order?.title, metal: order?.metal },
      extra: {
        label: "Transport",
        lines: [
          ["Mode", c.mode],
          ["Vehicle no.", c.vehicleNo],
          ["Transporter / carrier", c.transporter],
          ["From", c.fromPlace],
          ["To", c.toPlace],
        ] as [string, string | undefined][],
      },
      rows,
      weightLabel: "Net weight",
      showValue: true,
      amountInWords: rupeesInWords(total),
      instructions: "Goods sent for delivery, not for sale. Weights and values as recorded above. Please verify on receipt.",
      remarks: c.remarks,
      photos: [],
      signatures: [`For ${company.name}`, "Received by (signature & date)"],
    };
  }
  if (kind === "order-summary") {
    const o = orderOf(db, id)!;
    const cust = customerOf(db, o.customerId);
    const ps = db.pieces.filter((p) => p.orderId === o.id);
    const rows = [];
    for (const p of ps)
      rows.push({
        code: p.code,
        name: p.name,
        purity: p.purity,
        qty: p.qty,
        size: p.size,
        weightMg: p.finalWeightMg ?? p.currentWeightMg ?? p.estWeightMg,
        specs: p.specs,
        stones: p.stones,
        valueRs: p.valueRs,
        status: p.location === "DELIVERED" || p.location === "READY" ? LOCATION[p.location] : `${stageOf(db, p.stageId)?.name ?? ""}`,
        photo: await itemPhoto(p),
      });
    const total = ps.reduce((s, p) => s + (p.valueRs ?? 0), 0);
    return {
      company,
      title: "Order Summary",
      number: o.number,
      date: o.orderDate,
      dueDate: o.dueDate,
      party: { label: "Customer", name: cust?.name, sub: cust?.city, phone: cust?.phone },
      ref: {
        orderTitle: o.title,
        type: o.type === "PROJECT" ? `Project · ${ps.length} pieces` : "Single piece",
        metal: o.metal,
        priority: o.priority,
        status: orderStatus(db, o)?.label,
      },
      rows,
      weightLabel: "Weight",
      showValue: ps.some((p) => p.valueRs),
      amountInWords: total ? rupeesInWords(total) : undefined,
      instructions: "Weight shows the final weight once quality-checked, otherwise the latest recorded or estimated weight.",
      remarks: o.remarks,
      photos: await gallery(o.photos, 4),
      signatures: ["Prepared by", "Customer"],
    };
  }
  const d = db.deliveries.find((x) => x.id === id)!;
  const c = customerOf(db, d.customerId);
  const order = orderOf(db, d.orderId);
  const rows = [];
  for (const i of d.items) {
    const p = pieceOf(db, i.pieceId)!;
    rows.push({
      code: p.code,
      name: p.name,
      purity: p.purity,
      qty: p.qty,
      size: p.size,
      weightMg: i.weightMg,
      specs: p.specs,
      stones: p.stones,
      valueRs: p.valueRs,
      photo: await itemPhoto(p),
    });
  }
  const anyValue = rows.some((r) => r.valueRs);
  return {
    company,
    title: "Delivery Note",
    number: d.number,
    date: d.date,
    party: { label: "Customer", name: c?.name, sub: c?.city, phone: c?.phone },
    ref: { order: order?.number, metal: order?.metal, mode: d.mode, receivedBy: d.receivedBy },
    rows,
    weightLabel: "Final weight",
    showValue: anyValue,
    amountInWords: anyValue ? rupeesInWords(rows.reduce((s, r) => s + (r.valueRs ?? 0), 0)) : undefined,
    instructions: "Goods received in good condition. Weights verified in presence of the customer.",
    remarks: d.remarks,
    photos: await gallery(d.photos, 3),
    signatures: ["For " + company.name, "Customer signature"],
  };
}

async function renderBody(body: { number: string }): Promise<{ blob: Blob; name: string }> {
  const res = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return { blob: await res.blob(), name: `${body.number}.pdf` };
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function withToast(label: string, fn: () => Promise<string>) {
  const t = toast.loading(`Preparing ${label}…`);
  try {
    const name = await fn();
    toast.success(`${name} downloaded`, { id: t });
  } catch (e) {
    console.error(e);
    toast.error(`Couldn't generate the ${label}`, { id: t });
  }
}

export async function downloadPdf(kind: DocKind, id: string) {
  await withToast("PDF", async () => {
    const { blob, name } = await renderBody(await payload(kind, id));
    saveBlob(blob, name);
    return name;
  });
}

/** Shares the PDF file through the phone's share sheet (WhatsApp etc.); falls back to a WhatsApp text link. */
export async function sharePdf(kind: DocKind, id: string, phone: string | undefined, text: string) {
  const t = toast.loading("Preparing PDF…");
  try {
    const { blob, name } = await renderBody(await payload(kind, id));
    const file = new File([blob], name, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      toast.dismiss(t);
      await navigator.share({ files: [file], text, title: name });
      return;
    }
    saveBlob(blob, name);
    toast.success("PDF downloaded — attach it in the WhatsApp chat that just opened", { id: t });
    const num = (phone ?? "").replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/${num ? "91" + num : ""}?text=${encodeURIComponent(text)}`, "_blank");
  } catch (e) {
    if ((e as Error).name === "AbortError") return toast.dismiss(t);
    console.error(e);
    toast.error("Couldn't share the PDF", { id: t });
  }
}

// ─────────────────────────────────────────────── registers (PDF + Excel)
export interface RegisterSpec {
  title: string;
  /** used for the document number and file names */
  fileName: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  columns: { label: string; width: number; align?: "left" | "right" }[];
  rows: { cells: string[]; photoUrl?: string; flag?: boolean }[];
  totals?: string[];
  note?: string;
}

export async function downloadRegisterPdf(spec: RegisterSpec) {
  await withToast("PDF", async () => {
    const db = getDB();
    const rows = [];
    for (const r of spec.rows) rows.push({ cells: r.cells, flag: r.flag, photo: r.photoUrl ? ((await toJpeg(r.photoUrl, 160)) ?? undefined) : undefined });
    const { blob, name } = await renderBody({
      layout: "register",
      company: db.settings.company,
      title: spec.title,
      number: spec.fileName,
      subtitle: spec.subtitle,
      date: new Date().toISOString(),
      stats: spec.stats,
      columns: spec.columns,
      rows,
      totals: spec.totals,
      note: spec.note,
    } as { number: string });
    saveBlob(blob, name);
    return name;
  });
}

export async function downloadRegisterExcel(spec: RegisterSpec) {
  await withToast("Excel file", async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const header = spec.columns.map((c) => ({ value: c.label, fontWeight: "bold" as const, backgroundColor: "#F4ECDD" }));
    // plain numbers (weights) become real numeric cells so they can be summed in Excel
    const cell = (v: string) => (/^[+-]?\d+(\.\d+)?$/.test(v) ? { value: Number(v), format: "0.000" } : { value: v });
    const body = spec.rows.map((r) => r.cells.map(cell));
    const data = [
      [{ value: `${getDB().settings.company.name} — ${spec.title}`, fontWeight: "bold" as const }],
      ...(spec.subtitle ? [[{ value: spec.subtitle }]] : []),
      [],
      header,
      ...body,
      ...(spec.totals ? [spec.totals.map((v) => ({ ...cell(v), fontWeight: "bold" as const }))] : []),
    ];
    const blob = await writeXlsxFile(data, {
      columns: spec.columns.map((c) => ({ width: Math.max(10, Math.round(c.width * 7)) })),
      sheet: "Register",
    }).toBlob();
    const name = `${spec.fileName}.xlsx`;
    saveBlob(blob, name);
    return name;
  });
}
