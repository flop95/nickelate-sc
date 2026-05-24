import { useEffect, useMemo, useState } from 'react';
import { SplitPane, Pane } from 'react-split-pane';
import WingTree from './WingTree.jsx';
import BreadcrumbBar from './BreadcrumbBar.jsx';
import InspectorPanel from './InspectorPanel.jsx';
import PalaceOverview from './PalaceOverview.jsx';
import SearchView from './SearchView.jsx';
import FailureBrowser from './FailureBrowser.jsx';
import StatsView from './StatsView.jsx';
import MaterialPage from './MaterialPage.jsx';
import WingRoomView from './WingRoomView.jsx';
import GapsView from './GapsView.jsx';
import MaterialCard from './MaterialCard.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import {
  DEFAULT_PRESSURE_MODE,
  PRESSURE_MODE_IDS,
  countByPressureMode,
  filterByPressureMode,
  pressureModeLabel,
} from '../utils/pressureModes.js';

import NickelateEngine from './NickelateEngine.jsx';
import NickelateTimeline from './NickelateTimeline.jsx';
import NickelateScreener from './NickelateSubstrateScreener.jsx';

import nickelateDataset from '../data/nickelate_dataset.json';
import patterns from '../data/patterns.json';
import predictions from '../data/predictions.json';
import arxivAlerts from '../data/arxiv_alerts.json';
import drawers from '../data/palace/palace_drawers.json';
import gates from '../data/palace/palace_gates.json';
import gaps from '../data/palace/palace_gaps_nickelates.json';
import failures from '../data/palace/palace_failures.json';
import lessons from '../data/palace/palace_lessons.json';
import proposals from '../data/palace/palace_proposals.json';
import stats from '../data/palace/palace_stats.json';
import './PalaceShell.css';

const DEFAULT_ROUTE = 'overview';

const STATIC_ROUTES = new Set([
  'overview',
  'search',
  'failures',
  'stats',
  'history/timeline',
  'history/brief',
  'nickelates/data_engine',
  'nickelates/substrate_room',
  'nickelates/gap_candidates',
  'nickelates/failure_memory',
]);

const EXPERIMENTAL_WINGS = new Set([
  'nickelates',
  'cuprates',
  'pnictides',
  'hydrides',
  'conventional',
  'wildcards',
]);

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function normalizePressureMode(value) {
  return PRESSURE_MODE_IDS.includes(value) ? value : DEFAULT_PRESSURE_MODE;
}

function normalizeMaterialRoute(route) {
  const materialRoute = route.slice('material/'.length);
  const [encodedIdOrName] = materialRoute.split('/');
  const idOrName = safeDecodeURIComponent(encodedIdOrName || '');
  if (!idOrName) return DEFAULT_ROUTE;

  const id = Number(idOrName);
  const drawer = Number.isInteger(id)
    ? drawers.find(d => d.id === id)
    : drawers.find(d => d.material === idOrName);

  return drawer
    ? `material/${drawer.id}/${encodeURIComponent(drawer.material)}`
    : DEFAULT_ROUTE;
}

function normalizeRoute(value) {
  const route = String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!route) return DEFAULT_ROUTE;
  if (STATIC_ROUTES.has(route)) return route;

  if (route.endsWith('/experimental_results')) {
    const [wing, room] = route.split('/');
    if (room === 'experimental_results' && EXPERIMENTAL_WINGS.has(wing)) {
      return route;
    }
  }

  if (route.startsWith('material/')) {
    return normalizeMaterialRoute(route);
  }

  return DEFAULT_ROUTE;
}

