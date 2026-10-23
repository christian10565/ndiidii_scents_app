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

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

console.log('=== Final swap fix: Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

// Correct values from snapshot + prose we already wrote
const kismet = {
  base: 'Pralines, Sweet Vanilla, and Sandalwood',
  season: 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.',
  occasion: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.',
};

const island = {
  base: 'Creamy Praline, Golden Amber, and Soft Musk',
  season: 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.',
  occasion: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.',
};

const toWrite = [];
let n = 0;

for (const row of allRows) {
  const name = row[idx['Perfume Name']] ?? '';
  if (name === 'Kismet Magic') {
    if (row[idx['Base Notes']] !== kismet.base) {
      toWrite.push({ range: 'F' + (allRows.indexOf(row) + 1), value: kismet.base });
      n++;
    }
    if (row[idx['Season']] !== kismet.season) {
      toWrite.push({ range: 'G' + (allRows.indexOf(row) + 1), value: kismet.season });
      n++;
    }
    if (row[idx['Occasion']] !== kismet.occasion) {
      toWrite.push({ range: 'H' + (allRows.indexOf(row) + 1), value: kismet.occasion });
      n++;
    }
  }
  if (name === 'Island Vanilla Dunes') {
    if (row[idx['Base Notes']] !== island.base) {
      toWrite.push({ range: 'F' + (allRows.indexOf(row) + 1), value: island.base });
      n++;
    }
    if (row[idx['Season']] !== island.season) {
      toWrite.push({ range: 'G' + (allRows.indexOf(row) + 1), value: island.season });
      n++;
    }
    if (row[idx['Occasion']] !== island.occasion) {
      toWrite.push({ range: 'H' + (allRows.indexOf(row) + 1), value: island.occasion });
      n++;
    }
  }
}

console.log('Total cells to write: ' + n);
if (n === 0) { console.log('>>> Nothing to write.'); process.exit(0); }

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
  }
}
