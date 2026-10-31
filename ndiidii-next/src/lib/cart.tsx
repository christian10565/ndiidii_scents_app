'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BOX_SIZE,
  TIER_BOX_PRICE_NGN,
  DISCOVERY_SET_PRICE_NGN,
  oilSetPrice,
  type OilFormat,
  type Tier,
} from '@/lib/store.config';
import type { OilCategory } from '@/lib/mappers';

/**
 * Cart + in-progress sets. No backend, so state lives in localStorage.
 *
 * Model (v2 — the perfume got a second size and oils got type/format):
 *  - lines:       sets of exactly BOX_SIZE product slugs.
 *                 A perfume set is (tier); an oil set is (oilType, oilFormat).
 *                 Builders keep their draft in local state and only write a
 *                 COMPLETE set here, so a line is never half-built.
 *  - bottles:     single full bottles of one perfume, priced from the sheet.
 *  - discovery:   curated discovery sets, always complete.
 *
 * v1 carts held oils with no bottle format, so they cannot be repriced. The
 * storage key is bumped to v2 and old carts are dropped rather than migrated.
 */

export type BoxKind = 'perfume' | 'oil';

export interface CartLine {
  id: string;
  kind: BoxKind;
  /** perfume sets only */
  tier: Tier | null;
  /** oil sets only — Designer | Niche. A set never mixes them. */
  oilType: OilCategory | null;
  /** oil sets only — 5ml roller | 10ml spray | 10ml roller. */
  oilFormat: OilFormat | null;
  items: string[];
  qty: number;
  unitPrice: number;
}

/** A full bottle, bought on its own. */
export interface BottleLine {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  tier: Tier | null;
  unitPrice: number;
  qty: number;
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
  bottles: BottleLine[];
  discovery: DiscoveryLine[];
}

const EMPTY: CartState = { lines: [], bottles: [], discovery: [] };
const STORAGE_KEY = 'ndiidii-cart-v2';

function load(): CartState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      bottles: Array.isArray(parsed.bottles) ? parsed.bottles : [],
      discovery: Array.isArray(parsed.discovery) ? parsed.discovery : [],
    };
  } catch {
    return EMPTY;
  }
}

export interface AddLineInput {
  kind: BoxKind;
  tier?: Tier | null;
  oilType?: OilCategory | null;
  oilFormat?: OilFormat | null;
  items: string[];
  qty?: number;
}

export interface AddBottleInput {
  slug: string;
  name: string;
  brand: string | null;
  tier: Tier | null;
  unitPrice: number;
}

export interface CartApi {
  lines: CartLine[];
  bottles: BottleLine[];
  discovery: DiscoveryLine[];
  addLine: (input: AddLineInput) => void;
  removeLine: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  addBottle: (input: AddBottleInput, qty?: number) => void;
  removeBottle: (id: string) => void;
  setBottleQty: (id: string, qty: number) => void;
  addDiscoverySet: (line: Omit<DiscoveryLine, 'id' | 'qty' | 'unitPrice'>, qty?: number) => void;
  removeDiscovery: (id: string) => void;
  setDiscoveryQty: (id: string, qty: number) => void;
  clearCart: () => void;
  canCheckout: () => boolean;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartApi | null>(null);

const clampQty = (qty: number, max = 99) => Math.max(1, Math.min(max, Math.floor(qty) || 1));

const linePrice = (kind: BoxKind, tier: Tier | null, oilType: OilCategory | null, oilFormat: OilFormat | null): number => {
  if (kind === 'oil') return oilType && oilFormat ? oilSetPrice(oilType, oilFormat) : 0;
  return tier !== null ? TIER_BOX_PRICE_NGN[tier] : 0;
};

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

