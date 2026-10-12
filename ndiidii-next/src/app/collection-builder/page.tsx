import { getPerfumes } from '@/lib/catalog';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { BuilderShell } from '@/components/BuilderShell';

// The builder reads client cart state (drafts) via context. `connection()` inside
// the Suspense child opts the route out of static prerendering (the baked-in
// empty-selection HTML caused a hydration mismatch) and streams the shell at once.
//
// Catalog is cached server-side (see lib/catalog.ts); the builder filters it
// per tier on the client for instant tier switching.
async function BuilderBody() {
  await connection();
  const perfumes = await getPerfumes();
  const byTier: Record<string, typeof perfumes> = { '1': [], '2': [], '3': [] };
  for (const p of perfumes) {
    if (p.tier && byTier[String(p.tier)] && p.inStock) byTier[String(p.tier)].push(p);
  }
  return <BuilderShell byTier={byTier as never} />;
}

export default function CollectionBuilderPage() {
  return (
    <Suspense fallback={<div className="container builder" style={{ minHeight: '60vh' }} />}>
      <BuilderBody />
    </Suspense>
  );
}
