import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterPanel from '../components/FilterPanel.jsx';
import { FilterIcon } from '../components/Icons.jsx';
import ShopCard from '../components/ShopCard.jsx';
import { SHOP } from '../config/site.js';
import { apiGet } from '../lib/api.js';
import { SORTS, countActive, readFilters, toApiParams, writeFilters } from '../lib/shopQuery.js';

const INITIAL = { status: 'loading', items: [], total: 0, page: 0, loadingMore: false, moreError: false };

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => readFilters(sp), [sp]);
  const apiParams = useMemo(() => toApiParams(filters), [filters]);
  const key = JSON.stringify(apiParams);
  const activeCount = countActive(filters);

  const [state, setState] = useState(INITIAL);
  const [panelOpen, setPanelOpen] = useState(true); // desktop: filter panel shown or collapsed
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile: filter drawer

  // Lets an in-flight "load more" notice that the filters changed under it.
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    document.title = 'Shop — Ndiidii Scents';
  }, []);

  // New filters or sort -> back to page 1
  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);
    apiGet('/perfumes', { ...apiParams, page: 1, limit: SHOP.pageSize })
      .then((d) => !cancelled && setState({ ...INITIAL, status: 'ready', items: d.items, total: d.total, page: 1 }))
      .catch(() => !cancelled && setState({ ...INITIAL, status: 'error' }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = async () => {
    const startedWith = key;
    const next = state.page + 1;
    setState((s) => ({ ...s, loadingMore: true, moreError: false }));
    try {
      const d = await apiGet('/perfumes', { ...apiParams, page: next, limit: SHOP.pageSize });
      if (keyRef.current !== startedWith) return; // filters changed meanwhile
      setState((s) => {
        const seen = new Set(s.items.map((i) => i.id));
        return {
          ...s,
          items: [...s.items, ...d.items.filter((i) => !seen.has(i.id))],
          total: d.total,
          page: next,
          loadingMore: false,
        };
      });
    } catch {
      if (keyRef.current === startedWith) setState((s) => ({ ...s, loadingMore: false, moreError: true }));
    }
  };

  const setFilters = (next) => setSp(writeFilters(next));

  // Stop the page scrolling behind the mobile drawer
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const { status, items, total, loadingMore, moreError } = state;
  const hasMore = items.length < total;

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
                  {status === 'ready' ? `${total} ${total === 1 ? 'Product' : 'Products'}` : ' '}
                </p>
              </div>

              <label className="sort">
                <span>Sort by:</span>
                <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="shop__grid">
              {status === 'loading' &&
                Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton skeleton--shop" aria-hidden="true" />)}

              {status === 'error' && (
                <p className="empty">We couldn't load the scents right now. Please refresh and try again.</p>
              )}

              {status === 'ready' && items.length === 0 && (
                <div className="empty">
                  <p>No scents match these filters.</p>
                  {activeCount > 0 && (
                    <button className="btn btn--ghost-dark" onClick={() => setFilters({ ...filters, stock: [], tier: [], gender: [], brand: [] })}>
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {items.map((p) => (
                <ShopCard key={p.id} p={p} />
              ))}
            </div>

            {status === 'ready' && items.length > 0 && (
              <div className="shop__more">
                <p>
                  Showing {items.length} of {total}
                </p>
                {hasMore && (
                  <button className="btn btn--ghost-dark" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
                {moreError && <p className="shop__more-error">Couldn't load more. Please try again.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