  /**
   * Append a complete set. The builders keep their in-progress picks in local
   * state and only call this once a set is full, so a half-built set never
   * becomes a cart line that other screens have to reason about.
   */
  const addLine = useCallback((input: AddLineInput) => {
    const { kind, items } = input;
    if (items.length !== BOX_SIZE) return;
    const tier = kind === 'perfume' ? (input.tier ?? null) : null;
    const oilType = kind === 'oil' ? (input.oilType ?? null) : null;
    const oilFormat = kind === 'oil' ? (input.oilFormat ?? null) : null;
    if (kind === 'perfume' && tier === null) return;
    if (kind === 'oil' && (!oilType || !oilFormat)) return;

    setState((s) => {
      const line: CartLine = {
        id: `${kind}-${tier ?? oilType}-${oilFormat ?? ''}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        tier,
        oilType,
        oilFormat,
        items: [...items],
        qty: clampQty(input.qty ?? 1),
        unitPrice: linePrice(kind, tier, oilType, oilFormat),
      };
      return { ...s, lines: [...s.lines, line] };
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l)),
    }));
  }, []);

  /** Add (or bump) one full bottle. Same slug merges into the existing line. */
  const addBottle = useCallback((input: AddBottleInput, qty = 1) => {
    if (!input.slug || !(input.unitPrice > 0)) return;
    setState((s) => {
      const idx = s.bottles.findIndex((b) => b.slug === input.slug);
      if (idx >= 0) {
        const next = [...s.bottles];
        next[idx] = { ...next[idx], qty: clampQty(next[idx].qty + qty, 99) };
        return { ...s, bottles: next };
      }
      const line: BottleLine = {
        id: `bottle-${input.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        slug: input.slug,
        name: input.name,
        brand: input.brand,
        tier: input.tier,
        unitPrice: input.unitPrice,
        qty: clampQty(qty, 99),
      };
      return { ...s, bottles: [...s.bottles, line] };
    });
  }, []);

  const removeBottle = useCallback((id: string) => {
    setState((s) => ({ ...s, bottles: s.bottles.filter((b) => b.id !== id) }));
  }, []);

  const setBottleQty = useCallback((id: string, qty: number) => {
    setState((s) => ({
      ...s,
      bottles: s.bottles.map((b) => (b.id === id ? { ...b, qty: clampQty(qty) } : b)),
    }));
  }, []);

  const addDiscoverySet = useCallback(
    (line: Omit<DiscoveryLine, 'id' | 'qty' | 'unitPrice'>, qty = 1) => {
      setState((s) => {
        const idx = s.discovery.findIndex((d) => d.slug === line.slug);
        if (idx >= 0) {
          const next = [...s.discovery];
          next[idx] = { ...next[idx], qty: next[idx].qty + Math.max(1, qty) };
          return { ...s, discovery: next };
        }
        return {
          ...s,
          discovery: [
            ...s.discovery,
            {
              ...line,
              id: `disc-${line.slug}-${Date.now()}`,
              qty: Math.max(1, qty),
              unitPrice: DISCOVERY_SET_PRICE_NGN,
            },
          ],
        };
      });
    },
    [],
  );

  const removeDiscovery = useCallback((id: string) => {
    setState((s) => ({ ...s, discovery: s.discovery.filter((l) => l.id !== id) }));
  }, []);

  const setDiscoveryQty = useCallback((id: string, qty: number) => {
    setState((s) => ({
      ...s,
      discovery: s.discovery.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l)),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState({ lines: [], bottles: [], discovery: [] });
  }, []);

  const canCheckout = useCallback(() => {
    const anything =
      state.lines.length > 0 || state.bottles.length > 0 || state.discovery.length > 0;
    return (
      anything &&
      state.lines.every((l) => l.items.length === BOX_SIZE) &&
      state.lines.every((l) => l.unitPrice > 0) &&
      state.bottles.every((b) => b.unitPrice > 0) &&
      state.discovery.every((d) => d.items.length > 0)
    );
  }, [state.lines, state.bottles, state.discovery]);

  const cartCount = useMemo(() => {
    if (!canCheckout()) return 0;
    return (
      state.lines.reduce((n, l) => n + l.qty, 0) +
      state.bottles.reduce((n, b) => n + b.qty, 0) +
      state.discovery.reduce((n, l) => n + l.qty, 0)
    );
  }, [state.lines, state.bottles, state.discovery, canCheckout]);

  const cartTotal = useMemo(
    () =>
      state.lines.filter((l) => l.items.length === BOX_SIZE).reduce((n, l) => n + l.qty * l.unitPrice, 0) +
      state.bottles.reduce((n, b) => n + b.qty * b.unitPrice, 0) +
      state.discovery.reduce((n, l) => n + l.qty * l.unitPrice, 0),
    [state.lines, state.bottles, state.discovery],
  );

  const api = useMemo<CartApi>(
    () => ({
      lines: state.lines,
      bottles: state.bottles,
      discovery: state.discovery,
      addLine,
      removeLine,
      setQty,
      addBottle,
      removeBottle,
      setBottleQty,
      addDiscoverySet,
      removeDiscovery,
      setDiscoveryQty,
      clearCart,
      canCheckout,
      cartCount,
      cartTotal,
    }),
    [
      state.lines,
      state.bottles,
      state.discovery,
      addLine,
      removeLine,
      setQty,
      addBottle,
      removeBottle,
      setBottleQty,
      addDiscoverySet,
      removeDiscovery,
      setDiscoveryQty,
      clearCart,
      canCheckout,
      cartCount,
      cartTotal,
    ],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
