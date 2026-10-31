// Backend PDF renderer. Two layouts:
//  • "doc"      – A4 portrait documents: work order, job-work challan, delivery note,
//                 delivery / road challan, order summary (items with photos, weights, values)
//  • "register" – A4 landscape tables: karigar work register, vendor register, karigar-wise lists
// The client posts the data with photos already embedded as JPEG/PNG data URLs.
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

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

const GOLD = "#a8772b";
const INK = "#22170f";
const MUTED = "#7a6a5a";
const LINE = "#e6dccb";
const DANGER = "#b4232c";

const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica", backgroundColor: "#fffdf8" },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 12 },
  company: { fontFamily: "Times-Bold", fontSize: 22, color: INK },
  tagline: { color: GOLD, fontSize: 8.5, marginTop: 2, letterSpacing: 1 },
  small: { color: MUTED, fontSize: 8, marginTop: 1.5 },
  docTitle: { fontFamily: "Times-Italic", fontSize: 18, color: GOLD, textAlign: "right" },
  docNo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "right", marginTop: 3 },
  grid: { flexDirection: "row", marginTop: 14, gap: 10 },
  box: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 9, backgroundColor: "#ffffff" },
  label: { fontSize: 7, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  table: { marginTop: 14, borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  th: { flexDirection: "row", backgroundColor: "#f4ecdd", paddingVertical: 6, paddingHorizontal: 8 },
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

function Header({ company, title, number }: { company: Company; title: string; number: string }) {
  return (
    <View style={s.band}>
      <View style={{ maxWidth: "62%" }}>
        <Text style={s.company}>{company.name}</Text>
        <Text style={s.tagline}>{company.tagline.toUpperCase()}</Text>
        <Text style={s.small}>{company.address}</Text>
        <Text style={s.small}>
          {company.phone} · {company.email} · GSTIN {company.gstin}
        </Text>
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
                    {r.name} <Text style={{ color: GOLD, fontFamily: "Helvetica" }}>({r.code})</Text>
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

const isImage = (u: unknown) => typeof u === "string" && /^data:image\/(jpeg|jpg|png);base64,/.test(u);

export async function POST(req: Request) {
  let d: DocPayload | RegisterPayload;
  try {
    d = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!d?.number || !Array.isArray(d.rows)) return new Response("Missing document data", { status: 400 });
  let el;
  if (d.layout === "register") {
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
