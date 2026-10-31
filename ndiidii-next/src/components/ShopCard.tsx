import Link from 'next/link';
import { FEATURES } from '@/config/site';
import { HeartIcon } from './Icons';
import ProductImage from './ProductImage';
import Monogram from './Monogram';
import { formatNaira } from '@/lib/format';
import { OIL_FORMATS, TIER_BOX_PRICE_NGN, oilSetPrice, type Tier } from '@/lib/store.config';
import type { OilCategory } from '@/lib/mappers';

/**
 * The fields a card actually renders. Structural on purpose: the shop grid
 * passes lean card projections (lib/shopCards.ts) while /search and the
 * builders still pass full Perfume/Oil objects — both satisfy this.
 *
 * `tier` + `bottlePrice` are present only on perfumes, `category` only on oils,
 * so the `'category' in p` / `'tier' in p` narrowing keeps working.
 */
export interface CardProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  inStock: boolean;
  tier?: 1 | 2 | 3 | null;
  bottlePrice?: number | null;
  category?: OilCategory | null;
}

/** Cheapest oil set for a collection type — what "from" means on the card. */
function oilFromPrice(category: OilCategory | null | undefined): number | null {
  if (!category) return null;
  const prices = OIL_FORMATS.map((f) => oilSetPrice(category, f.value)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

export default function ShopCard({ p }: { p: CardProduct }) {
  const soldOut = !p.inStock;
  const isOil = 'category' in p;
  const slugRoute = isOil ? `/oils/${p.slug}` : `/perfumes/${p.slug}`;

  const decantPrice = !isOil && p.tier ? TIER_BOX_PRICE_NGN[p.tier as Tier] : null;
  const bottlePrice = !isOil && (p.bottlePrice ?? 0) > 0 ? p.bottlePrice! : null;
  const from = isOil ? oilFromPrice(p.category) : null;

  return (
    <article className={`scard ${soldOut ? 'is-sold-out' : ''} ${isOil ? 'scard--oil' : ''}`}>
      {!isOil && p.tier ? <span className="scard__tier serif">Tier {p.tier}</span> : null}
      {FEATURES.wishlist && (
        <button className="scard__heart" aria-label={`Add ${p.name} to wishlist`}>
          <HeartIcon width={22} height={22} />
        </button>
      )}
      <Link href={slugRoute} className="scard__link">
        <div className="scard__img">
          {/* Oils carry no photography (copyright) — monogram tile only. */}
          {isOil ? (
            <Monogram name={p.name} className="dnoimg dnoimg--card" />
          ) : (
            <ProductImage src={p.imageUrl} alt={p.name} />
          )}
        </div>
        {/* Brand above, name below: the house is the quieter line, the scent is
            the thing being browsed. The <h3> stays on the name for semantics. */}
        {p.brand && <p className="scard__brand">{p.brand}</p>}
        <h3 className="scard__name">{p.name}</h3>
        <p className="scard__price">
          {isOil ? (
            from !== null ? (
              <>Oil set · from {formatNaira(from)}</>
            ) : (
              <>Oil set</>
            )
          ) : (
            <>
              {decantPrice !== null && <>Decant set {formatNaira(decantPrice)}</>}
              {decantPrice !== null && bottlePrice !== null && <span className="scard__sep"> · </span>}
              {bottlePrice !== null && <>Full Bottle {formatNaira(bottlePrice)}</>}
            </>
          )}
        </p>
        {soldOut && <p className="scard__status">Out of stock</p>}
      </Link>
    </article>
  );
}