function readUrlState() {
  if (typeof window === 'undefined') {
    return { route: DEFAULT_ROUTE, pressureMode: DEFAULT_PRESSURE_MODE };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  const hashBody = hash.startsWith('/') ? hash.slice(1) : hash;
  const [hashRoute = '', hashQuery = ''] = hashBody.split('?');
  const hashParams = new URLSearchParams(hashQuery);

  const routeParam = hashParams.get('route') || hashRoute || searchParams.get('route');
  const pressureParam =
    hashParams.get('mode') ||
    hashParams.get('pressure') ||
    searchParams.get('mode') ||
    searchParams.get('pressure');

  return {
    route: normalizeRoute(routeParam || DEFAULT_ROUTE),
    pressureMode: normalizePressureMode(pressureParam),
  };
}

function urlHashFor(route, pressureMode) {
  return `#/${normalizeRoute(route)}?mode=${normalizePressureMode(pressureMode)}`;
}

function replaceUrlState(route, pressureMode) {
  if (typeof window === 'undefined') return;
  const nextHash = urlHashFor(route, pressureMode);
  if (window.location.hash === nextHash) return;
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${nextHash}`
  );
}

export default function PalaceShell() {
  const initialUrlState = useMemo(() => readUrlState(), []);
  const [activeRoute, setActiveRoute] = useState(initialUrlState.route);
  const [selection, setSelection] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNarrow, setIsNarrow] = useState(false);
  const [pressureMode, setPressureMode] = useState(initialUrlState.pressureMode);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const applyUrlState = () => {
      const next = readUrlState();
      setActiveRoute(current => current === next.route ? current : next.route);
      setPressureMode(current => current === next.pressureMode ? current : next.pressureMode);
    };

    window.addEventListener('hashchange', applyUrlState);
    window.addEventListener('popstate', applyUrlState);
    return () => {
      window.removeEventListener('hashchange', applyUrlState);
      window.removeEventListener('popstate', applyUrlState);
    };
  }, []);

  useEffect(() => {
    replaceUrlState(activeRoute, pressureMode);
  }, [activeRoute, pressureMode]);

  const pressureModeCounts = useMemo(() => countByPressureMode(drawers), []);
  const modeDrawers = useMemo(
    () => filterByPressureMode(drawers, pressureMode),
    [pressureMode]
  );

  const navigate = route => {
    const nextRoute = normalizeRoute(route);
    setActiveRoute(nextRoute);
    // Keep selection when moving to a material route; else let it breathe
    if (!nextRoute.startsWith('material/')) {
      // do nothing — selection persists so the inspector stays useful
    }
  };

  const changePressureMode = mode => {
    setPressureMode(normalizePressureMode(mode));
  };

  const select = sel => {
    setSelection(sel);
    if (inspectorCollapsed) setInspectorCollapsed(false);
  };

  // Filter drawers by sidebar search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return modeDrawers.filter(d =>
      (d.material || '').toLowerCase().includes(q) ||
      (d.properties?.substrate || '').toLowerCase().includes(q)
    );
  }, [modeDrawers, searchQuery]);

  const handleExport = () => {
    const exportedAt = new Date().toISOString();
    const payload = {
      schema: 'nickelate-sc.corpus.v2',
      exported_at: exportedAt,
      issue: {
        title: 'nickelate.sc Vol. 1, No. 1',
        date: 'April 2026',
        status: 'pseudonymous curated static review index; no DOI, no peer review, source repository private; hypothesis rankings are not verified measurements',
      },
      view: {
        route: activeRoute,
        pressure_mode: pressureMode,
        filtered_drawers: modeDrawers,
      },
      corpus: {
        nickelate_dataset: nickelateDataset,
        patterns,
        predictions,
        arxiv_alerts: arxivAlerts,
        palace: {
          stats,
          gates,
          drawers,
          gaps,
          failures,
          lessons,
          proposals,
        },
      },
      caveats: [
        'Measurements and references are manually curated from public literature and preprints.',
        'Gap candidates are feature-distance hypotheses, not forecasts or first-principles predictions.',
        'Similarity scores and priority labels are curator heuristics, not probabilities.',
        'The rendered site and JSON export are public; the source repository and review history are private.',
        'Use source_url and source_doi fields to re-check references before citing this export.',
      ],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nickelate-sc-corpus-${exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wingCounts = useMemo(() => {
    const c = {};
    for (const d of modeDrawers) c[d.wing] = (c[d.wing] || 0) + 1;
    c['nickelates/experimental_results'] = modeDrawers.filter(d => d.wing === 'nickelates').length;
    c['cuprates/experimental_results'] = modeDrawers.filter(d => d.wing === 'cuprates').length;
    c['pnictides/experimental_results'] = modeDrawers.filter(d => d.wing === 'pnictides').length;
    c['hydrides/experimental_results'] = modeDrawers.filter(d => d.wing === 'hydrides').length;
    c['conventional/experimental_results'] = modeDrawers.filter(d => d.wing === 'conventional').length;
    c['wildcards/experimental_results'] = modeDrawers.filter(d => d.wing === 'wildcards').length;
    return c;
  }, [modeDrawers]);

  const centerContent = searchFiltered ? (
    <SearchResultsInline results={searchFiltered} onSelect={select} selection={selection} query={searchQuery} pressureMode={pressureMode} />
  ) : (
    <RouteContent
      route={activeRoute}
      onNavigate={navigate}
      onSelect={select}
      selection={selection}
      pressureMode={pressureMode}
    />
  );

  const inspectorContent = (
    <ErrorBoundary>
      <InspectorPanel
        selection={selection}
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed(c => !c)}
        onNavigate={navigate}
      />
    </ErrorBoundary>
  );

  return (
    <div className={`palace-shell${isNarrow ? ' is-mobile' : ''}`}>
      <BreadcrumbBar
        route={activeRoute}
        onNavigate={navigate}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onExport={handleExport}
        pressureMode={pressureMode}
        onPressureModeChange={changePressureMode}
        pressureModeCounts={pressureModeCounts}
      />

      {isNarrow ? (
        <div className="palace-mobile-workspace">
          <nav className="pane-sidebar palace-mobile-nav" aria-label="Palace navigation">
            <WingTree activeRoute={activeRoute} onNavigate={navigate} counts={wingCounts} />
          </nav>

          <main className="pane-center palace-mobile-center">
            {centerContent}
          </main>

          {selection && !inspectorCollapsed && (
            <aside className="pane-inspector palace-mobile-inspector">
              {inspectorContent}
            </aside>
          )}
        </div>
      ) : (
        <div className="palace-workspace">
        <SplitPane direction="horizontal" className="palace-split">
          <Pane defaultSize="248px" minSize="180px" maxSize="420px">
            <div className="pane-sidebar" style={{ height: '100%', overflowY: 'auto' }}>
              <WingTree activeRoute={activeRoute} onNavigate={navigate} counts={wingCounts} />
            </div>
          </Pane>

          <Pane minSize="320px">
            <main className="pane-center" style={{ height: '100%', overflowY: 'auto', minWidth: 0 }}>
              {centerContent}
            </main>
          </Pane>

          <Pane
            defaultSize={inspectorCollapsed ? '16px' : '340px'}
            minSize={inspectorCollapsed ? '16px' : '240px'}
            maxSize="520px"
          >
            <div className="pane-inspector" style={{ height: '100%', overflowY: 'auto' }}>
              {inspectorContent}
            </div>
          </Pane>
        </SplitPane>
        </div>
      )}
    </div>
  );
}

function RouteContent({ route, onNavigate, onSelect, selection, pressureMode }) {
  if (route === 'overview') return <PalaceOverview onNavigate={onNavigate} onSelect={onSelect} pressureMode={pressureMode} />;
  if (route === 'search') return <SearchView onSelect={onSelect} pressureMode={pressureMode} />;
  if (route === 'failures') return <FailureBrowser onSelect={onSelect} selection={selection} pressureMode={pressureMode} />;
  if (route === 'stats') return <StatsView pressureMode={pressureMode} />;

  if (route === 'history/timeline') return <Wrap><NickelateTimeline pressureMode={pressureMode} /></Wrap>;
  if (route === 'history/brief') return <ResearchBriefView />;

  if (route === 'nickelates/data_engine') return <Wrap><NickelateEngine pressureMode={pressureMode} /></Wrap>;
  if (route === 'nickelates/substrate_room') return <Wrap><NickelateScreener pressureMode={pressureMode} /></Wrap>;
  if (route === 'nickelates/gap_candidates') return <GapsView pressureMode={pressureMode} />;
  if (route === 'nickelates/failure_memory') return <FailureBrowser onSelect={onSelect} selection={selection} pressureMode={pressureMode} />;

  if (route.endsWith('/experimental_results')) {
    const wing = route.split('/')[0];
    return <WingRoomView wing={wing} onSelect={onSelect} selection={selection} pressureMode={pressureMode} />;
  }

  if (route.startsWith('material/')) {
    const materialRoute = route.slice('material/'.length);
    const [encodedIdOrName] = materialRoute.split('/');
    const decoded = safeDecodeURIComponent(encodedIdOrName || '') || '';
    const id = Number(decoded);
    const name = decoded;
    const drawer = Number.isInteger(id)
      ? drawers.find(d => d.id === id)
      : drawers.find(d => d.material === name);
    return drawer
      ? <MaterialPage drawer={drawer} onSelect={onSelect} pressureMode={pressureMode} />
      : <Empty msg={`material not found: ${name}`} />;
  }

  return <Empty msg={`unknown route: ${route}`} />;
}

function Wrap({ children }) {
  // Existing legacy components were designed for a centered 960px column.
  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1040 }}>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{
      padding: 48,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--color-text-muted)',
    }}>
      {msg}
    </div>
  );
}

function ResearchBriefView() {
  const briefHref = import.meta.env.PROD
    ? `${import.meta.env.BASE_URL.replace(/\/app\/?$/, '/')}research-brief.html`
    : '/docs/research-brief.html';

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        history
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 16 }}>
        research brief
      </h1>
      <a
        href={briefHref}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: '8px 14px',
          border: '1px solid var(--line-strong)',
          color: 'var(--text-secondary)',
        }}
      >
        open brief →
      </a>
    </div>
  );
}

function SearchResultsInline({ results, onSelect, selection, query, pressureMode }) {
  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        global search
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
        "{query}"
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {results.length} {pressureModeLabel(pressureMode)} matches across all wings
      </div>
      <div style={{ border: '1px solid var(--color-border-subtle)' }}>
        {results.map(d => (
          <MaterialCard
            key={d.id}
            drawer={d}
            onClick={() => onSelect({ kind: 'drawer', drawer: d })}
            selected={selection?.kind === 'drawer' && selection.drawer.id === d.id}
          />
        ))}
        {results.length === 0 && (
          <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
            no matches
          </div>
        )}
      </div>
    </div>
  );
}
