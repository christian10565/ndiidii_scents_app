'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BRAND_LOGOS } from '@/config/site';

function BrandLogo({ name, logo }: { name: string; logo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <li className="logos__item">
      <Link href={`/shop?brand=${encodeURIComponent(name)}`}>
        <span className="logos__img">
          {!failed && <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />}
          {failed && <span className="logos__fallback serif">{name}</span>}
        </span>
        <span className="logos__name">{name}</span>
      </Link>
    </li>
  );
}

/** Endless marquee: the list is rendered twice and slid by exactly one copy. */
export default function LogoCarousel() {
  return (
    <section className="logos" aria-label="Brands we carry">
      <div className="logos__track">
        {[0, 1].map((copy) => (
          <ul className="logos__group" key={copy} aria-hidden={copy === 1}>
            {BRAND_LOGOS.map((b) => (
              <BrandLogo key={b.name} {...b} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
