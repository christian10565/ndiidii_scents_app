import { readFileSync, writeFileSync } from 'fs';
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

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const sheetRows = res.data.values ?? [];
const headers = sheetRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

const batch = JSON.parse(readFileSync(join(process.cwd(), 'data', 'next-batch.json'), 'utf8'));

const batchKeys = new Set(batch.map(r => `${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`));

console.log('Header indices:', {
  name: idx['Perfume Name'], brand: idx['Brand'],
  season: idx['Season'], occasion: idx['Occasion'],
});

console.log('\n=== Current sheet state for next-10 batch ===');
for (let i = 1; i < sheetRows.length; i++) {
  const name = sheetRows[i][idx['Perfume Name']] ?? '';
  const brand = sheetRows[i][idx['Brand']] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  if (!batchKeys.has(key)) continue;

  const season = sheetRows[i][idx['Season']] ?? '';
  const occasion = sheetRows[i][idx['Occasion']] ?? '';
  const row = batch.find(r => `${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}` === key);
  console.log(`\n[${i+1}] ${brand} | ${name}`);
  console.log(`  batch: season="${row.season}" | occasion="${row.extra.Occasion}"`);
  console.log(`  sheet: season="${season}" | occasion="${occasion}"`);
  console.log(`  sheet season length: ${season.length}, occasion length: ${occasion.length}`);
}
