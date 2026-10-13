'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, NIGERIA_STATES, type Tier } from '@/lib/store.config';
import { formatNaira } from '@/lib/format';
import ProductImage from '@/components/ProductImage';

const TIER_LABEL: Record<Tier, string> = { 1: 'Tier One', 2: 'Tier Two', 3: 'Tier Three' };

/** Resolve product thumbnails by slug from a passed-in catalog snapshot. */
function LineThumbs({ slugs, catalog }: { slugs: string[]; catalog: { slug: string; name: string; imageUrl: string | null }[] }) {
  const items = slugs.map((s) => catalog.find((p) => p.slug === s)).filter(Boolean) as typeof catalog;
  return (
    <div className="cline__thumbs">
      {items.map((p) => (
        <span key={p.slug} className="cline__thumb" title={p.name}>
          <ProductImage src={p.imageUrl} alt={p.name} />
        </span>
      ))}
    </div>
  );
}

export default function CheckoutClient({
  catalog,
}: {
  catalog: { slug: string; name: string; imageUrl: string | null }[];
}) {
  const { lines, discovery, removeLine, setQty, removeDiscovery, cartTotal, cartCount } = useCart();
  const [placed, setPlaced] = useState(false);
  // The cart is localStorage-backed; render an empty shell until it hydrates so
  // server and client agree on first paint (no hydration mismatch).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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

  const shipping = cartTotal > 150000 ? 0 : cartTotal > 0 ? 2500 : 0;
  const total = cartTotal + shipping;

  if (placed) {
    return (
      <div className="container checkout">
        <div className="checkout__done">
          <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Order received</p>
          <h1 className="serif">Thank you{form.name ? `, ${form.name.split(' ')[0]}` : ''}!</h1>
          <p>
            Your order is being prepared. This is a test checkout — no payment
            was taken. In production this is where Paystack would confirm payment and the order would be
            emailed to you.
          </p>
          <Link href="/collection-builder" className="btn btn--ghost-dark">Build another set</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout">
      <nav className="checkout__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/collection-builder">Collection Builder</Link> / <span>Checkout</span>
      </nav>

      <h1 className="serif checkout__title">Checkout</h1>

      {lines.length === 0 && discovery.length === 0 ? (
        <div className="checkout__empty">
          <p>{hydrated ? 'Your cart is empty.' : 'Loading your cart…'}</p>
          {hydrated && (
            <div className="checkout__empty-ctas">
              <Link href="/collection-builder" className="btn btn--white">Build a collection</Link>
              <Link href="/discovery-sets" className="btn btn--ghost-dark">Discover a collection</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="checkout__layout">
          {/* Lines */}
          <section className="checkout__lines" aria-label="Your sets">
            {lines.map((l) => (
              <article key={l.id} className="cline">
                <div className="cline__info">
                  <p className="cline__tier eyebrow">{TIER_LABEL[l.tier]} Set · {BOX_SIZE} decants</p>
                  <LineThumbs slugs={l.items} catalog={catalog} />
                  <p className="cline__names">
                    {l.items
                      .map((s) => catalog.find((p) => p.slug === s)?.name ?? s)
                      .join(' · ')}
                  </p>
                </div>
                <div className="cline__side">
                  <div className="cline__qty">
                    <button aria-label="Decrease" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button aria-label="Increase" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                  </div>
                  <p className="cline__price serif">{formatNaira(l.qty * l.unitPrice)}</p>
                  <p className="cline__unit">{formatNaira(l.unitPrice)} each</p>
                  <button className="cline__remove link-red" onClick={() => removeLine(l.id)}>Remove</button>
                </div>
              </article>
            ))}
            {discovery.map((d) => (
              <article key={d.id} className="cline">
                <div className="cline__info">
                  <p className="cline__tier eyebrow">{d.collection} · {d.items.length} decant{d.items.length > 1 ? 's' : ''}</p>
                  <div className="cline__thumbs">
                    {d.items.map((it, i) => (
                      <span key={i} className="cline__thumb" title={it.name}>
                        <ProductImage src={it.imageUrl} alt={it.name} />
                      </span>
                    ))}
                  </div>
                  <p className="cline__names">{d.items.map((it) => it.name).join(' · ')}</p>
                </div>
                <div className="cline__side">
                  <div className="cline__qty">
                    <span>{d.qty}</span>
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
            <div className="csummary">
              <p className="csummary__title eyebrow">Order Summary</p>
              <div className="csummary__row"><span>{cartCount} item{cartCount > 1 ? 's' : ''}</span><span>{formatNaira(cartTotal)}</span></div>
              <div className="csummary__row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatNaira(shipping)}</span></div>
              <div className="csummary__row csummary__row--total"><span>Total</span><strong className="serif">{formatNaira(total)}</strong></div>
              <p className="csummary__note">Free shipping over ₦150,000.</p>
            </div>

            <form
              className="cform"
              onSubmit={(e) => {
                e.preventDefault();
                setPlaced(true);
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
              <button type="submit" className="btn btn--white cform__submit">Place order (test)</button>
              <p className="cform__disclaimer">
                Test checkout — no payment is taken. Paystack (card/transfer) wires in here once the client is
                ready.
              </p>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
