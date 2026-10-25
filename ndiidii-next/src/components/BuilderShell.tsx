'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
type Drafts = Record<Tier, string[]>;

const EMPTY_DRAFTS: Drafts = { 1: [], 2: [], 3: [] };

/**
 * The Collection Builder. Pick a tier, click products to fill BOX_SIZE (4)
 * slots in that tier, then add the set to the cart at that tier's fixed price.
 * All three tiers can be worked on concurrently.
 *
 * In-progress picks live in local state (`drafts`), not in the cart. They used
 * to be written into cart lines as you clicked, and the "current set" was
 * inferred as "the first line with fewer than four items". That inference moves
 * the moment a set fills up: clicks start landing in a different line, previously
 * picked cards lose their tick, and the counter appears to bounce between two
 * sets at 3/4. A local draft has one unambiguous owner per tier, and only a
 * complete set is ever added to the cart.
 */
export function BuilderShell({ byTier }: { byTier: ByTier }) {
  const [activeTier, setActiveTier] = useState<Tier>(1);
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);

  const { lines, addLine, removeLine } = useCart();
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);

  const products = useMemo(() => (byTier[String(activeTier)] ?? []) as Perfume[], [byTier, activeTier]);
  const selected = drafts[activeTier];
  const full = selected.length === BOX_SIZE;
  const price = TIER_BOX_PRICE_NGN[activeTier];
  const canPay = lines.filter((l) => l.kind === 'perfume').every((l) => l.items.length === BOX_SIZE);

  /**
   * Recover carts written by the previous builder, which left half-built sets as
   * cart lines (sometimes several per tier). Fold the first one per tier into the
   * draft and drop the rest, so a stale cart can't block checkout or confuse the
   * grid on first load.
   */
  const migrated = useRef(false);
  // Kept in a ref so the effect's dep array keeps a constant size across renders.
  // Adding byTier to the deps directly made React throw "the final argument
  // passed to useEffect changed size between renders" on hot reload.
  const byTierRef = useRef(byTier);
  byTierRef.current = byTier;

  useEffect(() => {
    // Wait for the cart to hydrate: on first render `lines` is still empty, so
    // running now would find no partials and wrongly mark the migration done.
    if (migrated.current || lines.length === 0) return;

    const partials = lines.filter((l) => l.kind === 'perfume' && l.items.length < BOX_SIZE);
    migrated.current = true;
    if (partials.length === 0) return;

    const adopted: Drafts = { 1: [], 2: [], 3: [] };
    for (const line of partials) {
      const tier = line.tier as Tier | null;
      if (!tier || !(tier in adopted)) continue;
      if (adopted[tier].length > 0) continue; // first partial per tier wins
      // Only adopt slugs the grid can actually render, otherwise the counter and
      // the empty slots disagree (a removed or renamed product leaves a ghost).
      const available = new Set((byTierRef.current[String(tier)] ?? []).map((p) => p.slug));
      adopted[tier] = [...new Set(line.items)].filter((slug) => available.has(slug)).slice(0, BOX_SIZE);
    }
    setDrafts((d) => ({ ...d, ...adopted }));
    partials.forEach((line) => removeLine(line.id));
  }, [lines, removeLine]);

  const togglePick = (slug: string) => {
    setJustAdded(false);
    setDrafts((d) => {
      const cur = d[activeTier];
      if (cur.includes(slug)) return { ...d, [activeTier]: cur.filter((s) => s !== slug) };
      if (cur.length >= BOX_SIZE) return d; // full: no fifth pick
      return { ...d, [activeTier]: [...cur, slug] };
    });
  };

  const isSelected = (slug: string) => selected.includes(slug);

  /** Complete sets already in the cart for a tier. */
  const setsInCart = (tier: Tier) =>
    lines.filter((l) => l.kind === 'perfume' && l.tier === tier && l.items.length === BOX_SIZE).length;

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
          const inCart = setsInCart(t.tier);
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
              {drafts[t.tier].length > 0 && <span className="tiercard__count">{drafts[t.tier].length}/{BOX_SIZE}</span>}
              {inCart > 0 && <span className="tiercard__count">{inCart} in cart</span>}
            </button>
          );
        })}
      </div>

      <div className="builder__layout">
        {/* Product grid */}
        <div className="builder__grid-wrap">
          <div className="builder__gridhead">
            <h2 className="serif">{TIERS[activeTier - 1].label} — choose {BOX_SIZE}</h2>
            <button
              className="builder__clear link-red"
              onClick={() => { setDrafts((d) => ({ ...d, [activeTier]: [] })); setJustAdded(false); }}
              disabled={selected.length === 0}
            >
              Clear selection
            </button>
          </div>

          {products.length === 0 ? (
            <p className="empty">No scents in this tier yet.</p>
          ) : (
            <div className="builder__grid">
              {products.map((p) => {
                const sel = isSelected(p.slug);
                const disabled = !sel && full; // a full set takes no fifth pick
                return (
                  <button
                    key={p.id}
                    className={`bcard ${sel ? 'is-selected' : ''}`}
                    onClick={() => !disabled && togglePick(p.slug)}
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
                          onClick={() => togglePick(prod.slug)}
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
                addLine('perfume', activeTier, selected, qty);
                setDrafts((d) => ({ ...d, [activeTier]: [] }));
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
