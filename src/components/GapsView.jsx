import gaps from '../data/palace/palace_gaps_nickelates.json';
import BitmaskGrid16 from './BitmaskGrid16.jsx';
import { useState } from 'react';

export default function GapsView() {
  const list = Array.isArray(gaps) ? gaps : [];
  const [selected, setSelected] = useState(list[0] || null);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 1100 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        gap candidates — nickelates
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        untested neighborhoods
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {list.length} gaps within Hamming 2 of a known high-Tc success
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div style={{ border: '1px solid var(--color-border-subtle)' }}>
          {list.map((g, i) => {
            const isSel = selected === g;
            return (
              <div
                key={i}
                onClick={() => setSelected(g)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 80px',
                  gap: 12,
                  padding: '10px 14px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isSel ? 'var(--color-surface-raised)' : 'transparent',
                  borderLeft: isSel ? '2px solid var(--color-accent)' : '2px solid transparent',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                  Δ{g.distance}
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text)', marginBottom: 2 }}>
                    near {g.nearest_success}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)' }}>
                    flip: {g.gates_flipped?.join(', ')}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                  {g.nearest_onset}K
                </span>
              </div>
            );
          })}
          {list.length === 0 && (
            <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
              no gap data available
            </div>
          )}
        </div>

        <div>
          {selected && (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                candidate bitmask
              </div>
              <BitmaskGrid16 bitmask={selected.bitmask} size="signature" />
              <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Distance: <span style={{ color: 'var(--color-text)' }}>{selected.distance}</span><br />
                Anchor: <span style={{ color: 'var(--color-text)' }}>{selected.nearest_success}</span> ({selected.nearest_onset}K)<br />
                Flip: <span style={{ color: 'var(--color-accent)' }}>{selected.gates_flipped?.join(', ')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
