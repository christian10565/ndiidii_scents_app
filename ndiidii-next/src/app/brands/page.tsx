import { getBrands } from '@/lib/catalog';
import { BrandIndex } from '@/components/BrandIndex';

// The A–Z brand index. Brands come from the sheet (getBrands); grouping and the
// jump index are derived client-side from that list.
export default async function BrandsPage() {
  const brands = await getBrands();
  // Only brands that actually have products, name-sorted.
  const names = brands
    .filter((b) => b.perfumes + b.oils > 0)
    .map((b) => b.brand)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return <BrandIndex names={names} />;
}
