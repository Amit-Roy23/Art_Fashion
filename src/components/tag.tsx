"use client";
// On-screen jewellery tag preview, drawn to scale from the same data the PDF prints.
import { barRuns, code128 } from "@/lib/barcode";
import { fitFontSize, tagLines, type TagData } from "@/lib/tags";
import type { TagSettings } from "@/lib/types";

export function TagPreview({ tag, settings: s, pxPerMm = 5 }: { tag: TagData; settings: TagSettings; pxPerMm?: number }) {
  const W = s.bodyMm * pxPerMm;
  const H = s.heightMm * pxPerMm;
  const T = s.tailMm * pxPerMm;
  const pad = 1.4 * pxPerMm;
  const lines = tagLines(tag, s);
  const units = lines.reduce((u, l) => u + (l.small ? 0.82 : 1), 0);
  // same sizing rule as the PDF (points scaled to pixels)
  const ptToPx = (25.4 / 72) * pxPerMm;
  const font = Math.min(7.2, ((s.heightMm * (72 / 25.4) - 1.4 * (72 / 25.4) * 2) / Math.max(units, 1)) * 0.78) * ptToPx;
  const codeFont = Math.min(6.2, s.heightMm * (72 / 25.4) * 0.13) * ptToPx;
  const pattern = code128(tag.barcode);
  // same rule as the PDF: whole 203-dpi printer dots per module, 6-module quiet zones
  const dotMm = 25.4 / 203;
  const dots = Math.max(1, Math.floor(s.bodyMm / 2 / (pattern.length + 12) / dotMm));
  const mod = dots * dotMm * pxPerMm;
  const fit = (text: string, size: number, bold?: boolean) => fitFontSize(text, size, W / 2 - pad * 2, bold);
  const barH = H - pad * 2 - codeFont * 1.35;
  const tailH = Math.min(5 * pxPerMm, H * 0.32);
  return (
    <div className="flex items-center" style={{ width: W + T }}>
      <div className="flex shrink-0 overflow-hidden rounded-md bg-white text-black shadow-md ring-1 ring-black/15" style={{ width: W, height: H }}>
        <div className="flex flex-col justify-center overflow-hidden" style={{ width: W / 2, padding: pad }}>
          {lines.map((l, i) => (
            <div
              key={i}
              className="truncate"
              style={{
                fontSize: fit(l.text, l.small ? font * 0.82 : font, l.strong),
                lineHeight: 1.12,
                fontWeight: l.strong ? 700 : 400,
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              {l.text}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center border-l border-dashed border-black/10" style={{ width: W / 2, paddingTop: pad, paddingBottom: pad }}>
          <svg width={W / 2} height={barH} viewBox={`0 0 ${W / 2} ${barH}`} shapeRendering="crispEdges" aria-label={`Barcode ${tag.barcode}`}>
            {barRuns(pattern).map(([x, w], i) => (
              <rect key={i} x={(W / 2 - pattern.length * mod) / 2 + x * mod} y={0} width={w * mod} height={barH} fill="#000" />
            ))}
          </svg>
          <div style={{ fontSize: codeFont, fontWeight: 700, letterSpacing: 0.4, marginTop: codeFont * 0.25, fontFamily: "Helvetica, Arial, sans-serif" }}>
            {tag.barcode}
          </div>
        </div>
      </div>
      <div className="shrink-0 rounded-r-full bg-white/90 ring-1 ring-black/15" style={{ width: T, height: tailH }} />
    </div>
  );
}
