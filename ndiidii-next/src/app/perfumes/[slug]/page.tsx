import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductImage from '@/components/ProductImage';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE, TIER_BOX_PRICE_NGN } from '@/lib/store.config';
import { getPerfume } from '@/lib/catalog';

// This route reads `params` (and the sheet) on every request, so it can't be
// statically prerendered — product slugs aren't known at build time. Render it
// at request time rather than streaming.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPerfume(slug);
  if (!p) return { title: 'Not found — Ndiidii Scents' };
  return {
    title: `${p.name} — Ndiidii Scents`,
    description: p.scentProfile
      ? `${p.brand ? p.brand + ' — ' : ''}${p.scentProfile}. Middle Eastern perfume decant.`
      : `${p.name} by ${p.brand ?? 'Ndiidii Scents'}.`,
  };
}

export default async function PerfumePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPerfume(slug);
  if (!p) notFound();

  const notes = [p.notes.top, p.notes.heart, p.notes.base].filter(Boolean);
  const boxPrice = p.tier ? formatNaira(TIER_BOX_PRICE_NGN[p.tier]) : null;

  return (
    <div className="container pdp">
      <nav className="pdp__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <span>{p.name}</span>
      </nav>

      <div className="pdp__grid">
        <div className="pdp__img">
          <ProductImage src={p.imageUrl} alt={p.name} />
        </div>

        <div className="pdp__info">
          {p.brand && <p className="pdp__brand serif">{p.brand}</p>}
          <h1 className="serif pdp__name">{p.name}</h1>

          <div className="pdp__meta">
            {p.tier && <span className="scard__tier serif">Tier {p.tier}</span>}
            {p.gender && <span className="pdp__gender">{p.gender}</span>}
            <span className={`pdp__stock ${p.inStock ? 'in' : 'out'}`}>
              {p.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          {/* No price on a perfume: the price belongs to its tier (a box of 4). */}
          {boxPrice && (
            <p className="pdp__price serif">
              {boxPrice} <small>· box of {BOX_SIZE}</small>
            </p>
          )}

          {p.scentProfile && <p className="pdp__scent">{p.scentProfile}</p>}
          {p.inspiredBy && <p className="pdp__inspired">Inspired by {p.inspiredBy}</p>}
          {p.description && <p className="pdp__desc">{p.description}</p>}

          {notes.length > 0 && (
            <div className="pdp__notes">
              {p.notes.top && (
                <div>
                  <h3>Top notes</h3>
                  <p>{p.notes.top}</p>
                </div>
              )}
              {p.notes.heart && (
                <div>
                  <h3>Heart notes</h3>
                  <p>{p.notes.heart}</p>
                </div>
              )}
              {p.notes.base && (
                <div>
                  <h3>Base notes</h3>
                  <p>{p.notes.base}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
