import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
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

// ---- Prose for the next 10 entries, following row 654 (Rose Origami) style ----
// Style: comma-separated settings + descriptive closing sentence about vibe.
// Example: "Date Nights, Upscale Evening Gatherings, Formal Events, Intimate Lounges, or Office Wear for Confident Professionals. It wraps the wearer in an incredibly mysterious, sophisticated, and dark, romantic aura."
const prose = {
  'Queen of Arabia': {
    occasion: 'Sun-drenched beach resort vacations, pool lounges, and laid-back evening mixers, where coconut, nutmeg, and grapefruit open like a desert morning before royal jasmine and crimson rose settle into salted amber and Madagascar vanilla. It coats the wearer in a warm, hedonistic glow that never quite lets go.',
  },
  'Le Prestige Bold': {
    occasion: 'High-stakes evening business dates, exclusive penthouse parties, and late-night lounge gatherings, where the saffron-and-coconut front lays down a confident, nightlife-ready statement. It leaves a trail of cream and cedar that lingers long after the evening ends.',
  },
  'Le Prestige King': {
    occasion: 'Formal corporate boardrooms, executive business meetings, and professional daytime networking events, where clean composition and quiet authority read as decisive from across a room. The rose geranium and leather dry-down carries it through the day without ever stepping on ideas.',
  },
  'Gharam': {
    occasion: 'Intimate candlelit dinner dates, exclusive evening lounge settings, and glamorous nightlife outings, where saffron-and-bitter-almond gives way to amberwood and ambergris, then Madagascar vanilla and cedarwood. It moves like a slow, tender confession in the dim light.',
  },
  'Kismet Magic': {
    occasion: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges, where praline and vanilla sit under the sugar light of an intimate winter date night. The aged-cognac and cinnamon weight settles into a warmth that makes the room slow down.',
  },
  'Island Vanilla Dunes': {
    occasion: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights, where vanilla-and-bourbon warmth reads as easy charm. The creamy base lands like a familiar blanket against the cool of the Harmattan.',
  },
  'Sceptre Oceana': {
    occasion: 'Formal black-tie evening galas, prestigious red-carpet banquets, and elite winter milestone celebrations, where the deep agarwood-and-benzoin tail asserts presence without raising its voice. It is the kind of scent that arrives before you do and stays long after the crowd thins.',
  },
  'Cascade Blue': {
    occasion: 'High-temperature outdoor daytime excursions and active gym sessions, then a sharp transfer to professional corporate office settings and casual weekend social events, where the fresh aquatic-fougère round stays crisp and clear. It is a breath of cool air through the heavy heat.',
  },
  'Aseel': {
    occasion: 'Elite cultural evening galas, high-end fine dining dates, and professional evening networking functions, where the pink-pepper-and-lily masterstroke carries through into authoritative late-night statement wear. It commands the room and then quietly steps back.',
  },
  'Ramad Louban': {
    occasion: 'Elegant evening lounge settings, traditional cultural ceremonies, and formal dinner dates, where the black-pepper-and-cinnamon spark supports a commanding, quiet authority at nighttime functions. It arrives like a spice market at dusk and lingers through the evening.',
  },
};

// ---- Read sheet ----
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

const nameIdx = idx['Perfume Name'];
const brandIdx = idx['Brand'];
const occasionIdx = idx['Occasion'];

// The 10 next-batch entries by brand+name
const next10 = [
  { brand: 'Lattafa Pride', name: 'Queen of Arabia', id: 117 },
  { brand: 'Khadlaj', name: 'Le Prestige Bold', id: 141 },
  { brand: 'Khadlaj', name: 'Le Prestige King', id: 142 },
  { brand: 'Lattafa Pride', name: 'Gharam', id: 144 },
  { brand: 'Maison Alhambra', name: 'Kismet Magic', id: 146 },
  { brand: 'Khadlaj', name: 'Island Vanilla Dunes', id: 147 },
  { brand: 'Maison Alhambra', name: 'Sceptre Oceana', id: 150 },
  { brand: 'Maison Asrar', name: 'Cascade Blue', id: 154 },
  { brand: 'Maison Asrar', name: 'Aseel', id: 170 },
  { brand: 'Arabiyat Prestige', name: 'Ramad Louban', id: 184 },
];

const targets = new Set(next10.map(r => `${r.brand.toLowerCase()}|${r.name.toLowerCase()}`));
const rowsToUpdate = [];
let matched = 0;

for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][nameIdx] ?? '';
  const brand = allRows[i][brandIdx] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  if (!targets.has(key)) continue;
  matched++;
  const currentOccasion = allRows[i][occasionIdx] ?? '';
  const entryProse = prose[name];
  if (!entryProse) { console.log(`[${name}] no prose definition`); continue; }
  const newOccasion = entryProse.occasion;
  if (currentOccasion === newOccasion) { console.log(`[${name}] already correct, skipping`); continue; }
  rowsToUpdate.push({ sheetIdx: i + 1, newOccasion });
}

console.log(`Matched 10/10: ${matched}`);
console.log(`Cells to write: ${rowsToUpdate.length}`);
if (!rowsToUpdate.length) { console.log('Nothing to write'); process.exit(0); }

const updates = rowsToUpdate.map(r => ({ range: `H${r.sheetIdx}`, value: r.newOccasion }));
console.log('Updates:', updates.map(u => u.range).join(', '));

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\n>>> Wrote ${updates.length} cells to Occasion (H) column`);
