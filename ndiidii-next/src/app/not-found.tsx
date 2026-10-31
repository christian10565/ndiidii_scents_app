import Link from 'next/link';

/**
 * Global 404.
 *
 * This replaces the old `src/app/[...catchAll]/page.tsx`, which answered EVERY
 * unmatched path with a 200 "Coming soon" page. That meant missing assets (the
 * ten `/brands/*.png` logos in `BRAND_LOGOS`, for instance) were not 404s at all:
 * each one rendered a full page — twice per brand, since the marquee renders the
 * list twice — instead of failing fast. File-like paths now 404 here, so the
 * browser's `onError` fallbacks behave and nothing is rendered for a request that
 * was never going to resolve.
 *
 * A 200 for a URL that does not exist is also a soft 404 for crawlers, which is
 * the one thing a storefront cannot afford.
 */
export default function NotFound() {
  return (
    <div className="container coming-soon">
      <p className="eyebrow">Ndiidii Scents</p>
      <h1 className="serif">Page not found</h1>
      <p>
        That page doesn&rsquo;t exist — it may have moved, or the link may be wrong. The
        collection is still where you left it.
      </p>
      <p>
        <Link className="btn btn--ghost-dark" href="/shop">
          Browse the shop
        </Link>{' '}
        <Link className="btn btn--ghost-dark" href="/">
          Back home
        </Link>
      </p>
    </div>
  );
}
