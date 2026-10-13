import { Suspense } from 'react';
import CheckoutCallback from '@/components/CheckoutCallback';

// Reads search params (?reference=), so wrap in Suspense.
export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<div className="container checkout" style={{ minHeight: '50vh' }} />}>
      <CheckoutCallback />
    </Suspense>
  );
}
