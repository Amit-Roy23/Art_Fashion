// Builds the demo database by replaying real business operations over the
// last few weeks, so every order has an authentic history, photos and weights.
// Served by the backend at GET /api/seed (dates are always relative to "now").
import * as ops from "./ops";
import type { Ctx } from "./ops";
import type { DB, Piece, Settings } from "./types";
import { DB_VERSION } from "./version";

const img = (key: string, look: "sketch" | "raw" | "final") => `/demo/${key}-${look}.jpg`;

export const DEFAULT_PERMISSIONS: Settings["permissions"] = {
  "orders.create": { MANAGER: true, STAFF: true },
  "orders.status": { MANAGER: true, STAFF: true },
  "artisans.assign": { MANAGER: true, STAFF: false },
  "artisans.review": { MANAGER: true, STAFF: false },
  "artisans.manage": { MANAGER: true, STAFF: false },
  "jobwork.manage": { MANAGER: true, STAFF: true },
  "delivery.create": { MANAGER: true, STAFF: true },
  "weights.view": { MANAGER: true, STAFF: true },
  "reports.view": { MANAGER: true, STAFF: false },
  "settings.manage": { MANAGER: false, STAFF: false },
};

function baseSettings(): Settings {
  return {
    company: {
      name: "Layek Jewels",
      tagline: "Handcrafted gold & bridal jewellery manufactory",
      address: "112, B. B. Ganguly Street, Bowbazar, Kolkata 700012",
      phone: "+91 98300 45210",
      email: "orders@layekjewels.in",
      gstin: "19ABCPL1234M1Z8",
    },
    weightTolerancePct: 1.5,
    stages: [
      { id: "st-design", name: "Design & CAD", color: "#a78bfa", handledBy: "INHOUSE" },
      { id: "st-cast", name: "Wax & Casting", color: "#f59e0b", handledBy: "ARTISAN" },
      { id: "st-ghat", name: "Ghat · Filing & Assembly", color: "#fb923c", handledBy: "ARTISAN" },
      { id: "st-setting", name: "Stone Setting (Jadai)", color: "#f472b6", handledBy: "ARTISAN" },
      { id: "st-polish", name: "Polishing & Finishing", color: "#38bdf8", handledBy: "JOBWORK" },
      { id: "st-qc", name: "Quality Check & Hallmark", color: "#34d399", handledBy: "INHOUSE" },
      { id: "st-ready", name: "Ready for Delivery", color: "#facc15", handledBy: "INHOUSE" },
    ],
    orderStatuses: [
      { id: "os-received", label: "Received", color: "#60a5fa", category: "NEW" },
      { id: "os-approval", label: "Awaiting design approval", color: "#c084fc", category: "HOLD" },
      { id: "os-production", label: "In production", color: "#f59e0b", category: "ACTIVE" },
      { id: "os-hold", label: "On hold", color: "#f87171", category: "HOLD" },
      { id: "os-ready", label: "Ready for delivery", color: "#facc15", category: "READY" },
      { id: "os-partial", label: "Partially delivered", color: "#2dd4bf", category: "PARTIAL" },
      { id: "os-delivered", label: "Delivered", color: "#34d399", category: "DONE" },
      { id: "os-cancelled", label: "Cancelled", color: "#9ca3af", category: "CANCELLED" },
    ],
    workStatuses: [
      { id: "ws-issued", label: "Issued", color: "#60a5fa", category: "ISSUED" },
      { id: "ws-working", label: "Working", color: "#f59e0b", category: "ACTIVE" },
      { id: "ws-stones", label: "Waiting for stones", color: "#c084fc", category: "HOLD" },
      { id: "ws-submitted", label: "Submitted for review", color: "#38bdf8", category: "SUBMITTED" },
      { id: "ws-rework", label: "Rework required", color: "#f87171", category: "REWORK" },
      { id: "ws-approved", label: "Approved", color: "#34d399", category: "DONE" },
    ],
    jobStatuses: [
      { id: "js-sent", label: "Dispatched", color: "#60a5fa", category: "SENT" },
      { id: "js-process", label: "In process", color: "#f59e0b", category: "ACTIVE" },
      { id: "js-delayed", label: "Delayed", color: "#f87171", category: "HOLD" },
      { id: "js-returned", label: "Returned", color: "#34d399", category: "RETURNED" },
    ],
    categories: ["Ring", "Necklace", "Choker", "Earrings", "Bangle", "Pendant", "Maang Tikka", "Bracelet", "Nath", "Chain"],
    metals: [
      { name: "Gold", purities: ["24K · 999", "22K · 916", "18K · 750", "14K · 585"] },
      { name: "Silver", purities: ["Fine silver · 999", "Sterling · 925"] },
      { name: "Copper", purities: ["Pure copper", "Copper alloy"] },
    ],
    processes: ["Polishing", "Rhodium plating", "Meenakari", "Laser engraving", "Hallmarking", "Sand blasting"],
    vendors: [
      { id: "v-polish", name: "Shree Ganesh Polishing Works", phone: "9831012345", city: "Bowbazar", processes: ["Polishing", "Sand blasting"] },
      { id: "v-rhodium", name: "Bright Plating Studio", phone: "9831023456", city: "Sealdah", processes: ["Rhodium plating"] },
      { id: "v-meena", name: "Kolkata Meena Art", phone: "9831034567", city: "Burrabazar", processes: ["Meenakari"] },
      { id: "v-hallmark", name: "BIS Hallmark Centre", phone: "9831045678", city: "Esplanade", processes: ["Hallmarking", "Laser engraving"] },
    ],
    permissions: DEFAULT_PERMISSIONS,
  };
}

