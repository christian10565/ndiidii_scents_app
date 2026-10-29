'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import {
  BOX_SIZE,
  NIGERIA_STATES,
  OIL_FORMATS,
  OIL_TYPE_LABELS,
  TIER_LABELS,
  type OilFormat,
  type Tier,
} from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import { payloadFromCart, quoteFromCart, totalsOf } from '@/lib/quote';
import ProductImage from '@/components/ProductImage';
import Monogram from '@/components/Monogram';

const TIER_LABEL: Record<Tier, string> = TIER_LABELS;

const oilLabel = (type: string | null, format: OilFormat | null) =>
  `${type ? OIL_TYPE_LABELS[type as keyof typeof OIL_TYPE_LABELS] : 'Oil'} · ${
    OIL_FORMATS.find((f) => f.value === format)?.label ?? 'bottle'
  }`;

function LineThumbs({ slugs, catalog }: { slugs: string[]; catalog: { slug: string; name: string; imageUrl: string | null }[] }) {
  const items = slugs.map((s) => catalog.find((p) => p.slug === s)).filter(Boolean) as typeof catalog;
  return (
    <div className="cline__thumbs">
      {items.map((p) => (
        <span key={p.slug} className="cline__thumb" title={p.name}>
          {p.imageUrl ? <ProductImage src={p.imageUrl} alt={p.name} /> : <Monogram name={p.name} className="dnoimg dnoimg--thumb" />}
        </span>
      ))}
    </div>
  );
}

