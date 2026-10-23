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
console.log('total rows (incl header):', allRows.length);

// Inspect row 654 (idx 653) and row 3 (idx 2)
const pick = [1, 2, 654].map(i => i - 1);
for (const i of pick) {
  if (i < 0 || i >= allRows.length) { console.log('row', i+1, 'out of range'); continue; }
  console.log('--- row', i+1, '---');
  const row = allRows[i];
  const headers = allRows[0].map(h => h.trim());
  const idx = {};
  headers.forEach((h, j) => { idx[h] = j; });
  console.log('Name:', row[idx['Perfume Name']]);
  console.log('Brand:', row[idx['Brand']]);
  console.log('Inspired By:', row[idx['Inspired By']] || '(empty)');
  console.log('Season:', row[idx['Season']] || '(empty)');
  console.log('Occasion:', row[idx['Occasion']] || '(empty)');
  console.log('Gender:', row[idx['Gender']] || '(empty)');
  console.log('Scent profile:', row[idx['Scent profile']] || '(empty)');
}
