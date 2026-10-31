// Scrapes/parses supplier product images into the same shape as shopify-*.json.
//
// Sources:
//   - ScentPercent shop page (Wix)
//   - FilledWithBarakah home page (Shopify)
//   - Jomashop fragrances page (non-Shopify)
//   - shop.sa-usa.com products.json (Shopify)
//   - us.swissarabian.com products.json (Shopify)
//   - intenseoud.com products.json (Shopify)
//   - us.arabianoud.com product pages (Salla)
//   - oudworlds.com shop page (WooCommerce)
//
// Output: data/supplier-scrape.json
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = join(process.cwd(), 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const CACHE = 'C:\\Users\\Cicada\\AppData\\Local\\hermes\\cache\\web';

function readCached(name) {
  const p = join(CACHE, name);
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf8');
}

function cleanUrl(u) {
  return String(u ?? '')
    .replace(/[?&]width=\d+(&height=\d+)?/g, '')
    .replace(/[?&]height=\d+/g, '')
    .replace(/\?v=\d+$/, '')
    .replace(/\?$/, '');
}

function titleFromUrl(url) {
  try {
    return decodeURIComponent(url.split('/').pop().replace(/[-_]+/g, ' ').trim());
  } catch {
    return '';
  }
}

// ---- Shopify products.json helpers ----
async function fetchShopifyProductsJson(host) {
  const urls = [
    `https://${host}/products.json?limit=250`,
    `https://${host}/collections/all/products.json?limit=250`,
  ];
  const headers = { 'User-Agent': UA, Accept: 'application/json' };
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      const products = data?.products || [];
      if (products.length) {
        const entries = [];
        for (const p of products) {
          const img = (p.images && p.images[0] && p.images[0].src) || '';
          if (!img) continue;
          const title = (p.title || '').replace(/\s+/g, ' ').trim();
          const handle = p.handle || '';
          entries.push({
            vendor: host.replace(/^www\./, '').split('.')[0].toUpperCase(),
            title,
            imageUrl: img,
            source: host,
            url: `https://${host}/products/${handle}`,
          });
        }
        return entries;
      }
    } catch (e) {
      // continue to next URL
    }
  }
  return [];
}

// ---- ScentPercent (Wix) ----
const SP = readCached('www.scentpercent.com-5b058e0e0d.md') || `- [![](https://static.wixstatic.com/media/d86fc0_db79c7c617b545db8b237c9e86359ad5~mv2.jpg/v1/fill/w_186,h_186,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/d86fc0_db79c7c617b545db8b237c9e86359ad5~mv2.jpg)](https://www.scentpercent.com/product-page/arabiyat-prestige-marwa-extrit-de-perfum-60ml)

[ARABIYAT PRESTIGE MARWA EXTRAIT DE PARFUM 60ML\\\\\n\\\\\n* * *\\\\\n\\\\\nRegular PriceAED 224.00Sale Price\\\\\nAED 168.00\\\\\n\\\\\nAED176.40Tax including](https://www.scentpercent.com/product-page/arabiyat-prestige-marwa-extrit-de-perfum-60ml)

- [![](https://static.wixstatic.com/media/d86fc0_a49303b46f984ef799b7e880de78f87c~mv2.jpg/v1/fill/w_186,h_186,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/d86fc0_a49303b46f984ef799b7e880de78f87c~mv2.jpg)](https://www.scentpercent.com/product-page/rasasi-hawas-ice-freeze-eau-de-parfum-100ml)

[RASASI HAWAS ICE FREEZE EAU DE PARFUM 100ML\\\\\n\\\\\n* * *\\\\\n\\\\\nRegular PriceAED 133.00Sale Price\\\\\nAED 99.75\\\\\n\\\\\nAED104.74Tax including](https://www.scentpercent.com/product-page/rasasi-hawas-ice-freeze-eau-de-parfum-100ml)

- [![](https://static.wixstatic.com/media/d86fc0_ea42207717e54139b165d2b8d06a0c50~mv2.jpg/v1/fill/w_186,h_186,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/d86fc0_ea42207717e54139b165d2b8d06a0c50~mv2.jpg)](https://www.scentpercent.com/product-page/rayhaan-nava-sol-eau-de-parfum-100ml)

[RAYHAAN NAVA SOL EAU DE PARFUM 100ML\\\\\n\\\\\n* * *\\\\\n\\\\\nRegular PriceAED 98.00Sale Price\\\\\nAED 73.50\\\\\n\\\\\nAED77.17Tax including](https://www.scentpercent.com/product-page/rayhaan-nava-sol-eau-de-parfum-100ml)

Load More`;

