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

// Read current state
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

console.log('=== Write: Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

// Read current values
const kismetRow = allRows.find(r => r[idx['Perfume Name']] === 'Kismet Magic');
const islandRow = allRows.find(r => r[idx['Perfume Name']] === 'Island Vanilla Dunes');
const kismetNum = allRows.indexOf(kismetRow) + 1;
const islandNum = allRows.indexOf(islandRow) + 1;

console.log('Kismet Magic at row ' + kismetNum);
console.log('  Current G (Season):', JSON.stringify(kismetRow[idx['Season']]));
console.log('  Current F (Base):', JSON.stringify(kismetRow[idx['Base Notes']]));

console.log('\nIsland Vanilla Dunes at row ' + islandNum);
console.log('  Current G (Season):', JSON.stringify(islandRow[idx['Season']]));
console.log('  Current F (Base):', JSON.stringify(islandRow[idx['Base Notes']]));

// Values to write
const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const kismetBase = 'Pralines, Sweet Vanilla, and Sandalwood';
const kismetOcc = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';

const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';
const islandBase = 'Creamy Praline, Golden Amber, and Soft Musk';
const islandOcc = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';

const toWrite = [];
let n = 0;
const changed = [];

if (kismetRow[idx['Season']] !== kismetSeason) {
  toWrite.push({ range: 'G' + kismetNum, value: kismetSeason });
  changed.push('G' + kismetNum);
  n++;
}
if (kismetRow[idx['Base Notes']] !== kismetBase) {
  toWrite.push({ range: 'F' + kismetNum, value: kismetBase });
  changed.push('F' + kismetNum);
  n++;
}
if (kismetRow[idx['Occasion']] !== kismetOcc) {
  toWrite.push({ range: 'H' + kismetNum, value: kismetOcc });
  changed.push('H' + kismetNum);
  n++;
}
if (islandRow[idx['Season']] !== islandSeason) {
  toWrite.push({ range: 'G' + islandNum, value: islandSeason });
  changed.push('G' + islandNum);
  n++;
}
if (islandRow[idx['Base Notes']] !== islandBase) {
  toWrite.push({ range: 'F' + islandNum, value: islandBase });
  changed.push('F' + islandNum);
  n++;
}
if (islandRow[idx['Occasion']] !== islandOcc) {
  toWrite.push({ range: 'H' + islandNum, value: islandOcc });
  changed.push('H' + islandNum);
  n++;
}

console.log('\nCells to write: ' + n + ' -> ' + changed.join(', '));
if (n === 0) { console.log('>>> Nothing to write.'); process.exit(0); }

// Write using values.update on each range
for (const write of toWrite) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: write.range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[write.value]] },
  });
  console.log('  Wrote ' + write.range + ' = ' + JSON.stringify(write.value));
}

// Verify by re-reading
const res2 = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows2 = res2.data.values ?? [];
for (const row of allRows2) {
  const name = row[idx['Perfume Name']] ?? '';
  if (name === 'Kismet Magic' || name === 'Island Vanilla Dunes') {
    console.log('\nVerified ' + name + ':');
    console.log('  F (Base):', JSON.stringify(row[idx['Base Notes']]));
    console.log('  G (Season):', JSON.stringify(row[idx['Season']]));
    console.log('  H (Occasion):', JSON.stringify(row[idx['Occasion']]));
  }
}
