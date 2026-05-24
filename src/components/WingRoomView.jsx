import MaterialCard from './MaterialCard.jsx';
import drawers from '../data/palace/palace_drawers.json';
import { formatWingLabel } from '../utils/displayLabels.js';
import { filterByPressureMode, pressureModeLabel } from '../utils/pressureModes.js';

// Generic listing: shows all drawers for a given wing.
// Used for `{wing}/experimental_results` routes.
export default function WingRoomView({ wing, onSelect, selection, pressureMode }) {
  const list = filterByPressureMode(
    drawers.filter(d => d.wing === wing),
    pressureMode
  );
  const wingLabel = formatWingLabel(wing);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {wingLabel} / Experimental Results
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        {wingLabel}
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {list.length} {pressureModeLabel(pressureMode)} drawers
      </div>

      <div style={{ border: '1px solid var(--color-border-subtle)' }}>
        {list.map(d => (
          <MaterialCard
            key={d.id}
            drawer={d}
            onClick={() => onSelect && onSelect({ kind: 'drawer', drawer: d })}
            selected={selection?.kind === 'drawer' && selection.drawer.id === d.id}
          />
        ))}
        {list.length === 0 && (
          <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
            no drawers in this wing yet
          </div>
        )}
      </div>
    </div>
  );
}
