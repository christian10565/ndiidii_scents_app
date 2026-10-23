'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, OIL_BOX_PRICE_NGN, DISCOVERY_SET_PRICE_NGN, type Tier } from '@/lib/store.config';

/**
 * Cart + in-progress sets. No backend, so state lives in localStorage.
 *
 * Model:
 *  - lines: sets of up to BOX_SIZE product slugs. A line may be incomplete.
 *           Checkout is blocked while any line is incomplete.
 *  - discovery: curated discovery sets, always complete.
 */

export type BoxKind = 'perfume' | 'oil';

export interface CartLine {
  id: string;
  kind: BoxKind;
  tier: Tier | null;
  items: string[];
  qty: number;
  unitPrice: number;
}

export interface DiscoveryLine {
  id: string;
  collection: string;
  slug: string;
  items: { name: string; slug: string | null; imageUrl: string | null }[];
  qty: number;
  unitPrice: number;
}

interface CartState {
  lines: CartLine[];
  discovery: DiscoveryLine[];
}

const EMPTY: CartState = { lines: [], discovery: [] };
const STORAGE_KEY = 'ndiidii-cart-v1';

function load(): CartState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    const lines: CartLine[] = [];

    if (Array.isArray(parsed.lines)) {
      lines.push(...parsed.lines);
    }
    if (parsed.drafts) {
      for (const [tierStr, slugs] of Object.entries(parsed.drafts ?? {})) {
        const tier = Number(tierStr) as Tier;
        const items = Array.isArray(slugs) ? slugs.slice(0, BOX_SIZE) : [];
        if (!items.length) continue;
        lines.push({
          id: `perfume-${tier}-${items.join('+')}-${Date.now()}`,
          kind: 'perfume',
          tier,
          items,
          qty: 1,
          unitPrice: TIER_BOX_PRICE_NGN[tier],
        });
      }
    }
    if (Array.isArray(parsed.oils) && parsed.oils.length) {
      lines.push({
        id: `oil-${parsed.oils.join('+')}-${Date.now()}`,
        kind: 'oil',
        tier: null,
        items: parsed.oils.slice(0, BOX_SIZE),
        qty: 1,
        unitPrice: OIL_BOX_PRICE_NGN ?? 0,
      });
    }

    return {
      lines,
      discovery: Array.isArray(parsed.discovery) ? parsed.discovery : [],
    };
  } catch {
    return EMPTY;
  }
}

export interface CartApi {
  lines: CartLine[];
  discovery: DiscoveryLine[];
  toggleLine: (kind: BoxKind, tier: Tier | null, slug: string) => void;
  removeLine: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  addDiscoverySet: (line: Omit<DiscoveryLine, 'id' | 'qty' | 'unitPrice'>, qty?: number) => void;
  removeDiscovery: (id: string) => void;
  setDiscoveryQty: (id: string, qty: number) => void;
  clearCart: () => void;
  canCheckout: () => boolean;
  cartCount: number;
  cartTotal: number;
  linesFor: (kind: BoxKind, tier?: Tier | null) => CartLine[];
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full/blocked — non-fatal */
    }
    window.dispatchEvent(new Event('ndiidii-cart-change'));
  }, [state, hydrated]);

  const toggleLine = useCallback((kind: BoxKind, tier: Tier | null, slug: string) => {
    setState((s) => {
      const candidates = s.lines.filter(
        (l) => l.kind === kind && l.tier === tier && l.items.length < BOX_SIZE,
      );
      let line = candidates[0];
      if (!line) {
        const unitPrice =
          kind === 'oil'
            ? OIL_BOX_PRICE_NGN ?? 0
            : tier !== null
              ? TIER_BOX_PRICE_NGN[tier]
              : 0;
        const newLine: CartLine = {
          id: `${kind}-${tier ?? 'oil'}-${Date.now()}`,
          kind,
          tier,
          items: [slug],
          qty: 1,
          unitPrice,
        };
        return { ...s, lines: [...s.lines, newLine] };
      }
      const has = line.items.includes(slug);
      const nextItems = has ? line.items.filter((x) => x !== slug) : [...line.items, slug];
      const updated = { ...line, items: nextItems };
      return { ...s, lines: s.lines.map((l) => (l.id === line!.id ? updated : l)) };
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(99, qty)) } : l)),
    }));
  }, []);

  const addDiscoverySet = useCallback(
    (line: Omit<DiscoveryLine, 'id' | 'qty' | 'unitPrice'>, qty = 1) => {
      setState((s) => ({
        ...s,
        discovery: [
          ...s.discovery,
          { ...line, id: `disc-${line.slug}-${Date.now()}`, qty: Math.max(1, qty), unitPrice: DISCOVERY_SET_PRICE_NGN },
        ],
      }));
    },
    [],
  );

  const removeDiscovery = useCallback((id: string) => {
    setState((s) => ({ ...s, discovery: s.discovery.filter((l) => l.id !== id) }));
  }, []);

  const setDiscoveryQty = useCallback((id: string, qty: number) => {
    setState((s) => ({
      ...s,
      discovery: s.discovery.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(99, qty)) } : l)),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState({ lines: [], discovery: [] });
  }, []);

  const canCheckout = useCallback(() => {
    return (
      state.lines.length > 0 &&
      state.lines.every((l) => l.items.length === BOX_SIZE) &&
      state.discovery.every((d) => d.items.length > 0)
    );
  }, [state.lines, state.discovery]);

  const api = useMemo<CartApi>(() => {
    const linesFor = (kind: BoxKind, tier?: Tier | null) =>
      state.lines.filter((l) => l.kind === kind && (tier === undefined ? true : l.tier === tier));
    const fullLines = state.lines.filter((l) => l.items.length === BOX_SIZE);
    return {
      lines: state.lines,
      discovery: state.discovery,
      toggleLine,
      removeLine,
      setQty,
      addDiscoverySet,
      removeDiscovery,
      setDiscoveryQty,
      clearCart,
      canCheckout,
      cartCount: fullLines.reduce((n, l) => n + l.qty, 0) + state.discovery.reduce((n, l) => n + l.qty, 0),
      cartTotal:
        fullLines.reduce((n, l) => n + l.qty * l.unitPrice, 0) +
        state.discovery.reduce((n, l) => n + l.qty * l.unitPrice, 0),
      linesFor,
    };
  }, [state, toggleLine, removeLine, setQty, addDiscoverySet, removeDiscovery, setDiscoveryQty, clearCart, canCheckout]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
