export const PRESSURE_MODES = [
  { id: 'ambient', label: 'ambient' },
  { id: 'film_pressure', label: 'film + pressure' },
  { id: 'bulk_pressure', label: 'bulk pressure' },
];

export const PRESSURE_MODE_IDS = PRESSURE_MODES.map(mode => mode.id);
export const DEFAULT_PRESSURE_MODE = 'ambient';
export const AMBIENT_PRESSURE_MAX_GPA = 0.01;

const MODE_BY_CLASS = new Map([
  ['ambient', 'ambient'],
  ['pressure-quenched ambient', 'ambient'],
  ['film + pressure', 'film_pressure'],
  ['film pressure', 'film_pressure'],
  ['pressure only', 'bulk_pressure'],
  ['bulk pressure', 'bulk_pressure'],
]);

export function pressureModeLabel(modeId) {
  return PRESSURE_MODES.find(mode => mode.id === modeId)?.label || modeId || '';
}

export function pressureClassForMode(modeId) {
  if (modeId === 'film_pressure') return 'Film + pressure';
  if (modeId === 'bulk_pressure') return 'Pressure only';
  return 'Ambient';
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function readProps(record) {
  return record?.properties || record || {};
}

function readTags(record, props) {
  const rawTags = props.tags || record?.tags || [];
  return Array.isArray(rawTags) ? rawTags.map(normalizeText) : [];
}

function pressureModeFromClass(pressureClass) {
  const key = normalizeText(pressureClass);
  return MODE_BY_CLASS.get(key) || null;
}

export function analyzePressureMode(record) {
  const props = readProps(record);
  const tags = readTags(record, props);
  const tagSet = new Set(tags);
  const pressureClass = props.pressure_class ?? props.pressureClass ?? '';
  const pressureGpa = toNumber(props.pressure_gpa ?? props.pressureGpa ?? props.P);
  const explicitMode = props.pressure_mode ?? props.pressureMode ?? null;
  const errors = [];
  const signals = [];

  if (explicitMode != null) {
    if (PRESSURE_MODE_IDS.includes(explicitMode)) {
      signals.push({ source: 'pressure_mode', mode: explicitMode });
    } else {
      errors.push(`unknown pressure_mode "${explicitMode}"`);
    }
  }

  const classMode = pressureModeFromClass(pressureClass);
  if (pressureClass && !classMode) {
    errors.push(`unknown pressure_class "${pressureClass}"`);
  }
  if (classMode) signals.push({ source: 'pressure_class', mode: classMode });

  if (tagSet.has('ambient') && tagSet.has('pressure')) {
    errors.push('tags include both ambient and pressure');
  }
  if (tagSet.has('film') && tagSet.has('bulk')) {
    errors.push('tags include both film and bulk');
  }

  if (tagSet.has('ambient')) {
    signals.push({ source: 'tags', mode: 'ambient' });
  } else if (tagSet.has('pressure') && tagSet.has('film')) {
    signals.push({ source: 'tags', mode: 'film_pressure' });
  } else if (tagSet.has('pressure') && tagSet.has('bulk')) {
    signals.push({ source: 'tags', mode: 'bulk_pressure' });
  }

  if (!pressureClass && pressureGpa != null) {
    signals.push({
      source: 'pressure_gpa',
      mode: pressureGpa <= AMBIENT_PRESSURE_MAX_GPA ? 'ambient' : 'bulk_pressure',
    });
  }

  const modes = [...new Set(signals.map(signal => signal.mode))];
  let mode = modes[0] || null;

  if (modes.length > 1) {
    errors.push(`conflicting pressure-mode signals: ${signals.map(s => `${s.source}=${s.mode}`).join(', ')}`);
    mode = null;
  }

  const classText = normalizeText(pressureClass);
  const isRetainedAmbient = classText === 'pressure-quenched ambient';
  if (mode === 'ambient' && pressureGpa != null && pressureGpa > AMBIENT_PRESSURE_MAX_GPA && !isRetainedAmbient) {
    errors.push(`ambient mode has pressure_gpa=${pressureGpa}`);
  }
  if ((mode === 'film_pressure' || mode === 'bulk_pressure') && pressureGpa != null && pressureGpa <= AMBIENT_PRESSURE_MAX_GPA) {
    errors.push(`${mode} mode has ambient pressure_gpa=${pressureGpa}`);
  }
  if (mode === 'film_pressure' && tagSet.has('bulk')) {
    errors.push('film + pressure mode carries a bulk tag');
  }
  if (mode === 'bulk_pressure' && tagSet.has('film')) {
    errors.push('bulk pressure mode carries a film tag');
  }

  return { mode, pressureClass, pressureGpa, errors, signals };
}

export function pressureModeFor(record) {
  return analyzePressureMode(record).mode;
}

export function matchesPressureMode(record, modeId) {
  return pressureModeFor(record) === modeId;
}

export function filterByPressureMode(records, modeId) {
  return (records || []).filter(record => matchesPressureMode(record, modeId));
}

export function countByPressureMode(records) {
  const counts = Object.fromEntries(PRESSURE_MODE_IDS.map(mode => [mode, 0]));
  for (const record of records || []) {
    const mode = pressureModeFor(record);
    if (mode && counts[mode] != null) counts[mode] += 1;
  }
  return counts;
}
