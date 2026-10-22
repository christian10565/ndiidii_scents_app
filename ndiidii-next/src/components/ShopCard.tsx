import Link from 'next/link';
import { FEATURES } from '@/config/site';
import { HeartIcon } from './Icons';
import ProductImage from './ProductImage';
import type { Perfume } from '@/lib/catalog';

export default function ShopCard({ p }: { p: Perfume }) {
  const soldOut = !p.inStock;
  // No price on a perfume: the price belongs to its tier (shown in the Tier filter and on the tier badge's box).

  return (
    <article className={`scard ${soldOut ? 'is-sold-out' : ''}`}>
      {p.tier && <span className="scard__tier serif">Tier {p.tier}</span>}
      {FEATURES.wishlist && (
        <button className="scard__heart" aria-label={`Add ${p.name} to wishlist`}>
          <HeartIcon width={22} height={22} />
        </button>
      )}
      <Link href={`/perfumes/${p.slug}`} className="scard__link">
        <div className="scard__img">
          {p.imageUrl ? (
            <ProductImage src={p.imageUrl} alt={p.name} />
          ) : (
            <div className="pimg pimg--empty">
              <img src="/images/placeholder-oils.png" alt={`${p.name} placeholder`} />
            </div>
          )}
        </div>
        <h3 className="scard__name">{p.name}</h3>
        {p.brand && <p className="scard__brand serif">{p.brand}</p>}
        {soldOut && <p className="scard__status">Out of stock</p>}
      </Link>
    </article>
  );
}
