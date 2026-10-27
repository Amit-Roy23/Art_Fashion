"use client";
// Collects the data a document needs, embeds its photos, and asks the backend
// (/api/pdf) to render the PDF. Karigar work orders deliberately omit customer
// contact details and prices.
import { toast } from "sonner";
import { getDB } from "./store";
import { urlToDataUrl } from "./photos";
import { artisanOf, coverPhoto, customerOf, orderOf, pieceOf, stageOf, vendorOf } from "./queries";
import type { Photo } from "./types";

export type DocKind = "work-order" | "job-challan" | "delivery-note";

async function photos(list: Photo[], max = 3) {
  const out: { url: string; caption: string }[] = [];
  for (const p of list.slice(-max)) {
    const url = await urlToDataUrl(p.url);
    if (url) out.push({ url, caption: p.caption ?? "" });
  }
  return out;
}

async function payload(kind: DocKind, id: string) {
  const db = getDB();
  const company = db.settings.company;
  if (kind === "work-order") {
    const wo = db.workOrders.find((w) => w.id === id)!;
    const piece = pieceOf(db, wo.pieceId)!;
    const order = orderOf(db, piece.orderId)!;
    const ref = piece.photos.filter((p) => ["design", "reference"].includes(p.kind));
    const latest = coverPhoto(piece);
    return {
      company,
      title: "Karigar Work Order",
      number: wo.number,
      date: wo.issuedAt,
      dueDate: wo.dueDate,
      party: {
        label: "Karigar",
        name: artisanOf(db, wo.artisanId)?.name,
        sub: artisanOf(db, wo.artisanId)?.speciality,
        phone: artisanOf(db, wo.artisanId)?.phone,
      },
      ref: { order: order.number, priority: order.priority, stage: stageOf(db, wo.stageId)?.name },
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
        },
      ],
      weightLabel: "Issued weight",
      instructions: wo.instructions,
      remarks: wo.remarks,
      photos: await photos(latest && !ref.includes(latest) ? [...ref, latest] : ref),
      signatures: ["Issued by", "Karigar"],
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
      ref: { order: orderOf(db, piece.orderId)?.number, process: jw.process },
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
        },
      ],
      weightLabel: "Sent weight",
      instructions: `Process: ${jw.process}. Return with the same challan number. Report weight on return.`,
      remarks: jw.remarks,
      photos: await photos(
        piece.photos.filter((p) => p.kind !== "design"),
        2,
      ),
      signatures: ["Dispatched by", "Received by (job worker)"],
    };
  }
  const d = db.deliveries.find((x) => x.id === id)!;
  const c = customerOf(db, d.customerId);
  const order = orderOf(db, d.orderId);
  const pieces = d.items.map((i) => ({ i, p: pieceOf(db, i.pieceId)! }));
  return {
    company,
    title: "Delivery Note",
    number: d.number,
    date: d.date,
    party: { label: "Customer", name: c?.name, sub: c?.city, phone: c?.phone },
    ref: { order: order?.number, mode: d.mode, receivedBy: d.receivedBy },
    rows: pieces.map(({ i, p }) => ({
      code: p.code,
      name: p.name,
      purity: p.purity,
      qty: p.qty,
      size: p.size,
      weightMg: i.weightMg,
      specs: p.specs,
      stones: p.stones,
    })),
    weightLabel: "Final weight",
    instructions: "Goods received in good condition. Weights verified in presence of the customer.",
    remarks: d.remarks,
    photos: await photos(pieces.map(({ p }) => coverPhoto(p)).filter(Boolean) as Photo[], 4),
    signatures: ["For " + db.settings.company.name, "Customer signature"],
  };
}

async function render(kind: DocKind, id: string): Promise<{ blob: Blob; name: string }> {
  const body = await payload(kind, id);
  const res = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return { blob: await res.blob(), name: `${body.number}.pdf` };
}

export async function downloadPdf(kind: DocKind, id: string) {
  const t = toast.loading("Preparing PDF…");
  try {
    const { blob, name } = await render(kind, id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success(`${name} downloaded`, { id: t });
  } catch (e) {
    console.error(e);
    toast.error("Couldn't generate the PDF", { id: t });
  }
}

/** Shares the PDF file through the phone's share sheet (WhatsApp etc.); falls back to a WhatsApp text link. */
export async function sharePdf(kind: DocKind, id: string, phone: string | undefined, text: string) {
  const t = toast.loading("Preparing PDF…");
  try {
    const { blob, name } = await render(kind, id);
    const file = new File([blob], name, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      toast.dismiss(t);
      await navigator.share({ files: [file], text, title: name });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    toast.success("PDF downloaded — attach it in the WhatsApp chat that just opened", { id: t });
    const num = (phone ?? "").replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/${num ? "91" + num : ""}?text=${encodeURIComponent(text)}`, "_blank");
  } catch (e) {
    if ((e as Error).name === "AbortError") return toast.dismiss(t);
    console.error(e);
    toast.error("Couldn't share the PDF", { id: t });
  }
}
