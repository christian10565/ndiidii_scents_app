import { getPerfumes, getOils, type Perfume } from '@/lib/catalog';
import ShopCard from '@/components/ShopCard';
import { SearchInput } from '@/components/SearchInput';
import { Suspense } from 'react';
import { connection } from 'next/server';

/** Case-insensitive substring match across the fields shoppers actually type. */
function matches(p: Perfume, q: string): boolean {
  const hay = [p.name, p.brand, p.scentProfile, p.inspiredBy].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

async function SearchResults({ q }: { q: string }) {
  await connection();
  if (!q) {
    return <p className="search__hint">Type a scent, a brand, or a note — try “Khamrah”, “Lattafa”, or “oud”.</p>;
  }
  const [perfumes, oils] = await Promise.all([getPerfumes(), getOils()]);
  const term = q.toLowerCase();
  const perfumeHits = perfumes.filter((p) => matches(p, term));
  const oilHits = oils.filter((o) => {
    const hay = [o.name, o.brand, o.category].filter(Boolean).join(' ').toLowerCase();
    return term.split(/\s+/).every((t) => hay.includes(t));
  });
  const total = perfumeHits.length + oilHits.length;

  return (
    <>
      <p className="search__count" aria-live="polite">
        {total} {total === 1 ? 'result' : 'results'} for “{q}”
      </p>
      {total === 0 ? (
        <div className="empty">
          <p>No scents match “{q}”.</p>
          <p className="search__hint">Try a shorter word, a brand name, or a note like “vanilla” or “oud”.</p>
        </div>
      ) : (
        <>
          {perfumeHits.length > 0 && (
            <section className="search__section">
              <h2 className="serif search__section-title">Perfumes</h2>
              <div className="shop__grid">
                {perfumeHits.map((p) => (
                  <ShopCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}
          {oilHits.length > 0 && (
            <section className="search__section">
              <h2 className="serif search__section-title">Perfume Oils</h2>
              <div className="shop__grid">
                {oilHits.map((o) => (
                  <ShopCard key={o.id} p={o as unknown as Perfume} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="container search">
      <header className="search__head">
        <p className="eyebrow search__eyebrow">Search</p>
        <h1 className="serif search__title">Find your scent</h1>
        {/* GET form so the query lives in the URL — shareable, back-button friendly, no JS. */}
        <form className="search__form" action="/search" method="get">
          <Suspense fallback={<input type="search" name="q" placeholder="Search scents, brands, notes…" aria-label="Search scents" />}>
            <SearchInput />
          </Suspense>
        </form>
      </header>

      {/* searchParams is request-time data, so it's read inside the Suspense
          child (via SearchResults' closure over the promise) to keep the shell
          prerenderable. The form value is restored client-side after nav. */}
      <Suspense fallback={<p className="search__hint">Searching…</p>}>
        <SearchShell searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Awaits searchParams inside the boundary, then renders results. */
async function SearchShell({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return <SearchResults q={q} />;
}