type Step =
  | "cast_issue"
  | "cast_progress"
  | "cast_submit"
  | "cast_approve"
  | "ghat_issue"
  | "ghat_submit"
  | "ghat_rework"
  | "ghat_approve"
  | "set_issue"
  | "set_hold"
  | "set_progress"
  | "set_submit"
  | "set_approve"
  | "job_send"
  | "job_delay"
  | "job_return"
  | "ready";

const FLOW: Step[] = [
  "cast_issue",
  "cast_progress",
  "cast_submit",
  "cast_approve",
  "ghat_issue",
  "ghat_submit",
  "ghat_approve",
  "set_issue",
  "set_progress",
  "set_submit",
  "set_approve",
  "job_send",
  "job_return",
  "ready",
];

interface PieceScript {
  name: string;
  category: string;
  img: string;
  estG: number;
  purity?: string;
  size?: string;
  qty?: number;
  stones?: string;
  specs: string;
  remarks: string;
  upTo?: Step | "none";
  extra?: Step[];
  caster?: string;
  setter?: string;
  process?: string;
  vendor?: string;
  lossFactor?: number;
}

interface OrderScript {
  customer: number;
  type: "PROJECT" | "PIECE";
  title: string;
  agoDays: number;
  dueInDays: number;
  priority: "Normal" | "Urgent" | "VIP";
  remarks: string;
  /** defaults to Gold */
  metal?: "Gold" | "Silver" | "Copper";
  pieces: PieceScript[];
  challan?: { pieces: number[]; agoDays: number; vehicleNo: string; transporter: string };
  deliver?: { pieces: number[]; agoDays: number; mode: "Hand delivery" | "Courier" | "Showroom pickup"; receivedBy: string };
  hold?: string;
}

const DAY = 864e5;

// Rough demo valuation (₹ per gram incl. making) so challans carry a value.
const RATE: Record<string, number> = { Gold: 12500, Silver: 180, Copper: 45 };
const DEFAULT_PURITY: Record<string, string> = { Gold: "22K · 916", Silver: "Sterling · 925", Copper: "Pure copper" };