function parseScentPercent(text) {
  const entries = [];
  const seen = new Set();
  const re = /- \[!\[\]\((https:\/\/static\.wixstatic\.com\/media\/[^)]+)\)\]\((https:\/\/www\.scentpercent\.com\/product-page\/[^)]+)\)\s*\r?\n\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text))) {
    const img = cleanUrl(m[1]);
    let title = m[3].replace(/\\\\/g, '').replace(/\s+/g, ' ').trim();
    if (!title) title = titleFromUrl(m[2]);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'ScentPercent', title, imageUrl: img, source: 'scentpercent', url: m[2] });
  }
  return entries;
}

// ---- Jomashop ----
const JOMASHOP = readCached('www.jomashop.com-5b058e0e0d.md');
function parseJomashop(text) {
  const entries = [];
  const seen = new Set();
  const re = /- \[!\[([^\]]+)\]\((https:\/\/cdn2\.jomashop\.com\/media\/catalog\/product\/cache\/[^?]+\?[^)]+)\)[\s\S]*?\]\((https:\/\/www\.jomashop\.com\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const title = m[1].replace(/\s+/g, ' ').trim();
    const img = cleanUrl(m[2]);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'Jomashop', title, imageUrl: img, source: 'jomashop', url: m[3] });
  }
  return entries;
}

// ---- FilledWithBarakah ----
const FILLED = readCached('filledwithbarakah.com-e234e8c3f2.md');
function parseFilledWithBarakah(text) {
  const entries = [];
  const seen = new Set();
  const re = /- \[([^\]]+)\]\((https:\/\/filledwithbarakah\.com\/products\/[^\)]+)\)\s*\r?\n\s*\r?\n\s*\!\[[^\]]*\]\((https:\/\/filledwithbarakah\.com\/cdn\/[^?]+\?v=\d+)\)\s*\r?\n\s*\r?\n\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const title = m[1].replace(/\s+/g, ' ').trim();
    const img = cleanUrl(m[2]);
    const url = m[3].trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'FilledWithBarakah', title, imageUrl: img, source: 'filledwithbarakah', url });
  }
  if (entries.length === 0) {
    const imgRe = /https:\/\/filledwithbarakah\.com\/cdn\/shop\/files\/[^"'\s]+\?v=\d+/g;
    const imgs = text.match(imgRe) || [];
    const seenImg = new Set();
    for (const raw of imgs) {
      const normalized = cleanUrl(raw);
      if (seenImg.has(normalized)) continue;
      seenImg.add(normalized);
      entries.push({ vendor: 'FilledWithBarakah', title: '', imageUrl: normalized, source: 'filledwithbarakah' });
    }
  }
  return entries;
}

// ---- Arabian Oud (Salla) ----
const ARABIAN = readCached('us.arabianoud.com-5b058e0e0d.md');
function parseArabianOud(text) {
  const entries = [];
  const seen = new Set();
  const re = /!\[[^\]]*\]\((https:\/\/cdn\.salla\.sa\/[^)]+)\)[^\[]*\[([^\]]+)\]\((https:\/\/us\.arabianoud\.com\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const img = cleanUrl(m[1]);
    const title = m[2].replace(/\s+/g, ' ').trim();
    const url = m[3];
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'ArabianOud', title, imageUrl: img, source: 'arabianoud', url });
  }
  return entries;
}

