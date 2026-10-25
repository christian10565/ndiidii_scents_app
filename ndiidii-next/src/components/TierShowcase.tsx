import { getPerfumes } from '@/lib/catalog';
import { TierShowcaseTabs } from './TierShowcaseTabs';

/** Server fetches four in-stock perfumes per tier; the tabs are the interactive part. */
export default async function TierShowcase() {
  const all = await getPerfumes();
  const byTier: Record<string, typeof all> = { '1': [], '2': [], '3': [] };
  for (const p of all) {
    if (p.tier && p.inStock && byTier[String(p.tier)] && byTier[String(p.tier)].length < 4) {
      byTier[String(p.tier)].push(p);
    }
  }
  // Sliced HERE, on the server. Passing the whole catalog and letting the client
  // tab component `.slice(0,4)` serialized every in-stock perfume into the
  // homepage HTML (~640KB of the 694KB page) for four cards per tab.
  return <TierShowcaseTabs byTier={byTier} />;
}
