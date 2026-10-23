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

console.log('=== Swap fix: Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

// The correct seasonally correct text for each
const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';

const toWrite = [];
let n = 0;

for (let i = 0; i < allRows.length; i++) {
  const row = allRows[i];
  const name = row[idx['Perfume Name']] ?? '';

  if (name === 'Kismet Magic') {
    const g = row[idx['Season']] ?? '';
    const h = row[idx['Occasion']] ?? '';

    console.log('Kismet Magic row ' + (i + 1));
    console.log('  G (Season) current: ' + JSON.stringify(g));
    console.log('  H (Occasion) current: ' + JSON.stringify(h));

    // If G has the old occasion prose, replace it
    if (g !== kismetSeason) {
      if (g.includes('Formal evening banquets')) {
        toWrite.push({ range: 'G' + (i + 1), value: kismetSeason });
        console.log('  -> Writing correct season to G' + (i + 1));
        n++;
      } else {
        console.log('  -> G has unexpected content');
      }
    }

    // H already has correct occasion prose
    const hExpected = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';
    if (h !== hExpected) {
      console.log('  -> H (Occasion) needs attention');
    } else {
      console.log('  -> H (Occasion) confirmed correct');
    }
  }

  if (name === 'Island Vanilla Dunes') {
    const g = row[idx['Season']] ?? '';
    const h = row[idx['Occasion']] ?? '';

    console.log('Island Vanilla Dunes row ' + (i + 1));
    console.log('  G (Season) current: ' + JSON.stringify(g));
    console.log('  H (Occasion) current: ' + JSON.stringify(h));

    if (g !== islandSeason) {
      if (g.includes('Cozy evening stay-ins')) {
        toWrite.push({ range: 'G' + (i + 1), value: islandSeason });
        console.log('  -> Writing correct season to G' + (i + 1));
        n++;
      } else {
        console.log('  -> G has unexpected content');
      }
    }

    // H already has correct occasion prose
    const hExpected = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';
    if (h !== hExpected) {
      console.log('  -> H (Occasion) needs attention');
    } else {
      console.log('  -> H (Occasion) confirmed correct');
    }
  }
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
  }
}