// ---- AlRehab (WooCommerce) ----
const ALREHAB = readCached('www.alrehab.com-74ab46f0c6.md');
function parseAlRehab(text) {
  const entries = [];
  const seen = new Set();
  const re = /- \[!\[[^\]]*\]\((https:\/\/alrehab\.com\/wp-content\/uploads\/[^)]+)\)!\[[^\]]*\]\([^)]*\)\]\((https:\/\/www\.alrehab\.com\/product\/[^)]+)\)[\s\S]*?\[\*\*([^\]]+)\*\*\]/g;
  let m;
  while ((m = re.exec(text))) {
    const img = cleanUrl(m[1]);
    const title = m[3].replace(/\s+/g, ' ').trim();
    const url = m[2];
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'AlRehab', title, imageUrl: img, source: 'alrehab', url });
  }
  return entries;
}

// ---- AlSunnah Corner (Shopify collection pages) ----
const ALSUNNAH = readCached('alsunnahcorner.com-f88e8daa10.md');
function parseAlSunnah(text) {
  const entries = [];
  const seen = new Set();
  const imgRe = /!\[[^\]]*\]\((https:\/\/alsunnahcorner\.com\/cdn\/shop\/files\/[^)]+)\)/g;
  const titleRe = /### \[([^\]]+)\]\((https:\/\/alsunnahcorner\.com\/products\/[^)]+)\)/g;
  const imgs = [];
  let m;
  while ((m = imgRe.exec(text))) imgs.push({ url: cleanUrl(m[1]), pos: m.index });
  const titles = [];
  while ((m = titleRe.exec(text))) titles.push({ title: m[1].replace(/\s+/g, ' ').trim(), url: m[2], pos: m.index });
  for (const t of titles) {
    if (seen.has(t.title)) continue;
    const img = imgs.find((i) => i.pos < t.pos && !i.used);
    if (!img) continue;
    img.used = true;
    seen.add(t.title);
    entries.push({ vendor: 'AlSunnah', title: t.title, imageUrl: img.url, source: 'alsunnah', url: t.url });
  }
  return entries;
}

// ---- Oud Worlds (WooCommerce) ----
const OUDWORLDS = readCached('oudworlds.com-b8cf9ebb0a.md');
function parseOudWorlds(text) {
  const entries = [];
  const seen = new Set();
  const re = /!\[[^\]]*\]\((https:\/\/oudworlds\.com\/wp-content\/uploads\/[^)]+)\)\s*\)\s*\n\s*\n\s*###\s*\[([^\]]+)\]\((https:\/\/oudworlds\.com\/product\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const img = cleanUrl(m[1]);
    const title = m[2].replace(/\s+/g, ' ').trim();
    const url = m[3];
    if (!title || seen.has(title)) continue;
    seen.add(title);
    entries.push({ vendor: 'OudWorlds', title, imageUrl: img, source: 'oudworlds', url });
  }
  return entries;
}

// ---- Shopify bulk fetchers ----
async function fetchAllShopify() {
  const hosts = [
    'shop.sa-usa.com',
    'us.swissarabian.com',
    'intenseoud.com',
  ];
  const out = {};
  for (const host of hosts) {
    out[host] = await fetchShopifyProductsJson(host);
  }
  return out;
}

async function main() {
  const shopify = await fetchAllShopify();
  const out = {
    generatedAt: new Date().toISOString(),
    sources: {
      scentpercent: parseScentPercent(SP),
      jomashop: JOMASHOP ? parseJomashop(JOMASHOP) : [],
      filledwithbarakah: FILLED ? parseFilledWithBarakah(FILLED) : [],
      'us.arabianoud.com': parseArabianOud(ARABIAN),
      alrehab: ALREHAB ? parseAlRehab(ALREHAB) : [],
      alsunnah: ALSUNNAH ? parseAlSunnah(ALSUNNAH) : [],
      oudworlds: parseOudWorlds(OUDWORLDS),
      ...Object.fromEntries(Object.entries(shopify).map(([k, v]) => [k, v])),
    },
  };
  const counts = {};
  for (const [k, v] of Object.entries(out.sources)) counts[k] = v.length;
  writeFileSync(join(DATA, 'supplier-scrape.json'), JSON.stringify(out, null, 2));
  console.log('counts:', JSON.stringify(counts, null, 2));
  console.log('wrote data/supplier-scrape.json');
}

main();
