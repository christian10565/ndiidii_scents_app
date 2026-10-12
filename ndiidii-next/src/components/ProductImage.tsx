'use client';

import { useState } from 'react';

/** Product photo with a quiet bottle placeholder for items with no image yet (or a broken link). */
export default function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="pimg pimg--empty" role="img" aria-label={alt}>
        <svg viewBox="0 0 60 100" width="38%" aria-hidden="true">
          <rect x="22" y="4" width="16" height="12" rx="2" fill="#cfcac2" />
          <rect x="18" y="16" width="24" height="6" fill="#bdb7ad" />
          <rect x="8" y="22" width="44" height="74" rx="6" fill="#e3dfd8" stroke="#cfcac2" />
        </svg>
      </div>
    );
  }

  return <img className="pimg" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
