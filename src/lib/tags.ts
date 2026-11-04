// Jewellery tag data: what is printed on each tag, shared by the tag designer,
// its live preview and the PDF renderer.
import { liveWeight, orderOf } from "./queries";
import type { DB, Piece, TagSettings } from "./types";

// Sizes measured from the client's sample tags; adjustable in the tag designer.
export const DEFAULT_TAG: TagSettings = {
  bodyMm: 65,
  heightMm: 18,
  tailMm: 50,
  pageIncludesTail: true,
  brand: "ARTS & FASHION",
  priceLabel: "MRP",
  taxNote: "Incl. of all Taxes",
  showPrice: true,
  showWeight: true,
  showPurity: true,
  showName: false,
};

export const tagSettings = (db: DB): TagSettings => ({ ...DEFAULT_TAG, ...db.settings.tag });

/**
 * Short code encoded in the barcode: "ORD-26-0003-A" → "260003A".
 * Short codes give wider bars, which small thermal printers print and scanners read reliably.
 */
export const tagCode = (p: Piece) =>
  p.code
    .replace(/^ORD-/, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

/** Finds a piece from a scanned tag code (or a typed piece code). */
export function pieceByTagCode(db: DB, scanned: string) {
  const v = scanned
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return db.pieces.find((p) => tagCode(p) === v || p.code.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === v);
}

/** One tag as printed. Editable per tag in the designer before printing. */
export interface TagData {
  pieceId: string;
  code: string;
  barcode: string;
  name: string;
  purity: string;
  metal: string;
  weightMg: number;
  priceRs?: number;
  copies: number;
}

export function tagFor(db: DB, p: Piece): TagData {
  return {
    pieceId: p.id,
    code: p.code,
    barcode: tagCode(p),
    name: p.name,
    purity: p.purity,
    metal: orderOf(db, p.orderId)?.metal ?? "",
    weightMg: liveWeight(p),
    priceRs: p.valueRs,
    copies: 1,
  };
}

/** Text lines for the left half of a tag, in print order. */
export function tagLines(t: TagData, s: TagSettings) {
  const lines: { text: string; strong?: boolean; small?: boolean }[] = [];
  if (s.showPrice && t.priceRs) {
    lines.push({ text: `${s.priceLabel}: ${t.priceRs.toLocaleString("en-IN")}/-`, strong: true });
    if (s.taxNote) lines.push({ text: s.taxNote, small: true });
  }
  if (s.showName) lines.push({ text: t.name });
  if (s.showWeight || s.showPurity)
    lines.push({ text: [s.showWeight ? `WT: ${(t.weightMg / 1000).toFixed(3)} g` : "", s.showPurity ? t.purity : ""].filter(Boolean).join(" · ") });
  if (s.brand) lines.push({ text: `BRAND: ${s.brand}`, strong: !s.showPrice || !t.priceRs });
  lines.push({ text: `M.NO: ${t.code}`, small: true });
  return lines;
}

// Helvetica advance widths (1/1000 em) for ASCII 32–126, from the standard font metrics.
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584,
  556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278,
  469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260,
  334, 584,
];

/** Width of a line of Helvetica text in em (bold is ~8% wider), used to shrink tag lines to fit. */
export function textWidthEm(text: string, bold?: boolean) {
  let w = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? HELV[c - 32] : 556;
  }
  return (w / 1000) * (bold ? 1.08 : 1) * 1.03;
}

/** Largest font size (≤ size) at which the line fits the width. */
export const fitFontSize = (text: string, size: number, width: number, bold?: boolean) => Math.min(size, width / Math.max(0.1, textWidthEm(text, bold)));
