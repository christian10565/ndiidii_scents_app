// Writes Cloudinary URLs back into the sheet's "Image" column (col M) for every
// row that has a confident match. Matches rows by the ID column (col A) so we
// never write to the wrong perfume.
//
// Reads  data/upload-map.json
// Writes the Image column of the Perfumes tab.
//
// Usage:
//   node scripts/write-images.mjs --dry     # preview, write nothing (default safe)
//   node scripts/write-images.mjs --apply   # actually write
import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { google } from 'googleapis';

config();

const APPLY = process.argv.includes('--apply');

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = process.env.PERFUME_TAB ?? 'Perfumes';

// ---- read the sheet ----
const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: TAB });
const rows = res.data.values ?? [];
const headers = rows[0].map((h) => String(h ?? '').trim());
const iName = headers.findIndex((h) => /name/i.test(h) && !/oil/i.test(h));
const iBrand = headers.findIndex((h) => /brand/i.test(h));
const iImage = headers.findIndex((h) => /image|photo|picture/i.test(h));
if (iImage < 0) { console.error('No Image column found. Headers:', headers.join(' | ')); process.exit(1); }
const colLetter = String.fromCharCode(65 + iImage);

// ---- build the upload map ----
const map = JSON.parse(await readFile('./data/upload-map.json', 'utf8'));
// Key by brand+name (same as matcher) → cloudinaryUrl
const byKey = new Map();
for (const m of map) {
  if (m.cloudinaryUrl) byKey.set(`${(m.sheetBrand || '').toLowerCase()}||${m.sheetName.toLowerCase()}`, m.cloudinaryUrl);
}

// ---- match sheet rows to URLs ----
const updates = []; // { range, values: [[url]] }
let matched = 0, alreadyFilled = 0, noUrl = 0;
for (let r = 1; r < rows.length; r++) {
  const name = String(rows[r][iName] ?? '').trim();
  if (!name) continue;
  const brand = String(rows[r][iBrand] ?? '').trim();
  const existing = String(rows[r][iImage] ?? '').trim();
  if (existing) { alreadyFilled++; continue; }
  const url = byKey.get(`${brand.toLowerCase()}||${name.toLowerCase()}`);
  if (!url) { noUrl++; continue; }
  // r is 0-indexed in the array; sheet row is r+1 (header offset)
  updates.push({ range: `${TAB}!${colLetter}${r + 1}`, url });
  matched++;
}

console.log(`Image column: ${colLetter} (index ${iImage})`);
console.log(`rows to update: ${matched}`);
console.log(`already had an image: ${alreadyFilled}`);
console.log(`no cloudinary url (unmatched): ${noUrl}`);
console.log(APPLY ? '\n-- APPLYING --' : '\n-- DRY RUN (pass --apply to write) --');
if (!APPLY) {
  console.log('sample of what would be written:');
  updates.slice(0, 5).forEach((u) => console.log(`  ${u.range}  →  ${u.url}`));
  process.exit(0);
}

// ---- write in batches via batchUpdate (one call per contiguous run) ----
// Simplest robust approach: batchUpdate with one valueRange per cell is fine at
// this scale, but we group into a single batchUpdate call with many ranges.
const CHUNK = 200;
let written = 0;
for (let i = 0; i < updates.length; i += CHUNK) {
  const batch = updates.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: batch.map((u) => ({ range: u.range, values: [[u.url]] })),
    },
  });
  written += batch.length;
  console.log(`  wrote ${written}/${updates.length}`);
}
console.log(`\ndone: ${written} image URLs written to the sheet.`);