export default function CheckoutClient({
  catalog,
  testMode = false,
}: {
  catalog: { slug: string; name: string; imageUrl: string | null }[];
  testMode?: boolean;
}) {
  const {
    lines,
    bottles,
    discovery,
    removeLine,
    setQty,
    removeBottle,
    setBottleQty,
    removeDiscovery,
    setDiscoveryQty,
    clearCart,
    canCheckout,
  } = useCart();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState('');
  const [giftApplied, setGiftApplied] = useState<{ code: string; balance: number } | null>(null);
  const [giftChecking, setGiftChecking] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    const handler = () => setTick((n) => n + 1);
    window.addEventListener('ndiidii-cart-change', handler);
    return () => window.removeEventListener('ndiidii-cart-change', handler);
  }, []);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    notes: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Same math as the server (lib/quote.ts) — this is a preview, not the charge.
  const quoteLines = quoteFromCart(lines, bottles, discovery, {
    perfume: (tier) => `${tier !== null ? TIER_LABEL[tier] : 'Perfume'} · ${BOX_SIZE} decants`,
    oil: oilLabel,
  });
  const totals = totalsOf(quoteLines);
  const giftCredit = giftApplied ? Math.min(giftApplied.balance, totals.grandTotal) : 0;
  const total = totals.grandTotal - giftCredit;
  const checkoutReady = canCheckout();
  const incompleteCount = lines.filter((l) => l.items.length < BOX_SIZE).length;
  const isEmpty = lines.length === 0 && bottles.length === 0 && discovery.length === 0;

  return (
    <div className="container checkout">
      <nav className="checkout__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/collection-builder">Collection Builder</Link> / <span>Checkout</span>
      </nav>

      <h1 className="serif checkout__title">Checkout</h1>

      {isEmpty ? (
        <div className="checkout__empty">
          <p>{hydrated ? 'Your cart is empty.' : 'Loading your cart…'}</p>
          {hydrated && (
            <div className="checkout__empty-ctas">
              <Link href="/collection-builder" className="btn btn--white">Build a collection</Link>
              <Link href="/collection-builder/oils" className="btn btn--ghost-dark">Build an oil set</Link>
              <Link href="/discovery-sets" className="btn btn--ghost-dark">Discover a collection</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="checkout__layout">
          {/* Lines */}
          <section className="checkout__lines" aria-label="Your sets">
            {incompleteCount > 0 && (
              <p className="checkout__incomplete">
                {incompleteCount} incomplete set{incompleteCount > 1 ? 's' : ''} — complete all sets to checkout.
              </p>
            )}
            {lines.map((l) => {
              const items = l.items
                .map((s) => catalog.find((p) => p.slug === s))
                .filter((p): p is { slug: string; name: string; imageUrl: string | null } => Boolean(p));
              const isOil = l.kind === 'oil';
              const tierLabel: string = isOil
                ? 'Oil set'
                : l.tier !== null
                  ? `${TIER_LABEL[l.tier]} Set`
                  : 'Set';
              const subtitle = isOil ? oilLabel(l.oilType, l.oilFormat) : `${l.items.length}/${BOX_SIZE} decants`;
              const isIncomplete = l.items.length < BOX_SIZE;
              // One colour per product kind, echoing the homepage's black/oxblood
              // vocabulary: Tier 1 black, Tier 2 white, Tier 3 warm stone, oils red.
              const variant = isOil
                ? 'cline--red'
                : l.tier === 1
                  ? 'cline--black'
                  : l.tier === 3
                    ? 'cline--stone'
                    : 'cline--white';
              return (
                <article key={l.id} className={`cline ${variant} ${isIncomplete ? 'cline--incomplete' : ''}`}>
                  <div className="cline__info">
                    <p className="cline__tier eyebrow">
                      {tierLabel} · {subtitle}
                    </p>
                    <LineThumbs slugs={l.items} catalog={catalog} />
                    <p className="cline__names">{items.map((p) => p.name).join(' · ')}</p>
                  </div>
                  <div className="cline__side">
                    <div className="cline__qty">
                      <button aria-label="Decrease" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                      <span>{l.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                    </div>
                    <p className="cline__price serif">{formatNaira(l.qty * (l.unitPrice ?? 0))}</p>
                    <p className="cline__unit">{formatNaira(l.unitPrice ?? 0)} each</p>
                    <button className="cline__remove link-red" onClick={() => removeLine(l.id)}>Remove</button>
                  </div>
                </article>
              );
            })}

            {bottles.map((b) => {
              const ref = catalog.find((p) => p.slug === b.slug);
              return (
                <article key={b.id} className="cline cline--bottle">
                  <div className="cline__info">
                    <p className="cline__tier eyebrow">Full bottle · 1 × {b.name}</p>
                    <div className="cline__thumbs">
                      <span className="cline__thumb" title={b.name}>
                        {ref?.imageUrl ? (
                          <ProductImage src={ref.imageUrl} alt={b.name} />
                        ) : (
                          <Monogram name={b.name} className="dnoimg dnoimg--thumb" />
                        )}
                      </span>
                    </div>
                    <p className="cline__names">{[b.brand, b.name].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="cline__side">
                    <div className="cline__qty">
                      <button aria-label="Decrease" onClick={() => setBottleQty(b.id, b.qty - 1)}>−</button>
                      <span>{b.qty}</span>
                      <button aria-label="Increase" onClick={() => setBottleQty(b.id, b.qty + 1)}>+</button>
                    </div>
                    <p className="cline__price serif">{formatNaira(b.qty * b.unitPrice)}</p>
                    <p className="cline__unit">{formatNaira(b.unitPrice)} each</p>
                    <button className="cline__remove link-red" onClick={() => removeBottle(b.id)}>Remove</button>
                  </div>
                </article>
              );
            })}

            {discovery.map((d) => (
              <article key={d.id} className="cline">
                <div className="cline__info">
                  <p className="cline__tier eyebrow">{d.collection} · {d.items.length} decant{d.items.length > 1 ? 's' : ''}</p>
                  <div className="cline__thumbs">
                    {d.items.map((it, i) => (
                      <span key={i} className="cline__thumb" title={it.name}>
                        {it.imageUrl ? <ProductImage src={it.imageUrl} alt={it.name} /> : <Monogram name={it.name} className="dnoimg dnoimg--thumb" />}
                      </span>
                    ))}
                  </div>
                  <p className="cline__names">{d.items.map((it) => it.name).join(' · ')}</p>
                </div>
                <div className="cline__side">
                  <div className="cline__qty">
                    <button aria-label="Decrease" onClick={() => setDiscoveryQty(d.id, d.qty - 1)}>−</button>
                    <span>{d.qty}</span>
                    <button aria-label="Increase" onClick={() => setDiscoveryQty(d.id, d.qty + 1)}>+</button>
                  </div>
                  <p className="cline__price serif">{formatNaira(d.qty * d.unitPrice)}</p>
                  <p className="cline__unit">{formatNaira(d.unitPrice)} each</p>
                  <button className="cline__remove link-red" onClick={() => removeDiscovery(d.id)}>Remove</button>
                </div>
              </article>
            ))}
          </section>

          {/* Summary + form */}
          <aside className="checkout__side">
            {/* Gift card */}
            <div className="cgift">
              {giftApplied ? (
                <div className="cgift__applied">
                  <span>
                    Gift card <strong>{giftApplied.code}</strong> applied — {formatNaira(giftCredit)} off
                  </span>
                  <button type="button" className="link-red" onClick={() => { setGiftApplied(null); setGiftCode(''); }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="cgift__row">
                  <input
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="Gift card code (NDII-XXXX-XXXX)"
                    aria-label="Gift card code"
                  />
                  <button
                    type="button"
                    disabled={giftChecking || !giftCode.trim()}
                    onClick={async () => {
                      setGiftChecking(true);
                      setGiftError(null);
                      try {
                        const res = await fetch(`/api/giftcard/balance?code=${encodeURIComponent(giftCode)}`);
                        const json = await res.json();
                        if (res.ok && json.found) {
                          setGiftApplied({ code: json.code, balance: json.balance });
                        } else if (res.status === 404) {
                          setGiftError('No gift card found with that code.');
                        } else {
                          setGiftError(json.error || 'Could not check that code.');
                        }
                      } catch {
                        setGiftError('Could not check that code.');
                      } finally {
                        setGiftChecking(false);
                      }
                    }}
                  >
                    {giftChecking ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {giftError && <p className="cgift__error">{giftError}</p>}
              {giftApplied && (
                <p className="cgift__note">
                  Gift card applied and debited when you pay — {total > 0 ? `you'll pay the remaining ${formatNaira(total)}.` : 'no further payment is needed.'}
                </p>
              )}
            </div>

            <div className="csummary">
              <p className="csummary__title eyebrow">Order Summary</p>
              <div className="csummary__row"><span>{totals.itemCount} item{totals.itemCount > 1 ? 's' : ''}</span><span>{formatNaira(totals.subtotal)}</span></div>
              <div className="csummary__row"><span>Shipping</span><span>{totals.shipping === 0 ? 'Free' : formatNaira(totals.shipping)}</span></div>
              <div className="csummary__row"><span>VAT (7.5%)</span><span>{formatNaira(totals.vat)}</span></div>
              {giftApplied && <div className="csummary__row csummary__row--gift"><span>Gift card</span><span>−{formatNaira(giftCredit)}</span></div>}
              <div className="csummary__row csummary__row--total"><span>Total</span><strong className="serif">{formatNaira(total)}</strong></div>
              <p className="csummary__note">Free shipping over ₦150,000. Flat ₦2,500 below that.</p>
            </div>

            <form
              className="cform"
              onSubmit={async (e) => {
                e.preventDefault();
                setPayError(null);
                setPaying(true);
                try {
                  if (!checkoutReady) {
                    throw new Error('Please complete all sets before checkout.');
                  }
                  const res = await fetch('/api/paystack/initialize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: form.email,
                      cart: payloadFromCart(lines, bottles, discovery),
                      delivery: {
                        name: form.name,
                        phone: form.phone,
                        email: form.email,
                        address: form.address,
                        city: form.city,
                        state: form.state,
                        notes: form.notes,
                      },
                      giftCode: giftApplied?.code,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || 'Could not start payment');

                  // Fully covered by the gift card: the server already debited it.
                  if (json.fullyCovered) {
                    clearCart();
                    window.location.href = `/checkout/callback?giftonly=1&ref=${encodeURIComponent(json.reference)}`;
                    return;
                  }

                  // Remember the gift-card debit so a failed payment can restore it.
                  if (giftApplied && giftCredit > 0) {
                    sessionStorage.setItem(
                      'ndiidii-giftcard-pending',
                      JSON.stringify({
                        redeem: false,
                        code: giftApplied.code,
                        amountNaira: giftCredit,
                        reference: json.reference,
                      }),
                    );
                  }
                  window.location.href = json.authorization_url;
                } catch (err) {
                  setPayError(err instanceof Error ? err.message : 'Payment could not be started');
                  setPaying(false);
                }
              }}
            >
              <p className="csummary__title eyebrow">Delivery details</p>
              <label>Full name<input required value={form.name} onChange={set('name')} /></label>
              <label>Phone<input required value={form.phone} onChange={set('phone')} placeholder="080…" /></label>
              <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
              <label>Delivery address<input required value={form.address} onChange={set('address')} /></label>
              <label>City<input required value={form.city} onChange={set('city')} /></label>
              <label>
                State
                <select required value={form.state} onChange={set('state')}>
                  <option value="">Select state</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>Order notes (optional)<textarea rows={3} value={form.notes} onChange={set('notes')} /></label>
              {payError && <p className="cform__error" role="alert">{payError}</p>}
              {testMode && (
                <p className="cform__testmode" role="note">
                  <strong>Test mode.</strong> This is a Paystack <em>test</em> account — no real money
                  will leave your account. Use test card <code>4084 0840 8408 4081</code>, any future
                  expiry, CVV <code>408</code>.
                </p>
              )}
              <button type="submit" className="btn btn--white cform__submit" disabled={paying || !checkoutReady}>
                {paying
                  ? total > 0 ? 'Redirecting to payment…' : 'Completing…'
                  : total > 0 ? 'Pay now' : 'Complete Transaction'}
              </button>
              {!checkoutReady && (
                <p className="cform__note">Complete all sets before paying.</p>
              )}
              <p className="cform__disclaimer">
                {total > 0
                  ? "You'll be redirected to Paystack to pay securely by card, transfer, or USSD."
                  : 'Your gift card covers this order in full — no payment needed.'}
              </p>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
