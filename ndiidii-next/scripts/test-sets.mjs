import { buildSetLines } from '../src/lib/checkout-sets.ts';

// Perfume: 4 x Tier 3 + 1 x Tier 3 + 2 x Tier 1
const perfumeSlugs = [
  { tier: 3, slug: 'p1', name: 'A' }, { tier: 3, slug: 'p2', name: 'B' },
  { tier: 3, slug: 'p3', name: 'C' }, { tier: 3, slug: 'p4', name: 'D' },
  { tier: 3, slug: 'p5', name: 'E' },
  { tier: 1, slug: 'p6', name: 'F' }, { tier: 1, slug: 'p7', name: 'G' },
];
const lines = buildSetLines(perfumeSlugs, []);
console.log('PERFUME LINES:');
for (const l of lines) {
  console.log(`  ${l.kind} (tier ${l.tier}) x${l.qty} @ NGN ${l.unitPrice} — items: [${l.items.map(s => s.slice(0,4)).join(', ')}]`);
}

// Oils: 8 oils -> groups of 4 -> 2 oil sets
const oilSlugs = Array.from({ length: 8 }, (_, i) => ({ slug: `o${i}`, name: `Oil ${i}` }));
const oLines = buildSetLines([], oilSlugs);
console.log('OIL LINES (8 oils -> should be 2 sets of 4):');
for (const l of oLines) {
  console.log(`  ${l.kind} x${l.qty} @ NGN ${l.unitPrice} — items: [${l.items.map(s => s.slice(0,4)).join(', ')}]`);
}
console.log('TOTAL LINES:', lines.length + oLines.length);
