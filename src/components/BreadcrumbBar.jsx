import LatticeSpin from './LatticeSpin.jsx';

const ROUTE_LABELS = {
  overview: ['Palace Overview'],
  search: ['Search Materials'],
  failures: ['Failure Browser'],
  stats: ['Palace Statistics'],
  'history/timeline': ['History', 'Tc Timeline'],
  'history/brief': ['History', 'Research Brief'],
};

const WING_LABELS = {
  nickelates: 'Nickelates',
  cuprates: 'Cuprates',
  pnictides: 'Pnictides',
  hydrides: 'Hydrides',
  conventional: 'Conventional',
  wildcards: 'Wildcards',
  failures: 'Failures',
  history: 'History',
};

const ROOM_LABELS = {
  experimental_results: 'Experimental Results',
  failure_memory: 'Failure Memory',
  gap_candidates: 'Gap Candidates',
  substrate_room: 'Substrate Room',
  data_engine: 'Data Engine',
  timeline: 'Tc Timeline',
  brief: 'Research Brief',
  material: 'Material',
};

export function routeToCrumbs(route) {
  if (!route) return ['Palace Overview'];
  if (ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  const parts = route.split('/');
  if (parts[0] === 'material') {
    return ['Nickelates', 'Experimental Results', decodeURIComponent(parts[1] || '')];
  }
  const out = [];
  if (parts[0] && WING_LABELS[parts[0]]) out.push(WING_LABELS[parts[0]]);
  if (parts[1] && ROOM_LABELS[parts[1]]) out.push(ROOM_LABELS[parts[1]]);
  return out.length ? out : [route];
}

export default function BreadcrumbBar({ route, onNavigate, onSearch, searchQuery, onExport }) {
  const crumbs = routeToCrumbs(route);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--line-strong)',
      background: 'var(--bg-base)',
      gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          onClick={() => onNavigate && onNavigate('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <LatticeSpin size={22} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--fg-1)',
            letterSpacing: '-0.01em',
          }}>
            nickelate<span style={{ color: 'var(--fg-2)' }}>.</span><span style={{ color: 'var(--accent)' }}>sc</span>
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
              <span style={{ color: i === crumbs.length - 1 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {c}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          value={searchQuery || ''}
          onChange={e => onSearch && onSearch(e.target.value)}
          placeholder="search materials…"
          style={{
            width: 200,
            padding: '6px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}
        />
        <button
          onClick={onExport}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '6px 12px',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          export
        </button>
      </div>
    </div>
  );
}
