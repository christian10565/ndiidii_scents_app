// Matches every sheet perfume row to a Zaoud product (for its image) and writes:
//   data/match-map.json     — slug-less: { sheetName, sheetBrand, matched: {title, vendor, imageUrl, score} | null }
//   data/match-report.txt   — human-readable: matched / unmatched / low-confidence
//
// Runs entirely offline against the cached Zaoud catalog — no Cloudinary, no
// sheet writes. Pure dry-run output to review before any upload happens.
//
//   node scripts/match.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { config } from 'dotenv';
import { google } from 'googleapis';
import { normaliseName, normaliseBrand, similarity, dropTrailingBrand } from './lib/normalise.mjs';

config();

const CONFIDENT = 0.85; // auto-accept at/above this
const LOOSE = 0.6;      // still report these as "review" candidates

// ---- load supplier catalogs (all cached sources in data/) ----
// Each entry: { vendor, title, imageUrl, source }. Zaoud's file uses the raw
// Shopify shape (product.images[0].src); the generic fetcher normalizes already.
const dataDir = join(process.cwd(), 'data');
const sourceFiles = (await readdir(dataDir))
  .filter((f) => f === 'zaoud-products.json' || f.startsWith('shopify-'))
  .filter((f) => f.endsWith('.json'));

const pool = [];
for (const f of sourceFiles) {
  const raw = JSON.parse(await readFile(join(dataDir, f), 'utf8'));
  const source = f === 'zaoud-products.json' ? 'zaoud' : f.replace(/^shopify-|\.json$/g, '');
  for (const p of raw) {
    const imageUrl = p.imageUrl ?? (p.images && p.images[0] && p.images[0].src) ?? null;
    if (!imageUrl) continue;
    pool.push({ vendor: p.vendor || '', title: p.title || '', imageUrl, source });
  }
  console.log(`loaded ${raw.length} from ${f}`);
}

// ---- optional supplier scrape supplement ----
const scrapePath = join(dataDir, 'supplier-scrape.json');
if (existsSync(scrapePath)) {
  const scrape = JSON.parse(await readFile(scrapePath, 'utf8'));
  const sources = scrape.sources || {};
  let added = 0;
  for (const [key, items] of Object.entries(sources)) {
    if (!Array.isArray(items)) continue;
    for (const p of items) {
      if (!p.imageUrl) continue;
      pool.push({ vendor: p.vendor || key, title: p.title || '', imageUrl: p.imageUrl, source: p.source || key });
      added++;
    }
  }
  console.log(`loaded ${added} entries from supplier-scrape.json`);
}

const scrapeShopifyPath = join(dataDir, 'supplier-scrape-shopify.json');
if (existsSync(scrapeShopifyPath)) {
  const scrape = JSON.parse(await readFile(scrapeShopifyPath, 'utf8'));
  const sources = scrape.sources || {};
  let added = 0;
  for (const [key, items] of Object.entries(sources)) {
    if (!Array.isArray(items)) continue;
    for (const p of items) {
      if (!p.imageUrl) continue;
      pool.push({ vendor: p.vendor || key, title: p.title || '', imageUrl: p.imageUrl, source: p.source || key });
      added++;
    }
  }
  console.log(`loaded ${added} entries from supplier-scrape-shopify.json`);
}

// Index by brand → list of {nameKey, entry}. Brand-scoped so we never cross houses.
const byBrand = new Map();
for (const p of pool) {
  const b = normaliseBrand(p.vendor);
  if (!b) continue;
  // Strip a trailing brand token from the title (vendors append their own name).
  const nameKey = dropTrailingBrand(normaliseName(p.title), b);
  if (!byBrand.has(b)) byBrand.set(b, []);
  byBrand.get(b).push({ nameKey, entry: p });
}
console.log(`Total pool: ${pool.length} products across ${byBrand.size} brands`);

// ---- load sheet ----
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function loadTab(range, nameCol, brandCol) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range });
  const rows = res.data.values ?? [];
  const headers = rows[0].map((h) => String(h ?? '').trim());
  const iName = headers.findIndex((h) => /name/i.test(h));
  const iBrand = headers.findIndex((h) => /brand/i.test(h));
  const out = [];
  for (const r of rows.slice(1)) {
    const name = String(r[iName] ?? '').trim();
    if (!name) continue;
    out.push({ name, brand: String(r[iBrand] ?? '').trim(), tab: range });
  }
  return out;
}

const perfumes = await loadTab('Perfumes', 'Perfume Name', 'Brand');
const oils = await loadTab('Perfume oils', 'Perfume Oil Name', 'Brand ');
const sheetRows = [...perfumes, ...oils];
console.log(`Sheet rows: ${sheetRows.length} (${perfumes.length} perfumes + ${oils.length} oils)`);

// ---- match ----
function bestMatch(name, brand) {
  const b = normaliseBrand(brand);
  const candidates = byBrand.get(b) ?? [];
  const nk = normaliseName(name);
  let best = { score: 0, entry: null };
  for (const c of candidates) {
    const s = similarity(nk, c.nameKey);
    if (s > best.score) best = { score: s, entry: c.entry };
  }
  // Brand not in the pool at all → try any brand (last resort, penalised)
  if (!best.entry) {
    for (const [zb, list] of byBrand) {
      for (const c of list) {
        const s = similarity(nk, c.nameKey) * 0.9; // penalise cross-brand
        if (s > best.score) best = { score: s, entry: c.entry };
      }
    }
  }
  return best;
}

const results = [];
const report = { confident: [], review: [], unmatched: [] };
for (const row of sheetRows) {
  const { score, entry } = bestMatch(row.name, row.brand);
  const out = {
    sheetName: row.name,
    sheetBrand: row.brand,
    matched: entry
      ? {
          title: entry.title,
          vendor: entry.vendor,
          imageUrl: entry.imageUrl,
          source: entry.source,
          score: Number(score.toFixed(3)),
        }
      : null,
  };
  results.push(out);
  if (!entry || score < LOOSE) report.unmatched.push(out);
  else if (score < CONFIDENT) report.review.push(out);
  else report.confident.push(out);
}

// ---- write outputs ----
await mkdir(join(process.cwd(), 'data'), { recursive: true });
await writeFile(join(process.cwd(), 'data', 'match-map.json'), JSON.stringify(results, null, 0));

const lines = [];
lines.push(`MATCH SUMMARY`);
lines.push(`  confident (≥${CONFIDENT}): ${report.confident.length}`);
lines.push(`  review (${LOOSE}–${CONFIDENT}): ${report.review.length}`);
lines.push(`  unmatched (<${LOOSE} or no candidate): ${report.unmatched.length}`);
lines.push(`  total: ${results.length}`);
lines.push('');
lines.push(`===== REVIEW THESE (${report.review.length}) =====`);
for (const e of report.review) lines.push(`  [${e.sheetBrand}] ${e.sheetName}  →  [${e.matched.vendor}] ${e.matched.title}  (${e.matched.score}, ${e.matched.source})`);
lines.push('');
lines.push(`===== UNMATCHED (${report.unmatched.length}) =====`);
for (const e of report.unmatched) lines.push(`  [${e.sheetBrand}] ${e.sheetName}`);
await writeFile(join(process.cwd(), 'data', 'match-report.txt'), lines.join('\n'));

console.log(`\nconfident: ${report.confident.length} | review: ${report.review.length} | unmatched: ${report.unmatched.length}`);
console.log('wrote data/match-map.json + data/match-report.txt');
