'use client';

import { useCart } from '@/lib/cart';
import { BOX_SIZE } from '@/lib/store.config';

// Client-only rendering of the in-progress "set" counters + add-to-cart action.
// Kept self-contained so it can be lifted into any page that needs the same UI.
export default function PerfumeCartSet({
  slug,
  tier,
}: {
  slug: string;
  tier: 1 | 2 | 3;
}) {
  const { draftCount, toggleDraft, clearDraft } = useCart();

  return (
    <div className="pdp__cartset" aria-label="In-progress set">
      <p className="pdp__cartset-label">Current set</p>
      <p className="pdp__cartset-count">
        {draftCount(tier)} of {BOX_SIZE}
      </p>
      <button
        type="button"
        className="btn btn--white pdp__add"
        onClick={() => toggleDraft(tier, slug)}
        disabled={draftCount(tier) >= BOX_SIZE}
      >
        {draftCount(tier) >= BOX_SIZE
          ? 'Set full — go to checkout'
          : `Add to cart (${BOX_SIZE - draftCount(tier)} left)`}
      </button>
      {draftCount(tier) > 0 && (
        <button
          type="button"
          className="pdp__cartset-clear"
          onClick={() => clearDraft(tier)}
          aria-label="Clear current set"
        >
          clear
        </button>
      )}
    </div>
  );
}
