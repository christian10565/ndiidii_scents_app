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

// Load next-batch.json for the 10 entries
const batch = JSON.parse(readFileSync(join(process.cwd(), 'data', 'next-batch.json'), 'utf8'));
const batchByKey = new Map();
batch.forEach(r => {
  batchByKey.set(`${r.brand.trim().toLowerCase()}|${r.name.trim().toLowerCase()}`, r);
});

// Read the sheet
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());

console.log('=== Header row (index: header) ===');
headers.forEach((h, i) => {
  console.log(`${i}: ${h}`);
});

// Find the actual column indices for our target fields
const nameIdx = headers.findIndex(h => h && /perfume name/i.test(h));
const brandIdx = headers.findIndex(h => h && /brand/i.test(h));
const seasonIdx = headers.findIndex(h => h && /season/i.test(h));
const occasionIdx = headers.findIndex(h => h && /occasion/i.test(h));

console.log(`\nDetected column indices: name=${nameIdx}, brand=${brandIdx}, season=${seasonIdx}, occasion=${occasionIdx}`);

// The 10 entries (by brand+name matching in sheet)
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

// ---- Enriched prose (following row 654 Rose Origami style) ----
// Season = descriptive seasonal statement
// Occasion = comma-separated settings + closing vibe sentence (ending with period)
const prose = {
  'Queen of Arabia': {
    season: 'Spring, Summer, and all-year tropical climates — coconut, nutmeg, and grapefruit open like a desert morning, then settle into royal jasmine and crimson rose under a sky of salted amber and Madagascar vanilla.',
    occasion: 'Sun-drenched beach resort vacations, pool lounges, and laid-back evening mixers, where coconut, nutmeg, and grapefruit open like a desert morning before royal jasmine and crimson rose settle into salted amber and Madagascar vanilla. It coats the wearer in a warm, hedonistic glow that never quite lets go.',
  },
  'Le Prestige Bold': {
    season: 'All-Season master key, performing best in the damp cold of late Autumn and Winter, when saffron, bergamot, and coconut fold into a rich, amber-hued dry-down.',
    occasion: 'High-stakes evening business dates, exclusive penthouse parties, and late-night lounge gatherings, where the saffron-and-coconut front lays down a confident, nightlife-ready statement. It leaves a trail of cream and cedar that lingers long after the evening ends.',
  },
  'Le Prestige King': {
    season: 'Spring, Autumn, and any pleasant day-to-night transitional climate — crisp and composed, with rose geranium and leather drying down into a chypre as the day turns darker.',
    occasion: 'Formal corporate boardrooms, executive business meetings, and professional daytime networking events, where clean composition and quiet authority read as decisive from across a room. The rose geranium and leather dry-down carries it through the day without ever stepping on ideas.',
  },
  'Gharam': {
    season: 'All-Season elixir that deepens through Autumn and Winter, when saffron and bitter almond wake the room and ambergris-and-jasmine holds it in the gray hours.',
    occasion: 'Intimate candlelit dinner dates, exclusive evening lounge settings, and glamorous nightlife outings, where saffron-and-bitter-almond gives way to amberwood and ambergris, then Madagascar vanilla and cedarwood. It moves like a slow, tender confession in the dim light.',
  },
  'Kismet Magic': {
    season: 'Winter and early Autumn, thriving in the intense cool of tropical rainy or Harmattan seasons, when aged-cognac and cinnamon settle into a glowing, cozy warmth.',
    occasion: 'Formal evening banquets, holiday family dinners, and cozy late-night jazz or coffee-shop lounges, where praline and vanilla sit under the sugar light of an intimate winter date night. The aged-cognac and cinnamon weight settles into a warmth that makes the room slow down.',
  },
  'Island Vanilla Dunes': {
    season: 'Autumn, Winter, and the cool tropical Harmattan or heavy rainy seasons — cinnamon and cardamom sparking over a creamy vanilla blanket that holds through the dry Harmattan heat and the drop of the rainy season.',
    occasion: 'Cozy evening stay-ins, intimate late-night coffee-shop visits, winter holiday family gatherings, and sophisticated date nights, where vanilla-and-bourbon warmth reads as easy charm. The creamy base lands like a familiar blanket against the cool of the Harmattan.',
  },
  'Sceptre Oceana': {
    season: 'A cool-weather scent that only takes full flight when the air is crisp — bourbon vanilla absolute opening clean and balsamic, then siam benzoin and assam agarwood drawing the room into a dark, resinous evening.',
    occasion: 'Formal black-tie evening galas, prestigious red-carpet banquets, and elite winter milestone celebrations, where the deep agarwood-and-benzoin tail asserts presence without raising its voice. It is the kind of scent that arrives before you do and stays long after the crowd thins.',
  },
  'Cascade Blue': {
    season: 'Summer, Spring, and high-temperature tropical weather — sweet melon and fresh lemon arriving like a spark on a hot day, with marine, lavender, and crisp apple carrying the scent through summer and spring storms.',
    occasion: 'High-temperature outdoor daytime excursions and active gym sessions, then a sharp transfer to professional corporate office settings and casual weekend social events, where the fresh aquatic-fougère round stays crisp and clear. It is a breath of cool air through the heavy heat.',
  },
  'Aseel': {
    season: 'A cold-weather scent forged in the Harmattan and heavy rainy seasons — pink pepper and cardamom opening like a cool morning, incense and tea deepening into a smoky-ivory core, and clean oud, tonka, and ambergris settling into a floral, dark evening.',
    occasion: 'Elite cultural evening galas, high-end fine dining dates, and professional evening networking functions, where the pink-pepper-and-lily masterstroke carries through into authoritative late-night statement wear. It commands the room and then quietly steps back.',
  },
  'Ramad Louban': {
    season: 'An autumn and winter warmth — black pepper, myrrh, and cinnamon opening like a spice market, with davana, labdanum, and vetiver holding that heat through the cool tropical Harmattan or heavy rainy season.',
    occasion: 'Elegant evening lounge settings, traditional cultural ceremonies, and formal dinner dates, where the black-pepper-and-cinnamon spark supports a commanding, quiet authority at nighttime functions. It arrives like a spice market at dusk and lingers through the evening.',
  },
};

