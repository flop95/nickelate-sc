import { useMemo, useState } from 'react';
import failures from '../data/palace/palace_failures.json';
import drawers from '../data/palace/palace_drawers.json';
import BitmaskGrid16 from './BitmaskGrid16.jsx';
import DataTable from './DataTable.jsx';
import MultiSelectFilter, { FilterChip } from './MultiSelectFilter.jsx';
import FailureTag from './FailureTag.jsx';

// Augment failures with a substrate field pulled from the parent drawer so the
// substrate filter can work off a single source.
function decorate(failuresList, drawerById) {
  return failuresList.map(f => {
    const d = drawerById.get(f.drawer_id);
    return { ...f, substrate: d?.properties?.substrate || '' };
  });
}

function countByField(rows, field) {
  const counts = new Map();
  for (const r of rows) {
    const v = r[field] || '';
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export default function FailureBrowser({ onSelect, selection }) {
  const drawerById = useMemo(() => {
    const m = new Map();
    for (const d of drawers) m.set(d.id, d);
    return m;
  }, []);

  const rows = useMemo(() => decorate(failures, drawerById), [drawerById]);

  // Multi-select filter state lives here — we push it down to the DataTable
  // as controlled `columnFilters`.
  const [typeSel, setTypeSel] = useState([]);
  const [wingSel, setWingSel] = useState([]);
  const [substrateSel, setSubstrateSel] = useState([]);
  const [confSel, setConfSel] = useState([]);

  const typeOptions = useMemo(() => countByField(rows, 'failure_type'), [rows]);
  const wingOptions = useMemo(() => countByField(rows, 'wing'), [rows]);
  const substrateOptions = useMemo(() => countByField(rows, 'substrate'), [rows]);
  const confOptions = useMemo(() => countByField(rows, 'confidence'), [rows]);

  // Controlled TanStack columnFilters — multi-select uses the `arrIncludesSome`
  // filter fn, free-text uses includesString (default).
  const columnFilters = useMemo(() => {
    const out = [];
    if (typeSel.length) out.push({ id: 'failure_type', value: typeSel });
    if (wingSel.length) out.push({ id: 'wing', value: wingSel });
    if (substrateSel.length) out.push({ id: 'substrate', value: substrateSel });
    if (confSel.length) out.push({ id: 'confidence', value: confSel });
    return out;
  }, [typeSel, wingSel, substrateSel, confSel]);

  const clearAll = () => {
    setTypeSel([]); setWingSel([]); setSubstrateSel([]); setConfSel([]);
  };

  const anySelected = typeSel.length + wingSel.length + substrateSel.length + confSel.length > 0;

  const columns = useMemo(() => [
    {
      id: 'material',
      header: 'material',
      accessorKey: 'material',
      size: '180px',
      // free-text filter keeps working on this column
      cell: info => (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'failure_type',
      header: 'type',
      accessorKey: 'failure_type',
      size: '170px',
      enableColumnFilter: true, // controlled via multi-select above
      filterFn: 'arrIncludesSome',
      meta: { hideFilterInput: true },
      cell: info => <FailureTag type={info.getValue()} />,
    },
    {
      id: 'wing',
      header: 'wing',
      accessorKey: 'wing',
      size: '100px',
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: { hideFilterInput: true },
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'substrate',
      header: 'substrate',
      accessorKey: 'substrate',
      size: '110px',
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: { hideFilterInput: true },
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>
          {info.getValue() || '—'}
        </span>
      ),
    },
    {
      id: 'confidence',
      header: 'confidence',
      accessorKey: 'confidence',
      size: '100px',
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: { hideFilterInput: true },
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'mechanism',
      header: 'suspected mechanism',
      accessorKey: 'suspected_mechanism',
      size: '1fr',
      // free-text filter
      cell: info => (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'bitmask',
      header: 'fingerprint',
      size: '120px',
      enableColumnFilter: false,
      enableSorting: false,
      cell: info => {
        const drawer = drawerById.get(info.row.original.drawer_id);
        return drawer ? <BitmaskGrid16 bitmask={drawer.bitmask} size="inline" /> : null;
      },
    },
  ], [drawerById]);

  const selectedId = selection?.kind === 'failure' ? selection.failure.id : null;

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 1250 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        failure memory
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 20 }}>
        falsified & failed claims
      </h1>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <MultiSelectFilter label="Failure Type" options={typeOptions} selected={typeSel} onChange={setTypeSel} />
        <MultiSelectFilter label="Wing" options={wingOptions} selected={wingSel} onChange={setWingSel} />
        <MultiSelectFilter label="Substrate" options={substrateOptions} selected={substrateSel} onChange={setSubstrateSel} />
        <MultiSelectFilter label="Confidence" options={confOptions} selected={confSel} onChange={setConfSel} />
      </div>

      {/* Chip row */}
      {anySelected && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          {typeSel.map(v => <FilterChip key={'t' + v} label={v} onRemove={() => setTypeSel(typeSel.filter(x => x !== v))} />)}
          {wingSel.map(v => <FilterChip key={'w' + v} label={v} onRemove={() => setWingSel(wingSel.filter(x => x !== v))} />)}
          {substrateSel.map(v => <FilterChip key={'s' + v} label={v || '(empty)'} onRemove={() => setSubstrateSel(substrateSel.filter(x => x !== v))} />)}
          {confSel.map(v => <FilterChip key={'c' + v} label={v} onRemove={() => setConfSel(confSel.filter(x => x !== v))} />)}
          <span
            onClick={clearAll}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              marginLeft: 4,
              textDecoration: 'underline',
            }}
          >
            clear all
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        onRowClick={f => onSelect && onSelect({ kind: 'failure', failure: f })}
        getRowId={f => f.id}
        selectedId={selectedId}
        initialSorting={[{ id: 'failure_type', desc: false }]}
        pinnedColumnFilters={columnFilters}
        showFilters={true}
      />
    </div>
  );
}
