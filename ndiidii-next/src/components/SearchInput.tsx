'use client';

import { useSearchParams } from 'next/navigation';

/** Search input that keeps the current ?q= value across navigations. */
export function SearchInput() {
  const sp = useSearchParams();
  return (
    <>
      <input
        type="search"
        name="q"
        defaultValue={sp.get('q') ?? ''}
        placeholder="Search scents, brands, notes…"
        aria-label="Search scents"
      />
      <button type="submit" className="btn btn--white">Search</button>
    </>
  );
}
