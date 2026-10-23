import { getPerfumes, getOils } from '@/lib/catalog';
import { Suspense } from 'react';
import { connection } from 'next/server';
import CheckoutClient from '@/components/CheckoutClient';

// True when a real TEST key is configured (sk_test_) — payments hit Paystack's
// test environment, so no real money moves. Surfaced as a visible notice.
const isTestMode = (): boolean => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(key && key.startsWith('sk_test_'));
};

// Cart lives in localStorage (client), so this page is a client shell — but we
// still fetch the catalog server-side to resolve product names/thumbnails.
//
// `connection()` inside the Suspense child opts this route out of static
// prerendering (the empty-cart HTML baked by prerender caused a hydration
// mismatch #418) and streams the shell immediately.
async function CheckoutBody() {
  await connection();
  const [perfumes, oils] = await Promise.all([getPerfumes(), getOils()]);
  const catalog = [
    ...perfumes.map((p) => ({ slug: p.slug, name: p.name, imageUrl: p.imageUrl })),
    ...oils.map((o) => ({ slug: o.slug, name: o.name, imageUrl: o.imageUrl })),
  ];
  return <CheckoutClient catalog={catalog} testMode={isTestMode()} />;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container checkout" style={{ minHeight: '50vh' }} />}>
      <CheckoutBody />
    </Suspense>
  );
}
