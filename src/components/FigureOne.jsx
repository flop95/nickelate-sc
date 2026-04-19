import { useState, useMemo, useRef } from 'react';
import { scaleLog, scaleLinear } from 'd3-scale';

// ============================================================
// Design tokens (locked from docs/populated-entry.html)
// ============================================================
const INK = '#1A1814';
const INK_EMPH = '#0A0907';
const INK_25 = 'rgba(26, 24, 20, 0.25)';

const F_BODY = "'STIX Two Text', 'New Century Schoolbook', 'Century Schoolbook', Georgia, serif";
const F_CM = "'Latin Modern Roman', 'CMU Serif', 'Computer Modern', 'STIX Two Text', Cambria, serif";

// ============================================================
// Defaults
// ============================================================
const DEFAULT_REFERENCE_RULES = [
  { Tc: 77,  label: 'T = 77 K  (liquid N₂)' },
  { Tc: 138, label: 'T = 138 K  (cuprate ambient max)' },
  { Tc: 203, label: 'T = 203 K  (H₃S, 2015)' },
  { Tc: 300, label: 'T = 300 K  (room temperature)' },
];

const DEFAULT_TARGET_ZONE = { Plog_max: -2, Tmin: 138 };

const FAMILY_SHAPE = {
  nickelate: 'circle',
  cuprate: 'square',
  hydride: 'diamond',
  pnictide: 'triUp',
  conv: 'triDown',
  wildcard: 'pentagon',
};

// ============================================================
// Shape geometry — same convention as the Claude Design bundle
// ============================================================
function shapePath(shape, r) {
  switch (shape) {
    case 'square': { const s = r * 1.65; return `M${-s/2} ${-s/2} h${s} v${s} h${-s} Z`; }
    case 'diamond': { const d = r * 1.15; return `M0 ${-d} L${d} 0 L0 ${d} L${-d} 0 Z`; }
    case 'triUp': { const a = r * 1.15; const h = a * 1.732 / 2; return `M0 ${-h} L${a} ${h * 0.9} L${-a} ${h * 0.9} Z`; }
    case 'triDown': { const a = r * 1.15; const h = a * 1.732 / 2; return `M0 ${h} L${a} ${-h * 0.9} L${-a} ${-h * 0.9} Z`; }
    case 'pentagon': {
      const d = r * 1.05;
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 5);
        pts.push(`${(Math.cos(ang) * d).toFixed(2)} ${(Math.sin(ang) * d).toFixed(2)}`);
      }
      return 'M' + pts.join(' L') + ' Z';
    }
    default: return null;
  }
}

// Confidence → size. 2 pt at conf 0, 5 pt at conf 1, default 3.5 pt.
function markRadius(confidence) {
  if (confidence == null) return 3.5;
  const c = Math.max(0, Math.min(1, confidence));
  return 2 + c * 3;
}

// Deterministic string hash (djb2-ish). Stable across renders so ambient-column
// jitter doesn't reshuffle between mounts.
function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return h;
}

// Ambient-column jitter: offset in [-8, +8] px based on id hash. Applied only
// to marks with P < 0.005 GPa so the left-edge pile separates without moving
// any pressurized data.
function ambientJitter(id) {
  const h = hashId(id);
  return (((h % 17) + 17) % 17) - 8;
}

// Format pressure for the crosshair readout.
function formatP(P) {
  if (P < 0.001) return P.toExponential(1);
  if (P < 1) return P.toFixed(3);
  if (P < 10) return P.toFixed(2);
  return P.toFixed(1);
}

