/**
 * The one place order money is computed.
 *
 * Both sides use it: the checkout page builds a display quote from cart state,
 * and /api/paystack/initialize rebuilds the SAME quote from the catalog and
 * charges that. The client's numbers are never trusted — they are only a
 * preview of what the server will independently derive.
 *
 * Pure module: no `catalog`, no node APIs, safe in a client bundle.
 */
import {
  FREE_SHIPPING_THRESHOLD_NGN,
  SHIPPING_FLAT_NGN,
  VAT_RATE,
  type OilFormat,
  type Tier,
} from './store.config';
import type { OilCategory } from './mappers';
import type { CartLine, BottleLine, DiscoveryLine } from './cart';

/** What the checkout page POSTs. Contains slugs/types only — never prices. */
export type QuoteSet =
  | { kind: 'perfume'; tier: Tier; items: string[]; qty: number }
  | { kind: 'oil'; oilType: OilCategory; oilFormat: OilFormat; items: string[]; qty: number };

export interface QuoteBottle {
  slug: string;
  qty: number;
}

export interface QuoteDiscovery {
  slug: string;
  qty: number;
}

export interface CartPayload {
  sets: QuoteSet[];
  bottles: QuoteBottle[];
  discovery: QuoteDiscovery[];
}

export interface QuoteLine {
  label: string;
  /** e.g. "Tier Two · 4 decants" or "Niche / High End · 10ml Spray Bottle" */
  detail: string;
  qty: number;
  price: number;
}

export interface QuoteTotals {
  subtotal: number;
  shipping: number;
  vat: number;
  grandTotal: number;
  itemCount: number;
}

/** Shipping + VAT + total for a set of priced lines. */
export function totalsOf(lines: QuoteLine[]): QuoteTotals {
  const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const shipping =
    subtotal <= 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD_NGN ? 0 : SHIPPING_FLAT_NGN;
  const preVat = subtotal + shipping;
  const vat = Math.round(preVat * VAT_RATE);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  return { subtotal, shipping, vat, grandTotal: preVat + vat, itemCount };
}

/** Strip the cart down to what the server needs to reprice it. */
export function payloadFromCart(
  lines: CartLine[],
  bottles: BottleLine[],
  discovery: DiscoveryLine[],
): CartPayload {
  return {
    sets: lines
      .filter((l) => l.items.length > 0)
      .map((l) =>
        l.kind === 'oil'
          ? {
              kind: 'oil' as const,
              oilType: (l.oilType ?? 'designer') as OilCategory,
              oilFormat: (l.oilFormat ?? '5ml-roller') as OilFormat,
              items: l.items,
              qty: l.qty,
            }
          : {
              kind: 'perfume' as const,
              tier: (l.tier ?? 1) as Tier,
              items: l.items,
              qty: l.qty,
            },
      ),
    bottles: bottles.map((b) => ({ slug: b.slug, qty: b.qty })),
    discovery: discovery.map((d) => ({ slug: d.slug, qty: d.qty })),
  };
}

/** A display quote straight from cart state (preview only). */
export function quoteFromCart(
  lines: CartLine[],
  bottles: BottleLine[],
  discovery: DiscoveryLine[],
  labels: { perfume: (tier: Tier | null) => string; oil: (t: OilCategory | null, f: OilFormat | null) => string },
): QuoteLine[] {
  return [
    ...lines.map((l) => ({
      label: l.kind === 'oil' ? 'Perfume oil set' : 'Perfume set',
      detail: l.kind === 'oil' ? labels.oil(l.oilType, l.oilFormat) : labels.perfume(l.tier),
      qty: l.qty,
      price: l.unitPrice,
    })),
    ...bottles.map((b) => ({
      label: b.name,
      detail: 'Full bottle',
      qty: b.qty,
      price: b.unitPrice,
    })),
    ...discovery.map((d) => ({
      label: d.collection,
      detail: 'Curated discovery set',
      qty: d.qty,
      price: d.unitPrice,
    })),
  ];
}
