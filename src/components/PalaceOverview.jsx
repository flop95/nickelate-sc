import { useMemo } from 'react';
import stats from '../data/palace/palace_stats.json';
import drawers from '../data/palace/palace_drawers.json';
import failures from '../data/palace/palace_failures.json';
import lessons from '../data/palace/palace_lessons.json';
import gaps from '../data/palace/palace_gaps_nickelates.json';
import gateDefs from '../data/palace/palace_gates.json';
import BitmaskStamp, { splitBitmask } from './BitmaskStamp.jsx';
import FailureTag from './FailureTag.jsx';
import TcValue from './TcValue.jsx';
import DataTable from './DataTable.jsx';
import { GATE_COUNT, hammingDistance } from '../utils/bitmask.js';
import { formatGateList, formatGateName } from '../utils/displayLabels.js';
import { matchesPressureMode, pressureModeFor, pressureModeLabel } from '../utils/pressureModes.js';

// palace_gates.json is now a dict {count, categories, gates} — read the gates array.
const GATE_NAME_TO_INDEX = Object.fromEntries(gateDefs.gates.map(g => [g.name, g.index]));
const DRAWER_BY_ID = new Map(drawers.map(d => [d.id, d]));

function resolveAnchorDrawer(gap) {
  return DRAWER_BY_ID.get(gap.anchor_drawer_id)
    || drawers.find(d => d.material === gap.anchor_material && d.wing === 'nickelates')
    || drawers.find(d => d.material === gap.anchor_material);
}

function buildCandidates(gapsList) {
  if (!Array.isArray(gapsList)) return [];
  return gapsList.map(g => {
    const anchorDrawer = resolveAnchorDrawer(g);
    const diffIndex = GATE_NAME_TO_INDEX[g.gates_flipped?.[0]];
    const minFailDist = failures.length
      ? Math.min(...failures.map(f => {
          const fd = drawers.find(d => d.id === f.drawer_id);
          return fd ? hammingDistance(g.bitmask, fd.bitmask) : GATE_COUNT;
        }))
      : GATE_COUNT;
    return {
      ...g,
      diffIndex,
      anchorDrawer,
      minFailDist,
      riskLabel: minFailDist <= 1 ? 'HIGH' : minFailDist <= 2 ? 'MODERATE' : 'LOW',
    };
  });
}

export default function PalaceOverview({ onNavigate, onSelect, pressureMode }) {
  const candidates = useMemo(
    () => buildCandidates(gaps).filter(g => matchesPressureMode(g.nearestDrawer, pressureMode)),
    [pressureMode]
  );
  const hero = candidates[0];
  const more = candidates.slice(1, 7);

  const recentFailures = failures
    .filter(f => {
      const drawer = drawers.find(d => d.id === f.drawer_id);
      return matchesPressureMode(drawer, pressureMode);
    })
    .slice(-6)
    .reverse();

  return (
    <div className="palace-overview-root" style={{ padding: '28px 36px 40px', maxWidth: 1280 }}>
      <div className="overline">pseudonymous literature notebook</div>
      <h1 className="voice-authority" style={{ fontSize: 22, marginBottom: 4 }}>
        nickelate<span style={{ color: 'var(--fg-2)' }}>.</span><span style={{ color: 'var(--accent)' }}>sc</span>
      </h1>
      <div className="voice-quiet" style={{ marginBottom: 28, maxWidth: 640 }}>
        A static, sourced screening review: {pressureModeLabel(pressureMode)} records are measured observations,
        screening-gate distances are curator-assigned features, and candidates are experiment prompts for follow-up.
      </div>

      <EpistemicNotice />
      {hero ? <HeroCandidate hero={hero} onSelect={onSelect} /> : <HeroEmpty />}

      <div className="palace-overview-lanes" style={{
        display: 'grid',
        gridTemplateColumns: '1.85fr 1fr',
        gap: 20,
        marginTop: 28,
        alignItems: 'start',
      }}>
        <PromisingLane candidates={candidates} onSelect={onSelect} onNavigate={onNavigate} />
        <FailureLane failures={recentFailures} onSelect={onSelect} onNavigate={onNavigate} />
      </div>

      <ScopeNote />
      <ActionLinks onNavigate={onNavigate} />
      <StatsStrip />
      <CitationFooter />
    </div>
  );
}

const RELEASE_VERSION = '0.1.0';
const RELEASE_DATE = '2026-05-24';
const RELEASE_DOI = '10.5281/zenodo.20369923';

