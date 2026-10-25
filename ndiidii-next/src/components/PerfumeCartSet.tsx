'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, TIER_LABELS, type Tier } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon } from './Icons';
import { useState } from 'react';
import type { ProductRef } from '@/lib/shopCards';

export default function PerfumeCartSet({
  slug,
  tier,
  perfumes,
}: {
  slug: string;
  tier: Tier;
  perfumes: ProductRef[];
}) {
  const { linesFor, toggleLine, removeLine, setQty } = useCart();
  const [qtyStr, setQtyStr] = useState('1');
  const [added, setAdded] = useState(false);

  const tierLines = linesFor('perfume', tier);
  const activeLine = tierLines.find((l) => l.items.length < BOX_SIZE) ?? tierLines[tierLines.length - 1] ?? null;
  // Stable fallback id: this component is prerendered once per product, so a
  // `Date.now()` fallback is a prerender-time value (Next rejects it) and a
  // hydration mismatch. It is only ever used when no line exists, where the
  // qty/remove handlers are unreachable anyway.
  const activeLineId = activeLine?.id ?? `perfume-${tier}-new`;
  const selected = activeLine?.items ?? [];
  const full = selected.length === BOX_SIZE;
  const price = TIER_BOX_PRICE_NGN[tier];
  const activeProduct = perfumes.find((p) => p.slug === slug) ?? null;
  const isSelected = selected.includes(slug);

  return (
    <div className="pdp__cart-panel">
      <p className="pdp__cart-panel-title">{TIER_BOX_PRICE_NGN[tier] ? `${TIER_LABELS[tier]} Set` : 'Set'}</p>
      <p className="pdp__cart-panel-sub">Pick {BOX_SIZE} decants to add a set</p>

      <div className="pdp__cart-panel-active">
        <span className="pdp__cart-panel-active-thumb">
          {activeProduct ? (
            <ProductImage src={activeProduct.imageUrl} alt={activeProduct.name} />
          ) : (
            <span className="pdp__cart-panel-slot-empty" aria-hidden="true">?</span>
          )}
        </span>
        <span className="pdp__cart-panel-active-name">
          {activeProduct ? activeProduct.name : 'Select a perfume'}
        </span>
        <button
          type="button"
          className="pdp__cart-panel-active-toggle"
          onClick={() => activeProduct && toggleLine('perfume', tier, slug)}
          disabled={!activeProduct}
        >
          {isSelected ? 'Remove' : 'Add to set'}
        </button>
      </div>

      <ul className="pdp__cart-panel-slots">
        {Array.from({ length: BOX_SIZE }, (_, i) => {
          const slotSlug = selected[i];
          const product = slotSlug ? perfumes.find((p) => p.slug === slotSlug) ?? null : null;
          return (
            <li
              key={i}
              className={`pdp__cart-panel-slot ${product ? 'is-filled' : 'is-empty'} ${i >= selected.length ? 'is-locked' : ''}`}
            >
              <span className="pdp__cart-panel-slot-thumb">
                {product ? (
                  <ProductImage src={product.imageUrl} alt={product.name} />
                ) : (
                  <span className="pdp__cart-panel-slot-empty" aria-hidden="true">?</span>
                )}
              </span>
              <span className="pdp__cart-panel-slot-name">
                {product ? product.name : `Decant ${i + 1}`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="pdp__cart-panel-status">
        <span>
          {full ? (
            <>{selected.length}/{BOX_SIZE} selected — ready to add</>
          ) : (
            <>Pick {BOX_SIZE - selected.length} more</>
          )}
        </span>
        <span>{formatNaira(price)}</span>
      </div>

      <div className="pdp__cart-panel-footer">
        <label className="pdp__cart-panel-qty">
          <span>Qty</span>
          <input
            type="number"
            min={1}
            max={99}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="pdp__cart-panel-cta"
          disabled={!full}
          onClick={() => {
            setQty(activeLineId, Number(qtyStr) || 1);
            setAdded(true);
          }}
        >
          <BagIcon width={16} height={16} />
          {full ? 'Add Set to Cart' : `${BOX_SIZE - selected.length} more needed`}
        </button>
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
        {selected.length > 0 && !full && (
          <p className="pdp__cart-panel-hint">Continue browsing to add more decants to this set.</p>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            className="pdp__cart-panel-clear"
            onClick={() => activeLineId && removeLine(activeLineId)}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
