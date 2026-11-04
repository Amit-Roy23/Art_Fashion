// Backend PDF renderer. Two layouts:
//  • "doc"      – A4 portrait documents: work order, job-work challan, delivery note,
//                 delivery / road challan, order summary (items with photos, weights, values)
//  • "register" – A4 landscape tables: karigar work register, vendor register, karigar-wise lists
// The client posts the data with photos already embedded as JPEG/PNG data URLs.
import { Document, Font, Image, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { BRAND_LOGO_PNG, BRAND_LOGO_RATIO } from "@/lib/brand-logo";
import { barRuns, code128 } from "@/lib/barcode";
import { fitFontSize } from "@/lib/tags";
import type { TagSettings } from "@/lib/types";

export const runtime = "nodejs";

interface Company {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
}

interface Row {
  code: string;
  name: string;
  purity: string;
  qty: number;
  size?: string;
  weightMg: number;
  specs?: string;
  stones?: string;
  returnedMg?: number;
  valueRs?: number;
  status?: string;
  photo?: string;
}

interface DocPayload {
  layout?: "doc";
  company: Company;
  title: string;
  number: string;
  date: string;
  dueDate?: string;
  party: { label: string; name?: string; sub?: string; phone?: string };
  ref: Record<string, string | undefined>;
  /** extra labelled box, e.g. transport details on a road challan */
  extra?: { label: string; lines: [string, string | undefined][] };
  rows: Row[];
  weightLabel: string;
  showValue?: boolean;
  amountInWords?: string;
  instructions?: string;
  remarks?: string;
  photos: { url: string; caption: string }[];
  signatures: string[];
}

interface RegisterPayload {
  layout: "register";
  company: Company;
  title: string;
  number: string;
  subtitle?: string;
  date: string;
  stats?: { label: string; value: string }[];
  columns: { label: string; width: number; align?: "left" | "right" }[];
  rows: { cells: string[]; photo?: string; flag?: boolean }[];
  totals?: string[];
  note?: string;
}

// Arts & Fashion brand magenta (from the logo)
const ACCENT = "#b3127a";
const INK = "#22170f";
const MUTED = "#7a6a5a";
const LINE = "#e6dccb";
const DANGER = "#b4232c";

const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica", backgroundColor: "#fffdf8" },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: ACCENT, paddingBottom: 12 },
  small: { color: MUTED, fontSize: 8, marginTop: 1.5 },
  docTitle: { fontFamily: "Times-Italic", fontSize: 18, color: ACCENT, textAlign: "right" },
  docNo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "right", marginTop: 3 },
  grid: { flexDirection: "row", marginTop: 14, gap: 10 },
  box: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 9, backgroundColor: "#ffffff" },
  label: { fontSize: 7, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  table: { marginTop: 14, borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  th: { flexDirection: "row", backgroundColor: "#f8e7f1", paddingVertical: 6, paddingHorizontal: 8 },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: LINE, alignItems: "center" },
  thText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase" },
  section: { marginTop: 12 },
  para: { lineHeight: 1.45, marginTop: 2 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  photo: { width: 160, height: 160, borderRadius: 6, objectFit: "cover" },
  rowPhoto: { width: 58, height: 58, borderRadius: 5, objectFit: "cover", marginRight: 8 },
  caption: { fontSize: 7, color: MUTED, marginTop: 2, width: 160 },
  sigs: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  sig: { width: 190, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, fontSize: 8, color: MUTED, textAlign: "center" },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const grams = (mg?: number) => (mg == null ? "-" : `${(mg / 1000).toFixed(3)} g`);
// Helvetica has no ₹ glyph, so amounts print as "Rs."
const rupees = (n?: number) => (n == null ? "-" : `Rs. ${n.toLocaleString("en-IN")}`);
const titleCase = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const LOGO_H = 58;

/** Brand logo, mandatory on every document, and repeated as a faint watermark on every page. */
function Watermark({ landscape }: { landscape?: boolean }) {
  const w = landscape ? 440 : 400;
  const pageW = landscape ? 841.89 : 595.28;
  const pageH = landscape ? 595.28 : 841.89;
  const h = w / BRAND_LOGO_RATIO;
  return (
    <View fixed style={{ position: "absolute", left: (pageW - w) / 2, top: (pageH - h) / 2, width: w, height: h, opacity: 0.07 }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={BRAND_LOGO_PNG} style={{ width: w, height: h }} />
    </View>
  );
}

function Header({ company, title, number }: { company: Company; title: string; number: string }) {
  return (
    <View style={s.band}>
      <View style={{ maxWidth: "64%", flexDirection: "row", alignItems: "flex-end" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={BRAND_LOGO_PNG} style={{ height: LOGO_H, width: LOGO_H * BRAND_LOGO_RATIO, marginRight: 12 }} />
        <View style={{ flexShrink: 1 }}>
          <Text style={s.small}>{company.address}</Text>
          <Text style={s.small}>
            {company.phone} · {company.email}
          </Text>
          <Text style={[s.small, { color: INK, fontFamily: "Helvetica-Bold" }]}>GSTIN: {company.gstin}</Text>
        </View>
      </View>
      <View>
        <Text style={s.docTitle}>{title}</Text>
        <Text style={s.docNo}>{number}</Text>
      </View>
    </View>
  );
}

function Footer({ company, title, number }: { company: Company; title: string; number: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {company.name} · {title} {number}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Doc({ d }: { d: DocPayload }) {
  const totalWeight = d.rows.reduce((a, r) => a + r.weightMg, 0);
  const totalValue = d.rows.reduce((a, r) => a + (r.valueRs ?? 0), 0);
  const showReturn = d.rows.some((r) => r.returnedMg);
  const showStatus = d.rows.some((r) => r.status);
  return (
    <Document title={`${d.title} ${d.number}`} author={d.company.name}>
      <Page size="A4" style={s.page}>
        <Watermark />
        <Header company={d.company} title={d.title} number={d.number} />

        <View style={s.grid}>
          <View style={s.box}>
            <Text style={s.label}>{d.party.label}</Text>
            <Text style={s.strong}>{d.party.name ?? "-"}</Text>
            {d.party.sub ? <Text style={s.small}>{d.party.sub}</Text> : null}
            {d.party.phone ? <Text style={s.small}>Ph. {d.party.phone}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Date</Text>
            <Text style={s.strong}>{fmtDate(d.date)}</Text>
            {d.dueDate ? (
              <>
                <Text style={[s.label, { marginTop: 6 }]}>Due / expected</Text>
                <Text style={s.strong}>{fmtDate(d.dueDate)}</Text>
              </>
            ) : null}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Reference</Text>
            {Object.entries(d.ref)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Text key={k} style={{ marginTop: 1.5 }}>
                  <Text style={{ color: MUTED }}>{titleCase(k)}: </Text>
                  {v}
                </Text>
              ))}
          </View>
        </View>

        {d.extra ? (
          <View style={[s.box, { marginTop: 10, flexGrow: 0, flexBasis: "auto" }]}>
            <Text style={s.label}>{d.extra.label}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {d.extra.lines
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <Text key={k} style={{ marginRight: 18, marginTop: 2 }}>
                    <Text style={{ color: MUTED }}>{k}: </Text>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>{v}</Text>
                  </Text>
                ))}
            </View>
          </View>
        ) : null}

        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={[s.thText, { width: 18 }]}>#</Text>
            <Text style={[s.thText, { flex: 1 }]}>Item</Text>
            <Text style={[s.thText, { width: 62 }]}>Purity</Text>
            <Text style={[s.thText, { width: 28, textAlign: "right" }]}>Qty</Text>
            <Text style={[s.thText, { width: 70, textAlign: "right" }]}>{d.weightLabel}</Text>
            {showReturn ? <Text style={[s.thText, { width: 62, textAlign: "right" }]}>Returned</Text> : null}
            {d.showValue ? <Text style={[s.thText, { width: 70, textAlign: "right" }]}>Value</Text> : null}
            {showStatus ? <Text style={[s.thText, { width: 70, textAlign: "right" }]}>Status</Text> : null}
          </View>
          {d.rows.map((r, i) => (
            <View key={r.code} style={s.tr} wrap={false}>
              <Text style={{ width: 18, color: MUTED }}>{i + 1}</Text>
              <View style={{ flex: 1, paddingRight: 8, flexDirection: "row", alignItems: "center" }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {r.photo ? <Image src={r.photo} style={s.rowPhoto} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    {r.name} <Text style={{ color: ACCENT, fontFamily: "Helvetica" }}>({r.code})</Text>
                  </Text>
                  {r.specs ? <Text style={[s.small, { lineHeight: 1.35 }]}>{r.specs}</Text> : null}
                  {r.stones ? <Text style={s.small}>Stones: {r.stones}</Text> : null}
                  {r.size ? <Text style={s.small}>Size: {r.size}</Text> : null}
                </View>
              </View>
              <Text style={{ width: 62 }}>{r.purity}</Text>
              <Text style={{ width: 28, textAlign: "right" }}>{r.qty}</Text>
              <Text style={{ width: 70, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{grams(r.weightMg)}</Text>
              {showReturn ? <Text style={{ width: 62, textAlign: "right" }}>{grams(r.returnedMg)}</Text> : null}
              {d.showValue ? <Text style={{ width: 70, textAlign: "right" }}>{rupees(r.valueRs)}</Text> : null}
              {showStatus ? <Text style={{ width: 70, textAlign: "right", fontSize: 8 }}>{r.status}</Text> : null}
            </View>
          ))}
          {d.rows.length > 1 || d.showValue ? (
            <View style={[s.tr, { backgroundColor: "#faf5ea" }]} wrap={false}>
              <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", textAlign: "right" }}>Total</Text>
              <Text style={{ width: 70, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{grams(totalWeight)}</Text>
              {showReturn ? <Text style={{ width: 62 }} /> : null}
              {d.showValue ? <Text style={{ width: 70, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{rupees(totalValue)}</Text> : null}
              {showStatus ? <Text style={{ width: 70 }} /> : null}
            </View>
          ) : null}
        </View>
        {d.amountInWords ? (
          <Text style={[s.small, { marginTop: 5, fontSize: 8.5, color: INK }]}>
            <Text style={{ color: MUTED }}>Value in words: </Text>
            {d.amountInWords}
          </Text>
        ) : null}

        {d.instructions ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Instructions</Text>
            <Text style={s.para}>{d.instructions}</Text>
          </View>
        ) : null}
        {d.remarks ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Remarks</Text>
            <Text style={s.para}>{d.remarks}</Text>
          </View>
        ) : null}
        {d.photos.length ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Photographs</Text>
            <View style={s.photos}>
              {d.photos.map((p, i) => (
                <View key={i}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={p.url} style={s.photo} />
                  <Text style={s.caption}>{p.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.sigs} wrap={false}>
          {d.signatures.map((x) => (
            <Text key={x} style={s.sig}>
              {x}
            </Text>
          ))}
        </View>
        <Footer company={d.company} title={d.title} number={d.number} />
      </Page>
    </Document>
  );
}

function Register({ d }: { d: RegisterPayload }) {
  const hasPhoto = d.rows.some((r) => r.photo);
  const cell = (c: RegisterPayload["columns"][number], extra: object = {}) =>
    ({ flex: c.width, textAlign: c.align ?? "left", paddingRight: 6, ...extra }) as const;
  return (
    <Document title={`${d.title} ${d.number}`} author={d.company.name}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Watermark landscape />
        <Header company={d.company} title={d.title} number={d.number} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{d.subtitle}</Text>
          <Text style={s.small}>Printed {fmtDate(d.date)}</Text>
        </View>
        {d.stats?.length ? (
          <View style={[s.grid, { marginTop: 8 }]}>
            {d.stats.map((x) => (
              <View key={x.label} style={[s.box, { padding: 7 }]}>
                <Text style={s.label}>{x.label}</Text>
                <Text style={s.strong}>{x.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={s.table}>
          <View style={s.th} fixed>
            {hasPhoto ? <Text style={[s.thText, { width: 44 }]}>Photo</Text> : null}
            {d.columns.map((c) => (
              <Text key={c.label} style={[s.thText, cell(c)]}>
                {c.label}
              </Text>
            ))}
          </View>
          {d.rows.map((r, i) => (
            <View key={i} style={[s.tr, { paddingVertical: 5 }, r.flag ? { backgroundColor: "#fdecec" } : {}]} wrap={false}>
              {hasPhoto ? (
                <View style={{ width: 44 }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  {r.photo ? <Image src={r.photo} style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} /> : null}
                </View>
              ) : null}
              {d.columns.map((c, j) => (
                <Text key={j} style={[cell(c), { fontSize: 8.5 }, r.flag && c.label.startsWith("Diff") ? { color: DANGER, fontFamily: "Helvetica-Bold" } : {}]}>
                  {r.cells[j] ?? ""}
                </Text>
              ))}
            </View>
          ))}
          {!d.rows.length ? (
            <View style={s.tr}>
              <Text style={{ color: MUTED }}>No records.</Text>
            </View>
          ) : null}
          {d.totals ? (
            <View style={[s.tr, { backgroundColor: "#faf5ea" }]} wrap={false}>
              {hasPhoto ? <Text style={{ width: 44 }} /> : null}
              {d.columns.map((c, j) => (
                <Text key={j} style={[cell(c), { fontFamily: "Helvetica-Bold", fontSize: 8.5 }]}>
                  {d.totals![j] ?? ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        {d.note ? <Text style={[s.small, { marginTop: 6 }]}>{d.note}</Text> : null}
        <Footer company={d.company} title={d.title} number={d.number} />
      </Page>
    </Document>
  );
}

// ─────────────────────────────────────────────── jewellery tags
interface TagsPayload {
  layout: "tags";
  number: string;
  mode: "roll" | "sheet";
  settings: TagSettings;
  tags: { barcode: string; code: string; lines: { text: string; strong?: boolean; small?: boolean }[] }[];
}

const MM = 72 / 25.4;
// never split words with hyphens (codes and brand names must print whole)
Font.registerHyphenationCallback((word) => [word]);
// thermal label printers are 203 dpi: bar widths are whole printer dots
const DOT_MM = 25.4 / 203;

function Barcode({ value, widthPt, heightPt }: { value: string; widthPt: number; heightPt: number }) {
  const pattern = code128(value);
  const quiet = 6; // modules of white each side; the tag edge and text gap add more
  // module = whole printer dots (2 dots = 0.25 mm when it fits), so every bar prints crisply
  const dots = Math.max(1, Math.floor(widthPt / MM / (pattern.length + quiet * 2) / DOT_MM));
  const modPt = dots * DOT_MM * MM;
  const w = pattern.length * modPt;
  // drawn as SVG rectangles: exact coordinates, no layout rounding of the thin bars
  return (
    <View style={{ width: widthPt, height: heightPt, alignItems: "center" }}>
      <Svg width={w} height={heightPt} viewBox={`0 0 ${pattern.length} 100`} preserveAspectRatio="none">
        {barRuns(pattern).map(([x, n], i) => (
          <Rect key={i} x={x} y={0} width={n} height={100} fill="#000000" />
        ))}
      </Svg>
    </View>
  );
}

/** The printable body of one tag: text on the left half, barcode on the right half. */
function TagBody({ t, s }: { t: TagsPayload["tags"][number]; s: TagSettings }) {
  const w = s.bodyMm * MM;
  const h = s.heightMm * MM;
  const pad = 1.4 * MM;
  const half = w / 2;
  const units = t.lines.reduce((u, l) => u + (l.small ? 0.82 : 1), 0);
  const font = Math.min(7.2, ((h - pad * 2) / Math.max(units, 1)) * 0.78);
  const codeFont = Math.min(6.2, h * 0.13);
  const barH = h - pad * 2 - codeFont * 1.35;
  return (
    <View style={{ width: w, height: h, flexDirection: "row" }}>
      <View style={{ width: half, height: h, padding: pad, justifyContent: "center" }}>
        {t.lines.map((l, i) => (
          <Text
            key={i}
            style={{
              fontSize: fitFontSize(l.text, l.small ? font * 0.82 : font, half - pad * 2, l.strong),
              lineHeight: 1.12,
              fontFamily: l.strong ? "Helvetica-Bold" : "Helvetica",
              color: "#000000",
              maxLines: 1,
            }}
          >
            {l.text}
          </Text>
        ))}
      </View>
      <View style={{ width: half, height: h, paddingVertical: pad, alignItems: "center" }}>
        <Barcode value={t.barcode} widthPt={half} heightPt={barH} />
        <Text style={{ fontSize: codeFont, fontFamily: "Helvetica-Bold", marginTop: codeFont * 0.25, color: "#000000", letterSpacing: 0.4 }}>{t.barcode}</Text>
      </View>
    </View>
  );
}

function Tags({ d }: { d: TagsPayload }) {
  const s = d.settings;
  const bodyW = s.bodyMm * MM;
  const h = s.heightMm * MM;
  const tailW = s.tailMm * MM;
  if (d.mode === "roll") {
    // one tag per page, page = label size, for the thermal label printer
    const pageW = s.pageIncludesTail ? bodyW + tailW : bodyW;
    return (
      <Document title={`Jewellery tags ${d.number}`}>
        {d.tags.map((t, i) => (
          <Page key={i} size={[pageW, h]} style={{ padding: 0, backgroundColor: "#ffffff" }}>
            <TagBody t={t} s={s} />
          </Page>
        ))}
      </Document>
    );
  }
  // A4 test sheet with cut outlines, to check the layout on plain paper first
  const margin = 10 * MM;
  const gapX = 5 * MM;
  const gapY = 3 * MM;
  const tagW = bodyW + tailW;
  const cols = Math.max(1, Math.floor((595.28 - margin * 2 + gapX) / (tagW + gapX)));
  const rows = Math.max(1, Math.floor((841.89 - margin * 2 - 14 + gapY) / (h + gapY)));
  const perPage = cols * rows;
  const pages = Array.from({ length: Math.ceil(d.tags.length / perPage) }, (_, i) => d.tags.slice(i * perPage, (i + 1) * perPage));
  const tailH = Math.min(5 * MM, h * 0.32);
  return (
    <Document title={`Jewellery tags ${d.number}`}>
      {pages.map((tags, pi) => (
        <Page key={pi} size="A4" style={{ padding: margin, backgroundColor: "#ffffff" }}>
          <Text style={{ fontSize: 7, color: "#777777", marginBottom: 6 }}>
            Test sheet · tag {s.bodyMm} × {s.heightMm} mm + {s.tailMm} mm tail · print at 100% / actual size · page {pi + 1} of {pages.length}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", width: cols * (tagW + gapX) }}>
            {tags.map((t, i) => (
              <View key={i} style={{ width: tagW, height: h, marginRight: gapX, marginBottom: gapY, flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: bodyW, height: h, borderWidth: 0.4, borderColor: "#9a9a9a", borderRadius: 1.5 * MM }}>
                  <TagBody t={t} s={s} />
                </View>
                <View
                  style={{
                    width: tailW,
                    height: tailH,
                    borderWidth: 0.4,
                    borderLeftWidth: 0,
                    borderColor: "#9a9a9a",
                    borderTopRightRadius: tailH / 2,
                    borderBottomRightRadius: tailH / 2,
                  }}
                />
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}

// ─────────────────────────────────────────────── address / shipping labels (4 × 6 in)
interface LabelParty {
  name: string;
  lines: string[];
  phone?: string;
}
interface LabelPayload {
  layout: "label";
  number: string;
  labels: {
    to: LabelParty;
    from: LabelParty;
    priority?: string;
    tracking: string;
    qr: string;
    info: { label: string; value: string }[];
    marks: ("fragile" | "up" | "dry" | "care")[];
    footer: [string, string, string];
    note?: string;
  }[];
}

// Handling-mark pictograms (24 × 24 stroke paths, from the Lucide icon set used in the app).
const MARKS: Record<LabelPayload["labels"][number]["marks"][number], { label: string; paths: string[] }> = {
  fragile: { label: "FRAGILE", paths: ["M8 22h8", "M7 10h10", "M12 15v7", "M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"] },
  up: { label: "THIS SIDE UP", paths: ["m5 12 7-7 7 7", "M12 19V5"] },
  dry: { label: "KEEP DRY", paths: ["M12 13v7a2 2 0 0 0 4 0", "M12 2v2", "M20.992 13a1 1 0 0 0 .97-1.274 10.284 10.284 0 0 0-19.923 0A1 1 0 0 0 3 13z"] },
  care: {
    label: "HANDLE WITH CARE",
    paths: [
      "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
      "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",
      "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",
      "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
    ],
  },
};

function QR({ text, size }: { text: string; size: number }) {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) cells.push([x, y]);
  // 4-module quiet zone is part of the QR standard
  return (
    <Svg width={size} height={size} viewBox={`-4 -4 ${n + 8} ${n + 8}`}>
      {cells.map(([x, y], i) => (
        <Rect key={i} x={x} y={y} width={1.02} height={1.02} fill="#000000" />
      ))}
    </Svg>
  );
}

const L = StyleSheet.create({
  page: { padding: 9, backgroundColor: "#ffffff", fontFamily: "Helvetica", color: "#000000" },
  frame: { flex: 1, borderWidth: 1.6, borderColor: "#000000", borderRadius: 8, padding: 10 },
  rule: { borderBottomWidth: 0.8, borderBottomColor: "#000000", marginVertical: 7 },
  cap: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 2 },
});

function Label({ d }: { d: LabelPayload }) {
  return (
    <Document title={`Address label ${d.number}`}>
      {d.labels.map((l, i) => (
        <Page key={i} size={[288, 432]} style={L.page}>
          <View style={L.frame}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={BRAND_LOGO_PNG} style={{ height: 34, width: 34 * BRAND_LOGO_RATIO }} />
              {l.priority ? (
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: "Helvetica-Bold",
                    letterSpacing: 0.8,
                    borderWidth: 1.2,
                    borderColor: "#000000",
                    borderRadius: 9,
                    paddingVertical: 3,
                    paddingHorizontal: 9,
                  }}
                >
                  {l.priority}
                </Text>
              ) : null}
            </View>
            <View style={L.rule} />
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1.15, paddingRight: 8 }}>
                <Text style={[L.cap, { fontSize: 8 }]}>TO</Text>
                <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{l.to.name}</Text>
                {l.to.lines.map((x, j) => (
                  <Text key={j} style={{ fontSize: 8.6, lineHeight: 1.3 }}>
                    {x}
                  </Text>
                ))}
                {l.to.phone ? <Text style={{ fontSize: 8.6, fontFamily: "Helvetica-Bold", marginTop: 2 }}>Ph: {l.to.phone}</Text> : null}
              </View>
              <View style={{ flex: 1, borderLeftWidth: 0.6, borderLeftColor: "#000000", paddingLeft: 8 }}>
                <Text style={L.cap}>FROM</Text>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 1.5 }}>{l.from.name}</Text>
                {l.from.lines.map((x, j) => (
                  <Text key={j} style={{ fontSize: 7, lineHeight: 1.3 }}>
                    {x}
                  </Text>
                ))}
                {l.from.phone ? <Text style={{ fontSize: 7, marginTop: 1 }}>Ph: {l.from.phone}</Text> : null}
              </View>
            </View>
            <View style={L.rule} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 3 }}>{l.tracking}</Text>
                <Barcode value={l.tracking} widthPt={170} heightPt={44} />
              </View>
              <View style={{ width: 66, alignItems: "flex-end" }}>
                <QR text={l.qr} size={62} />
              </View>
            </View>
            <View style={{ flexDirection: "row", borderWidth: 0.8, borderColor: "#000000", borderRadius: 5, marginTop: 8, paddingVertical: 6 }}>
              {l.info.map((x, j) => (
                <View key={j} style={{ flex: 1, alignItems: "center", borderLeftWidth: j ? 0.6 : 0, borderLeftColor: "#000000", paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 6.2, letterSpacing: 0.6, marginBottom: 3 }}>{x.label}</Text>
                  <Text style={{ fontSize: 8.4, fontFamily: "Helvetica-Bold", textAlign: "center" }}>{x.value}</Text>
                </View>
              ))}
            </View>
            {l.marks.length ? (
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 9 }}>
                {l.marks.map((m) => (
                  <View key={m} style={{ width: 58, alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderWidth: 1.2,
                        borderColor: "#000000",
                        borderRadius: 4,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Svg width={22} height={22} viewBox="0 0 24 24">
                        {MARKS[m].paths.map((d0, k) => (
                          <Path key={k} d={d0} stroke="#000000" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                      </Svg>
                    </View>
                    <Text style={{ fontSize: 5.6, fontFamily: "Helvetica-Bold", marginTop: 3, textAlign: "center" }}>{MARKS[m].label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {l.note ? <Text style={{ fontSize: 7, marginTop: 7, textAlign: "center" }}>{l.note}</Text> : null}
            <View style={{ flex: 1 }} />
            <View style={[L.rule, { marginBottom: 5 }]} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {l.footer.map((x, j) => (
                <Text key={j} style={{ fontSize: 7.6, fontFamily: "Helvetica-Bold", flex: 1, textAlign: j === 0 ? "left" : j === 1 ? "center" : "right" }}>
                  {x}
                </Text>
              ))}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}

const isImage = (u: unknown) => typeof u === "string" && /^data:image\/(jpeg|jpg|png);base64,/.test(u);

export async function POST(req: Request) {
  let d: DocPayload | RegisterPayload | TagsPayload | LabelPayload;
  try {
    d = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!d?.number || (d.layout !== "tags" && d.layout !== "label" && !Array.isArray(d.rows))) return new Response("Missing document data", { status: 400 });
  let el;
  if (d.layout === "label") {
    if (!Array.isArray(d.labels) || !d.labels.length || d.labels.length > 50) return new Response("Send 1–50 labels", { status: 400 });
    el = <Label d={d} />;
  } else if (d.layout === "tags") {
    if (!Array.isArray(d.tags) || !d.tags.length || d.tags.length > 500) return new Response("Send 1–500 tags", { status: 400 });
    el = <Tags d={d} />;
  } else if (d.layout === "register") {
    d.rows = d.rows.map((r) => ({ ...r, photo: isImage(r.photo) ? r.photo : undefined }));
    el = <Register d={d} />;
  } else {
    d.photos = (d.photos ?? []).filter((p) => isImage(p.url));
    d.rows = d.rows.map((r) => ({ ...r, photo: isImage(r.photo) ? r.photo : undefined }));
    el = <Doc d={d} />;
  }
  const buf = await renderToBuffer(el);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${d.number}.pdf"`, "Cache-Control": "no-store" },
  });
}
