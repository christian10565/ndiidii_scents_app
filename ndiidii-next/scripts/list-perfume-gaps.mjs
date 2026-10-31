import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = process.env.PERFUME_TAB ?? 'Perfumes';
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const all = res.data.values ?? [];
const headers = (all[0] ?? []).map((h) => String(h ?? '').trim().toLowerCase());
const idx = {};
headers.forEach((h, i) => { if (h) idx[h] = i; });

const nameIdx = idx['perfume name'] ?? idx['name'] ?? -1;
const brandIdx = idx['brand'] ?? -1;

const fields = [
  ['inspired by', 'inspired_by'],
  ['top notes', 'top_notes'],
  ['heart notes', 'heart_notes'],
  ['base notes', 'base_notes'],
  ['season', 'season'],
  ['occasion', 'occasion'],
  ['gender', 'gender'],
  ['scent profile', 'scent_profile'],
];

const gaps = [];
for (let r = 1; r < all.length; r++) {
  const row = all[r];
  const name = String(row[nameIdx] ?? '').trim();
  const brand = String(row[brandIdx] ?? '').trim();
  if (!name || !brand) continue;
  const missing = [];
  for (const [sheetH, key] of fields) {
    const c = idx[sheetH];
    if (c === undefined) continue;
    if (!String(row[c] ?? '').trim()) missing.push(key);
  }
  if (missing.length === 0) continue;
  gaps.push({ row: r + 1, brand, name, missing, gapCount: missing.length });
}

gaps.sort((a, b) => a.row - b.row);
writeFileSync(join(process.cwd(), 'data', 'perfume-gaps.json'), JSON.stringify(gaps, null, 2));

const byCount = {};
for (const g of gaps) byCount[g.gapCount] = (byCount[g.gapCount] || 0) + 1;
console.log(`Total rows: ${all.length - 1}`);
console.log(`Rows with gaps: ${gaps.length}`);
console.log('By gap count:', JSON.stringify(byCount));
console.log('\nFirst 30 by row:');
for (const g of gaps.slice(0, 30)) {
  console.log(`${g.row}\t${g.brand}\t${g.name}\t(${g.missing.length}) ${g.missing.join(',')}`);
}
