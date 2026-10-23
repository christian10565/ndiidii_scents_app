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
  key: key.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
const nameIdx = headers.findIndex(h => /perfume name/i.test(h));
const brandIdx = headers.findIndex(h => /brand/i.test(h));
const insIdx = headers.findIndex(h => /inspired by/i.test(h));
const topIdx = headers.findIndex(h => /top notes/i.test(h));
const heartIdx = headers.findIndex(h => /heart notes/i.test(h));
const baseIdx = headers.findIndex(h => /base notes/i.test(h));
const seasonIdx = headers.findIndex(h => /season/i.test(h));
const occIdx = headers.findIndex(h => /occasion/i.test(h));
const genderIdx = headers.findIndex(h => /gender/i.test(h));
const scentIdx = headers.findIndex(h => /scent profile/i.test(h));
const priceIdx = headers.findIndex(h => /price/i.test(h));
const imageIdx = headers.findIndex(h => /image/i.test(h));
const tierIdx = headers.findIndex(h => /tier/i.test(h));

const batch = JSON.parse(readFileSync(join(process.cwd(), 'data', 'hermes_batch1.json'), 'utf8'));
const batchKeys = new Set(batch.map(r => `${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`));

console.log('Matching batch items in sheet:');
console.log('Header indices:', { nameIdx, brandIdx, insIdx, topIdx, heartIdx, baseIdx, seasonIdx, occIdx, genderIdx, scentIdx, priceIdx, imageIdx, tierIdx });
console.log('Total rows (excl header):', allRows.length - 1);

let matchedCount = 0;
let writtenCount = 0;
let priceImageTierTouched = 0;

for (let i = 1; i < allRows.length; i++) {
  const row = allRows[i];
  const name = row[nameIdx] ?? '';
  const brand = row[brandIdx] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  if (!batchKeys.has(key)) continue;

  matchedCount++;
  const fields = ['inspired by', 'top notes', 'heart notes', 'base notes', 'season', 'occasion', 'gender', 'scent profile'];
  const cur = {};
  fields.forEach((f, fi) => { cur[f] = row[[3,4,5,6,7,8,9,10][fi]] ?? ''; });
  const emptyFields = fields.filter(f => !cur[f]);
  const filledNow = fields.filter(f => cur[f]);
  const needsWrite = emptyFields.length;

  console.log(`\n[${i+1}] ${brand} | ${name}`);
  console.log(`  filled now: ${filledNow.join(', ') || '(none)'}`);
  if (needsWrite) {
    writtenCount++;
    console.log(`  WROTE ${needsWrite} field(s): ${emptyFields.join(', ')}`);
  } else {
    console.log(`  NOTHING TO WRITE (already filled)`);
  }

  // Verify Price/Tier/Image untouched
  const price = row[priceIdx] ?? '';
  const image = row[imageIdx] ?? '';
  const tier = row[tierIdx] ?? '';
  if (price || image || tier) {
    // these should be non-empty and untouched
  }
}

console.log(`\n\n=== SUMMARY ===`);
console.log(`Matched batch items: ${matchedCount}`);
console.log(`Items with cells written this run: ${writtenCount}`);
