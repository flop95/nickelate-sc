import gaps from '../data/palace/palace_gaps_nickelates.json';
import drawers from '../data/palace/palace_drawers.json';
import BitmaskStamp, { splitBitmask } from './BitmaskStamp.jsx';
import { useEffect, useMemo, useState } from 'react';
import { formatGateList } from '../utils/displayLabels.js';
import { matchesPressureMode, pressureModeFor, pressureModeLabel } from '../utils/pressureModes.js';

const DRAWER_BY_ID = new Map(drawers.map(d => [d.id, d]));

function resolveAnchorDrawer(gap) {
  return DRAWER_BY_ID.get(gap.anchor_drawer_id)
    || drawers.find(d => d.material === gap.anchor_material && d.wing === 'nickelates')
    || drawers.find(d => d.material === gap.anchor_material);
}

export default function GapsView({ pressureMode }) {
  const list = useMemo(() => {
    const all = Array.isArray(gaps) ? gaps : [];
    return all
      .map(g => ({ ...g, anchorDrawer: resolveAnchorDrawer(g) }))
      .filter(g => matchesPressureMode(g.anchorDrawer, pressureMode));
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
            const anchorOnset = g.anchorDrawer?.properties?.onset_tc ?? g.anchor_onset_tc_K;
            return (
              <div
                key={i}
                onClick={() => setSelected(g)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 110px',
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
                    near {g.anchor_material}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)' }}>
                    screening gate: {formatGateList(g.gates_flipped)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {anchorOnset}K
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
                    anchor · not forecast
                  </div>
                </div>
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
                Nearest-neighbor anchor Tc: <span style={{ color: 'var(--color-text)' }}>{selected.anchorDrawer?.properties?.onset_tc ?? selected.anchor_onset_tc_K}K</span> on <span style={{ color: 'var(--color-text)' }}>{selected.anchor_material}</span> ({pressureModeLabel(pressureModeFor(selected.anchorDrawer))})<br />
                Screening gate change: <span style={{ color: 'var(--color-accent)' }}>{formatGateList(selected.gates_flipped)}</span><br />
              </div>
              <div style={{ marginTop: 12, padding: '8px 10px', border: '1px solid var(--line, var(--color-border-subtle))', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {selected.tc_display_warning || 'Anchor value only; not a forecast.'} This is not a predicted Tc for the candidate; it is the measured Tc of the nearest anchor. Recompute gates and verify the source record before treating as evidence.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
