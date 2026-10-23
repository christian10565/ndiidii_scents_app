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

// Load next-batch (source of truth for values)
const batch = JSON.parse(readFileSync(join(process.cwd(), 'data', 'next-batch.json'), 'utf8'));
const batchByKey = new Map();
batch.forEach(r => {
  batchByKey.set(`${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`, r);
});

// Read sheet
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());
const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

// Header-to-column (0-based) from the header row
const nameIdx = idx['Perfume Name'];
const brandIdx = idx['Brand'];
const topIdx = idx['Top Notes'];
const heartIdx = idx['Heart notes'];
const baseIdx = idx['Base Notes'];
const seasonIdx = idx['Season'];
const occasionIdx = idx['Occasion'];
const genderIdx = idx['Gender'];
const scentIdx = idx['Scent profile'];

// Next 10 entries to process
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

// Prose for the style-matched expansion (following row 654 Rose Origami)
// Season = a concise seasonal statement; Occasion = a comma-separated
// settings list + a closing vibe sentence ending in a period.
const prose = {
  'Queen of Arabia': {
    season: 'Spring, Summer, and all-year tropical climates — coconut, nutmeg, and grapefruit open like a desert morning, then settle into royal jasmine and crimson rose under a sky of salted amber and Madagascar vanilla.',
    occasion: 'Sun-drenched beach resort vacations, pool lounges, and laid-back evening mixers — the warm opening softens into a hedonistic, amber-hued finish that wraps a confident woman in ease.',
  },
  'Le Prestige Bold': {
    season: 'All-Season master key, performing best in the damp cold of late Autumn and Winter, when saffron, bergamot, and coconut fold into a rich, amber-hued dry-down.',
    occasion: 'High-stakes evening business dates, exclusive penthouse parties, and late-night lounge gatherings — the saffron-and-coconut front lays down a confident, nightlife-ready statement that settles into cream and cedar.',
  },
  'Le Prestige King': {
    season: 'Spring, Autumn, and any pleasant day-to-night transitional climate — crisp and composed, with rose geranium and leather drying down into a chypre as the day turns darker.',
    occasion: 'Formal corporate boardrooms, executive business meetings, and professional daytime networking events — clean, composed, and quietly authoritative, the kind of scent that reads as decisive from across a room.',
  },
  'Gharam': {
    season: 'All-Season elixir that deepens through Autumn and Winter, when saffron and bitter almond wake the room and ambergris-and-jasmine holds it in the gray hours.',
    occasion: 'Intimate candlelit dinner dates, exclusive evening lounge settings, and glamorous nightlife outings — saffron-and-bitter-almond leading to amberwood and ambergris, then Madagascar vanilla and cedarwood drifting out like a slow, tender confession.',
  },
  'Kismet Magic': {
    season: 'Winter and early Autumn, thriving in the intense cool of tropical rainy or Harmattan seasons, when aged-cognac and cinnamon settle into a glowing, cozy warmth.',
    occasion: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges — praline and vanilla under the sugar light of an intimate winter date night, when the room slows down and the warmth lingers.',
  },
  'Island Vanilla Dunes': {
    season: 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom sparking over a creamy vanilla blanket that holds through the dry Harmattan heat and the drop of the rainy season.',
    occasion: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights — vanilla-and-bourbon warmth reading as easy charm, the creamy base like a familiar blanket.',
  },
  'Sceptre Oceana': {
    season: 'A cool-weather scent that only takes full flight when the air is crisp — bourbon vanilla absolute opening clean and balsamic, then siam benzoin and assam agarwood drawing the room into a dark, resinous evening.',
    occasion: 'Formal black-tie evening galas, prestigious red-carpet banquets, and elite winter milestone celebrations — the deep agarwood-and-benzoin tail asserts presence without raising its voice.',
  },
  'Cascade Blue': {
    season: 'Summer, Spring, and high-temperature tropical weather — sweet melon and fresh lemon arriving like a spark on a hot day, with marine, lavender, and crisp apple carrying the scent through summer and spring storms.',
    occasion: 'High-temperature outdoor daytime excursions and active gym sessions, then a sharp transfer to professional corporate office settings and casual weekend social events — the fresh aquatic-fougère round stays crisp and clear.',
  },
  'Aseel': {
    season: 'A cold-weather scent forged in the Harmattan and heavy rainy seasons — pink pepper and cardamom opening like a cool morning, incense and tea deepening into a smoky-ivory core, and clean oud, tonka, and ambergris settling into a floral, dark evening.',
    occasion: 'Elite cultural evening galas, high-end fine dining dates, and professional evening networking functions — the pink-pepper-and-lily masterstroke carrying through into authoritative late-night statement wear.',
  },
  'Ramad Louban': {
    season: 'An autumn and winter warmth — black pepper, myrrh, and cinnamon opening like a spice market, with davana, labdanum, and vetiver holding that heat through the cool tropical Harmattan or heavy rainy season.',
    occasion: 'Elegant evening lounge settings, traditional cultural ceremonies, and formal dinner dates — the black-pepper-and-cinnamon spark supporting a commanding, quiet authority at nighttime functions.',
  },
};

