# Ndiidii Scents

One Next.js app. The Google Sheet **is** the catalog — no database, no separate
API. The sheet is read server-side on each request, cached, and re-read the
moment the client edits it.

Cart state is line-based and lives in localStorage. A `line` is one set: exactly
`BOX_SIZE` (4) product slugs. The builders keep in-progress picks in local state
and only push a line to the cart once the set is complete, so a half-built set
never exists in the cart and can't block checkout. Discovery sets remain separate,
complete-only entries. Legacy `drafts`/`oils` are migrated on load.

The design is carried over unchanged from the old Vite + NestJS stack: the same
CSS (`src/styles/`), the same components, the same copy (`src/config/site.ts`).

## What it does

- Reads the **Perfumes** and **Perfume Oils** tabs of the sheet and serves them
  as SSR pages (homepage, `/shop`, `/perfumes/:slug`, `/oils/:slug`).
- Re-reads the sheet every 5 minutes, and within seconds of an edit (Apps Script
  ping → `/api/revalidate`).
- Shop filtering/sorting lives in the URL; the full catalog is fetched once on
  the server and filtered in the browser, so filters are instant.
- Product images are scraped from external fragrance retailers, matched to sheet
  rows, uploaded to Cloudinary, and written back to the sheet’s Image column
  automatically via `scripts/`.

## Run it

```bash
npm install
cp .env.example .env     # fill it in (Windows: copy .env.example .env)
npm run dev              # http://localhost:3000
```

Without sheet credentials the pages still render — the catalog is just empty
(the old "couldn't load" states become "no scents yet").

## Setup

### 1. Google Sheets access
1. console.cloud.google.com → create a project → enable **Google Sheets API**.
2. IAM & Admin → Service Accounts → create one → Keys → Add key → JSON.
3. Put the JSON's `client_email` in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and its
   `private_key` in `GOOGLE_PRIVATE_KEY` (one line, keep the `\n`, wrap in quotes).
4. **Share the sheet with that email address** (Viewer is enough).
5. `GOOGLE_SHEET_ID` is the long id in the sheet's URL (`/spreadsheets/d/<THIS>/edit`).
6. `PERFUME_TAB` / `OIL_TAB` must match the tab names at the bottom of the sheet exactly.

### 2. Instant updates when she edits the sheet
Paste `apps-script/sync-on-edit.gs` into the sheet (Extensions → Apps Script) and
follow the comment at the top. It needs the site on a public URL, so do this once
deployed. Until then the 5-minute revalidate covers it.

## Image pipeline

The repo includes a standalone image pipeline that keeps the sheet’s Image column
filled without manual work:

- `scripts/scrape-suppliers.mjs` — scrapes non-Shopify fragrance retailers
- `scripts/scrape-suppliers-shopify.mjs` — fetches Shopify `products.json` feeds
- `scripts/match.mjs` — normalizes titles and matches supplier images to sheet rows; outputs `data/match-map.json`
- `scripts/upload-cloudinary.mjs` — uploads matched images to Cloudinary; outputs `data/upload-map.json`
- `scripts/write-images.mjs` — writes Cloudinary URLs back to both **Perfumes** and **Perfume Oils** tabs

Name normalization collapses variant tokens like `La Fede`, `Eau de Parfum`, `100ml`, brackets, and punctuation so near-identical titles resolve to confident matches.

## Catalog enrichment (metadata backfill)

The sheet’s descriptive columns (`inspired by`, note pyramid, `season`, `occasion`,
`gender`, `scent profile`) go stale faster than images do. The tooling below fills
them without touching price or image columns.

```bash
node scripts/list-perfume-gaps.mjs        # who is missing what → data/perfume-gaps.json
node scripts/derive-scent-profiles.mjs     # derives scent profile from each row's own notes
node scripts/write-perfume-batch.mjs data/batch_N.json   # idempotent writer
```

- `scripts/list-perfume-gaps.mjs` — reads the live tab and writes `data/perfume-gaps.json`
  (`{row, brand, name, missing[], gapCount}`), sorted by row.
