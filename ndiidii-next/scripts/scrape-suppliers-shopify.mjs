import { writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = join(process.cwd(), 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function cleanUrl(u) {
  return String(u ?? '').replace(/[?&]width=\d+(&height=\d+)?/g, '').replace(/\?v=\d+$/, '');
}

function titleFromUrl(url) {
  try {
    return decodeURIComponent(url.split('/').pop().replace(/[-_]+/g, ' ').trim());
  } catch {
    return '';
  }
}

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
            vendor: host.replace(/^www\./, '').includes('myshopify.com')
              ? host.replace(/^www\./, '').split('.')[0].toUpperCase()
              : 'OAPOR',
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

async function main() {
  // High-priority Shopify hosts from fragrance_websites.md
  // Covers missing perfume brands (Fragrance World, Arabiyat Prestige, Khadlaj, etc.)
  // and missing oil brands (Amouage, Creed, Tom Ford, Dior, etc.)
  const shopifyHosts = [
    // Arabian perfume brands (high perfume gap coverage)
    'freshitystore.myshopify.com',       // Fragrance World, Arabiyat Prestige, French Avenue, Gulf Orchid, Khadlaj, Afnan
    'kenfragrance.myshopify.com',         // Arabiyat Prestige, Khadlaj, French Avenue, Afnan, Paris Corner, Rayhaan
    'perfumesbooth.myshopify.com',        // Arabiyat Prestige
    'kaitlynnstore.myshopify.com',        // Arabiyat Prestige, Afnan
    'senditures.myshopify.com',           // Fragrance World, Arabiyat Prestige, Khadlaj, Afnan, Armaf
    'perfuzone-2.myshopify.com',          // French Avenue, Rayhaan, Khadlaj
    'raihaparfums.myshopify.com',         // French Avenue, Khadlaj, Rayhaan, Armaf
    'thefragrancetree.myshopify.com',     // Paris Corner, Afnan, Maison Alhambra, French Avenue
    'ofra-store.myshopify.com',           // Fragrance World, Maison Alhambra
    // Luxury/niche perfume oils (high oil gap coverage)
    'irresistibleperfumes.myshopify.com', // Amouage, Creed, Tom Ford, Dior, MFK, YSL, Armani, Guerlain, Byredo
    'gioiaperfume.myshopify.com',         // Amouage, Maison Crivelli, Xerjoff, Initio, Louis Vuitton, Nishane
    'perfumara-oficial.myshopify.com',    // Memo Paris, Nishane, Maison Crivelli, Xerjoff, Tom Ford, YSL
    'eu.oapor.com',                       // OAPOR perfume oils inspired by Creed, Tom Ford, Byredo, MFK, YSL, Chanel, etc.
    // Additional broad coverage
    'perfumeo.co.uk',                     // Fragrance World, Maison Alhambra, French Avenue, Khadlaj, Arabiyat Prestige, Afnan, Asdaaf, Swiss Arabian
    'soghaat.co.uk',                      // Fragrance World, French Avenue, Gulf Orchid, Khadlaj, Maison Alhambra, My Perfumes, Arabiyat Prestige, Afnan, Asdaaf
  ];

  const sources = {};
  let totalEntries = 0;
  for (const host of shopifyHosts) {
    try {
      const entries = await fetchShopifyProductsJson(host);
      sources[host] = entries;
      totalEntries += entries.length;
      console.log(`${host}: ${entries.length} products`);
    } catch (e) {
      sources[host] = [];
      console.warn(`${host}: failed - ${e.message}`);
    }
  }

  await writeFile(join(DATA, 'supplier-scrape-shopify.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sources }, null, 2));
  console.log(`\nWrote data/supplier-scrape-shopify.json (${totalEntries} total entries from ${shopifyHosts.length} hosts)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
