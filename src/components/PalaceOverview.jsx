import { useMemo } from 'react';
import stats from '../data/palace/palace_stats.json';
import drawers from '../data/palace/palace_drawers.json';
import failures from '../data/palace/palace_failures.json';
import lessons from '../data/palace/palace_lessons.json';
import gaps from '../data/palace/palace_gaps_nickelates.json';
import gateDefs from '../data/palace/palace_gates.json';
import proposals from '../data/palace/palace_proposals.json';
import BitmaskGrid16 from './BitmaskGrid16.jsx';
import FailureTag from './FailureTag.jsx';
import TcValue from './TcValue.jsx';
import DataTable from './DataTable.jsx';
import { hammingDistance } from '../utils/bitmask.js';

const GATE_NAME_TO_INDEX = Object.fromEntries(gateDefs.map(g => [g.name, g.index]));

// Compute the full ranked candidate list once. Each entry carries the gap
// data plus the resolved nearest-success drawer (for substrate etc.) and
// the min-Hamming distance to any known failure (risk signal).
function buildCandidates(gapsList) {
  if (!Array.isArray(gapsList)) return [];
  return gapsList.map(g => {
    const nearestDrawer = drawers.find(
      d => d.material === g.nearest_success && d.wing === 'nickelates'
    ) || drawers.find(d => d.material === g.nearest_success);
    const diffIndex = GATE_NAME_TO_INDEX[g.gates_flipped?.[0]];
    const minFailDist = failures.length
      ? Math.min(...failures.map(f => {
          const fd = drawers.find(d => d.id === f.drawer_id);
          return fd ? hammingDistance(g.bitmask, fd.bitmask) : 16;
        }))
      : 16;
    return {
      ...g,
      diffIndex,
      nearestDrawer,
      minFailDist,
      riskLabel: minFailDist <= 1 ? 'HIGH' : minFailDist <= 2 ? 'MODERATE' : 'LOW',
    };
  });
}

