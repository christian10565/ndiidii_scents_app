# scripts/

One-off junk removed (Oct 2026): the `fix-swap*` / `swap-fix*` family, the
`*-next10` migration, `verify-*` runs from finished data fixes, `tmp-*` debug
files, and duplicate/inlined variants. Everything here does a job that can be
re-run, and the paths below are the ones referenced by `README.md`,
`AGENTS.md` and `.gitignore`.

All scripts run from `ndiidii-next/` (they resolve `data/` and `.env` relative to
the project root), e.g. `node scripts/list-perfume-gaps.mjs`. `.env` must be
present — the sheet readers use the Google service account, not the browser
session.

## Catalog enrichment (the documented workflow)

| Script | Does |
| --- | --- |
| `list-perfume-gaps.mjs` | → `data/perfume-gaps.json`: every row missing ≥1 of the 8 descriptive fields, with row numbers |
| `derive-scent-profiles.mjs` | Fills `scent profile` **only** for rows whose sole gap is that field, derived from the sheet's own note pyramid. `--dry` to preview |
| `write-perfume-batch.mjs data/batch_N.json` | Idempotent writer: matches on `(brand, name)`, fills blanks only, never overwrites. **Fills every match** — duplicate `(brand, name)` rows exist |
| `scan-sheet-gaps.mjs` | Read-only report of sheet gaps before you start a batch |

## Image pipeline

| Script | Does |
| --- | --- |
| `fetch-zaoud.mjs` | Downloads Zaoud's whole catalog via the Shopify `products.json` endpoint → `data/zaoud-products.json` (gitignored, 12MB) |
| `fetch-shopify.mjs` | Same for any other Shopify supplier → `data/shopify-<supplier>.json` (gitignored) |
| `scrape-suppliers.mjs` / `scrape-suppliers-shopify.mjs` | Scrape/parse supplier image sets into the same shape |
| `match.mjs` | Matches every sheet row to a supplier product for its image → `data/match-map.json` |
| `upload-cloudinary.mjs` | Uploads matched images to Cloudinary → `data/upload-map.json` |
| `write-images.mjs` | Writes Cloudinary URLs back into the sheet's Image column, **both** the Perfumes and Perfume Oils tabs |
| `check-image-coverage.mjs` / `check-coverage.mjs` | Report how much of the sheet actually has an image / mapped product |

## Sheet + snapshot diagnostics

| Script | Does |
| --- | --- |
| `sheet-tabs.mjs` | Lists tab titles — use it when a tab name changes (the curated tab has a leading space) |
| `dump-sheet-headers.mjs` | Dumps each tab's header row, for `ALIASES` in `src/lib/mappers.ts` |
| `check-sheets.mts` | Reads both tabs through the real mapper and reports row counts + the first product (`npx tsx scripts/check-sheets.mts`) |
| `verify-snapshot-vs-sheet.mjs` | Compares the local/Redis catalog snapshot against the live sheet → `data/snapshot-vs-sheet-report.json`, so you audit through the app's own mapping path before refreshing |

## E2E (needs a running server)

`e2e-home.mjs`, `e2e-nav.mjs`, `e2e-shop.mjs`, `e2e-builder.mjs` — headless
Chromium (Playwright) assertions against `localhost:3000`. Start `npm run dev`
first.

`lib/normalise.mjs` is the shared text/name normaliser those and `match.mjs`
import — don't move it without updating them.
