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
const OIL_TAB = process.env.OIL_TAB ?? 'Perfume Oils';
const TABS = [TAB, OIL_TAB];

// ---- build the upload map once ----
const map = JSON.parse(await readFile('./data/upload-map.json', 'utf8'));
const byKey = new Map();
for (const m of map) {
  if (m.cloudinaryUrl) byKey.set(`${(m.sheetBrand || '').toLowerCase()}||${m.sheetName.toLowerCase()}`, m.cloudinaryUrl);
}

// ---- process each tab ----
let totalMatched = 0, totalAlreadyFilled = 0, totalNoUrl = 0;
const allUpdates = [];

for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tab });
  const rows = res.data.values ?? [];
  const headers = rows[0].map((h) => String(h ?? '').trim());
  const iName = headers.findIndex((h) => /name/i.test(h));
  const iBrand = headers.findIndex((h) => /brand/i.test(h));
  const iImage = headers.findIndex((h) => /image|photo|picture/i.test(h));
  if (iImage < 0) {
    console.error(`No Image column found in ${tab}. Headers: ${headers.join(' | ')}`);
    continue;
  }
  const colLetter = String.fromCharCode(65 + iImage);

  let matched = 0, alreadyFilled = 0, noUrl = 0;
  for (let r = 1; r < rows.length; r++) {
    const name = String(rows[r][iName] ?? '').trim();
    if (!name) continue;
    const brand = String(rows[r][iBrand] ?? '').trim();
    const existing = String(rows[r][iImage] ?? '').trim();
    if (existing) { alreadyFilled++; continue; }
    const url = byKey.get(`${brand.toLowerCase()}||${name.toLowerCase()}`);
    if (!url) { noUrl++; continue; }
    allUpdates.push({ range: `${tab}!${colLetter}${r + 1}`, url });
    matched++;
  }

  console.log(`\n[${tab}]`);
  console.log(`  Image column: ${colLetter} (index ${iImage})`);
  console.log(`  rows to update: ${matched}`);
  console.log(`  already had an image: ${alreadyFilled}`);
  console.log(`  no cloudinary url (unmatched): ${noUrl}`);
  totalMatched += matched;
  totalAlreadyFilled += alreadyFilled;
  totalNoUrl += noUrl;
}

console.log(`\nTOTAL across both tabs:`);
console.log(`  rows to update: ${totalMatched}`);
console.log(`  already had an image: ${totalAlreadyFilled}`);
console.log(`  no cloudinary url (unmatched): ${totalNoUrl}`);
console.log(APPLY ? '\n-- APPLYING --' : '\n-- DRY RUN (pass --apply to write) --');
if (!APPLY) {
  console.log('sample of what would be written:');
  allUpdates.slice(0, 5).forEach((u) => console.log(`  ${u.range}  →  ${u.url}`));
  process.exit(0);
}

// ---- write in batches via batchUpdate (one call per contiguous run) ----
// Simplest robust approach: batchUpdate with one valueRange per cell is fine at
// this scale, but we group into a single batchUpdate call with many ranges.
const CHUNK = 200;
let written = 0;
for (let i = 0; i < allUpdates.length; i += CHUNK) {
  const batch = allUpdates.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: batch.map((u) => ({ range: u.range, values: [[u.url]] })),
    },
  });
  written += batch.length;
  console.log(`  wrote ${written}/${allUpdates.length}`);
}
console.log(`\ndone: ${written} image URLs written to the sheet.`);
