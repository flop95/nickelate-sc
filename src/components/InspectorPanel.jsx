import BitmaskStamp from './BitmaskStamp.jsx';
import LatticeSpin from './LatticeSpin.jsx';
import FailureTag from './FailureTag.jsx';
import TcValue from './TcValue.jsx';
import { passCount } from '../utils/bitmask.js';
import stats from '../data/palace/palace_stats.json';

export default function InspectorPanel({ selection, collapsed, onToggle, onNavigate }) {
  if (collapsed) {
    return (
      <div
        onClick={onToggle}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-faint)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
        }}
        title="Expand inspector"
      >
        ◀
      </div>
    );
  }

  const key = selection
    ? `${selection.kind}-${selection.kind === 'drawer' ? selection.drawer.id : selection.failure.id}`
    : 'empty';

  return (
    <aside style={{
      padding: '18px 20px 36px',
      fontFamily: 'var(--font-body)',
      minHeight: '100%',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
      }}>
        <span className="overline">Inspector</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
          }}
          title="Collapse"
        >
          ▶
        </button>
      </div>

      <div key={key} className="inspector-content">
        {!selection && <EmptyState />}
        {selection?.kind === 'drawer' && <DrawerInspector drawer={selection.drawer} onNavigate={onNavigate} />}
        {selection?.kind === 'failure' && <FailureInspector failure={selection.failure} />}
      </div>
    </aside>
  );
}

// ───────────────────────────────────────────────
// Empty state
// ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '24px 0 28px',
        borderBottom: '1px solid var(--line)',
        marginBottom: 22,
      }}>
        <LatticeSpin size={52} />
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--text-faint)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Select a material or failure<br />to inspect
        </div>
      </div>
      <div className="overline" style={{ marginBottom: 10 }}>Palace</div>
      <StatRow label="drawers"  value={stats.total_drawers} />
      <StatRow label="failures" value={stats.total_failures} />
      <StatRow label="lessons"  value={stats.total_lessons} />
      <StatRow label="tunnels"  value={stats.total_tunnels} />
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      padding: '3px 0',
      color: 'var(--text-secondary)',
    }}>
      <span style={{ color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="overline" style={{ marginBottom: 6 }}>{children}</div>
  );
}

// ───────────────────────────────────────────────
// Drawer detail
// ───────────────────────────────────────────────
function PropsTable({ props }) {
  const keys = ['substrate', 'onset_tc', 'zero_r_tc', 'strain', 'film_a', 'film_c', 'thickness', 'doping', 'pressure_class', 'year', 'growth_method'];
  const shown = keys.filter(k => props[k] != null && props[k] !== '');
  return (
    <div>
      {shown.map(k => {
        const v = props[k];
        const isTc = k === 'onset_tc' || k === 'zero_r_tc';
        return (
          <div key={k} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            padding: '3px 0',
            fontSize: 11,
          }}>
            <span className="voice-quiet" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{k}</span>
            {isTc
              ? <TcValue value={Number(v)} size={11} />
              : <span className="voice-mono" style={{
                  fontSize: 11,
                  color: 'var(--text-primary)',
                  textAlign: 'right',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{String(v)}</span>
            }
          </div>
        );
      })}
    </div>
  );
}

function DrawerInspector({ drawer, onNavigate }) {
  const p = drawer.properties || {};
  const passes = passCount(drawer.bitmask);

  return (
    <div>
      <div className="inspector-section" style={{ marginBottom: 18 }}>
        <Label>signature · {passes}/16</Label>
        <BitmaskStamp drawer={drawer} size="signature" />
      </div>

      <div className="inspector-section" style={{ marginBottom: 16 }}>
        <div className="voice-authority" style={{ fontSize: 16, marginBottom: 2 }}>
          {drawer.material}
        </div>
        <div className="voice-mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
          {drawer.wing} / {drawer.room}{p.year ? ` · ${p.year}` : ''}
        </div>
      </div>

      <div className="inspector-section" style={{ marginBottom: 18 }}>
        <Label>properties</Label>
        <PropsTable props={p} />
      </div>

      {drawer.evidence?.summary && (
        <div className="inspector-section" style={{ marginBottom: 18 }}>
          <Label>evidence</Label>
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}>
            {drawer.evidence.summary}
          </div>
          {drawer.evidence.source_doi && (
            <div style={{ marginTop: 6 }}>
              <a
                href={`https://doi.org/${drawer.evidence.source_doi}`}
                target="_blank"
                rel="noreferrer"
                className="voice-mono"
                style={{
                  fontSize: 10,
                  color: 'var(--text-faint)',
                }}
              >
                doi:{drawer.evidence.source_doi}
              </a>
            </div>
          )}
        </div>
      )}

      {p.notes && (
        <div className="inspector-section" style={{ marginBottom: 18 }}>
          <Label>notes</Label>
          <div className="voice-quiet" style={{ fontSize: 11, lineHeight: 1.55 }}>
            {p.notes}
          </div>
        </div>
      )}

      {drawer.source && (
        <div className="inspector-section" style={{ marginBottom: 18 }}>
          <Label>source</Label>
          <div className="voice-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {drawer.source}
          </div>
        </div>
      )}

      <button
        onClick={() => onNavigate && onNavigate(`material/${encodeURIComponent(drawer.material)}`)}
        className="voice-mono"
        style={{
          background: 'transparent',
          border: '1px solid var(--line-strong)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          padding: '7px 12px',
          cursor: 'pointer',
          letterSpacing: '0.04em',
          width: '100%',
          textTransform: 'uppercase',
          transition: 'color 100ms ease-out, border-color 100ms ease-out',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--color-accent)';
          e.currentTarget.style.borderColor = 'var(--gold-border-subtle)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--line-strong)';
        }}
      >
        open full material →
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────
// Failure detail
// ───────────────────────────────────────────────
function FailureInspector({ failure }) {
  return (
    <div>
      <div className="inspector-section" style={{ marginBottom: 6 }}>
        <div className="voice-authority" style={{ fontSize: 16 }}>
          {failure.material}
        </div>
      </div>
      <div className="inspector-section" style={{ marginBottom: 16 }}>
        <FailureTag type={failure.failure_type} />
      </div>

      {failure.context && (
        <div className="inspector-section" style={{ marginBottom: 14 }}>
          <Label>context</Label>
          <div className="voice-quiet" style={{ fontSize: 11, lineHeight: 1.55 }}>
            {failure.context}
          </div>
        </div>
      )}

      {failure.suspected_mechanism && (
        <div className="inspector-section" style={{ marginBottom: 14 }}>
          <Label>suspected mechanism</Label>
          <div className="voice-quiet" style={{ fontSize: 11, lineHeight: 1.55 }}>
            {failure.suspected_mechanism}
          </div>
        </div>
      )}

      {failure.structural_change_from && (
        <div className="inspector-section" style={{ marginBottom: 14 }}>
          <Label>structurally near</Label>
          <div className="voice-mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
            {failure.structural_change_from}
          </div>
        </div>
      )}

      {failure.source && (
        <div className="inspector-section">
          <Label>source</Label>
          <div className="voice-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {failure.source}
          </div>
        </div>
      )}
    </div>
  );
}
