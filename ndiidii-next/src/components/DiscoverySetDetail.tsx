'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { DISCOVERY_SET_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import Monogram from './Monogram';
import { SeasonIcon, NotesIcon, GenderIcon, ProfileIcon } from './Icons';
import type { CuratedSet } from '@/lib/catalog';

/** Split a comma-separated sheet value into clean items, capped, each with its first word capitalized. */
function capList(value: string | null, max: number): string[] {
  if (!value) return [];
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  return value
    .split(',')
    .map((s) => s.trim().replace(/^(and|&)\s+/i, '').trim()) // drop a leading "and"
    .filter(Boolean)
    .map(cap)
    .slice(0, max);
}

/** Detail page for one curated discovery set. */
export default function DiscoverySetDetail({ set, prev, next }: { set: CuratedSet; prev: string | null; next: string | null }) {
  const { addDiscoverySet, discovery } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  // Already in the cart (e.g. added on a previous visit)?
  const inCart = discovery.some((d) => d.slug === set.slug);

  const addToCart = () => {
    addDiscoverySet(
      {
        collection: set.collection,
        slug: set.slug,
        items: set.slots.map((s) => ({
          name: s.perfumeName,
          slug: s.perfume?.slug ?? null,
          imageUrl: s.perfume?.imageUrl ?? null,
        })),
      },
      qty,
    );
    setAdded(true);
  };

  return (
    <div className="container dset-detail">
      <div className="dset-detail__nav">
        {prev ? (
          <Link href={`/discovery-sets/${prev}`}>← Back</Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/discovery-sets/${next}`}>Next →</Link>
        ) : (
          <span />
        )}
      </div>

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
                    {slot.perfume.season && (
                      <div className="dslot__attr">
                        <dt><SeasonIcon /> Season</dt>
                        <dd>{capList(slot.perfume.season, 3).join(' · ')}</dd>
                      </div>
                    )}
                    {(() => {
                      const n = slot.perfume.notes;
                      const items = capList([n.top, n.heart, n.base].filter(Boolean).join(','), 3);
                      return items.length ? (
                        <div className="dslot__attr">
                          <dt><NotesIcon /> Notes</dt>
                          <dd>{items.join(' · ')}</dd>
                        </div>
                      ) : null;
                    })()}
                    {slot.perfume.gender && (
                      <div className="dslot__attr">
                        <dt><GenderIcon /> Gender</dt>
                        <dd>{slot.perfume.gender}</dd>
                      </div>
                    )}
                    {slot.perfume.scentProfile && (
                      <div className="dslot__attr">
                        <dt><ProfileIcon /> Scent Profile</dt>
                        <dd>{capList(slot.perfume.scentProfile, 3).join(' · ')}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* right column: set details on top, black summary panel below */}
        <div className="dset-detail__side">
          <header className="dset-detail__head">
            <p className="eyebrow dset-detail__eyebrow">Curated Discovery Set</p>
            <h1 className="serif dset-detail__title">{set.collection}</h1>
            <p className="dset-detail__intro">
              Four 10ml decants, curated around a single mood — {set.slots.map((s) => s.scentProfile).join(', ')}.
            </p>
          </header>

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
          <div className="dbox__status">
            <span>Select perfume</span>
            <span>4/4 Selected</span>
          </div>
          <div className="dbox__total">
            <span className="dbox__total-label">Total Price</span>
            <span className="dbox__total-price">{formatNaira(DISCOVERY_SET_PRICE_NGN)}</span>
          </div>
          <label className="dbox__qty">
            <span>Quantity</span>
            <input type="number" min={1} max={99} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <button className="dbox__cta" onClick={addToCart}>
            {added || inCart ? 'Added' : 'Add to Cart'}
          </button>
          {(added || inCart) && (
            <button className="dbox__checkout link-red" onClick={() => router.push('/checkout')}>
              Go to Checkout
            </button>
          )}
        </aside>
        </div>
      </div>
    </div>
  );
}
