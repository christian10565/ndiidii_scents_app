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

console.log('=== Correct Swap: Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

// Current values for both rows
const kismetRow = allRows.find(r => r[idx['Perfume Name']] === 'Kismet Magic');
const islandRow = allRows.find(r => r[idx['Perfume Name']] === 'Island Vanilla Dunes');
const kNum = allRows.indexOf(kismetRow) + 1;
const iNum = allRows.indexOf(islandRow) + 1;

console.log('Kismet Magic at row ' + kNum + ':');
console.log('  Current Base (F):', JSON.stringify(kismetRow[idx['Base Notes']]));
console.log('  Current Season (G):', JSON.stringify(kismetRow[idx['Season']]));
console.log('  Current Occasion (H):', JSON.stringify(kismetRow[idx['Occasion']]));

console.log('\nIsland Vanilla Dunes at row ' + iNum + ':');
console.log('  Current Base (F):', JSON.stringify(islandRow[idx['Base Notes']]));
console.log('  Current Season (G):', JSON.stringify(islandRow[idx['Season']]));
console.log('  Current Occasion (H):', JSON.stringify(islandRow[idx['Occasion']]));

// CORRECT values (from snapshot + prose already written correctly)
// Kismet Magic (row 146):
const kismetBase = 'Pralines, Sweet Vanilla, and Sandalwood';
const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const kismetOccasion = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';

// Island Vanilla Dunes (row 147):
const islandBase = 'Creamy Praline, Golden Amber, and Soft Musk';
const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';
const islandOccasion = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';

const toWrite = [];
let n = 0;

// Kismet Magic
if (kismetRow[idx['Base Notes']] !== kismetBase) {
  toWrite.push({ range: 'F' + kNum, value: kismetBase });
  console.log('\nWriting F' + kNum + ': Base Notes = ' + JSON.stringify(kismetBase));
  n++;
}
if (kismetRow[idx['Season']] !== kismetSeason) {
  toWrite.push({ range: 'G' + kNum, value: kismetSeason });
  console.log('Writing G' + kNum + ' = ' + JSON.stringify(kismetSeason));
  n++;
}
if (kismetRow[idx['Occasion']] !== kismetOccasion) {
  toWrite.push({ range: 'H' + kNum, value: kismetOccasion });
  console.log('Writing H' + kNum + ' = ' + JSON.stringify(kismetOccasion));
  n++;
}

// Island Vanilla Dunes
if (islandRow[idx['Base Notes']] !== islandBase) {
  toWrite.push({ range: 'F' + iNum, value: islandBase });
  console.log('\nWriting F' + iNum + ' = ' + JSON.stringify(islandBase));
  n++;
}
if (islandRow[idx['Season']] !== islandSeason) {
  toWrite.push({ range: 'G' + iNum, value: islandSeason });
  console.log('Writing G' + iNum + ' = ' + JSON.stringify(islandSeason));
  n++;
}
if (islandRow[idx['Occasion']] !== islandOccasion) {
  toWrite.push({ range: 'H' + iNum, value: islandOccasion });
  console.log('Writing H' + iNum + ' = ' + JSON.stringify(islandOccasion));
  n++;
}

console.log('\nTotal cells to write: ' + n);
if (n === 0) { console.log('>>> Nothing to write.'); process.exit(0); }

// Write each cell individually using values.update
for (const write of toWrite) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: write.range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[write.value]] },
  });
  console.log('  >>> Wrote ' + write.range + ' = ' + JSON.stringify(write.value));
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
    console.log('\n=== VERIFIED ' + name + ' ===');
    console.log('  F (Base):', JSON.stringify(row[idx['Base Notes']]));
    console.log('  G (Season):', JSON.stringify(row[idx['Season']]));
    console.log('  H (Occasion):', JSON.stringify(row[idx['Occasion']]));
  }
}
