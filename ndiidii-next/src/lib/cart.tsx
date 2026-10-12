'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BOX_SIZE, TIER_BOX_PRICE_NGN, type Tier } from '@/lib/store.config';

/**
 * Cart + in-progress "sets" for the Collection Builder. No backend and no user
 * accounts, so state lives in localStorage and survives navigation and refresh.
 *
 * Model:
 *  - drafts: up to BOX_SIZE (4) product slugs per tier, built concurrently.
 *  - lines:  completed sets added to the cart — each is one tier's 4 decants at
 *            that tier's fixed box price, with a quantity.
 */

export interface CartLine {
  id: string;
  tier: Tier;
  items: string[]; // product slugs (length === BOX_SIZE)
  qty: number;
  unitPrice: number; // TIER_BOX_PRICE_NGN[tier]
}

interface CartState {
  drafts: Record<Tier, string[]>;
  lines: CartLine[];
}

const EMPTY: CartState = { drafts: { 1: [], 2: [], 3: [] }, lines: [] };
const STORAGE_KEY = 'ndiidii-cart-v1';

function load(): CartState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      drafts: { 1: parsed.drafts?.[1] ?? [], 2: parsed.drafts?.[2] ?? [], 3: parsed.drafts?.[3] ?? [] },
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
    };
  } catch {
    return EMPTY;
  }
}

interface CartApi {
  drafts: Record<Tier, string[]>;
  lines: CartLine[];
  toggleDraft: (tier: Tier, slug: string) => void;
  clearDraft: (tier: Tier) => void;
  draftCount: (tier: Tier) => number;
  isFull: (tier: Tier) => boolean;
  addSetToCart: (tier: Tier, qty?: number) => void;
  removeLine: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartApi | null>(null);

/** True only after the component has mounted on the client. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const mounted = useMounted();

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => setState(load()), []);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }, [state]);

  const toggleDraft = useCallback((tier: Tier, slug: string) => {
    setState((s) => {
      const cur = s.drafts[tier];
      const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug].slice(0, BOX_SIZE);
      return { ...s, drafts: { ...s.drafts, [tier]: next } };
    });
  }, []);

  const clearDraft = useCallback((tier: Tier) => {
    setState((s) => ({ ...s, drafts: { ...s.drafts, [tier]: [] } }));
  }, []);

  const addSetToCart = useCallback((tier: Tier, qty = 1) => {
    setState((s) => {
      const items = s.drafts[tier];
      if (items.length !== BOX_SIZE) return s; // only complete sets
      const line: CartLine = {
        id: `${tier}-${items.join('+')}-${Date.now()}`,
        tier,
        items: [...items],
        qty: Math.max(1, qty),
        unitPrice: TIER_BOX_PRICE_NGN[tier],
      };
      return { drafts: { ...s.drafts, [tier]: [] }, lines: [...s.lines, line] };
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

  const api = useMemo<CartApi>(() => {
    const draftCount = (t: Tier) => state.drafts[t].length;
    return {
      drafts: state.drafts,
      lines: state.lines,
      toggleDraft,
      clearDraft,
      draftCount,
      isFull: (t) => draftCount(t) === BOX_SIZE,
      addSetToCart,
      removeLine,
      setQty,
      // Before hydration the server rendered an empty cart, so report 0 to keep
      // the first client paint identical (avoids a hydration mismatch). Real
      // values appear the moment localStorage has been read.
      cartCount: mounted ? state.lines.reduce((n, l) => n + l.qty, 0) : 0,
      cartTotal: mounted ? state.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) : 0,
    };
  }, [state, mounted, toggleDraft, clearDraft, addSetToCart, removeLine, setQty]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
