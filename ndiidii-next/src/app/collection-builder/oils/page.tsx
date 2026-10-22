import { getOils } from '@/lib/catalog';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { OilBuilderShell } from '@/components/OilBuilderShell';

// The builder reads client cart state (drafts) via context. `connection()` inside
// the Suspense child opts the route out of static prerendering (the baked-in
// empty-selection HTML caused a hydration mismatch) and streams the shell at once.
//
// Catalog is cached server-side (see lib/catalog.ts); the builder filters it
// per category (niche/designer) on the client for instant category switching.
async function OilBuilderBody() {
  await connection();
  const oils = await getOils();
  return <OilBuilderShell oils={oils} />;
}

export default function OilBuilderPage() {
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
      <OilBuilderBody />
    </Suspense>
  );
}
