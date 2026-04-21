import BitmaskStamp from './BitmaskStamp.jsx';
import TcValue from './TcValue.jsx';

export default function MaterialCard({ drawer, onClick, selected = false, compact = false }) {
  const p = drawer.properties || {};
  const onset = p.onset_tc;
  const pressureClass = (p.pressure_class || '').toLowerCase();
  const isAmbient = !pressureClass || pressureClass.startsWith('ambient');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        padding: compact ? '8px 10px' : '10px 12px',
        background: selected ? 'var(--color-surface-hover)' : 'transparent',
        borderLeft: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {drawer.material}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-text-muted)',
          marginTop: 2,
          display: 'flex',
          gap: 10,
        }}>
          {p.substrate && <span>/ {p.substrate}</span>}
          {p.year && <span>{p.year}</span>}
          {p.strain != null && <span>{Number(p.strain).toFixed(2)}%</span>}
          {!isAmbient && <span style={{ color: 'var(--color-failure)' }}>HP</span>}
        </div>
        <div style={{ marginTop: 6 }}>
          <BitmaskStamp drawer={drawer} size="inline" />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <TcValue value={onset} />
        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          onset
        </div>
      </div>
    </div>
  );
}
