#!/usr/bin/env node
/**
 * Discovery-set generator — deterministic.
 *
 * Builds curated discovery sets from the catalog, following the three grouping
 * rules Fragrance Viking uses (observed on fragranceviking.co.uk):
 *
 *   1. NOTE/THEME sets  — perfumes sharing a note family, spread across houses
 *                         (their "Mad About Vanilla", homepage "Citrus / Sweet /
 *                         Woods & Incense / Floral" edits).
 *   2. DNA/FLANKER sets — same house cloning the same original (`brand` +
 *                         `inspiredBy`), e.g. their "Lattafa Khamrah Sample Set".
 *   3. VIBE/OCCASION sets — a mood, cross-house (their "Masculine Daily Bundle").
 *
 * Constraints (client): 4 decants per set, each perfume at most TWICE across all
 * sets, most exactly once.
 *
 * Runs off data/catalog-snapshot.json (the committed fallback) so it is
 * reproducible without a live sheet read. Dry by default; `--write` also emits
 * data/discovery-sets-generated.json.
 *
 *   node scripts/generate-discovery-sets.mjs            # report only
 *   node scripts/generate-discovery-sets.mjs --write    # also write JSON
 *   node scripts/generate-discovery-sets.mjs --seed 7   # reproducible shuffle
 *
 * NOTE: the canonical note list below mirrors src/lib/notes.ts — keep in sync.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SNAPSHOT = join(ROOT, 'data', 'catalog-snapshot.json');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const seedArg = args.find((a) => a.startsWith('--seed'));
const SEED = seedArg ? Number(seedArg.split('=')[1]) : 1;

/* ------------------------------------------------------------------ *
 * Deterministic PRNG (mulberry32) so `--seed` reproduces the same sets.
 * ------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/* ------------------------------------------------------------------ *
 * Note canonicalisation — mirrors src/lib/notes.ts.
 * ------------------------------------------------------------------ */
