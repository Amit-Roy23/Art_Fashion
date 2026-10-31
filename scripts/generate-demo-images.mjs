/**
 * Generates the bundled demo "product photographs" (public/demo/*.jpg).
 * Each jewellery piece is drawn as an SVG studio shot in three looks:
 *   sketch   – customer design reference on paper
 *   raw      – unpolished casting on the karigar's bench
 *   final    – polished studio photograph
 * Run: NODE_PATH=$(npm root -g) node scripts/generate-demo-images.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// Playwright is not a project dependency; resolve it from NODE_PATH / global install.
const { chromium } = createRequire(import.meta.url)("playwright");

const OUT = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(OUT, { recursive: true });

const S = 800;
const C = S / 2;

const looks = {
  final: {
    bg: `<radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3a2230"/><stop offset=".6" stop-color="#1b0f17"/><stop offset="1" stop-color="#0a0609"/></radialGradient>`,
    metal: `<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5418"/><stop offset=".25" stop-color="#f7e08a"/><stop offset=".45" stop-color="#c3912f"/><stop offset=".65" stop-color="#fff2c2"/><stop offset=".85" stop-color="#a87a26"/><stop offset="1" stop-color="#5c3d0c"/></linearGradient>`,
    stroke: "url(#m)",
    gems: true,
    floor: `<ellipse cx="${C}" cy="${S * 0.86}" rx="${S * 0.33}" ry="26" fill="#000" opacity=".55" filter="url(#blur)"/>`,
    extra: `<circle cx="${S * 0.22}" cy="${S * 0.18}" r="160" fill="#ffd9a0" opacity=".06"/>`,
  },
  raw: {
    bg: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3b24"/><stop offset=".5" stop-color="#432a18"/><stop offset="1" stop-color="#2c1a0e"/></linearGradient>`,
    metal: `<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d5d3e"/><stop offset=".4" stop-color="#b3a27a"/><stop offset=".7" stop-color="#8a7a55"/><stop offset="1" stop-color="#5a4c31"/></linearGradient>`,
    stroke: "url(#m)",
    gems: false,
    floor: `<ellipse cx="${C}" cy="${S * 0.86}" rx="${S * 0.3}" ry="20" fill="#000" opacity=".4" filter="url(#blur)"/>`,
    extra: Array.from({ length: 14 }, (_, i) => `<path d="M0 ${40 + i * 58} Q ${S / 2} ${20 + i * 58 + (i % 3) * 14} ${S} ${46 + i * 58}" stroke="#2a180b" stroke-width="2" fill="none" opacity=".35"/>`).join(""),
  },
  sketch: {
    bg: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f3e8"/><stop offset="1" stop-color="#ece2cf"/></linearGradient>`,
    metal: `<linearGradient id="m"><stop offset="0" stop-color="#f8f3e8" stop-opacity="0"/></linearGradient>`,
    stroke: "#4b4136",
    gems: false,
    sketch: true,
    floor: "",
    extra:
      Array.from({ length: 20 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="${S}" y2="${i * 40}" stroke="#c9d6e3" stroke-width="1"/>`).join("") +
      `<line x1="70" y1="0" x2="70" y2="${S}" stroke="#e7a3a3" stroke-width="2"/>`,
  },
};

const gemColors = {
  ruby: ["#ffd0d6", "#d1123a", "#5c0418"],
  emerald: ["#d4ffe6", "#109a5a", "#033d22"],
  diamond: ["#ffffff", "#d7ecff", "#7d9bb8"],
  sapphire: ["#d8e4ff", "#1f47c2", "#0a1a52"],
  pearl: ["#ffffff", "#f3ece0", "#b9ab95"],
  polki: ["#fffdf1", "#efe6c6", "#a89b72"],
};

function gemDefs() {
  return Object.entries(gemColors)
    .map(
      ([k, [a, b, c]]) =>
        `<radialGradient id="g_${k}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`
    )
    .join("");
}

// draw helpers -----------------------------------------------------------
const ctx = (look) => ({
  look,
  metal: (w = 1) => (look.sketch ? `fill="none" stroke="${look.stroke}" stroke-width="${2 * w}"` : `fill="url(#m)" stroke="#3d2806" stroke-opacity=".35" stroke-width="${w}"`),
  band: (w) => (look.sketch ? `fill="none" stroke="${look.stroke}" stroke-width="3" stroke-dasharray="0"` : `fill="none" stroke="url(#m)" stroke-width="${w}"`),
  gem: (cx, cy, r, kind = "ruby", facet = true) => {
    if (look.sketch)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${look.stroke}" stroke-width="2"/>` +
        (facet ? `<path d="M${cx - r * 0.6} ${cy} L${cx} ${cy - r * 0.6} L${cx + r * 0.6} ${cy} L${cx} ${cy + r * 0.6}Z" fill="none" stroke="${look.stroke}" stroke-width="1"/>` : "");
    if (!look.gems)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#3b3222" stroke="url(#m)" stroke-width="${Math.max(2, r * 0.25)}"/>`;
    return `<circle cx="${cx}" cy="${cy}" r="${r + Math.max(2, r * 0.18)}" fill="url(#m)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g_${kind})"/>` +
      (facet ? `<path d="M${cx - r * 0.55} ${cy - r * 0.1} L${cx - r * 0.1} ${cy - r * 0.55} L${cx + r * 0.3} ${cy - r * 0.35}" stroke="#fff" stroke-opacity=".7" stroke-width="${Math.max(1, r * 0.08)}" fill="none"/>` : "") +
      `<circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.18}" fill="#fff" opacity=".85"/>`;
  },
  bead: (cx, cy, r) =>
    look.sketch
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${look.stroke}" stroke-width="1.6"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#m)"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.3}" fill="#fff" opacity="${look.gems ? 0.6 : 0.15}"/>`,
});

function arcPoints(cx, cy, rx, ry, a0, a1, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

const designs = {
  ring: (d, gem = "diamond") =>
    `<ellipse cx="${C}" cy="${C + 90}" rx="170" ry="190" ${d.band(46)}/>` +
    `<ellipse cx="${C}" cy="${C + 90}" rx="170" ry="190" fill="none" stroke="#fff" stroke-opacity="${d.look.sketch ? 0 : 0.25}" stroke-width="6" stroke-dasharray="80 520"/>` +
    `<path d="M${C - 70} ${C - 70} L${C - 40} ${C - 150} L${C + 40} ${C - 150} L${C + 70} ${C - 70} Z" ${d.metal(2)}/>` +
    d.gem(C, C - 170, 78, gem) +
    [-1, 1].map((s) => `<path d="M${C + s * 60} ${C - 120} L${C + s * 80} ${C - 215}" ${d.band(10)}/>`).join(""),
  necklace: (d, gem = "ruby") => {
    const pts = arcPoints(C, 150, 280, 330, Math.PI * 0.05, Math.PI * 0.95, 34);
    let s = pts.map(([x, y]) => d.bead(x, y, 13)).join("");
    const drops = arcPoints(C, 150, 280, 330, Math.PI * 0.2, Math.PI * 0.8, 11);
    s += drops.map(([x, y], i) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 40}" ${d.band(4)}/>` + d.gem(x, y + 58, i % 2 ? 14 : 18, i % 2 ? "pearl" : gem, false)).join("");
    s += `<path d="M${C - 70} 480 Q ${C} 440 ${C + 70} 480 L ${C + 40} 600 Q ${C} 650 ${C - 40} 600 Z" ${d.metal(2)}/>` + d.gem(C, 535, 42, gem) + d.gem(C, 640, 16, "pearl", false);
    return s;
  },
  choker: (d, gem = "emerald") => {
    let s = "";
    [0, 1, 2].forEach((row) => {
      const pts = arcPoints(C, 120 + row * 46, 260 - row * 10, 260, Math.PI * 0.1, Math.PI * 0.9, 26 - row * 2);
      s += pts.map(([x, y], i) => (row === 1 && i % 3 === 0 ? d.gem(x, y, 16, gem, false) : d.bead(x, y, row === 1 ? 12 : 10))).join("");
    });
    const drops = arcPoints(C, 212, 250, 260, Math.PI * 0.15, Math.PI * 0.85, 13);
    s += drops.map(([x, y]) => d.gem(x, y + 50, 11, "polki", false)).join("");
    s += d.gem(C, 520, 52, gem) + d.gem(C, 600, 20, "pearl", false);
    return s;
  },
  jhumka: (d, gem = "ruby") =>
    [C - 160, C + 160]
      .map(
        (x) =>
          d.gem(x, 170, 36, gem) +
          `<line x1="${x}" y1="206" x2="${x}" y2="260" ${d.band(6)}/>` +
          `<path d="M${x - 110} 470 Q ${x - 100} 270 ${x} 260 Q ${x + 100} 270 ${x + 110} 470 Z" ${d.metal(2)}/>` +
          arcPoints(x, 470, 110, 14, 0, Math.PI, 9).map(([px, py]) => d.bead(px, py + 6, 10)).join("") +
          arcPoints(x, 480, 105, 10, 0, Math.PI, 7).map(([px, py]) => `<line x1="${px}" y1="${py}" x2="${px}" y2="${py + 70}" ${d.band(3)}/>` + d.gem(px, py + 84, 12, "pearl", false)).join("") +
          d.gem(x, 380, 22, gem, false)
      )
      .join(""),
  bangle: (d) =>
    `<ellipse cx="${C - 80}" cy="${C + 30}" rx="210" ry="210" ${d.band(54)}/>` +
    `<ellipse cx="${C + 90}" cy="${C + 60}" rx="210" ry="210" ${d.band(54)}/>` +
    (d.look.sketch ? "" : arcPoints(C - 80, C + 30, 210, 210, 0, Math.PI * 2, 40).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#5c3d0c" opacity=".55"/>`).join("")) +
    arcPoints(C + 90, C + 60, 210, 210, -Math.PI * 0.9, -Math.PI * 0.1, 9).map(([x, y]) => d.gem(x, y, 12, "ruby", false)).join(""),
  pendant: (d, gem = "sapphire") =>
    `<path d="M120 90 Q ${C} 380 ${S - 120} 90" ${d.band(6)}/>` +
    `<circle cx="${C}" cy="300" r="18" ${d.band(8)}/>` +
    `<path d="M${C} 330 C ${C + 170} 420 ${C + 120} 640 ${C} 680 C ${C - 120} 640 ${C - 170} 420 ${C} 330 Z" ${d.metal(3)}/>` +
    d.gem(C, 520, 82, gem) +
    arcPoints(C, 520, 115, 130, 0, Math.PI * 2, 18).map(([x, y]) => d.gem(x, y, 8, "diamond", false)).join(""),
  tikka: (d, gem = "polki") =>
    `<path d="M${C} 40 L ${C} 300" ${d.band(5)}/>` +
    arcPoints(C, 170, 6, 120, -Math.PI / 2, Math.PI / 2, 10).map(([x, y]) => d.bead(x, y, 8)).join("") +
    `<circle cx="${C}" cy="450" r="150" ${d.metal(3)}/>` +
    arcPoints(C, 450, 120, 120, 0, Math.PI * 2, 16).map(([x, y]) => d.gem(x, y, 16, "polki", false)).join("") +
    d.gem(C, 450, 70, gem === "polki" ? "emerald" : gem) +
    arcPoints(C, 600, 110, 8, 0, Math.PI, 7).map(([x, y]) => d.gem(x, y + 30, 11, "pearl", false)).join(""),
  bracelet: (d) => {
    let s = "";
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * 78;
      const y = C + Math.sin(i / 1.4) * 40;
      s += `<rect x="${x - 34}" y="${y - 44}" width="68" height="88" rx="22" ${d.metal(2)}/>` + d.gem(x, y, 20, i % 2 ? "diamond" : "emerald", false);
    }
    return s;
  },
  nath: (d) =>
    `<circle cx="${C}" cy="${C}" r="230" ${d.band(14)}/>` +
    arcPoints(C, C, 230, 230, Math.PI * 0.15, Math.PI * 0.85, 13).map(([x, y]) => d.bead(x, y, 14)).join("") +
    arcPoints(C, C, 230, 230, Math.PI * 0.35, Math.PI * 0.65, 5).map(([x, y]) => d.gem(x, y + 34, 18, "ruby", false)).join("") +
    `<path d="M${C + 230} ${C} Q ${C + 300} ${C - 200} ${C + 160} ${C - 310}" ${d.band(5)}/>` + d.gem(C + 160, C - 310, 18, "pearl", false),
  chain: (d) => {
    let s = "";
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * 0.05 + (Math.PI * 0.9 * i) / 39;
      const x = C + 290 * Math.cos(a);
      const y = 140 + 380 * Math.sin(a);
      s += `<ellipse cx="${x}" cy="${y}" rx="17" ry="10" transform="rotate(${(a * 180) / Math.PI + (i % 2 ? 40 : -40)} ${x} ${y})" ${d.band(6)}/>`;
    }
    return s;
  },
};

// Finished looks in other metals, used for silver and copper orders.
const metalGradient = (stops) =>
  `<linearGradient id="m" x1="0" y1="0" x2="1" y2="1">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
looks["final-silver"] = { ...looks.final, metal: metalGradient(["#5f6670", "#e9eef3", "#9aa3ad", "#ffffff", "#8a939d", "#4b525a"]) };
looks["final-copper"] = { ...looks.final, metal: metalGradient(["#6b2f17", "#f2a37a", "#b8643a", "#ffd2b5", "#9a4b27", "#4f210f"]) };
const METAL_VARIANTS = ["bangle", "chain", "bracelet", "pendant-sapphire", "ring-solitaire", "nath"];

function svg(design, lookName, opts = {}) {
  const look = looks[lookName];
  const d = ctx(look);
  const body = designs[design](d, opts.gem);
  const label = look.sketch
    ? `<text x="96" y="${S - 40}" font-family="Comic Sans MS, cursive" font-size="30" fill="#4b4136">${opts.title || design} · ${opts.purity || "22K"}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>${look.bg}${look.metal}${gemDefs()}<filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="${S}" height="${S}" fill="url(#bg)"/>${look.extra}${look.floor}
<g ${look.gems ? 'filter="url(#glow)"' : ""}>${body}</g>${label}</svg>`;
}

export const PIECES = [
  ["ring-solitaire", "ring", { gem: "diamond", title: "Solitaire ring" }],
  ["ring-ruby", "ring", { gem: "ruby", title: "Ruby ring" }],
  ["ring-emerald", "ring", { gem: "emerald", title: "Emerald ring" }],
  ["necklace-ruby", "necklace", { gem: "ruby", title: "Rani haar" }],
  ["necklace-sapphire", "necklace", { gem: "sapphire", title: "Sapphire necklace" }],
  ["choker-emerald", "choker", { gem: "emerald", title: "Kundan choker" }],
  ["choker-ruby", "choker", { gem: "ruby", title: "Bridal choker" }],
  ["jhumka-ruby", "jhumka", { gem: "ruby", title: "Jhumka pair" }],
  ["jhumka-emerald", "jhumka", { gem: "emerald", title: "Jhumka pair" }],
  ["bangle", "bangle", { title: "Bangle pair" }],
  ["pendant-sapphire", "pendant", { gem: "sapphire", title: "Pendant" }],
  ["pendant-ruby", "pendant", { gem: "ruby", title: "Pendant" }],
  ["tikka", "tikka", { gem: "emerald", title: "Maang tikka" }],
  ["bracelet", "bracelet", { title: "Bracelet" }],
  ["nath", "nath", { title: "Nath" }],
  ["chain", "chain", { title: "Rope chain" }],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: S, height: S } });
for (const [name, design, opts] of PIECES) {
  const extra = METAL_VARIANTS.includes(name) ? ["final-silver", "final-copper"] : [];
  for (const look of ["final", "raw", "sketch", ...extra]) {
    await page.setContent(`<html><body style="margin:0">${svg(design, look, opts)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, `${name}-${look}.jpg`), type: "jpeg", quality: 78, clip: { x: 0, y: 0, width: S, height: S } });
  }
  console.log("rendered", name);
}
await browser.close();
