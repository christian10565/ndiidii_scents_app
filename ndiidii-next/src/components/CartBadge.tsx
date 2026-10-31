'use client';

import { useSyncExternalStore } from 'react';

/**
 * Live cart count for the header badge. Reads the localStorage-backed cart
 * directly (context updates don't reliably cross the header's Suspense
 * boundary) and subscribes to both the in-page change event and the cross-tab
 * `storage` event.
 *
 * `useSyncExternalStore` is the right primitive for an external store: no
 * setState-in-effect, and the server snapshot is a stable 0 so hydration is
 * clean.
 */
const CART_KEY = 'ndiidii-cart-v2';

interface RawCart {
  lines?: { items?: unknown; qty?: unknown }[];
  bottles?: { qty?: unknown }[];
  discovery?: { qty?: unknown }[];
}

function readCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return 0;
    const c = JSON.parse(raw) as RawCart;
    const sum = (arr?: { qty?: unknown }[]) =>
      (arr ?? []).reduce((n, l) => n + (Number(l.qty) || 0), 0);
    // Only complete sets are counted — a half-built set is not in the cart.
    const sets = (c.lines ?? []).filter((l) => Array.isArray(l.items) && l.items.length === 4);
    return sum(sets) + sum(c.bottles) + sum(c.discovery);
  } catch {
    return 0;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('ndiidii-cart-change', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('ndiidii-cart-change', onChange);
    window.removeEventListener('storage', onChange);
  };
}

export default function CartBadge() {
  const count = useSyncExternalStore(subscribe, readCount, () => 0);
  return (
    <span className="icon-btn__badge" suppressHydrationWarning>
      {count}
    </span>
  );
}
