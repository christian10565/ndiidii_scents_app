import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductImage from '@/components/ProductImage';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE, OIL_BOX_PRICE_NGN } from '@/lib/store.config';
import { getOils, getPerfume, type Oil, type Perfume } from '@/lib/catalog';
import { toProductRef } from '@/lib/shopCards';
import OilCartSet from '@/components/OilCartSet';

/**
 * Statically generated from the oils tab. Slugs that only exist in the perfumes
 * tab (see the `getOils()` known issue) are not in this list and render on
 * demand via the `getPerfume` fallback — `dynamicParams` defaults to true.
 */
export async function generateStaticParams() {
  const oils = await getOils();
  return oils.map((o) => ({ slug: o.slug }));
}

function isOilProduct(p: Oil | Perfume | null): p is Oil {
  return p !== null && 'category' in p;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const oils = await getOils();
  let p: Oil | Perfume | undefined = oils.find((o) => o.slug === slug) ?? undefined;
  if (!p) {
    const maybePerfume = await getPerfume(slug);
    if (maybePerfume && maybePerfume.tier === null) {
      p = maybePerfume;
    }
  }
  if (!p) return { title: 'Not found — Ndiidii Scents' };
  return {
    title: `${p.name} — Ndiidii Scents`,
    description: isOilProduct(p) && p.category === 'niche'
      ? 'Niche oil decant — Middle Eastern perfume decant.'
      : 'Designer oil decant — Middle Eastern perfume decant.',
  };
}

export default async function OilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const oils = await getOils();
  const oilRefs = oils.map(toProductRef);
  const foundOil = oils.find((o) => o.slug === slug) ?? null;
  const maybePerfume = foundOil ? null : await getPerfume(slug);
  const p: Oil | Perfume | null = foundOil ?? (maybePerfume && maybePerfume.tier === null ? maybePerfume : null);
  if (!p) notFound();

  const boxPrice = OIL_BOX_PRICE_NGN ?? null;

  return (
    <div className="container pdp">
      <nav className="pdp__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <span>{p.name}</span>
      </nav>

      <div className="pdp__grid">
        <div className="pdp__img">
          <ProductImage src={p.imageUrl} alt={p.name} variant="full" />
        </div>

        <div className="pdp__info">
          {p.brand && <p className="pdp__brand serif">{p.brand}</p>}
          <h1 className="serif pdp__name">{p.name}</h1>

          <div className="pdp__meta">
            {isOilProduct(p) && p.category ? (
              <span className="pdp__oil-category">{p.category === 'niche' ? 'Niche' : 'Designer'}</span>
            ) : null}
            <span className={`pdp__stock ${p.inStock ? 'in' : 'out'}`}>
              {p.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          {boxPrice && (
            <p className="pdp__price serif">
              {formatNaira(boxPrice)} <small>· box of {BOX_SIZE}</small>
            </p>
          )}

          {p.extra?.scentProfile && <p className="pdp__scent">{p.extra.scentProfile}</p>}
          {p.extra?.description && <p className="pdp__desc">{p.extra.description}</p>}

          <div className="pdp__notes">
            {Object.entries(p.extra).map(([key, value]) => (
              <div key={key}>
                <h3>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
                <p>{value}</p>
              </div>
            ))}
            {!Object.keys(p.extra).length && <p>No additional notes yet.</p>}
          </div>

          <OilCartSet oils={oilRefs} slug={p.slug} name={p.name} imageUrl={p.imageUrl} />
        </div>
      </div>
    </div>
  );
}
