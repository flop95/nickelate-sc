// Two-stage retrieval (Hamming cone → cosine rerank).
// Client-side nearest-neighbor search over the catalog's gate-feature vectors.
import { hammingDistance, computeBitmask, rawFeatures } from './bitmask.js';

export function normalize(raw, norm) {
  const out = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v == null) { out[i] = 0.5; continue; }
    const lo = norm.min[i];
    const hi = norm.max[i];
    if (hi - lo < 1e-9) { out[i] = 0.5; continue; }
    const t = (v - lo) / (hi - lo);
    out[i] = Math.max(0, Math.min(1, t));
  }
  return out;
}

export function encodeFeatures(props, norm) {
  return normalize(rawFeatures(props), norm);
}

export function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na < 1e-12 || nb < 1e-12) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Two-stage search. drawers: array of palace_drawers.json entries.
// failures: palace_failures.json — used to attach warnings per drawer.
export function searchSimilar(queryProps, drawers, failures, normalizer, { topK = 5, maxHamming = 3 } = {}) {
  const qBits = computeBitmask(queryProps);
  const qFv = encodeFeatures(queryProps, normalizer);

  const failuresByDrawer = new Map();
  for (const f of failures) {
    if (!failuresByDrawer.has(f.drawer_id)) failuresByDrawer.set(f.drawer_id, []);
    failuresByDrawer.get(f.drawer_id).push(f);
  }

  const matches = [];
  for (const d of drawers) {
    const hd = hammingDistance(qBits, d.bitmask);
    if (hd > maxHamming) continue;
    const sim = cosineSimilarity(qFv, d.feature_vector);
    matches.push({
      drawer: d,
      hamming: hd,
      cosine: Math.round(sim * 10000) / 10000,
      warnings: failuresByDrawer.get(d.id) || [],
    });
  }

  matches.sort((a, b) => (b.cosine - a.cosine) || (a.hamming - b.hamming));

  return {
    queryBitmask: qBits,
    matchesInCone: matches.length,
    results: matches.slice(0, topK),
  };
}
