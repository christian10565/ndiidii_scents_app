// Fetches Zaoud's entire product catalog via the Shopify products.json endpoint
// and caches it to data/zaoud-products.json. Run once; the matcher reads the
// cache so we don't re-hit their server (and risk Cloudflare throttling) on
// every run. Re-run when their catalog changes materially.
//
//   node scripts/fetch-zaoud.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://zaoud.it/products.json';
const OUT = join(process.cwd(), 'data', 'zaoud-products.json');
const PAGE = 250;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function getPage(page) {
  const url = `${BASE}?limit=${PAGE}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  const data = await res.json();
  return data.products ?? [];
}

const all = [];
let page = 1;
for (;;) {
  const products = await getPage(page);
  if (products.length === 0) break;
  all.push(...products);
  console.log(`page ${page}: +${products.length} (total ${all.length})`);
  if (products.length < PAGE) break; // last page
  page++;
  await new Promise((r) => setTimeout(r, 400)); // be polite
}

await mkdir(join(process.cwd(), 'data'), { recursive: true });
await writeFile(OUT, JSON.stringify(all, null, 0));
console.log(`\nSaved ${all.length} products → ${OUT}`);

// Quick shape summary so we know what we're working with.
const vendors = new Set(all.map((p) => p.vendor));
const withImages = all.filter((p) => (p.images || []).length > 0).length;
console.log(`distinct vendors: ${vendors.size}`);
console.log(`products with ≥1 image: ${withImages}/${all.length}`);
