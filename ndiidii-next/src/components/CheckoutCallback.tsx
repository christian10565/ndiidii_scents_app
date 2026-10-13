'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';

/**
 * /checkout/callback — where Paystack redirects after payment (with ?reference=).
 * Verifies the transaction server-side, then shows success (and clears the cart)
 * or failure. Wrapped in Suspense by the page because it reads search params.
 */
export default function CheckoutCallback() {
  const params = useSearchParams();
  const reference = params.get('reference');
  const { clearCart } = useCart();
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [detail, setDetail] = useState<string>('');
  const cleared = useRef(false);

  useEffect(() => {
    // Fully covered by a gift card — no Paystack reference; already redeemed.
    const giftOnly = params.get('giftonly');
    if (giftOnly === '1') {
      setState('success');
      return;
    }
    if (!reference) {
      setState('failed');
      setDetail('No payment reference found.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.status === 'success') {
          let redeemedGiftCode: string | null = null;
          // Handle a pending gift-card action (purchase a new card, or redeem a
          // card that partially covered this order).
          try {
            const pending = sessionStorage.getItem('ndiidii-giftcard-pending');
            if (pending) {
              const p = JSON.parse(pending);
              if (p.reference === reference) {
                sessionStorage.removeItem('ndiidii-giftcard-pending');
                if (p.redeem) {
                  // Redeem the card portion, then finish as a normal order.
                  await fetch('/api/giftcard/redeem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: p.code, amountNaira: p.amountNaira, orderRef: reference }),
                  });
                  redeemedGiftCode = p.code;
                } else {
                  // Create a brand-new gift card and reveal its code.
                  const gres = await fetch('/api/giftcard/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amountNaira: p.amountNaira, note: p.note, orderRef: reference }),
                  });
                  const gjson = await gres.json();
                  if (gres.ok && gjson.code) {
                    window.location.href = `/gift-cards?reveal=${encodeURIComponent(gjson.code)}&amount=${p.amountNaira}`;
                    return;
                  }
                }
              }
            }
          } catch {
            /* fall through to normal order success */
          }
          setState('success');
          // Record the order in the Redis audit ledger (best-effort).
          try {
            const summary = sessionStorage.getItem('ndiidii-order-summary');
            if (summary) {
              sessionStorage.removeItem('ndiidii-order-summary');
              const s = JSON.parse(summary);
              await fetch('/api/orders/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ref: reference,
                  email: s.email,
                  items: s.items,
                  delivery: s.delivery,
                  amountCharged: json.amountNaira ?? s.total,
                  total: s.grandTotal ?? s.total,
                  giftCard: s.giftCredit > 0 && redeemedGiftCode ? { code: redeemedGiftCode, amount: s.giftCredit } : undefined,
                  method: s.giftCredit > 0 ? (json.amountNaira > 0 ? 'mixed' : 'giftcard') : 'paystack',
                }),
              });
            }
          } catch {
            /* ledger write is best-effort */
          }
          // Clear the cart once, on confirmed success.
          if (!cleared.current) {
            cleared.current = true;
            clearCart();
          }
        } else {
          setState('failed');
          setDetail(json.error || `Payment status: ${json.status ?? 'unknown'}`);
        }
      } catch (err) {
        if (cancelled) return;
        setState('failed');
        setDetail(err instanceof Error ? err.message : 'Verification failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, clearCart]);

  return (
    <div className="container checkout">
      <div className="checkout__done">
        {state === 'verifying' && (
          <>
            <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Confirming payment</p>
            <h1 className="serif">Verifying your payment…</h1>
            <p>Please don't close this page.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Order received</p>
            <h1 className="serif">Thank you!</h1>
            <p>
              Your payment was confirmed and your order is being prepared. We'll email you a
              receipt and tracking details shortly.
            </p>
            <Link href="/shop" className="btn btn--white">Continue shopping</Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Payment not completed</p>
            <h1 className="serif">Something went wrong</h1>
            <p>{detail || 'Your payment could not be confirmed. You have not been charged.'}</p>
            <Link href="/checkout" className="btn btn--white">Back to checkout</Link>
          </>
        )}
      </div>
    </div>
  );
}
