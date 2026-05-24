// Rebuilds dist/rankings.json and dist/corpus.json from the curated JSON
// inputs in src/data/, without going through the React app. Documented in
// docs/ranking_method.md. Run with: npm run build:rankings

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
}

const dataset = readJson('src/data/nickelate_dataset.json');
const drawers = readJson('src/data/palace/palace_drawers.json');
const gaps = readJson('src/data/palace/palace_gaps_nickelates.json');
const failures = readJson('src/data/palace/palace_failures.json');
const gates = readJson('src/data/palace/palace_gates.json');
const predictions = readJson('src/data/predictions.json');
const pkg = readJson('package.json');

const GATE_COUNT = gates.count;
const DRAWER_BY_ID = new Map(drawers.map(d => [d.id, d]));

function popcount(n) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function hammingDistance(a, b) {
  return popcount((a ^ b) >>> 0);
}

function resolveAnchorDrawer(gap) {
  return DRAWER_BY_ID.get(gap.anchor_drawer_id)
    || drawers.find(d => d.material === gap.anchor_material && d.wing === 'nickelates')
    || drawers.find(d => d.material === gap.anchor_material);
}

// Re-derive the gap-candidate ranking the UI computes. This mirrors the
// PromisingLane sort in src/components/PalaceOverview.jsx: distance asc,
// then anchor onset Tc desc. Risk label comes from the minimum Hamming
// distance to any drawer flagged as a failure.
const failureDrawers = failures
  .map(f => DRAWER_BY_ID.get(f.drawer_id))
  .filter(Boolean);

function riskLabelFor(minFailDist) {
  if (minFailDist <= 1) return 'HIGH';
  if (minFailDist <= 2) return 'MODERATE';
  return 'LOW';
}

const ranked = gaps
  .map(g => {
    const anchorDrawer = resolveAnchorDrawer(g);
    const anchorOnsetTc =
      anchorDrawer?.properties?.onset_tc ?? g.anchor_onset_tc_K ?? null;
    const minFailDist = failureDrawers.length
      ? Math.min(...failureDrawers.map(fd => hammingDistance(g.bitmask, fd.bitmask)))
      : GATE_COUNT;
    return {
      bitmask: g.bitmask,
      bitmask_binary: g.bitmask_binary,
      gate_distance_to_anchor: g.distance,
      gates_flipped: g.gates_flipped,
      anchor_drawer_id: g.anchor_drawer_id,
      anchor_material: g.anchor_material,
      anchor_onset_tc_K: anchorOnsetTc,
      anchor_substrate: anchorDrawer?.properties?.substrate ?? null,
      anchor_pressure_class: anchorDrawer?.properties?.pressure_class ?? null,
      candidate_predicted_tc_K: g.candidate_predicted_tc_K,
      tc_display_warning: g.tc_display_warning,
      nearest_failure_gate_distance: minFailDist,
      risk_label: riskLabelFor(minFailDist),
    };
  })
  .sort((a, b) =>
    (a.gate_distance_to_anchor - b.gate_distance_to_anchor) ||
    ((b.anchor_onset_tc_K || 0) - (a.anchor_onset_tc_K || 0))
  );

const rankings = {
  schema: 'nickelate-sc.rankings.v1',
  generated_at: new Date().toISOString(),
  release_version: pkg.version,
  method: {
    distance: 'hamming over 22-gate bitmask',
    sort_keys: ['gate_distance_to_anchor asc', 'anchor_onset_tc_K desc'],
    risk_buckets: { HIGH: '<=1', MODERATE: '2', LOW: '>=3' },
    notes:
      'Retrieval scores, not probability estimates. anchor_onset_tc_K is the ' +
      'measured Tc of the nearest anchor — not a forecast for the candidate. ' +
      'candidate_predicted_tc_K is reserved for future model output and is ' +
      'null in v0.1.0.',
  },
  candidates: ranked,
};

// Flattened citation-ready corpus: one record per measurement with full
// DOI/arXiv metadata and the gates the corresponding drawer satisfies.
function gatesSetOn(bitmask) {
  return gates.gates
    .filter(gate => (bitmask & (1 << gate.index)) !== 0)
    .map(gate => gate.name);
}

const measurementById = new Map(dataset.measurements.map(m => [m.id, m]));

const flattened = drawers.map(drawer => {
  const measurement = measurementById.get(drawer.id) || null;
  return {
    record_id: drawer.id,
    material: drawer.material,
    wing: drawer.wing,
    pressure_class: measurement?.pressure_class ?? drawer.properties?.pressure_class ?? null,
    pressure_gpa: measurement?.pressure_gpa ?? drawer.properties?.pressure_gpa ?? null,
    substrate: measurement?.substrate ?? drawer.properties?.substrate ?? null,
    onset_tc_K: measurement?.onset_tc ?? drawer.properties?.onset_tc ?? null,
    zero_r_tc_K: measurement?.zero_r_tc ?? drawer.properties?.zero_r_tc ?? null,
    growth_method: measurement?.growth_method ?? null,
    group: measurement?.group ?? null,
    year: measurement?.year ?? null,
    source_doi: measurement?.source_doi ?? drawer.evidence?.source_doi ?? null,
    source_url: measurement?.source_url ?? drawer.evidence?.source_url ?? drawer.properties?.source_url ?? null,
    arxiv: measurement?.arxiv ?? null,
    notes: measurement?.notes ?? null,
    tags: measurement?.tags ?? [],
    bitmask: drawer.bitmask,
    gates_satisfied: gatesSetOn(drawer.bitmask),
  };
});

const corpus = {
  schema: 'nickelate-sc.corpus.v1',
  generated_at: new Date().toISOString(),
  release_version: pkg.version,
  citation: {
    suggested:
      'flop95. (2026). nickelate.sc: Vol. 1, No. 1 — Bilayer nickelate screening corpus ' +
      `(Version ${pkg.version}) [Data set and software]. Zenodo. https://doi.org/10.5281/zenodo.20369923`,
    license: { code: 'MIT', data: 'CC-BY-4.0' },
    note:
      'Cite the primary literature (linked from each record\'s source_doi) for any ' +
      'scientific claim. Cite this corpus only for the curated schema, screening ' +
      'interface, and versioned data aggregation.',
  },
  counts: {
    measurements: dataset.measurements.length,
    drawers: drawers.length,
    failures: failures.length,
    gap_candidates: gaps.length,
    predictions: predictions.length,
  },
  gates,
  records: flattened,
  predictions,
  failures,
};

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../dist/rankings.json', import.meta.url),
  JSON.stringify(rankings, null, 2) + '\n'
);
writeFileSync(
  new URL('../dist/corpus.json', import.meta.url),
  JSON.stringify(corpus, null, 2) + '\n'
);

console.log(
  `build_rankings: wrote dist/rankings.json (${ranked.length} candidates) and ` +
  `dist/corpus.json (${flattened.length} records, ${dataset.measurements.length} measurements)`
);
