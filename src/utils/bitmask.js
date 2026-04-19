// Bitmask helpers for the catalog's 16-bit gate features.
// Gate definitions live in src/data/palace/palace_gates.json (index, name, label, description).

export function hammingDistance(a, b) {
  let x = (a ^ b) >>> 0;
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

export function bitmaskToBits(bm, numGates = 16) {
  const out = new Array(numGates);
  for (let i = 0; i < numGates; i++) out[i] = (bm >> i) & 1;
  return out;
}

export function bitmaskBinaryString(bm, numGates = 16) {
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

export function diffBitmasks(a, b, numGates = 16) {
  const out = [];
  for (let i = 0; i < numGates; i++) {
    if (((a >> i) & 1) !== ((b >> i) & 1)) out.push(i);
  }
  return out;
}

// Which gates does a failure bitmask associate with? Used to red-outline cells
// on the query grid when a sibling failure shares them. Returns a Set of gate indices.
export function failureGateSet(failureBitmasks) {
  const s = new Set();
  for (const bm of failureBitmasks) {
    for (let i = 0; i < 16; i++) if ((bm >> i) & 1) s.add(i);
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

export function computeBitmask(props) {
  let bits = 0;
  const on = i => { bits |= (1 << i); };

  const material = (props.material || '').toLowerCase();
  const substrate = (props.substrate || '').toLowerCase();
  const family = (props._family || props.wing || '').toLowerCase();
  const structure = (props.structure || '').toLowerCase();
  const strain = num(props.strain);
  const onset = num(props.onset_tc) ?? 0;
  const zeroR = num(props.zero_r_tc);
  const filmA = num(props.film_a);
  const filmC = num(props.film_c);
  const subA = num(props.substrate_a);
  const pressureClass = (props.pressure_class || '').toLowerCase();
  const doping = (props.doping || '').toLowerCase();
  const growth = (props.growth_method || '').toLowerCase();
  const year = num(props.year) ?? 0;
  const notes = (props.notes || '').toLowerCase();
  const tags = (props.tags || []).map(t => String(t).toLowerCase());

  // 0: layered
  if (
    material.includes('ni') || material.includes('cu') || material.includes('fe') ||
    structure.includes('layered') || structure.includes('rp') ||
    family.includes('cuprate') || family.includes('nickelate') || family.includes('pnictide')
  ) on(0);

  // 1: tweakable
  if (doping && doping !== 'undoped' && doping !== 'none') on(1);

  // 2: metastable
  if (
    growth.includes('gae') || growth.includes('non-equilibrium') ||
    notes.includes('metastable') || pressureClass.includes('quench')
  ) on(2);

  // 3,4: compressive strain thresholds
  if (strain != null && strain < -0.5) on(3);
  if (strain != null && strain < -1.0) on(4);

  // 5: c/a band
  const aVal = filmA || subA;
  if (filmC && aVal) {
    const ca = filmC / aVal;
    if (ca >= 4.8 && ca <= 5.8) on(5);
  }

  // 6: ambient pressure
  if (!pressureClass || pressureClass.startsWith('ambient')) on(6);

  // 7,8: onset Tc thresholds
  if (onset > 30) on(7);
  if (onset > 77) on(8);

  // 9: film data exists
  if (filmA != null || filmC != null || tags.includes('film') || growth.includes('film')) on(9);

  // 10: perovskite family
  if (
    family.includes('perovskite') || structure.includes('perovskite') ||
    structure.replace(/\s/g, '').includes('k2nif4') || structure.includes('rp') ||
    family.includes('nickelate') || family.includes('cuprate') ||
    (substrate && ['alo', 'gao', 'tio', 'tao', 'sco'].some(s => substrate.includes(s)))
  ) on(10);

  // 11: doping explored
  if (doping && doping !== 'undoped' && doping !== 'none') on(11);

  // 12: multi-substrate (caller injects)
  if (props._multi_substrate) on(12);

  // 13: diamagnetic
  if (notes.includes('diamagnet') || notes.includes('shielding') || notes.includes('meissner')) on(13);

  // 14: zero resistance
  if (zeroR != null && zeroR > 0) on(14);

  // 15: 2024+
  if (year >= 2024) on(15);

  return bits;
}

export function rawFeatures(props) {
  const filmA = num(props.film_a) ?? num(props.substrate_a);
  const filmC = num(props.film_c);
  const strain = num(props.strain);
  const onset = num(props.onset_tc);
  let zeroR = num(props.zero_r_tc);
  if (zeroR == null) zeroR = 0;
  const ca = (filmA && filmC) ? (filmC / filmA) : null;
  const thickness = parseThickness(props.thickness);
  const year = num(props.year);
  return [filmA, filmC, strain, onset, zeroR, ca, thickness, year];
}
