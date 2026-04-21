// BitmaskStamp — 22-gate three-category gate tablet.
// Physical gates drive similarity. Control gates are filters. Evidence
// gates are confidence badges. Asymmetry carries the scientific meaning
// rather than fighting it: physical reads as primary, control and
// evidence as subsidiary. Do not re-symmetrize in the name of polish.

import gatesData from '../data/palace/palace_gates.json';

const PHYSICAL_GATES = gatesData.gates.filter(g => g.category === 'physical');
const CONTROL_GATES = gatesData.gates.filter(g => g.category === 'control');
const EVIDENCE_GATES = gatesData.gates.filter(g => g.category === 'evidence');

const PHYSICAL_MASK_BITS = PHYSICAL_GATES.reduce((m, g) => m | (1 << g.index), 0);
const CONTROL_MASK_BITS = CONTROL_GATES.reduce((m, g) => m | (1 << g.index), 0);
const EVIDENCE_MASK_BITS = EVIDENCE_GATES.reduce((m, g) => m | (1 << g.index), 0);

// For call sites that only have a combined 22-gate bitmask (e.g. gap
// entries, hero candidates, comparator items) and need to feed the stamp
// its three per-category masks. The stamp itself never reads the
// combined field; splitting is the caller's responsibility.
export function splitBitmask(combined) {
  const bm = combined | 0;
  return {
    physical_bitmask: bm & PHYSICAL_MASK_BITS,
    control_bitmask: bm & CONTROL_MASK_BITS,
    evidence_bitmask: bm & EVIDENCE_MASK_BITS,
  };
}

const SIZE_PROFILES = {
  signature: { cell: 18, gap: 2, showLabels: true, labelFontSize: 7 },
  inline:    { cell: 7,  gap: 1, showLabels: false, labelFontSize: 0 },
  dense:     { cell: 4,  gap: 0.5, showLabels: false, labelFontSize: 0 },
};

const DIM_OPACITY = 0.65;

function cellVisual({ pass, tier, disabled, isDiff }) {
  if (disabled) {
    return {
      bg: 'transparent',
      border: '1px dashed var(--color-gate-fail-border)',
    };
  }
  if (isDiff) {
    return {
      bg: pass ? (tier === 'physical' ? 'var(--color-gate-pass-bg)' : 'rgba(255,255,255,0.14)') : 'transparent',
      border: '1px solid var(--color-diff-border)',
    };
  }
  if (pass) {
    if (tier === 'physical') {
      return {
        bg: 'var(--color-gate-pass-bg)',
        border: '1px solid var(--color-gate-pass-border)',
      };
    }
    return {
      bg: 'rgba(255, 255, 255, 0.14)',
      border: '1px solid var(--color-gate-fail-border)',
    };
  }
  return {
    bg: 'transparent',
    border: '1px solid var(--color-gate-fail-border)',
  };
}

function Cell({ gate, pass, tier, disabled, isDiff, profile }) {
  const { bg, border } = cellVisual({ pass, tier, disabled, isDiff });
  const isPhysical = tier === 'physical';
  const labelColor = (pass && isPhysical && !disabled)
    ? 'rgba(212,168,67,0.85)'
    : 'var(--text-faint)';

  return (
    <div
      style={{
        width: profile.cell,
        height: profile.cell,
        background: bg,
        border,
        boxSizing: 'border-box',
        display: profile.showLabels ? 'flex' : 'block',
        alignItems: 'flex-end',
        padding: profile.showLabels ? '1px 2px' : 0,
      }}
    >
      {profile.showLabels && gate && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: profile.labelFontSize,
            color: labelColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {String(gate.index).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

function Row({ gates, cols, tier, drawer, disabled, diffSet, profile }) {
  const mask = disabled ? 0 : (
    tier === 'physical' ? (drawer?.physical_bitmask ?? 0) :
    tier === 'control'  ? (drawer?.control_bitmask  ?? 0) :
                          (drawer?.evidence_bitmask ?? 0)
  );
  const dim = tier !== 'physical';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${profile.cell}px)`,
        gap: profile.gap,
        opacity: dim ? DIM_OPACITY : 1,
      }}
    >
      {gates.map(g => {
        const pass = ((mask >>> g.index) & 1) === 1;
        const isDiff = diffSet?.has?.(g.index) ?? false;
        return (
          <Cell
            key={g.index}
            gate={g}
            pass={pass}
            tier={tier}
            disabled={disabled}
            isDiff={isDiff}
            profile={profile}
          />
        );
      })}
    </div>
  );
}

export default function BitmaskStamp({
  drawer,
  size = 'signature',
  disabled = false,
  diffGates,
  diffGate,
}) {
  const profile = SIZE_PROFILES[size] || SIZE_PROFILES.signature;

  const diffSet = (() => {
    if (diffGates && typeof diffGates.has === 'function') return diffGates;
    if (diffGate != null) return new Set([diffGate]);
    return null;
  })();

  const physCols = Math.ceil(PHYSICAL_GATES.length / 2);
  const physRow1 = PHYSICAL_GATES.slice(0, physCols);
  const physRow2 = PHYSICAL_GATES.slice(physCols);

  const isDense = size === 'dense';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: profile.gap }}>
      <Row gates={physRow1} cols={physCols} tier="physical"
           drawer={drawer} disabled={disabled} diffSet={diffSet} profile={profile} />
      <Row gates={physRow2} cols={physCols} tier="physical"
           drawer={drawer} disabled={disabled} diffSet={diffSet} profile={profile} />
      {!isDense && (
        <>
          <Row gates={CONTROL_GATES} cols={CONTROL_GATES.length} tier="control"
               drawer={drawer} disabled={disabled} diffSet={diffSet} profile={profile} />
          <Row gates={EVIDENCE_GATES} cols={EVIDENCE_GATES.length} tier="evidence"
               drawer={drawer} disabled={disabled} diffSet={diffSet} profile={profile} />
        </>
      )}
    </div>
  );
}
