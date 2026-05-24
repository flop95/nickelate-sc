# nickelate-sc

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20369923.svg)](https://doi.org/10.5281/zenodo.20369923)

Curated screening notebook for nickelate superconductor research.

**Live:** https://flop95.github.io/nickelate-sc/

Curates 23 nickelate superconductivity measurements across ambient films, film + applied pressure, and bulk pressure; surfaces unexplained contradictions after pressure-class confounds; runs sensitivity analysis; and ranks untested experiments as hypothesis prompts. arXiv alerts update weekly.

## Current status

`v0.1.0` is the first archival snapshot of an evolving corpus. The schema is versioned, the data is exported under CC-BY-4.0, and each release is archived on Zenodo with a citable DOI. It is *not* yet a peer-reviewed reference dataset: the author identity is pseudonymous, there is no editorial board, no held-out validation set, and gate assignments are hand-coded. See [`AUDIT.md`](AUDIT.md) for the full list of limitations and trust boundaries. Use it to find papers, compare regimes, and generate experiment ideas; verify every cited source before citing the site itself.

## How to cite

If you use this corpus, screening interface, or curated schema, cite the **archived release**, not the live URL:

> flop95. (2026). *nickelate.sc: Vol. 1, No. 1 — Bilayer nickelate screening corpus* (Version 0.1.0) [Data set and software]. Zenodo. https://doi.org/10.5281/zenodo.20369923

GitHub also renders a "Cite this repository" button from [`CITATION.cff`](CITATION.cff) at the repo root.

**Use note:** cite the primary literature (linked from each record's `source_doi`) for any scientific claim. Cite this corpus only for the curated schema, screening interface, and versioned data aggregation.

## What it does

- **Engine** — Interactive data explorer for the original 18 published nickelate film measurements, with pressure-mode filters separating ambient films from film + pressure records. Scatter plot (strain vs Tc, toggleable to c/a ratio), sortable/filterable table with expandable synthesis recipe cards.
- **Contradiction detection** — Checks entries where the same material + substrate + strain reports Tc values differing by >5K. Pressure-only differences are treated as explained physics, so the visible list is limited to unexplained contradictions.
- **Sensitivity analysis** — Sweep strain, substrate a-axis, or growth method to see marginal effects on Tc. Linear regression with slope and R² displayed.
- **Hypothesis candidates** — gap-map neighbors at gate distance 1 from a measured anchor, with explicit "anchor Tc is not a forecast for the candidate" labeling.
- **Screening candidates** — 5 ranked experiment prompts with empirical Tc scenario ranges, proximity/risk labels, lab difficulty ratings, and claim links. These are hypothesis-generating ranges sourced back to measurements, not predictions.
- **arXiv alerts** — Weekly automated scan of arXiv for new nickelate SC papers. Regex-extracts material, substrate, Tc from abstracts and diffs against the dataset; no alerts means no regex-extractable dataset-relevant alerts, not proof that no relevant papers exist.
- **Timeline** — 33-month Tc progression from first bulk signatures (Jul 2023) to current records.
- **Screener** — Map epitaxial strain to anchored onset Tc for any substrate lattice constant. Anchored to measurements, not a forecast.

## Working heuristic

Three superconductor families (cuprates, nickelates, iron-based) motivate a working heuristic for high-Tc superconductivity at ambient pressure: compress the lattice into a high-Tc configuration under pressure, then use a physical trick (pressure quenching, epitaxial strain, interface coupling) to stabilize or mimic that configuration at ambient conditions. This is an organizing analogy for hypothesis generation, not a settled mechanism or forecast.

## Methodology and limits

The schema, criteria, and known limitations are documented:

- [`docs/inclusion_criteria.md`](docs/inclusion_criteria.md) — what counts as a record, how Tc is interpreted, how preprints / retractions / negative results are handled, when a candidate is hypothetical vs. measured.
- [`docs/gate_definitions.md`](docs/gate_definitions.md) — human-readable companion to the 22-gate `palace_gates.json`, with rules for adding or modifying gates across releases.
- [`docs/ranking_method.md`](docs/ranking_method.md) — how the bitmask Hamming-distance retrieval works, what it does and does not do.
- [`docs/release_procedure.md`](docs/release_procedure.md) — manual steps to cut an archival release and wire in the Zenodo DOI.
- [`AUDIT.md`](AUDIT.md) — known limitations and trust boundaries.
- [`CHANGELOG.md`](CHANGELOG.md) — schema changes per release.

## Reproducing the rankings

A reader who distrusts the rendered UI can re-derive the gap-candidate ranking and a flattened citation-ready corpus from the versioned JSON inputs with one command:

```bash
npm install
npm run build:rankings
```

That writes:

- `dist/rankings.json` — the same gap-candidate ordering the UI computes (distance asc, then anchor Tc desc), with risk labels and anchor metadata.
- `dist/corpus.json` — one flattened record per measurement with full DOI / arXiv metadata and the gates each record satisfies.

The script is [`scripts/build_rankings.mjs`](scripts/build_rankings.mjs).

Schema validation (DOI / URL consistency, pressure-mode agreement, gap-anchor closure, anchor-Tc warning fields) runs separately:

```bash
npm run validate:data
```

## Data export

The app's **export corpus** button downloads the current static corpus as JSON, including measurements, drawer records, gate definitions, failures, gap candidates, prediction inputs, and arXiv alerts. The deploy workflow also publishes the committed JSON files under the public data directory on GitHub Pages. The export is intended to make the curated rows inspectable; it does not make the curator's gate-assignment decisions reproducible (see [`AUDIT.md`](AUDIT.md)).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/

## arXiv alerts

The arXiv alert feed is refreshed every Monday by the watcher workflow, which checks the public arXiv API and commits any new hits. To run it manually:

```bash
pip install -r scripts/requirements.txt
npm run alerts -- --days 30
```

## Contribute data

Use the GitHub issue templates:

- [Submit a new measurement](../../issues/new?template=new-measurement.yml) — including negative results
- [Add synthesis recipe details](../../issues/new?template=recipe-detail.yml) — fill in missing growth parameters
- [Claim a hypothesis candidate](../../issues/new?template=claim-prediction.yml) — signal your lab is attempting an experiment

## Data sources

All data manually curated from published papers and preprints. Key sources:

- Ko et al., Nature 638, 935 (2025) — first ambient film
- Zhou et al., NSR nwag151 (2026) — 63K GAE record
- Sakakibara/Kuroki, Commun. Phys. (2025) — strain-tuning study
- Nie et al., PRL 136, 066002 (2026) — superconducting dome
- Hwang group, Nature (Apr 9, 2026) — superstructure topology
- Li, Xing, Peng et al., Nature 649, 871-878 (2026) — 96K Sm-substituted bulk record under pressure
- Zhao/Sun, arXiv:2603.29531 — film + pressure to 68.5K

## Further reading

- [docs/research-brief.html](docs/research-brief.html) — structured literature brief across cuprate / nickelate / iron-based families, with five ranked empirical experiment prompts
- [docs/populated-entry.html](docs/populated-entry.html) — La₃Ni₂O₇ static catalog entry (FIG. 1 § 4)

## Stack

React 18 + Vite 6. No backend — all data committed as JSON; deployed as static files via GitHub Pages. A small Python script refreshes arXiv alerts weekly.

## License

Two licenses, applied by content type:

- **Code** (React app, scripts, build config) — MIT. See [`LICENSE`](LICENSE).
- **Data and docs** (`src/data/**`, `docs/**`, `CHANGELOG.md`, `AUDIT.md`, `CITATION.cff`, `.zenodo.json`) — CC-BY-4.0. See [`LICENSE-DATA`](LICENSE-DATA).

Both licenses require attribution; CC-BY-4.0 additionally requires that you indicate if you modified the licensed material.
