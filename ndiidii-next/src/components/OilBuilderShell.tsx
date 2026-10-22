'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { BOX_SIZE, OIL_BOX_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon, CheckIcon } from './Icons';
import type { Oil } from '@/lib/catalog';

export function OilBuilderShell({ oils: allOils }: { oils: Oil[] }) {
  const { addOilSetToCart, toggleOil, clearOil } = useCart();
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const router = useRouter();

  const brands = ['Niche', 'Designer'];
  const filtered = activeBrand
    ? allOils.filter((o) => (activeBrand === 'Niche' ? o.category === 'niche' : o.category === 'designer'))
    : allOils;

  const selectedCount = oils.length;
  const setReady = selectedCount >= BOX_SIZE;
  const price = OIL_BOX_PRICE_NGN ?? 0;

  const isSelected = (slug: string) => oils.includes(slug);

  const toggle = (o: Oil) => toggleOil(o.slug);
  const clear = () => clearOil();

  const handleAddSet = () => {
    if (selectedCount < BOX_SIZE) return;
    addOilSetToCart(1);
    setJustAdded(true);
  };

  return (
    <div className="container builder">
      <nav className="builder__crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> / <span>Collection Builder</span> / <span>Perfume Oils</span>
      </nav>

      <header className="builder__head">
        <p className="eyebrow builder__eyebrow">Signature Feature</p>
        <h1 className="serif builder__title">Build an Oil Set</h1>
        <p className="builder__intro">
          Choose any four alcohol-free oils. They don't belong to a tier — any four
          form one set at checkout, at the oil box price. Mixed categories are fine.
          You can add multiple sets, one after another.
        </p>
      </header>

      <div className="builder__tiers" role="tablist" aria-label="Oil category">
        {brands.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={activeBrand === b}
            className={`tiercard ${activeBrand === b ? 'is-active' : ''}`}
            onClick={() => setActiveBrand(activeBrand === b ? null : b)}
          >
            <span className="tiercard__label eyebrow">{b}</span>
            <span className="tiercard__price serif">{b === 'Niche' ? 'Niche oils' : 'Designer oils'}</span>
            <span className="tiercard__blurb">Pick four oils — any four</span>
          </button>
        ))}
      </div>

      <div className="builder__layout">
        <div className="builder__grid-wrap">
          <div className="builder__gridhead">
            <h2 className="serif">{activeBrand ?? 'All'} oils — pick any {BOX_SIZE}</h2>
            {selectedCount > 0 && (
              <button className="builder__clear link-red" onClick={clear}>
                Clear selection
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="empty">No oils in this category.</p>
          ) : (
            <div className="builder__grid">
              {filtered.map((o) => {
                const sel = isSelected(o.slug);
                const disabled = selectedCount >= BOX_SIZE && !sel;
                return (
                  <button
                    key={o.id}
                    className={`bcard ${sel ? 'is-selected' : ''}`}
                    onClick={() => toggle(o)}
                    disabled={disabled}
                    aria-pressed={sel}
                  >
                    <span className="bcard__img">
                      <ProductImage src={o.imageUrl} alt={o.name} />
                      {sel && <span className="bcard__check" aria-hidden="true"><CheckIcon width={16} height={16} /></span>}
                    </span>
                    <span className="bcard__name">{o.name}</span>
                    <span className="bcard__family">{o.category === 'niche' ? 'Niche' : 'Designer'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="yourset" aria-label="Your set">
          <div className="yourset__inner">
            <p className="yourset__title eyebrow">Your Oil Set</p>
            <p className="yourset__tier">{selectedCount} of {BOX_SIZE} selected</p>

            <div className="yourset__slots">
              {Array.from({ length: BOX_SIZE }, (_, i) => {
                const slug = oils[i];
                const prod = slug ? allOils.find((o) => o.slug === slug) : null;
                return (
                  <div key={i} className={`slot ${prod ? 'is-filled' : ''}`}>
                    {prod ? (
                      <>
                        <span className="slot__thumb">
                          {prod.imageUrl ? <ProductImage src={prod.imageUrl} alt={prod.name} /> : <div className="slot__thumb--empty" />}
                        </span>
                        <span className="slot__name">{prod.name}</span>
                      </>
                    ) : (
                      <span className="slot__empty">Oil {i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="yourset__total">
              <span>Total ({selectedCount} oils)</span>
              <strong className="serif">{formatNaira(selectedCount * price)}</strong>
            </div>

            <button
              className="btn btn--white yourset__cta"
              disabled={!setReady}
              onClick={handleAddSet}
            >
              <BagIcon width={16} height={16} />
              {setReady ? 'Add Oil Set to Cart' : `Pick ${BOX_SIZE - selectedCount} More`}
            </button>
            {justAdded && (
              <button className="yourset__checkout link-red" onClick={() => router.push('/checkout')}>
                Go to Checkout
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
