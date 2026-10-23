import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = 'Perfumes';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;

const auth = new google.auth.JWT({
  email,
  key: key.replace(/\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// ---- Next-batch source of truth (has correct base notes, season) ----
const batch = JSON.parse(readFileSync(join(process.cwd(), 'data', 'next-batch.json'), 'utf8'));
const batchByKey = new Map();
batch.forEach(r => {
  batchByKey.set(`${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`, r);
});

// ---- Read sheet ----
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

const nameIdx = idx['Perfume Name'];
const brandIdx = idx['Brand'];
const baseIdx = idx['Base Notes'];
const seasonIdx = idx['Season'];
const occasionIdx = idx['Occasion'];

// ---- Match targets ----
const targets = new Set(batch.map(r => `${r.brand.toLowerCase()}|${r.name.toLowerCase()}`));
const rowsToFix = [];
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][nameIdx] ?? '';
  const brand = allRows[i][brandIdx] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  if (!targets.has(key)) continue;

  const entry = batchByKey.get(key);
  rowsToFix.push({
    sheetIdx: i + 1,
    name: entry.name,
    baseNotes: (entry.notes?.base || '').trim(),
    season: (entry.season || '').trim(),
    occasion: (entry.extra?.Occasion || '').trim(),
  });
}

console.log(`Rows matched: ${rowsToFix.length}`);

// ---- Fix the clobbered cells ----
// Column map (0-based):
//   6 = G = Base Notes
//   7 = H = Season
//   8 = I = Occasion
//
// The prose script wrote to G (Base Notes, wrong) and H (Season).
// We need to:
//   1. Restore Base Notes from next-batch.json
//   2. Set Season (H) to the season value
//   3. Set Occasion (I) to the occassion value

const updates = [];
let fixed = 0;

for (const r of rowsToFix) {
  const row = allRows[r.sheetIdx - 1];

  // 1. Fix Base Notes (G) — was clobbered by prose script
  if (row[baseIdx] !== r.baseNotes) {
    updates.push({ range: `G${r.sheetIdx}`, value: r.baseNotes });
    fixed++;
  }

  // 2. Fix Season (H) — set to batch season value
  if (row[seasonIdx] !== r.season) {
    updates.push({ range: `H${r.sheetIdx}`, value: r.season });
    fixed++;
  }

  // 3. Fix Occasion (I) — set to occassion value
  if (row[occasionIdx] !== r.occasion) {
    updates.push({ range: `I${r.sheetIdx}`, value: r.occasion });
    fixed++;
  }
}

console.log(`Cells to write: ${updates.length}`);

if (!updates.length) {
  console.log('\n>>> Nothing to write.');
  process.exit(0);
}

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\n>>> Wrote ${updates.length} cells: ${updates.map(u => u.range).join(', ')}`);
