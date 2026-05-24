import { useMemo } from 'react';
import drawers from '../data/palace/palace_drawers.json';
import failures from '../data/palace/palace_failures.json';
import gates from '../data/palace/palace_gates.json';
import DataTable from './DataTable.jsx';
import FailureTag from './FailureTag.jsx';
import { formatWingLabel } from '../utils/displayLabels.js';
import { filterByPressureMode, matchesPressureMode, pressureModeLabel } from '../utils/pressureModes.js';

export default function StatsView({ pressureMode }) {
  const modeDrawers = useMemo(() => filterByPressureMode(drawers, pressureMode), [pressureMode]);
  const drawerById = useMemo(() => new Map(drawers.map(d => [d.id, d])), []);
  const modeFailures = useMemo(
    () => failures.filter(f => matchesPressureMode(drawerById.get(f.drawer_id), pressureMode)),
    [drawerById, pressureMode]
  );
  const total = modeDrawers.length;
  const totalForRate = Math.max(1, total);

  // --- Wings table
  const wingRows = useMemo(() => {
    const counts = {};
    for (const d of modeDrawers) counts[d.wing] = (counts[d.wing] || 0) + 1;
    return Object.entries(counts).map(([wing, count]) => ({ wing, count }));
  }, [modeDrawers]);
  const maxWing = Math.max(1, ...wingRows.map(r => r.count));
  const wingColumns = useMemo(() => [
    {
      id: 'wing', header: 'wing', accessorKey: 'wing', size: '140px',
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{formatWingLabel(info.getValue())}</span>,
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

  // --- Negative results by mode
  const failRows = useMemo(() => {
    const counts = {};
    for (const f of modeFailures) counts[f.failure_type] = (counts[f.failure_type] || 0) + 1;
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [modeFailures]);
  const failTypeMax = Math.max(1, ...failRows.map(r => r.count));
  const failColumns = useMemo(() => [
    {
      id: 'type', header: 'mode', accessorKey: 'type', size: '180px',
      cell: info => <FailureTag type={info.getValue()} />,
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
    const counts = new Array(gates.count).fill(0);
    for (const d of modeDrawers) {
      for (let i = 0; i < gates.count; i++) if ((d.bitmask >>> i) & 1) counts[i]++;
    }
    return gates.gates.map(g => ({
      index: g.index,
      name: g.name,
      label: g.label,
      count: counts[g.index],
      rate: counts[g.index] / totalForRate,
    }));
  }, [modeDrawers, totalForRate]);

  const gateColumns = useMemo(() => [
    {
      id: 'index', header: '#', accessorKey: 'index', size: '44px',
      enableColumnFilter: false,
      cell: info => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>[{String(info.getValue()).padStart(2, '0')}]</span>,
    },
    {
      id: 'label', header: 'gate', accessorKey: 'label', size: '200px',
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
  for (const d of modeDrawers) {
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
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        {total} {pressureModeLabel(pressureMode)} drawers
      </div>

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
          <Label>Negative results by mode</Label>
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
