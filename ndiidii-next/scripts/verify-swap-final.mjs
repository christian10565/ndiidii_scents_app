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
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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

console.log('=== Current state of Kismet Magic (146) and Island Vanilla Dunes (147) ===');
console.log(headers.join(' | '));
console.log();

const check = (rowIdx, name, expectedSeason, expectedBase, expectedOccasion) => {
  const row = allRows[rowIdx - 1];
  if (!row) { console.log(`Row ${rowIdx} not found\n`); return false; }
  const nameVal = row[idx['Perfume Name']] ?? '';
  const g = row[idx['Season']] ?? '';
  const h = row[idx['Occasion']] ?? '';
  const f = row[idx['Base Notes']] ?? '';

  console.log(`[${nameVal}] row ${rowIdx}`);
  console.log(`  Base (F): ${JSON.stringify(f)}`);
  console.log(`  Season (G): ${JSON.stringify(g)}`);
  console.log(`  Occasion (H): ${JSON.stringify(h)}`);

  let ok = true;
  const checks = [
    { label: 'Base (F)', actual: f, expected: expectedBase },
    { label: 'Season (G)', actual: g, expected: expectedSeason },
    { label: 'Occasion (H)', actual: h, expected: expectedOccasion },
  ];
  for (const c of checks) {
    if (c.actual !== c.expected) {
      console.log(`  -> FAIL ${c.label}: got ${JSON.stringify(c.actual)}`);
      ok = false;
    } else {
      console.log(`  -> PASS ${c.label}`);
    }
  }
  console.log();
  return ok;
};

const kismetSeason = 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.';
const islandSeason = 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.';
const kismetBase = 'Pralines, Sweet Vanilla, and Sandalwood';
const islandBase = 'Creamy Praline, Golden Amber, and Soft Musk';
const kismetOcc = 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.';
const islandOcc = 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.';

const results = [];
results.push(check(146, 'Kismet Magic', kismetSeason, kismetBase, kismetOcc));
results.push(check(147, 'Island Vanilla Dunes', islandSeason, islandBase, islandOcc));

const allPassed = results.every(r => r);
console.log(`=== Overall: ${allPassed ? 'ALL PASS' : 'SOME FAIL'} ===`);
process.exit(allPassed ? 0 : 1);
