// Code 128 (subset B) barcode encoder — the format standard jewellery tag
// scanners read. Shared by the on-screen tag preview and the PDF renderer.

// Bar/space widths (in modules) for symbol values 0–106. 104 = Start B, 106 = Stop.
const PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];
const START_B = 104;
const STOP = 106;

/** Printable ASCII only (space … ~); anything else is dropped. */
export const barcodeSafe = (v: string) => v.replace(/[^\x20-\x7e]/g, "");

/**
 * Encodes text as Code 128-B and returns the module pattern as a string of
 * "1" (bar) and "0" (space), without quiet zones.
 */
export function code128(value: string): string {
  const text = barcodeSafe(value);
  const codes = [START_B, ...Array.from(text, (ch) => ch.charCodeAt(0) - 32)];
  const checksum = codes.reduce((sum, c, i) => sum + c * (i === 0 ? 1 : i), 0) % 103;
  let out = "";
  for (const c of [...codes, checksum, STOP]) {
    PATTERNS[c].split("").forEach((w, i) => (out += (i % 2 === 0 ? "1" : "0").repeat(Number(w))));
  }
  return out;
}

/** Bars as [startModule, widthInModules] runs — easy to draw as rectangles. */
export function barRuns(pattern: string): [number, number][] {
  const runs: [number, number][] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "1") continue;
    let j = i;
    while (pattern[j + 1] === "1") j++;
    runs.push([i, j - i + 1]);
    i = j;
  }
  return runs;
}
