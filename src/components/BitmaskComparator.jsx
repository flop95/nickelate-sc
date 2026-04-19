import BitmaskGrid16 from './BitmaskGrid16.jsx';
import { diffBitmasks, hammingDistance } from '../utils/bitmask.js';

// Shows 2-3 grids side by side. First grid is the query/reference;
// subsequent grids highlight gates that differ from the first (blue outline).
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
            <BitmaskGrid16 bitmask={item.bitmask} size="signature" diffGates={diff} />
          </div>
        );
      })}
    </div>
  );
}
