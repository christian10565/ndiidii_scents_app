# Ndiidii Scents

One Next.js app. The Google Sheet **is** the catalog — no database, no separate
API. The sheet is read server-side on each request, cached, and re-read the
moment the client edits it.

Cart state is line-based and lives in localStorage. Each set is a `line` with
up to 4 product slugs. Partial sets are visible immediately; checkout is blocked
until every line is complete. Discovery sets remain separate, complete-only
entries. Legacy `drafts`/`oils` are migrated on load.

The design is carried over unchanged from the old Vite + NestJS stack: the same
CSS (`src/styles/`), the same components, the same copy (`src/config/site.ts`).

## What it does

- Reads the **Perfumes** and **Perfume Oils** tabs of the sheet and serves them
  as SSR pages (homepage, `/shop`, `/perfumes/:slug`).
- Re-reads the sheet every 5 minutes, and within seconds of an edit (Apps Script
  ping → `/api/revalidate`).
- Shop filtering/sorting lives in the URL; the full catalog is fetched once on
  the server and filtered in the browser, so filters are instant.

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
| Colours + fonts | `src/styles/tokens.css` |
| Homepage / shop / PDP styles | `src/styles/home.css`, `shop.css`, `pdp.css` |
| Components | `src/components/*` |

## Switching out-of-scope pieces off

`FEATURES` at the top of `src/config/site.ts` — set `subscription`, `wishlist`,
`account`, `guide`, `affiliate`, `requestPerfume` to `false` and the matching nav
links, hearts, sections and footer links disappear.

## Deploy

Vercel: connect the repo, set the env vars from `.env.example`, deploy. One
deploy target, no separate API, no database.