export function buildSeed(nowMs = Date.now()): DB {
  const iso = (ms: number) => new Date(ms).toISOString();
  const db: DB = {
    version: DB_VERSION,
    seededAt: iso(nowMs),
    settings: baseSettings(),
    users: [
      { id: "u-owner", name: "Sohel Layek", role: "OWNER", title: "Owner", phone: "9830045210" },
      { id: "u-manager", name: "Rakesh Pal", role: "MANAGER", title: "Production Manager", phone: "9830011122" },
      { id: "u-staff", name: "Priya Das", role: "STAFF", title: "Front Desk & Dispatch", phone: "9830022233" },
    ],
    customers: [],
    orders: [],
    pieces: [],
    artisans: [],
    workOrders: [],
    jobWorks: [],
    deliveries: [],
    challans: [],
    activity: [],
    counters: {},
  };

  const sys: Ctx = { now: iso(nowMs - 120 * DAY), by: "Sohel Layek" };
  const artisanDefs = [
    ["Gopal Das", "Casting & Ghat", "9830011111", "Bowbazar", 28],
    ["Suresh Mondal", "Stone setting (Jadai)", "9830022222", "Domjur", 330],
    ["Babulal Soni", "Filing & Assembly", "9830033333", "Howrah", 200],
    ["Anwar Sheikh", "Kundan & Polki", "9830044444", "Metiabruz", 150],
    ["Bikash Karmakar", "Chain & Bangle", "9830055555", "Bowbazar", 260],
  ] as const;
  const K = artisanDefs.map(([name, speciality, phone, city, hue]) => {
    const id = ops.saveArtisan(db, { name, speciality, phone, city, active: true }, sys);
    // stable ids so a karigar session survives a demo reset
    const a = db.artisans.find((x) => x.id === id)!;
    const u = db.users.find((x) => x.artisanId === id)!;
    a.id = `k-${a.code}`;
    a.hue = hue;
    u.id = `u-${a.code}`;
    u.artisanId = a.id;
    return a.id;
  });

  const customerDefs = [
    ["Ananya Sen", "9874000011", "Ballygunge, Kolkata", "Retail", "Bride — wedding on 12 Dec"],
    ["Roy Jewellers", "9874000022", "Howrah", "Showroom", "Monthly showroom stock orders"],
    ["Riya Chatterjee", "9874000033", "Salt Lake, Kolkata", "Retail", ""],
    ["Sarkar & Sons", "9874000044", "Siliguri", "Wholesale", "Bulk bangles & chains, 30 day credit"],
    ["Pooja Agarwal", "9874000055", "Alipore, Kolkata", "Retail", "Prefers WhatsApp updates"],
    ["Das Gold House", "9874000066", "Durgapur", "Showroom", ""],
    ["Farhan Ahmed", "9874000077", "Park Circus, Kolkata", "Retail", ""],
    ["Mitra Ornaments", "9874000088", "Asansol", "Wholesale", ""],
    ["Sneha Ghosh", "9874000099", "New Town, Kolkata", "Retail", "Anniversary gift — keep surprise, call only husband"],
  ] as const;
  const C = customerDefs.map(([name, phone, city, type, notes], i) =>
    ops.createCustomer(db, { name, phone, city, type, notes }, { ...sys, now: iso(nowMs - (90 - i * 6) * DAY) }),
  );

  const orders: OrderScript[] = [
    {
      customer: 0,
      type: "PIECE",
      title: "Ruby cocktail ring",
      agoDays: 46,
      dueInDays: -26,
      priority: "Normal",
      remarks: "Ring size 12. Customer brought old gold (4.2 g) adjusted in bill.",
      pieces: [
        {
          name: "Ruby cocktail ring",
          category: "Ring",
          img: "ring-ruby",
          estG: 5.8,
          size: "12",
          stones: "1 Burmese ruby 1.2 ct (customer's own)",
          specs: "Cathedral setting, 4 claws, matte inner band",
          remarks: "Handle customer stone with care",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
        },
      ],
      deliver: { pieces: [0], agoDays: 24, mode: "Hand delivery", receivedBy: "Ananya Sen" },
    },
    {
      customer: 2,
      type: "PIECE",
      title: "Solitaire engagement ring",
      agoDays: 34,
      dueInDays: -12,
      priority: "VIP",
      remarks: "Engagement on 20th — must deliver before. Engrave “R ♥ A” inside band.",
      pieces: [
        {
          name: "Solitaire engagement ring",
          category: "Ring",
          img: "ring-solitaire",
          estG: 4.6,
          purity: "18K · 750",
          size: "10",
          stones: "1 lab diamond 0.75 ct VS1",
          specs: "Six prong solitaire, knife-edge band",
          remarks: "Laser engraving inside band",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
          process: "Laser engraving",
          vendor: "v-hallmark",
        },
      ],
      deliver: { pieces: [0], agoDays: 14, mode: "Showroom pickup", receivedBy: "Riya Chatterjee" },
    },
    {
      customer: 1,
      type: "PROJECT",
      title: "Showroom festive stock — Diwali",
      agoDays: 25,
      dueInDays: 4,
      priority: "Urgent",
      remarks: "Diwali display stock. Partial delivery allowed — rings first.",
      pieces: [
        {
          name: "Ruby ring",
          category: "Ring",
          img: "ring-ruby",
          estG: 6.2,
          size: "14",
          stones: "Synthetic ruby 8 mm",
          specs: "Bezel set, milgrain edge",
          remarks: "Match display tray size",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
        },
        {
          name: "Emerald ring",
          category: "Ring",
          img: "ring-emerald",
          estG: 6.6,
          size: "13",
          stones: "Emerald 7x9 mm",
          specs: "Bezel set, plain shank",
          remarks: "Same finish as ruby ring",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
        },
        {
          name: "Ruby drop pendant",
          category: "Pendant",
          img: "pendant-ruby",
          estG: 7.4,
          stones: "Ruby 10 mm + 18 CZ halo",
          specs: "Teardrop with CZ halo, hidden bail",
          remarks: "Pendant only, no chain",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
        },
        {
          name: "Rope chain 20 inch",
          category: "Chain",
          img: "chain",
          estG: 18.5,
          specs: "3 mm rope chain, lobster clasp",
          remarks: "Hallmark tag required",
          upTo: "ghat_issue",
          caster: "k4",
        },
      ],
      challan: { pieces: [0, 1], agoDays: 3.2, vehicleNo: "WB 02 AK 4521", transporter: "Sri Durga Transport" },
      deliver: { pieces: [0, 1], agoDays: 3, mode: "Courier", receivedBy: "Amit Roy (Roy Jewellers)" },
    },
    {
      customer: 0,
      type: "PROJECT",
      title: "Bridal kundan set",
      agoDays: 19,
      dueInDays: 11,
      priority: "VIP",
      remarks: "Wedding 12 Dec. Bride wants emerald + polki combination, matte gold finish. Final trial 5 days before.",
      pieces: [
        {
          name: "Kundan choker",
          category: "Choker",
          img: "choker-emerald",
          estG: 62,
          stones: "Polki 46 pcs, emerald drops 13",
          specs: "3-layer choker, adjustable dori",
          remarks: "Matte finish, back side meena",
          upTo: "set_progress",
          caster: "k0",
          setter: "k3",
        },
        {
          name: "Jhumka pair",
          category: "Earrings",
          img: "jhumka-emerald",
          estG: 18.4,
          qty: 2,
          stones: "Emerald 2, pearls 14",
          specs: "Dome jhumka with pearl hangings",
          remarks: "Lightweight push-back",
          upTo: "set_submit",
          caster: "k0",
          setter: "k3",
        },
        {
          name: "Maang tikka",
          category: "Maang Tikka",
          img: "tikka",
          estG: 9.2,
          stones: "Polki 16, emerald centre",
          specs: "Round medallion, pearl fringe",
          remarks: "Chain length 6 inch",
          upTo: "job_send",
          caster: "k0",
          setter: "k3",
          process: "Meenakari",
          vendor: "v-meena",
        },
        {
          name: "Bangle pair",
          category: "Bangle",
          img: "bangle",
          estG: 38,
          qty: 2,
          size: "2.6",
          stones: "Ruby accents 18",
          specs: "Engraved kada pair with screw opening",
          remarks: "Size 2.6 — confirmed",
          upTo: "ready",
          caster: "k4",
          setter: "k1",
        },
      ],
    },
    {
      customer: 4,
      type: "PIECE",
      title: "Rani haar",
      agoDays: 6,
      dueInDays: 16,
      priority: "Urgent",
      remarks: "Copy design from customer photo. Weight must not exceed 48 g.",
      pieces: [
        {
          name: "Rani haar",
          category: "Necklace",
          img: "necklace-ruby",
          estG: 45,
          stones: "Ruby 11 drops, pearls",
          specs: "Long haar with central pendant",
          remarks: "Weight cap 48 g",
          upTo: "cast_progress",
          caster: "k0",
        },
      ],
    },
    {
      customer: 6,
      type: "PIECE",
      title: "Bridal nath",
      agoDays: 13,
      dueInDays: -1,
      priority: "Normal",
      remarks: "Nose ring for daughter's wedding, pearls from customer.",
      pieces: [
        {
          name: "Bridal nath",
          category: "Nath",
          img: "nath",
          estG: 4.1,
          stones: "Ruby 5, pearl 1",
          specs: "Hoop nath with side chain",
          remarks: "Use customer pearls",
          upTo: "job_send",
          extra: ["job_delay"],
          caster: "k2",
          setter: "k1",
          process: "Rhodium plating",
          vendor: "v-rhodium",
        },
      ],
    },
    {
      customer: 3,
      type: "PROJECT",
      title: "Wholesale silver bangles & chains",
      agoDays: 1,
      dueInDays: 21,
      priority: "Normal",
      metal: "Silver",
      remarks: "Repeat order — same design as last batch. Hallmark all pieces (925).",
      pieces: [
        {
          name: "Plain kada pair",
          category: "Bangle",
          img: "bangle",
          estG: 60,
          qty: 2,
          size: "2.8",
          specs: "Heavy machine-cut kada",
          remarks: "Hallmark + HUID",
          upTo: "none",
        },
        {
          name: "Silver bracelet",
          category: "Bracelet",
          img: "bracelet",
          estG: 22,
          stones: "CZ 18",
          specs: "Box clasp with safety lock",
          remarks: "Two-tone look",
          upTo: "none",
        },
        { name: "Rope chain 24 inch", category: "Chain", img: "chain", estG: 38, specs: "4 mm rope", remarks: "Lobster clasp", upTo: "none" },
      ],
    },
    {
      customer: 5,
      type: "PIECE",
      title: "Sapphire pendant",
      agoDays: 15,
      dueInDays: 1,
      priority: "Normal",
      remarks: "Showroom display piece. Certificate copy to be attached.",
      pieces: [
        {
          name: "Sapphire halo pendant",
          category: "Pendant",
          img: "pendant-sapphire",
          estG: 8.2,
          purity: "18K · 750",
          stones: "Blue sapphire 9 mm, 18 diamonds",
          specs: "Halo pendant with hidden bail",
          remarks: "Certificate copy attached",
          upTo: "ready",
          caster: "k0",
          setter: "k1",
        },
      ],
    },
    {
      customer: 7,
      type: "PIECE",
      title: "Bridal ruby choker",
      agoDays: 4,
      dueInDays: 26,
      priority: "Normal",
      remarks: "Design sent on WhatsApp for approval. Start casting only after confirmation.",
      pieces: [
        {
          name: "Bridal ruby choker",
          category: "Choker",
          img: "choker-ruby",
          estG: 70,
          stones: "Ruby 26, polki 40",
          specs: "3-row choker",
          remarks: "Waiting for design approval",
          upTo: "none",
        },
      ],
      hold: "Customer reviewing CAD design — will confirm by Monday",
    },
    {
      customer: 8,
      type: "PROJECT",
      title: "Anniversary sapphire set",
      agoDays: 9,
      dueInDays: 8,
      priority: "Urgent",
      remarks: "Surprise gift. Contact only Mr. Ghosh (husband).",
      pieces: [
        {
          name: "Sapphire necklace",
          category: "Necklace",
          img: "necklace-sapphire",
          estG: 32,
          stones: "Sapphire centre + 11 pearls",
          specs: "Bead necklace with sapphire pendant",
          remarks: "Sapphire supplied by us",
          upTo: "ghat_submit",
          extra: ["ghat_rework"],
          caster: "k0",
          lossFactor: 0.976,
        },
        {
          name: "Ruby jhumka",
          category: "Earrings",
          img: "jhumka-ruby",
          estG: 14,
          qty: 2,
          stones: "Ruby 4, pearls 14",
          specs: "Small dome jhumka",
          remarks: "Matching set",
          upTo: "cast_submit",
          caster: "k4",
        },
      ],
    },
    {
      customer: 2,
      type: "PIECE",
      title: "Emerald tennis bracelet",
      agoDays: 12,
      dueInDays: 2,
      priority: "Normal",
      remarks: "Gift for mother. Size 7 inch.",
      pieces: [
        {
          name: "Emerald tennis bracelet",
          category: "Bracelet",
          img: "bracelet",
          estG: 14.5,
          stones: "Emerald 5, diamond 4",
          specs: "Hinged links with box clasp",
          remarks: "7 inch length",
          upTo: "job_return",
          caster: "k4",
          setter: "k1",
        },
      ],
    },
    {
      customer: 5,
      type: "PROJECT",
      title: "Silver chain & bracelet lot",
      agoDays: 11,
      dueInDays: 3,
      priority: "Normal",
      metal: "Silver",
      remarks: "Showroom silver counter stock. Rhodium finish on bracelet.",
      pieces: [
        {
          name: "Silver rope chain 20 inch",
          category: "Chain",
          img: "chain",
          estG: 32,
          specs: "3 mm rope, lobster clasp",
          remarks: "Bright polish",
          upTo: "job_send",
          caster: "k4",
        },
        {
          name: "Silver link bracelet",
          category: "Bracelet",
          img: "bracelet",
          estG: 21,
          stones: "CZ 9",
          specs: "Box clasp",
          remarks: "Rhodium plated",
          upTo: "ready",
          caster: "k4",
          setter: "k1",
          process: "Rhodium plating",
          vendor: "v-rhodium",
        },
      ],
    },
    {
      customer: 2,
      type: "PROJECT",
      title: "Copper wellness kada & ring",
      agoDays: 7,
      dueInDays: 6,
      priority: "Normal",
      metal: "Copper",
      remarks: "Pure copper, no lacquer — customer wants natural finish.",
      pieces: [
        {
          name: "Copper kada",
          category: "Bangle",
          img: "bangle",
          estG: 48,
          size: "2.6",
          specs: "Twisted copper kada",
          remarks: "No lacquer",
          upTo: "ghat_submit",
          caster: "k4",
        },
        {
          name: "Copper ring",
          category: "Ring",
          img: "ring-solitaire",
          estG: 6,
          size: "18",
          specs: "Plain band with top",
          remarks: "Natural finish",
          upTo: "ready",
          caster: "k2",
        },
      ],
    },
    {
      customer: 6,
      type: "PIECE",
      title: "Solitaire ring (repeat)",
      agoDays: 0.2,
      dueInDays: 14,
      priority: "Normal",
      remarks: "Same as previous design, size 16.",
      pieces: [
        {
          name: "Solitaire ring",
          category: "Ring",
          img: "ring-solitaire",
          estG: 5.2,
          size: "16",
          stones: "CZ 6 mm",
          specs: "Four prong solitaire",
          remarks: "Repeat of earlier design",
          upTo: "none",
        },
      ],
    },
  ];

  const office = ["Rakesh Pal", "Priya Das"];

  // Every business event is queued with its timestamp and replayed in time
  // order, so document numbers (ORD/WO/JW/DEL) come out chronological.
  const events: { t: number; run: () => void }[] = [];

  orders.forEach((os, oi) => {
    const start = nowMs - os.agoDays * DAY;
    const ctx = (ms: number, by = office[oi % 2]): Ctx => ({ now: iso(Math.min(ms, nowMs - 5 * 60e3)), by });
    const metal = os.metal ?? "Gold";
    const finalImg = (key: string) => (metal === "Gold" ? img(key, "final") : `/demo/${key}-final-${metal.toLowerCase()}.jpg`);
    let orderId = "";
    let pieces: Piece[] = [];
    events.push({
      t: start,
      run: () => {
        orderId = ops.createOrder(
          db,
          {
            customerId: C[os.customer],
            type: os.type,
            title: os.title,
            orderDate: iso(start),
            dueDate: iso(nowMs + os.dueInDays * DAY),
            priority: os.priority,
            metal,
            remarks: os.remarks,
            photos: [{ url: img(os.pieces[0].img, "sketch"), caption: "Customer design reference", kind: "reference" }],
            pieces: os.pieces.map((p) => ({
              name: p.name,
              category: p.category,
              purity: p.purity ?? DEFAULT_PURITY[metal],
              size: p.size,
              qty: p.qty ?? 1,
              specs: p.specs,
              stones: p.stones,
              estWeightMg: Math.round(p.estG * 1000),
              valueRs: Math.round((p.estG * RATE[metal] * (p.purity?.startsWith("18K") ? 0.8 : 1)) / 100) * 100,
              remarks: p.remarks,
              photos: [{ url: img(p.img, "sketch"), caption: "Design sketch", kind: "design" }],
            })),
          },
          ctx(start),
        );
        pieces = db.pieces.filter((p) => p.orderId === orderId);
      },
    });
    if (os.hold) {
      events.push({ t: start + 0.3 * DAY, run: () => ops.updateOrderStatus(db, orderId, "os-approval", os.hold!, ctx(start + 0.3 * DAY)) });
    }
    const endMs = os.deliver ? nowMs - os.deliver.agoDays * DAY - 0.5 * DAY : nowMs - 0.1 * DAY;

    os.pieces.forEach((ps, pi) => {
      if (!ps.upTo || ps.upTo === "none") return;
      let steps = FLOW.slice(0, FLOW.indexOf(ps.upTo) + 1);
      if (!ps.stones) steps = steps.filter((s) => !s.startsWith("set_"));
      steps = [...steps, ...(ps.extra ?? [])];
      const gap = Math.min(1.6 * DAY, (endMs - start - 0.4 * DAY) / (steps.length + 0.5));
      let t = start + 0.4 * DAY + pi * 0.07 * DAY;
      let w = Math.round(ps.estG * 1000 * 1.06); // metal issued incl. sprue allowance
      let wo = "";
      let jw = "";
      const caster = K[Number((ps.caster ?? "k0").slice(1))];
      const setter = K[Number((ps.setter ?? "k1").slice(1))];
      const filer = ps.category === "Chain" || ps.category === "Bangle" ? K[4] : K[2];
      const artisanName = (id: string) => db.artisans.find((a) => a.id === id)!.name;
      const lose = (f: number) => (w = Math.round(w * f));

      for (const step of steps) {
        t += gap * (0.75 + ((pi + step.length) % 5) * 0.1);
        const at = t;
        const due = (days: number) => iso(at + days * DAY);
        events.push({
          t: at,
          run: () => {
            const piece = pieces[pi];
            switch (step) {
              case "cast_issue":
                wo = ops.issueWorkOrder(
                  db,
                  {
                    pieceId: piece.id,
                    artisanId: caster,
                    stageId: "st-cast",
                    dueDate: due(4),
                    issuedWeightMg: w,
                    instructions: `Cast as per design sketch. ${ps.specs}.`,
                    remarks: "Metal issued from vault after weighing",
                  },
                  ctx(at),
                );
                break;
              case "cast_progress":
                ops.addWorkUpdate(
                  db,
                  wo,
                  { percent: 60, note: "Wax model done, casting completed, cleaning sprues", photos: [{ url: img(ps.img, "raw"), caption: "Casting — raw" }] },
                  ctx(at, artisanName(caster)),
                );
                break;
              case "cast_submit":
                lose(0.988);
                ops.submitWork(
                  db,
                  wo,
                  { weightMg: w, note: "Casting finished and cleaned", photos: [{ url: img(ps.img, "raw"), caption: "Casting submitted" }] },
                  ctx(at, artisanName(caster)),
                );
                break;
              case "cast_approve":
                ops.reviewWork(db, wo, { approve: true, note: "Casting checked — no porosity" }, ctx(at));
                break;
              case "ghat_issue":
                wo = ops.issueWorkOrder(
                  db,
                  {
                    pieceId: piece.id,
                    artisanId: ps.lossFactor ? caster : filer,
                    stageId: "st-ghat",
                    dueDate: due(3),
                    issuedWeightMg: w,
                    instructions: "Filing, soldering joints and assembly. Keep edges crisp.",
                    remarks: "Issued after casting approval",
                  },
                  ctx(at),
                );
                break;
              case "ghat_submit":
                lose(ps.lossFactor ?? 0.993);
                ops.submitWork(
                  db,
                  wo,
                  { weightMg: w, note: "Assembly done, ready for setting", photos: [{ url: img(ps.img, "raw"), caption: "After ghat work" }] },
                  ctx(at, db.artisans.find((a) => a.id === db.workOrders.find((x) => x.id === wo)!.artisanId)!.name),
                );
                break;
              case "ghat_rework":
                ops.reviewWork(
                  db,
                  wo,
                  {
                    approve: false,
                    note: `Weight loss above ${db.settings.weightTolerancePct}% tolerance and clasp joint is weak — redo the joint and return filings`,
                  },
                  ctx(at),
                );
                break;
              case "ghat_approve":
                ops.reviewWork(db, wo, { approve: true, note: "Joints and finish OK", nextStageId: ps.stones ? "st-setting" : "st-polish" }, ctx(at));
                break;
              case "set_issue":
                wo = ops.issueWorkOrder(
                  db,
                  {
                    pieceId: piece.id,
                    artisanId: setter,
                    stageId: "st-setting",
                    dueDate: due(4),
                    issuedWeightMg: w,
                    instructions: `Stones: ${ps.stones}. Check every stone after setting.`,
                    remarks: "Stones counted and handed over with piece",
                  },
                  ctx(at),
                );
                break;
              case "set_hold":
                ops.updateWorkStatus(db, wo, "ws-stones", "Emerald drops pending from supplier", ctx(at));
                break;
              case "set_progress":
                ops.addWorkUpdate(
                  db,
                  wo,
                  { percent: 45, note: "Half the stones set, waiting on last drops", photos: [{ url: img(ps.img, "raw"), caption: "Setting in progress" }] },
                  ctx(at, artisanName(setter)),
                );
                break;
              case "set_submit":
                w = Math.round(w * 1.004);
                ops.submitWork(
                  db,
                  wo,
                  { weightMg: w, note: "All stones set and checked", photos: [{ url: finalImg(ps.img), caption: "After stone setting" }] },
                  ctx(at, artisanName(setter)),
                );
                break;
              case "set_approve":
                ops.reviewWork(db, wo, { approve: true, note: "All stones secure", nextStageId: "st-polish" }, ctx(at));
                break;
              case "job_send":
                jw = ops.sendJobWork(
                  db,
                  {
                    pieceId: piece.id,
                    vendorId: ps.vendor ?? "v-polish",
                    process: ps.process ?? "Polishing",
                    dispatchDate: iso(at),
                    expectedDate: due(2),
                    sentWeightMg: w,
                    remarks: "Sent with challan, handle with care",
                    photos: [{ url: img(ps.img, "raw"), caption: "Before polishing" }],
                  },
                  ctx(at),
                );
                break;
              case "job_delay":
                ops.updateJobStatus(db, jw, "js-delayed", "Vendor says plating bath under maintenance — 2 more days", ctx(at));
                break;
              case "job_return":
                lose(0.996);
                ops.receiveJobWork(
                  db,
                  jw,
                  {
                    returnedWeightMg: w,
                    charges: 350,
                    remarks: "Received polished, checked under loupe",
                    photos: [{ url: finalImg(ps.img), caption: "After polishing" }],
                  },
                  ctx(at),
                );
                break;
              case "ready":
                ops.markReady(
                  db,
                  piece.id,
                  {
                    finalWeightMg: w,
                    remarks: "QC passed, hallmark done (HUID recorded)",
                    photos: [{ url: finalImg(ps.img), caption: "Final studio photo" }],
                  },
                  ctx(at),
                );
                break;
            }
          },
        });
      }
    });

    if (os.challan) {
      const c = os.challan;
      events.push({
        t: nowMs - c.agoDays * DAY,
        run: () => {
          ops.createChallan(
            db,
            {
              orderId,
              date: iso(nowMs - c.agoDays * DAY),
              items: c.pieces.map((i) => ({
                pieceId: pieces[i].id,
                weightMg: pieces[i].finalWeightMg ?? pieces[i].estWeightMg,
                valueRs: pieces[i].valueRs ?? 0,
              })),
              mode: "Road transport",
              vehicleNo: c.vehicleNo,
              transporter: c.transporter,
              fromPlace: "Bowbazar, Kolkata",
              toPlace: db.customers.find((x) => x.id === C[os.customer])?.city ?? "",
              remarks: "Sealed parcel, insured transit. Hand over against signature only.",
            },
            ctx(nowMs - c.agoDays * DAY),
          );
        },
      });
    }

    if (os.deliver) {
      const d = os.deliver;
      events.push({
        t: nowMs - d.agoDays * DAY,
        run: () => {
          ops.createDelivery(
            db,
            {
              orderId,
              pieceIds: d.pieces.map((i) => pieces[i].id),
              date: iso(nowMs - d.agoDays * DAY),
              mode: d.mode,
              receivedBy: d.receivedBy,
              remarks: "Delivered with bill and hallmark certificate. Customer satisfied.",
              photos: [{ url: finalImg(os.pieces[d.pieces[0]].img), caption: "Handover photo" }],
            },
            ctx(nowMs - d.agoDays * DAY),
          );
        },
      });
    }
  });

  events.sort((a, b) => a.t - b.t).forEach((e) => e.run());

  const byDate =
    <T>(key: (x: T) => string) =>
    (a: T, b: T) =>
      key(b).localeCompare(key(a));
  db.activity.sort(byDate((a) => a.at));
  db.orders.sort(byDate((o) => o.orderDate));
  db.workOrders.sort(byDate((w) => w.issuedAt));
  db.jobWorks.sort(byDate((j) => j.dispatchDate));
  db.deliveries.sort(byDate((d) => d.date));
  db.challans.sort(byDate((c) => c.date));
  return db;
}
