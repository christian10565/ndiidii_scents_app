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

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

const want = ['Queen of Arabia', 'Le Prestige Bold', 'Le Prestige King', 'Gharam', 'Kismet Magic', 'Island Vanilla Dunes', 'Sceptre Oceana', 'Cascade Blue', 'Aseel', 'Ramad Louban'];
const wantSet = new Set(want);

console.log('=== Verified rows after prose merge ===');
console.log('\nHeader:', headers.join(' | '));
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][idx['Perfume Name']] ?? '';
  if (!wantSet.has(name)) continue;
  const row = allRows[i];
  console.log(`\n[${i+1}] ${row[idx['Brand']]} | ${name}`);
  console.log(`  Season: ${row[idx['Season']]}`);
  console.log(`  Season len: ${row[idx['Season']]?.length || 0}`);
  console.log(`  Occasion: ${row[idx['Occasion']]}`);
  console.log(`  Occasion len: ${row[idx['Occasion']]?.length || 0}`);
  console.log(`  Gender: ${row[idx['Gender']] || '(empty)'}`);
  console.log(`  Scent profile: ${row[idx['Scent profile']] || '(empty)'}`);
}
