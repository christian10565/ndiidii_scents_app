'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import {
  BOX_SIZE,
  OIL_FORMATS,
  OIL_TYPE_LABELS,
  oilSetPrice,
  type OilFormat,
} from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import Monogram from './Monogram';
import { BagIcon, CheckIcon } from './Icons';
import type { Oil } from '@/lib/catalog';
import type { OilCategory } from '@/lib/mappers';

const TYPES: OilCategory[] = ['designer', 'niche'];

/**
 * Oil Collection Builder — redesigned for the two-type / three-format model.
 *
 * A set is 4 bottles of ONE collection type in ONE bottle format:
 *   Designer | Niche  x  5ml roller | 10ml spray | 10ml roller
 * The price is the (type, format) cell in OIL_SET_PRICE_NGN, and that is exactly
 * what "Add Set to Cart" writes — the panel total and the cart line always agree.
 *
 * In-progress picks live in local state (see AGENTS.md: builders own their
 * drafts). Switching type clears the draft because the pools don't overlap;
 * switching format keeps it because only the price changes.
 *
 * Oils carry NO imagery — copyright — so every surface here is a monogram card.
 */
export function OilBuilderShell({
  oils,
  initialAdd,
  initialType,
}: {
  oils: Oil[];
  initialAdd?: string;
  initialType?: string;
}) {
  const router = useRouter();
  const { addLine } = useCart();

  // Seed from a PDP handoff: /collection-builder/oils?add=<slug>&type=<niche|designer>.
  // The page keys this component on those params, so a new handoff remounts and
  // re-seeds instead of leaving a stale draft on screen.
  const seed = useMemo(() => {
    const oil = initialAdd ? oils.find((o) => o.slug === initialAdd) : undefined;
    const type: OilCategory =
      oil?.category ?? (initialType === 'niche' || initialType === 'designer' ? initialType : 'designer');
    return { type, draft: oil ? [oil.slug] : [] };
  }, [initialAdd, initialType, oils]);

  const [oilType, setOilType] = useState<OilCategory>(seed.type);
  const [format, setFormat] = useState<OilFormat>('5ml-roller');
  const [draft, setDraft] = useState<string[]>(seed.draft);
  const [qtyStr, setQtyStr] = useState('1');
  const [justAdded, setJustAdded] = useState(false);

  const full = draft.length === BOX_SIZE;
  const price = oilSetPrice(oilType, format);

  const pool = useMemo(() => oils.filter((o) => o.category === oilType), [oils, oilType]);
  const bySlug = useMemo(() => new Map(oils.map((o) => [o.slug, o])), [oils]);

  const pickType = (t: OilCategory) => {
    if (t === oilType) return;
    // Different pool entirely — the draft cannot carry over.
    setOilType(t);
    setDraft([]);
    setJustAdded(false);
  };

  const togglePick = (slug: string) => {
    setJustAdded(false);
    setDraft((cur) => {
      if (cur.includes(slug)) return cur.filter((s) => s !== slug);
      if (cur.length >= BOX_SIZE) return cur; // full: no fifth pick
      return [...cur, slug];
    });
  };

  /** Fill the remaining slots with random oils from the active collection. */
  const surpriseMe = () => {
    setJustAdded(false);
    setDraft((cur) => {
      const remaining = pool.filter((o) => !cur.includes(o.slug) && o.inStock);
      const need = BOX_SIZE - cur.length;
      const shuffled = [...remaining];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return [...cur, ...shuffled.slice(0, need).map((o) => o.slug)];
    });
  };

  return (
    <div className="container builder">
      <nav className="builder__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/collection-builder">Collection Builder</Link> /{' '}
        <span>Perfume Oils</span>
      </nav>

      <header className="builder__head">
        <p className="eyebrow builder__eyebrow">Perfume Oils</p>
        <h1 className="serif builder__title">Build Your Collection</h1>
        <p className="builder__intro">
          Every set contains four perfume oils. Choose your bottle size and fragrance collection
          below — or let us surprise you.
        </p>
      </header>

      {/* ---- Bottle size ---- */}
      <section className="builder__section" aria-labelledby="oil-size">
        <h2 id="oil-size" className="builder__section-title eyebrow">
          Retail size
        </h2>
        <div className="builder__sizes" role="radiogroup" aria-label="Bottle size">
          {OIL_FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={format === f.value}
              className={`sizebtn ${format === f.value ? 'is-active' : ''}`}
              onClick={() => setFormat(f.value)}
            >
              <span className="sizebtn__label">{f.label}</span>
              <span className="sizebtn__price serif">{formatNaira(oilSetPrice(oilType, f.value))}</span>
              <span className="sizebtn__unit">per set of {BOX_SIZE}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---- Collection type ---- */}
      <section className="builder__section" aria-labelledby="oil-type">
        <h2 id="oil-type" className="builder__section-title eyebrow">
          Choose your fragrance collection
        </h2>
        <div className="builder__tiers builder__tiers--two" role="radiogroup" aria-label="Collection">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={oilType === t}
              className={`tiercard ${oilType === t ? 'is-active' : ''}`}
              onClick={() => pickType(t)}
            >
              <span className="tiercard__label eyebrow">{OIL_TYPE_LABELS[t]}</span>
              <span className="tiercard__price serif">{formatNaira(oilSetPrice(t, format))}</span>
              <span className="tiercard__blurb">
                {t === 'designer' ? 'Designer-house oils' : 'Niche & high-end oils'} · set of {BOX_SIZE}
              </span>
              {oilType === t && draft.length > 0 && (
                <span className="tiercard__count">
                  {draft.length}/{BOX_SIZE}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="builder__layout">
        <div className="builder__grid-wrap">
          <div className="builder__gridhead">
            <h2 className="serif">
              {OIL_TYPE_LABELS[oilType]} oils — pick {BOX_SIZE}
            </h2>
            <div className="builder__gridhead-actions">
              <button type="button" className="builder__clear link-red" onClick={surpriseMe} disabled={full}>
                Surprise me
              </button>
              <button
                type="button"
                className="builder__clear link-red"
                onClick={() => {
                  setDraft([]);
                  setJustAdded(false);
                }}
                disabled={draft.length === 0}
              >
                Clear selection
              </button>
            </div>
          </div>

          {pool.length === 0 ? (
            <p className="empty">No oils in this collection yet.</p>
          ) : (
            <div className="builder__grid">
              {pool.map((o) => {
                const sel = draft.includes(o.slug);
                const disabled = !sel && full;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`bcard bcard--text ${sel ? 'is-selected' : ''}`}
                    onClick={() => !disabled && togglePick(o.slug)}
                    disabled={disabled}
                    aria-pressed={sel}
                  >
                    <span className="bcard__img bcard__img--mono">
                      {/* No oil photography — monogram tile only. */}
                      <Monogram name={o.name} className="dnoimg dnoimg--builder" />
                      {sel && (
                        <span className="bcard__check" aria-hidden="true">
                          <CheckIcon width={16} height={16} />
                        </span>
                      )}
                    </span>
                    <span className="bcard__name">{o.name}</span>
                    <span className="bcard__family">{o.brand ?? OIL_TYPE_LABELS[oilType]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="yourset" aria-label="Your set">
          <div className="yourset__inner">
            <p className="yourset__title eyebrow">Your Oil Set</p>
            <p className="yourset__tier">
              {draft.length} of {BOX_SIZE} selected
              <br />
              <span>
                {OIL_TYPE_LABELS[oilType]} ·{' '}
                {OIL_FORMATS.find((f) => f.value === format)?.label ?? format}
              </span>
            </p>

            <div className="yourset__slots">
              {Array.from({ length: BOX_SIZE }, (_, i) => {
                const slug = draft[i];
                const prod = slug ? bySlug.get(slug) : null;
                return (
                  <div key={i} className={`slot ${prod ? 'is-filled' : ''}`}>
                    {prod ? (
                      <>
                        <span className="slot__name">{prod.name}</span>
                        <button
                          type="button"
                          className="slot__remove"
                          aria-label={`Remove ${prod.name}`}
                          onClick={() => togglePick(prod.slug)}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="slot__empty">Oil {i + 1}</span>
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
              className="btn btn--white yourset__cta"
              disabled={!full}
              onClick={() => {
                addLine({
                  kind: 'oil',
                  oilType,
                  oilFormat: format,
                  items: draft,
                  qty: Number(qtyStr) || 1,
                });
                setDraft([]);
                setJustAdded(true);
              }}
            >
              <BagIcon width={16} height={16} />
              {full ? 'Add Oil Set to Cart' : `Pick ${Math.max(0, BOX_SIZE - draft.length)} More`}
            </button>
            {justAdded && (
              <button type="button" className="yourset__checkout link-red" onClick={() => router.push('/checkout')}>
                Go to Checkout
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
