# Release procedure

Operational steps for cutting a versioned archival release of nickelate.sc.
This document is the **single source of truth** for the manual steps that
mint a Zenodo DOI — it is intentionally separate from [`AUDIT.md`](../AUDIT.md),
which only covers known limitations.

The flow assumes you are on `main`, the working tree is clean, and you have
write access to the GitHub repository.

---

## 1 — Pre-release checks

```bash
npm install
npm run validate:data
npm run build:rankings
npm run build
```

All four should succeed. If `validate:data` fails, fix the underlying data
issue and re-run; do not bypass it. If `build:rankings` produces a
`dist/rankings.json` whose order disagrees materially with what the UI
shows, investigate before tagging — the two should agree.

Verify on a local preview:

```bash
npm run preview
```

Open the site, navigate to the **hypothesis-candidates** view, and confirm
every anchor Tc renders with the "anchor value only; not a forecast"
caveat. Check the landing-page footer renders the suggested-citation block.

---

## 2 — Bump the version

Edit four places (kept manually in sync — no auto-tooling at v0.1.0):

- [`package.json`](../package.json) → `"version"`
- [`CITATION.cff`](../CITATION.cff) → `version:` and `date-released:`
- [`.zenodo.json`](../.zenodo.json) → `"version"` and `"publication_date"`
- [`CHANGELOG.md`](../CHANGELOG.md) → add a `## [X.Y.Z] — YYYY-MM-DD` section

Commit the bump as a single commit titled `Cut vX.Y.Z`.

---

## 3 — Make the repo public (only once, before the very first release)

GitHub → Settings → General → Danger Zone → **Change repository visibility**
→ Make public. Confirm the prompt.

Skip this step on subsequent releases — the repo is already public.

---

## 4 — Authorize Zenodo (only once)

1. On GitHub: <https://github.com/settings/installations> — confirm the
   Zenodo app is authorized.
2. On Zenodo: <https://zenodo.org/account/settings/github/> — log in,
   then toggle the `flop95/nickelate-sc` repo **on**. Zenodo will now
   listen for new GitHub releases.

Skip on subsequent releases — the integration persists.

---

## 5 — Cut the GitHub release

GitHub → Releases → **Draft a new release**.

- Tag: `vX.Y.Z` (matches `package.json` and `CITATION.cff`).
- Target: `main`.
- Title: `nickelate.sc vX.Y.Z`.
- Description: paste the matching `## [X.Y.Z]` section of
  [`CHANGELOG.md`](../CHANGELOG.md). Keep it brief; the heavyweight
  description lives in `.zenodo.json` and is what Zenodo will display.

Click **Publish release**.

---

## 6 — Wait for Zenodo

Within a few minutes (sometimes up to ~15), Zenodo archives the release
and mints a DOI of the form `10.5281/zenodo.NNNNNNN`. You can watch the
deposit appear at <https://zenodo.org/account/settings/github/> under the
repo line.

Open the new deposit's Zenodo page to grab the DOI. Each release gets a
**version DOI**; Zenodo also assigns a **concept DOI** that always points
to the latest version — both are visible on the Zenodo record page.

---

## 7 — Wire the DOI back into the repo

In the source tree, do a global find-and-replace from the placeholder DOI
to the real one. The placeholder string used in v0.1.0 is:

```text
10.5281/zenodo.XXXXXXX
```

Files to update (exact occurrences live here):

- [`CITATION.cff`](../CITATION.cff) — `identifiers:` block.
- [`README.md`](../README.md) — "How to cite" section.
- [`src/components/PalaceOverview.jsx`](../src/components/PalaceOverview.jsx)
  — citation footer block.
- Any new doc files added since v0.1.0.

Commit as `Wire in Zenodo DOI for vX.Y.Z`. Push to `main`. The next site
deploy will display the real DOI in the landing-page footer.

You may also want to add a **concept-DOI** identifier alongside the version
DOI in `CITATION.cff` and in the README's suggested-citation block, so
readers citing "the dataset" get the always-latest DOI and readers citing a
specific snapshot get the version DOI.

---

## 8 — Optional follow-ups

- **GitHub release notes** — re-edit the release on GitHub to add the
  Zenodo DOI badge at the top of the description.
- **Tag the deploy** — if the GitHub Pages deploy lagged the release, run
  `npm run deploy` to refresh it.
- **Announce** — if the release crosses a meaningful threshold (new
  schema, audited records, peer-reviewed methods note), update the README
  status paragraph and consider a brief arXiv submission citing the DOI.

---

## Common failure modes

- **Zenodo did not pick up the release.** Confirm the toggle at
  <https://zenodo.org/account/settings/github/> is still on, and that the
  release was *published*, not *saved as draft*. Pre-release toggles also
  matter — Zenodo only archives full releases unless explicitly told
  otherwise.
- **CITATION.cff shows up unparsed on GitHub.** Validate with the
  online linter at <https://citation-file-format.github.io/cff-converter-web/>
  (or `pip install cffconvert && cffconvert --validate -i CITATION.cff`)
  and fix any schema errors.
- **DOI placeholder was missed in one place.** Search the repo for
  `XXXXXXX` after the find-and-replace pass.
