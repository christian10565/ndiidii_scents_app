import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductImage from '@/components/ProductImage';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE } from '@/lib/store.config';
import { getOils } from '@/lib/catalog';
import OilCartSet from '@/components/OilCartSet';

// This route reads `params` (and the sheet) on every request, so it can't be
// statically prerendered — product slugs aren't known at build time. Render it
// at request time rather than streaming.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const oils = await getOils();
  const p = oils.find((o) => o.slug === slug);
  if (!p) return { title: 'Not found — Ndiidii Scents' };
  return {
    title: `${p.name} — Ndiidii Scents`,
    description: p.category === 'niche'
      ? 'Niche oil decant — Middle Eastern perfume decant.'
      : 'Designer oil decant — Middle Eastern perfume decant.',
  };
}

export default async function OilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const oils = await getOils();
  const p = oils.find((o) => o.slug === slug);
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
            <span className="pdp__oil-category">{p.category === 'niche' ? 'Niche' : 'Designer'}</span>
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

          <OilCartSet slug={p.slug} />
        </div>
      </div>
    </div>
  );
}
