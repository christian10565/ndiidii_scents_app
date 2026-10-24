import { readFileSync, writeFileSync } from 'node:fs';

const matchMap = JSON.parse(readFileSync('data/match-map.json', 'utf8'));
const uploadMap = JSON.parse(readFileSync('data/upload-map.json', 'utf8'));

// Bad product type keywords that indicate wrong match
const BAD_TYPES = new Set([
  'gel polish', 'nail polish', 'nail', 'body mist', 'body spray',
  'hair mist', 'hand cream', 'soap', 'shower gel', 'deodorant',
  'gift set', 'set of', 'collection', 'bundle', 'velvet pouch',
  'air freshener', 'car freshener', 'room spray', 'candle',
  'sample', 'decant', 'trial', 'travel'
]);

// Brand pairs that are clearly different houses
const CROSS_BRAND_BAD = new Set([
  ['zimaya', 'halo'],
  ['zimaya', 'mugler'],
  ['athoor al alam', 'mugler'],
  ['gulf orchid', 'jimmy choo'],
  ['heka', 'mugler'],
  ['heka', 'jimmy choo'],
  ['heka', 'yves saint laurent'],
  ['heka', 'aramis'],
  ['mahabub', 'arabiyat prestige'],
  ['mahabub', 'mugler'],
  ['oud khaleeji', 'armaf'],
  ['oud khaleeji', 'al haramain'],
  ['jc perfumes', 'sapil'],
  ['deora', 'emper'],
  ['noir paris', 'afnan'],
  ['flavia', 'riiffs'],
  ['le gazelle', 'dolce'],
  ['khalis', 'ghost'],
  ['maison des parfums', 'montblanc'],
  ['maison des parfums', 'maison alhambra'],
]);

function normaliseBrand(brand) {
  return String(brand || '').toLowerCase().trim();
}

function hasBadType(title) {
  const t = String(title || '').toLowerCase();
  for (const kw of BAD_TYPES) {
    if (t.includes(kw)) return true;
  }
  return false;
}

function isCrossBrandBad(sheetBrand, supplierVendor) {
  const sb = normaliseBrand(sheetBrand);
  const sv = normaliseBrand(supplierVendor);
  
  // Same brand is always ok
  if (sb === sv) return false;
  
  // Check known bad pairs
  for (const [a, b] of CROSS_BRAND_BAD) {
    if ((sb.includes(a) && sv.includes(b)) || (sb.includes(b) && sv.includes(a))) {
      return true;
    }
  }
  
  // If sheet brand is clearly a different house from supplier, reject
  // e.g. sheet says "Zimaya" and supplier says "Halo" - different houses
  const sheetWords = sb.split(' ').filter(Boolean);
  const vendorWords = sv.split(' ').filter(Boolean);
  
  // Check if any significant brand word overlaps
  const overlap = sheetWords.some(w => w.length > 2 && vendorWords.some(v => v.includes(w) || w.includes(v)));
  if (!overlap && sheetWords.length > 0 && vendorWords.length > 0) {
    // No overlap at all - likely different brands
    return true;
  }
  
  return false;
}

const approved = [];
const rejected = [];

for (const m of matchMap) {
  if (!m.matched || m.matched.score < 0.6 || m.matched.score >= 0.85) continue;
  
  const idx = matchMap.indexOf(m);
  const u = uploadMap[idx];
  if (u && u.cloudinaryUrl) continue; // already has URL
  
  const title = m.matched.title || '';
  const vendor = m.matched.vendor || '';
  
  // Reject bad product types
  if (hasBadType(title)) {
    rejected.push({ name: m.sheetName, reason: 'bad type', title });
    continue;
  }
  
  // Reject obvious cross-brand mismatches
  if (isCrossBrandBad(m.sheetBrand, vendor)) {
    rejected.push({ name: m.sheetName, reason: 'cross-brand', title, vendor });
    continue;
  }
  
  approved.push({
    idx,
    name: m.sheetName,
    brand: m.sheetBrand,
    score: m.matched.score,
    title,
    source: m.matched.source,
    imageUrl: m.matched.imageUrl,
  });
}

console.log(`Approved for upload: ${approved.length}`);
console.log(`Rejected: ${rejected.length}`);
console.log('\nRejected samples:');
rejected.slice(0, 15).forEach(r => console.log(`  [${r.reason}] ${r.name} → ${r.title} ${r.vendor ? '('+r.vendor+')' : ''}`));

// Write approved list for upload
writeFileSync('data/review-approved.json', JSON.stringify(approved, null, 2));
console.log('\nWrote data/review-approved.json');
