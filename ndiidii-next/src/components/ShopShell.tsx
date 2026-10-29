'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FilterPanel from './FilterPanel';
import { FilterIcon } from './Icons';
import ShopCard from './ShopCard';
import { SHOP } from '@/config/site';
import {
  countActive,
  readFilters,
  writeFilters,
  type Filters,
} from '@/lib/shopQuery';
import { hasAnyKey, noteIndexFromKeys } from '@/lib/notes';
import type { PerfumeCard } from '@/lib/shopCards';
import type { BrandCount } from '@/lib/catalog';

/**
 * The shop shell. Filtering/sorting/pagination happen over the perfume catalog,
 * which the server already handed us as LEAN card projections (lib/shopCards.ts).
 * Filters live in the URL and re-filter client-side; no per-change network call.
 *
 * PERFUMES ONLY. Oils are exclusive to the Oil Collection Builder, so this route
 * neither receives them nor offers them as a filter — the `collection` param is
 * still parsed for old links, then ignored.
 */
export default function ShopShell({ perfumes, brands }: { perfumes: PerfumeCard[]; brands: BrandCount[] }) {
  const sp = useSearchParams();
  const router = useRouter();

  const filters = useMemo<Filters>(() => readFilters(new URLSearchParams(sp.toString())), [sp]);
  const activeCount = countActive(filters);

  const [panelOpen, setPanelOpen] = useState(true); // desktop: filter panel shown or collapsed
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile: filter drawer

  const setFilters = (next: Filters) => {
    router.push(`/shop?${writeFilters(next).toString()}`, { scroll: false });
  };

  // Stop the page scrolling behind the mobile drawer
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // ---- Filter the catalog (client-side, instant) ----
  const filtered = useMemo(() => {
    let out: PerfumeCard[] = perfumes;
    if (filters.gender.length) out = out.filter((p) => p.gender && filters.gender.includes(p.gender));
    if (filters.tier.length) out = out.filter((p) => p.tier && filters.tier.includes(String(p.tier)));
    if (filters.brand.length) out = out.filter((p) => p.brand && filters.brand.some((b) => b.toLowerCase() === p.brand!.toLowerCase()));
    if (filters.notes.length) out = out.filter((p) => hasAnyKey(p.noteKeys, filters.notes));
    if (filters.stock.length === 1) out = out.filter((p) => p.inStock === (filters.stock[0] === 'in'));
    if (filters.sort === 'newest') out = [...out].reverse();
    else if (filters.sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [perfumes, filters]);

  // The heading count must describe what the filters actually produced.
  const total = filtered.length;

  // Paging resets whenever the filter set changes. Deriving it during render
  // (instead of a setState-in-effect) keeps lint and React 19 both happy.
  const filterKey = writeFilters(filters).toString();
  const [paging, setPaging] = useState({ key: filterKey, visible: SHOP.pageSize });
  const visible = paging.key === filterKey ? paging.visible : SHOP.pageSize;
  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const hasMore = shown.length < total;
  const loadMore = () => setPaging({ key: filterKey, visible: visible + SHOP.pageSize });

  // Every distinct note in the catalogue, alphabetical, for the Notes section.
  // Built from the precomputed canonical keys — no sheet prose to re-parse.
  const allNotes = useMemo(() => noteIndexFromKeys(perfumes.map((p) => p.noteKeys)), [perfumes]);

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
              notes={allNotes}
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
                    // Below 960px the panel is a drawer and needs the backdrop +
                    // scroll lock. On desktop it is an inline column: setting
                    // drawerOpen there only locked page scroll for no reason.
                    const isDrawer = window.matchMedia('(max-width: 960px)').matches;
                    setPanelOpen(true);
                    setDrawerOpen(isDrawer);
                  }}
                >
                  <FilterIcon width={18} height={18} />
                  Filter{activeCount > 0 && <span className="shop__filter-count">{activeCount}</span>}
                </button>
                <h2 className="serif">
                  {filters.brand.length === 1 ? filters.brand[0] : 'All Perfumes'}
                </h2>
                <p className="shop__count" aria-live="polite">
                  {total} {total === 1 ? 'Perfume' : 'Perfumes'}
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
                    <button className="btn btn--ghost-dark" onClick={() => setFilters({ ...filters, stock: [], tier: [], gender: [], notes: [], brand: [], collection: null })}>
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {shown.map((p) => (
                <ShopCard key={`perfume-${p.id}`} p={p} />
              ))}
            </div>

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
