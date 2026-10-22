'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE } from '@/lib/store.config';

// Client-only rendering of the in-progress "oil set" counters + add-to-cart
// action. Oil sets have no tier — the draft carries plain product slugs.
export default function OilCartSet({ slug }: { slug: string }) {
  const { oilsSetCount, toggleOil, clearOil } = useCart();

  return (
    <div className="pdp__cartset" aria-label="In-progress oil set">
      <p className="pdp__cartset-label">Current set</p>
      <p className="pdp__cartset-count">{oilsSetCount()} of {BOX_SIZE}</p>
      <button
        type="button"
        className="btn btn--white pdp__add"
        onClick={() => toggleOil(slug)}
        disabled={oilsSetCount() >= BOX_SIZE}
      >
        {oilsSetCount() >= BOX_SIZE
          ? 'Set full — go to checkout'
          : `Pick ${BOX_SIZE - oilsSetCount()} more`}
      </button>
      {oilsSetCount() > 0 && (
        <button
          type="button"
          className="pdp__cartset-clear"
          onClick={() => clearOil()}
          aria-label="Clear current oil set"
        >
          clear
        </button>
      )}
    </div>
  );
}
