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

// The two rows that had their Season (G) clobbered with occasion prose.
// Row 146 = Kismet Magic, Row 147 = Island Vanilla Dunes
// Their G values are now occasion prose; we must restore the correct seasonal text.

const toWrite = [];

for (let i = 0; i < allRows.length; i++) {
  const row = allRows[i];
  const name = row[idx['Perfume Name']] ?? '';

  if (name === 'Kismet Magic') {
    const currentG = row[idx['Season']] ?? '';
    const currentH = row[idx['Occasion']] ?? '';

    // Current G is clobbered with occasion prose — restore correct seasonal text
    const correctSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';

    console.log(`\nKismet Magic (row ${i + 1})`);
    console.log(`  Current G (Season): ${JSON.stringify(currentG)}`);
    console.log(`  H (Occasion): ${JSON.stringify(currentH)}`);

    if (currentG !== correctSeason) {
      toWrite.push({ range: `G${i + 1}`, value: correctSeason });
      console.log(`  >>> Fixing G with correct seasonal text`);
    }
    // H already has the correct occasion prose — no change needed
  }

  if (name === 'Island Vanilla Dunes') {
    const currentG = row[idx['Season']] ?? '';
    const currentH = row[idx['Occasion']] ?? '';

    // Current G is clobbered with occasion prose — restore correct seasonal text
    const correctSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';

    console.log(`\nIsland Vanilla Dunes (row ${i + 1})`);
    console.log(`  Current G (Season): ${JSON.stringify(currentG)}`);
    console.log(`  H (Occasion): ${JSON.stringify(currentH)}`);

    if (currentG !== correctSeason) {
      toWrite.push({ range: `G${i + 1}`, value: correctSeason });
      console.log(`  >>> Fixing G with correct seasonal text`);
    }
    // H already has the correct occasion prose — no change needed
  }
}

console.log(`\nTotal cells to write: ${toWrite.length}`);

if (!toWrite.length) {
  console.log('\\n>>> Nothing to write.');
  process.exit(0);
}

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: toWrite.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\\n>>> Wrote ${toWrite.length} cells: ${toWrite.map(u => u.range).join(', ')}`);

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
    console.log(`\\nVerified ${fix.range}: ${JSON.stringify(row[idx['Season']])}`);
    console.log(`  Occasion: ${JSON.stringify(row[idx['Occasion']])}`);
  }
}