// Match targets
const targets = new Set(next10.map(r => `${r.brand.toLowerCase()}|${r.name.toLowerCase()}`));
const rowsToFix = [];
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][nameIdx] ?? '';
  const brand = allRows[i][brandIdx] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  if (!targets.has(key)) continue;
  const entry = batchByKey.get(key);
  rowsToFix.push({ sheetIdx: i + 1, name: entry.name, entry });
}

console.log(`Rows matched: ${rowsToFix.length}`);
console.log(`Header indexes: name=${nameIdx}, brand=${brandIdx}, top=${topIdx}, heart=${heartIdx}, base=${baseIdx}, season=${seasonIdx}, occasion=${occasionIdx}, gender=${genderIdx}, scent=${scentIdx}`);

// Build updates
const updates = [];
let fixed = 0;

for (const r of rowsToFix) {
  const row = allRows[r.sheetIdx - 1];
  const e = r.entry;
  const wrote = [];

  const top = (e.notes?.top || '').trim();
  if (row[topIdx] !== top) { updates.push({ range: `E${r.sheetIdx}`, value: top }); wrote.push('top'); fixed++; }

  const heart = (e.notes?.heart || '').trim();
  if (row[heartIdx] !== heart) { updates.push({ range: `F${r.sheetIdx}`, value: heart }); wrote.push('heart'); fixed++; }

  const base = (e.notes?.base || '').trim();
  if (row[baseIdx] !== base) { updates.push({ range: `G${r.sheetIdx}`, value: base }); wrote.push('base'); fixed++; }

  const season = (e.season || '').trim();
  if (row[seasonIdx] !== season) { updates.push({ range: `H${r.sheetIdx}`, value: season }); wrote.push('season'); fixed++; }

  const p = prose[e.name];
  const occasion = p?.occasion || '';
  if (row[occasionIdx] !== occasion) { updates.push({ range: `I${r.sheetIdx}`, value: occasion }); wrote.push('occasion'); fixed++; }

  const gender = (e.gender || '').trim();
  if (row[genderIdx] !== gender) { updates.push({ range: `J${r.sheetIdx}`, value: gender }); wrote.push('gender'); fixed++; }

  const scent = (e.scentProfile || '').trim();
  if (row[scentIdx] !== scent) { updates.push({ range: `K${r.sheetIdx}`, value: scent }); wrote.push('scent'); fixed++; }

  if (wrote.length) console.log(`[${r.entry.id}] ${r.name}: wrote ${wrote.join(', ')}`);
}

console.log(`\nTotal cells to write: ${updates.length}`);

if (!updates.length) {
  console.log('\n>>> Nothing to write.');
  process.exit(0);
}

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\n>>> Wrote ${updates.length} cells: ${updates.map(u => u.range).join(', ')}`);
