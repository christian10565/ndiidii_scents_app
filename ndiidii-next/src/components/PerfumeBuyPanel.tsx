'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, TIER_LABELS, type Tier } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import { BagIcon } from './Icons';

/**
 * The two ways to buy a perfume, on its product page:
 *
 *  1. A decant inside a tier set — hands off to the collection builder, which
 *     owns the draft (see AGENTS.md: builders keep picks in local state). The
 *     slug rides in the query string and the builder adopts it on mount.
 *  2. A full bottle on its own — priced from the sheet's `Price` column and
 *     added straight to the cart.
 *
 * This component is prerendered once per product, so it must never read
 * `Date.now()` at render time (Next 16 rejects unstable values at build).
 */
export default function PerfumeBuyPanel({
  slug,
  name,
  brand,
  tier,
  bottlePrice,
  inStock,
}: {
  slug: string;
  name: string;
  brand: string | null;
  tier: Tier | null;
  bottlePrice: number | null;
  inStock: boolean;
}) {
  const { addBottle, bottles } = useCart();
  const [qtyStr, setQtyStr] = useState('1');
  const [added, setAdded] = useState(false);

  const canBuyBottle = inStock && (bottlePrice ?? 0) > 0;
  const canBuildSet = inStock && tier !== null;
  const bottleQty = bottles.find((b) => b.slug === slug)?.qty ?? 0;
  const decantPrice = tier !== null ? TIER_BOX_PRICE_NGN[tier] : null;

  return (
    <div className="pdp__cart-panel">
      <p className="pdp__cart-panel-title">Two sizes</p>
      <p className="pdp__cart-panel-sub">
        Four decants make a set. Or take the full bottle on its own.
      </p>

      <div className="pdp__buy-options">
        {/* ---- Decant ---- */}
        <div className={`pdp__buy ${canBuildSet ? '' : 'is-disabled'}`}>
          <span className="pdp__buy-eyebrow eyebrow">Decant</span>
          <span className="pdp__buy-price serif">
            {decantPrice !== null ? formatNaira(decantPrice) : '—'}
            <small>{decantPrice !== null ? ` · set of ${BOX_SIZE}` : ' not in a tier'}</small>
          </span>
          {canBuildSet ? (
            <Link
              className="btn btn--ghost-dark pdp__buy-cta"
              href={`/collection-builder?add=${encodeURIComponent(slug)}&tier=${tier}`}
            >
              Add decant to set
            </Link>
          ) : (
            <span className="pdp__buy-note">Decants are only sold as tier sets.</span>
          )}
        </div>

        {/* ---- Full bottle ---- */}
        <div className={`pdp__buy ${canBuyBottle ? '' : 'is-disabled'}`}>
          <span className="pdp__buy-eyebrow eyebrow">Full bottle</span>
          <span className="pdp__buy-price serif">
            {canBuyBottle ? formatNaira(bottlePrice!) : '—'}
          </span>
          {canBuyBottle ? (
            <>
              <label className="pdp__cart-panel-qty">
                <span>Qty</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={qtyStr}
                  onChange={(e) => setQtyStr(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn--white pdp__buy-cta"
                onClick={() => {
                  addBottle({ slug, name, brand, tier, unitPrice: bottlePrice! }, Number(qtyStr) || 1);
                  setAdded(true);
                }}
              >
                <BagIcon width={16} height={16} />
                Buy full bottle
              </button>
            </>
          ) : (
            <span className="pdp__buy-note">
              {inStock ? 'Full-bottle price coming soon.' : 'Out of stock.'}
            </span>
          )}
        </div>
      </div>

      {bottleQty > 0 && (
        <p className="pdp__cart-panel-status">
          <span>
            {bottleQty} bottle{bottleQty > 1 ? 's' : ''} in cart
            {tier !== null ? ` · ${TIER_LABELS[tier]} decants available` : ''}
          </span>
        </p>
      )}

      {added && (
        <button
          type="button"
          className="pdp__cart-panel-checkout"
          onClick={() => {
            window.location.href = '/checkout';
          }}
        >
          Go to Checkout
        </button>
      )}

      {canBuildSet && (
        <p className="pdp__cart-panel-hint">
          Sets are built four at a time in the{' '}
          <Link href={`/collection-builder?tier=${tier}`} className="link-red">
            Collection Builder
          </Link>
          .
        </p>
      )}
    </div>
  );
}
