# nickelate-sc

Empirical screening tool for nickelate superconductor research.

**Live:** https://flop95.github.io/nickelate-sc/

Tracks all published La₃Ni₂O₇ thin film measurements, detects contradictions in the data, runs sensitivity analysis, and ranks untested experiments by priority. arXiv alerts update weekly.

## What it does

- **Engine** — Interactive data explorer for 18 published nickelate film measurements. Scatter plot (strain vs Tc, toggleable to c/a ratio), sortable/filterable table with expandable synthesis recipe cards.
- **Contradiction detection** — Auto-flags entries where the same material + substrate + strain reports Tc values differing by >5K. Identifies the likely explanatory variable (growth method, pressure, doping).
- **Sensitivity analysis** — Sweep strain, substrate a-axis, or growth method to see marginal effects on Tc. Linear regression with slope and R² displayed.
- **Predictions** — 5 ranked experiments with predicted Tc ranges, confidence levels, lab difficulty ratings (equipment, substrate availability, cost tier), and claim links.
- **arXiv alerts** — Weekly automated scan of arXiv for new nickelate SC papers. Extracts material, substrate, Tc from abstracts and diffs against the dataset.
- **Timeline** — 33-month Tc progression from first bulk signatures (Jul 2023) to current records.
- **Screener** — Predict onset Tc from epitaxial strain for any substrate lattice constant.

## Key finding

Three independent superconductor families (cuprates, nickelates, iron-based) independently discovered the same strategy for achieving high-Tc superconductivity at ambient pressure: compress the lattice into a high-Tc configuration under pressure, then use a physical trick (pressure quenching, epitaxial strain, interface coupling) to stabilize that configuration at ambient conditions.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/

## arXiv alerts

[`src/data/arxiv_alerts.json`](src/data/arxiv_alerts.json) is refreshed every Monday by [`.github/workflows/arxiv-watcher.yml`](.github/workflows/arxiv-watcher.yml), which runs [`scripts/arxiv_watcher.py`](scripts/arxiv_watcher.py) against the public arXiv API and commits any new hits. To run it manually:

```bash
pip install -r scripts/requirements.txt
python scripts/arxiv_watcher.py --days 30
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
- Zhao/Sun, arXiv:2603.29531 — film + pressure to 68.5K

## Further reading

- [docs/research-brief.html](docs/research-brief.html) — full meta-analysis across cuprate / nickelate / iron-based families, with five ranked predictions
- [docs/populated-entry.html](docs/populated-entry.html) — La₃Ni₂O₇ catalog entry, typeset as a journal page (FIG. 1 § 4)

## Stack

React 18 + Vite 6. No backend — all data committed as JSON; deployed as static files via GitHub Pages. A small Python script refreshes arXiv alerts weekly.

## License

MIT. See [LICENSE](LICENSE).
