import { useEffect, useRef, useState } from 'react';
import gates from '../data/palace/palace_gates.json';

// Three-size rendering system:
//   - "signature" (~80px, number label per cell) — hero, material header, inspector
//   - "inline"    (~32px, no labels)              — candidate rows, tables
//   - "dense"     (~18px, no labels)              — compact stats
//
// Motion: on bitmask change, cells whose state *differs* from the previous
// bitmask get a `just-flipped-on` class and play the `gateOn` keyframe once.
// Unchanged cells stay stable. The `diffGate` prop (single index) applies
// a persistent `is-diff` gold ring — visible even with reduced-motion.
export default function BitmaskGrid16({
  bitmask,
  size = 'signature',
  unavailable = new Set(),
  failureGates = new Set(),
  diffGates = new Set(),
  diffGate,
  onCellClick,
}) {
  const [hover, setHover] = useState(null);
  const [flipped, setFlipped] = useState(() => new Set());
  const prevRef = useRef(bitmask);
  const timerRef = useRef(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === bitmask) return;
    const changed = new Set();
    for (let i = 0; i < 16; i++) {
      if (((prev >> i) & 1) !== ((bitmask >> i) & 1)) changed.add(i);
    }
    prevRef.current = bitmask;
    setFlipped(changed);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlipped(new Set()), 240);
    return () => clearTimeout(timerRef.current);
  }, [bitmask]);

  const profile = {
    signature: { cell: 18, gap: 2 },
    inline:    { cell: 7,  gap: 1   },
    dense:     { cell: 4,  gap: 0.5 },
  }[size] || { cell: 18, gap: 2 };

  const isSig = size === 'signature';
  const cellW = profile.cell;
  const cellH = profile.cell;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${cellW}px)`,
          gridTemplateRows: `repeat(4, ${cellH}px)`,
          gap: profile.gap,
          padding: isSig ? 2 : 1,
          background: isSig ? 'var(--line)' : 'transparent',
          border: isSig ? '1px solid var(--line)' : 'none',
        }}
      >
        {gates.map(g => {
          const pass = ((bitmask >> g.index) & 1) === 1;
          const isUnavailable = unavailable.has(g.index);
          const isFailure = failureGates.has(g.index);
          const isDiffSet = diffGates.has(g.index);
          const isDiff = diffGate === g.index;
          const justFlipped = flipped.has(g.index) && pass;

          let bg = pass ? 'var(--color-gate-pass-bg)' : 'transparent';
          let border = pass
            ? '1px solid var(--color-gate-pass-border)'
            : '1px solid var(--color-gate-fail-border)';

          if (isFailure) border = '1px solid var(--color-failure-border)';
          if (isDiffSet) border = '1px solid var(--color-diff-border)';
          if (isUnavailable) {
            bg = 'transparent';
            border = '1px dashed rgba(255,255,255,0.12)';
          }

          const cls = [
            'bit',
            justFlipped ? 'just-flipped-on' : '',
            isDiff ? 'is-diff' : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={g.index}
              onMouseEnter={() => setHover(g.index)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onCellClick && onCellClick(g)}
              className={cls}
              style={{
                background: bg,
                border,
                position: 'relative',
                cursor: onCellClick ? 'pointer' : 'default',
                display: isSig ? 'flex' : 'block',
                alignItems: 'flex-end',
                padding: isSig ? '1px 2px' : 0,
              }}
            >
              {isSig && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 7,
                    color: pass ? 'rgba(212,168,67,0.85)' : 'var(--text-faint)',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {String(g.index).padStart(2, '0')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hover != null && !isSig && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: '4px 8px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--line-strong)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          [{String(hover).padStart(2, '0')}] {gates[hover].name} · {((bitmask >> hover) & 1) ? 'pass' : 'fail'}
        </div>
      )}
    </div>
  );
}

// Legacy horizontal strip — still exported for backward compat.
export function BitmaskStrip({ bitmask, width = 80 }) {
  const cellW = width / 16;
  return (
    <div style={{ display: 'flex', gap: 1, height: cellW * 1.4 }}>
      {gates.map(g => {
        const pass = ((bitmask >> g.index) & 1) === 1;
        return (
          <div
            key={g.index}
            style={{
              width: cellW,
              background: pass ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
              opacity: pass ? 0.85 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
