import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURES, TIER_TABS } from '../config/site.js';
import { formatNaira } from '../lib/format.js';
import { useApi } from '../lib/useApi.js';
import { HeartIcon } from './Icons.jsx';
import ProductImage from './ProductImage.jsx';

export default function TierShowcase() {
  const [tier, setTier] = useState(TIER_TABS[0].tier);
  const { status, data } = useApi('/perfumes', { tier, limit: 4, inStock: true });
  const config = useApi('/config');
  const items = data?.items ?? [];

  // Perfumes carry no price of their own — the price is the tier's box price.
  const boxPrice = formatNaira(config.data?.tierBoxPrice?.[tier]);
  const boxSize = config.data?.boxSize ?? 4;

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
              Box of {boxSize} · <strong>{boxPrice}</strong>
            </p>
          )}
        </div>

        <div className="tier-grid" id="tier-panel" role="tabpanel" aria-labelledby={`tier-tab-${tier}`}>
          {status === 'loading' &&
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} aria-hidden="true">
                <div className="skeleton skeleton--card" />
                <div className="skeleton skeleton--line" />
              </div>
            ))}

          {status === 'error' && <p className="empty">We couldn't load this tier. Please refresh.</p>}
          {status === 'ready' && items.length === 0 && <p className="empty">No scents in this tier yet.</p>}

          {items.map((p) => (
            <article className="tier-card" key={p.id}>
              <Link to={`/perfumes/${p.slug}`}>
                <div className="tier-card__tile">
                  {FEATURES.wishlist && (
                    <span className="tier-card__heart" aria-hidden="true">
                      <HeartIcon width={14} height={14} />
                    </span>
                  )}
                  <ProductImage src={p.imageUrl} alt={p.name} />
                </div>
                <p className="tier-card__family">{p.scentProfile || p.brand}</p>
                <h3 className="serif tier-card__name">{p.name}</h3>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
