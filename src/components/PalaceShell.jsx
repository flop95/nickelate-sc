import { useMemo, useState } from 'react';
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

import NickelateEngine from './NickelateEngine.jsx';
import NickelateTimeline from './NickelateTimeline.jsx';
import NickelateScreener from './NickelateSubstrateScreener.jsx';

import drawers from '../data/palace/palace_drawers.json';
import stats from '../data/palace/palace_stats.json';

export default function PalaceShell() {
  const [activeRoute, setActiveRoute] = useState('overview');
  const [selection, setSelection] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = route => {
    setActiveRoute(route);
    // Keep selection when moving to a material route; else let it breathe
    if (!route.startsWith('material/')) {
      // do nothing — selection persists so the inspector stays useful
    }
  };

  const select = sel => {
    setSelection(sel);
    if (inspectorCollapsed) setInspectorCollapsed(false);
  };

  // Filter drawers by sidebar search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return drawers.filter(d =>
      (d.material || '').toLowerCase().includes(q) ||
      (d.properties?.substrate || '').toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleExport = () => {
    const payload = {
      route: activeRoute,
      stats,
      drawers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nickelate-sc-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const wingCounts = useMemo(() => {
    const c = {};
    for (const d of drawers) c[d.wing] = (c[d.wing] || 0) + 1;
    c['nickelates/experimental_results'] = drawers.filter(d => d.wing === 'nickelates').length;
    c['cuprates/experimental_results'] = drawers.filter(d => d.wing === 'cuprates').length;
    c['pnictides/experimental_results'] = drawers.filter(d => d.wing === 'pnictides').length;
    c['hydrides/experimental_results'] = drawers.filter(d => d.wing === 'hydrides').length;
    c['conventional/experimental_results'] = drawers.filter(d => d.wing === 'conventional').length;
    c['wildcards/experimental_results'] = drawers.filter(d => d.wing === 'wildcards').length;
    return c;
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-base)',
    }}>
      <BreadcrumbBar
        route={activeRoute}
        onNavigate={navigate}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onExport={handleExport}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <SplitPane direction="horizontal" className="palace-split">
          <Pane defaultSize="220px" minSize="160px" maxSize="400px">
            <div className="pane-sidebar" style={{ height: '100%', overflowY: 'auto' }}>
              <WingTree activeRoute={activeRoute} onNavigate={navigate} counts={wingCounts} />
            </div>
          </Pane>

          <Pane minSize="320px">
            <main className="pane-center" style={{ height: '100%', overflowY: 'auto', minWidth: 0 }}>
              {searchFiltered ? (
                <SearchResultsInline results={searchFiltered} onSelect={select} selection={selection} query={searchQuery} />
              ) : (
                <RouteContent route={activeRoute} onNavigate={navigate} onSelect={select} selection={selection} />
              )}
            </main>
          </Pane>

          <Pane
            defaultSize={inspectorCollapsed ? '16px' : '320px'}
            minSize={inspectorCollapsed ? '16px' : '240px'}
            maxSize="520px"
          >
            <div className="pane-inspector" style={{ height: '100%', overflowY: 'auto' }}>
              <ErrorBoundary>
                <InspectorPanel
                  selection={selection}
                  collapsed={inspectorCollapsed}
                  onToggle={() => setInspectorCollapsed(c => !c)}
                  onNavigate={navigate}
                />
              </ErrorBoundary>
            </div>
          </Pane>
        </SplitPane>
      </div>
    </div>
  );
}

function RouteContent({ route, onNavigate, onSelect, selection }) {
  if (route === 'overview') return <PalaceOverview onNavigate={onNavigate} onSelect={onSelect} />;
  if (route === 'search') return <SearchView onSelect={onSelect} />;
  if (route === 'failures') return <FailureBrowser onSelect={onSelect} selection={selection} />;
  if (route === 'stats') return <StatsView />;

  if (route === 'history/timeline') return <Wrap><NickelateTimeline /></Wrap>;
  if (route === 'history/brief') return <ResearchBriefView />;

  if (route === 'nickelates/data_engine') return <Wrap><NickelateEngine /></Wrap>;
  if (route === 'nickelates/substrate_room') return <Wrap><NickelateScreener /></Wrap>;
  if (route === 'nickelates/gap_candidates') return <GapsView />;
  if (route === 'nickelates/failure_memory') return <FailureBrowser onSelect={onSelect} selection={selection} />;

  if (route.endsWith('/experimental_results')) {
    const wing = route.split('/')[0];
    return <WingRoomView wing={wing} onSelect={onSelect} selection={selection} />;
  }

  if (route.startsWith('material/')) {
    const name = decodeURIComponent(route.slice('material/'.length));
    const drawer = drawers.find(d => d.material === name);
    return drawer
      ? <MaterialPage drawer={drawer} onSelect={onSelect} />
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
  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        history
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 16 }}>
        research brief
      </h1>
      <a
        href="./nickelate_research_brief.html"
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

function SearchResultsInline({ results, onSelect, selection, query }) {
  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        global search
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>
        "{query}"
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {results.length} matches across all wings
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
