import { Suspense } from 'react';
import { getBrands, getPerfumes } from '@/lib/catalog';
import { toPerfumeCard } from '@/lib/shopCards';
import ShopShell from '@/components/ShopShell';

// Caching + revalidation live on the data functions in @/lib/catalog
// (use cache + cacheLife + cacheTag). The Apps Script ping calls
// /api/revalidate, which does revalidateTag('catalog').
//
// PERFUMES ONLY. Oils are sold exclusively through the Oil Collection Builder
// (/collection-builder/oils), so they are not shipped to this route at all —
// not as data, not as filter options.
//
// The catalog is projected down to lean card objects before it crosses into the
// client shell (lib/shopCards.ts). Shipping the full Perfume objects put ~800KB
// of JSON — descriptions, extra sheet prose, raw note strings — into this
// route's HTML and into every prefetch of it.
//
// ShopShell uses useSearchParams(), which needs a Suspense boundary to
// prerender correctly. The fallback shows a neutral shop-height block while
// the shell streams in.
export default async function ShopPage() {
  const [perfumes, brands] = await Promise.all([getPerfumes(), getBrands()]);
  return (
    <Suspense fallback={<div className="shop" style={{ minHeight: '80vh' }} />}>
      <ShopShell perfumes={perfumes.map(toPerfumeCard)} brands={brands} />
    </Suspense>
  );
}
