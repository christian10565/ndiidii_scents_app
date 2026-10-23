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
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Read the full tab
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

console.log('=== Current sheet state (headers) ===');
console.log(headers.join(' | '));
console.log();

// The next 10 entries (from next-batch.json)
const next10 = [
  { brand: 'Lattafa Pride', name: 'Queen of Arabia', id: 117 },
  { brand: 'Khadlaj', name: 'Le Prestige Bold', id: 141 },
  { brand: 'Khadlaj', name: 'Le Prestige King', id: 142 },
  { brand: 'Lattafa Pride', name: 'Gharam', id: 144 },
  { brand: 'Maison Alhambra', name: 'Kismet Magic', id: 146 },
  { brand: 'Khadlaj', name: 'Island Vanilla Dunes', id: 147 },
  { brand: 'Maison Alhambra', name: 'Sceptre Oceana', id: 150 },
  { brand: 'Maison Asrar', name: 'Cascade Blue', id: 154 },
  { brand: 'Maison Asrar', name: 'Aseel', id: 170 },
  { brand: 'Arabiyat Prestige', name: 'Ramad Louban', id: 184 },
];

console.log('=== Verifying current state of next-10 batch ===');
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][idx['Perfume Name']] ?? '';
  const brand = allRows[i][idx['Brand']] ?? '';
  const row = next10.find(r => r.brand === brand && r.name === name);
  if (!row) continue;

  const f = (col) => allRows[i][idx[col]] ?? '(empty)';
  console.log(`\n[${row.id}] ${row.brand} | ${row.name}`);
  console.log(`  Top Notes (D): ${f('Top Notes')}`);
  console.log(`  Heart notes (E): ${f('Heart notes')}`);
  console.log(`  Base Notes (F): ${f('Base Notes')}`);
  console.log(`  Season (G): ${f('Season')}`);
  console.log(`  Occasion (H): ${f('Occasion')}`);
  console.log(`  Gender (I): ${f('Gender')}`);
  console.log(`  Scent profile (J): ${f('Scent profile')}`);
  console.log(`  Price (K): ${f('Price')}`);
  console.log(`  Image (L): ${f('Image')}`);
  console.log(`  Tier (M): ${f('Tier')}`);
}
