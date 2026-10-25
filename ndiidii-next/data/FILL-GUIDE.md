# Ndiidii Perfumes Sheet — Gap Fill Package

## Goal
Fill the missing catalog metadata in the **Perfumes** tab:
`inspired by`, `top notes`, `heart notes`, `base notes`, `season`, `occasion`, `gender`, `scent profile`

## What’s inside this package
- `data/perfume-gaps.json` — all sheet rows that still have at least one blank target field
- `scripts/write-perfume-batch.mjs` — idempotent writer: only writes blanks, never overwrites existing values
- `data/batch_<ids>.json` — validated preview batches ready to write

## Current sheet status
- Total data rows: **1099**
- Rows missing ≥1 target field: **558**
- Target columns: `inspired by`, `top notes`, `heart notes`, `base notes`, `season`, `occasion`, `gender`, `scent profile`

## How to run

### 1. Create a preview batch
Edit `data/batch_731_735.json` (or any new `data/batch_<ids>.json`) with this shape:

```json
[
  {
    "brand": "Lattafa Pride",
    "name": "Stop Wait Go Kids Perfume",
    "inspired_by": "",
    "top_notes": "Peach, Lavender, Pear",
    "heart_notes": "Orchid, Praline, Coconut",
    "base_notes": "Amber, Musk, Sandalwood",
    "season": "Spring and Summer",
    "occasion": "Everyday wear, school, birthday parties, casual outings",
    "gender": "Unisex",
    "scent_profile": "Fruity Gourmand",
    "confidence": "high",
    "sources": [
      "https://www.lattafa-usa.com/products/stop-wait-go",
      "https://www.fragrantica.com/perfume/Lattafa-Perfumes/Stop-Wait-Go-98249.html"
    ],
    "flags": ""
  }
]
```

Rules:
- Leave fields as `""` when unknown; the writer will skip them
- `confidence`: `high` if 2+ independent sources agree, `medium` if single source, `low` if inferred
- `sources`: include the URLs you got the data from
- `flags`: note any conflicts or uncertainties

### 2. Write a batch to the sheet

```bash
cd C:\Users\Cicada\Desktop\code\Ndiidii_proj\ndiidii_scents_app\ndiidii-next
node scripts/write-perfume-batch.mjs --batch data/batch_731_735.json
```

The script will:
1. Read the live Perfumes tab headers
2. Match each record by `(brand, name)`
3. Only write cells that are currently blank
4. Print exactly what it wrote and what it skipped

### 3. Verify

```bash
node scripts/scan-sheet-gaps.mjs
```

Run this after writing to confirm the gap count dropped.

## Writer script: `scripts/write-perfume-batch.mjs`

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DATA = join(process.cwd(), 'data');
const batchPath = process.argv[2] || join(DATA, 'batch.json');
const batch = JSON.parse(readFileSync(batchPath, 'utf8'));

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = 'Perfumes';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;

const auth = new google.auth.JWT({
  email,
  key: key.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const readRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const headers = (readRes.data.values ?? [])[0] ?? [];
const headerIdx = {};
headers.forEach((h, i) => { headerIdx[String(h ?? '').trim().toLowerCase()] = i; });

const colMap = {
  'inspired by': 'inspired_by',
  'top notes': 'top_notes',
  'heart notes': 'heart_notes',
  'base notes': 'base_notes',
  'season': 'season',
  'occasion': 'occasion',
  'gender': 'gender',
  'scent profile': 'scent_profile',
};

const cols = {};
for (const [sheetH, batchKey] of Object.entries(colMap)) {
  cols[batchKey] = headerIdx[sheetH] ?? -1;
}

const rows = (readRes.data.values ?? [])?.slice(1) ?? [];
const byKey = new Map();
rows.forEach((r, i) => {
  const n = String(r[1] ?? '').trim();
  const b = String(r[2] ?? '').trim();
  if (n && b) byKey.set(`${b.toLowerCase()}|${n.toLowerCase()}`, { row: r, sheetIdx: i + 2 });
});

const targetFields = ['inspired_by','top_notes','heart_notes','base_notes','season','occasion','gender','scent_profile'];
const updates = [];

for (const rec of batch) {
  const key = `${rec.brand.trim().toLowerCase()}|${rec.name.trim().toLowerCase()}`;
  const match = byKey.get(key);
  if (!match) {
    console.log(`NOT FOUND: ${rec.brand} | ${rec.name}`);
    continue;
  }

  const sheetRow = match.row;
  const existing = {};
  for (const f of targetFields) {
    existing[f] = (sheetRow[cols[f]] ?? '').trim();
  }

  const willWrite = [];
  for (const f of targetFields) {
    const val = (rec[f] ?? '').trim();
    if (val && !existing[f]) willWrite.push({ field: f, value: val });
  }

  if (willWrite.length === 0) {
    console.log(`SKIP (already filled): ${rec.brand} | ${rec.name}`);
    continue;
  }

  for (const item of willWrite) {
    const sheetCol = cols[item.field];
    if (sheetCol < 0) {
      console.log(`SKIP (missing column): ${rec.brand} | ${rec.name} | ${item.field}`);
      continue;
    }
    const colLetter = String.fromCharCode(65 + sheetCol);
    updates.push({
      range: `${colLetter}${match.sheetIdx}`,
      values: [[item.value]],
    });
    console.log(`WRITE: ${rec.brand} | ${rec.name} | ${item.field} -> ${colLetter}${match.sheetIdx}`);
  }
}

if (updates.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates.map(u => ({ range: u.range, values: u.values })),
    },
  });
  console.log(`\n>>> Wrote ${updates.length} cells to the Google Sheet.`);
} else {
  console.log('\n>>> Nothing to write.');
}
```

## Gap scanner: `scripts/scan-sheet-gaps.mjs`

Already exists in the repo. Run it to see the current missing-field count and top gaps:

```bash
node scripts/scan-sheet-gaps.mjs
```

## Notes
- The writer is **idempotent**: it won’t overwrite existing values
- Always preview with `scan-sheet-gaps.mjs` before and after writing
- If a row has no reliable source, leave it blank rather than guessing
- When sources conflict, pick the value supported by the majority of independent sources
