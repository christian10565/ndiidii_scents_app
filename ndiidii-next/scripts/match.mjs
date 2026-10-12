// Matches every sheet perfume row to a Zaoud product (for its image) and writes:
//   data/match-map.json     — slug-less: { sheetName, sheetBrand, matched: {title, vendor, imageUrl, score} | null }
//   data/match-report.txt   — human-readable: matched / unmatched / low-confidence
//
// Runs entirely offline against the cached Zaoud catalog — no Cloudinary, no
// sheet writes. Pure dry-run output to review before any upload happens.
//
//   node scripts/match.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';
import { google } from 'googleapis';
import { normaliseName, normaliseBrand, similarity } from './lib/normalise.mjs';

config();

const CONFIDENT = 0.85; // auto-accept at/above this
const LOOSE = 0.6;      // still report these as "review" candidates

// ---- load Zaoud catalog (cached) ----
const zaoud = JSON.parse(await readFile(join(process.cwd(), 'data', 'zaoud-products.json'), 'utf8'));
// Index by brand → list of {nameKey, product}. Brand-scoped so we never cross houses.
const byBrand = new Map();
for (const p of zaoud) {
  const b = normaliseBrand(p.vendor);
  if (!byBrand.has(b)) byBrand.set(b, []);
  byBrand.get(b).push({ nameKey: normaliseName(p.title), product: p });
}
console.log(`Zaoud catalog: ${zaoud.length} products across ${byBrand.size} brands`);

// ---- load sheet ----
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Perfumes' });
const rows = res.data.values ?? [];
const headers = rows[0].map((h) => String(h ?? '').trim());
const iName = headers.findIndex((h) => /name/i.test(h) && !/oil/i.test(h));
const iBrand = headers.findIndex((h) => /brand/i.test(h));

const sheetRows = [];
for (const r of rows.slice(1)) {
  const name = String(r[iName] ?? '').trim();
  if (!name) continue;
  sheetRows.push({ name, brand: String(r[iBrand] ?? '').trim() });
}
console.log(`Sheet rows: ${sheetRows.length}`);

// ---- match ----
function bestMatch(name, brand) {
  const b = normaliseBrand(brand);
  const candidates = byBrand.get(b) ?? [];
  const nk = normaliseName(name);
  let best = { score: 0, product: null };
  for (const c of candidates) {
    const s = similarity(nk, c.nameKey);
    if (s > best.score) best = { score: s, product: c.product };
  }
  // Brand not in Zaoud at all → try any brand (last resort, still reported with brand mismatch)
  if (!best.product) {
    for (const [zb, list] of byBrand) {
      for (const c of list) {
        const s = similarity(nk, c.nameKey) * 0.9; // penalise cross-brand
        if (s > best.score) best = { score: s, product: c.product };
      }
    }
  }
  return best;
}

const results = [];
const report = { confident: [], review: [], unmatched: [] };
for (const row of sheetRows) {
  const { score, product } = bestMatch(row.name, row.brand);
  const entry = {
    sheetName: row.name,
    sheetBrand: row.brand,
    matched: product
      ? {
          zaoudTitle: product.title,
          zaoudVendor: product.vendor,
          imageUrl: (product.images || [])[0]?.src ?? null,
          score: Number(score.toFixed(3)),
        }
      : null,
  };
  results.push(entry);
  if (!product || score < LOOSE) report.unmatched.push(entry);
  else if (score < CONFIDENT) report.review.push(entry);
  else report.confident.push(entry);
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
for (const e of report.review) lines.push(`  [${e.sheetBrand}] ${e.sheetName}  →  [${e.matched.zaoudVendor}] ${e.matched.zaoudTitle}  (${e.matched.score})`);
lines.push('');
lines.push(`===== UNMATCHED (${report.unmatched.length}) =====`);
for (const e of report.unmatched) lines.push(`  [${e.sheetBrand}] ${e.sheetName}`);
await writeFile(join(process.cwd(), 'data', 'match-report.txt'), lines.join('\n'));

console.log(`\nconfident: ${report.confident.length} | review: ${report.review.length} | unmatched: ${report.unmatched.length}`);
console.log('wrote data/match-map.json + data/match-report.txt');
