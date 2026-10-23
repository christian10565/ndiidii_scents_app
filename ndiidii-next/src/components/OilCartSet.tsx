'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE, OIL_BOX_PRICE_NGN } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from './ProductImage';
import { BagIcon } from './Icons';
import { useState } from 'react';

export default function OilCartSet({ slug, name, imageUrl }: { slug: string; name: string; imageUrl: string | null }) {
  const { oils, toggleOil, clearOil, addOilSetToCart } = useCart();
  const [qtyStr, setQtyStr] = useState('1');
  const [added, setAdded] = useState(false);

  const selectedCount = oils.length;
  const setReady = selectedCount >= BOX_SIZE;
  const price = OIL_BOX_PRICE_NGN ?? 0;
  const active = oils.includes(slug);

  const handleAddSet = () => {
    if (selectedCount < BOX_SIZE) return;
    addOilSetToCart(Number(qtyStr) || 1);
    setAdded(true);
  };

  return (
    <div className="pdp__cart-panel">
      <p className="pdp__cart-panel-title">Oil Set</p>
      <p className="pdp__cart-panel-sub">Pick {BOX_SIZE} oils to add a set</p>

      <div className="pdp__cart-panel-active">
        <span className="pdp__cart-panel-active-thumb">
          {imageUrl ? <ProductImage src={imageUrl} alt={name} /> : <div className="slot__thumb--empty" />}
        </span>
        <span className="pdp__cart-panel-active-name">{name}</span>
        <button
          type="button"
          className="pdp__cart-panel-active-toggle"
          onClick={() => toggleOil(slug)}
        >
          {active ? 'Remove' : 'Add to set'}
        </button>
      </div>

      <ul className="pdp__cart-panel-slots">
        {Array.from({ length: BOX_SIZE }, (_, i) => {
          const slotSlug = oils[i];
          const selectedProduct = slotSlug ? { slug: slotSlug, name } : null;
          return (
            <li
              key={i}
              className={`pdp__cart-panel-slot ${selectedProduct ? 'is-filled' : 'is-empty'} ${i >= selectedCount ? 'is-locked' : ''}`}
            >
              <span className="pdp__cart-panel-slot-thumb">
                {selectedProduct ? (
                  <ProductImage src={imageUrl ?? ''} alt={selectedProduct.name} />
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
          {setReady ? (
            <>{selectedCount}/{BOX_SIZE} selected — ready to add</>
          ) : (
            <>Pick {BOX_SIZE - selectedCount} more</>
          )}
        </span>
        <span>{formatNaira(selectedCount * price)}</span>
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
          disabled={!setReady}
          onClick={handleAddSet}
        >
          <BagIcon width={16} height={16} />
          {setReady ? 'Add Oil Set to Cart' : `${BOX_SIZE - selectedCount} more needed`}
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
        {selectedCount > 0 && !setReady && (
          <p className="pdp__cart-panel-hint">Continue browsing to add more oils to this set.</p>
        )}
        {selectedCount > 0 && (
          <button
            type="button"
            className="pdp__cart-panel-clear"
            onClick={clearOil}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
