import { getPerfumes } from '@/lib/catalog';
import { TierShowcaseTabs } from './TierShowcaseTabs';

/** Server fetches one page of each tier; the tabs are the interactive part. */
export default async function TierShowcase() {
  const all = await getPerfumes();
  const byTier: Record<string, typeof all> = { '1': [], '2': [], '3': [] };
  for (const p of all) {
    if (p.tier && p.inStock && byTier[String(p.tier)]) {
      byTier[String(p.tier)].push(p);
    }
  }
  return <TierShowcaseTabs byTier={byTier} />;
}
