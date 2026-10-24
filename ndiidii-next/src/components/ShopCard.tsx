import Link from 'next/link';
import { FEATURES } from '@/config/site';
import { HeartIcon } from './Icons';
import ProductImage from './ProductImage';
import type { Perfume, Oil } from '@/lib/catalog';

type Product = Perfume | Oil;

export default function ShopCard({ p }: { p: Product }) {
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
        <h3 className="scard__name">{p.name}</h3>
        {p.brand && <p className="scard__brand serif">{p.brand}</p>}
        {soldOut && <p className="scard__status">Out of stock</p>}
      </Link>
    </article>
  );
}
