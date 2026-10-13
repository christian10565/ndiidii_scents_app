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
          setState('success');
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
