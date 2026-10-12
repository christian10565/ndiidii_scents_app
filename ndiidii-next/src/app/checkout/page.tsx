import { getPerfumes } from '@/lib/catalog';
import { Suspense } from 'react';
import { connection } from 'next/server';
import CheckoutClient from '@/components/CheckoutClient';

// Cart lives in localStorage (client), so this page is a client shell — but we
// still fetch the catalog server-side to resolve product names/thumbnails.
//
// `connection()` inside the Suspense child opts this route out of static
// prerendering (the empty-cart HTML baked by prerender caused a hydration
// mismatch #418) and streams the shell immediately.
async function CheckoutBody() {
  await connection();
  const perfumes = await getPerfumes();
  const catalog = perfumes.map((p) => ({ slug: p.slug, name: p.name, imageUrl: p.imageUrl }));
  return <CheckoutClient catalog={catalog} />;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container checkout" style={{ minHeight: '50vh' }} />}>
      <CheckoutBody />
    </Suspense>
  );
}
