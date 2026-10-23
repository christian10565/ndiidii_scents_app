import { google } from 'googleapis';
import { config } from 'dotenv';
config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = 'Perfumes';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;

const auth = new google.auth.JWT({
  email,
  key: key.replace(/\n/g, '\n'),
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
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

console.log('=== Column layout: ' + headers.join(' | ') + ' ===');
console.log();

// Current state for the two rows
const kismetRow = allRows.find(r => r[idx['Perfume Name']] === 'Kismet Magic');
const islandRow = allRows.find(r => r[idx['Perfume Name']] === 'Island Vanilla Dunes');

// Determine row numbers (1-based)
const kismetRowNum = allRows.indexOf(kismetRow) + 1;
const islandRowNum = allRows.indexOf(islandRow) + 1;

console.log('Kismet Magic at row ' + kismetRowNum);
console.log('  Base Notes (idx 6):', JSON.stringify(kismetRow[idx['Base Notes']]));
console.log('  Season (idx 7):', JSON.stringify(kismetRow[idx['Season']]));
console.log('  Occasion (idx 8):', JSON.stringify(kismetRow[idx['Occasion']]));

console.log('Island Vanilla Dunes at row ' + islandRowNum);
console.log('  Base Notes (idx 6):', JSON.stringify(islandRow[idx['Base Notes']]));
console.log('  Season (idx 7):', JSON.stringify(islandRow[idx['Season']]));
console.log('  Occasion (idx 8):', JSON.stringify(islandRow[idx['Occasion']]));

// The correct values (from snapshot + prose we already wrote)
const toWrite = [];
let n = 0;

// Kismet Magic (row 146): Base Notes was clobbered with season prose; Season was clobbered with occasion prose
// We need to write: Season (col 7) = correct season, Base Notes (col 6) = correct base
const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const kismetBase = 'Pralines, Sweet Vanilla, and Sandalwood';
const kismetOccasion = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';

if (kismetRow[idx['Season']] !== kismetSeason) {
  toWrite.push({ range: 'G' + kismetRowNum, value: kismetSeason });
  n++;
  console.log('  Storing correct Season to G' + kismetRowNum);
}
if (kismetRow[idx['Base Notes']] !== kismetBase) {
  toWrite.push({ range: 'F' + kismetRowNum, value: kismetBase });
  n++;
  console.log('  Storing correct Base Notes to F' + kismetRowNum);
}

// Island Vanilla Dunes (row 147): same pattern
const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';
const islandBase = 'Creamy Praline, Golden Amber, and Soft Musk';
const islandOccasion = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';

if (islandRow[idx['Season']] !== islandSeason) {
  toWrite.push({ range: 'G' + islandRowNum, value: islandSeason });
  n++;
  console.log('  Storing correct Season to G' + islandRowNum);
}
if (islandRow[idx['Base Notes']] !== islandBase) {
  toWrite.push({ range: 'F' + islandRowNum, value: islandBase });
  n++;
  console.log('  Storing correct Base Notes to F' + islandRowNum);
}

console.log('\nTotal cells to write: ' + n);

if (n === 0) {
  console.log('>>> Nothing to write.');
  process.exit(0);
}

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: toWrite.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log('>>> Wrote ' + n + ' cells: ' + toWrite.map(u => u.range).join(', '));

// Re-read to verify
const res2 = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows2 = res2.data.values ?? [];
for (const fix of toWrite) {
  const row = allRows2[Number(fix.range.slice(1)) - 1];
  if (row) {
    console.log('\nVerified ' + fix.range + ': ' + JSON.stringify(row[idx['Season']]));
    console.log('  (with Base: ' + JSON.stringify(row[idx['Base Notes']]) + ')');
  }
}
