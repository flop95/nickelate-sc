import gateDefs from '../data/palace/palace_gates.json';

const PROPERTY_LABELS = {
  substrate: 'substrate',
  substrate_a: 'substrate a-axis',
  onset_tc: 'onset Tc',
  zero_r_tc: 'zero-R Tc',
  strain: 'strain',
  film_a: 'film a',
  film_c: 'film c',
  thickness: 'thickness',
  doping: 'doping',
  pressure_class: 'pressure',
  pressure_gpa: 'pressure',
  pressure_range: 'pressure range',
  pressure_confidence: 'pressure confidence',
  growth_method: 'growth',
  oxygen_treatment: 'oxygen treatment',
  group: 'group',
  year: 'year',
  _family: 'family',
};

const WING_LABELS = {
  nickelates: 'Nickelates',
  cuprates: 'Cuprates',
  pnictides: 'Pnictides',
  hydrides: 'Hydrides',
  conventional: 'Conventional',
  wildcards: 'Wildcards',
  failures: 'Negative Results',
  history: 'History',
};

const ROOM_LABELS = {
  crystal_structure: 'Crystal Structure',
  electronic_structure: 'Electronic Structure',
  experimental_results: 'Experimental Results',
  failure_memory: 'Negative Results',
  gap_candidates: 'Gap Candidates',
  hypotheses: 'Hypotheses',
  synthesis_conditions: 'Synthesis Conditions',
  substrate_room: 'Substrate Room',
  data_engine: 'Data Engine',
  timeline: 'Tc Timeline',
  brief: 'Research Brief',
  material: 'Material',
};

const GATES_BY_NAME = Object.fromEntries(gateDefs.gates.map(g => [g.name, g]));

export function formatKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\btc\b/gi, 'Tc')
    .replace(/\brp\b/gi, 'RP')
    .replace(/\bo2\b/gi, 'O2');
}

export function formatPropertyLabel(key) {
  return PROPERTY_LABELS[key] || formatKeyLabel(key);
}

export function formatPropertyValue(key, value) {
  if (value == null || value === '') return '—';
  if (key === 'strain' && Number.isFinite(Number(value))) {
    return `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  }
  if (['film_a', 'film_c', 'substrate_a'].includes(key) && Number.isFinite(Number(value))) {
    return `${Number(value)}Å`;
  }
  if (key === 'pressure_gpa' && Number.isFinite(Number(value))) {
    return `${Number(value)} GPa`;
  }
  if (['onset_tc', 'zero_r_tc'].includes(key) && Number.isFinite(Number(value))) {
    return `${Number(value)} K`;
  }
  return String(value);
}

export function formatGateName(name) {
  return GATES_BY_NAME[name]?.label || formatKeyLabel(name);
}

export function formatGateList(names) {
  const labels = (names || []).map(formatGateName).filter(Boolean);
  return labels.length ? labels.join(', ') : '—';
}

export function formatWingLabel(wing) {
  return WING_LABELS[wing] || formatKeyLabel(wing);
}

export function formatRoomLabel(room) {
  return ROOM_LABELS[room] || formatKeyLabel(room);
}
