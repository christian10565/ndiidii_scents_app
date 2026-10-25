import { Suspense } from 'react';
import { getBrands, getPerfumes, getOils } from '@/lib/catalog';
import { toOilCard, toPerfumeCard } from '@/lib/shopCards';
import ShopShell from '@/components/ShopShell';

// Caching + revalidation live on the data functions in @/lib/catalog
// (use cache + cacheLife + cacheTag). The Apps Script ping calls
// /api/revalidate, which does revalidateTag('catalog').
//
// The catalog is projected down to lean card objects before it crosses into the
// client shell (lib/shopCards.ts). Shipping the full Perfume/Oil objects put
// ~800KB of JSON — descriptions, extra sheet prose, raw note strings — into this
// route's HTML and into every prefetch of it.
//
// ShopShell uses useSearchParams(), which needs a Suspense boundary to
// prerender correctly. The fallback shows a neutral shop-height block while
// the shell streams in.
export default async function ShopPage() {
  const [perfumes, brands, oils] = await Promise.all([getPerfumes(), getBrands(), getOils()]);
  return (
    <Suspense fallback={<div className="shop" style={{ minHeight: '80vh' }} />}>
      <ShopShell
        perfumes={perfumes.map(toPerfumeCard)}
        oils={oils.map(toOilCard)}
        brands={brands}
      />
    </Suspense>
  );
}