// ============================================================
// Mark — a single plotted material
// ============================================================
function Mark({ material, x, y, r, isSelected, isHovered, onSelect, onHover, onUnhover }) {
  const shape = FAMILY_SHAPE[material.family] || 'circle';
  const measured = material.measured !== false;
  const fill = measured ? INK_EMPH : 'none';
  const stroke = INK_EMPH;

  const rDraw = isHovered ? r * 1.15 : r;

  const handleClick = () => onSelect && onSelect(material.id);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <g
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${material.formula}, Tc ${material.Tc} K at ${formatP(material.P)} GPa`}
      style={{ cursor: 'pointer', outline: 'none' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover && onHover(material.id)}
      onMouseLeave={() => onUnhover && onUnhover()}
    >
      {/* selection highlight — hairline square around the mark */}
      {isSelected && (
        <rect
          x={-r * 3} y={-r * 3}
          width={r * 6} height={r * 6}
          fill="none" stroke={INK_EMPH} strokeWidth={0.5}
        />
      )}
      {/* anchor ring */}
      {material.isAnchor && (
        <circle r={r * 1.85} fill="none" stroke={INK_EMPH} strokeWidth={0.65} />
      )}
      {/* main shape */}
      {shape === 'circle'
        ? <circle r={rDraw * 0.9} fill={fill} stroke={stroke} strokeWidth={1} />
        : <path d={shapePath(shape, rDraw)} fill={fill} stroke={stroke} strokeWidth={1} />
      }
      {/* failure slash */}
      {material.isFailure && (
        <line
          x1={-r * 1.3} y1={r * 1.3}
          x2={r * 1.3} y2={-r * 1.3}
          stroke={INK_EMPH} strokeWidth={0.7}
        />
      )}
      {/* proposal round superscript */}
      {material.proposalRound && (
        <text
          x={r + 2} y={-r - 1}
          fontSize={8}
          fontFamily={F_CM}
          fontStyle="italic"
          fill={INK_EMPH}
        >
          {material.proposalRound}
        </text>
      )}
    </g>
  );
}

// ============================================================
// FigureOne — the pressure–temperature landscape chart
// ============================================================
export default function FigureOne({
  materials = [],
  referenceRules = DEFAULT_REFERENCE_RULES,
  targetZone = DEFAULT_TARGET_ZONE,
  labeledIds = [],
  width = 900,
  selectedMaterialId = null,
  onSelectMaterial,
}) {
  const W = Math.max(600, width);
  const H = Math.max(440, W * 0.62);
  const pad = { top: 32, right: 160, bottom: 56, left: 72 };

  const [hoverId, setHoverId] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const svgRef = useRef(null);

  // Scales.
  // x-domain [1e-4, 1e2] — 6 decades. Ambient pressure (1 atm ≈ 1e-4 GPa) sits
  // in its own leftmost column, visually separated from near-ambient work at 1e-3.
  const xScale = useMemo(
    () => scaleLog().domain([1e-4, 1e2]).range([pad.left, W - pad.right]).clamp(true),
    [W]
  );
  const yScale = useMemo(
    () => scaleLinear().domain([0, 300]).range([H - pad.bottom, pad.top]),
    [H]
  );

  const xTickValues = [1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100];
  const xTickLabel = { 0.0001: '10⁻⁴', 0.001: '10⁻³', 0.01: '10⁻²', 0.1: '10⁻¹', 1: '10⁰', 10: '10¹', 100: '10²' };
  const yTickValues = [0, 50, 100, 150, 200, 250, 300];

  const positioned = useMemo(
    () => materials
      .filter(m => m && m.P != null && m.Tc != null)
      .map(m => {
        const baseX = xScale(m.P);
        const jx = m.P < 0.005 ? ambientJitter(m.id) : 0;
        return { ...m, _x: baseX + jx, _y: yScale(m.Tc), _r: markRadius(m.confidence) };
      }),
    [materials, xScale, yScale]
  );

  const labeledSet = useMemo(() => new Set(labeledIds), [labeledIds]);

  // Label placement — upper-right preferred, fall back through right, lower-right,
  // upper-left, left, lower-left. Reject candidates that leave the plot area or
  // collide with earlier labels. Approximate char width for bounding-box math;
  // the font has variable glyph widths so this is a heuristic, not exact.
  const labels = useMemo(() => {
    const featured = positioned.filter(m => labeledSet.has(m.id));
    const placed = [];
    const lineH = 12;
    const charW = 5.4;

    for (const m of featured) {
      const text = m.labelOverride || m.formula;
      const w = text.length * charW + 4;
      const h = lineH;
      const off = m._r * 1.6 + 3;
      const vOffUp = m._r + 4;        // baseline sits above mark
      const vOffDn = m._r + h - 1;    // baseline sits below mark

      const allCandidates = [
        { dx:  off, dy: -vOffUp, anchor: 'start', bl:  0, bt: -h + 2 },   // upper-right (preferred)
        { dx:  off, dy:  3,      anchor: 'start', bl:  0, bt: -h + 4 },   // right
        { dx:  off, dy:  vOffDn, anchor: 'start', bl:  0, bt: -h + 4 },   // lower-right
        { dx: -off, dy: -vOffUp, anchor: 'end',   bl: -w, bt: -h + 2 },   // upper-left
        { dx: -off, dy:  3,      anchor: 'end',   bl: -w, bt: -h + 4 },   // left
        { dx: -off, dy:  vOffDn, anchor: 'end',   bl: -w, bt: -h + 4 },   // lower-left
      ];
      // Proposal-round superscript occupies upper-right. Defer that candidate
      // to the end so the label prefers any other quadrant first.
      const candidates = m.proposalRound
        ? [allCandidates[1], allCandidates[2], allCandidates[3], allCandidates[4], allCandidates[5], allCandidates[0]]
        : allCandidates;

      let chosen = null;
      for (const c of candidates) {
        const bx1 = m._x + c.dx + c.bl;
        const by1 = m._y + c.dy + c.bt;
        const bx2 = bx1 + w;
        const by2 = by1 + h;

        if (bx1 < pad.left - 2 || bx2 > W - pad.right + 2) continue;
        if (by1 < pad.top - 2 || by2 > H - pad.bottom + 2) continue;

        const clash = placed.some(p =>
          !(bx2 < p.box.x1 - 1 || bx1 > p.box.x2 + 1 || by2 < p.box.y1 - 1 || by1 > p.box.y2 + 1)
        );
        if (clash) continue;

        chosen = { c, bx1, by1, bx2, by2 };
        break;
      }

      if (!chosen) {
        const c = candidates[0];
        const bx1 = m._x + c.dx + c.bl;
        const by1 = m._y + c.dy + c.bt;
        chosen = { c, bx1, by1, bx2: bx1 + w, by2: by1 + h };
      }

      placed.push({
        id: m.id,
        text,
        x: m._x + chosen.c.dx,
        y: m._y + chosen.c.dy,
        anchor: chosen.c.anchor,
        box: { x1: chosen.bx1, y1: chosen.by1, x2: chosen.bx2, y2: chosen.by2 },
      });
    }

    return placed;
  }, [positioned, labeledSet, W, H]);

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    if (local.x < pad.left || local.x > W - pad.right || local.y < pad.top || local.y > H - pad.bottom) {
      setCursorPos(null);
      return;
    }
    setCursorPos({
      svgX: local.x,
      svgY: local.y,
      P: xScale.invert(local.x),
      Tc: yScale.invert(local.y),
    });
  };

  const handleMouseLeave = () => { setCursorPos(null); setHoverId(null); };

  const tzX1 = xScale(1e-4);
  const tzX2 = xScale(Math.pow(10, targetZone.Plog_max));
  const tzY1 = yScale(300);
  const tzY2 = yScale(targetZone.Tmin);

  return (
    <figure style={{ margin: 0 }}>
      <svg
        ref={svgRef}
        role="img"
        aria-labelledby="fig1-title fig1-desc"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', fontFamily: F_BODY, maxWidth: W, background: 'transparent' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <title id="fig1-title">Pressure–temperature landscape of superconductivity</title>
        <desc id="fig1-desc">
          Materials plotted on a logarithmic pressure axis (10⁻⁴ to 10² GPa) against critical temperature (0 to 300 K). Shape encodes family; fill encodes measurement status.
        </desc>

        {/* target zone — dashed hairline rectangle, upper-left */}
        {targetZone && (
          <g>
            <rect
              x={tzX1} y={tzY1}
              width={tzX2 - tzX1} height={tzY2 - tzY1}
              fill="none"
              stroke={INK_EMPH}
              strokeWidth={0.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={tzX1 + 8} y={tzY1 + 14}
              fontSize={10}
              fontFamily={F_BODY}
              fill={INK_EMPH}
              style={{ letterSpacing: '0.08em', fontVariantCaps: 'all-small-caps', textTransform: 'uppercase' }}
            >
              TARGET ZONE
            </text>
            <text
              x={tzX1 + 8} y={tzY1 + 28}
              fontSize={9}
              fontFamily={F_CM}
              fontStyle="italic"
              fill={INK_EMPH}
              opacity={0.7}
            >
              <tspan fontStyle="italic">P</tspan> {'< 10⁻² GPa, '}
              <tspan fontStyle="italic">T</tspan>
              <tspan fontSize="0.72em" dy="2" fontStyle="italic">c</tspan>
              {' > 138 K'}
            </text>
          </g>
        )}

        {/* reference rules — dashed hairline + right-margin label */}
        {referenceRules.map((rule, i) => {
          const y = yScale(rule.Tc);
          if (y < pad.top - 0.5 || y > H - pad.bottom + 0.5) return null;
          const atTopBorder = y <= pad.top + 0.5;
          return (
            <g key={i}>
              {!atTopBorder && (
                <line
                  x1={pad.left} x2={W - pad.right}
                  y1={y} y2={y}
                  stroke={INK}
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
              <text
                x={W - pad.right + 6}
                y={y + (atTopBorder ? 10 : 3)}
                fontSize={8}
                fontFamily={F_CM}
                fontStyle="italic"
                fill={INK}
                opacity={0.75}
              >
                {rule.label}
              </text>
            </g>
          );
        })}

        {/* axis rectangle — the hairline that bounds the plot area */}
        <rect
          x={pad.left} y={pad.top}
          width={W - pad.right - pad.left}
          height={H - pad.bottom - pad.top}
          fill="none"
          stroke={INK}
          strokeWidth={0.5}
        />

        {/* x-axis ticks + decade labels */}
        {xTickValues.map(v => {
          const x = xScale(v);
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={H - pad.bottom} y2={H - pad.bottom + 5} stroke={INK} strokeWidth={0.5} />
              <text
                x={x} y={H - pad.bottom + 18}
                fontSize={10}
                fontFamily={F_CM}
                fontStyle="italic"
                fill={INK}
                textAnchor="middle"
              >
                {xTickLabel[v]}
              </text>
            </g>
          );
        })}

        {/* y-axis ticks + labels */}
        {yTickValues.map(v => {
          const y = yScale(v);
          return (
            <g key={v}>
              <line x1={pad.left - 5} x2={pad.left} y1={y} y2={y} stroke={INK} strokeWidth={0.5} />
              <text
                x={pad.left - 8} y={y + 3}
                fontSize={10}
                fontFamily={F_CM}
                fontStyle="italic"
                fill={INK}
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* axis titles */}
        <text
          x={(pad.left + (W - pad.right)) / 2}
          y={H - pad.bottom + 42}
          fontSize={11}
          fontFamily={F_CM}
          fontStyle="italic"
          fill={INK}
          textAnchor="middle"
        >
          <tspan fontStyle="italic">P</tspan>
          {' / GPa  (log scale)'}
        </text>
        <text
          x={-((pad.top + (H - pad.bottom)) / 2)}
          y={pad.left - 44}
          fontSize={11}
          fontFamily={F_CM}
          fontStyle="italic"
          fill={INK}
          textAnchor="middle"
          transform="rotate(-90)"
        >
          <tspan fontStyle="italic">T</tspan>
          <tspan fontSize="0.72em" dy="2" fontStyle="italic">c</tspan>
          {' / K'}
        </text>

        {/* marks — non-anchors first, anchors last so rings sit on top */}
        {positioned.filter(m => !m.isAnchor).map(m => (
          <Mark
            key={m.id}
            material={m}
            x={m._x} y={m._y} r={m._r}
            isSelected={m.id === selectedMaterialId}
            isHovered={m.id === hoverId}
            onSelect={onSelectMaterial}
            onHover={setHoverId}
            onUnhover={() => setHoverId(null)}
          />
        ))}
        {positioned.filter(m => m.isAnchor).map(m => (
          <Mark
            key={m.id}
            material={m}
            x={m._x} y={m._y} r={m._r}
            isSelected={m.id === selectedMaterialId}
            isHovered={m.id === hoverId}
            onSelect={onSelectMaterial}
            onHover={setHoverId}
            onUnhover={() => setHoverId(null)}
          />
        ))}

        {/* adjacent labels for featured materials — upper-right preferred with collision resolution */}
        {labels.map(l => (
          <text
            key={`label-${l.id}`}
            x={l.x} y={l.y}
            fontSize={10}
            fontFamily={F_CM}
            fontStyle="italic"
            textAnchor={l.anchor}
            fill={INK_EMPH}
            pointerEvents="none"
          >
            {l.text}
          </text>
        ))}

        {/* crosshair + coordinate readout — when a mark is hovered, pin the values
            to its true data (ambient marks are visually jittered; the readout
            must reflect P = 1e-4, not the jittered x). Flip to left-of-cursor
            near the right margin so the text stays inside the plot. */}
        {cursorPos && (() => {
          const hovered = hoverId ? positioned.find(m => m.id === hoverId) : null;
          const P = hovered ? hovered.P : cursorPos.P;
          const Tc = hovered ? hovered.Tc : cursorPos.Tc;
          const READOUT_W = 140;
          const flip = cursorPos.svgX > W - pad.right - READOUT_W - 10;
          const textX = flip ? cursorPos.svgX - 10 : cursorPos.svgX + 10;
          return (
            <g pointerEvents="none">
              <line
                x1={cursorPos.svgX} x2={cursorPos.svgX}
                y1={pad.top} y2={H - pad.bottom}
                stroke={INK} strokeWidth={0.5}
                strokeDasharray="2 2"
                opacity={0.35}
              />
              <line
                x1={pad.left} x2={W - pad.right}
                y1={cursorPos.svgY} y2={cursorPos.svgY}
                stroke={INK} strokeWidth={0.5}
                strokeDasharray="2 2"
                opacity={0.35}
              />
              <text
                x={textX}
                y={cursorPos.svgY - 8}
                fontSize={10}
                fontFamily={F_CM}
                fill={INK_EMPH}
                textAnchor={flip ? 'end' : 'start'}
              >
                <tspan fontStyle="italic">P</tspan>
                {` = ${formatP(P)} GPa,  `}
                <tspan fontStyle="italic">T</tspan>
                <tspan fontSize="0.72em" dy="2" fontStyle="italic">c</tspan>
                {` = ${Tc.toFixed(1)} K`}
              </text>
            </g>
          );
        })()}
      </svg>

      <figcaption
        style={{
          marginTop: 14,
          maxWidth: '92ch',
          fontFamily: F_BODY,
          fontSize: 12,
          lineHeight: 1.55,
          color: INK,
          textWrap: 'pretty',
        }}
      >
        <span
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontVariantCaps: 'all-small-caps',
            fontWeight: 600,
            marginRight: 6,
            color: INK_EMPH,
          }}
        >
          FIG. 1.
        </span>
        <span style={{ fontStyle: 'italic' }}>
          Pressure–temperature landscape of superconductivity. Materials plotted on a logarithmic pressure axis (10⁻⁴ to 10² GPa) against critical temperature on a linear 0–300 K scale. Shape encodes family — nickelate circle, cuprate square, hydride diamond, pnictide triangle-up, conventional BCS triangle-down, wildcard pentagon; fill encodes measurement status (filled = measured, open = predicted); hairline rings denote anchors, slashes denote failures, superscript numerals denote proposal round. The dashed rectangle in the upper-left is the ambient-pressure target zone — {' '}<i>P</i> &lt; 10⁻² GPa, <i>T</i><sub>c</sub> &gt; 138 K. Hover any point for coordinate readout; click to anchor the inspector.
        </span>
      </figcaption>
    </figure>
  );
}
