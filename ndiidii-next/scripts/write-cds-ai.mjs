// Write the AI-generated discovery sets to a new sheet tab "CDS - AI",
// mirroring the " Curated Discovery Sets" layout:
//   header: Collection Name | Scent Profile | Description | Perfume Option 1 | Perfume Option 2
//   per set: 4 slot rows -> blank -> title row -> blank
//
// Deterministic: reads data/discovery-sets-generated.json (already seeded) and
// assigns an evocative name from a per-family pool, in order. Re-running is
// idempotent — it clears the tab and rewrites it.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const sets = JSON.parse(readFileSync(join(ROOT, 'data/discovery-sets-generated.json'), 'utf8')).sets;
const cat = JSON.parse(readFileSync(join(ROOT, 'data/catalog-snapshot.json'), 'utf8'));
const bySlug = new Map(cat.perfumes.map((p) => [p.slug, p]));

// --- Enthralling set names, keyed by the generator's family `name` value. ---
const NAMES = {
  // note families
  'Amber & Resin': ['Liquid Gold','Warm Ember','Amber Hour','Golden Resin','Amber Veil','Resin & Gold','Sunbaked','Amber Glow','Molten Amber','Honeyed Dusk','Amber Silk','Fossil Sun','Resin Reverie','Golden Aura','Amber Fields','Slow Burn','Golden Haze'],
  'Citrus & Fresh': ['First Light','Sunlit','Golden Hour','Citrus Rain','Morning Zest','Sun Kissed','Fresh Cut','Daylight','Clean Slate','Ocean Air','Sun Bleached','Citrus Burst','Cool Breeze','Daybreak','White Linen','Fresh Squeeze','Blue Skies','Lemonade Stand','Solar Flare','Crisp Morning','High Noon','Summer Shine','Zesty Start','Bright & Breezy'],
  'Floral': ['Full Bloom','Petal & Stem','Garden at Dusk','Bouquet','Wild Garden','Petal Storm','Flower Market','Spring Fling','Bloom & Blush','Rose Colored','Garden Party','Petal Soft','Night Bloom','Wildflower','Orchard Bloom','Velvet Petal','Flora','Bloom'],
  'Leather & Tobacco': ['Smoke & Hide','Leather Bound','The Smoking Room','Tobacco & Oak','Dark Lounge','Old Flame'],
  'Spicy & Warm': ['Spice & Ember','Fire & Honey','Warm Spice','Spice Market','Ember & Clove','Cinnamon Haze','Pepper & Smoke','Mulled','Spice Route','Warm Current'],
  'Sweet & Gourmand': ['The Confectionary','Sugar Rush','Vanilla Sky','Sweet Tooth','Midnight Dessert','Crème & Caramel','Molten Sugar','Candy Shop','Honey Trap','Cocoa & Cream','Buttercream','Sweet Nothings','Dolce','Caramel Kiss','Vanilla Bean','Sugar Plum','Golden Syrup','Marshmallow Cloud','Crème Brûlée','Tiramisu','Praline','Marzipan','Cotton Candy','Sweet Escape'],
  'Woods & Incense': ['Incense Trail','Cathedral Woods','Sacred Smoke','Deep Forest','Smoke Signals','Temple','Cedar & Ash','Holy Smoke','Forest Floor','Pine & Prayer','Smolder','Sandalwood','Wild Woods','Timber','Midnight Forest','Old Growth','Cedar Grove','Incense & Ember'],
  // vibe families
  'daily': ['Everyday Icons','Daily Rotation','Signature Stack','The Regulars','Day In, Day Out','Morning to Night','The Daily','Always On','The Essentials','Daily Drivers','Round the Clock','The Usuals','Daily Grind','Workhorse','Off the Clock','Day Shift','Seven Days'],
  'date night': ['The Rendezvous','First Impressions','Slow Dance','Dim the Lights','Table for Two','Chemistry','Heart Eyes','The One','Sparks','Close Enough','Red Lipstick','Candlelight','The Crush','Love at First Scent','Sealed with a Kiss','Sweet Talk'],
  'evening': ['After Dark','Midnight Ritual','Nightshift','The Night Owl','Dusk till Dawn','Moonlight','Evening Primrose','Nightcap','Starlight','The Late Show','Witching Hour','Midnight Oil','Neon Nights','Last Light','Twilight','Velvet Night','Dark & Stormy','After Hours','The Night Market','Nightfall'],
  'formal': ['Black Tie','The Gala','Evening Wear','White Glove','State Dinner','The Soirée','Full Regalia'],
  'fresh': ['Fresh Start','Bare & Clean','So Fresh','Crisp','Just Washed','Linen Closet','Spring Water','New Dawn','Air Fresh','Clear Day','Fresh Coat','Cool Factor'],
  'office': ['The Corner Office','Boardroom','Desk to Dinner','Nine to Five','Executive Suite','Power Suit','In Session','The Grind','Clocked In','Suite Life','The Briefing','Corner Desk','Closed Deal','The Ladder','Briefcase','Monday Meeting'],
  'party': ['The Main Event','Last Call','Lights Down','Turn Up'],
  'summer': ['Heatwave','Tropical','Sun Drenched','Poolside','Island Time',"Summer Lovin'",'Hot & Bothered','Golden Days'],
  'winter': ['Fireside','Cold Snap','Winter Warmers','Snow Day'],
  // dna lines (keyed by exact generated name)
  'Paris Corner — khair line': ['The Khair Quartet'],
  'Khadlaj — shiyaaka line': ['The Shiyaaka Wardrobe'],
  'Mahabub — arabian line': ['Arabian Nights'],
};

