/* Quick check of the sheet mapping using the headers seen in her screenshots. Run: npx ts-node src/scripts/smoke-mappers.ts */
import { SheetRow, normaliseHeader } from '../sheets/sheets.service';
import { mapOilRow, mapPerfumeRow } from '../sync/mappers';

const row = (first: string, data: Record<string, string>, rowNumber: number): SheetRow => {
  const cells: Record<string, string> = {};
  for (const [h, v] of Object.entries(data)) cells[normaliseHeader(h)] = v;
  return { first, cells, raw: data, rowNumber };
};

const oil = mapOilRow(
  row('2', { 'Perfume Oil Name': 'Intense Oud', Brand: 'Gucci', Gender: 'Unisex', Category: 'High end' }, 3),
  1,
);
const oil2 = mapOilRow(
  row('1', { 'Perfume Oil Name': 'Good Girl', Brand: 'Caroline Herrera', Gender: 'Women', Category: 'Designer' }, 2),
  0,
);
const perfume = mapPerfumeRow(
  row(
    '2',
    {
      'Perfume Name': 'Khamrah Dukhan',
      Brand: 'Lattafa',
      'Inspired By': "Kilian Angels' Share + Initio Side Effect",
      'Top Notes': 'Vibrant Mandarin',
      'Heart notes': 'Mystical Incense',
      'Base Notes': 'Rich Tobacco',
      Tier: 'Tier 2',
      Stock: '12',
      'Sillage Rating': 'Strong',
    },
    3,
  ),
  1,
);

// Values taken from her real sheet (gender wording, "Tier 3" dropdown, Price column that the site ignores)
const real = (g: string, tier: string) =>
  mapPerfumeRow(
    row('3', { 'Perfume Name': 'Asad', Gender: g, Tier: tier, Price: '35,000.00', 'Scent profile': 'Woody Spicy' }, 4),
    2,
  );
const asad = real('Masculine', 'Tier 3');

console.log(JSON.stringify({ oil, oil2, perfume }, null, 2));

const assert = (c: boolean, m: string) => {
  if (!c) throw new Error('FAILED: ' + m);
};
assert(oil?.category === 'niche', '"High end" -> niche');
assert(oil2?.category === 'designer', 'Designer -> designer');
assert(oil?.gender === 'unisex' && oil2?.gender === 'women', 'gender parsing');
assert(perfume?.tier === 2 && perfume?.sheetStock === 12, 'tier + stock');
assert(perfume?.extra['Sillage Rating'] === 'Strong', 'unmapped column kept in extra');
assert(perfume?.slugBase === 'khamrah-dukhan-lattafa', 'slug');
assert(asad?.gender === 'men', '"Masculine" -> men');
assert(real('Feminine', 'Tier 1')?.gender === 'women', '"Feminine" -> women');
assert(real('Unisex (masculine leaning)', 'Tier 2')?.gender === 'unisex', '"Unisex (masculine leaning)" -> unisex');
assert(real('Women', 'Tier 3')?.gender === 'women' && real('Men', 'Tier 3')?.gender === 'men', 'Women/Men');
assert(asad?.tier === 3, '"Tier 3" -> 3');
assert(real('Men', '')?.tier === null, 'blank tier -> null');
assert(asad?.scentProfile === 'Woody Spicy', 'scent profile mapped');
assert(asad?.extra['Price'] === '35,000.00' && !('price' in (asad as object)), 'Price stays out of the product, kept only in extra');
console.log('\nAll mapper checks passed.');
