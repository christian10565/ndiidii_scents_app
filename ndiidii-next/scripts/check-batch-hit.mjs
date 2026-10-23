import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DATA = join(process.cwd(), 'data');
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));
const rows = snap.perfumes;
const snapByName = new Map(rows.map(p => [p.name.toLowerCase(), p]));

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;
const auth = new google.auth.JWT({ email, key: key.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const r = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  range: `'Perfumes'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const sheetRows = r.data.values ?? [];
const headers = sheetRows[0].map(h => String(h ?? '').trim());
const nameIdx = headers.findIndex(h => /perfume name/i.test(h));
const brandIdx = headers.findIndex(h => /brand/i.test(h));
const insIdx = headers.findIndex(h => /inspired by/i.test(h));
const scentIdx = headers.findIndex(h => /scent profile/i.test(h));
const seasonIdx = headers.findIndex(h => /season/i.test(h));
const occIdx = headers.findIndex(h => /occasion/i.test(h));
const topIdx = headers.findIndex(h => /top notes/i.test(h));
const heartIdx = headers.findIndex(h => /heart notes/i.test(h));
const baseIdx = headers.findIndex(h => /base notes/i.test(h));

const batch = JSON.parse(readFileSync(join(DATA, 'hermes_batch1.json'), 'utf8'));

console.log('Batch names vs sheet names:');
for (const rec of batch) {
  const key = rec.name.toLowerCase();
  const snapRow = snapByName.get(key);
  // Find sheet row with same name + brand
  let found = null;
  for (let i = 1; i < sheetRows.length; i++) {
    const n = sheetRows[i][nameIdx];
    const b = sheetRows[i][brandIdx];
    if (n && b && n.toLowerCase() === key) { found = sheetRows[i]; break; }
  }
  const snapMissing = [];
  const sheetMissing = [];
  // Check inspired etc
  if (snapRow) {
    if (!snapRow.inspiredBy) snapMissing.push('inspiredBy');
    if (!snapRow.scentProfile) snapMissing.push('scentProfile');
    if (!snapRow.season) snapMissing.push('season');
    if (!snapRow.extra?.Occasion) snapMissing.push('occasion');
    if (!snapRow.notes?.top) snapMissing.push('topNotes');
    if (!snapRow.notes?.heart) snapMissing.push('heartNotes');
    if (!snapRow.notes?.base) snapMissing.push('baseNotes');
  }
  if (found) {
    if (!found[insIdx]?.trim()) sheetMissing.push('inspiredBy');
    if (!found[scentIdx]?.trim()) sheetMissing.push('scentProfile');
    if (!found[seasonIdx]?.trim()) sheetMissing.push('season');
    if (!found[occIdx]?.trim()) sheetMissing.push('occasion');
    if (!found[topIdx]?.trim()) sheetMissing.push('topNotes');
    if (!found[heartIdx]?.trim()) sheetMissing.push('heartNotes');
    if (!found[baseIdx]?.trim()) sheetMissing.push('baseNotes');
  }
  console.log(`[${rec.brand}] ${rec.name}`);
  console.log(`  snap:     missing ${snapMissing.join(', ') || 'nothing'}`);
  console.log(`  sheet:    missing ${sheetMissing.join(', ') || 'nothing'}`);
  console.log(`  -> has row: ${!!found}`);
}
