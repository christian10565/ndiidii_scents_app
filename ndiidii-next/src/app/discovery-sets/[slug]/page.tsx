import { notFound } from 'next/navigation';
import { getCuratedSets } from '@/lib/catalog';
import DiscoverySetDetail from '@/components/DiscoverySetDetail';

// The set list comes from the live sheet (runtime data) and slugs aren't known
// at build time, so this route can't be statically prerendered. Same pattern as
// the PDP: render at request time.
export const instant = false;

export default async function DiscoverySetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sets = await getCuratedSets();
  const idx = sets.findIndex((s) => s.slug === slug);
  if (idx < 0) notFound();
  const set = sets[idx];
  const prev = idx > 0 ? sets[idx - 1].slug : null;
  const next = idx < sets.length - 1 ? sets[idx + 1].slug : null;
  return <DiscoverySetDetail set={set} prev={prev} next={next} />;
}
