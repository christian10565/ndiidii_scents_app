'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, TIER_LABELS, type Tier } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon } from './Icons';
import { useState } from 'react';
import type { Perfume } from '@/lib/catalog';

export default function PerfumeCartSet({
  slug,
  tier,
  perfumes,
}: {
  slug: string;
  tier: Tier;
  perfumes: Perfume[];
}) {
  const { draftCount, toggleDraft, clearDraft, addSetToCart } = useCart();
  const [qtyStr, setQtyStr] = useState('1');
  const [added, setAdded] = useState(false);

  const count = draftCount(tier);
  const selected = useCart().drafts[tier];
  const full = count === BOX_SIZE;
  const price = TIER_BOX_PRICE_NGN[tier];

  const bySlug = new Map(perfumes.map((p) => [p.slug, p]));
  const activeProduct = bySlug.get(slug) ?? null;
  const isActiveSelected = selected.includes(slug);

  return (
    <div className="pdp__cart-panel">
      <p className="pdp__cart-panel-title">{TIER_LABELS[tier]} Set</p>
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
          onClick={() => activeProduct && toggleDraft(tier, slug)}
          disabled={!activeProduct}
        >
          {isActiveSelected ? 'Remove' : 'Add to set'}
        </button>
      </div>

      <ul className="pdp__cart-panel-slots">
        {Array.from({ length: BOX_SIZE }, (_, i) => {
          const slotSlug = selected[i];
          const product = slotSlug ? bySlug.get(slotSlug) ?? null : null;
          return (
            <li
              key={i}
              className={`pdp__cart-panel-slot ${product ? 'is-filled' : 'is-empty'} ${i >= count ? 'is-locked' : ''}`}
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
            <>{count}/{BOX_SIZE} selected — ready to add</>
          ) : (
            <>Pick {BOX_SIZE - count} more</>
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
            addSetToCart(tier, Number(qtyStr) || 1);
            setAdded(true);
          }}
        >
          <BagIcon width={16} height={16} />
          {full ? 'Add Set to Cart' : `${BOX_SIZE - count} more needed`}
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
        {count > 0 && !full && (
          <p className="pdp__cart-panel-hint">Continue browsing to add more decants to this set.</p>
        )}
        {count > 0 && (
          <button
            type="button"
            className="pdp__cart-panel-clear"
            onClick={() => clearDraft(tier)}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
