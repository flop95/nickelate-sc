import gaps from '../data/palace/palace_gaps_nickelates.json';
import drawers from '../data/palace/palace_drawers.json';
import BitmaskStamp, { splitBitmask } from './BitmaskStamp.jsx';
import { useEffect, useMemo, useState } from 'react';
import { formatGateList } from '../utils/displayLabels.js';
import { matchesPressureMode, pressureModeFor, pressureModeLabel } from '../utils/pressureModes.js';

const DRAWER_BY_ID = new Map(drawers.map(d => [d.id, d]));

function resolveNearestSuccessDrawer(gap) {
  return DRAWER_BY_ID.get(gap.nearest_success_drawer_id)
    || drawers.find(d => d.material === gap.nearest_success && d.wing === 'nickelates')
    || drawers.find(d => d.material === gap.nearest_success);
}

export default function GapsView({ pressureMode }) {
  const list = useMemo(() => {
    const all = Array.isArray(gaps) ? gaps : [];
    return all
      .map(g => ({ ...g, nearestDrawer: resolveNearestSuccessDrawer(g) }))
      .filter(g => matchesPressureMode(g.nearestDrawer, pressureMode));
  }, [pressureMode]);
  const [selected, setSelected] = useState(list[0] || null);

  useEffect(() => {
    if (!list.includes(selected)) setSelected(list[0] || null);
  }, [list, selected]);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 1100 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        Hypothesis Candidates — Nickelates
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        untested screening neighborhoods
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {list.length} {pressureModeLabel(pressureMode)} experiment prompts within two screening gates of a measured high-Tc anchor · not forecasts
      </div>

      <div className="palace-gaps-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div style={{ border: '1px solid var(--color-border-subtle)' }}>
          {list.map((g, i) => {
            const isSel = selected === g;
            const anchorOnset = g.nearestDrawer?.properties?.onset_tc ?? g.nearest_onset;
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
                    screening gate: {formatGateList(g.gates_flipped)}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                  {anchorOnset}K
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
              <BitmaskStamp drawer={splitBitmask(selected.bitmask)} size="signature" />
              <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Gate distance: <span style={{ color: 'var(--color-text)' }}>{selected.distance}</span><br />
                Measured anchor: <span style={{ color: 'var(--color-text)' }}>{selected.nearest_success}</span> ({selected.nearestDrawer?.properties?.onset_tc ?? selected.nearest_onset}K, {pressureModeLabel(pressureModeFor(selected.nearestDrawer))})<br />
                Screening gate change: <span style={{ color: 'var(--color-accent)' }}>{formatGateList(selected.gates_flipped)}</span><br />
                Use: retrieval cue only; recompute gates and verify the source record before treating as evidence.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
