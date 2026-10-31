import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DATA = join(process.cwd(), 'data');
const batch = JSON.parse(readFileSync(join(DATA, 'hermes_batch1.json'), 'utf8'));

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

// Read headers to locate columns
const readRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const headers = (readRes.data.values ?? [])[0] ?? [];
const headerIdx = {};
headers.forEach((h, i) => { headerIdx[String(h ?? '').trim().toLowerCase()] = i; });

// Column mapping: sheet header -> batch JSON field
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

// Build row index by (brand, name)
const rows = (readRes.data.values ?? [])?.slice(1) ?? [];
const byKey = new Map();
rows.forEach((r, i) => {
  const n = String(r[1] ?? '').trim();
  const b = String(r[2] ?? '').trim();
  if (n && b) byKey.set(`${b.toLowerCase()}|${n.toLowerCase()}`, { row: r, sheetIdx: i + 1 });
});

// Build lookup for batch
const batchByName = new Map();
batch.forEach(rec => {
  batchByName.set(`${rec.brand.trim().toLowerCase()}|${rec.name.trim().toLowerCase()}`, rec);
});

// Verify sheet rows for each batch item
console.log(`Sheet rows: ${rows.length}`);
console.log(`Batch records: ${batch.length}\n`);

const targetFields = ['inspired_by','top_notes','heart_notes','base_notes','season','occasion','gender','scent_profile'];
const results = [];

for (const rec of batch) {
  const key = `${rec.brand.trim().toLowerCase()}|${rec.name.trim().toLowerCase()}`;
  const match = byKey.get(key);
  if (!match) {
    results.push({ name: rec.name, brand: rec.brand, status: 'NOT FOUND in sheet', cells: [] });
    continue;
  }

  const sheetRow = match.row;
  const existing = {};
  for (const f of targetFields) {
    existing[f] = (sheetRow[cols[f]] ?? '').trim();
  }

  // Determine which cells are empty and need writing
  const willWrite = [];
  for (const f of targetFields) {
    const val = (rec[f] ?? '').trim();
    if (val && !existing[f]) willWrite.push(f);
  }

  if (willWrite.length === 0) {
    results.push({ name: rec.name, brand: rec.brand, status: 'NOTHING TO WRITE', cells: [] });
    continue;
  }

  results.push({
    name: rec.name,
    brand: rec.brand,
    status: 'WRITE',
    sheetIdx: match.sheetIdx,
    willWrite,
    existing: existing,
    newValues: willWrite.map(f => ({ field: f, value: rec[f] })),
    note: `wrote ${willWrite.length} cells`,
  });
}

// Summary
const statuses = {};
results.forEach(r => { statuses[r.status] = (statuses[r.status] || 0) + 1; });
console.log('Results:');
for (const [s, c] of Object.entries(statuses)) console.log(`  ${s}: ${c}`);
console.log(`Total cells to write: ${results.filter(r => r.status === 'WRITE').reduce((s, r) => s + r.willWrite.length, 0)}`);

// Build batchUpdate requests (only cells that need writing, per row)
const updates = [];
for (const r of results) {
  if (r.status !== 'WRITE') continue;
  const b = batchByName.get(`${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`);
  const rowUpdates = [];
  for (const f of r.willWrite) {
    // Column mapping: fields -> sheet column index
    const sheetCol = cols[f];
    const colLetter = String.fromCharCode(65 + sheetCol);
    rowUpdates.push({ range: `${colLetter}${r.sheetIdx}`, value: b[f] });
  }
  if (rowUpdates.length) updates.push(...rowUpdates);
}

if (updates.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
    },
  });
  console.log(`\n>>> Wrote ${updates.length} cells to the Google Sheet.`);
} else {
  console.log('\n>>> Nothing to write.');
}
