'use client';

import Link from 'next/link';
import { useMemo } from 'react';

/**
 * Brands A–Z index. Groups brand names under letter headers and shows a jump
 * index of only the letters that have brands. Each name links to the shop
 * filtered to that brand.
 */
export function BrandIndex({ names }: { names: string[] }) {
  // Group by first letter (case-insensitive, letters only).
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const name of names) {
      const letter = name.trim().charAt(0).toUpperCase();
      if (!/[A-Z]/.test(letter)) continue;
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(name);
    }
    // Sort each group, and the letters A–Z.
    for (const list of map.values()) list.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [names]);

  const letters = groups.map(([l]) => l);

  const scrollTo = (letter: string) => {
    document.getElementById(`brand-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container brands">
      <header className="brands__head">
        <p className="eyebrow brands__eyebrow">House Lines</p>
        <h1 className="serif brands__title">Brands A–Z</h1>
        <p className="brands__intro">
          Every house we carry, in one list. Pick a name to see everything from that brand.
        </p>
      </header>

      {/* Jump index — only letters that have brands */}
      {letters.length > 0 && (
        <nav className="brands__index" aria-label="Jump to letter">
          {letters.map((l) => (
            <button key={l} className="brands__index-letter" onClick={() => scrollTo(l)}>
              {l}
            </button>
          ))}
        </nav>
      )}

      {groups.length === 0 ? (
        <p className="empty">No brands yet.</p>
      ) : (
        <div className="brands__groups">
          {groups.map(([letter, list]) => (
            <section key={letter} id={`brand-${letter}`} className="brands__group">
              <h2 className="serif brands__letter">{letter}</h2>
              <div className="brands__rule" />
              <ul className="brands__list">
                {list.map((name) => (
                  <li key={name}>
                    <Link href={`/shop?brand=${encodeURIComponent(name)}`}>{name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
