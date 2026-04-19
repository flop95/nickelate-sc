import { useState, useMemo } from "react";
import { screenerPublished, candidateSubstrates as rawCandidates } from "../data/index.js";

const LNO_BULK_A = 3.833;

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

// Map JSON data to screener's expected shape
const publishedData = screenerPublished;
const candidateSubstrates = rawCandidates;

function calcStrain(subA) {
  return ((subA - LNO_BULK_A) / LNO_BULK_A) * 100;
}

function predictTc(strain) {
  const tc = 22 - 20 * strain;
  return Math.max(0, Math.min(100, tc));
}

function getConfidence(strain) {
  if (strain >= -2.5 && strain <= 2.0) return "Within data range";
  if (strain >= -4.0 || strain <= 3.0) return "Extrapolation";
  return "Far extrapolation";
}

function getStrainColor(strain) {
  if (strain < -3.0) return "#7F77DD";
  if (strain < -1.5) return "#1D9E75";
  if (strain < 0) return "#5B9BD5";
  if (strain < 1.0) return "#D4A843";
  return "#E24B4A";
}

export default function NickelateScreener() {
  const [customA, setCustomA] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [showMethod, setShowMethod] = useState(false);

  const toggleCandidate = (name) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const allPoints = useMemo(() => {
    const points = [];
    publishedData.forEach(d => {
      points.push({ ...d, type: "published", strain: calcStrain(d.a), predictedTc: d.onsetTc });
    });
    candidateSubstrates.filter(c => selectedCandidates.has(c.name)).forEach(c => {
      const strain = calcStrain(c.a);
      points.push({ substrate: c.name, a: c.a, strain, predictedTc: predictTc(strain), type: "candidate", note: c.notes, confidence: getConfidence(strain) });
    });
    if (customA && !isNaN(parseFloat(customA))) {
      const a = parseFloat(customA);
      const strain = calcStrain(a);
      points.push({ substrate: customName || "Custom", a, strain, predictedTc: predictTc(strain), type: "custom", confidence: getConfidence(strain) });
    }
    return points.sort((a, b) => b.predictedTc - a.predictedTc);
  }, [selectedCandidates, customA, customName]);

  const chartWidth = 720, chartHeight = 220, padL = 48, padR = 16, padT = 24, padB = 48;
  const strainMin = -5, strainMax = 3;
  const tcMax = 100;
  const xScale = (s) => padL + ((s - strainMin) / (strainMax - strainMin)) * (chartWidth - padL - padR);
  const yScale = (t) => padT + ((tcMax - t) / tcMax) * (chartHeight - padT - padB);

  const trendX1 = strainMin, trendX2 = strainMax;
  const trendY1 = Math.max(0, Math.min(100, 22 - 20 * trendX1));
  const trendY2 = Math.max(0, Math.min(100, 22 - 20 * trendX2));

  return (
    <div>
      {/* No title card — the tool name is implicit from the tab */}
      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 32 }}>
        predict onset Tc from epitaxial strain // La₃Ni₂O₇ thin film
      </div>

      {/* Full-width chart */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: "0.04em" }}>
          strain vs predicted_tc
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%" }}>
          {[0, 20, 40, 60, 80, 100].map(t => (
            <g key={t}>
              <line x1={padL} y1={yScale(t)} x2={chartWidth - padR} y2={yScale(t)} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
              <text x={padL - 6} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">{t}</text>
            </g>
          ))}
          {[-4, -3, -2, -1, 0, 1, 2].map(s => (
            <g key={s}>
              <line x1={xScale(s)} y1={padT} x2={xScale(s)} y2={chartHeight - padB} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
              <text x={xScale(s)} y={chartHeight - padB + 14} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">{s}%</text>
            </g>
          ))}
          <line x1={xScale(0)} y1={padT} x2={xScale(0)} y2={chartHeight - padB} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} strokeDasharray="4 3" />
          <line x1={xScale(trendX1)} y1={yScale(trendY1)} x2={xScale(trendX2)} y2={yScale(trendY2)} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />
          <line x1={padL} y1={yScale(77)} x2={chartWidth - padR} y2={yScale(77)} stroke="#5B9BD5" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.4} />
          <text x={chartWidth - padR - 4} y={yScale(77) - 4} textAnchor="end" fontSize={9} fill="#5B9BD5" opacity={0.5} fontFamily="'DM Mono', monospace">77K LN₂</text>
          {allPoints.filter(p => p.type === "published").map((p, i) => (
            <circle key={`pub-${i}`} cx={xScale(p.strain)} cy={yScale(p.predictedTc)} r={3.5} fill="#1D9E75" stroke="none" opacity={0.85} />
          ))}
          {allPoints.filter(p => p.type === "candidate").map((p, i) => (
            <g key={`cand-${i}`}>
              <circle cx={xScale(p.strain)} cy={yScale(p.predictedTc)} r={3.5} fill={getStrainColor(p.strain)} stroke="none" opacity={0.85} />
              <text x={xScale(p.strain)} y={yScale(p.predictedTc) - 8} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">{p.substrate.split(" ")[0]}</text>
            </g>
          ))}
          {allPoints.filter(p => p.type === "custom").map((p, i) => (
            <g key={`custom-${i}`}>
              <rect x={xScale(p.strain) - 4} y={yScale(p.predictedTc) - 4} width={8} height={8} fill="var(--color-accent)" stroke="none" transform={`rotate(45, ${xScale(p.strain)}, ${yScale(p.predictedTc)})`} />
              <text x={xScale(p.strain)} y={yScale(p.predictedTc) - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-accent)" fontFamily="'DM Mono', monospace">{p.substrate}</text>
            </g>
          ))}
          <circle cx={padL + 8} cy={padT + 8} r={2.5} fill="#1D9E75" />
          <text x={padL + 16} y={padT + 12} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">published</text>
          <circle cx={padL + 88} cy={padT + 8} r={2.5} fill="#5B9BD5" />
          <text x={padL + 96} y={padT + 12} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">candidate</text>
          <rect x={padL + 163} y={padT + 4.5} width={6} height={6} fill="var(--color-accent)" transform={`rotate(45, ${padL + 166}, ${padT + 7.5})`} />
          <text x={padL + 176} y={padT + 12} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">custom</text>
        </svg>
      </div>

      <Rule />

      {/* Custom substrate input — compact inline */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.55)", display: "block", marginBottom: 4, letterSpacing: "0.04em" }}>substrate name</label>
          <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. MySubstrate" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.55)", display: "block", marginBottom: 4, letterSpacing: "0.04em" }}>a-axis (Å)</label>
          <input value={customA} onChange={e => setCustomA(e.target.value)} placeholder="e.g. 3.75" type="number" step="0.001" />
        </div>
      </div>

      {/* Candidate substrates — compact toggles */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: "0.04em" }}>
          candidate substrates
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {candidateSubstrates.map(c => {
            const strain = calcStrain(c.a);
            const tc = predictTc(strain);
            const active = selectedCandidates.has(c.name);
            return (
              <button key={c.name} onClick={() => toggleCandidate(c.name)} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "4px 8px", fontSize: 11, fontFamily: "var(--font-mono)",
                border: active ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(255,255,255,0.04)",
                borderRadius: 0, background: active ? "rgba(212,168,67,0.06)" : "transparent",
                color: active ? "var(--color-text)" : "var(--color-text-muted)", cursor: "pointer",
              }}>
                <span>{c.name}</span>
                <span style={{ fontSize: 10, color: active ? "var(--color-accent)" : "rgba(255,255,255,0.5)" }}>
                  {tc.toFixed(0)}K
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results table */}
      {allPoints.length > 0 && (
        <>
          <Rule label="ranked predictions" />
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["Substrate", "a (Å)", "Strain", "Predicted Tc", "Type", "Confidence"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontWeight: 500, color: "var(--color-text-muted)", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPoints.map((p, i) => (
                  <tr key={i} style={{ background: p.type === "custom" ? "rgba(212,168,67,0.04)" : "transparent" }}>
                    <td style={{ fontWeight: p.type !== "published" ? 600 : 400, borderLeft: p.type === "custom" ? "2px solid var(--color-accent)" : undefined }}>{p.substrate}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{p.a.toFixed(3)}</td>
                    <td style={{ color: getStrainColor(p.strain), fontWeight: 600, fontFamily: "var(--font-mono)" }}>{p.strain > 0 ? "+" : ""}{p.strain.toFixed(2)}%</td>
                    <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: p.predictedTc >= 77 ? "#1D9E75" : "var(--color-text)" }}>
                      {p.predictedTc.toFixed(0)}K{p.predictedTc >= 77 ? " ✦" : ""}
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: p.type === "published" ? "#1D9E75" : p.type === "custom" ? "var(--color-accent)" : "#5B9BD5" }}>{p.type}</span>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{p.confidence || "Measured"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Methodology */}
      <div style={{ marginTop: 24 }}>
        <button onClick={() => setShowMethod(!showMethod)} style={{
          background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer",
          fontSize: 10, fontFamily: "var(--font-mono)", padding: 0, letterSpacing: "0.04em",
        }}>
          {showMethod ? "hide" : "show"} methodology
        </button>
        {showMethod && (
          <div style={{ marginTop: 12, padding: 16, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)", fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
            <p style={{ margin: "0 0 8px" }}><strong>Model:</strong> Linear regression fit to published La₃Ni₂O₇ thin film data points (onset Tc vs. epitaxial strain). Tc ≈ 22 - 20×(strain%). La₃Ni₂O₇ bulk a-axis = 3.833 Å (pseudo-tetragonal, ambient pressure).</p>
            <p style={{ margin: "0 0 8px" }}><strong>Data sources:</strong> Ko et al. Nature 2025, Zhou et al. NSR 2025/2026, strain-tuning study (Comm. Physics 2025). Total: 6 published data points across 4 substrates.</p>
            <p style={{ margin: "0 0 8px" }}><strong>What this is NOT:</strong> Not a first-principles simulation. It fits an empirical trend line to published experimental data and uses it to screen substrates by lattice mismatch.</p>
            <p style={{ margin: "0 0 8px" }}><strong>Key limitations:</strong> (1) Linear model — the real Tc-strain relationship may be nonlinear at extreme strains. (2) Only accounts for in-plane strain. (3) Ignores film quality factors. (4) Substrate chemistry matters beyond lattice constant.</p>
            <p style={{ margin: 0 }}><strong>How to use:</strong> Treat predictions as "worth investigating" signals. Substrates predicting Tc above 77K are flagged with ✦.</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16, marginLeft: 4, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 4 }}>key finding</div>
        Substrates with a-axis below ~3.72 Å predict onset Tc at or above the liquid nitrogen threshold (77K). EuAlO₃ (3.720 Å), SmAlO₃ (3.734 Å), and YAlO₃ (3.680 Å) are the strongest candidates — but extreme mismatch may prevent coherent film growth.
      </div>
    </div>
  );
}