// ---- Build updates ----
console.log('\n=== Building updates ===');
const updates = [];
let processed = 0;

for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][nameIdx] ?? '';
  const brand = allRows[i][brandIdx] ?? '';
  const key = `${brand.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
  const entry = batchByKey.get(key);
  if (!entry) continue;

  const p = prose[entry.name];
  if (!p) { console.log(`[${entry.id}] ${entry.name}: no prose`); continue; }

  // Build correct values
  const newSeason = p.season;
  const newOccasion = p.occasion;

  // Read current values
  const currentSeason = allRows[i][seasonIdx] ?? '';
  const currentOccasion = allRows[i][occasionIdx] ?? '';

  if (currentSeason !== newSeason) {
    updates.push({ range: `G${i + 1}`, value: newSeason }); // Season is column G
    console.log(`[${entry.id}] ${entry.name}: Season -> G${i+1}`);
  }
  if (currentOccasion !== newOccasion) {
    updates.push({ range: `H${i + 1}`, value: newOccasion }); // Occasion is column H
    console.log(`[${entry.id}] ${entry.name}: Occasion -> H${i+1}`);
  }
  processed++;
}

console.log(`\nProcessed ${processed}/${next10.length} entries`);
console.log(`Total cells to write: ${updates.length}`);
if (updates.length === 0) { console.log('Nothing to write'); process.exit(0); }
console.log('Update ranges:', updates.map(u => u.range).join(', '));

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
  },
});

console.log(`\n>>> Wrote ${updates.length} cells`);
