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

// Enriched prose for Season + Occasion, next 10 entries
// Following the row 654 style (Rose Origami):
// Season = concise seasonal description
// Occasion = comma-separated settings + descriptive closing sentence about vibe
const prose = {
  'Queen of Arabia': {
    season: 'Spring, Summer, and all-year tropical climates — the warm coconut-and-jasmine opening softens into a rich, amber-hued dry-down under the heavy, humid air.',
    occasion: 'Sun-drenched beach resort vacations, pool lounges, and laid-back evening mixers, where coconut, nutmeg, and grapefruit open like a desert morning before royal jasmine and crimson rose settle into salted amber and Madagascar vanilla.',
  },
  'Le Prestige Bold': {
    season: 'All-Season master key, best worn in the damp cold of late Autumn and Winter, when the saffron-and-coconut front folds into a rich, amber-hued dry-down.',
    occasion: 'High-stakes evening business dates, exclusive penthouse parties, and late-night lounge gatherings — the saffron-and-coconut front lays down a confident, nightlife-ready statement that settles into cream and cedar.',
  },
  'Le Prestige King': {
    season: 'Spring, Autumn, and pleasant day-to-night transitional climates — crisp and composed through the darker, rainier hours, where rose geranium and leather dry down into a chypre.',
    occasion: 'Formal corporate boardrooms, executive business meetings, and professional daytime networking events — clean, composed, and quietly authoritative, the kind of scent that reads as decisive from across a room.',
  },
  'Gharam': {
    season: 'All-Season master key that deepens through Autumn and Winter, when the saffron and bitter almond wake the room and the ambergris-and-jasmine heart holds it in the gray hours.',
    occasion: 'Intimate candlelit dinner dates, exclusive evening lounge settings, and glamorous nightlife outings — the saffron-and-bitter-almond top gives way to amberwood and ambergris, then Madagascar vanilla and cedarwood drift out like a slow, tender confession.',
  },
  'Kismet Magic': {
    season: 'A winter and early-Autumn scent that thrives in the intense cool of tropical rainy or Harmattan seasons, when the aged-cognac and cinnamon weight settles into a glowing, cozy warmth.',
    occasion: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.',
  },
  'Island Vanilla Dunes': {
    season: 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom spark over a creamy vanilla blanket, holding through the dry heat of the Harmattan or the heavy drop of the rainy season.',
    occasion: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights, where vanilla-and-bourbon warmth reads as easy charm and the creamy base feels like a familiar blanket.',
  },
  'Sceptre Oceana': {
    season: 'A cool-weather scent that only takes full flight when the air is crisp — bourbon vanilla absolute opens clean and balsamic, then siam benzoin and assam agarwood draw the room into a dark, resinous evening.',
    occasion: 'Formal black-tie evening galas, prestigious red-carpet banquets, and elite winter milestone celebrations, where the deep agarwood-and-benzoin tail asserts presence without raising its voice.',
  },
  'Cascade Blue': {
    season: 'Summer, Spring, and high-temperature tropical weather — sweet melon and fresh lemon arrive like a spark on a hot day, and the marine, lavender, and crisp apple heart carries the scent through tropical summer and spring storms.',
    occasion: 'High-temperature outdoor daytime excursions and active gym sessions, then a sharp transfer to professional corporate office settings and casual weekend social events, where the fresh aquatic-fougère round stays brassy and clear.',
  },
  'Aseel': {
    season: 'A cold-weather scent forged in the Harmattan and heavy rainy seasons — pink pepper and cardamom open like a cool morning, incense and tea deepen it into a smoky-ivory core, and clean oud, tonka, and ambergris settle into a floral, dark evening.',
    occasion: 'Elite cultural evening galas, high-end fine dining dates, and professional evening networking functions, where the pink-pepper-and-lily masterstroke carries through into authoritative late-night statement wear.',
  },
  'Ramad Louban': {
    season: 'An autumn and winter warmth — black pepper and myrrh and cinnamon open like a spice market, and the davana, labdanum, and vetiver hold that heat through the cool tropical Harmattan or heavy rainy season.',
    occasion: 'Elegant evening lounge settings, traditional cultural ceremonies, and formal dinner dates, where the black-pepper-and-cinnamon spark supports a commanding, quiet authority at nighttime functions.',
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
const seasonIdx = idx['Season'];
const occasionIdx = idx['Occasion'];

// The next 10 entries (from next-batch.json)
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

console.log('=== Next 10 entries ===');
console.log(headers.join(' | '));
console.log();

const toWrite = [];
let matched = 0;

for (let i = 1; i < allRows.length; i++) {
  const row = allRows[i];
  const name = row[nameIdx] ?? '';
  const brand = row[brandIdx] ?? '';
  const entry = next10.find(r => r.brand === brand && r.name === name);
  if (!entry) continue;

  matched++;
  const p = prose[name];
  if (!p) { console.log(`[${entry.id}] ${name} — prose not found, skipping`); continue; }

  // Check if current values differ from prose
  const currentSeason = row[seasonIdx] ?? '';
  const currentOccasion = row[occasionIdx] ?? '';

  if (currentSeason !== p.season) {
    toWrite.push({ range: `G${i + 1}`, value: p.season });
    console.log(`[${entry.id}] ${name}: Season updated`);
  }
  if (currentOccasion !== p.occasion) {
    toWrite.push({ range: `H${i + 1}`, value: p.occasion });
    console.log(`[${entry.id}] ${name}: Occasion updated`);
  }
}

console.log(`\nMatched: ${matched}/${next10.length}`);
console.log(`Cells to write: ${toWrite.length}`);

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
