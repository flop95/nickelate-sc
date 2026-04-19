import { useMemo, useState } from 'react';
import drawers from '../data/palace/palace_drawers.json';
import failures from '../data/palace/palace_failures.json';
import normData from '../data/palace/palace_normalizer.json';
import BitmaskGrid16 from './BitmaskGrid16.jsx';
import DataTable from './DataTable.jsx';
import TcValue from './TcValue.jsx';
import { searchSimilar } from '../utils/retrieval.js';

const EMPTY_QUERY = {
  material: '',
  substrate: '',
  strain: '',
  onset_tc: '',
  zero_r_tc: '',
  film_a: '',
  film_c: '',
  thickness: '',
  doping: '',
  pressure_class: 'Ambient',
  year: '',
  _family: 'nickelates',
};

export default function SearchView({ onSelect }) {
  const [query, setQuery] = useState(EMPTY_QUERY);
  const [seedId, setSeedId] = useState('');

  const materialOptions = useMemo(() =>
    drawers.map(d => ({ id: d.id, label: `${d.material}${d.properties?.substrate ? ' / ' + d.properties.substrate : ''}` })),
    []
  );

  const parsed = useMemo(() => {
    const out = { ...query };
    for (const k of ['strain', 'onset_tc', 'zero_r_tc', 'film_a', 'film_c', 'thickness', 'year']) {
      out[k] = out[k] === '' ? null : Number(out[k]);
    }
    return out;
  }, [query]);

  const result = useMemo(
    () => searchSimilar(parsed, drawers, failures, normData.normalizer, { topK: 12, maxHamming: 4 }),
    [parsed]
  );

  // Flatten results for the table
  const rows = useMemo(() => result.results.map((r, i) => ({
    rank: i + 1,
    drawer: r.drawer,
    material: r.drawer.material,
    wing: r.drawer.wing,
    substrate: r.drawer.properties?.substrate || '',
    onset_tc: r.drawer.properties?.onset_tc ?? null,
    hamming: r.hamming,
    cosine: r.cosine,
    warnings: r.warnings.length,
    bitmask: r.drawer.bitmask,
  })), [result]);

  const columns = useMemo(() => [
    {
      id: 'rank',
      header: '#',
      accessorKey: 'rank',
      size: '36px',
      enableColumnFilter: false,
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {String(info.getValue()).padStart(2, '0')}
        </span>
      ),
    },
    {
      id: 'material',
      header: 'material',
      accessorKey: 'material',
      size: '1fr',
      cell: info => {
        const r = info.row.original;
        return (
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
              {r.material}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {r.substrate || '—'} · {r.wing}
            </div>
          </div>
        );
      },
    },
    {
      id: 'fingerprint',
      header: 'fingerprint',
      size: '96px',
      enableColumnFilter: false,
      enableSorting: false,
      cell: info => <BitmaskGrid16 bitmask={info.row.original.bitmask} size="inline" />,
    },
    {
      id: 'hamming',
      header: 'hamming',
      accessorKey: 'hamming',
      size: '70px',
      enableColumnFilter: false,
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right', display: 'block' }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      id: 'cosine',
      header: 'cosine',
      accessorKey: 'cosine',
      size: '80px',
      enableColumnFilter: false,
      cell: info => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right', display: 'block' }}>
          {info.getValue().toFixed(3)}
        </span>
      ),
    },
    {
      id: 'onset_tc',
      header: 'onset Tc',
      accessorKey: 'onset_tc',
      size: '80px',
      enableColumnFilter: false,
      cell: info => <TcValue value={info.getValue()} />,
    },
    {
      id: 'warnings',
      header: '!',
      accessorKey: 'warnings',
      size: '36px',
      enableColumnFilter: false,
      cell: info => info.getValue() > 0 ? (
        <span title="related failures" style={{ color: 'var(--color-failure)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>!</span>
      ) : null,
    },
  ], []);

  const loadSeed = id => {
    setSeedId(id);
    if (!id) { setQuery(EMPTY_QUERY); return; }
    const d = drawers.find(x => x.id === Number(id));
    if (!d) return;
    const p = d.properties || {};
    setQuery({
      ...EMPTY_QUERY,
      material: p.material || '',
      substrate: p.substrate || '',
      strain: p.strain ?? '',
      onset_tc: p.onset_tc ?? '',
      zero_r_tc: p.zero_r_tc ?? '',
      film_a: p.film_a ?? '',
      film_c: p.film_c ?? '',
      thickness: p.thickness ?? '',
      doping: p.doping || '',
      pressure_class: p.pressure_class || 'Ambient',
      year: p.year ?? '',
      _family: d.wing,
    });
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--font-body)', maxWidth: 1300 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        two-stage retrieval
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 20 }}>
        search materials
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32 }}>
        <div>
          <Label>Seed from existing</Label>
          <select
            value={seedId}
            onChange={e => loadSeed(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
          >
            <option value="">(start empty)</option>
            {materialOptions.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <Label>Query properties</Label>
          <Field label="material" value={query.material} onChange={v => setQuery({ ...query, material: v })} />
          <Field label="substrate" value={query.substrate} onChange={v => setQuery({ ...query, substrate: v })} />
          <Field label="strain %" value={query.strain} onChange={v => setQuery({ ...query, strain: v })} />
          <Field label="onset Tc (K)" value={query.onset_tc} onChange={v => setQuery({ ...query, onset_tc: v })} />
          <Field label="zero-R Tc (K)" value={query.zero_r_tc} onChange={v => setQuery({ ...query, zero_r_tc: v })} />
          <Field label="film a" value={query.film_a} onChange={v => setQuery({ ...query, film_a: v })} />
          <Field label="film c" value={query.film_c} onChange={v => setQuery({ ...query, film_c: v })} />
          <Field label="doping" value={query.doping} onChange={v => setQuery({ ...query, doping: v })} />
          <Field label="pressure class" value={query.pressure_class} onChange={v => setQuery({ ...query, pressure_class: v })} />
          <Field label="year" value={query.year} onChange={v => setQuery({ ...query, year: v })} />
        </div>

        <div>
          <Label>Query bitmask</Label>
          <BitmaskGrid16 bitmask={result.queryBitmask} size="signature" />

          <div style={{ marginTop: 24 }}>
            <Label>Retrieval method</Label>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Stage 1: Hamming ≤ 4 cone → {result.matchesInCone} candidates · Stage 2: cosine rerank on 8-feature vector
            </div>
          </div>

          <Label>Results</Label>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={r => r.drawer.id}
            onRowClick={r => onSelect && onSelect({ kind: 'drawer', drawer: r.drawer })}
            compact
          />
        </div>
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
      marginBottom: 8,
    }}>{children}</div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--color-text-muted)',
        marginBottom: 2,
      }}>{label}</div>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%' }}
      />
    </div>
  );
}