- `scripts/derive-scent-profiles.mjs` — for rows whose **only** gap is `scent profile`,
  derives the family from the notes already in the sheet (position-weighted: top ×1,
  heart ×2, base ×2), collapsed to a conventional two-family label (`Amber Woody`,
  `Fruity Gourmand`, `Woody Oud`). No external lookup, no invention — it only reads
  colours the sheet already contains. `--dry` previews without writing.
- `scripts/write-perfume-batch.mjs <file>` — matches rows by `(brand, name)`, writes
  **only** currently-blank cells, and reports every write. Safe to re-run.

Batch file shape (one object per product; empty strings are skipped):

```json
[{
  "brand": "Swiss Arabian",
  "name": "Shaghaf Oud Tonka",
  "inspired_by": "BDK Parfums Velvet Tonka",
  "top_notes": "Almond",
  "heart_notes": "Cinnamon, Tunisian Orange Blossom, Turkish Rose",
  "base_notes": "Tonka Bean, Vanilla, Amberwood",
  "season": "Autumn and Winter",
  "occasion": "Evening wear, date nights, cool weather",
  "gender": "Unisex",
  "scent_profile": "Amber Gourmand",
  "confidence": "high",
  "sources": ["https://…"],
  "flags": ""
}]
```

Editorial rules used for these fills — keep them if you add more:

- `season` is written with commas and `and` (`Spring and Summer`, `Autumn and Winter`).
- When sources disagree, take the value the **majority** of independent sources support
  and note the split in `flags`. If no majority exists, leave the field blank.
- Never invent notes. Blank is the correct answer when nothing reliable was found.
- Record `confidence` (`high` / `medium` / `low`) and `sources` on every row for audit.
- `inspired by` is only filled when a source explicitly says clone / dupe / inspired-by.
  Many catalogue houses (Swiss Arabian, Sapil, Hekayat Attar, Gulf Orchid, Zimaya) sell
  original compositions — those stay blank on purpose.

`data/FILL-GUIDE.md` is the hand-off version of this workflow (schema + commands),
written so research can be sourced elsewhere and pasted back as a batch file.

## Shop filters

All filter state lives in the URL (`?tier=2&gender=women&notes=Vanilla`), so any
filtered view can be linked or refreshed. `src/lib/shopQuery.ts` owns the shape;
`ShopShell` filters the server-delivered catalogue client-side for instant
response. Adding a filter means touching four places: `Filters`, `readFilters`,
`writeFilters`, `countActive` — plus the filter itself in `ShopShell` and a
`Section` in `FilterPanel`.

The products count in the heading is `filtered.length`, i.e. what the filters
actually produced. It is **not** the catalogue size; computing it from the
catalogue made the number ignore every filter except Collection.

### Notes filter

The sheet stores notes as prose (`"Rich Agarwood (Oud), Sandalwood, and Herbal
Notes."`), and splitting that naively gives ~2,000 distinct fragments, 1,300 of
them one-offs like `moked agarwood`. `src/lib/notes.ts` maps each fragment onto a
canonical ingredient name from its own `CANONICAL` list and drops anything that
doesn't map, leaving ~105 usable chips. Adding a note to that list adds it to the
filter. The panel shows 12 at a time with Show more / Show less, and always keeps
selected notes visible.

## Collection builder

`/collection-builder` (perfumes, picked per tier) and `/collection-builder/oils`
(any four oils, `All / Niche / Designer` tabs) share one model:

- Picks are held in local state, one draft per tier (perfumes) or one draft total
  (oils). A draft holds at most `BOX_SIZE`; a fifth pick is refused, not silently
  routed elsewhere.
- `Add Set to Cart` calls `addLine()` with the complete set and clears the draft.
  Nothing partial is ever written to the cart.
- Leaving the page loses the draft. That is deliberate — the alternative (writing
  drafts into cart lines) is what made the builder oscillate: with "current set"
  inferred as *the first line with fewer than four items*, that target moves the
  moment a set fills, so clicks land in a different set than the one on screen.
