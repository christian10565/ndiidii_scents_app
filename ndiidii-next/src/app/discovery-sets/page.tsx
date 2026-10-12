import Link from 'next/link';
import { getCuratedSets } from '@/lib/catalog';
import ProductImage from '@/components/ProductImage';
import Monogram from '@/components/Monogram';

// The set list comes from the live sheet (runtime data), so this page renders
// on demand rather than being statically prerendered (an empty prerender would
// go stale until the next build).
export const instant = false;

// The Discovery Sets landing: a grid of every curated set. Each card shows a
// 2x2 mosaic of its 4 perfumes, the set name, its 4 scent profiles, and links
// to the detail page.
export default async function DiscoverySetsPage() {
  const sets = await getCuratedSets();

  return (
    <div className="container discovery">
      <header className="discovery__head">
        <p className="eyebrow discovery__eyebrow">Curated Discovery Sets</p>
        <h1 className="serif discovery__title">Discovery Sets</h1>
        <p className="discovery__intro">
          Four 10ml decants, curated around a single mood. Each set is a ready-made story —
          pick the one that sounds like you.
        </p>
      </header>

      {sets.length === 0 ? (
        <p className="empty">Curated sets are on the way.</p>
      ) : (
        <div className="discovery__grid">
          {sets.map((set) => (
            <Link key={set.slug} href={`/discovery-sets/${set.slug}`} className="dset">
              <div className="dset__mosaic">
                {set.slots.map((slot, i) => (
                  <div className="dset__mosaic-cell" key={i}>
                    {slot.perfume?.imageUrl ? (
                      <ProductImage src={slot.perfume.imageUrl} alt={slot.perfumeName} />
                    ) : (
                      <Monogram name={slot.perfumeName} />
                    )}
                  </div>
                ))}
              </div>
              <div className="dset__body">
                <h2 className="serif dset__name">{set.collection}</h2>
                <p className="dset__profiles">{set.slots.map((s) => s.scentProfile).join(' · ')}</p>
                <span className="dset__cta">View set →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