const CANONICAL = [
  'Agarwood', 'Aldehyde', 'Almond', 'Amber', 'Ambergris', 'Ambroxan', 'Anise', 'Apple',
  'Apricot', 'Aquatic Notes', 'Basil', 'Bay Leaf', 'Beeswax', 'Benzoin', 'Bergamot', 'Birch',
  'Black Currant', 'Black Pepper', 'Blackberry', 'Cacao', 'Cannabis', 'Caramel', 'Cardamom',
  'Cashmere Wood', 'Cedar', 'Cherry', 'Chocolate', 'Cinnamon', 'Citrus', 'Clove', 'Coconut',
  'Coffee', 'Coriander', 'Coumarin', 'Cypress', 'Davana', 'Fig', 'Freesia', 'Fruity Notes',
  'Galbanum', 'Gardenia', 'Geranium', 'Ginger', 'Grape', 'Grapefruit', 'Guaiac Wood',
  'Heliotrope', 'Honey', 'Immortelle', 'Incense', 'Iris', 'Jasmine', 'Lavender', 'Leather',
  'Lemon', 'Licorice', 'Lily Of The Valley', 'Lime', 'Litchi', 'Magnolia', 'Mandarin', 'Mango',
  'Marshmallow', 'Melon', 'Milk', 'Mint', 'Moss', 'Musk', 'Myrrh', 'Neroli', 'Nutmeg',
  'Oakmoss', 'Olibanum', 'Orange', 'Orange Blossom', 'Orris', 'Osmanthus', 'Oud', 'Patchouli',
  'Peach', 'Pear', 'Peony', 'Pepper', 'Pineapple', 'Pistachio', 'Plum', 'Praline', 'Raspberry',
  'Rhubarb', 'Rose', 'Rum', 'Saffron', 'Sage', 'Sandalwood', 'Sea Notes', 'Spicy Notes',
  'Strawberry', 'Tea', 'Tobacco', 'Tonka Bean', 'Tuberose', 'Vanilla', 'Vetiver', 'Violet',
  'Watermelon', 'Whiskey', 'Woody Notes', 'Ylang-Ylang', 'Yuzu',
];
const CANON_BY_LOWER = new Map(CANONICAL.map((c) => [c.toLowerCase(), c]));
const CANON_LONGEST_FIRST = [...CANONICAL].sort((a, b) => b.length - a.length);
const NOISE = new Set(['notes', 'note', 'accords', 'accord']);
const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
function splitNotes(raw) {
  if (!raw) return [];
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/·|]|\band\b|\bwith\b|\bplus\b|\./gi)
    .map((part) => part.replace(/[^A-Za-z\u00C0-\u024F' -]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length >= 3 && part.length <= 40 && part.split(' ').length <= 4 && !NOISE.has(part.toLowerCase()))
    .map(titleCase);
}
function canonicalNote(fragment) {
  const low = fragment.toLowerCase();
  const exact = CANON_BY_LOWER.get(low);
  if (exact) return exact;
  for (const canon of CANON_LONGEST_FIRST) {
    if (new RegExp(`\\b${canon.toLowerCase().replace(/-/g, '[- ]')}\\b`).test(low)) return canon;
  }
  return null;
}
function notesFromParts(notes) {
  const seen = new Set();
  for (const raw of [notes?.top, notes?.heart, notes?.base]) {
    for (const f of splitNotes(raw)) {
      const c = canonicalNote(f);
      if (c) seen.add(c);
    }
  }
  return [...seen];
}

/* ------------------------------------------------------------------ *
 * Season + occasion canonicalisation (free text -> fixed tags).
 * ------------------------------------------------------------------ */
const SEASON_TAGS = {
  autumn: /autumn|\bfall\b/i,
  winter: /winter|\bcold\b|cool weather|cool season/i,
  spring: /spring/i,
  summer: /summer|\bwarm\b|hot weather/i,
  harmattan: /harmattan/i,
  rainy: /rainy|rain season|monsoon/i,
  all: /all[- ]season|year[- ]round|all season/i,
};
function seasonTags(season) {
  if (!season) return [];
  const out = [];
  for (const [tag, re] of Object.entries(SEASON_TAGS)) if (re.test(season)) out.push(tag);
  return out;
}

const VIBE_TAGS = {
  'date night': /date night|date|romantic|intimate|candlelit|dinner/i,
  evening: /evening|night|nightlife|nocturnal|after dark/i,
  office: /office|corporate|work|business|boardroom|interview|meeting/i,
  daily: /daily|everyday|casual|daytime|day wear|signature|errand/i,
  formal: /formal|gala|ceremony|event|special occasion|celebration|wedding|black tie/i,
  party: /party|clubbing|\bclub\b|festive/i,
  summer: /summer|sunny|beach|brunch|picnic|yacht|resort|vacation/i,
  winter: /winter|cold|cozy|holiday|christmas|festive season|fireplace/i,
  fresh: /fresh|clean|post-shower|gym|sport|active|energ/i,
};
function vibeTags(occasion) {
  if (!occasion) return [];
  const out = [];
  for (const [tag, re] of Object.entries(VIBE_TAGS)) if (re.test(occasion)) out.push(tag);
  return out;
}

/* ------------------------------------------------------------------ *
 * Note THEMES for family 1 (Fragrance Viking's Citrus / Sweet / Woods / Floral).
 * ------------------------------------------------------------------ */
const THEMES = [
  { name: 'Citrus & Fresh', notes: ['Citrus', 'Lemon', 'Bergamot', 'Orange', 'Mandarin', 'Grapefruit', 'Yuzu', 'Lime', 'Neroli', 'Orange Blossom', 'Aquatic Notes', 'Sea Notes', 'Mint', 'Watermelon', 'Melon', 'Basil'] },
  { name: 'Sweet & Gourmand', notes: ['Vanilla', 'Caramel', 'Honey', 'Praline', 'Marshmallow', 'Chocolate', 'Cacao', 'Tonka Bean', 'Almond', 'Milk', 'Coffee', 'Rum', 'Whiskey', 'Cherry', 'Strawberry', 'Raspberry', 'Pistachio', 'Coconut'] },
  { name: 'Woods & Incense', notes: ['Oud', 'Agarwood', 'Sandalwood', 'Cedar', 'Woody Notes', 'Incense', 'Vetiver', 'Guaiac Wood', 'Cashmere Wood', 'Cypress', 'Oakmoss', 'Birch'] },
  { name: 'Floral', notes: ['Rose', 'Jasmine', 'Iris', 'Tuberose', 'Violet', 'Gardenia', 'Peony', 'Freesia', 'Ylang-Ylang', 'Lily Of The Valley', 'Magnolia', 'Osmanthus', 'Geranium', 'Heliotrope', 'Orris'] },
  { name: 'Amber & Resin', notes: ['Amber', 'Ambergris', 'Benzoin', 'Myrrh', 'Olibanum', 'Beeswax', 'Ambroxan', 'Saffron'] },
  { name: 'Spicy & Warm', notes: ['Spicy Notes', 'Cardamom', 'Cinnamon', 'Clove', 'Nutmeg', 'Pepper', 'Black Pepper', 'Anise', 'Ginger', 'Coriander'] },
  { name: 'Leather & Tobacco', notes: ['Leather', 'Tobacco'] },
];

/* ------------------------------------------------------------------ *
 * Load + prepare the catalog.
 * ------------------------------------------------------------------ */
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const raw = snapshot.perfumes ?? [];

// Only perfumes that can sit in a decant set: tiered (sellable) and in stock.
const pool = raw
  .filter((p) => p.tier !== null && p.tier !== undefined && p.inStock !== false)
  .map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? 'Unknown',
    tier: p.tier,
    inspiredBy: (p.inspiredBy ?? '').toLowerCase().trim(),
    scentProfile: (p.scentProfile ?? '').toLowerCase().trim(),
    noteKeys: notesFromParts(p.notes),
    season: seasonTags(p.season),
    vibe: vibeTags(p.extra?.Occasion),
  }));