- On load, any stale partial `perfume`/`oil` lines from the old builder are folded
  into the draft (first per tier, only slugs still in the catalogue) and deleted,
  so an old cart can't open with phantom slots or block checkout.
- Set price comes from `TIER_BOX_PRICE_NGN` / `OIL_BOX_PRICE_NGN` — per **set**,
  matching what the cart charges.

## What the sheet needs

Row 1 is headers. The **first column is a unique ID** (her sheets already have
1, 2, 3…). Headers are matched loosely (case and punctuation ignored):

| Field | Accepted headers |
| --- | --- |
| Name | Perfume Name, Perfume Oil Name, Name |
| Brand | Brand |
| Gender | Gender (men / women / unisex) |
| Tier (perfumes) | Tier (`1`, `2`, `3` or `Tier 2`) |
| Category (oils) | Category (`Designer`, `High end` → shown as niche) |
| Scent profile | Scent profile (short label on cards, e.g. "Vanilla") |
| Notes | Top Notes, Heart notes, Base Notes |
| Inspired by | Inspired By |
| Stock | Stock, Quantity, Qty, Inventory |
| Photo | Image, Image URL, Photo |

**Prices:** perfumes have no price. The price belongs to the tier
(`src/lib/store.config.ts`), so a Price column in the sheet is ignored and never
reaches the site. Oils use `OIL_BOX_PRICE_NGN` in `src/lib/store.config.ts`.

**Known issue:** `getOils()` can return perfume data instead of oil data. This
appears to be a tab-mapping issue in `src/lib/catalog.ts`; it is flagged for
debugging later. As a workaround, `/oils/[slug]` falls back to `getPerfume()`
for slugs that exist in the perfume tab but not the oils tab.

Any other column is kept and ignored, so she can add columns freely. If she names
a column differently, add the name in `src/lib/mappers.ts` (`ALIASES`).

**Still to confirm:** her sheet has Tier, Gender and Scent profile columns, but no
Stock or photo column has shown up yet. Sold-out status needs a Stock column, and
product images need a photo link column (Image / Image URL / Photo). Until then,
set `DEFAULT_STOCK` in the environment to a non-zero value to show products as
available.

## Where things live

| What | File |
| --- | --- |
| All copy, links, nav, plans, brand list, footer | `src/config/site.ts` |
| Business rules (box size, tier prices, states) | `src/lib/store.config.ts` |
| Sheet reader (server-only) | `src/lib/sheets.ts` |
| Row → product mapping | `src/lib/mappers.ts` |
| Catalog read helpers (cached) | `src/lib/catalog.ts` |
| Shop filter shape (URL ↔ object) | `src/lib/shopQuery.ts` |
| Note normalisation + filter index | `src/lib/notes.ts` |
| Shop shell / filter panel | `src/components/ShopShell.tsx`, `src/components/FilterPanel.tsx` |
| Perfume + oil builders | `src/components/BuilderShell.tsx`, `src/components/OilBuilderShell.tsx` |
| Colours + fonts | `src/styles/tokens.css` |
| Homepage / shop / PDP styles | `src/styles/home.css`, `shop.css`, `pdp.css` |
| Components | `src/components/*` |
| Image pipeline scripts | `scripts/*.mjs` |
| Image pipeline data | `data/match-map.json`, `data/upload-map.json`, `data/supplier-scrape*.json` |
| Enrichment scripts | `scripts/list-perfume-gaps.mjs`, `scripts/derive-scent-profiles.mjs`, `scripts/write-perfume-batch.mjs` |
| Enrichment data | `data/perfume-gaps.json`, `data/batch_*.json`, `data/FILL-GUIDE.md` |

## Switching out-of-scope pieces off

`FEATURES` at the top of `src/config/site.ts` — set `subscription`, `wishlist`,
`account`, `guide`, `affiliate`, `requestPerfume` to `false` and the matching nav
links, hearts, sections and footer links disappear.

## Deploy

Vercel: connect the repo, set the env vars from `.env.example`, deploy. One
deploy target, no separate API, no database.
