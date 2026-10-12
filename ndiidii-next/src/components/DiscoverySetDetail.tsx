'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { DISCOVERY_SET_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import Monogram from './Monogram';
import type { CuratedSet } from '@/lib/catalog';

/** Detail page for one curated discovery set. */
export default function DiscoverySetDetail({ set }: { set: CuratedSet }) {
  const { addDiscoverySet } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const addToCart = () => {
    addDiscoverySet({
      collection: set.collection,
      slug: set.slug,
      items: set.slots.map((s) => ({
        name: s.perfumeName,
        slug: s.perfume?.slug ?? null,
        imageUrl: s.perfume?.imageUrl ?? null,
      })),
    });
    setAdded(true);
  };

  return (
    <div className="container dset-detail">
      <div className="dset-detail__nav">
        <Link href="/discovery-sets">← All sets</Link>
      </div>

      <header className="dset-detail__head">
        <p className="eyebrow dset-detail__eyebrow">Curated Discovery Set</p>
        <h1 className="serif dset-detail__title">{set.collection}</h1>
        <p className="dset-detail__intro">
          Four 10ml decants, curated around a single mood — {set.slots.map((s) => s.scentProfile).join(', ')}.
        </p>
      </header>

      <div className="dset-detail__layout">
        {/* the 4 slots */}
        <div className="dslots">
          {set.slots.map((slot, i) => (
            <article className="dslot" key={i}>
              <div className="dslot__img">
                {slot.perfume?.imageUrl ? (
                  <ProductImage src={slot.perfume.imageUrl} alt={slot.perfumeName} />
                ) : (
                  <Monogram name={slot.perfumeName} />
                )}
              </div>
              <div className="dslot__body">
                <h2 className="serif dslot__profile">{slot.scentProfile}</h2>
                <p className="dslot__perfume">
                  {slot.perfume ? (
                    <Link href={`/perfumes/${slot.perfume.slug}`}>{slot.perfumeName}</Link>
                  ) : (
                    slot.perfumeName
                  )}
                  {slot.perfume?.brand ? <span className="dslot__brand"> · {slot.perfume.brand}</span> : null}
                </p>
                <p className="dslot__desc">{slot.description}</p>
                {slot.perfume && (
                  <dl className="dslot__attrs">
                    {slot.perfume.notes.base && (
                      <div className="dslot__attr">
                        <dt>Base Notes</dt>
                        <dd>{slot.perfume.notes.base}</dd>
                      </div>
                    )}
                    {slot.perfume.gender && (
                      <div className="dslot__attr">
                        <dt>Gender</dt>
                        <dd>{slot.perfume.gender}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* the black summary panel */}
        <aside className="dbox">
          <h2 className="dbox__title">Your 4-Decant Box</h2>
          <p className="dbox__sub">4 × 10ml decants · Perfume Option 1</p>
          <ul className="dbox__list">
            {set.slots.map((slot, i) => (
              <li className="dbox__item" key={i}>
                <div className="dbox__thumb">
                  <ProductImage src={slot.perfume?.imageUrl ?? null} alt={slot.perfumeName} />
                </div>
                <div>
                  <div className="dbox__item-name">{slot.perfumeName}</div>
                  {slot.perfume?.brand && <div className="dbox__item-brand">{slot.perfume.brand}</div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="dbox__total">
            <span className="dbox__total-label">Total</span>
            <span className="dbox__total-price">{formatNaira(DISCOVERY_SET_PRICE_NGN)}</span>
          </div>
          {added ? (
            <button className="dbox__cta" onClick={() => router.push('/checkout')}>
              Added — Go to Checkout →
            </button>
          ) : (
            <button className="dbox__cta" onClick={addToCart}>
              Add to Cart
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
