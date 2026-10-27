// Backend PDF renderer for work orders, job-work challans and delivery notes.
// The client posts the document data (photos embedded as data URLs).
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

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
}

interface Payload {
  company: { name: string; tagline: string; address: string; phone: string; email: string; gstin: string };
  title: string;
  number: string;
  date: string;
  dueDate?: string;
  party: { label: string; name?: string; sub?: string; phone?: string };
  ref: Record<string, string | undefined>;
  rows: Row[];
  weightLabel: string;
  instructions?: string;
  remarks?: string;
  photos: { url: string; caption: string }[];
  signatures: string[];
}

const GOLD = "#a8772b";
const INK = "#22170f";
const MUTED = "#7a6a5a";
const LINE = "#e6dccb";

const s = StyleSheet.create({
  page: { padding: 34, fontSize: 9.5, color: INK, fontFamily: "Helvetica", backgroundColor: "#fffdf8" },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 12 },
  company: { fontFamily: "Times-Bold", fontSize: 22, color: INK },
  tagline: { color: GOLD, fontSize: 8.5, marginTop: 2, letterSpacing: 1 },
  small: { color: MUTED, fontSize: 8, marginTop: 1.5 },
  docTitle: { fontFamily: "Times-Italic", fontSize: 18, color: GOLD, textAlign: "right" },
  docNo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "right", marginTop: 3 },
  grid: { flexDirection: "row", marginTop: 16, gap: 10 },
  box: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 9, backgroundColor: "#ffffff" },
  label: { fontSize: 7, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  table: { marginTop: 16, borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  th: { flexDirection: "row", backgroundColor: "#f4ecdd", paddingVertical: 6, paddingHorizontal: 8 },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: LINE },
  thText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase" },
  section: { marginTop: 14 },
  para: { lineHeight: 1.45, marginTop: 2 },
  photos: { flexDirection: "row", gap: 8, marginTop: 6 },
  photo: { width: 118, height: 118, borderRadius: 6, objectFit: "cover" },
  caption: { fontSize: 7, color: MUTED, marginTop: 2, width: 118 },
  sigs: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  sig: { width: 190, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, fontSize: 8, color: MUTED, textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const grams = (mg?: number) => (mg == null ? "-" : `${(mg / 1000).toFixed(3)} g`);

function Doc({ d }: { d: Payload }) {
  const total = d.rows.reduce((a, r) => a + r.weightMg, 0);
  const showReturn = d.rows.some((r) => r.returnedMg);
  return (
    <Document title={`${d.title} ${d.number}`} author={d.company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View>
            <Text style={s.company}>{d.company.name}</Text>
            <Text style={s.tagline}>{d.company.tagline.toUpperCase()}</Text>
            <Text style={s.small}>{d.company.address}</Text>
            <Text style={s.small}>
              {d.company.phone} · {d.company.email} · GSTIN {d.company.gstin}
            </Text>
          </View>
          <View>
            <Text style={s.docTitle}>{d.title}</Text>
            <Text style={s.docNo}>{d.number}</Text>
          </View>
        </View>

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
                  <Text style={{ color: MUTED }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}: </Text>
                  {v}
                </Text>
              ))}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, { width: 22 }]}>#</Text>
            <Text style={[s.thText, { flex: 1 }]}>Item</Text>
            <Text style={[s.thText, { width: 60 }]}>Purity</Text>
            <Text style={[s.thText, { width: 34, textAlign: "right" }]}>Qty</Text>
            <Text style={[s.thText, { width: 78, textAlign: "right" }]}>{d.weightLabel}</Text>
            {showReturn ? <Text style={[s.thText, { width: 70, textAlign: "right" }]}>Returned</Text> : null}
          </View>
          {d.rows.map((r, i) => (
            <View key={r.code} style={s.tr} wrap={false}>
              <Text style={{ width: 22, color: MUTED }}>{i + 1}</Text>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {r.name} <Text style={{ color: GOLD, fontFamily: "Helvetica" }}>({r.code})</Text>
                </Text>
                {r.specs ? <Text style={[s.small, { lineHeight: 1.35 }]}>{r.specs}</Text> : null}
                {r.stones ? <Text style={s.small}>Stones: {r.stones}</Text> : null}
                {r.size ? <Text style={s.small}>Size: {r.size}</Text> : null}
              </View>
              <Text style={{ width: 60 }}>{r.purity}</Text>
              <Text style={{ width: 34, textAlign: "right" }}>{r.qty}</Text>
              <Text style={{ width: 78, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{grams(r.weightMg)}</Text>
              {showReturn ? <Text style={{ width: 70, textAlign: "right" }}>{grams(r.returnedMg)}</Text> : null}
            </View>
          ))}
          {d.rows.length > 1 ? (
            <View style={[s.tr, { backgroundColor: "#faf5ea" }]}>
              <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", textAlign: "right" }}>Total</Text>
              <Text style={{ width: 78, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{grams(total)}</Text>
            </View>
          ) : null}
        </View>

        {d.instructions ? (
          <View style={s.section}>
            <Text style={s.label}>Instructions</Text>
            <Text style={s.para}>{d.instructions}</Text>
          </View>
        ) : null}
        {d.remarks ? (
          <View style={s.section}>
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

        <View style={s.footer} fixed>
          <Text>
            {d.company.name} · {d.title} {d.number}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: Request) {
  let d: Payload;
  try {
    d = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!d?.number || !Array.isArray(d.rows)) return new Response("Missing document data", { status: 400 });
  d.photos = (d.photos ?? []).filter((p) => typeof p.url === "string" && /^data:image\/(jpeg|jpg|png);base64,/.test(p.url));
  const buf = await renderToBuffer(<Doc d={d} />);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${d.number}.pdf"`, "Cache-Control": "no-store" },
  });
}
