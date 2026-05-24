# Inclusion criteria

This document records the rules the curator follows when deciding what enters
the nickelate.sc corpus, what gets a measurement record vs. a drawer record,
and how Tc values and evidence types are interpreted. It is a transcription
of the latent policy already implicit in the validation script
(`scripts/validate-data.mjs`) and the drawer corpus
(`src/data/palace/palace_drawers.json`), not an invention of new rules.

For known limitations of the corpus, see [`AUDIT.md`](../AUDIT.md). For the
22-gate definitions, see [`gate_definitions.md`](gate_definitions.md).

---

## What counts as a record

A **measurement record** (in `src/data/nickelate_dataset.json`) represents one
reported experimental observation of a nickelate material:

- a specific material chemistry,
- a specific synthesis route (PLD + ozone anneal, GAE, MBE, polycrystalline
  bulk, etc.),
- a specific substrate (for films) or pressure history (for bulk),
- a single reported Tc (or pair: onset + zero-resistance),
- a single primary source (`source_doi` / `source_url`).

A **drawer record** (in `src/data/palace/palace_drawers.json`) is the curated
22-gate encoding of a measurement plus its feature vector, evidence summary,
and bitmask. Drawer IDs are aligned with measurement IDs when both exist.

If a single paper reports multiple substrates, multiple growth attempts, or
materials that the authors themselves treat as distinct, each gets its own
record. If a paper reports a Tc sweep over composition or strain, the corpus
typically captures the **endpoint(s)** that the authors highlight as the
record, not every point on the sweep.

---

## Pressure class

Every record is assigned exactly one **pressure class**, validated by
`src/utils/pressureModes.js`:

- **`ambient`** — measured at or near 1 atm. Includes ambient films and
  ambient bulk. The validator accepts `pressure_gpa <= 0.001 GPa`.
- **`film_pressure`** — a thin film measured inside a pressure cell. The
  film substrate and growth method are preserved; the pressure is what
  separates it from ambient.
- **`bulk_pressure`** — polycrystalline or single-crystal bulk measured in
  a pressure cell, no thin-film substrate involved.

Records cannot belong to two classes simultaneously. If a paper reports both
ambient and pressurized measurements on the same physical sample, those are
**separate records** with separate IDs.

---

## What counts as superconductivity evidence

Each record's drawer encodes which evidence the source paper provides:

- `onset_tc_gt_30K`, `onset_tc_gt_77K` — onset of resistive drop above the
  threshold (gates 15, 16).
- `film_data_exists` — at least one measurement was on a thin film (gate 17).
- `multi_substrate_tested` — Tc reproducibility across substrates (gate 18).
- `diamagnetic_confirmed` — Meissner / diamagnetic susceptibility response
  reported by the authors (gate 19).
- `zero_resistance_seen` — R = 0 within instrumental noise reported by the
  authors (gate 20).

These gates reflect **claims in the source paper**, not independent
verification by the curator. A record can have an onset Tc gate set without
zero-resistance or diamagnetic gates if those measurements were not in the
source.

---

## Onset Tc vs. zero-resistance Tc vs. diamagnetic Tc

These are tracked separately:

- **`onset_tc`** — the temperature at which the source paper reports the
  start of the resistive transition (or the diamagnetic onset, if that is
  what the paper foregrounds). Most "Tc" numbers in the literature are
  onset values.
- **`zero_r_tc`** — the temperature at which the source paper reports
  R = 0 within instrumental noise. Often substantially lower than onset,
  and frequently absent for thin films.
- **Diamagnetic Tc** — not stored as a separate numeric field; recorded
  as the `diamagnetic_confirmed` gate when the source reports a Meissner
  response.

The corpus does **not re-derive** Tc from raw transport or susceptibility
curves. Tc criteria differ across papers (10% drop, midpoint, zero-R, onset
of diamagnetic susceptibility); the corpus accepts what the authors report.

---

## Preprints and arXiv

Preprints are **accepted** when the curator believes the result is
representative of the current state of nickelate superconductivity research
and the methodology is described in enough detail to encode the 22 gates.
This is a judgment call, not a rule.

When a preprint is later published, the record's `source_doi` and
`source_url` are updated to the published version; `arxiv` retains the
preprint identifier for traceability.

---

## Retractions, contested results, and negative results

- **Retractions** — if a source paper is formally retracted, the record is
  *not* deleted. It moves to `src/data/palace/palace_failures.json` with a
  failure type indicating retraction and a pointer to the original drawer
  ID. The visible corpus surfaces this as a "negative result," not as
  evidence of Tc.
- **Contested results** — when multiple groups report conflicting Tc on the
  same nominal material/substrate/strain, the corpus keeps both records and
  exposes the conflict via the contradiction-detection view in the UI.
  Pressure-class differences are treated as explained physics, not as
  contradictions.
- **Negative results** — failed attempts, irreproducible Tc claims, and
  excluded mechanisms are entered into `palace_failures.json`, with a
  `failure_type` (e.g., disorder, off-stoichiometry, retracted) and a
  `suspected_mechanism` field where applicable.

---

## Duplicate measurements

Records are **not deduplicated** across labs or papers when they nominally
study the same composition. Different growth routes, substrate batches, and
oxygen-treatment protocols are scientifically distinct even when the
chemistry label is the same; the corpus preserves that distinction.

Within a single paper, a multi-sample Tc histogram is typically captured as
**one record** at the headline Tc the paper foregrounds (often the highest
reported), with the histogram width mentioned in `notes`.

---

## Hypothetical vs. measured candidates

The corpus distinguishes two kinds of entries:

- **Measured records** live in `nickelate_dataset.json` and
  `palace_drawers.json`. Their Tc is a reported value from a primary source.
- **Hypothesis candidates** (also called *screening candidates* or *gap
  candidates*) live in `palace_gaps_nickelates.json`. They are bitmask
  configurations at gate distance 1 from a measured anchor that **no record
  occupies**. They are experiment prompts, not measurements.

A hypothesis candidate carries an `anchor_onset_tc_K` field referencing the
**measured anchor's Tc** — this is the Tc of a real material, not a forecast
for the candidate. Every gap entry also carries `candidate_predicted_tc_K:
null` and a `tc_display_warning` so the schema makes this explicit.
v0.1.0 does not contain any forecasted Tc values.

A separate file (`src/data/predictions.json`) lists named experiment prompts
with Tc *scenario ranges* — these are hypothesis-generating ranges sourced
back to specific measurement records, not predictions for unmeasured
materials.

---

## What the curator commits to

When entering or updating a record, the curator commits to:

- A primary `source_doi` that resolves to a real DOI, and a `source_url`
  whose path encodes that DOI (validated by `validate-data.mjs`).
- A single, unambiguous pressure class.
- A bitmask whose 22 gates the curator has explicitly evaluated against the
  source's reported evidence (no defaulting unread gates to N or to the
  nearest-neighbor record's value).
- If the record is in `palace_drawers.json`, agreement with the corresponding
  measurement record on DOI and pressure class.

---

## What the curator does *not* commit to

- Independent verification of the source paper's Tc, diamagnetic response,
  or zero-resistance claim.
- Completeness — there is no claim that every published nickelate
  superconductivity result is included.
- Stability of gate definitions across major version bumps. See
  [`CHANGELOG.md`](../CHANGELOG.md) for any redefinitions.
