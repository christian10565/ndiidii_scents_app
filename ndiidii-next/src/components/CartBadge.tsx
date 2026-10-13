'use client';

import { useEffect, useState } from 'react';

/**
 * Live cart count for the header badge. Reads the localStorage-backed cart
 * directly and re-reads on every `ndiidii-cart-change` event, so it stays in
 * sync even though the header sits inside a Suspense boundary (context updates
 * from CartProvider don't reliably cross that boundary).
 */
function readCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem('ndiidii-cart-v1');
    if (!raw) return 0;
    const c = JSON.parse(raw);
    const lines = Array.isArray(c.lines) ? c.lines.reduce((n: number, l: any) => n + (l.qty || 0), 0) : 0;
    const disc = Array.isArray(c.discovery) ? c.discovery.reduce((n: number, l: any) => n + (l.qty || 0), 0) : 0;
    return lines + disc;
  } catch {
    return 0;
  }
}

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readCount());
    const onChange = () => setCount(readCount());
    window.addEventListener('ndiidii-cart-change', onChange);
    // Also re-read when another tab changes the cart.
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('ndiidii-cart-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // suppressHydrationWarning: 0 on the server / first paint, real value after mount.
  return (
    <span className="icon-btn__badge" suppressHydrationWarning>
      {count}
    </span>
  );
}
