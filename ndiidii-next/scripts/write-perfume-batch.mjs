import { readFileSync } from 'fs';
import { join, isAbsolute } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/write-perfume-batch.mjs <path-to-batch.json>');
  process.exit(1);
}
const batchPath = isAbsolute(arg) ? arg : join(process.cwd(), arg);
const batch = JSON.parse(readFileSync(batchPath, 'utf8'));

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = process.env.PERFUME_TAB ?? 'Perfumes';
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const readRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const all = readRes.data.values ?? [];
const headers = (all[0] ?? []).map((h) => String(h ?? '').trim().toLowerCase());
const headerIdx = {};
headers.forEach((h, i) => { if (h) headerIdx[h] = i; });

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
for (const [sheetH, batchKey] of Object.entries(colMap)) cols[batchKey] = headerIdx[sheetH] ?? -1;

const nameIdx = headerIdx['perfume name'] ?? headerIdx['name'] ?? -1;
const brandIdx = headerIdx['brand'] ?? -1;
if (nameIdx < 0 || brandIdx < 0) {
  console.error('Could not locate Perfume Name / Brand columns.');
  process.exit(1);
}

const byKey = new Map();
for (let r = 1; r < all.length; r++) {
  const n = String(all[r][nameIdx] ?? '').trim();
  const b = String(all[r][brandIdx] ?? '').trim();
  if (!n || !b) continue;
  const k = `${b.toLowerCase()}|${n.toLowerCase()}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push({ row: all[r], sheetRow: r + 1 });
}

const targetFields = Object.keys(colMap).map((k) => colMap[k]);
const updates = [];
const report = [];

for (const rec of batch) {
  const key = `${String(rec.brand ?? '').trim().toLowerCase()}|${String(rec.name ?? '').trim().toLowerCase()}`;
  const matches = byKey.get(key);
  if (!matches || matches.length === 0) {
    report.push({ brand: rec.brand, name: rec.name, status: 'NOT FOUND' });
    continue;
  }
  for (const match of matches) {
    const existing = {};
    for (const f of targetFields) existing[f] = String(match.row[cols[f]] ?? '').trim();

    const wrote = [];
    for (const f of targetFields) {
      const val = String(rec[f] ?? '').trim();
      if (!val || existing[f]) continue;
      if (cols[f] < 0) continue;
      const colLetter = String.fromCharCode(65 + cols[f]);
      updates.push({ range: `'${TAB.replace(/'/g, "''")}'!${colLetter}${match.sheetRow}`, values: [[val]] });
      wrote.push(f);
    }
    report.push({
      brand: rec.brand,
      name: rec.name,
      row: match.sheetRow,
      status: wrote.length ? 'WRITE' : 'SKIP (already filled)',
      fields: wrote,
    });
  }
}

for (const r of report) {
  console.log(`${r.status}: ${r.brand} | ${r.name}${r.row ? ` [row ${r.row}]` : ''}${r.fields?.length ? ` -> ${r.fields.join(', ')}` : ''}`);
}

if (updates.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
  console.log(`\n>>> Wrote ${updates.length} cells to ${TAB}.`);
} else {
  console.log('\n>>> Nothing to write.');
}
