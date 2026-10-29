/**
 * Server-side order pricing.
 *
 * The client posts slugs, tiers, oil type/format and quantities — never prices.
 * This module rebuilds the order from the cached catalog and the price tables in
 * store.config, then returns the only total that is allowed to reach Paystack.
 * Anything the client claimed about money is ignored.
 */
import { getPerfumes, getOils, getCuratedSets } from './catalog';
import {
  BOX_SIZE,
  DISCOVERY_SET_PRICE_NGN,
  OIL_FORMATS,
  OIL_TYPE_LABELS,
  TIER_BOX_PRICE_NGN,
  TIER_LABELS,
  oilSetPrice,
  type OilFormat,
  type Tier,
} from './store.config';
import { totalsOf, type CartPayload, type QuoteLine, type QuoteTotals } from './quote';

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PricingError';
    this.status = status;
  }
}

export interface ServerQuote extends QuoteTotals {
  lines: QuoteLine[];
  /** Slugs referenced by the order, for the ledger. */
  itemCount: number;
}

const MAX_LINES = 40;
const qtyOf = (n: unknown): number => {
  const q = Math.floor(Number(n));
  return Number.isFinite(q) && q > 0 ? Math.min(q, 99) : 1;
};

const formatLabel = (f: OilFormat): string =>
  OIL_FORMATS.find((x) => x.value === f)?.label ?? f;

/**
 * Validate + price a cart payload. Throws PricingError (400) on anything the
 * catalog disagrees with: unknown slug, wrong tier, mixed oil types, wrong
 * bottle count, missing bottle price, out of stock.
 */
export async function quoteCart(payload: CartPayload): Promise<ServerQuote> {
  const sets = Array.isArray(payload.sets) ? payload.sets : [];
  const bottles = Array.isArray(payload.bottles) ? payload.bottles : [];
  const discovery = Array.isArray(payload.discovery) ? payload.discovery : [];

  if (sets.length + bottles.length + discovery.length === 0) {
    throw new PricingError('Your cart is empty.');
  }
  if (sets.length + bottles.length + discovery.length > MAX_LINES) {
    throw new PricingError('That is too many separate lines for one order.');
  }

  const [perfumes, oils, curated] = await Promise.all([getPerfumes(), getOils(), getCuratedSets()]);
  const perfumeBySlug = new Map(perfumes.map((p) => [p.slug, p]));
  const oilBySlug = new Map(oils.map((o) => [o.slug, o]));
  const curatedBySlug = new Map(curated.map((c) => [c.slug, c]));

  const lines: QuoteLine[] = [];

  for (const set of sets) {
    const items = Array.isArray(set.items) ? set.items.filter((s) => typeof s === 'string') : [];
    const unique = [...new Set(items)];
    if (unique.length !== BOX_SIZE || items.length !== BOX_SIZE) {
      throw new PricingError(`Every set must contain exactly ${BOX_SIZE} different products.`);
    }
    const qty = qtyOf(set.qty);

    if (set.kind === 'oil') {
      const type = set.oilType;
      const format = set.oilFormat;
      if (type !== 'designer' && type !== 'niche') throw new PricingError('Unknown oil collection type.');
      if (!OIL_FORMATS.some((f) => f.value === format)) throw new PricingError('Unknown oil bottle size.');

      for (const slug of unique) {
        const oil = oilBySlug.get(slug);
        if (!oil) throw new PricingError('One of the oils in this set is no longer available.');
        if (oil.category !== type) {
          throw new PricingError('An oil set cannot mix Designer and Niche oils.');
        }
        if (!oil.inStock) throw new PricingError(`${oil.name} is out of stock.`);
      }

      const price = oilSetPrice(type, format);
      if (price <= 0) throw new PricingError('That oil set has no price configured.');
      lines.push({
        label: 'Perfume oil set',
        detail: `${OIL_TYPE_LABELS[type]} · ${formatLabel(format)} · ${BOX_SIZE} bottles`,
        qty,
        price,
      });
      continue;
    }

    const tier = Number(set.tier) as Tier;
    if (![1, 2, 3].includes(tier)) throw new PricingError('Unknown perfume tier.');

    for (const slug of unique) {
      const p = perfumeBySlug.get(slug);
      if (!p) throw new PricingError('One of the perfumes in this set is no longer available.');
      if (p.tier !== tier) throw new PricingError(`${p.name} is not in ${TIER_LABELS[tier]}.`);
      if (!p.inStock) throw new PricingError(`${p.name} is out of stock.`);
    }

    lines.push({
      label: 'Perfume set',
      detail: `${TIER_LABELS[tier]} · ${BOX_SIZE} decants`,
      qty,
      price: TIER_BOX_PRICE_NGN[tier],
    });
  }

  for (const b of bottles) {
    const slug = typeof b.slug === 'string' ? b.slug : '';
    const p = perfumeBySlug.get(slug);
    if (!p) throw new PricingError('A full bottle in your cart is no longer available.');
    if (!p.inStock) throw new PricingError(`${p.name} is out of stock.`);
    if (!p.bottlePrice || p.bottlePrice <= 0) {
      throw new PricingError(`${p.name} has no full-bottle price yet.`);
    }
    lines.push({
      label: p.name,
      detail: `Full bottle${p.brand ? ` · ${p.brand}` : ''}`,
      qty: qtyOf(b.qty),
      price: p.bottlePrice,
    });
  }

  for (const d of discovery) {
    const slug = typeof d.slug === 'string' ? d.slug : '';
    const set = curatedBySlug.get(slug);
    if (!set) throw new PricingError('A curated set in your cart is no longer available.');
    lines.push({
      label: set.collection,
      detail: 'Curated discovery set',
      qty: qtyOf(d.qty),
      price: DISCOVERY_SET_PRICE_NGN,
    });
  }

  const totals = totalsOf(lines);
  return { ...totals, lines };
}
