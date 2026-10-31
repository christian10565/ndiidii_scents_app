import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DRY = process.argv.includes('--dry');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = process.env.PERFUME_TAB ?? 'Perfumes';
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const all = res.data.values ?? [];
const headers = (all[0] ?? []).map((h) => String(h ?? '').trim().toLowerCase());
const idx = {};
headers.forEach((h, i) => { if (h) idx[h] = i; });

const col = (k) => idx[k] ?? -1;
const NAME = col('perfume name'), BRAND = col('brand'), SP = col('scent profile');
const TOP = col('top notes'), HEART = col('heart notes'), BASE = col('base notes');
const SEASON = col('season'), OCC = col('occasion'), GEN = col('gender'), INSP = col('inspired by');

const FAMILIES = [
  { key: 'Oud', re: /\boud\b|agarwood|agar wood|aoud|gaharu/i },
  { key: 'Rose', re: /\brose\b|gulab|taif/i },
  { key: 'Jasmine', re: /jasmine|sambac/i },
  { key: 'Floral', re: /floral|flower|tuberose|ylang|gardenia|magnolia|freesia|peony|iris|orris|lily|violet|lotus|narcissus|mimosa|heliotrope|blossom|bouquet|carnation|geranium|neroli/i },
  { key: 'Gourmand', re: /vanilla|vanille|tonka|praline|caramel|toffee|honey|chocolate|cocoa|coffee|marshmallow|sugar|cream|coconut|almond|pistachio|dessert/i },
  { key: 'Amber', re: /amber|ambergris|ambroxan|benzoin|labdanum|myrrh|incense|frankincense|resin|balsam|styrax/i },
  { key: 'Woody', re: /sandalwood|cedar|vetiver|patchouli|oakmoss|woods|wood|guaiac|cashmere wood|driftwood|pine|cypress|juniper/i },
  { key: 'Citrus', re: /bergamot|lemon|orange|mandarin|tangerine|grapefruit|neroli|lime|yuzu|citrus|petitgrain|blood orange/i },
  { key: 'Fruity', re: /apple|peach|pear|plum|berry|berries|raspberry|strawberry|cherry|pineapple|melon|watermelon|mango|lychee|litchi|fig|date|grape|blackcurrant|currant|kiwi|pomegranate|apricot/i },
  { key: 'Musk', re: /\bmusk\b|musky|white musk/i },
  { key: 'Aquatic', re: /aquatic|marine|seaweed|calone|ozonic|water|ocean|salt/i },
  { key: 'Spicy', re: /pepper|peppercorn|cinnamon|cardamom|clove|saffron|ginger|nutmeg|cumin|anise|pimento|chili|cayenne/i },
  { key: 'Tobacco', re: /tobacco|leather|suede/i },
  { key: 'Green', re: /green|galbanum|leaf|tea|mint|basil|rosemary|sage|thyme|grass|herbal|aromatic/i },
];

function score(texts) {
  const scores = new Map();
  const bump = (key, w) => scores.set(key, (scores.get(key) ?? 0) + w);
  for (const f of FAMILIES) {
    const re = new RegExp(f.re.source, 'gi');
    texts.forEach((t, i) => {
      if (!t) return;
      const weight = [1, 2, 2][i] ?? 1; // top, heart, base
      const n = (t.match(re) || []).length;
      if (n > 0) bump(f.key, n * weight);
    });
  }
  return scores;
}

// Canonical lead order so output reads like industry families
const LEAD = ['Oud', 'Amber', 'Woody', 'Floral', 'Fruity', 'Gourmand', 'Citrus', 'Aquatic', 'Spicy', 'Tobacco', 'Green', 'Musk', 'Rose', 'Jasmine'];

function derive(top, heart, base, inspired, name) {
  const texts = [top, heart, base, inspired, name];
  let scores = score(texts);
  if (scores.size === 0) return null;
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || LEAD.indexOf(a[0]) - LEAD.indexOf(b[0]));
  const picked = ranked.slice(0, 2).map(([k]) => k);
  // Rose/Jasmine are Floral facets — collapse to Floral unless they are the only signal
  const collapsed = picked.map((k) => (k === 'Rose' || k === 'Jasmine' ? 'Floral' : k));
  const unique = [...new Set(collapsed)];
  unique.sort((a, b) => LEAD.indexOf(a) - LEAD.indexOf(b));
  const label = unique.join(' ');
  if (label === 'Floral') {
    return ranked.some(([k]) => k === 'Jasmine') ? 'Floral Musk' : 'Floral';
  }
  return label;
}

const rows = [];
for (let r = 1; r < all.length; r++) {
  const row = all[r];
  const name = String(row[NAME] ?? '').trim();
  const brand = String(row[BRAND] ?? '').trim();
  if (!name || !brand) continue;
  const missingAll = [INSP, TOP, HEART, BASE, SEASON, OCC, GEN, SP].every((c) => c >= 0 && !String(row[c] ?? '').trim());
  const onlySp = SP >= 0 && !String(row[SP] ?? '').trim() &&
    [INSP, TOP, HEART, BASE, SEASON, OCC, GEN].every((c) => c < 0 || String(row[c] ?? '').trim());
  if (!onlySp) continue;
  const profile = derive(
    String(row[TOP] ?? ''), String(row[HEART] ?? ''), String(row[BASE] ?? ''),
    String(row[INSP] ?? ''), name,
  );
  if (!profile) continue;
  rows.push({ sheetRow: r + 1, brand, name, profile });
}

console.log(`Derivable single-gap rows: ${rows.length}`);
console.log('\nSample (first 20):');
for (const x of rows.slice(0, 20)) console.log(`${x.sheetRow}\t${x.brand} | ${x.name} -> ${x.profile}`);

writeFileSync(join(process.cwd(), 'data', 'derived-scent-profiles.json'), JSON.stringify(rows, null, 2));

if (!DRY) {
  const updates = rows.map((x) => ({
    range: `'${TAB.replace(/'/g, "''")}'!${String.fromCharCode(65 + SP)}${x.sheetRow}`,
    values: [[x.profile]],
  }));
  // chunk to avoid huge single request
  for (let i = 0; i < updates.length; i += 200) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates.slice(i, i + 200) },
    });
  }
  console.log(`\n>>> Wrote ${updates.length} scent profiles.`);
} else {
  console.log('\n(dry run, nothing written)');
}
