# Ranking method

This document describes how nickelate.sc orders gap candidates and surfaces
"nearest measured anchor" relationships. **The result is a retrieval score,
not a probability estimate of Tc.** Read [`AUDIT.md`](../AUDIT.md) for the
limits of what this method can and cannot tell you.

The machinery is intentionally simple. Everything below can be re-derived
from the curated JSON inputs by running `npm run build:rankings`, which
emits `dist/rankings.json` and `dist/corpus.json`.

---

## Inputs

- **Drawers** (`src/data/palace/palace_drawers.json`) — one record per
  curated measurement, with a 22-bit screening mask. Each gate the record
  satisfies contributes `(1 << gate_index)` to `bitmask`.
- **Gap candidates** (`src/data/palace/palace_gaps_nickelates.json`) —
  bitmask configurations at gate distance 1 from a measured anchor that
  no record occupies. Pre-computed during curation; the v0.1.0 set is
  manually curated rather than enumerated exhaustively.
- **Failures** (`src/data/palace/palace_failures.json`) — known negative
  results, each linked to a drawer ID. Used as a *risk signal*: candidates
  close to a known failure are flagged.
- **Gate definitions** (`src/data/palace/palace_gates.json`) — the schema
  the bitmasks index into. See [`gate_definitions.md`](gate_definitions.md).

---

## Step 1 — Distance to nearest measured anchor

For each gap candidate, the corpus pre-records a `distance` integer (always
1 at v0.1.0; that is, every gap is a one-gate flip of a measured anchor)
and an `anchor_drawer_id` referencing the specific drawer it neighbors.

The site verifies the anchor relationship at load time
(`resolveNearestSuccessDrawer` in
[`PalaceOverview.jsx`](../src/components/PalaceOverview.jsx) and
[`GapsView.jsx`](../src/components/GapsView.jsx)): it looks up the drawer by
ID, falls back to matching by material name within the nickelates wing, and
then to a global material-name match. If the anchor disappears from the
corpus, the gap is dropped silently.

`validate-data.mjs` enforces stronger guarantees offline:

- `anchor_drawer_id` must be an integer pointing to an existing drawer.
- The drawer's `material` must equal the gap's `anchor_material`.
- The drawer's `properties.onset_tc` must equal the gap's `anchor_onset_tc_K`
  (within 0.001 K).

---

## Step 2 — Distance to nearest known failure

For each candidate, the runtime computes the Hamming distance from the
candidate's bitmask to every failure drawer's bitmask, and keeps the
minimum. This is exposed as `minFailDist` and bucketed into a categorical
`riskLabel`:

| `minFailDist` | `riskLabel` |
| --- | --- |
| ≤ 1 | HIGH |
| 2 | MODERATE |
| ≥ 3 | LOW |

These are ordinal labels for browsing. They are not calibrated
probabilities and they are not robust to changes in corpus size — adding
new failures will mechanically push more candidates into HIGH/MODERATE
without any change in underlying physics.

---

## Step 3 — Sort order on the overview lane

The [`PalaceOverview.jsx`](../src/components/PalaceOverview.jsx) "promising
lane" sorts gap candidates by:

1. `distance` ascending (nearer to a measured anchor first).
2. `anchor_onset_tc_K` descending (higher-Tc anchors first within a tie).

Then it takes the top 6 and renders them as a table. Each row carries the
anchor material and the **anchor's measured Tc** (with the explicit
"anchor value only; not a forecast" warning) — not a prediction for the
candidate.

The `GapsView.jsx` page lists every candidate that matches the current
pressure-mode filter, ordered by file position (i.e., curator-imposed
order). It is a browse interface, not a ranking.

---

## What this method does *not* do

- **It does not estimate Tc for the candidate.** The number you see next to
  each candidate is the anchor's measured Tc.
- **It does not weight gates.** Hamming distance treats all 22 gates as
  equally informative. The curator's prior is that physical gates matter
  more than control gates, but the schema does not encode this.
- **It does not encode interaction terms.** A candidate that flips two
  gates simultaneously has distance 2, regardless of whether the two flips
  are physically coupled.
- **It does not propagate uncertainty in gate assignments.** A drawer with
  gates set by a confident reading of a clean experiment is treated
  identically to a drawer with gates set from a marginal claim.

If you need calibrated Tc estimates, this is not the tool. If you need a
fast way to see which untested gate-neighbors of high-Tc anchors are
defensible experiment prompts, it is.

---

## Reproducing the rankings

```bash
npm install
npm run build:rankings
```

This writes:

- `dist/rankings.json` — the same gap-candidate ordering the UI computes,
  with anchor metadata attached. The point of running this script is that
  a reader who distrusts the UI can re-derive the order from the
  versioned JSON inputs without going through the React app.
- `dist/corpus.json` — a flattened export with one record per measurement,
  full DOI / arXiv metadata, and the gates each record satisfies. Suitable
  as a citation-ready dataset.

The script lives at
[`scripts/build_rankings.mjs`](../scripts/build_rankings.mjs).
