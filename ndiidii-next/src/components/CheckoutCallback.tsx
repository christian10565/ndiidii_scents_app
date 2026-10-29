'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';

/**
 * /checkout/callback — where Paystack redirects after payment (with ?reference=).
 *
 * Verifies the transaction server-side, then shows success (and clears the cart)
 * or failure. Wrapped in Suspense by the page because it reads search params.
 *
 * The order itself is NOT described here. /api/orders/record is handed the
 * reference and reads back the order the server priced at initialize time, so
 * nothing in this component can influence what gets recorded.
 */
export default function CheckoutCallback() {
  const params = useSearchParams();
  const reference = params.get('reference');
  const giftRef = params.get('ref');
  const { clearCart } = useCart();
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [detail, setDetail] = useState<string>('');
  const cleared = useRef(false);

  useEffect(() => {
    const clearOnce = () => {
      if (!cleared.current) {
        cleared.current = true;
        clearCart();
      }
    };

    const record = async (ref: string) => {
      try {
        const res = await fetch('/api/orders/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          console.warn('[checkout] ledger write refused:', json.error ?? res.status);
        }
      } catch {
        /* ledger write is best-effort */
      }
    };

    // Fully covered by a gift card — no Paystack step, the card was already
    // debited by /api/paystack/initialize.
    if (params.get('giftonly') === '1') {
      (async () => {
        if (giftRef) await record(giftRef);
        clearOnce();
        setState('success');
      })();
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
          // A gift-card purchase (new card issued after payment).
          try {
            const pending = sessionStorage.getItem('ndiidii-giftcard-pending');
            if (pending) {
              const p = JSON.parse(pending);
              if (p.reference === reference) {
                sessionStorage.removeItem('ndiidii-giftcard-pending');
                if (!p.redeem && !p.code) {
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
          await record(reference);
          clearOnce();
        } else {
          setState('failed');
          setDetail(json.error || `Payment status: ${json.status ?? 'unknown'}`);
          // If the payment failed but the server already debited a gift card,
          // put the balance back.
          try {
            const pending = sessionStorage.getItem('ndiidii-giftcard-pending');
            if (pending) {
              const p = JSON.parse(pending);
              if (p.reference === reference && p.code && p.amountNaira) {
                await fetch('/api/giftcard/refund', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: p.code, amountNaira: p.amountNaira, reference }),
                });
                sessionStorage.removeItem('ndiidii-giftcard-pending');
              }
            }
          } catch {
            /* refund best-effort */
          }
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
  }, [reference, giftRef, clearCart, params]);

  return (
    <div className="container checkout">
      <div className="checkout__done">
        {state === 'verifying' && (
          <>
            <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Confirming payment</p>
            <h1 className="serif">Verifying your payment…</h1>
            <p>Please don&apos;t close this page.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Order received</p>
            <h1 className="serif">Thank you!</h1>
            <p>
              Your payment was confirmed and your order is being prepared. We&apos;ll email you a
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
