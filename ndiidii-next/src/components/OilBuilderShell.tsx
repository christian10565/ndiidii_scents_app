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
import { BagIcon, CheckIcon, ChevronDown } from './Icons';
import type { Oil } from '@/lib/catalog';
import type { OilCategory } from '@/lib/mappers';

const TYPES: OilCategory[] = ['designer', 'niche'];

/**
 * Oil Collection Builder — laid out to the client's mockup
 * ("Perfume oils Collection Builder (4).pdf"):
 *
 *   dark hero ("Build Your Collection")
 *   → "Retail size" selector (three bottle formats, radio-style)
 *   → "Perfume oils — choose your fragrance collection" (two accordions:
 *     Designer / Niche-High End, the active one expanded into a list)
 *   → "Your Oil Set" summary + "Continue to Checkout"
 *
 * A set is 4 bottles of ONE collection type in ONE bottle format, priced by the
 * (type, format) cell in OIL_SET_PRICE_NGN — the panel total and the cart line
 * always agree. In-progress picks live in local state; switching collection
 * clears the draft (different pool), switching format keeps it (only price).
 *
 * The mockup's two sizes ("6ml roller", "10 spray") are overridden by the
 * written spec: three formats (5ml roller / 10ml spray / 10ml roller).
 *
 * Oils carry NO imagery — copyright — so the list is text-only.
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
  // The page keys this component on those params, so a new handoff remounts.
  const seed = useMemo(() => {
    const oil = initialAdd ? oils.find((o) => o.slug === initialAdd) : undefined;
    const type: OilCategory =
      oil?.category ?? (initialType === 'niche' || initialType === 'designer' ? initialType : 'designer');
    return { type, draft: oil ? [oil.slug] : [] };
  }, [initialAdd, initialType, oils]);

  const [oilType, setOilType] = useState<OilCategory>(seed.type);
  const [openType, setOpenType] = useState<OilCategory | null>(seed.type);
  const [format, setFormat] = useState<OilFormat>('5ml-roller');
  const [draft, setDraft] = useState<string[]>(seed.draft);
  const [qtyStr, setQtyStr] = useState('1');
  const [justAdded, setJustAdded] = useState(false);

  const full = draft.length === BOX_SIZE;
  const price = oilSetPrice(oilType, format);
  // Active collection's oils, alphabetical by brand then name.
  const pool = useMemo(
    () =>
      oils
        .filter((o) => o.category === oilType)
        .sort((a, b) => {
          const ba = (a.brand ?? '').toLowerCase();
          const bb = (b.brand ?? '').toLowerCase();
          return ba !== bb ? ba.localeCompare(bb) : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }),
    [oils, oilType],
  );
  const bySlug = useMemo(() => new Map(oils.map((o) => [o.slug, o])), [oils]);

  /** Toggle a collection accordion. Opening one makes it the active type. */
  const toggleCollection = (t: OilCategory) => {
    if (openType === t) {
      setOpenType(null); // collapse — both can be closed
      return;
    }
    setOpenType(t);
    if (t !== oilType) {
      // Different pool entirely — the draft cannot carry over.
      setOilType(t);
      setDraft([]);
      setJustAdded(false);
    }
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

  const activeFormatLabel = OIL_FORMATS.find((f) => f.value === format)?.label ?? format;

  return (
    <>
      {/* ---- hero: full-bleed banner (bottles right, blurred neutral left) ---- */}
      <header
        className="ob-hero"
        style={{ backgroundImage: "url('/images/oil-builder-hero.png')" }}
      >
        <div className="ob-hero__shade" />
        <div className="container ob-hero__inner">
          <h1 className="serif ob-hero__title">Build Your Collection</h1>
          <p className="ob-hero__sub">
            Either let us surprise you, or choose every oil yourself from our Designer and Niche
            collections.
          </p>
        </div>
      </header>

      <div className="container oilbuilder">
        <nav className="builder__crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/collection-builder">Collection Builder</Link> /{' '}
          <span>Perfume Oils</span>
        </nav>

        <p className="ob-intro">
          Each set contains 4 perfume oils. Choose your bottle size and fragrance collection below.
        </p>

      {/* ---- retail size ---- */}
      <section className="ob-card" aria-labelledby="ob-size">
        <h2 id="ob-size" className="ob-label eyebrow">
          Retail Size
        </h2>
        <div className="ob-sizes" role="radiogroup" aria-label="Bottle size">
          {OIL_FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={format === f.value}
              className={`ob-size ${format === f.value ? 'is-active' : ''}`}
              onClick={() => setFormat(f.value)}
            >
              <span className="ob-size__dot" aria-hidden="true" />
              <span className="ob-size__label">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---- choose your fragrance collection ---- */}
      <section className="ob-card" aria-labelledby="ob-type">
        <p className="ob-label eyebrow">Perfume Oils</p>
        <h2 id="ob-type" className="ob-title serif">
          Choose your fragrance collection
        </h2>

        {TYPES.map((t) => {
          const active = openType === t;
          const list = active ? pool : [];
          return (
            <div key={t} className={`ob-acc ${active ? 'is-open' : ''}`}>
              <button
                type="button"
                className="ob-acc__head"
                onClick={() => toggleCollection(t)}
                aria-expanded={active}
              >
                <span className="ob-acc__title serif">{OIL_TYPE_LABELS[t]}</span>
                <ChevronDown className={`ob-acc__chev ${active ? 'is-flipped' : ''}`} width={18} height={18} />
              </button>
              {active && (
                <div className="ob-acc__body">
                  <p className="ob-acc__sub">
                    {t === 'designer' ? 'Designer Perfume Oils' : 'Niche & High-End Oils'}
                  </p>
                  {list.length === 0 ? (
                    <p className="ob-empty">No oils in this collection yet.</p>
                  ) : (
                    <div className="ob-list">
                      {list.map((o) => {
                        const sel = draft.includes(o.slug);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={`ob-row ${sel ? 'is-selected' : ''}`}
                            onClick={() => togglePick(o.slug)}
                            aria-pressed={sel}
                          >
                            <span className="ob-row__check" aria-hidden="true">
                              {sel && <CheckIcon width={13} height={13} />}
                            </span>
                            <span className="ob-row__name">
                              {o.brand ? `${o.brand} - ${o.name}` : o.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ---- your set ---- */}
      <aside className="ob-summary" aria-label="Your set">
        <div className="yourset__inner">
          <div className="ob-summary__head">
            <p className="yourset__title eyebrow">Your Oil Set</p>
            <p className="yourset__tier">
              {draft.length} of {BOX_SIZE} selected
              <br />
              <span>
                {OIL_TYPE_LABELS[oilType]} · {activeFormatLabel}
              </span>
            </p>
            <div className="ob-summary__actions">
              <button type="button" className="link-red" onClick={surpriseMe} disabled={full}>
                Surprise me
              </button>
              <button
                type="button"
                className="link-red"
                onClick={() => {
                  setDraft([]);
                  setJustAdded(false);
                }}
                disabled={draft.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

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
            <button type="button" className="ob-cta-checkout" onClick={() => router.push('/checkout')}>
              Continue to Checkout
            </button>
          )}
        </div>
      </aside>
      </div>
    </>
  );
}
