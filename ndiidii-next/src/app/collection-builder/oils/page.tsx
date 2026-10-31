import { getOils } from '@/lib/catalog';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { OilBuilderShell } from '@/components/OilBuilderShell';

// The builder reads client cart state (drafts) via context. `connection()` inside
// the Suspense child opts the route out of static prerendering (the baked-in
// empty-selection HTML caused a hydration mismatch) and streams the shell at once.
//
// Catalog is cached server-side (see lib/catalog.ts). Search params are read here
// and passed down as props, and the shell is keyed on them: a PDP handoff
// (?add=<slug>&type=<niche|designer>) must remount with the oil pre-picked
// instead of reusing a component that already holds a draft.
async function OilBuilderBody({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; type?: string }>;
}) {
  await connection();
  const [oils, sp] = await Promise.all([getOils(), searchParams]);
  const add = sp.add ?? '';
  const type = sp.type ?? '';
  return <OilBuilderShell key={`${add}|${type}`} oils={oils} initialAdd={add || undefined} initialType={type || undefined} />;
}

export default function OilBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; type?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="container builder" style={{ minHeight: '60vh' }}>
          <div className="empty">
            <p>Building your oil set…</p>
          </div>
        </div>
      }
    >
      <OilBuilderBody searchParams={searchParams} />
    </Suspense>
  );
}
