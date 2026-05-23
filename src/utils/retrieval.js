// Two-stage retrieval (Hamming cone → cosine rerank).
// Client-side nearest-neighbor search over the catalog's gate-feature vectors.
import { hammingDistance, computeBitmask, rawFeatures, splitBitmask } from './bitmask.js';

const FEATURE_CATEGORIES = ['physical', 'control', 'evidence'];

export function normalize(raw, norm) {
  if (!Array.isArray(raw)) {
    return Object.fromEntries(
      FEATURE_CATEGORIES.map(category => [
        category,
        normalize(raw?.[category] ?? [], norm?.[category] ?? { min: [], max: [] }),
      ])
    );
  }

  const out = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v == null) { out[i] = 0.5; continue; }
    const lo = norm.min[i];
    const hi = norm.max[i];
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < 1e-9) {
      out[i] = 0.5;
      continue;
    }
    const t = (v - lo) / (hi - lo);
    out[i] = Math.max(0, Math.min(1, t));
  }
  return out;
}

export function encodeFeatures(props, norm) {
  return normalize(rawFeatures(props), norm);
}

export function flattenFeatures(features) {
  if (Array.isArray(features)) return features;
  return FEATURE_CATEGORIES.flatMap(category => features?.[category] ?? []);
}

export function cosineSimilarity(a, b) {
  const len = Math.max(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0.5;
    const bv = b[i] ?? 0.5;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na < 1e-12 || nb < 1e-12) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Two-stage search. drawers: array of palace_drawers.json entries.
// failures: palace_failures.json — used to attach warnings per drawer.
export function searchSimilar(queryProps, drawers, failures, normalizer, { topK = 5, maxHamming = 3 } = {}) {
  const qBits = computeBitmask(queryProps);
  const queryMasks = splitBitmask(qBits);
  const qFv = flattenFeatures(encodeFeatures(queryProps, normalizer));

  const failuresByDrawer = new Map();
  for (const f of failures) {
    if (!failuresByDrawer.has(f.drawer_id)) failuresByDrawer.set(f.drawer_id, []);
    failuresByDrawer.get(f.drawer_id).push(f);
  }

  const matches = [];
  for (const d of drawers) {
    const hd = hammingDistance(qBits, d.bitmask);
    if (hd > maxHamming) continue;
    const dMasks = {
      physical_bitmask: d.physical_bitmask ?? splitBitmask(d.bitmask).physical_bitmask,
      control_bitmask: d.control_bitmask ?? splitBitmask(d.bitmask).control_bitmask,
      evidence_bitmask: d.evidence_bitmask ?? splitBitmask(d.bitmask).evidence_bitmask,
    };
    const sim = cosineSimilarity(qFv, flattenFeatures(d.feature_vector));
    matches.push({
      drawer: d,
      hamming: hd,
      physicalHamming: hammingDistance(queryMasks.physical_bitmask, dMasks.physical_bitmask),
      controlHamming: hammingDistance(queryMasks.control_bitmask, dMasks.control_bitmask),
      evidenceHamming: hammingDistance(queryMasks.evidence_bitmask, dMasks.evidence_bitmask),
      cosine: Math.round(sim * 10000) / 10000,
      warnings: failuresByDrawer.get(d.id) || [],
    });
  }

  matches.sort((a, b) => (b.cosine - a.cosine) || (a.hamming - b.hamming));

  return {
    queryBitmask: qBits,
    queryMasks,
    matchesInCone: matches.length,
    results: matches.slice(0, topK),
  };
}
