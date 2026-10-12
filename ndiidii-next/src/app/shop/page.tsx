import { Suspense } from 'react';
import { getBrands, getPerfumes } from '@/lib/catalog';
import ShopShell from '@/components/ShopShell';

// Caching + revalidation live on the data functions in @/lib/catalog
// (use cache + cacheLife + cacheTag). The Apps Script ping calls
// /api/revalidate, which does revalidateTag('catalog').
//
// ShopShell uses useSearchParams(), which needs a Suspense boundary to
// prerender correctly. The fallback shows a neutral shop-height block while
// the shell streams in.
export default async function ShopPage() {
  const [perfumes, brands] = await Promise.all([getPerfumes(), getBrands()]);
  return (
    <Suspense fallback={<div className="shop" style={{ minHeight: '80vh' }} />}>
      <ShopShell initial={perfumes} brands={brands} />
    </Suspense>
  );
}
