'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { BOX_SIZE, OIL_BOX_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon, CheckIcon } from './Icons';
import type { Oil } from '@/lib/catalog';

type Category = 'all' | 'niche' | 'designer';

const TABS: { value: Category; label: string; blurb: string }[] = [
  { value: 'all', label: 'All Oils', blurb: 'Every oil in the catalogue' },
  { value: 'niche', label: 'Niche', blurb: 'Niche-house oils' },
  { value: 'designer', label: 'Designer', blurb: 'Designer-house oils' },
];

/**
 * The Oil Builder. Any four oils form one set — there are no tiers, so the
 * category tabs only filter the grid; they never clear what you've picked.
 *
 * In-progress picks live in local state, matching the perfume builder. They used
 * to be written into cart lines on every click, which is why revisiting the page
 * with a stale cart opened with slots already filled: the builder adopted
 * whatever partial oil line was left behind. Partial lines are now folded into
 * the draft on load and removed from the cart.
 */
export function OilBuilderShell({ oils }: { oils: Oil[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('all');
  const [justAdded, setJustAdded] = useState(false);

  const { lines, addLine, removeLine } = useCart();
  const [draft, setDraft] = useState<string[]>([]);

  const full = draft.length === BOX_SIZE;
  const price = OIL_BOX_PRICE_NGN ?? 0;
  const canPay = lines.filter((l) => l.kind === 'oil').every((l) => l.items.length === BOX_SIZE);

  const filtered = useMemo(
    () => (category === 'all' ? oils : oils.filter((o) => o.category === category)),
    [oils, category],
  );

  const setsInCart = lines.filter((l) => l.kind === 'oil' && l.items.length === BOX_SIZE).length;

  /** Fold stale half-built oil lines into the draft, then drop them. */
  const migrated = useRef(false);
  const oilsRef = useRef(oils);
  oilsRef.current = oils;

  useEffect(() => {
    if (migrated.current || lines.length === 0) return;

    const partials = lines.filter((l) => l.kind === 'oil' && l.items.length < BOX_SIZE);
    migrated.current = true;
    if (partials.length === 0) return;

    const available = new Set(oilsRef.current.map((o) => o.slug));
    const adopted = [...new Set(partials[0].items)].filter((slug) => available.has(slug)).slice(0, BOX_SIZE);

    setDraft(adopted);
    partials.forEach((line) => removeLine(line.id));
  }, [lines, removeLine]);

  const togglePick = (slug: string) => {
    setJustAdded(false);
    setDraft((cur) => {
      if (cur.includes(slug)) return cur.filter((s) => s !== slug);
      if (cur.length >= BOX_SIZE) return cur; // full: no fifth pick
      return [...cur, slug];
    });
  };

  const isSelected = (slug: string) => draft.includes(slug);

  return (
    <div className="container builder">
      <nav className="builder__crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> / <span>Collection Builder</span> / <span>Perfume Oils</span>
      </nav>

      <header className="builder__head">
        <p className="eyebrow builder__eyebrow">Signature Feature</p>
        <h1 className="serif builder__title">Build an Oil Set</h1>
        <p className="builder__intro">
          Choose any four alcohol-free oils. They don&apos;t belong to a tier — any four
          form one set at checkout, at the oil box price. Mixed categories are fine.
          You can add multiple sets, one after another.
        </p>
      </header>

      <div className="builder__tiers" role="tablist" aria-label="Oil category">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={category === t.value}
            className={`tiercard ${category === t.value ? 'is-active' : ''}`}
            onClick={() => setCategory(t.value)}
          >
            <span className="tiercard__label eyebrow">{t.label}</span>
            <span className="tiercard__price serif">{formatNaira(price)}</span>
            <span className="tiercard__blurb">{t.blurb}</span>
            {t.value === category && draft.length > 0 && (
              <span className="tiercard__count">{draft.length}/{BOX_SIZE}</span>
            )}
            {t.value === 'all' && setsInCart > 0 && (
              <span className="tiercard__count">{setsInCart} {setsInCart === 1 ? 'set' : 'sets'} in cart</span>
            )}
          </button>
        ))}
      </div>

      <div className="builder__layout">
        <div className="builder__grid-wrap">
          <div className="builder__gridhead">
            <h2 className="serif">
              {category === 'all' ? 'All' : category === 'niche' ? 'Niche' : 'Designer'} oils — pick any {BOX_SIZE}
            </h2>
            <button
              className="builder__clear link-red"
              onClick={() => { setDraft([]); setJustAdded(false); }}
              disabled={draft.length === 0}
            >
              Clear selection
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="empty">No oils in this category.</p>
          ) : (
            <div className="builder__grid">
              {filtered.map((o) => {
                const sel = isSelected(o.slug);
                const disabled = !sel && full;
                return (
                  <button
                    key={o.id}
                    className={`bcard ${sel ? 'is-selected' : ''}`}
                    onClick={() => !disabled && togglePick(o.slug)}
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
            <p className="yourset__tier">{draft.length} of {BOX_SIZE} selected</p>

            <div className="yourset__slots">
              {Array.from({ length: BOX_SIZE }, (_, i) => {
                const slug = draft[i];
                const prod = slug ? oils.find((oil) => oil.slug === slug) : null;
                return (
                  <div key={i} className={`slot ${prod ? 'is-filled' : ''}`}>
                    {prod ? (
                      <>
                        <span className="slot__thumb">
                          {prod.imageUrl ? <ProductImage src={prod.imageUrl} alt={prod.name} /> : <div className="slot__thumb--empty" />}
                        </span>
                        <span className="slot__name">{prod.name}</span>
                        <button
                          className="slot__remove"
                          aria-label={`Remove ${prod.name}`}
                          onClick={() => togglePick(prod.slug)}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="slot__empty">Oil {i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="yourset__total">
              <span>Total</span>
              <strong className="serif">{formatNaira(price)}</strong>
            </div>

            <label className="yourset__qty">
              <span>Quantity</span>
              <input type="number" min={1} max={99} defaultValue={1} id="oil-builder-qty" />
            </label>

            <button
              className="btn btn--white yourset__cta"
              disabled={!full}
              onClick={() => {
                const qty = Number((document.getElementById('oil-builder-qty') as HTMLInputElement)?.value) || 1;
                addLine('oil', null, draft, qty);
                setDraft([]);
                setJustAdded(true);
              }}
            >
              <BagIcon width={16} height={16} />
              {full ? 'Add Oil Set to Cart' : `Pick ${Math.max(0, BOX_SIZE - draft.length)} More`}
            </button>
            {justAdded && canPay && (
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