// --- Helpers ---
const cleanNote = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[.;,]\s*$/g, '')
    .trim();

const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function cleanProfile(s) {
  const seg = String(s ?? '').split('/')[0].replace(/\s+/g, ' ').trim();
  return seg || 'Signature Blend';
}

function slotDescription(p, familyLabel) {
  const n = p.notes || {};
  const top = cleanNote(n.top);
  const heart = cleanNote(n.heart);
  const base = cleanNote(n.base);
  if (top && base) {
    const mid = heart ? ` over ${lcFirst(heart)}` : '';
    return `${top}${mid} on a ${lcFirst(base)} base.`;
  }
  if (p.scentProfile) return `A ${lcFirst(cleanProfile(p.scentProfile))} discovery.`;
  return `A ${familyLabel.toLowerCase()} discovery.`;
}

const roman = (n) => {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV'];
  return r[n - 1] ?? String(n);
};

// --- Assign names in family order, deterministic (sets are already ordered). ---
const counters = new Map();
for (const s of sets) {
  const pool = NAMES[s.name] ?? [];
  const i = counters.get(s.name) ?? 0;
  counters.set(s.name, i + 1);
  s.displayName = pool[i] ?? `${pool[0] ?? s.name} ${roman(i + 1)}`;
}

// --- Build rows ---
const HEADER = ['Collection Name', 'Scent Profile', 'Description', 'Perfume Option 1', 'Perfume Option 2'];
const rows = [HEADER];
let missing = 0;
for (const s of sets) {
  for (const m of s.perfumes) {
    const p = bySlug.get(m.slug);
    if (!p) {
      missing++;
      rows.push([s.displayName, '—', '—', m.name, '']);
      continue;
    }
    rows.push([
      s.displayName,
      cleanProfile(p.scentProfile),
      slotDescription(p, s.name),
      p.name,
      '',
    ]);
  }
  rows.push([]);               // blank
  rows.push([s.displayName]);  // decorative title row
  rows.push([]);               // blank
}

// --- Write to the sheet ---
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = 'CDS - AI';
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
const tabs = (meta.data.sheets ?? []).map((t) => t.properties.title);
if (tabs.includes(TAB)) {
  // Clear existing content, then rewrite (idempotent re-run).
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'` });
} else {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  });
}

await sheets.spreadsheets.values.update({
  spreadsheetId: SHEET_ID,
  range: `'${TAB}'!A1:E${rows.length}`,
  // RAW, not USER_ENTERED: USER_ENTERED makes Sheets parse "9AM" into a
  // time (09:00) and mangle other number/date-looking perfume names. RAW
  // stores every value as a literal string, exactly as the Perfumes sheet has it.
  valueInputOption: 'RAW',
  requestBody: { values: rows },
});

console.log(`Wrote ${rows.length} rows (1 header + ${sets.length} sets) to "${TAB}".`);
console.log(`Missing catalog entries: ${missing}`);
console.log('--- first 3 sets ---');
let shown = 0;
for (const s of sets) {
  if (shown >= 3) break;
  console.log(`\n[${s.family}] ${s.displayName}`);
  for (const m of s.perfumes) console.log('  -', m.name);
  shown++;
}
