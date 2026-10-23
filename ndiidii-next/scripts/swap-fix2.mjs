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

console.log('=== Column layout: ===');
console.log(headers.join(' | '));
console.log();

// Current values for the two swapped rows
const kismetRow = allRows.find(r => r[idx['Perfume Name']] === 'Kismet Magic');
const islandRow = allRows.find(r => r[idx['Perfume Name']] === 'Island Vanilla Dunes');

console.log('Current Kismet Magic row:');
console.log('  Base Notes (idx 6):', JSON.stringify(kismetRow[idx['Base Notes']]));
console.log('  Season (idx 7):', JSON.stringify(kismetRow[idx['Season']]));
console.log('  Occasion (idx 8):', JSON.stringify(kismetRow[idx['Occasion']]));

console.log('\nCurrent Island Vanilla Dunes row:');
console.log('  Base Notes (idx 6):', JSON.stringify(islandRow[idx['Base Notes']]));
console.log('  Season (idx 7):', JSON.stringify(islandRow[idx['Season']]));
console.log('  Occasion (idx 8):', JSON.stringify(islandRow[idx['Occasion']]));

// The correct seasonal text for each
const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';

// The correct base notes (from snapshot)
const kismetBase = 'Pralines, Sweet Vanilla, and Sandalwood';
const islandBase = 'Creamy Praline, Golden Amber, and Soft Musk';

// The correct occasion (already written correctly)
const kismetOccasion = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';
const islandOccasion = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';

const toWrite = [];

// Kismet Magic row (column 6 = Base Notes is wrong, column 7 = Season is wrong)
// Current Base Notes has seasonal prose; current Season has occasion prose
// Need to: G (Season) = kismetSeason, F (Base) = kismetBase
if (kismetRow[idx['Base Notes']] !== kismetBase) {
  toWrite.push({ range: `G${kismetRow[idx['Perfume Name']] ? allRows.indexOf(kismetRow) + 1 : '?'}`, value: kismetSeason });
  toWrite.push({ range: `H${kismetRow[idx['Perfume Name']] ? allRows.indexOf(kismetRow) + 1 : '?'}`, value: kismetBase });
}