function CitationFooter() {
  const doiUrl = `https://doi.org/${RELEASE_DOI}`;
  return (
    <section
      className="workspace-section"
      style={{
        marginTop: 32,
        paddingTop: 20,
        borderTop: '1px solid var(--line)',
      }}
    >
      <div className="overline" style={{ marginBottom: 8 }}>how to cite</div>
      <div
        className="voice-mono"
        style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.55 }}
      >
        Version {RELEASE_VERSION} — archived {RELEASE_DATE} ·{' '}
        DOI:{' '}
        <a
          href={doiUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
        >
          {RELEASE_DOI}
        </a>
      </div>
      <pre
        className="voice-mono"
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          background: 'var(--bg-raised)',
          border: '1px solid var(--line)',
          padding: '12px 14px',
          margin: 0,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
          maxWidth: 880,
        }}
      >
{`flop95. (2026). nickelate.sc: Vol. 1, No. 1 — Bilayer nickelate screening
corpus (Version ${RELEASE_VERSION}) [Data set and software]. Zenodo.
https://doi.org/${RELEASE_DOI}`}
      </pre>
      <div
        className="voice-quiet"
        style={{ marginTop: 10, fontSize: 11, color: 'var(--text-faint)', maxWidth: 880, lineHeight: 1.55 }}
      >
        Use note: cite the primary literature (linked from each record's source DOI) for any
        scientific claim. This corpus should be cited only for the curated schema, screening
        interface, and versioned data aggregation. License: code MIT, data and docs CC-BY-4.0.
      </div>
    </section>
  );
}

