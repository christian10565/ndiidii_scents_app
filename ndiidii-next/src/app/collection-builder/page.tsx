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
//
// A perfume PDP hands off as /collection-builder?add=<slug>&tier=<n>. The params
// are read here and passed down, and the shell is keyed on them so a second
// handoff remounts with the new pick instead of keeping a stale draft.
async function BuilderBody({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; tier?: string }>;
}) {
  await connection();
  const [perfumes, sp] = await Promise.all([getPerfumes(), searchParams]);
  const byTier: Record<string, typeof perfumes> = { '1': [], '2': [], '3': [] };
  for (const p of perfumes) {
    if (p.tier && byTier[String(p.tier)] && p.inStock) byTier[String(p.tier)].push(p);
  }
  const add = sp.add ?? '';
  const tier = sp.tier ?? '';
  return (
    <BuilderShell
      key={`${add}|${tier}`}
      byTier={byTier as never}
      initialAdd={add || undefined}
      initialTier={tier || undefined}
    />
  );
}

export default function CollectionBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; tier?: string }>;
}) {
  return (
    <Suspense fallback={<div className="container builder" style={{ minHeight: '60vh' }} />}>
      <BuilderBody searchParams={searchParams} />
    </Suspense>
  );
}
