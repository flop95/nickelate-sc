# Audit & limitations

Known limitations and trust boundaries for **nickelate.sc**. The point of this
document is to be the single place where the project says, in plain language,
what this resource *is not*. If you are about to cite or build on the corpus,
read this first.

For operational release steps see [docs/release_procedure.md](docs/release_procedure.md);
for inclusion rules see [docs/inclusion_criteria.md](docs/inclusion_criteria.md);
for the ranking machinery see [docs/ranking_method.md](docs/ranking_method.md).

---

## Authorship and review

- The author identity (`flop95`) is **pseudonymous**. There is no ORCID, no
  affiliation, and no public review history.
- There is **no peer review and no editorial board**. The corpus is one
  curator's reading of the public literature.
- The corpus is **not endorsed by any of the cited authors, groups, journals,
  or preprint servers**. All inclusion decisions are the curator's.

If you need an attributable, peer-reviewed reference, **cite the primary
literature** linked from each record's `source_doi` / `source_url`, not this
corpus.

---

## Corpus scope and size

- The corpus is **small** — 23 curated measurements at v0.1.0. It is not a
  comprehensive census of nickelate superconductivity; it is a working
  notebook over what the curator has read.
- Coverage is **biased toward the bilayer (n=2) Ruddlesden–Popper family**
  with a small set of related phases (infinite-layer, trilayer, Pr/Sr
  substitutions). Cuprates, pnictides, hydrides, and conventional rooms exist
  only as placeholder structure for future expansion.
- Some records may represent **related samples from the same lab or paper**;
  the corpus does not deduplicate aggressively across measurements of the
  same nominal composition.

---

## Schema and gate assignments

- The 22 screening gates (10 physical, 5 control, 7 evidence) are
  **hand-coded**. They reflect the curator's prior about what features
  *might* matter for nickelate superconductivity, not a learned or validated
  feature set.
- Gate assignments per record are **manual judgments**. The
  `palace_drawers.json` bitmask is what the curator believes the record
  satisfies after reading the source; it is not extracted automatically.
- There is **no held-out validation set** and **no out-of-sample test**.
  Gate definitions and the corpus were developed together.

See [docs/gate_definitions.md](docs/gate_definitions.md) for the full criteria.

---

## Tc values

- Tc values are **as reported by the original authors** and may use different
  criteria across papers (onset of resistive drop, mid-point, zero-resistance,
  diamagnetic onset). The corpus exposes `onset_tc` and `zero_r_tc` separately
  where both are reported, but does not re-derive Tc from raw data.
- The `evidence` gates (diamagnetic confirmed, zero-resistance seen, etc.)
  reflect what the **source paper claims**. The curator does not independently
  verify diamagnetic susceptibility traces, transport curves, or sample
  quality.

---

## Ranking and "nearest anchor" semantics

- The "gap candidate" ranking is a **bitmask Hamming-distance retrieval**
  over the 22-gate space, not a probability estimate, a Bayesian posterior,
  or a Tc forecast. See [docs/ranking_method.md](docs/ranking_method.md).
- Each gap entry surfaces a **nearest-neighbor anchor Tc**
  (`anchor_onset_tc_K`). **This is a value measured on the anchor material,
  not a prediction for the candidate.** Every gap also carries
  `candidate_predicted_tc_K: null` and a `tc_display_warning` to make this
  explicit; the UI repeats the warning at every render site.
- "Proximity" and "risk" labels are curator heuristics (gate distance to
  nearest success, gate distance to nearest known failure). They are
  ordinal labels for browsing, not calibrated probabilities.

---

## Reproducibility boundary

- The curated JSON inputs in `src/data/` are versioned in git. Running
  `npm run validate:data` checks DOI/URL consistency, pressure-mode
  agreement, and gap-anchor closure. Running `npm run build:rankings`
  re-derives `dist/rankings.json` and `dist/corpus.json` from those inputs.
- What is **not** reproducible from this repo: the curator's gate-assignment
  decisions (a record's bitmask reflects a manual reading of the source paper)
  and the inclusion/exclusion calls (which papers entered the corpus and which
  didn't). These are documented in
  [docs/inclusion_criteria.md](docs/inclusion_criteria.md) but they are
  policies, not formal rules a script can re-derive.

---

## Versioning and persistence

- The site at `flop95.github.io/nickelate-sc` is **live** and will change.
  The **archived release** (Zenodo DOI, tagged `v0.1.0` on GitHub) is the
  citable object — cite the DOI, not the URL.
- Schema may shift before any future `v1.0`. Breaking changes will be noted
  in [CHANGELOG.md](CHANGELOG.md). Field renames in v0.1.0 are documented
  there.

---

## What would move this corpus toward a stronger object

The items below are not in v0.1.0. They are listed so readers can calibrate
how far this is from a peer-reviewed reference dataset:

- ORCID-linked author identity.
- Peer-reviewed data descriptor (e.g. *Scientific Data* article or arXiv
  methods note).
- An independent reviewer or co-curator who has audited the gate assignments
  on a sample of records.
- Tests asserting record-schema validity beyond the current URL/DOI/pressure
  checks.
- A held-out validation set: records included in the corpus that were
  *excluded* from any ranking/scoring during development, and against which
  the retrieval order can be checked.
- Calibrated probability estimates (anything labeled as a "predicted Tc").
