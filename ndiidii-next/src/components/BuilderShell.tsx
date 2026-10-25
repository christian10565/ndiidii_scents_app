'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, type Tier } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import type { Perfume } from '@/lib/catalog';
import ProductImage from './ProductImage';
import { BagIcon, CheckIcon } from './Icons';

const TIERS: { tier: Tier; label: string; blurb: string }[] = [
  { tier: 1, label: 'Tier One', blurb: 'Everyday & Fresh' },
  { tier: 2, label: 'Tier Two', blurb: 'Signature & Rich' },
  { tier: 3, label: 'Tier Three', blurb: 'Rare & Reserve' },
];

type ByTier = Record<string, Perfume[]>;

/**
 * The Collection Builder. Pick a tier, click products to fill BOX_SIZE (4)
 * slots in that tier, then add the set to the cart at that tier's fixed price.
 * All three tiers can be worked on concurrently.
 */
export function BuilderShell({ byTier }: { byTier: ByTier }) {
  const [activeTier, setActiveTier] = useState<Tier>(1);
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);

  const { lines, toggleLine, removeLine, setQty } = useCart();
  const tierLines = useMemo(() => lines.filter((l) => l.kind === 'perfume' && l.tier === activeTier), [lines, activeTier]);
  const products = useMemo(() => (byTier[String(activeTier)] ?? []) as Perfume[], [byTier, activeTier]);

  /**
   * The set currently being built. A tier is edited one set at a time: the
   * incomplete line if there is one, otherwise the last one. Selection used to
   * be flattened across every line in the tier, so a 5th pick (which the cart
   * puts in a new line) made "selected" 5, produced "Pick -1 More", and left the
   * extra item with no slot to render into.
   */
  const workingLine = useMemo(() => {
    const incompleteLine = tierLines.find((l) => l.items.length < BOX_SIZE);
    return incompleteLine ?? tierLines[tierLines.length - 1] ?? null;
  }, [tierLines]);

  const selected = workingLine?.items ?? [];
  const activeLineId = workingLine?.id ?? null;
  const full = selected.length === BOX_SIZE;
  const price = TIER_BOX_PRICE_NGN[activeTier];
  const canPay = lines.filter((l) => l.kind === 'perfume').every((l) => l.items.length === BOX_SIZE);

  const isSelected = (slug: string) => selected.includes(slug);

  return (
    <div className="container builder">
      <nav className="builder__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <span>Perfume</span>
      </nav>

      <header className="builder__head">
        <p className="eyebrow builder__eyebrow">Signature Feature</p>
        <h1 className="serif builder__title">Build Your Perfume Collection</h1>
        <p className="builder__intro">
          Choose one tier, then select exactly four 10ml decants from within it. Mixed tiers aren&apos;t
          possible — that&apos;s what keeps pricing simple and fair.
        </p>
        <p className="builder__oil-link">
          Looking to build a set from our perfume oils instead? <Link href="/collection-builder/oils" className="link-red">Try the Oil Builder</Link>
        </p>
      </header>

      {/* Tier selector */}
      <div className="builder__tiers" role="tablist" aria-label="Tier">
        {TIERS.map((t) => {
          const tLines = lines.filter((l) => l.kind === 'perfume' && l.tier === t.tier);
          const tWorking = tLines.find((l) => l.items.length < BOX_SIZE) ?? tLines[tLines.length - 1];
          const c = tWorking?.items.length ?? 0;
          const incompleteTier = tLines.some((l) => l.items.length < BOX_SIZE);
          return (
            <button
              key={t.tier}
              role="tab"
              aria-selected={activeTier === t.tier}
              className={`tiercard ${activeTier === t.tier ? 'is-active' : ''}`}
              onClick={() => { setActiveTier(t.tier); setJustAdded(false); }}
            >
              <span className="tiercard__label eyebrow">{t.label}</span>
              <span className="tiercard__price serif">{formatNaira(TIER_BOX_PRICE_NGN[t.tier])}</span>
              <span className="tiercard__blurb">{t.blurb}</span>
              {c > 0 && <span className="tiercard__count">{c}/{BOX_SIZE}</span>}
              {incompleteTier && <span className="tiercard__count">in progress</span>}
            </button>
          );
        })}
      </div>

      <div className="builder__layout">
        {/* Product grid */}
        <div className="builder__grid-wrap">
          <div className="builder__gridhead">
            <h2 className="serif">{TIERS[activeTier - 1].label} — choose {BOX_SIZE}</h2>
            <button className="builder__clear link-red" onClick={() => activeLineId && removeLine(activeLineId)}>
              Clear selection
            </button>
          </div>

          {products.length === 0 ? (
            <p className="empty">No scents in this tier yet.</p>
          ) : (
            <div className="builder__grid">
              {products.map((p) => {
                const sel = isSelected(p.slug);
                // A full set blocks further picks until it has been added to the
                // cart — that is the only point where starting a second set in
                // the same tier makes sense. Without this the fifth click quietly
                // opened a second line and the counter went negative.
                const disabled = !sel && full && !justAdded;
                return (
                  <button
                    key={p.id}
                    className={`bcard ${sel ? 'is-selected' : ''}`}
                    onClick={() => {
                      if (disabled) return;
                      if (!sel && full) setJustAdded(false); // this pick opens the next set
                      toggleLine('perfume', activeTier, p.slug);
                    }}
                    disabled={disabled}
                    aria-pressed={sel}
                  >
                    <span className="bcard__img">
                      <ProductImage src={p.imageUrl} alt={p.name} />
                      {sel && (
                        <span className="bcard__check" aria-hidden="true">
                          <CheckIcon width={16} height={16} />
                        </span>
                      )}
                    </span>
                    <span className="bcard__name">{p.name}</span>
                    <span className="bcard__family">{p.scentProfile || p.brand}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Your Set — sticky summary */}
        <aside className="yourset" aria-label="Your set">
          <div className="yourset__inner">
            <p className="yourset__title eyebrow">Your Set</p>
            <p className="yourset__tier">
              {TIERS[activeTier - 1].label} · <span>{selected.length} of {BOX_SIZE} selected</span>
            </p>

            <div className="yourset__slots">
              {Array.from({ length: BOX_SIZE }, (_, i) => {
                const slug = selected[i];
                const prod = slug ? products.find((product) => product.slug === slug) : null;
                return (
                  <div key={i} className={`slot ${prod ? 'is-filled' : ''}`}>
                    {prod ? (
                      <>
                        <span className="slot__thumb">
                          <ProductImage src={prod.imageUrl} alt={prod.name} />
                        </span>
                        <span className="slot__name">{prod.name}</span>
                        <button
                          className="slot__remove"
                          aria-label={`Remove ${prod.name}`}
                          onClick={() => toggleLine('perfume', activeTier, prod.slug)}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="slot__empty">Decant {i + 1}</span>
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
              <input type="number" min={1} max={99} defaultValue={1} id="builder-qty" />
            </label>

            <button
              className="btn btn--white yourset__cta"
              disabled={!full}
              onClick={() => {
                const qty = Number((document.getElementById('builder-qty') as HTMLInputElement)?.value) || 1;
                setQty(activeLineId, qty);
                setJustAdded(true);
              }}
            >
              <BagIcon width={16} height={16} />
              {full ? 'Add Set to Cart' : `Pick ${Math.max(0, BOX_SIZE - selected.length)} More`}
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
