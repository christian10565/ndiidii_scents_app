'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FEATURES, TIER_TABS } from '@/config/site';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE, TIER_BOX_PRICE_NGN } from '@/lib/store.config';
import { HeartIcon } from './Icons';
import ProductImage from './ProductImage';
import type { Perfume } from '@/lib/catalog';

/** The interactive tier tabs. Data arrives already grouped from the server. */
export function TierShowcaseTabs({ byTier }: { byTier: Record<string, Perfume[]> }) {
  const [tier, setTier] = useState<number>(TIER_TABS[0].tier);
  const items = (byTier[String(tier)] ?? []).slice(0, 4);

  // Perfumes carry no price of their own — the price is the tier's box price.
  const boxPrice = formatNaira(TIER_BOX_PRICE_NGN[tier as 1 | 2 | 3]);

  return (
    <section className="section tiers">
      <div className="container">
        <p className="eyebrow tiers__eyebrow">Every tier</p>
        <h2 className="serif section-title">Something For Every Occasion</h2>

        <div className="tabs-row">
          <div className="tabs" role="tablist" aria-label="Tier">
            {TIER_TABS.map((t) => (
              <button
                key={t.tier}
                role="tab"
                id={`tier-tab-${t.tier}`}
                aria-selected={tier === t.tier}
                aria-controls="tier-panel"
                className={tier === t.tier ? 'is-active' : ''}
                onClick={() => setTier(t.tier)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {boxPrice && (
            <p className="tabs-row__price" aria-live="polite">
              Box of {BOX_SIZE} · <strong>{boxPrice}</strong>
            </p>
          )}
        </div>

        <div className="tier-grid" id="tier-panel" role="tabpanel" aria-labelledby={`tier-tab-${tier}`}>
          {items.length === 0 && <p className="empty">No scents in this tier yet.</p>}

          {items.map((p) => (
            <article className="tier-card" key={p.id}>
              <Link href={`/perfumes/${p.slug}`}>
                <div className="tier-card__tile">
                  {FEATURES.wishlist && (
                    <span className="tier-card__heart" aria-hidden="true">
                      <HeartIcon width={14} height={14} />
                    </span>
                  )}
                  <ProductImage src={p.imageUrl} alt={p.name} />
                </div>
                <h3 className="serif tier-card__name">{p.name}</h3>
                <p className="tier-card__family">{p.brand}</p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
