'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FilterPanel from './FilterPanel';
import { FilterIcon } from './Icons';
import ShopCard from './ShopCard';
import ProductImage from './ProductImage';
import { SHOP } from '@/config/site';
import {
  countActive,
  readFilters,
  writeFilters,
  type Filters,
} from '@/lib/shopQuery';
import type { Perfume, Oil } from '@/lib/catalog';

/**
 * The shop shell. Filtering/sorting/pagination happen over the full catalog,
 * which the server already handed us as `initial` (SSR — SEO-friendly).
 * Filters live in the URL and re-filter client-side; no per-change network call.
 */
export default function ShopShell({ initial, oils, brands }: { initial: Perfume[]; oils: Oil[]; brands: import('@/lib/catalog').BrandCount[] }) {
  const sp = useSearchParams();
  const router = useRouter();

  const filters = useMemo<Filters>(() => readFilters(new URLSearchParams(sp.toString())), [sp]);
  const activeCount = countActive(filters);

  const [panelOpen, setPanelOpen] = useState(true); // desktop: filter panel shown or collapsed
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile: filter drawer
  const [visible, setVisible] = useState(SHOP.pageSize);

  const setFilters = (next: Filters) => {
    router.push(`/shop?${writeFilters(next).toString()}`, { scroll: false });
  };

  // Reset paging when filters change
  useEffect(() => {
    setVisible(SHOP.pageSize);
  }, [filters]);

  // Stop the page scrolling behind the mobile drawer
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // ---- Filter the catalog (client-side, instant) ----
  const filtered = useMemo(() => {
    let out = initial;
    if (filters.collection === 'perfumes') out = out.filter((p) => p.tier !== null);
    if (filters.collection === 'oils') out = out.filter((p) => p.tier === null);
    if (filters.gender.length) out = out.filter((p) => p.gender && filters.gender.includes(p.gender));
    if (filters.tier.length) out = out.filter((p) => p.tier && filters.tier.includes(String(p.tier)));
    if (filters.brand.length) out = out.filter((p) => p.brand && filters.brand.some((b) => b.toLowerCase() === p.brand!.toLowerCase()));
    if (filters.stock.length === 1) out = out.filter((p) => p.inStock === (filters.stock[0] === 'in'));
    if (filters.sort === 'newest') out = [...out].reverse();
    else if (filters.sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [initial, filters]);

  const total = filtered.length;
  const shown = filtered.slice(0, visible);
  const hasMore = shown.length < total;

  const loadMore = () => setVisible((v) => v + SHOP.pageSize);

  return (
    <>
      <section
        className="shop-hero"
        style={{ backgroundImage: `url(${SHOP.heroImage}), var(--shop-hero-fallback)` }}
      >
        <div className="shop-hero__shade" />
        <div className="shop-hero__inner">
          <h1 className="serif">{SHOP.title}</h1>
          <p>{SHOP.subtitle}</p>
        </div>
      </section>

      <div className="shop">
        <div className={`shop__layout ${panelOpen ? '' : 'is-collapsed'}`}>
          <aside className={`shop__side ${drawerOpen ? 'is-open' : ''}`} aria-label="Filters">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              activeCount={activeCount}
              brands={brands}
              onClose={() => {
                setPanelOpen(false);
                setDrawerOpen(false);
              }}
            />
          </aside>
          {drawerOpen && <div className="shop__backdrop" onClick={() => setDrawerOpen(false)} />}

          <div className="shop__main">
            <div className="shop__bar">
              <div className="shop__heading">
                <button
                  className="shop__filter-btn"
                  onClick={() => {
                    setPanelOpen(true);
                    setDrawerOpen(true);
                  }}
                >
                  <FilterIcon width={18} height={18} />
                  Filter{activeCount > 0 && <span className="shop__filter-count">{activeCount}</span>}
                </button>
                <h2 className="serif">All Products</h2>
                <p className="shop__count" aria-live="polite">
                  {total} {total === 1 ? 'Product' : 'Products'}
                </p>
              </div>

              <label className="sort">
                <span>Sort by:</span>
                <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as Filters['sort'] })}>
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </label>
            </div>

            <div className="shop__grid">
              {total === 0 && (
                <div className="empty">
                  <p>{activeCount > 0 ? 'No scents match these filters.' : 'New scents are on the way.'}</p>
                  {activeCount > 0 && (
                    <button className="btn btn--ghost-dark" onClick={() => setFilters({ ...filters, stock: [], tier: [], gender: [], brand: [], collection: null })}>
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {shown.map((p) => (
                <ShopCard key={p.id} p={p} />
              ))}
            </div>

            {filters.collection === 'oils' && (
              <div className="shop__grid" style={{ marginTop: 'var(--space-4)' }}>
                {oils.map((o) => (
                  <article key={o.id} className="scard">
                    <div className="scard__img">
                      <ProductImage src={o.imageUrl} alt={o.name} />
                    </div>
                    <h3 className="scard__name">{o.name}</h3>
                    {o.brand && <p className="scard__brand serif">{o.brand}</p>}
                    <p className="scard__status">{o.inStock ? 'In stock' : 'Out of stock'}</p>
                  </article>
                ))}
              </div>
            )}

            {total > 0 && (
              <div className="shop__more">
                <p>
                  Showing {shown.length} of {total}
                </p>
                {hasMore && (
                  <button className="btn btn--ghost-dark" onClick={loadMore}>
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