const bySlug = new Map(pool.map((p) => [p.slug, p]));

/* ------------------------------------------------------------------ *
 * Build candidate sets from the three families.
 * ------------------------------------------------------------------ */

// ---- Family 1: note/theme sets ----
function themeSets() {
  const sets = [];
  for (const theme of THEMES) {
    const members = pool.filter((p) => p.noteKeys.some((n) => theme.notes.includes(n)));
    // Score: how many of the theme's notes does this perfume hit.
    const scored = members
      .map((p) => ({ p, hits: p.noteKeys.filter((n) => theme.notes.includes(n)).length }))
      .sort((a, b) => b.hits - a.hits);
    // Greedily form 4-perfume sets, preferring brand diversity.
    let remaining = scored.map((s) => s.p);
    while (remaining.length >= 4) {
      const picked = [];
      const usedBrands = new Set();
      for (let pass = 0; pass < 4 && remaining.length; pass++) {
        const idx = remaining.findIndex((p) => !usedBrands.has(p.brand));
        const choose = idx >= 0 ? idx : 0;
        const p = remaining.splice(choose, 1)[0];
        picked.push(p);
        usedBrands.add(p.brand);
      }
      if (picked.length === 4) sets.push({ family: 'note', anchor: theme.name, members: picked });
    }
  }
  return sets;
}