function EpistemicNotice() {
  return (
    <section
      className="workspace-section"
      style={{
        margin: '0 0 24px',
        padding: '12px 16px',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="overline" style={{ marginBottom: 6 }}>status before use</div>
      <div className="voice-quiet" style={{ maxWidth: 980, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55 }}>
        Personal synthesis by a pseudonymous author; no DOI, no peer review, no editorial board, and no public source repository.
        The public surface is the rendered issue plus JSON export. Similarity scores organize the curator's feature choices;
        they are not probabilities, forecasts, or evidence that a candidate will superconduct.
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Hero candidate panel — the dramatic center
// ───────────────────────────────────────────────────────
function HeroCandidate({ hero, onSelect }) {
  const anchorOnset = hero.anchorDrawer?.properties?.onset_tc ?? hero.anchor_onset_tc_K;
  const headlineK = Math.round(anchorOnset || 0);
  const diffGateName = formatGateName(hero.gates_flipped?.[0]);
  const substrate = hero.anchorDrawer?.properties?.substrate || '';
  const anchorMode = pressureModeLabel(pressureModeFor(hero.anchorDrawer));
  const riskColor = 'var(--text-secondary)';

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
        <div className="overline" style={{ marginBottom: 10 }}>feature-distance hypothesis</div>
        <div className="hero-fingerprint-wrap">
          <BitmaskStamp drawer={splitBitmask(hero.bitmask)} size="signature" diffGate={hero.diffIndex} />
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          className="voice-authority hero-claim"
          style={{ fontSize: 18, marginBottom: 4, lineHeight: 1.35 }}
        >
          {hero.distance === 1 ? '1 screening gate' : `${hero.distance} screening gates`} from{' '}
          <span className="tc-strong">{headlineK}K</span>{' '}
          {hero.anchor_material} anchor.
        </div>
        <div
          className="voice-mono"
          style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}
        >
          {headlineK}K is the anchor's measured Tc — not a forecast for this candidate.
        </div>

        <div className="hero-evidence-item">
          <Row label="nearest-neighbor anchor">
            <span className="voice-mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {hero.anchor_material}{substrate ? ` on ${substrate}` : ''}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="anchor Tc (measured)">
            <span className="voice-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {anchorOnset}K · {hero.tc_display_warning || 'Anchor value only; not a forecast.'}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="differing screening gate">
            <span className="voice-mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
              {diffGateName || '—'}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="risk">
            <span className="voice-mono" style={{ fontSize: 12, color: riskColor }}>
              {hero.riskLabel} · nearest negative result Δ{hero.minFailDist}
            </span>
          </Row>
        </div>
        <div className="hero-evidence-item">
          <Row label="retrieval">
            <span className="voice-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Δ{hero.distance} gate distance · same structural family{anchorMode ? ` · ${anchorMode} anchor` : ''}
            </span>
          </Row>
        </div>

        {hero.riskLabel !== 'LOW' && (
          <div className="hero-warning" style={{
            marginTop: 12,
            padding: '6px 10px',
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--line)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}>
            ! sits Δ{hero.minFailDist} from a known negative pattern
          </div>
        )}

        <div className="hero-evidence-item" style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          {hero.anchorDrawer && (
            <button
              onClick={() => onSelect && onSelect({ kind: 'drawer', drawer: hero.anchorDrawer })}
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
              inspect measured anchor →
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
// Promising untested neighbors (wide left lane) — derived from the existing
// gap map so this lane stays live even before a proposal round is generated.
// ───────────────────────────────────────────────────────
function riskColorFor(risk) {
  if (risk === 'high') return 'var(--text-primary)';
  if (risk === 'medium' || risk === 'moderate') return 'var(--text-secondary)';
  return 'var(--text-secondary)';
}

function confidenceColorFor(conf) {
  if (conf === 'near') return 'var(--color-accent)';
  if (conf === 'watch') return 'var(--text-primary)';
  return 'var(--text-faint)';
}

function PromisingLane({ candidates, onSelect, onNavigate }) {
  const safeBets = useMemo(() => {
    const all = Array.isArray(candidates) ? candidates : [];
    return all
      .slice()
      .sort((a, b) => (a.distance - b.distance) || ((b.anchor_onset_tc_K || 0) - (a.anchor_onset_tc_K || 0)))
      .slice(0, 6)
      .map(g => ({
        id: `gap-${g.bitmask}`,
        material_pattern: `${g.distance === 1 ? 'one' : g.distance}-gate hypothesis`,
        differing_gates: g.gates_flipped || [],
        anchor_material: g.anchor_material,
        anchor_tc: g.anchorDrawer?.properties?.onset_tc ?? g.anchor_onset_tc_K,
        anchorDrawer: g.anchorDrawer,
        confidence: g.distance <= 1 ? 'near' : 'watch',
        failure_risk: (g.riskLabel || 'LOW').toLowerCase(),
      }));
  }, [candidates]);

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
              screening gate: {formatGateList(p.differing_gates)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'anchor_material',
      header: 'anchor (measured)',
      accessorKey: 'anchor_material',
      size: '1fr',
      cell: info => {
        const p = info.row.original;
        return (
          <div>
            <div className="voice-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {p.anchor_material}
            </div>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <TcValue value={p.anchor_tc} size={11} align="left" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                anchor · not forecast
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'confidence',
      header: 'proximity',
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
    if (!onSelect) return;
    if (row.anchorDrawer) onSelect({ kind: 'drawer', drawer: row.anchorDrawer });
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
          <div className="overline">empirical hypotheses · from gap map</div>
          <div className="voice-authority" style={{ fontSize: 14 }}>
            hypothesis candidates
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
          [all candidates ↗]
        </span>
      </div>

      {safeBets.length === 0 ? (
        <div className="voice-quiet" style={{ color: 'var(--text-faint)' }}>
          no gap candidates available
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
// Negative results (narrow right lane, quieter)
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
          <div className="overline">negative evidence</div>
          <div className="voice-authority" style={{ fontSize: 14 }}>
            failed claims
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
          view all ↗
        </span>
      </div>

      {recent.length === 0 && (
        <div className="voice-quiet" style={{ color: 'var(--text-faint)' }}>no failed claims on record</div>
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
// Scope note — keeps the review status visible without blocking exploration.
// ───────────────────────────────────────────────────────
function ScopeNote() {
  return (
    <section
      className="workspace-section"
      style={{
        marginTop: 24,
        padding: '14px 18px',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="overline" style={{ marginBottom: 6 }}>scope note</div>
      <div className="voice-quiet" style={{ maxWidth: 900, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55 }}>
        This issue is a personal literature synthesis, not an archival database, peer-reviewed venue, or consensus forecast.
        Exported JSON exposes the curated measurements, gate definitions, gap candidates, failures, and prediction inputs so
        references and rankings can be re-checked before use. Recompute gate assignments and re-pull primary sources before
        treating any ranking quantitatively.
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Demoted action links
// ───────────────────────────────────────────────────────
const LINKS = [
  { key: 'nickelates/experimental_results', label: 'explore palace' },
  { key: 'search',                          label: 'search records' },
  { key: 'failures',                        label: 'negative results' },
  { key: 'nickelates/gap_candidates',       label: 'hypothesis map' },
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
    { label: 'records', value: stats.total_drawers },
    { label: 'negative results', value: stats.total_failures },
    { label: 'hypotheses', value: Array.isArray(gaps) ? gaps.length : 0 },
    { label: 'source repo', value: 'private' },
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