export default function PalaceOverview({ onNavigate, onSelect }) {
  const candidates = useMemo(() => buildCandidates(gaps), []);
  const hero = candidates[0];
  const more = candidates.slice(1, 7);

  const recentFailures = failures.slice(-6).reverse();

  return (
    <div style={{ padding: '28px 36px 40px', maxWidth: 1280 }}>
      <div className="overline">command center</div>
      <h1 className="voice-authority" style={{ fontSize: 22, marginBottom: 4 }}>
        nickelate<span style={{ color: 'var(--fg-2)' }}>.</span><span style={{ color: 'var(--accent)' }}>sc</span>
      </h1>
      <div className="voice-quiet" style={{ marginBottom: 28, maxWidth: 640 }}>
        ranked screening for ambient-pressure superconductivity · untested candidates sit closest
        to known success anchors · failure memory constrains where not to look
      </div>

      {hero ? <HeroCandidate hero={hero} onSelect={onSelect} /> : <HeroEmpty />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.85fr 1fr',
        gap: 20,
        marginTop: 28,
        alignItems: 'start',
      }}>
        <PromisingLane onSelect={onSelect} onNavigate={onNavigate} />
        <FailureLane failures={recentFailures} onSelect={onSelect} onNavigate={onNavigate} />
      </div>

      <ActionLinks onNavigate={onNavigate} />
      <StatsStrip />
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Hero candidate panel — the dramatic center
// ───────────────────────────────────────────────────────
function HeroCandidate({ hero, onSelect }) {
  const headlineK = Math.round(hero.nearest_onset || 0);
  const diffGateName = hero.gates_flipped?.[0];
  const substrate = hero.nearestDrawer?.properties?.substrate || '';
  const riskColor =
    hero.riskLabel === 'LOW' ? 'var(--text-secondary)' :
    hero.riskLabel === 'MODERATE' ? '#f0c775' :
    '#f09595';

  return (
    <div
      key={hero.bitmask}
      className="shadow-hero workspace-section"
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--gold-border-subtle)',
        borderRadius: 12,
        padding: '24px 28px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 32,
        alignItems: 'center',
      }}
    >
      <div>
        <div className="overline" style={{ marginBottom: 10 }}>nearest untested candidate</div>
        <div className="hero-fingerprint-wrap">
          <BitmaskGrid16 bitmask={hero.bitmask} size="signature" diffGate={hero.diffIndex} />
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          className="voice-authority hero-claim"
          style={{ fontSize: 18, marginBottom: 10, lineHeight: 1.35 }}
        >
          {hero.distance === 1 ? '1 gate' : `${hero.distance} gates`} from the known{' '}
          <span className="tc-strong">{headlineK}K</span>{' '}
          {hero.nearest_success} pattern.
        </div>

        <div className="hero-evidence-item">
          <Row label="nearest success">
            <span className="voice-mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {hero.nearest_success}{substrate ? ` on ${substrate}` : ''}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="differing gate">
            <span className="voice-mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
              {diffGateName || '—'}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="failure risk">
            <span className="voice-mono" style={{ fontSize: 12, color: riskColor }}>
              {hero.riskLabel} · nearest known failure Δ{hero.minFailDist}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="retrieval">
            <span className="voice-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Δ{hero.distance} Hamming · same structural family
            </span>
          </Row>
        </div>

        {hero.riskLabel !== 'LOW' && (
          <div className="hero-warning" style={{
            marginTop: 12,
            padding: '6px 10px',
            background: 'rgba(200,96,96,0.08)',
            border: '1px solid rgba(200,96,96,0.3)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#f09595',
          }}>
            ⚠ sits Δ{hero.minFailDist} from a known failure pattern
          </div>
        )}

        <div className="hero-evidence-item" style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          {hero.nearestDrawer && (
            <button
              onClick={() => onSelect && onSelect({ kind: 'drawer', drawer: hero.nearestDrawer })}
              className="voice-mono"
              style={{
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                color: 'var(--text-secondary)',
                fontSize: 11,
                padding: '6px 14px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              inspect anchor →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroEmpty() {
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '28px 32px',
        color: 'var(--text-faint)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}
    >
      No gap candidates available.
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '130px 1fr',
      gap: 16,
      padding: '3px 0',
      alignItems: 'baseline',
    }}>
      <span className="voice-mono" style={{
        fontSize: 10,
        color: 'var(--text-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
      </span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Promising untested neighbors (wide left lane) — from palace_proposals.json
// safe_bet bucket, rendered via DataTable so sort/hover/selection behave
// consistently with every other table in the app.
// ───────────────────────────────────────────────────────
function riskColorFor(risk) {
  if (risk === 'high') return '#f09595';
  if (risk === 'medium') return '#f0c775';
  return 'var(--text-secondary)';
}

function confidenceColorFor(conf) {
  if (conf === 'high') return 'var(--color-accent)';
  if (conf === 'medium') return 'var(--text-primary)';
  return 'var(--text-faint)';
}

function PromisingLane({ onSelect, onNavigate }) {
  const safeBets = useMemo(() => {
    const all = Array.isArray(proposals) ? proposals : [];
    // Latest round only, safe_bet bucket, still open
    const latestRound = all.reduce((max, p) => Math.max(max, p.round_number || 0), 0);
    return all
      .filter(p => p.bucket === 'safe_bet' && p.round_number === latestRound)
      .sort((a, b) => (b.nearest_success_tc || 0) - (a.nearest_success_tc || 0));
  }, []);

  const columns = useMemo(() => [
    {
      id: 'material_pattern',
      header: 'candidate',
      accessorKey: 'material_pattern',
      size: '1.6fr',
      cell: info => {
        const p = info.row.original;
        return (
          <div style={{ minWidth: 0 }}>
            <div className="voice-quiet" style={{
              color: 'var(--text-primary)',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {p.material_pattern}
            </div>
            <div className="voice-mono" style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
              flip {p.differing_gates?.join(', ')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'nearest_success',
      header: 'anchor',
      accessorKey: 'nearest_success',
      size: '1fr',
      cell: info => {
        const p = info.row.original;
        return (
          <div>
            <div className="voice-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {p.nearest_success}
            </div>
            <div style={{ marginTop: 2 }}>
              <TcValue value={p.nearest_success_tc} size={11} align="left" />
            </div>
          </div>
        );
      },
    },
    {
      id: 'confidence',
      header: 'confidence',
      accessorKey: 'confidence',
      size: '88px',
      enableColumnFilter: false,
      cell: info => (
        <span className="voice-mono" style={{
          fontSize: 10,
          color: confidenceColorFor(info.getValue()),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'failure_risk',
      header: 'risk',
      accessorKey: 'failure_risk',
      size: '72px',
      enableColumnFilter: false,
      cell: info => (
        <span className="voice-mono" style={{
          fontSize: 10,
          color: riskColorFor(info.getValue()),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {info.getValue()}
        </span>
      ),
    },
  ], []);

  const handleRowClick = row => {
    // Jump the inspector to the anchor drawer of this proposal.
    if (!onSelect) return;
    const anchor = drawers.find(d => d.material === row.nearest_success && d.wing === 'nickelates')
      || drawers.find(d => d.material === row.nearest_success);
    if (anchor) onSelect({ kind: 'drawer', drawer: anchor });
  };

  return (
    <section
      className="shadow-panel workspace-section"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="overline">safe bets · from proposal round {safeBets[0]?.round_number ?? '—'}</div>
          <div className="voice-authority" style={{ fontSize: 14 }}>
            promising candidates
          </div>
        </div>
        <span
          className="voice-mono"
          style={{
            fontSize: 10,
            color: 'var(--text-faint)',
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate && onNavigate('nickelates/gap_candidates')}
        >
          [all gaps ↗]
        </span>
      </div>

      {safeBets.length === 0 ? (
        <div className="voice-quiet" style={{ color: 'var(--text-faint)' }}>
          no safe-bet proposals in the current round
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={safeBets}
          getRowId={p => p.id}
          onRowClick={handleRowClick}
          compact
          showFilters={false}
        />
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Failure memory (narrow right lane, quieter)
// ───────────────────────────────────────────────────────
function FailureLane({ failures: recent, onSelect, onNavigate }) {
  return (
    <section
      className="shadow-panel workspace-section"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="overline">known traps</div>
          <div className="voice-authority" style={{ fontSize: 14 }}>
            failure memory
          </div>
        </div>
        <span
          className="voice-mono"
          style={{
            fontSize: 10,
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
          onClick={() => onNavigate && onNavigate('failures')}
        >
          [all ↗]
        </span>
      </div>

      {recent.length === 0 && (
        <div className="voice-quiet" style={{ color: 'var(--text-faint)' }}>no failures on record</div>
      )}

      <div>
        {recent.map(f => (
          <div
            key={f.id}
            onClick={() => onSelect && onSelect({ kind: 'failure', failure: f })}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
              cursor: 'pointer',
              transition: 'opacity 100ms ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="voice-mono failure-title" style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                {f.material}
              </span>
              <span className="failure-tag">
                <FailureTag type={f.failure_type} />
              </span>
            </div>
            <div className="voice-quiet failure-mechanism" style={{
              fontSize: 11,
              color: 'var(--text-faint)',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {f.suspected_mechanism}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Demoted action links
// ───────────────────────────────────────────────────────
const LINKS = [
  { key: 'nickelates/experimental_results', label: 'explore palace' },
  { key: 'search',                          label: 'search materials' },
  { key: 'failures',                        label: 'browse failures' },
  { key: 'nickelates/gap_candidates',       label: 'gap map' },
  { key: 'stats',                           label: 'palace statistics' },
];

function ActionLinks({ onNavigate }) {
  return (
    <div style={{
      display: 'flex',
      gap: 28,
      marginTop: 32,
      paddingTop: 20,
      borderTop: '1px solid var(--line)',
      flexWrap: 'wrap',
    }}>
      {LINKS.map(l => (
        <span
          key={l.key}
          onClick={() => onNavigate && onNavigate(l.key)}
          className="voice-mono"
          style={{
            fontSize: 12,
            color: 'var(--fg-3)',
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'color 100ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-3)'; }}
        >
          [{l.label}]
        </span>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Compact metadata strip at the bottom
// ───────────────────────────────────────────────────────
function StatsStrip() {
  const items = [
    { label: 'materials', value: stats.total_drawers },
    { label: 'failures',  value: stats.total_failures },
    { label: 'gaps',      value: Array.isArray(gaps) ? gaps.length : 0 },
    { label: 'lessons',   value: stats.total_lessons },
  ];
  return (
    <div style={{
      display: 'flex',
      gap: 24,
      marginTop: 16,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {items.map((it, i) => (
        <span key={it.label}>
          {i > 0 && <span style={{ marginRight: 24, opacity: 0.4 }}>·</span>}
          <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>{it.value}</span>
          {it.label}
        </span>
      ))}
    </div>
  );
}
