"use client";
// On-screen jewellery tag preview, drawn to scale with the same layout rules as the PDF.
import { barRuns, code128 } from "@/lib/barcode";
import { fitFontSize, tagFace, type TagData } from "@/lib/tags";
import type { TagSettings } from "@/lib/types";

const PT = 72 / 25.4;

export function TagPreview({ tag, settings: s, pxPerMm = 5 }: { tag: TagData; settings: TagSettings; pxPerMm?: number }) {
  const W = s.bodyMm * pxPerMm;
  const H = s.heightMm * pxPerMm;
  const T = s.tailMm * pxPerMm;
  const pad = 1.3 * pxPerMm;
  const face = tagFace(tag);
  // sizes are computed in points like the PDF, then scaled to pixels
  const ptToPx = pxPerMm / PT;
  const hPt = s.heightMm * PT;
  const innerPt = (s.bodyMm / 2 - 2.6) * PT;
  const font = Math.min(8, ((hPt - 2.6 * PT) / 3) * 0.78);
  const small = Math.min(6.4, hPt * 0.125);
  const barH = Math.max(H * 0.3, H - pad * 2 - small * ptToPx * 2 * 1.3);
  const pattern = code128(tag.barcode);
  // same rule as the PDF: whole 203-dpi printer dots per module, 6-module quiet zones
  const dotMm = 25.4 / 203;
  const dots = Math.max(1, Math.floor(s.bodyMm / 2 / (pattern.length + 12) / dotMm));
  const mod = dots * dotMm * pxPerMm;
  const tailH = Math.min(5 * pxPerMm, H * 0.32);
  const text = (t: string, size: number) => ({
    fontSize: fitFontSize(t, size, innerPt, true) * ptToPx,
    fontWeight: 700,
    lineHeight: 1.1,
    fontFamily: "Helvetica, Arial, sans-serif",
  });
  return (
    <div className="flex items-center" style={{ width: W + T }}>
      <div className="flex shrink-0 overflow-hidden rounded-md bg-white text-black shadow-md ring-1 ring-black/15" style={{ width: W, height: H }}>
        <div className="flex flex-col justify-between overflow-hidden whitespace-nowrap" style={{ width: W / 2, padding: pad }}>
          {face.left.map((l, i) => (
            <div key={i} style={text(l, font)}>
              {l}
            </div>
          ))}
        </div>
        <div
          className="flex flex-col items-center justify-between border-l border-dashed border-black/10 whitespace-nowrap"
          style={{ width: W / 2, paddingTop: pad, paddingBottom: pad }}
        >
          <div style={text(face.purity, small)}>{face.purity}</div>
          <svg width={W / 2} height={barH} viewBox={`0 0 ${W / 2} ${barH}`} shapeRendering="crispEdges" aria-label={`Barcode ${tag.barcode}`}>
            {barRuns(pattern).map(([x, w], i) => (
              <rect key={i} x={(W / 2 - pattern.length * mod) / 2 + x * mod} y={0} width={w * mod} height={barH} fill="#000" />
            ))}
          </svg>
          <div style={{ ...text(face.tagNo, small), letterSpacing: 0.3 }}>{face.tagNo}</div>
        </div>
      </div>
      <div className="shrink-0 rounded-r-full bg-white/90 ring-1 ring-black/15" style={{ width: T, height: tailH }} />
    </div>
  );
}
