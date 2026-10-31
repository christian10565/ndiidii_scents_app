// Generic Shopify catalog fetcher. Pulls the full products.json (all pages),
// normalizes to {vendor, title, imageUrl}, and saves a compact cache file.
//
// Usage:
//   node scripts/fetch-shopify.mjs <label> <shopify-base-url>
//
// Example:
//   node scripts/fetch-shopify.mjs justmylook https://www.justmylook.com
//   node scripts/fetch-shopify.mjs emiratesoud https://emiratesoud.co.uk
//
// Writes data/shopify-<label>.json  (an array of {vendor,title,imageUrl})
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [label, base] = process.argv.slice(2);
if (!label || !base) {
  console.error('Usage: node scripts/fetch-shopify.mjs <label> <shopify-base-url>');
  process.exit(1);
}

const BASE = `${base.replace(/\/$/, '')}/products.json`;
const OUT = join(process.cwd(), 'data', `shopify-${label}.json`);
const PAGE = 250;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function getPage(page) {
  const url = `${BASE}?limit=${PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  const data = await res.json();
  return data.products ?? [];
}

// Normalize a Shopify product to the shape the matcher understands.
function toEntry(p) {
  const img = (p.images && p.images[0] && p.images[0].src) || null;
  return { vendor: p.vendor || '', title: p.title || '', imageUrl: img, source: label };
}

const all = [];
let page = 1;
for (;;) {
  const products = await getPage(page);
  if (products.length === 0) break;
  all.push(...products.map(toEntry));
  console.log(`page ${page}: +${products.length} (total ${all.length})`);
  if (products.length < PAGE) break;
  page++;
  await new Promise((r) => setTimeout(r, 400));
}

await mkdir(join(process.cwd(), 'data'), { recursive: true });
await writeFile(OUT, JSON.stringify(all));

const vendors = new Set(all.map((p) => p.vendor));
const withImages = all.filter((p) => p.imageUrl).length;
console.log(`\nSaved ${all.length} products → ${OUT}`);
console.log(`distinct vendors: ${vendors.size} | with image: ${withImages}/${all.length}`);
