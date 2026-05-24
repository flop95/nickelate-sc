# nickelate-sc

Curated screening notebook for nickelate superconductor research.

**Live:** https://flop95.github.io/nickelate-sc/

Curates 23 nickelate superconductivity measurements across ambient films, film + applied pressure, and bulk pressure; surfaces unexplained contradictions after pressure-class confounds; runs sensitivity analysis; and ranks untested experiments as hypothesis prompts. arXiv alerts update weekly.

## Current status

This is a small, manually curated literature synthesis, not citable infrastructure yet. The author identity is pseudonymous, there is no DOI, no peer review, no editorial board, and no archival release for Vol. 1. The source repository is private; only the committed static JSON exports and rendered pages are public. The ranking logic is an empirical feature-distance heuristic rather than a validated model. Use it to find papers, compare regimes, and generate experiment ideas; verify every cited source before citing the site itself.

## What it does

- **Engine** — Interactive data explorer for the original 18 published nickelate film measurements, with pressure-mode filters separating ambient films from film + pressure records. Scatter plot (strain vs Tc, toggleable to c/a ratio), sortable/filterable table with expandable synthesis recipe cards.
- **Contradiction detection** — Checks entries where the same material + substrate + strain reports Tc values differing by >5K. Pressure-only differences are treated as explained physics, so the visible list is limited to unexplained contradictions.
- **Sensitivity analysis** — Sweep strain, substrate a-axis, or growth method to see marginal effects on Tc. Linear regression with slope and R² displayed.
- **Experiment prompts** — 5 ranked, hypothesis-generating experiments with empirical Tc scenario ranges, proximity/risk labels, lab difficulty ratings (equipment, substrate availability, cost tier), and claim links.
- **arXiv alerts** — Weekly automated scan of arXiv for new nickelate SC papers. Regex-extracts material, substrate, Tc from abstracts and diffs against the dataset; no alerts means no regex-extractable dataset-relevant alerts, not proof that no relevant papers exist.
- **Timeline** — 33-month Tc progression from first bulk signatures (Jul 2023) to current records.
- **Screener** — Predict onset Tc from epitaxial strain for any substrate lattice constant.

## Working heuristic

Three superconductor families (cuprates, nickelates, iron-based) motivate a working heuristic for high-Tc superconductivity at ambient pressure: compress the lattice into a high-Tc configuration under pressure, then use a physical trick (pressure quenching, epitaxial strain, interface coupling) to stabilize or mimic that configuration at ambient conditions. This is an organizing analogy for hypothesis generation, not a settled mechanism or forecast.

## Data export

The app's **export corpus** button downloads the current static corpus as JSON, including measurements, drawer records, gate definitions, failures, gap candidates, prediction inputs, and arXiv alerts. The deploy workflow also publishes the committed JSON files under the public data directory on GitHub Pages. The export is intended to make the curated rows inspectable; it does not make the private source repo, review history, or gate-assignment decisions independently reproducible.

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
- [Claim a prediction](../../issues/new?template=claim-prediction.yml) — signal your lab is attempting an experiment

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

MIT. See [LICENSE](LICENSE).
