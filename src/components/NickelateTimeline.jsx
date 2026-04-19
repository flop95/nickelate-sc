import { useState } from "react";
import { timelineEvents as timeline, timelineMilestones as milestones } from "../data/index.js";

const Sep = () => <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 12px" }}>·</span>;

const Rule = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 24px" }}>
    {label && (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>
        {label}
      </span>
    )}
    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
  </div>
);

export default function NickelateTimeline() {
  const [hovered, setHovered] = useState(null);

  const W = 720, H = 280, pL = 48, pR = 24, pT = 32, pB = 64;
  const tcMax = 110;
  const points = timeline.map((t, i) => ({
    ...t,
    x: pL + (i / (timeline.length - 1)) * (W - pL - pR),
    y: pT + ((tcMax - t.tc) / tcMax) * (H - pT - pB),
  }));

  const sy = (tc) => pT + ((tcMax - tc) / tcMax) * (H - pT - pB);

  const bulkRecord = 96;
  const filmRecord = 63;
  const gapToLN2 = 77 - filmRecord;
  const gapToBulk = bulkRecord - filmRecord;

  return (
    <div>
      {/* Dominant number */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: "var(--color-accent)", fontFamily: "var(--font-mono)", lineHeight: 1, letterSpacing: "-0.03em" }}>{filmRecord}K</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 32, lineHeight: 1.8 }}>
        film ambient record
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{bulkRecord}K</span> bulk under pressure
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{gapToLN2}K</span> gap to LN₂
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{gapToBulk}K</span> bulk-film gap
      </div>

      {/* Full-width timeline chart */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: "0.04em" }}>
          tc progression // jul 2023 → apr 2026
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
          {[0, 20, 40, 60, 80, 100].map(t => (
            <g key={t}>
              <line x1={pL} y1={sy(t)} x2={W - pR} y2={sy(t)} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
              <text x={pL - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">{t}</text>
            </g>
          ))}
          {milestones.map(m => (
            <g key={m.tc}>
              <line x1={pL} y1={sy(m.tc)} x2={W - pR} y2={sy(m.tc)} stroke={m.color} strokeWidth={0.5} strokeDasharray="4 4" opacity={0.4} />
              <text x={W - pR - 4} y={sy(m.tc) - 4} textAnchor="end" fontSize={9} fill={m.color} opacity={0.5} fontFamily="'DM Mono', monospace">{m.label}</text>
            </g>
          ))}
          {points.map((p, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            return <line key={`line-${i}`} x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
              {/* Invisible larger hit area for reliable hover */}
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5} fill={p.color} stroke="none" opacity={0.85} />
              <text x={p.x} y={H - pB + 16} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace" transform={`rotate(-45, ${p.x}, ${H - pB + 16})`}>{p.date}</text>
            </g>
          ))}
          {hovered !== null && (() => {
            const p = points[hovered];
            const tw = 260, th = 52;
            // Clamp tooltip within chart bounds
            const tx = Math.max(pL, Math.min(p.x - tw / 2, W - pR - tw));
            // Position above point; if too close to top, show below
            let ty = p.y - th - 12;
            if (ty < pT) ty = p.y + 12;
            const typeLabel = p.type === "bulk" ? "bulk under pressure" : p.type === "film+P" ? "film + pressure" : "film at ambient";
            const detailText = (p.detail || p.label || "").slice(0, 70);
            return (
              <g>
                <rect x={tx} y={ty} width={tw} height={th} rx={0} fill="rgba(20,20,20,0.95)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                <text x={tx + 8} y={ty + 16} fontSize={11} fontWeight={600} fill="var(--color-text)" fontFamily="'DM Mono', monospace">{p.label} — {p.tc}K</text>
                <text x={tx + 8} y={ty + 30} fontSize={9} fill="var(--color-text-secondary)">{typeLabel}</text>
                <text x={tx + 8} y={ty + 44} fontSize={9} fill="var(--color-text-muted)">{detailText}</text>
              </g>
            );
          })()}
          {[["Bulk (pressure)", "#D85A30"], ["Film (ambient)", "#1D9E75"], ["Film + pressure", "#7F77DD"], ["Record", "#d4a843"]].map(([l, c], i) => (
            <g key={l}>
              <circle cx={pL + 8 + i * 160} cy={H - 12} r={2.5} fill={c} />
              <text x={pL + 15 + i * 160} y={H - 8} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">{l}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Rate of progress — single column, no grid */}
      <Rule label="rate of progress" />

      <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
        <p style={{ margin: "0 0 12px" }}>From first bulk signature (Jul 2023) to first ambient film (Dec 2024): <strong style={{ color: "var(--color-text)" }}>17 months</strong>. From first ambient film at 42K to current ambient record of 63K: <strong style={{ color: "var(--color-text)" }}>15 months</strong>. That's a 50% increase in onset Tc from film engineering alone.</p>
        <p style={{ margin: "0 0 12px" }}>The bulk-film gap has narrowed from 38K (80K bulk vs 42K film, Dec 2024) to 33K (96K bulk vs 63K film, Mar 2026). The gap closes faster when measured against the original 80K bulk: only 17K remains.</p>
        <p style={{ margin: "0 0 12px" }}>At the current rate of film improvement (~14K/year), ambient-pressure films would cross the liquid nitrogen threshold (77K) by <strong style={{ color: "var(--color-text)" }}>mid-2027</strong>. But the rate is likely to accelerate — the field hasn't yet tried stronger-compression substrates, electric field gating, or optimized Sr-doping + GAE combinations.</p>
        <p style={{ margin: 0 }}>The film + moderate pressure route is the fastest path: films already hit 68.5K at just 2 GPa. At the observed pressure sensitivity (~3K/GPa), 4 GPa would put onset at ~75K, and 5 GPa at ~77K — both achievable with simple mechanical pressure cells, not diamond anvils.</p>
      </div>

      {/* Pipeline: paths to 77K */}
      <Rule label="paths to liquid nitrogen" />

      <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16, marginLeft: 4 }}>
        {[
          { id: "A", label: "Strain alone", text: "Need substrate with a ≈ 3.72Å (strain ≈ -3.0%). SmAlO₃ or EuAlO₃. Risk: coherent film growth at high mismatch. Nobody has tried." },
          { id: "B", label: "Film + pressure", text: "Current 63K GAE films + 4-5 GPa. Pressure cells are cheap. Predicted: 75-80K onset. This could be done tomorrow by any group with a piston-cylinder cell." },
          { id: "C", label: "Growth optimization", text: "GAE already jumped 42→63K on the same substrate. If oxygen vacancy elimination continues improving, another 10-15K is plausible without changing anything else." },
          { id: "D", label: "Electric field", text: "Theory predicts 0.1-0.2V perpendicular field on single-bilayer pushes Tc to 77K+. Zero attempts. Highest risk, highest reward." },
        ].map((path, i, arr) => (
          <div key={path.id} style={{ position: "relative", paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
            <span style={{ position: "absolute", left: -20, top: 4, fontSize: 9, color: "var(--color-accent)" }}>▸</span>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-accent)", marginRight: 8 }}>Path {path.id}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)" }}>{path.label}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{path.text}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
        Timeline data from published papers and preprints. Hover for details. Projections assume continuation of observed trends.
      </div>
    </div>
  );
}
