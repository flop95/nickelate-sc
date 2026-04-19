import { useMemo } from 'react';
import BitmaskGrid16 from './BitmaskGrid16.jsx';
import DataTable from './DataTable.jsx';
import TcValue from './TcValue.jsx';
import FailureTag from './FailureTag.jsx';
import { passCount, hammingDistance } from '../utils/bitmask.js';
import drawers from '../data/palace/palace_drawers.json';
import failures from '../data/palace/palace_failures.json';
import normData from '../data/palace/palace_normalizer.json';
import { searchSimilar } from '../utils/retrieval.js';

// Center-pane detail view. Takes a drawer directly OR a material name + wing filter.
export default function MaterialPage({ drawer, onSelect }) {
  if (!drawer) return null;
  const p = drawer.properties || {};
  const passes = passCount(drawer.bitmask);

  // Similar materials in the same wing (skip self).
  const pool = drawers.filter(d => d.id !== drawer.id);
  const sim = searchSimilar(p, pool, failures, normData.normalizer, { topK: 5, maxHamming: 4 });
  const nearestHighTc = [...pool]
    .filter(d => (d.properties?.onset_tc ?? 0) > 30)
    .map(d => ({ d, h: hammingDistance(drawer.bitmask, d.bitmask) }))
    .sort((a, b) => a.h - b.h)[0];

  const relatedFailures = failures.filter(f =>
    f.drawer_id === drawer.id ||
    (f.structural_change_from && f.structural_change_from.includes(drawer.material))
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, fontFamily: 'var(--font-body)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {drawer.wing} / {drawer.room}
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 20 }}>
        {drawer.material}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40, marginBottom: 32 }}>
        <div>
          <Label>Gates {passes}/16</Label>
          <BitmaskGrid16 bitmask={drawer.bitmask} size="signature" />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-text-muted)',
            marginTop: 40,
          }}>
            This material passes <span style={{ color: 'var(--color-accent)' }}>{passes}/16</span> gates.
            {nearestHighTc && (
              <>
                <br />Nearest high-Tc analog: <span style={{ color: 'var(--color-text)' }}>{nearestHighTc.d.material}</span>
                {' '}(shares {16 - nearestHighTc.h}/16 gates).
              </>
            )}
          </div>
        </div>

        <div>
          <Label>Properties</Label>
          <PropsTable props={p} />
          {p.notes && (
            <div style={{ marginTop: 16 }}>
              <Label>Notes</Label>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
                {p.notes}
              </div>
            </div>
          )}
          {drawer.source && (
            <div style={{ marginTop: 12 }}>
              <Label>Source</Label>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                {drawer.source}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <Label>Similar materials</Label>
          <SimilarTable sim={sim} onSelect={onSelect} />
        </div>

        <div>
          <Label>Related failures</Label>
          <div style={{ border: '1px solid var(--color-border-subtle)', padding: 12 }}>
            {relatedFailures.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                none on record
              </div>
            )}
            {relatedFailures.map(f => (
              <div
                key={f.id}
                onClick={() => onSelect && onSelect({ kind: 'failure', failure: f })}
                style={{
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text)', marginBottom: 2 }}>
                  {f.material}
                </div>
<FailureTag type={f.failure_type} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarTable({ sim, onSelect }) {
  const rows = useMemo(() => sim.results.map(r => ({
    drawer: r.drawer,
    material: r.drawer.material,
    wing: r.drawer.wing,
    hamming: r.hamming,
    cosine: r.cosine,
    bitmask: r.drawer.bitmask,
    onset_tc: r.drawer.properties?.onset_tc ?? null,
  })), [sim]);

  const columns = useMemo(() => [
    {
      id: 'material',
      header: 'material',
      accessorKey: 'material',
      size: '1fr',
      cell: info => (
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
            {info.getValue()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {info.row.original.wing}
          </div>
        </div>
      ),
    },
    {
      id: 'fingerprint',
      header: 'fp',
      size: '80px',
      enableColumnFilter: false,
      enableSorting: false,
      cell: info => <BitmaskGrid16 bitmask={info.row.original.bitmask} size="inline" />,
    },
    {
      id: 'hamming',
      header: 'h',
      accessorKey: 'hamming',
      size: '40px',
      enableColumnFilter: false,
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right', display: 'block' }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'cosine',
      header: 'cos',
      accessorKey: 'cosine',
      size: '60px',
      enableColumnFilter: false,
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right', display: 'block' }}>
          {info.getValue().toFixed(3)}
        </span>
      ),
    },
    {
      id: 'onset_tc',
      header: 'Tc',
      accessorKey: 'onset_tc',
      size: '60px',
      enableColumnFilter: false,
      cell: info => <TcValue value={info.getValue()} size={11} />,
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={r => r.drawer.id}
      onRowClick={r => onSelect && onSelect({ kind: 'drawer', drawer: r.drawer })}
      compact
      showFilters={false}
    />
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
      marginBottom: 8,
    }}>{children}</div>
  );
}

function PropsTable({ props }) {
  const keys = ['substrate', 'onset_tc', 'zero_r_tc', 'strain', 'film_a', 'film_c', 'thickness', 'doping', 'pressure_class', 'year', 'growth_method', 'oxygen_treatment', 'group'];
  const shown = keys.filter(k => props[k] != null && props[k] !== '');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px 24px' }}>
      {shown.map(k => (
        <div key={k} style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: '4px 0',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
          <span style={{ color: 'var(--color-text)' }}>{String(props[k])}</span>
        </div>
      ))}
    </div>
  );
}
