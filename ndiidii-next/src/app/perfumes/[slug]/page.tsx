import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductImage from '@/components/ProductImage';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, TIER_LABELS } from '@/lib/store.config';
import { getPerfume, getPerfumes } from '@/lib/catalog';
import { toProductRef } from '@/lib/shopCards';
import PerfumeCartSet from '@/components/PerfumeCartSet';

/**
 * Statically generated: every perfume slug known to the catalogue at build time
 * is prerendered, so a product click is a prefetch hit instead of a server round
 * trip. `generateMetadata` and the page both read the cached catalogue, and the
 * 5-minute `cacheLife` on `getPerfume`/`getPerfumes` revalidates the pages.
 *
 * Slugs added to the sheet after the build still work: `dynamicParams` defaults
 * to true, so an unknown slug renders on demand and then joins the cache.
 */
export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  return perfumes.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPerfume(slug);
  if (!p) return { title: 'Not found — Ndiidii Scents' };
  return {
    title: `${p.name} — Ndiidii Scents`,
    description: p.scentProfile
      ? `${p.brand ? p.brand + ' — ' : ''}${p.scentProfile}. Middle Eastern perfume decant.`
      : `${p.name} by ${p.brand ?? 'Ndiidii Scents'}.`,
  };
}

/**
 * `params` is URL data. Next 16 raises "instant-shell-url-data" when it is read
 * outside a Suspense boundary, because the shell then cannot render until the URL
 * is known. So the boundary renders the PDP frame immediately and the body fills
 * in when the slug resolves — the route is still statically generated per slug
 * (see generateStaticParams), this only keeps the shell instant.
 */
export default function PerfumePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<PdpShell />}>
      <PerfumeBody params={params} />
    </Suspense>
  );
}

function PdpShell() {
  return <div className="container pdp" style={{ minHeight: '70vh' }} />;
}

async function PerfumeBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPerfume(slug);
  if (!p) notFound();
  // Only the products that can appear in THIS page's cart panel: the panel shows
  // `linesFor('perfume', tier)`, and every line the builder writes is
  // single-tier, so same-tier refs are the complete set. Shipping all 1,046 put
  // ~205KB into each of the 1,046 prerendered product pages (~800MB of build
  // output); same-tier refs cut that roughly 3x.
  const tierRefs = (await getPerfumes()).filter((x) => x.tier === p.tier).map(toProductRef);

  const notes = [p.notes.top, p.notes.heart, p.notes.base].filter(Boolean);
  const boxPrice = formatNaira(TIER_BOX_PRICE_NGN[p.tier!]);

  return (
    <div className="container pdp">
      <nav className="pdp__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <span>{p.name}</span>
      </nav>

      <div className="pdp__grid">
        <div className="pdp__img">
          <ProductImage src={p.imageUrl} alt={p.name} variant="full" />
        </div>

        <div className="pdp__info">
          {p.brand && <p className="pdp__brand serif">{p.brand}</p>}
          <h1 className="serif pdp__name">{p.name}</h1>

          <div className="pdp__meta">
            {p.tier && <span className="scard__tier serif">{TIER_LABELS[p.tier!]}</span>}
            {p.gender && <span className="pdp__gender">{p.gender}</span>}
            <span className={`pdp__stock ${p.inStock ? 'in' : 'out'}`}>
              {p.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          {boxPrice && (
            <p className="pdp__price serif">
              {boxPrice} <small>· box of {BOX_SIZE}</small>
            </p>
          )}

          {p.scentProfile && <p className="pdp__scent">{p.scentProfile}</p>}
          {p.inspiredBy && <p className="pdp__inspired">Inspired by {p.inspiredBy}</p>}
          {p.description && <p className="pdp__desc">{p.description}</p>}

          {notes.length > 0 && (
            <div className="pdp__notes">
              {p.notes.top && (
                <div>
                  <h3>Top notes</h3>
                  <p>{p.notes.top}</p>
                </div>
              )}
              {p.notes.heart && (
                <div>
                  <h3>Heart notes</h3>
                  <p>{p.notes.heart}</p>
                </div>
              )}
              {p.notes.base && (
                <div>
                  <h3>Base notes</h3>
                  <p>{p.notes.base}</p>
                </div>
              )}
            </div>
          )}

          <PerfumeCartSet slug={p.slug} tier={p.tier!} perfumes={tierRefs} />
        </div>
      </div>
    </div>
  );
}
