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
    <header className="palace-masthead">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, minWidth: 0 }}>
        <div
          onClick={() => onNavigate && onNavigate('overview')}
          className="palace-brand-lockup"
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate && onNavigate('overview');
            }
          }}
        >
          <LatticeSpin size={22} />
          <span className="palace-brand">
            nickelate<span style={{ color: 'var(--ink-55)' }}>.</span>sc
          </span>
        </div>
        <div className="palace-crumbs" aria-label="Current route">
          {crumbs.map((c, i) => (
            <span key={i} className="palace-crumb">
              {i > 0 && <span className="palace-crumb-separator">/</span>}
              <span className={i === crumbs.length - 1 ? 'palace-crumb-current' : undefined}>
                {c}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="palace-tools">
        <input
          type="text"
          value={searchQuery || ''}
          onChange={e => onSearch && onSearch(e.target.value)}
          placeholder="search materials…"
          className="palace-search"
        />
        <button
          onClick={onExport}
          className="palace-export"
        >
          export
        </button>
      </div>
    </header>
  );
}
