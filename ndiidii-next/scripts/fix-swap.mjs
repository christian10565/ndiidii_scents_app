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

// Row 146 (Kismet Magic) — current G is occasion prose; restore correct season prose
// Row 147 (Island Vanilla Dunes) — current G is occasion prose; restore correct season prose

const fix = [
  {
    row: 146,
    sheetName: 'Kismet Magic',
    correctSeason: 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.',
    currentG: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges, where praline and vanilla sit under the sugar light of an intimate winter date night. The aged-cognac and cinnamon weight settles into a warmth that makes the room slow down.',
    currentH: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.',
  },
  {
    row: 147,
    sheetName: 'Island Vanilla Dunes',
    correctSeason: 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.',
    currentG: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights, where vanilla-and-bourbon warmth reads as easy charm. The creamy base lands like a familiar blanket against the cool of the Harmattan.',
    currentH: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.',
  },
];

console.log('=== Current sheet state (target rows) ===');
console.log(headers.join(' | '));
console.log();

const toWrite = [];

for (const fix of fixes) {
  const rowIdx = fix.row; // 1-based row number
  const row = allRows[rowIdx - 1];
  if (!row) { console.log(`Row ${rowIdx} not found in sheet`); continue; }

  console.log(`\n[${fix.row}] ${fix.sheetName}`);
  console.log(`  Current G (Season): ${JSON.stringify(row[idx['Season']])}`);
  console.log(`  Current H (Occasion): ${JSON.stringify(row[idx['Occasion']])}`);

  if (row[idx['Season']] !== fix.correctSeason) {
    toWrite.push({ range: `G${rowIdx}`, value: fix.correctSeason });
    console.log(`  >>> Fixing G to correct season prose`);
  }
  // H is already correct (occasion prose) — verify
  if (row[idx['Occasion']] !== fix.currentH) {
    console.log(`  WARNING: H does not match expected; may need fix`);
  } else {
    console.log(`  >>> H (Occasion) confirmed correct`);
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
for (const fix of fixes) {
  const row = allRows2[fix.row - 1];
  if (row) {
    console.log(`\\nVerified [${fix.row}] ${fix.sheetName}`);
    console.log(`  G (Season): ${JSON.stringify(row[idx['Season']])}`);
    console.log(`  H (Occasion): ${JSON.stringify(row[idx['Occasion']])}`);
  }
}
