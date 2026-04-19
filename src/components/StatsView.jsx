import { useMemo } from 'react';
import stats from '../data/palace/palace_stats.json';
import drawers from '../data/palace/palace_drawers.json';
import gates from '../data/palace/palace_gates.json';
import DataTable from './DataTable.jsx';

export default function StatsView() {
  const total = drawers.length;
  const maxWing = Math.max(...Object.values(stats.drawers_per_wing));
  const failTypeMax = Math.max(1, ...Object.values(stats.failures_by_type));

  // --- Wings table
  const wingRows = useMemo(
    () => Object.entries(stats.drawers_per_wing).map(([wing, count]) => ({ wing, count })),
    []
  );
  const wingColumns = useMemo(() => [
    {
      id: 'wing', header: 'wing', accessorKey: 'wing', size: '140px',
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{info.getValue()}</span>,
    },
    {
      id: 'bar', header: 'distribution', size: '1fr',
      enableColumnFilter: false, enableSorting: false,
      cell: info => (
        <div style={{ height: 6, background: 'var(--color-border-subtle)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(info.row.original.count / maxWing) * 100}%`,
            background: 'var(--text-secondary)', opacity: 0.5,
          }} />
        </div>
      ),
    },
    {
      id: 'count', header: 'count', accessorKey: 'count', size: '60px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text)', textAlign: 'right', display: 'block' }}>{info.getValue()}</span>,
    },
  ], [maxWing]);

  // --- Failures by type
  const failRows = useMemo(
    () => Object.entries(stats.failures_by_type).map(([type, count]) => ({ type, count })),
    []
  );
  const failColumns = useMemo(() => [
    {
      id: 'type', header: 'failure type', accessorKey: 'type', size: '180px',
      cell: info => (
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-failure)',
          background: 'var(--color-failure-bg)',
          border: '1px solid var(--color-failure-border)',
          padding: '2px 6px',
        }}>{info.getValue()}</span>
      ),
    },
    {
      id: 'bar', header: 'distribution', size: '1fr',
      enableColumnFilter: false, enableSorting: false,
      cell: info => (
        <div style={{ height: 6, background: 'var(--color-border-subtle)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(info.row.original.count / failTypeMax) * 100}%`,
            background: 'var(--text-secondary)', opacity: 0.5,
          }} />
        </div>
      ),
    },
    {
      id: 'count', header: 'count', accessorKey: 'count', size: '60px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text)', textAlign: 'right', display: 'block' }}>{info.getValue()}</span>,
    },
  ], [failTypeMax]);

  // --- Gate pass rates
  const gateRows = useMemo(() => {
    const counts = new Array(16).fill(0);
    for (const d of drawers) {
      for (let i = 0; i < 16; i++) if ((d.bitmask >> i) & 1) counts[i]++;
    }
    return gates.map(g => ({
      index: g.index,
      name: g.name,
      label: g.label,
      count: counts[g.index],
      rate: counts[g.index] / total,
    }));
  }, [total]);

  const gateColumns = useMemo(() => [
    {
      id: 'index', header: '#', accessorKey: 'index', size: '44px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>[{String(info.getValue()).padStart(2, '0')}]</span>,
    },
    {
      id: 'name', header: 'gate', accessorKey: 'name', size: '200px',
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{info.getValue()}</span>,
    },
    {
      id: 'bar', header: 'pass rate', size: '1fr',
      enableColumnFilter: false, enableSorting: false,
      cell: info => (
        <div style={{ height: 6, background: 'var(--color-border-subtle)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${info.row.original.rate * 100}%`,
            background: 'var(--text-secondary)', opacity: 0.5,
          }} />
        </div>
      ),
    },
    {
      id: 'rate', header: '%', accessorKey: 'rate', size: '70px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text)', textAlign: 'right', display: 'block' }}>{(info.getValue() * 100).toFixed(0)}%</span>,
    },
    {
      id: 'count', header: 'n/N', accessorKey: 'count', size: '70px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', display: 'block' }}>{info.getValue()}/{total}</span>,
    },
  ], [total]);

  // --- Year coverage
  const yearMap = {};
  for (const d of drawers) {
    const y = d.properties?.year;
    if (y) yearMap[y] = (yearMap[y] || 0) + 1;
  }
  const yearEntries = Object.entries(yearMap).map(([y, c]) => ({ year: Number(y), count: c })).sort((a, b) => a.year - b.year);
  const maxYearCount = Math.max(1, ...yearEntries.map(e => e.count));

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 1200 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        palace statistics
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 24 }}>
        coverage & distribution
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <Label>Materials by wing</Label>
          <DataTable
            columns={wingColumns}
            data={wingRows}
            getRowId={r => r.wing}
            initialSorting={[{ id: 'count', desc: true }]}
            compact
            showFilters={false}
          />
        </div>
        <div>
          <Label>Failures by type</Label>
          {failRows.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>none recorded</div>
          ) : (
            <DataTable
              columns={failColumns}
              data={failRows}
              getRowId={r => r.type}
              initialSorting={[{ id: 'count', desc: true }]}
              compact
              showFilters={false}
            />
          )}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Label>Data coverage over time</Label>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, borderBottom: '1px solid var(--color-border)' }}>
          {yearEntries.map(e => {
            const h = (e.count / maxYearCount) * 100;
            return (
              <div key={e.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', background: 'var(--text-secondary)', opacity: 0.4, height: `${h}%` }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {e.year}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Gate pass rates — click headers to sort (most / least selective)</Label>
        <DataTable
          columns={gateColumns}
          data={gateRows}
          getRowId={r => r.index}
          initialSorting={[{ id: 'rate', desc: true }]}
          compact
          showFilters={false}
        />
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--color-text-muted)',
      marginBottom: 12,
    }}>{children}</div>
  );
}
