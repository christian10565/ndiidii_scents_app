'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE, OIL_BOX_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon } from './Icons';
import { useState, useEffect } from 'react';
import type { Oil } from '@/lib/catalog';

export default function OilCartSet({ oils, slug, name, imageUrl }: { oils: Oil[]; slug: string; name: string; imageUrl: string | null }) {
  const { linesFor, toggleLine, removeLine, setQty } = useCart();
  const [qtyStr, setQtyStr] = useState('1');
  const [added, setAdded] = useState(false);

  const oilLines = linesFor('oil');
  const activeLine = oilLines.find((l) => l.items.length < BOX_SIZE) ?? oilLines[oilLines.length - 1] ?? null;
  const activeLineId = activeLine?.id ?? `oil-${Date.now()}`;
  const selected = activeLine?.items ?? [];
  const full = selected.length === BOX_SIZE;
  const price = OIL_BOX_PRICE_NGN ?? 0;
  const active = selected.includes(slug);

  const oilBySlug = new Map(oils.map((o) => [o.slug, o]));
  const activeProduct = oilBySlug.get(slug) ?? null;

  useEffect(() => {
    const missing = selected.filter((s) => !oilBySlug.has(s));
    if (missing.length) {
      console.warn('[OilCartSet] selected slugs missing from oils catalog:', missing);
      console.warn('[OilCartSet] selected:', selected);
      console.warn('[OilCartSet] available oil slugs:', oils.map((o) => o.slug));
    }
  }, [selected, oils, oilBySlug]);

  const handleAddSet = () => {
    if (selected.length < BOX_SIZE) return;
    setQty(activeLineId, Number(qtyStr) || 1);
    setAdded(true);
  };

  return (
    <div className="pdp__cart-panel">
      <p className="pdp__cart-panel-title">Oil Set</p>
      <p className="pdp__cart-panel-sub">Pick {BOX_SIZE} oils to add a set</p>

      <div className="pdp__cart-panel-active">
        <span className="pdp__cart-panel-active-thumb">
          {activeProduct ? <ProductImage src={activeProduct.imageUrl} alt={activeProduct.name} /> : <div className="slot__thumb--empty" />}
        </span>
        <span className="pdp__cart-panel-active-name">{activeProduct?.name ?? name}</span>
        <button
          type="button"
          className="pdp__cart-panel-active-toggle"
          onClick={() => toggleLine('oil', null, slug)}
        >
          {active ? 'Remove' : 'Add to set'}
        </button>
      </div>

      <ul className="pdp__cart-panel-slots">
        {Array.from({ length: BOX_SIZE }, (_, i) => {
          const slotSlug = selected[i];
          const selectedProduct = slotSlug ? oilBySlug.get(slotSlug) ?? null : null;
          return (
            <li
              key={i}
              className={`pdp__cart-panel-slot ${selectedProduct ? 'is-filled' : 'is-empty'} ${i >= selected.length ? 'is-locked' : ''}`}
            >
              <span className="pdp__cart-panel-slot-thumb">
                {selectedProduct ? (
                  <ProductImage src={selectedProduct.imageUrl} alt={selectedProduct.name} />
                ) : (
                  <span className="pdp__cart-panel-slot-empty" aria-hidden="true">?</span>
                )}
              </span>
              <span className="pdp__cart-panel-slot-name">
                {selectedProduct ? selectedProduct.name : `Oil ${i + 1}`}
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
        <span>{formatNaira(selected.length * price)}</span>
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
          onClick={handleAddSet}
        >
          <BagIcon width={16} height={16} />
          {full ? 'Add Oil Set to Cart' : `${BOX_SIZE - selected.length} more needed`}
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
          <p className="pdp__cart-panel-hint">Continue browsing to add more oils to this set.</p>
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
