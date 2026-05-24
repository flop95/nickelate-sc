# Gate definitions

The nickelate.sc screening schema encodes each record as a 22-bit mask over
the gates listed below. This document is a human-readable companion to
[`src/data/palace/palace_gates.json`](../src/data/palace/palace_gates.json),
which is the machine-readable source of truth.

Gate indices are stable. **Never renumber gates between releases** — the
bitmask integers in `palace_drawers.json` and `palace_gaps_nickelates.json`
are positional. A new gate added in a future release must take a new index
(22, 23, ...) and the gate count must update accordingly.

All examples reference drawer/measurement IDs from v0.1.0; check
[`src/data/palace/palace_drawers.json`](../src/data/palace/palace_drawers.json)
for the actual records.

---

## Physical gates (0–9)

Structural and chemical features of the material itself. These do not depend
on how the sample was grown or measured.

### `[0] layered`

Material has a layered crystal structure.

Passes: every Ruddlesden–Popper phase in the corpus, infinite-layer NiO₂
films, all bilayer/trilayer nickelates. Fails: hypothetical 3D-network
nickelate variants not present at v0.1.0.

### `[1] metastable`

Synthesis route is non-equilibrium — typically pressure-quenched bulk or a
sample explicitly described as kinetically stabilized by the source paper.
Set only when the paper claims this; absence of the flag does not imply the
phase is ground-state stable.

Passes: La₁.₅₇Sm₁.₄₃Ni₂O₇−δ (96 K bulk-pressure record); film records that
the authors describe as quenched. Fails: most ambient films grown by PLD on
common substrates.

### `[2] c_over_a_4.8_5.8`

The c/a lattice-parameter ratio sits in the favorable Ruddlesden–Popper
bilayer band (4.8–5.8). The curator computes this from reported lattice
parameters; the gate is set only when both `film_c` and `film_a` (or the
corresponding bulk parameters) are reported and the ratio falls in the band.

### `[3] perovskite_family`

Material belongs to the perovskite family (ABO₃-derived, including
Ruddlesden–Popper, infinite-layer, brownmillerite-derived).

### `[4] apical_oxygen_present`

Apical oxygen is present in the unit cell — i.e., the Ni–O octahedra are
complete with axial oxygens (Ni₂O₆, Ni₂O₇, Ni₃O₁₀ environments).

Passes: bilayer (n=2) RP, trilayer (n=3) RP. Fails: infinite-layer NiO₂
phase (gate `[8]`).

### `[5] n_equals_2_rp`

n=2 Ruddlesden–Popper bilayer (formula Ni₂O₇). Dominant family in the
v0.1.0 corpus.

### `[6] Pr_substituted`

Pr substitution appears in the chemical formula on the A-site.

### `[7] Sr_substituted`

Sr substitution appears in the chemical formula on the A-site.

### `[8] infinite_layer_phase`

Infinite-layer NiO₂ phase — no apical oxygen, the planes are pure square-net
NiO₂. Mutually exclusive with gate `[4]` in practice.

### `[9] trilayer_rp`

n=3 Ruddlesden–Popper trilayer (Ni₃O₁₀). Deferred-active: present in the
schema for completeness, sparsely populated at v0.1.0.

---

## Control gates (10–14)

Knobs that the experimenter can turn — synthesis, strain, doping, pressure.

### `[10] tweakable`

The composition is chemically dopable / substitutable in a way that has
been reported in the literature.

### `[11] compressive_gt_0.5pct`

Compressive strain greater than 0.5 % (substrate-induced for films;
pressure-induced for bulk only when the source explicitly maps strain to
the in-plane lattice parameter).

### `[12] compressive_gt_1pct`

Compressive strain greater than 1 %. Implies gate `[11]`.

### `[13] ambient_pressure`

Sample measured at ambient pressure (1 atm, ~0 GPa). Required for the
**ambient** pressure class. Records measured inside a pressure cell do not
set this gate, even if the film growth was at ambient.

### `[14] doping_explored`

The source paper or a closely related paper from the same lab reports
deliberate doping variants of the same chemistry. Not set for stoichiometric
nominal compositions where no doping series has been explored.

---

## Evidence gates (15–21)

What the source paper actually demonstrates. These reflect the paper's
claims, not the curator's independent verification.

### `[15] onset_tc_gt_30K`

Source reports an onset Tc above 30 K.

### `[16] onset_tc_gt_77K`

Source reports an onset Tc above 77 K (above liquid nitrogen). Implies
gate `[15]`.

### `[17] film_data_exists`

At least one measurement in the record is on a thin film. Bulk records do
not set this gate.

### `[18] multi_substrate_tested`

Tc reproducibility across multiple substrate lattice constants is reported.

### `[19] diamagnetic_confirmed`

Diamagnetic / Meissner response is confirmed in the source paper.

### `[20] zero_resistance_seen`

R = 0 within instrumental noise is reported.

### `[21] data_2024_or_later`

Source paper or preprint is from 2024 or later. Useful as a recency proxy
when scanning recent activity.

---

## How gates compose

Each record's `bitmask` integer is the bitwise OR of `(1 << index)` for
every gate the record satisfies. `palace_drawers.json` also carries:

- `bitmask_binary` — the same value as a 22-bit string for visual
  inspection.
- `feature_vector` — a normalized split across the three categories
  (physical / control / evidence), useful for category-weighted similarity
  computations.

Distances between records (and between gap candidates and their anchors)
are computed as **Hamming distance** over the 22 gates. See
[`ranking_method.md`](ranking_method.md) for the retrieval pipeline.

---

## Adding or modifying gates

If a future release needs to:

- **Add a new gate**: append it at index 22 (or higher). Bump the `count`
  field in `palace_gates.json`. Existing bitmasks remain valid — the new
  gate is `N` (unset) on every existing record until the curator
  re-evaluates each record.
- **Tighten a gate criterion** (e.g., raise the c/a band): treat as a
  breaking change. Re-encode every record's bitmask and note the change in
  [`CHANGELOG.md`](../CHANGELOG.md).
- **Remove a gate**: do not. Mark it as deprecated in this document and
  ignore it in distance computations, but keep the index allocated. Reusing
  an index silently flips the meaning of historical bitmasks.
