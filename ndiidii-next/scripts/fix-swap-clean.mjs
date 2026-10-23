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

console.log('=== Verifying swap status for Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

// Known correct seasonal text (from snapshot)
const correctKismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const correctIslandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';

const toWrite = [];
let fixed = 0;

for (let i = 0; i < allRows.length; i++) {
  const row = allRows[i];
  const name = row[idx['Perfume Name']] ?? '';

  if (name === 'Kismet Magic') {
    const currentG = row[idx['Season']] ?? '';
    const currentH = row[idx['Occasion']] ?? '';

    console.log(`\nKismet Magic (row ${i + 1})`);
    console.log('  Current G (Season): ' + JSON.stringify(currentG));
    console.log('  Current H (Occasion): ' + JSON.stringify(currentH));

    // Check if G has the correct seasonal text
    if (currentG === correctKismetSeason) {
      console.log('  >>> G already correct');
    } else if (currentG.includes('Formal evening banquets')) {
      // G has occasion prose that needs to be replaced with seasonal text
      toWrite.push({ range: `G${i + 1}`, value: correctKismetSeason });
      console.log('  >>> G had occasion prose; fixing with seasonal text');
      fixed++;
    } else {
      console.log('  >>> G has unexpected content; skipping');
    }

    // Check if H has the correct occasion prose
    const expectedOccasion = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';
    if (currentH === expectedOccasion) {
      console.log('  >>> H (Occasion) already correct');
    } else if (currentH.includes('Formal evening banquets')) {
      // H has correct occasion prose (already written)
      console.log('  >>> H (Occasion) already correct');
    } else {
      console.log('  >>> H has unexpected content; needs attention');
    }
  }

  if (name === 'Island Vanilla Dunes') {
    const currentG = row[idx['Season']] ?? '';
    const currentH = row[idx['Occasion']] ?? '';

    console.log(`\nIsland Vanilla Dunes (row ${i + 1})`);
    console.log('  Current G (Season): ' + JSON.stringify(currentG));
    console.log('  Current H (Occasion): ' + JSON.stringify(currentH));

    if (currentG === correctIslandSeason) {
      console.log('  >>> G already correct');
    } else if (currentG.includes('Cozy evening stay-ins')) {
      toWrite.push({ range: `G${i + 1}`, value: correctIslandSeason });
      console.log('  >>> G had occasion prose; fixing with seasonal text');
      fixed++;
    } else {
      console.log('  >>> G has unexpected content; skipping');
    }

    // Check if H has the correct occasion prose
    const expectedOccasion = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';
    if (currentH === expectedOccasion) {
      console.log('  >>> H (Occasion) already correct');
    } else if (currentH.includes('Cozy evening stay-ins')) {
      console.log('  >>> H (Occasion) already correct');
    } else {
      console.log('  >>> H has unexpected content; needs attention');
    }
  }
}

console.log(`\nTotal cells to write: ${toWrite.length}`);

if (!toWrite.length) {
  console.log('\n>>> Nothing to write.');
  process.exit(0);
}

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: toWrite.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\n>>> Wrote ${toWrite.length} cells: ${toWrite.map(u => u.range).join(', ')}`);

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
    console.log(`\nVerified ${fix.range}: ${JSON.stringify(row[idx['Season']])}`);
  }
}
