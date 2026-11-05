// Printed brand, address-label sender and GSTIN rules.
import type { DB } from "./types";

/**
 * The only business name printed or sent to anyone: PDFs, challans, labels, tags,
 * Excel exports and WhatsApp texts. "Layek Jewels" stays the name of the software
 * on its own screens.
 */
export const PRINT_NAME = "Arts & Fashion";

/** Company details for printing, with the name fixed to the printed brand. */
export const printCompany = (db: DB) => ({ ...db.settings.company, name: PRINT_NAME });

/** Sender printed on every address label (as specified by the client). */
export const SHIPPER = {
  name: PRINT_NAME,
  lines: ["#56, 1/1 2nd Floor, Mallikarjunappa lane,", "Avenue Cross Road, Nagartapete,", "Bengaluru, KA - 560002."],
  gstin: "29AHUPL9170B1ZV",
};

const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Checks a GSTIN's format (state code + PAN + entity + Z + check) and its official check character. */
export function isValidGstin(raw: string) {
  const g = raw.trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = GST_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36] === g[14];
}
