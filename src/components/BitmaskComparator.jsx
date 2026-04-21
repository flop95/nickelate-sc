import BitmaskStamp, { splitBitmask } from './BitmaskStamp.jsx';
import { diffBitmasks, hammingDistance } from '../utils/bitmask.js';

// TODO(bucket-1-step-4): comparator diff logic still uses flat diffBitmasks /
// hammingDistance from the 16-gate era — those iterate bits 0-15 only, so
// differences in bits 16-21 (evidence tier) are silently ignored. Also,
// items here carry a flat {label, bitmask} shape, so the stamp below
// receives a drawer-shaped object that lacks physical_bitmask /
// control_bitmask / evidence_bitmask — the stamp will render as all-fail
// until the comparator is redesigned to operate on three-category drawers.
// Leaving as-is per migration scope: a proper comparator redesign is a
// separate round.

// Shows 2-3 grids side by side. First grid is the query/reference;
// subsequent grids highlight gates that differ from the first.
export default function BitmaskComparator({ items }) {
  // items: [{ label, bitmask, sublabel? }]
  if (!items?.length) return null;
  const ref = items[0].bitmask;

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {items.map((item, i) => {
        const diff = i === 0 ? new Set() : new Set(diffBitmasks(ref, item.bitmask));
        const hd = i === 0 ? 0 : hammingDistance(ref, item.bitmask);
        return (
          <div key={i}>
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text)',
              }}>
                {item.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-text-muted)',
                marginTop: 2,
              }}>
                {item.sublabel}
                {i > 0 && <span style={{ marginLeft: 8 }}>Δ hamming = {hd}</span>}
              </div>
            </div>
            <BitmaskStamp drawer={splitBitmask(item.bitmask)} size="signature" diffGates={diff} />
          </div>
        );
      })}
    </div>
  );
}