// ---- Family 2: DNA / flanker sets (same house, same line root) ----
// "Khamrah Qahwa / Khamrah Dukhan / Khamrah Waha" share the root "Khamrah";
// "Club De Nuit Intense / Club De Nuit Sillage" share "Club Nuit". Stopwords are
// dropped so "Eau De Parfum", "Pour Homme", "Extrait" don't split a line.
const LINE_STOP = new Set(['eau', 'de', 'du', 'la', 'le', 'parfum', 'extrait', 'edp', 'edt', 'intense', 'pour', 'homme', 'femme', 'unisex', 'extract', 'absolu', 'elixir', 'the', 'of', 'and', 'noir', 'blanc', 'black', 'white', 'gold', 'silver', 'blue', 'no']);
function lineRoot(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !LINE_STOP.has(w))
    .slice(0, 1) // first significant word = the line name ("Khamrah", "Club", "9PM")
    .join(' ');
}
function dnaSets() {
  const groups = new Map();
  for (const p of pool) {
    const root = lineRoot(p.name);
    if (!root) continue;
    const key = `${p.brand.toLowerCase()}||${root}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const sets = [];
  for (const [, members] of groups) {
    if (members.length < 4) continue;
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
    sets.push({ family: 'dna', anchor: `${sorted[0].brand} — ${lineRoot(sorted[0].name)} line`, members: sorted.slice(0, 4) });
  }
  return sets;
}

// ---- Family 3: vibe / occasion sets ----
function vibeSets() {
  const sets = [];
  for (const tag of Object.keys(VIBE_TAGS)) {
    const members = shuffle(pool.filter((p) => p.vibe.includes(tag)));
    while (members.length >= 4) {
      const picked = [];
      const usedBrands = new Set();
      for (const p of [...members]) {
        if (picked.length === 4) break;
        if (usedBrands.has(p.brand)) continue;
        picked.push(p);
        usedBrands.add(p.brand);
      }
      if (picked.length < 4) break;
      for (const p of picked) members.splice(members.indexOf(p), 1);
      sets.push({ family: 'vibe', anchor: tag, members: picked });
    }
  }
  return sets;
}

/* ------------------------------------------------------------------ *
 * Cohesion score + greedy selection under the cap-of-2 constraint.
 * ------------------------------------------------------------------ */
function cohesion(set) {
  const shared = set.members.reduce((n, p) => n + p.noteKeys.length, 0);
  const brandCount = new Set(set.members.map((p) => p.brand)).size;
  return shared + brandCount * 2; // more notes + more distinct houses = better
}

const allCandidates = [...themeSets(), ...dnaSets(), ...vibeSets()].map((set) => ({
  ...set,
  score: cohesion(set),
}));

// Rarity: a perfume that appears in only a couple of candidate sets is "rare"
// and should be placed before a common one, otherwise phase 1 picks the
// highest-cohesion sets first, they overlap on the same popular perfumes, and a
// long tail of rare perfumes is left stranded for phase 2.
const degree = new Map();
for (const set of allCandidates) for (const p of set.members) degree.set(p.slug, (degree.get(p.slug) ?? 0) + 1);
const rarity = (set) => set.members.reduce((s, p) => s + (degree.get(p.slug) ?? 0), 0);

const candidates = allCandidates.sort((a, b) => rarity(a) - rarity(b) || b.score - a.score);

// Disjoint selection: each perfume lands in AT MOST ONE set. The client wants
// "most once", so phase 1 holds every perfume at exactly 1 appearance.
const usage = new Map();
const chosen = [];
for (const set of candidates) {
  if (set.members.some((p) => usage.has(p.slug))) continue;
  chosen.push(set);
  for (const p of set.members) usage.set(p.slug, 1);
}
let unused = pool.filter((p) => !usage.has(p.slug));

// Phase 2: cover the stragglers. Each added set prefers perfumes nobody has
// used yet and only allows a SECOND appearance when a set needs it — never a
// third — so "most once, a few twice" holds instead of "all twice".
const usage2 = new Map(usage);
const phase2 = [];
while (unused.length > 0) {
  let best = null;
  let bestScore = -1;
  for (const set of candidates) {
    if (chosen.includes(set) || phase2.includes(set)) continue;
    if (set.members.some((p) => (usage2.get(p.slug) ?? 0) >= 2)) continue;
    const fresh = set.members.filter((p) => !usage2.has(p.slug)).length;
    if (fresh === 0) continue;
    const score = fresh * 1000 + cohesion(set); // cover new perfumes first
    if (score > bestScore) {
      bestScore = score;
      best = set;
    }
  }
  if (!best) break;
  phase2.push(best);
  for (const p of best.members) usage2.set(p.slug, (usage2.get(p.slug) ?? 0) + 1);
  unused = pool.filter((p) => !usage2.has(p.slug));
}

const allSets = [...chosen, ...phase2];
const finalUsage = usage2;

/* ------------------------------------------------------------------ *
 * Report.
 * ------------------------------------------------------------------ */
const used = [...finalUsage.keys()];
const hist = { 0: pool.length - used.length, 1: 0, 2: 0 };
for (const [, n] of finalUsage) hist[n] = (hist[n] ?? 0) + 1;

const byFamily = allSets.reduce((m, s) => ((m[s.family] = (m[s.family] ?? 0) + 1), m), {});
const leftover = pool.filter((p) => !finalUsage.has(p.slug));

console.log('=== Discovery set generation (dry) ===');
console.log(`pool (sellable, in-stock): ${pool.length}`);
console.log(`candidate sets: ${candidates.length}  selected: ${allSets.length} (phase 1: ${chosen.length}, phase 2: ${phase2.length})`);
console.log(`families: ${JSON.stringify(byFamily)}`);
console.log(`coverage: ${used.length}/${pool.length} perfumes used (${((used.length / pool.length) * 100).toFixed(1)}%)`);
console.log(`usage histogram (appearances): ${JSON.stringify(hist)}`);
if (leftover.length) console.log(`uncovered: ${leftover.length} — ${leftover.map((p) => p.name).slice(0, 10).join(', ')}`);
console.log('');
console.log('Sample of generated sets:');
for (const s of allSets.slice(0, 20)) {
  console.log(`  [${s.family}] ${s.anchor}`);
  console.log(`      ${s.members.map((m) => `${m.name} (${m.brand})`).join(' · ')}`);
}
console.log('');

const output = {
  generatedAt: new Date().toISOString(),
  seed: SEED,
  pool: pool.length,
  sets: allSets.map((s) => ({
    family: s.family,
    name: s.anchor,
    perfumes: s.members.map((m) => ({ slug: m.slug, name: m.name, brand: m.brand })),
  })),
  stats: { total: allSets.length, families: byFamily, coverage: used.length, usage: hist },
};

if (WRITE) {
  const outPath = join(ROOT, 'data', 'discovery-sets-generated.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`wrote ${outPath}`);
}
