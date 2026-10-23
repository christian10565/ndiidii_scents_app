import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DATA = join(process.cwd(), 'data');
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));
const rows = snap.perfumes;

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;
const auth = new google.auth.JWT({ email, key: key.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const r = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `'Perfumes'`, valueRenderOption: 'FORMATTED_VALUE' });
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

const snapByName = new Map(rows.map(p => [p.name, p]));

const missing = [];
for (let i = 1; i < sheetRows.length; i++) {
  const name = sheetRows[i][nameIdx];
  const brand = sheetRows[i][brandIdx];
  if (!name || !brand) continue;
  const s = snapByName.get(name);
  if (!s) continue;
  const row = sheetRows[i];
  const gaps = [];
  if (insIdx >= 0 && !row[insIdx]?.trim()) gaps.push('inspiredBy');
  if (scentIdx >= 0 && !row[scentIdx]?.trim()) gaps.push('scentProfile');
  if (seasonIdx >= 0 && !row[seasonIdx]?.trim()) gaps.push('season');
  if (occIdx >= 0 && !row[occIdx]?.trim()) gaps.push('occasion');
  if (topIdx >= 0 && !row[topIdx]?.trim()) gaps.push('topNotes');
  if (heartIdx >= 0 && !row[heartIdx]?.trim()) gaps.push('heartNotes');
  if (baseIdx >= 0 && !row[baseIdx]?.trim()) gaps.push('baseNotes');
  if (gaps.length > 0) missing.push({ name, brand, gaps });
}

console.log('Sheet data rows:', sheetRows.length - 1);
console.log('Rows missing >=1 target field:', missing.length);
// Dedupe by name, keep most-gap-heavy
const seen = new Set();
const unique = [];
for (const m of missing) {
  if (seen.has(m.name)) continue;
  seen.add(m.name);
  unique.push(m);
}
unique.sort((a, b) => b.gaps.length - a.gaps.length);
console.log('Unique rows missing fields:', unique.length);
console.log('Top 12 by gap count:');
for (const m of unique.slice(0, 12)) {
  console.log(`  [${m.brand}] ${m.name}: missing ${m.gaps.join(', ')}`);
}
