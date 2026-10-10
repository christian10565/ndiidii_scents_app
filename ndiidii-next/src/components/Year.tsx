'use client';

import { useEffect, useState } from 'react';

/**
 * Footer year. Computed after hydration so it never freezes into the prerender
 * and never changes per request. Renders nothing server-side (avoids a layout
 * shift for the year token, which only matters on first paint of the footer).
 */
export default function Year() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return <>{year}</>;
}
