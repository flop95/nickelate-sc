import gatesData from '../data/palace/palace_gates.json';

// Bitmask helpers for the catalog's current gate features.
// Gate definitions live in src/data/palace/palace_gates.json.

export const GATE_COUNT = gatesData.count ?? gatesData.gates.length;

export const CATEGORY_MASKS = gatesData.gates.reduce((masks, gate) => {
  masks[gate.category] = (masks[gate.category] ?? 0) | (1 << gate.index);
  return masks;
}, {});

export function hammingDistance(a, b) {
  let x = (a ^ b) >>> 0;
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

export function bitmaskToBits(bm, numGates = GATE_COUNT) {
  const out = new Array(numGates);
  for (let i = 0; i < numGates; i++) out[i] = (bm >> i) & 1;
  return out;
}

export function bitmaskBinaryString(bm, numGates = GATE_COUNT) {
  return bm.toString(2).padStart(numGates, '0');
}

export function passCount(bm) {
  let n = 0;
  let x = bm >>> 0;
  while (x) {
    n += x & 1;
    x >>>= 1;
  }
  return n;
}

export function explainBitmask(bm, gates) {
  return gates.map(g => ({
    ...g,
    pass: ((bm >> g.index) & 1) === 1,
  }));
}

export function diffBitmasks(a, b, numGates = GATE_COUNT) {
  const out = [];
  for (let i = 0; i < numGates; i++) {
    if (((a >> i) & 1) !== ((b >> i) & 1)) out.push(i);
  }
  return out;
}

export function splitBitmask(bm) {
  const bitmask = bm >>> 0;
  return {
    bitmask,
    physical_bitmask: bitmask & (CATEGORY_MASKS.physical ?? 0),
    control_bitmask: bitmask & (CATEGORY_MASKS.control ?? 0),
    evidence_bitmask: bitmask & (CATEGORY_MASKS.evidence ?? 0),
  };
}

// Which gates does a failure bitmask associate with? Used to red-outline cells
// on the query grid when a sibling failure shares them. Returns a Set of gate indices.
export function failureGateSet(failureBitmasks) {
  const s = new Set();
  for (const bm of failureBitmasks) {
    for (let i = 0; i < GATE_COUNT; i++) if ((bm >> i) & 1) s.add(i);
  }
  return s;
}

// Compute a bitmask directly from raw dataset properties, mirroring the
// catalog's gate rules, so we can run search queries against out-of-catalog
// feature vectors. The label logic is conservative.
function num(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function parseThickness(t) {
  if (t == null) return null;
  const m = String(t).match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

function prop(props, snake, camel = snake) {
  return props[snake] ?? props[camel];
}

function hasAny(text, tokens) {
  return tokens.some(t => text.includes(t));
}

function isDopedOrSubstituted(material, doping) {
  if (doping && doping !== 'undoped' && doping !== 'none') return true;
  return (
    material.includes('₋ₓ') ||
    material.includes('-x') ||
    material.includes('(la,pr)') ||
    material.includes('srₓ') ||
    material.includes('srx') ||
    material.includes('prni') ||
    material.includes('pr substituted') ||
    material.includes('sr substituted')
  );
}

function isLayeredFamily(text) {
  return hasAny(text, [
    'layered',
    'ruddlesden',
    'rp',
    'cuprate',
    'nickelate',
    'pnictide',
    'iron',
    'fe',
    'n=2',
    'n=3',
  ]);
}

function hasPerovskiteFamily(text) {
  return hasAny(text, [
    'perovskite',
    'ruddlesden',
    'rp',
    'k2nif4',
    'nickelate',
    'cuprate',
    'n=2',
    'n=3',
  ]);
}

function hasApicalOxygen(text) {
  if (hasAny(text, ['infinite-layer', 'infinite layer', 'nio₂', 'nio2'])) return false;
  return hasAny(text, [
    'apical',
    'ruddlesden',
    'rp',
    'ni₂o₇',
    'ni2o7',
    'ni₃o₁₀',
    'ni3o10',
    'cu₃o',
    'cu3o',
    'cu₂o',
    'cu2o',
    'yba₂cu₃o₇',
    'yba2cu3o7',
  ]);
}

function formalNiOxidationState(material, structure) {
  const text = `${material} ${structure}`;
  if (!text.includes('ni')) return null;
  if (hasAny(text, ['nio₂', 'nio2', 'infinite-layer', 'infinite layer'])) return 1.2;
  if (hasAny(text, ['ni₂o₇', 'ni2o7', 'ni₃o₁₀', 'ni3o10', 'nickelate'])) return 2.5;
  return null;
}

export function computeBitmask(props) {
  let bits = 0;
  const on = i => { bits |= (1 << i); };

  const material = (prop(props, 'material') || '').toLowerCase();
  const substrate = (prop(props, 'substrate') || '').toLowerCase();
  const family = (props._family || props.wing || '').toLowerCase();
  const structure = (prop(props, 'structure') || '').toLowerCase();
  const strain = num(prop(props, 'strain'));
  const onset = num(prop(props, 'onset_tc', 'onsetTc')) ?? 0;
  const zeroR = num(prop(props, 'zero_r_tc', 'zeroRTc'));
  const filmA = num(prop(props, 'film_a', 'filmA'));
  const filmC = num(prop(props, 'film_c', 'filmC'));
  const subA = num(prop(props, 'substrate_a', 'subA'));
  const pressureClass = (prop(props, 'pressure_class', 'pressureClass') || '').toLowerCase();
  const doping = (props.doping || '').toLowerCase();
  const growth = (prop(props, 'growth_method', 'growth') || '').toLowerCase();
  const year = num(prop(props, 'year')) ?? 0;
  const notes = (props.notes || '').toLowerCase();
  const tags = (props.tags || []).map(t => String(t).toLowerCase());
  const text = [material, substrate, family, structure, notes, ...tags].join(' ');

  // 0: layered
  if (isLayeredFamily(text) || material.includes('ni') || material.includes('cu') || material.includes('fe')) on(0);

  // 1: metastable
  if (
    growth.includes('gae') ||
    growth.includes('non-equilibrium') ||
    growth.includes('quench') ||
    notes.includes('metastable') ||
    notes.includes('quench') ||
    pressureClass.includes('quench') ||
    material.includes('pressure quench')
  ) on(1);

  // 2: c/a band
  const aVal = filmA || subA;
  if (filmC && aVal) {
    const ca = filmC / aVal;
    if (ca >= 4.8 && ca <= 5.8) on(2);
  }

  // 3: perovskite family
  if (hasPerovskiteFamily(text) || material.includes('ni') || material.includes('cu')) on(3);

  // 4: apical oxygen present
  if (hasApicalOxygen(text)) on(4);

  // 5: n=2 RP
  if (hasAny(text, ['ni₂o₇', 'ni2o7', 'n=2', 'bilayer'])) on(5);

  // 6: Pr substitution
  if (material.includes('pr') || doping.includes('pr')) on(6);

  // 7: Sr substitution
  if (material.includes('sr') || doping.includes('sr')) on(7);

  // 8: infinite-layer phase
  if (hasAny(text, ['infinite-layer', 'infinite layer', 'nio₂', 'nio2'])) on(8);

  // 9: n=3 RP
  if (hasAny(text, ['ni₃o₁₀', 'ni3o10', 'n=3', 'trilayer'])) on(9);

  // 10: tweakable
  if (isDopedOrSubstituted(material, doping)) on(10);

  // 11,12: compressive strain thresholds
  if (strain != null && strain < -0.5) on(11);
  if (strain != null && strain < -1.0) on(12);

  // 13: ambient pressure
  if (!pressureClass || pressureClass.startsWith('ambient')) on(13);

  // 14: doping explored
  if (isDopedOrSubstituted(material, doping)) on(14);

  // 15,16: onset Tc thresholds
  if (onset > 30) on(15);
  if (onset > 77) on(16);

  // 17: film data exists
  if (filmA != null || filmC != null || subA != null || tags.includes('film') || growth.includes('film')) on(17);

  // 18: multi-substrate (caller injects)
  if (props._multi_substrate) on(18);

  // 19: diamagnetic
  if (notes.includes('diamagnet') || notes.includes('shielding') || notes.includes('meissner')) on(19);

  // 20: zero resistance
  if (zeroR != null && zeroR > 0) on(20);

  // 21: 2024+
  if (year >= 2024) on(21);

  return bits;
}

export function rawFeatures(props) {
  const material = (prop(props, 'material') || '').toLowerCase();
  const structure = (prop(props, 'structure') || '').toLowerCase();
  const filmA = num(prop(props, 'film_a', 'filmA')) ?? num(prop(props, 'substrate_a', 'subA'));
  const filmC = num(prop(props, 'film_c', 'filmC'));
  const strain = num(prop(props, 'strain'));
  const onset = num(prop(props, 'onset_tc', 'onsetTc'));
  let zeroR = num(prop(props, 'zero_r_tc', 'zeroRTc'));
  if (zeroR == null) zeroR = 0;
  const ca = (filmA && filmC) ? (filmC / filmA) : null;
  const thickness = parseThickness(prop(props, 'thickness'));
  const year = num(prop(props, 'year'));
  const valence = formalNiOxidationState(material, structure);
  const apical = hasApicalOxygen(`${material} ${structure}`) ? 1 :
    hasAny(`${material} ${structure}`, ['infinite-layer', 'infinite layer', 'nio₂', 'nio2']) ? 0 : null;

  return {
    physical: [filmA, ca, valence, apical],
    control: [strain, thickness],
    evidence: [onset, zeroR, year],
  };
}
