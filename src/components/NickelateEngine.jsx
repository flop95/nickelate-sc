import React, { useState, useMemo } from "react";
import { engineDataset as dataset, patterns, predictions as rawPredictions, arxivAlerts } from "../data/index.js";
import { findContradictions } from "../utils/findContradictions.js";

const Sep = () => <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 12px" }}>·</span>;

const Rule = ({ label, collapsible, expanded, onToggle }) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 24px", cursor: collapsible ? "pointer" : undefined }}
    onClick={collapsible ? onToggle : undefined}
  >
    {label && (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {collapsible && <span style={{ marginRight: 6 }}>{expanded ? "▾" : "▸"}</span>}
        {label}
      </span>
    )}
    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
  </div>
);

export default function NickelateEngine() {
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("onsetTc");
  const [filterMaterial, setFilterMaterial] = useState("all");
  const [sweepVar, setSweepVar] = useState("strain");
  const [ambientOnly, setAmbientOnly] = useState(true);
  const [chartXAxis, setChartXAxis] = useState("strain");
  const [collapsed, setCollapsed] = useState({
    patterns: true, contradictions: true, untested: true, sensitivity: true,
  });
  const isOpen = (key) => !collapsed[key];
  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const materials = [...new Set(dataset.map(d => d.material))];

  const filtered = useMemo(() => {
    let d = [...dataset];
    if (filterMaterial !== "all") d = d.filter(r => r.material === filterMaterial);
    d.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return d;
  }, [filterMaterial, sortBy]);

  const stats = useMemo(() => {
    const tcs = dataset.map(d => d.onsetTc).filter(t => t > 0);
    const maxTc = Math.max(...tcs);
    const maxEntry = dataset.find(d => d.onsetTc === maxTc);
    const zeroRs = dataset.map(d => d.zeroRTc).filter(t => t != null && t > 0);
    const maxZeroR = zeroRs.length ? Math.max(...zeroRs) : 0;
    const groups = [...new Set(dataset.map(d => d.group))];
    const substrates = [...new Set(dataset.map(d => d.substrate))];
    return { maxTc, maxEntry, maxZeroR, total: dataset.length, groups: groups.length, substrates: substrates.length, materials: materials.length };
  }, []);

  // Data sourced from JSON — patterns and predictions mapped to component shape
  const findings = patterns;
  const predictions = rawPredictions.map(p => ({
    id: p.id, conf: p.priority, text: p.description,
    difficulty: p.difficulty, claimed_by: p.claimed_by || [],
  }));

  // Contradiction detection
  const contradictions = useMemo(() => findContradictions(dataset), []);

  // Chart dimensions — wide and short, Bloomberg-style
  const chartW = 720, chartH = 200, pL = 48, pR = 16, pT = 16, pB = 48;
  const xMin = -3, xMax = 3, yMax = 85;
  const sx = (v) => pL + ((v - xMin) / (xMax - xMin)) * (chartW - pL - pR);
  const sy = (v) => pT + ((yMax - v) / yMax) * (chartH - pT - pB);

  const nodeColors = { pattern: "#1D9E75", breakthrough: "#7F77DD", gap: "#d4a843" };
  const nodeSymbols = { pattern: "●", breakthrough: "◆", gap: "○" };

  return (
    <div>
      {/* Dominant number */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: "var(--color-accent)", fontFamily: "var(--font-mono)", lineHeight: 1, letterSpacing: "-0.03em" }}>{stats.maxTc}K</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 32, lineHeight: 1.8 }}>
        record onset Tc
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{stats.maxZeroR}K</span> zero-R
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{stats.total}</span> data points
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{stats.groups}</span> groups
        <Sep /><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>{stats.substrates}</span> substrates
      </div>

      {/* arXiv alerts */}
      {arxivAlerts.alerts && arxivAlerts.alerts.length > 0 && (() => {
        const meaningful = arxivAlerts.alerts.filter(a => a.diff_type !== "INFO");
        if (meaningful.length === 0) return null;
        const diffColors = { RECORD: "#d4a843", NEW: "#1D9E75", UPDATE: "#d4a843", CONFIRMS: "rgba(255,255,255,0.5)" };
        return (
          <div style={{ marginBottom: 24 }}>
            <Rule label="arxiv alerts" collapsible expanded={isOpen("arxiv")} onToggle={() => toggle("arxiv")} />
            {isOpen("arxiv") && <>
              {meaningful.slice(0, 5).map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: a.diff_type === "RECORD" ? 600 : 500,
                    color: diffColors[a.diff_type] || "var(--color-text-muted)", whiteSpace: "nowrap",
                  }}>{a.diff_type.toLowerCase()}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{a.diff_detail}</span>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {a.arxiv_id}
                  </a>
                </div>
              ))}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                last updated: {arxivAlerts.generated || "never"} · run python scripts/arxiv_watcher.py to refresh
              </div>
            </>}
          </div>
        );
      })()}

      {/* Full-width scatter chart */}
      {(() => {
        const isCa = chartXAxis === "ca_ratio";
        const chartData = isCa
          ? filtered.filter(d => d.filmA && d.filmC).map(d => ({ ...d, _x: d.filmC / d.filmA }))
          : filtered.map(d => ({ ...d, _x: d.strain }));
        const caCount = dataset.filter(d => d.filmA && d.filmC).length;

        // Dynamic x-axis range based on mode
        const cXMin = isCa ? 5.1 : xMin;
        const cXMax = isCa ? 5.5 : xMax;
        const csx = (v) => pL + ((v - cXMin) / (cXMax - cXMin)) * (chartW - pL - pR);

        // X-axis ticks
        const xTicks = isCa
          ? [5.15, 5.2, 5.25, 5.3, 5.35, 5.4]
          : [-2, -1, 0, 1, 2];

        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
                {isCa ? "c/a ratio" : "strain"} vs onset_tc
                {isCa && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.5)" }}>{caCount} of {dataset.length} entries have c/a data</span>}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {["strain", "ca_ratio"].map(mode => (
                  <button key={mode} onClick={() => setChartXAxis(mode)} style={{
                    background: "none", border: "none", padding: "2px 6px", cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: chartXAxis === mode ? "var(--color-text)" : "rgba(255,255,255,0.5)",
                    borderBottom: chartXAxis === mode ? "1px solid var(--color-text)" : "1px solid transparent",
                  }}>
                    {mode === "strain" ? "x: strain" : "x: c/a ratio"}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%" }}>
              {[0, 20, 40, 60, 80].map(t => (
                <g key={t}>
                  <line x1={pL} y1={sy(t)} x2={chartW - pR} y2={sy(t)} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
                  <text x={pL - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">{t}</text>
                </g>
              ))}
              {xTicks.map(s => (
                <g key={s}>
                  <line x1={csx(s)} y1={pT} x2={csx(s)} y2={chartH - pB} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
                  <text x={csx(s)} y={chartH - pB + 14} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">
                    {isCa ? s.toFixed(2) : s + "%"}
                  </text>
                </g>
              ))}
              {!isCa && <line x1={csx(0)} y1={pT} x2={csx(0)} y2={chartH - pB} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} strokeDasharray="3 3" />}
              <line x1={pL} y1={sy(77)} x2={chartW - pR} y2={sy(77)} stroke="#5B9BD5" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.4} />
              <text x={chartW - pR - 4} y={sy(77) - 4} textAnchor="end" fontSize={9} fill="#5B9BD5" opacity={0.5} fontFamily="'DM Mono', monospace">77K LN₂</text>
              {chartData.map((d, i) => {
                const colors = { "La₃Ni₂O₇": "#1D9E75", "(La,Pr)₃Ni₂O₇": "#d4a843", "La₂PrNi₂O₇": "#D85A30", "La₃₋ₓSrₓNi₂O₇": "#7F77DD", "Nickelate superstructures": "#5B9BD5" };
                const c = colors[d.material] || "#888";
                return (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                    <circle cx={csx(d._x)} cy={sy(d.onsetTc)} r={d.onsetTc === stats.maxTc ? 5 : 3.5} fill={c} stroke="none" opacity={0.85} />
                  </g>
                );
              })}
              {[["La₃Ni₂O₇", "#1D9E75"], ["(La,Pr)₃Ni₂O₇", "#d4a843"], ["La₂PrNi₂O₇", "#D85A30"], ["Sr-doped", "#7F77DD"], ["Superstruct.", "#5B9BD5"]].map(([label, col], i) => (
                <g key={label}>
                  <circle cx={pL + 6 + i * 140} cy={chartH - 10} r={2.5} fill={col} />
                  <text x={pL + 14 + i * 140} y={chartH - 6} fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="'DM Mono', monospace">{label}</text>
                </g>
              ))}
            </svg>
          </div>
        );
      })()}

      <Rule />

      {/* Filters — inline, compact */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <select value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
          <option value="all">all materials</option>
          {materials.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="onsetTc">sort: onset Tc</option>
          <option value="zeroRTc">sort: zero-R Tc</option>
          <option value="strain">sort: strain</option>
          <option value="year">sort: year</option>
        </select>
      </div>

      {/* Data table — full width, no wrapper */}
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {["Material", "Substrate", "Strain", "Onset Tc", "Zero-R Tc", "Growth", "Group", "Year"].map(h => (
                <th key={h} style={{ textAlign: "left", fontWeight: 500, color: "var(--color-text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <React.Fragment key={d.id}>
                <tr onClick={() => setExpandedId(expandedId === d.id ? null : d.id)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 500, maxWidth: 140, borderLeft: expandedId === d.id ? "2px solid var(--color-accent)" : undefined }}>{d.material}</td>
                  <td style={{ fontSize: 11 }}>{d.substrate}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: d.strain < 0 ? "#1D9E75" : d.strain > 0 ? "#E24B4A" : "var(--color-text)" }}>{d.strain > 0 ? "+" : ""}{d.strain.toFixed(2)}%</td>
                  <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: d.onsetTc >= 60 ? "var(--color-accent)" : "var(--color-text)" }}>{d.onsetTc}K</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{d.zeroRTc != null ? `${d.zeroRTc}K` : "—"}</td>
                  <td style={{ fontSize: 11 }}>{d.growth || "—"}</td>
                  <td style={{ fontSize: 11, maxWidth: 120 }}>{d.group}</td>
                  <td style={{ fontSize: 11 }}>{d.year}</td>
                </tr>
                {expandedId === d.id && (
                  <tr key={`${d.id}-exp`}>
                    <td colSpan={8} style={{ padding: 12, background: "var(--color-surface)", fontSize: 12, lineHeight: 1.8 }}>
                      {/* Synthesis recipe card */}
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "2px 16px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        <span style={{ color: "var(--color-text-muted)" }}>journal</span>
                        <span>{d.journal}</span>
                        {d.arxiv && <><span style={{ color: "var(--color-text-muted)" }}>arxiv</span><span><a href={`https://arxiv.org/abs/${d.arxiv}`} target="_blank" rel="noopener noreferrer">{d.arxiv}</a></span></>}
                        <span style={{ color: "var(--color-text-muted)" }}>growth_method</span>
                        <span>{d.growth || "—"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>doping</span>
                        <span>{d.doping || "—"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>growth_temp</span>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>
                        <span style={{ color: "var(--color-text-muted)" }}>deposition_rate</span>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>
                        <span style={{ color: "var(--color-text-muted)" }}>o2_pressure</span>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>
                        <span style={{ color: "var(--color-text-muted)" }}>anneal</span>
                        <span>{d.oxygenTreat || <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>post_growth</span>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>
                        {d.filmA && <><span style={{ color: "var(--color-text-muted)" }}>film_a</span><span>{d.filmA}Å</span></>}
                        {d.filmC && <><span style={{ color: "var(--color-text-muted)" }}>film_c</span><span>{d.filmC}Å</span></>}
                        {d.thickness && <><span style={{ color: "var(--color-text-muted)" }}>thickness</span><span>{d.thickness}</span></>}
                      </div>
                      {d.notes && (
                        <div style={{ marginTop: 8, padding: "8px 12px", borderLeft: "2px solid var(--color-accent)", background: "var(--color-bg)", fontSize: 12 }}>{d.notes}</div>
                      )}
                      <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                        Know these parameters?{" "}
                        <a
                          href={`https://github.com/flop95/nickelate-sc/issues/new?template=recipe-detail.yml&title=${encodeURIComponent(`Recipe: ${d.material} on ${d.substrate} (id:${d.id})`)}&entry=${encodeURIComponent(`${d.material} on ${d.substrate} (id:${d.id})`)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: "rgba(255,255,255,0.6)" }}
                        >Submit via GitHub.</a>
                        {" "}Submissions require source verification.
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pipeline findings — Rule 12 visual language */}
      <Rule label="patterns + gaps" collapsible expanded={isOpen("patterns")} onToggle={() => toggle("patterns")} />

      {isOpen("patterns") && (
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16, marginLeft: 4 }}>
          {findings.map((f, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: i < findings.length - 1 ? 12 : 0 }}>
              <span style={{
                position: "absolute", left: -20, top: 3, fontSize: 8,
                color: nodeColors[f.type],
              }}>
                {nodeSymbols[f.type]}
              </span>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: nodeColors[f.type], marginRight: 8 }}>
                  {f.type}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{f.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contradictions */}
      <Rule label="contradictions" collapsible expanded={isOpen("contradictions")} onToggle={() => toggle("contradictions")} />

      {isOpen("contradictions") && (
        contradictions.length > 0 ? (
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16, marginLeft: 4 }}>
            {contradictions.map((c, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: i < contradictions.length - 1 ? 12 : 0 }}>
                <span style={{ position: "absolute", left: -20, top: 3, fontSize: 8, color: "#E24B4A" }}>⚬</span>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: "#E24B4A", marginRight: 8 }}>contradiction</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)" }}>
                    {c.material} on {c.substrate || "bulk"} ({c.strain != null ? c.strain.toFixed(1) + "%" : "n/a"})
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {c.entries.map((e, j) => (
                    <span key={j}>
                      <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{e.onsetTc}K</span>
                      <span style={{ color: "var(--color-text-muted)", marginLeft: 4 }}>id:{e.id}</span>
                      {e.growth && <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>{e.growth.split(" ")[0]}</span>}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", marginRight: 6 }}>Δ{c.tc_diff.toFixed(0)}K</span>
                  {c.hypothesis}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            No unexplained contradictions detected.
          </div>
        )
      )}

      <Rule label="untested combinations" collapsible expanded={isOpen("untested")} onToggle={() => toggle("untested")} />

      {isOpen("untested") && <div style={{ overflowX: "auto" }}>
        <table style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: 10, color: "var(--color-text-muted)" }}>Substrate →</th>
              {["SLAO\n3.756Å", "LAO\n3.790Å", "NGO\n3.863Å", "STO\n3.905Å", "SmAlO₃\n3.734Å", "NdAlO₃\n3.760Å"].map(s => (
                <th key={s} style={{ textAlign: "center", fontSize: 10, color: "var(--color-text-muted)", whiteSpace: "pre-line" }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["La₃Ni₂O₇ undoped", "✓42K", "✓30K*", "✓10K*", "✗0K*", "—", "—"],
              ["(La,Pr)₃Ni₂O₇", "✓63K", "—", "—", "—", "—", "—"],
              ["La₂PrNi₂O₇", "✓45K", "—", "—", "—", "—", "—"],
              ["Sr-doped (optimal)", "✓42K", "—", "—", "—", "—", "—"],
              ["GAE growth", "✓63K", "—", "—", "—", "—", "—"],
              ["E-field gated", "—", "—", "—", "—", "—", "—"],
              ["Superstructure 1212", "✓46K", "—", "—", "—", "—", "—"],
            ].map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{
                    textAlign: j === 0 ? "left" : "center", fontWeight: j === 0 ? 500 : 400,
                    fontSize: j === 0 ? 12 : 11, fontFamily: j > 0 ? "var(--font-mono)" : "inherit",
                    background: cell === "—" ? "rgba(255,255,255,0.008)" : cell.startsWith("✓") ? "rgba(29,158,117,0.06)" : cell.startsWith("✗") ? "rgba(226,75,74,0.06)" : "transparent",
                    color: cell === "—" ? "rgba(255,255,255,0.35)" : cell.startsWith("✓") ? "#1D9E75" : cell.startsWith("✗") ? "#E24B4A" : "var(--color-text)",
                  }}>{cell === "—" ? "—" : cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)", marginTop: 8 }}>✓ tested (Tc shown) | ✗ tested, no SC | — untested | * under 20 GPa</div>
      </div>}

      {/* Pipeline predictions */}
      <Rule label="ranked predictions" collapsible expanded={isOpen("predictions")} onToggle={() => toggle("predictions")} />

      {isOpen("predictions") && <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16, marginLeft: 4 }}>
        {predictions.map((p, i) => (
          <div key={i} style={{ position: "relative", paddingBottom: i < predictions.length - 1 ? 16 : 0 }}>
            <span style={{ position: "absolute", left: -20, top: 4, fontSize: 9, color: "var(--color-accent)" }}>▸</span>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-accent)", marginRight: 8 }}>{p.id}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)" }}>{p.conf}</span>
              <a
                href={`https://github.com/flop95/nickelate-sc/issues/new?template=claim-prediction.yml&title=${encodeURIComponent(`[Claim] ${p.id}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.6)", marginLeft: 12 }}
              >claim →</a>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{p.text}</div>
            {p.difficulty && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                {p.difficulty.equipment}{" · "}{p.difficulty.substrate} substrate{" · "}{p.difficulty.growth} ({p.difficulty.growth_complexity}){" · "}{p.difficulty.cost_tier}
              </div>
            )}
            {p.claimed_by.length > 0 && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {p.claimed_by.length} group{p.claimed_by.length > 1 ? "s" : ""} attempting
              </div>
            )}
          </div>
        ))}
      </div>}

      {/* Sensitivity explorer — Phase 1b */}
      <Rule label="sensitivity" collapsible expanded={isOpen("sensitivity")} onToggle={() => toggle("sensitivity")} />

      {isOpen("sensitivity") && <><div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <select value={sweepVar} onChange={e => setSweepVar(e.target.value)}>
          <option value="strain">sweep: strain (%)</option>
          <option value="subA">sweep: substrate a-axis (Å)</option>
          <option value="growth">sweep: growth method</option>
        </select>
        <button
          onClick={() => setAmbientOnly(!ambientOnly)}
          style={{
            background: "none", border: ambientOnly ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(255,255,255,0.04)",
            padding: "4px 8px", fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer",
            color: ambientOnly ? "var(--color-accent)" : "var(--color-text-muted)",
          }}
        >
          {ambientOnly ? "ambient only" : "all pressures"}
        </button>
      </div>

      {(() => {
        // Filter dataset for sensitivity analysis
        const sensData = dataset.filter(d => {
          if (ambientOnly && d.pressureClass !== "Ambient") return false;
          if (d.onsetTc == null) return false;
          return true;
        });

        if (sweepVar === "growth") {
          // Categorical: group by growth method, show avg Tc
          const groups = {};
          sensData.forEach(d => {
            const g = d.growth ? d.growth.split(" ")[0] : "unknown";
            if (!groups[g]) groups[g] = [];
            groups[g].push(d.onsetTc);
          });
          const sorted = Object.entries(groups)
            .map(([method, tcs]) => ({ method, avg: tcs.reduce((a, b) => a + b, 0) / tcs.length, n: tcs.length, max: Math.max(...tcs) }))
            .sort((a, b) => b.avg - a.avg);

          return (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                avg onset_tc by growth method // {sensData.length} entries
              </div>
              {sorted.map(g => (
                <div key={g.method} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", width: 80 }}>{g.method}</span>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.03)", position: "relative" }}>
                    <div style={{ height: 4, width: `${(g.avg / 70) * 100}%`, background: g.avg > 50 ? "var(--color-accent)" : "#1D9E75" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text)", fontWeight: 600, width: 48, textAlign: "right" }}>{g.avg.toFixed(0)}K</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>n={g.n}</span>
                </div>
              ))}
            </div>
          );
        }

        // Continuous: scatter + regression
        const points = sensData
          .filter(d => d[sweepVar] != null && d.onsetTc > 0)
          .map(d => ({ x: d[sweepVar], y: d.onsetTc, id: d.id, material: d.material }));

        if (points.length < 2) {
          return <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Not enough data points for regression ({points.length} valid).</div>;
        }

        // Least-squares linear regression
        const n = points.length;
        const sumX = points.reduce((a, p) => a + p.x, 0);
        const sumY = points.reduce((a, p) => a + p.y, 0);
        const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
        const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const r2 = (() => {
          const meanY = sumY / n;
          const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
          const ssRes = points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);
          return ssTot > 0 ? 1 - ssRes / ssTot : 0;
        })();

        const xMin = Math.min(...points.map(p => p.x));
        const xMax = Math.max(...points.map(p => p.x));
        const yMax = Math.max(...points.map(p => p.y), 80);
        const xPad = (xMax - xMin) * 0.1 || 0.5;
        const sW = 720, sH = 160, sL = 48, sR = 16, sT = 12, sB = 32;
        const scX = (v) => sL + ((v - (xMin - xPad)) / ((xMax + xPad) - (xMin - xPad))) * (sW - sL - sR);
        const scY = (v) => sT + ((yMax - v) / yMax) * (sH - sT - sB);

        const varLabel = sweepVar === "strain" ? "strain" : "substrate_a";
        const unit = sweepVar === "strain" ? "% strain" : "Å";
        const slopeLabel = `${slope >= 0 ? "+" : ""}${slope.toFixed(1)}K per 1${unit}`;

        return (
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
              onset_tc vs {varLabel} // {points.length} entries, r²={r2.toFixed(2)}, slope={slopeLabel}
            </div>
            <svg viewBox={`0 0 ${sW} ${sH}`} style={{ width: "100%" }}>
              {/* Regression line */}
              <line
                x1={scX(xMin - xPad)} y1={scY(slope * (xMin - xPad) + intercept)}
                x2={scX(xMax + xPad)} y2={scY(slope * (xMax + xPad) + intercept)}
                stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="6 4" opacity={0.4}
              />
              {/* Points */}
              {points.map((p, i) => (
                <circle key={i} cx={scX(p.x)} cy={scY(p.y)} r={3} fill="#1D9E75" opacity={0.8} />
              ))}
              {/* X axis labels */}
              {(() => {
                const ticks = [];
                const step = sweepVar === "strain" ? 1 : 0.05;
                for (let v = Math.ceil((xMin - xPad) / step) * step; v <= xMax + xPad; v += step) {
                  ticks.push(v);
                }
                return ticks.slice(0, 8).map(v => (
                  <text key={v} x={scX(v)} y={sH - 4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace">
                    {sweepVar === "strain" ? v.toFixed(0) + "%" : v.toFixed(2)}
                  </text>
                ));
              })()}
            </svg>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
              ΔTc = <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{slopeLabel}</span>
              <span style={{ marginLeft: 12, color: "rgba(255,255,255,0.5)" }}>r² = {r2.toFixed(2)}</span>
            </div>
          </div>
        );
      })()}</>}

      <div style={{ marginTop: 32, fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
        Data from published papers and preprints through April 2026. Click any row to expand. Empirical screening tool, not a simulation.
        <br />
        <a
          href="https://github.com/flop95/nickelate-sc/issues/new?template=new-measurement.yml"
          target="_blank" rel="noopener noreferrer"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >Contribute data → GitHub</a>
        <span style={{ marginLeft: 12 }}>All submissions are validated and reviewed before inclusion. Source verification required.</span>
      </div>

      {/* About / Methodology */}
      <Rule label="about this tool" />

      <div style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", maxWidth: 800 }}>
        <p style={{ margin: "0 0 8px" }}>
          nickelate-sc is an empirical screening tool for nickelate superconductor research.
          All data is from published papers and preprints through April 2026.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Predictions are extrapolations from observed trends, not simulations.
          They assume continuation of measured patterns (c/a vs Tc correlation,
          pressure sensitivity ~3K/GPa) and have not been independently validated.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Contradictions are auto-detected when the same material + substrate +
          strain combination yields onset Tc values differing by more than 5K.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          arXiv alerts refresh weekly via automated scan. Extraction is regex-based
          and may miss or misparse values — verify against the source paper.
        </p>
        <p style={{ margin: 0 }}>
          <a
            href="https://github.com/flop95/nickelate-sc/issues"
            target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >Contribute data or corrections → GitHub</a>
        </p>
      </div>
    </div>
  );
}
