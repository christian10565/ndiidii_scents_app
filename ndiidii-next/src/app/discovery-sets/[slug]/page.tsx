import { notFound } from 'next/navigation';
import { getCuratedSets } from '@/lib/catalog';
import DiscoverySetDetail from '@/components/DiscoverySetDetail';

/** Prerendered per curated set; new sets render on demand until the next build. */
export async function generateStaticParams() {
  const sets = await getCuratedSets();
  return sets.map((s) => ({ slug: s.slug }));
}

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
