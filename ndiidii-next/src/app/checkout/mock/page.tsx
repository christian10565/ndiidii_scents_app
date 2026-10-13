'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function MockCheckoutInner() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? '';
  const amount = params.get('amount') ?? '0';
  const callback = params.get('callback') ?? '/checkout/callback';

  const pay = () => {
    // Simulate Paystack redirecting back with the reference appended.
    const url = new URL(callback, window.location.origin);
    url.searchParams.set('reference', reference);
    url.searchParams.set('trxref', reference);
    window.location.href = url.pathname + url.search;
  };

  return (
    <div className="container checkout">
      <div className="checkout__done" style={{ maxWidth: 480 }}>
        <p className="eyebrow" style={{ color: 'var(--oxblood)' }}>Mock checkout (test mode)</p>
        <h1 className="serif">Pay ₦{Number(amount).toLocaleString('en-NG')}</h1>
        <p style={{ color: 'var(--slate)', lineHeight: 1.6 }}>
          This is a stand-in for Paystack's hosted payment page. No real key is configured yet, so
          nothing is charged. Click below to simulate a successful payment and return to the store.
        </p>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>Reference: {reference}</p>
        <button className="btn btn--white" onClick={pay} style={{ marginTop: 8 }}>
          Simulate successful payment
        </button>
      </div>
    </div>
  );
}

/**
 * /checkout/mock — a stand-in for Paystack's hosted checkout, used only when no
 * real PAYSTACK_SECRET_KEY is set. Lets you click through the entire redirect
 * flow before the client's Paystack account exists. "Pay" redirects back to the
 * callback with the reference, exactly like the real Paystack redirect.
 */
export default function MockCheckout() {
  return (
    <Suspense fallback={<div className="container checkout" style={{ minHeight: '50vh' }} />}>
      <MockCheckoutInner />
    </Suspense>
  );
}
