import Link from 'next/link';
import { Suspense } from 'react';
import { getCuratedSets } from '@/lib/catalog';
import ProductImage from '@/components/ProductImage';
import Monogram from '@/components/Monogram';

/**
 * The Discovery Sets landing: a grid of curated sets, each card showing a 2x2
 * mosaic of its four perfumes and its scent profiles.
 *
 * The sheet holds ~250 complete sets, and rendering all of them at once put
 * ~700KB of markup (plus 790 product images) in this route's HTML. So the list
 * is paged: 24 sets per page, driven by `?page=` and read inside a Suspense
 * boundary, which keeps the page's static shell prerendered while the set list
 * renders per request (the sheet is runtime data, so an empty prerendered list
 * would go stale).
 */

const PAGE_SIZE = 24;

export default function DiscoverySetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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

      <Suspense fallback={<div className="discovery__grid" style={{ minHeight: '60vh' }} />}>
        <SetList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SetList({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [{ page }, sets] = await Promise.all([searchParams, getCuratedSets()]);

  if (sets.length === 0) return <p className="empty">Curated sets are on the way.</p>;

  const pages = Math.max(1, Math.ceil(sets.length / PAGE_SIZE));
  const requested = Number(page);
  const current = Number.isFinite(requested) ? Math.min(Math.max(1, Math.trunc(requested)), pages) : 1;
  const start = (current - 1) * PAGE_SIZE;
  const shown = sets.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="discovery__grid">
        {shown.map((set) => (
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

      {pages > 1 && (
        <nav className="discovery__pager" aria-label="Discovery sets pages">
          <p className="discovery__pager-count">
            Showing {start + 1}–{start + shown.length} of {sets.length} sets
          </p>
          <div className="discovery__pager-links">
            {current > 1 && (
              <Link
                className="btn btn--ghost-dark"
                href={current === 2 ? '/discovery-sets' : `/discovery-sets?page=${current - 1}`}
                rel="prev"
              >
                ← Previous
              </Link>
            )}
            <span className="discovery__pager-page">
              Page {current} of {pages}
            </span>
            {current < pages && (
              <Link className="btn btn--ghost-dark" href={`/discovery-sets?page=${current + 1}`} rel="next">
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
