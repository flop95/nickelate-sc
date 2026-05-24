# Changelog

All notable changes to nickelate.sc are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Semantic Versioning](https://semver.org/) for the curated-corpus schema.

## [0.1.0] — 2026-05-24

First archival snapshot of an evolving corpus. Signals "first stable schema +
first Zenodo deposit," not "validated reference." Schema may shift before any
future `v1.0`.

### Added

- **CITATION.cff** at the repo root so GitHub renders a "Cite this repository"
  sidebar and downstream tools can parse citation metadata.
- **`.zenodo.json`** so the Zenodo deposit picks up curated title, description,
  authors, keywords, license, and related identifiers (not GitHub's auto-fill).
- **`docs/inclusion_criteria.md`** — explicit answers for what counts as a
  record, ambient vs. applied-pressure split, evidence types, preprint/arXiv
  policy, retraction handling, negative-result entry, duplicate-measurement
  handling, and onset-Tc / zero-R-Tc / diamagnetic-Tc distinctions.
- **`docs/gate_definitions.md`** — human-readable companion to
  `src/data/palace/palace_gates.json` covering all 22 gates
  (10 physical / 5 control / 7 evidence) with criteria and examples.
- **`docs/ranking_method.md`** — describes the bitmask Hamming-distance
  retrieval used to surface nearest-anchor candidates; states explicitly
  that the result is a retrieval score, not a probability estimate of Tc.
- **`docs/release_procedure.md`** — operational steps for cutting a versioned
  archival release (flip repo public, link Zenodo, draft GitHub release,
  find-and-replace the DOI placeholder).
- **`AUDIT.md`** — known limitations and trust boundaries, lifted from the
  audit caveats already accepted into the codebase.
- **`LICENSE-DATA`** — CC-BY-4.0 covering `src/data/**` and `docs/**`. The
  existing root `LICENSE` (MIT) continues to cover code.
- **`scripts/build_rankings.mjs`** — one-command reproducibility path
  (`npm run build:rankings`) that rebuilds `dist/rankings.json` and
  `dist/corpus.json` from the curated JSON inputs without going through the UI.
- **Suggested-citation block** in the site landing view, with DOI placeholder
  for v0.1.0.

### Changed

- **Anchor-Tc field rename in `palace_gaps_nickelates.json`**, with matching
  validation:
  - `nearest_success_drawer_id` → `anchor_drawer_id`
  - `nearest_success` → `anchor_material`
  - `nearest_onset` → `anchor_onset_tc_K`
- **Anchor-Tc UI relabel** in `GapsView.jsx` and `PalaceOverview.jsx`. Every
  anchor Tc now renders as "Nearest-neighbor anchor Tc — Anchor value only;
  not a forecast." Replaces ambiguous "Tc" labels that a casual reader could
  mistake for a Tc prediction on the candidate.
- **New explicit forecast fields** on every gap entry — `candidate_predicted_tc_K:
  null` and `tc_display_warning: "Anchor value only; not a forecast."` — so the
  schema makes the distinction load-bearing rather than implicit.
- `package.json` version bumped to `0.1.0`; `npm run build:rankings` script
  registered.
- `README.md` adds "How to cite," "Reproducing the rankings," and a "License"
  section explaining the MIT (code) / CC-BY-4.0 (data) split, and links to the
  new docs.

### Corpus

This freeze archives:

- 23 curated measurements across ambient films, films under applied pressure,
  and bulk under pressure.
- 22-gate physical / control / evidence schema with bitmask + feature-vector
  encoding.
- 20 hypothesis-candidate / screening-candidate neighbors at gate distance 1
  from a measured anchor, with explicit "not a forecast" labeling.
- Curated negative results.
- Weekly arXiv watcher feed (`src/data/arxiv_alerts.json`).

### Not in this release

- ORCID-linked author identity.
- Peer-reviewed data descriptor / arXiv methods note.
- Independent reviewer / contributor sign-off.
- Held-out validation set or any probability-calibrated Tc estimator.
