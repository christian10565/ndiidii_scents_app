const BOX_SIZE = 4;
const TIER_BOX = { 1: 50000, 2: 50000, 3: 30000 };
const OIL_BOX = 50000;

function buildSetLines(perfumes, oils) {
  const lines = [];
  const byTier = new Map();
  for (const it of perfumes) {
    const t = it.tier;
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t).push(it.slug);
  }
  for (const [tier, slugs] of byTier.entries()) {
    for (let i = 0; i < slugs.length; i += BOX_SIZE) {
      const chunk = slugs.slice(i, i + BOX_SIZE);
      if (chunk.length === 0) continue;
      lines.push({ id: 'set-perfume-' + tier + '-' + chunk.join('+'), kind: 'Tier ' + tier, tier: tier, items: chunk, qty: 1, unitPrice: TIER_BOX[tier] });
    }
  }
  for (let i = 0; i < oils.length; i += BOX_SIZE) {
    const chunk = oils.slice(i, i + BOX_SIZE);
    if (chunk.length === 0) continue;
    lines.push({ id: 'set-oil-' + chunk.join('+'), kind: 'Oil set', tier: null, items: chunk, qty: 1, unitPrice: OIL_BOX });
  }
  return lines;
}

// Perfume: 4 Tier3 + 1 Tier3 + 2 Tier1
const perfumeSlugs = [
  { tier: 3, slug:'p1' }, { tier: 3, slug:'p2' }, { tier: 3, slug:'p3' }, { tier: 3, slug:'p4' },
  { tier: 3, slug:'p5' },
  { tier: 1, slug:'p6' }, { tier: 1, slug:'p7' },
];
const lines = buildSetLines(perfumeSlugs, []);
console.log('PERFUME LINES:');
for (const l of lines) console.log(' ', l.kind, '(tier', l.tier, ') x', l.qty, '@ NGN', l.unitPrice, 'items:', l.items.map(s=>s.slice(0,4)).join(','));

// Oils: 8 -> 2 sets of 4
const oilSlugs = Array.from({length:8}, (_,i) => ({ slug: 'o'+i }));
const oLines = buildSetLines([], oilSlugs);
console.log('OIL LINES (8 oils -> 2 sets):');
for (const l of oLines) console.log(' ', l.kind, 'x', l.qty, '@ NGN', l.unitPrice, 'items:', l.items.map(s=>s.slice(0,4)).join(','));
console.log('TOTAL LINES:', lines.length + oLines.length);
