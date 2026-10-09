# Ndiidii Scents — API (Step 1: catalog + Google Sheets sync)

NestJS + TypeORM + Postgres (Supabase). Reads the client's Google Sheet into the database and serves it to the React site.

## What it does

- Copies the **Perfumes** and **Perfume Oils** tabs of the sheet into Postgres — every 10 minutes, and ~15 seconds after she edits the sheet (Apps Script ping).
- Serves the catalog: `GET /api/perfumes`, `/api/perfumes/:slug`, `/api/oils`, `/api/oils/:slug`, `/api/brands`, `/api/config`.
- **Stock lives in the database.** The sheet's Stock number only overrides it when she *changes* that number. Otherwise the sheet's old figure would undo every sale.
- A row removed from the sheet is hidden from the shop, not deleted (old orders still point at it).
- If a sync reads zero usable rows (wrong tab name, sheet cleared by mistake), nothing is changed.

## Setup

### 1. Database (Supabase)
Create a project → Project Settings → Database → copy the connection string into `DATABASE_URL`. If your host is IPv4-only, use the pooled ("Transaction pooler") string.

### 2. Google Sheets access
1. console.cloud.google.com → create a project → enable **Google Sheets API**.
2. IAM & Admin → Service Accounts → create one → Keys → Add key → JSON.
3. Put the JSON's `client_email` in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and its `private_key` in `GOOGLE_PRIVATE_KEY` (one line, keep the `\n`, wrap in quotes).
4. **Share the sheet with that email address** (Viewer is enough).
5. `GOOGLE_SHEET_ID` is the long id in the sheet's URL (`/spreadsheets/d/<THIS>/edit`).
6. `PERFUME_TAB` / `OIL_TAB` must match the tab names at the bottom of the sheet exactly.

### 3. Run it
```bash
npm install
cp .env.example .env      # fill it in (Windows: copy .env.example .env)
npm run start:dev         # http://localhost:3000/api
```

First sync, and a look at the report (what was created, skipped, and why):
```bash
curl -X POST -H "x-sync-secret: YOUR_SYNC_SECRET" http://localhost:3000/api/sync/now
```
Then open http://localhost:3000/api/perfumes

### 4. Instant updates when she edits the sheet
Paste `apps-script/sync-on-edit.gs` into the sheet (Extensions → Apps Script) and follow the comment at the top. It needs the API on a public URL, so do this once deployed. Until then the 10-minute sync covers it.

## What the sheet needs

Row 1 is headers. The **first column is a unique ID** (her sheets already have 1, 2, 3…). Headers are matched loosely (case and punctuation ignored):

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

**Prices:** perfumes have no price. The price belongs to the tier (`src/config/store.config.ts`), so a Price column in the sheet is ignored and never reaches the site.

**Tiers:** every perfume needs a Tier. A perfume without one still imports, but the sync report lists it (`GET /api/sync/status`), because it can't go into a box.

**Gender wording:** Men / Masculine / Male, Women / Feminine / Female, and Unisex all work. "Unisex (masculine leaning)" counts as unisex.

Any other column is kept and ignored, so she can add columns freely. If she names a column differently, add the name in `src/sync/mappers.ts` (`ALIASES`).

**Still to confirm:** her sheet has Tier, Gender and Scent profile columns, but no Stock or photo column has shown up yet. Sold-out status needs a Stock column, and product images need a photo link column (Image / Image URL / Photo).

## Business rules (one file)
`src/config/store.config.ts` — box size (4), tier box prices, the Nigerian states list, oil box price (not set yet).

## Notes
- `DB_SYNC=true` lets TypeORM create the tables for you while building. Switch to migrations before launch.
- Supabase free projects pause after a week of inactivity and have no automatic backups — check current terms before taking real orders.
