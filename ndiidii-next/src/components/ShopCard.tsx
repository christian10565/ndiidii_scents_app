import Link from 'next/link';
import { FEATURES } from '@/config/site';
import { HeartIcon } from './Icons';
import ProductImage from './ProductImage';
import type { OilCategory } from '@/lib/mappers';

/**
 * The fields a card actually renders. Structural on purpose: the shop grid
 * passes lean card projections (lib/shopCards.ts) while /search and the
 * builders still pass full Perfume/Oil objects — both satisfy this.
 *
 * `tier` is present only on perfumes, `category` only on oils, so the existing
 * `'category' in p` / `'tier' in p` narrowing keeps working.
 */
export interface CardProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  inStock: boolean;
  tier?: 1 | 2 | 3 | null;
  category?: OilCategory | null;
}

export default function ShopCard({ p }: { p: CardProduct }) {
  const soldOut = !p.inStock;
  const slugRoute = 'category' in p ? `/oils/${p.slug}` : `/perfumes/${p.slug}`;

  return (
    <article className={`scard ${soldOut ? 'is-sold-out' : ''}`}>
      {'tier' in p && p.tier ? <span className="scard__tier serif">Tier {p.tier}</span> : null}
      {FEATURES.wishlist && (
        <button className="scard__heart" aria-label={`Add ${p.name} to wishlist`}>
          <HeartIcon width={22} height={22} />
        </button>
      )}
      <Link href={slugRoute} className="scard__link">
        <div className="scard__img">
          <ProductImage src={p.imageUrl} alt={p.name} />
        </div>
        {/* Brand above, name below: the house is the quieter line, the scent is
            the thing being browsed. The <h3> stays on the name for semantics. */}
        {p.brand && <p className="scard__brand">{p.brand}</p>}
        <h3 className="scard__name">{p.name}</h3>
        {soldOut && <p className="scard__status">Out of stock</p>}
      </Link>
    </article>
  );
}
