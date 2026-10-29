/**
 * Business rules that are NOT in the spreadsheet.
 * Change prices here (one place) — the site reads them from this file.
 *
 * Ported from ndiidii-api/src/config/store.config.ts.
 */
import type { OilCategory } from './mappers';

export const BOX_SIZE = 4; // a set is checked out only when it holds exactly this many items

export type Tier = 1 | 2 | 3;

export const TIER_LABELS: Record<Tier, string> = { 1: 'Tier One', 2: 'Tier Two', 3: 'Tier Three' };

// Price of one full set of 4 perfume DECANTS, in naira. The decant price is set by
// tier and is flat — the per-perfume `Price` column in the sheet is the FULL
// BOTTLE price (see `bottlePrice` on Perfume), not this.
export const TIER_BOX_PRICE_NGN: Record<Tier, number> = {
  1: 50000,
  2: 40000,
  3: 30000,
};

/* ------------------------------------------------------------------ *
 * Perfume oils
 *
 * An oil set is 4 bottles of the SAME collection type (Designer | Niche) in the
 * SAME bottle format. Type and format are part of the set definition, so they
 * are priced here rather than in the sheet — every oil costs the same per
 * (type, format) pair.
 * ------------------------------------------------------------------ */

export type OilFormat = '5ml-roller' | '10ml-spray' | '10ml-roller';

export const OIL_FORMATS: { value: OilFormat; label: string }[] = [
  { value: '5ml-roller', label: '5ml Roller Bottle' },
  { value: '10ml-spray', label: '10ml Spray Bottle' },
  { value: '10ml-roller', label: '10ml Roller Bottle' },
];

export const OIL_TYPE_LABELS: Record<OilCategory, string> = {
  designer: 'Designer',
  niche: 'Niche / High End',
};

/** Price of one set of 4 oil bottles, by collection type and bottle format. */
export const OIL_SET_PRICE_NGN: Record<OilCategory, Record<OilFormat, number>> = {
  designer: { '5ml-roller': 35000, '10ml-spray': 50000, '10ml-roller': 50000 },
  niche: { '5ml-roller': 50000, '10ml-spray': 75000, '10ml-roller': 75000 },
};

export const oilSetPrice = (type: OilCategory, format: OilFormat): number =>
  OIL_SET_PRICE_NGN[type]?.[format] ?? 0;

/** Price of one curated discovery set (4 x 10ml decants), in naira. */
export const DISCOVERY_SET_PRICE_NGN = 40000;

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

// VAT added to every order's final total (Nigeria standard rate).
export const VAT_RATE = 0.075;

/** Flat delivery fee below the threshold, in naira. */
export const SHIPPING_FLAT_NGN = 2500;

/** Spend this much and delivery is free. */
export const FREE_SHIPPING_THRESHOLD_NGN = 150000;

export const NIGERIA_STATES: string[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

/** Stock given to a NEW product when the sheet has no Stock value for it. */
export const DEFAULT_STOCK = Number(process.env.DEFAULT_STOCK ?? 0) || 0;

/**
 * When a sheet row has NO stock value at all (no Stock column exists), treat it
 * as available rather than sold out — otherwise a catalog with no stock data
 * shows every product as "out of stock". Set to "false" to fall back to
 * DEFAULT_STOCK (e.g. 0) for unknown-stock rows.
 */
export const UNKNOWN_STOCK_IS_AVAILABLE = (process.env.UNKNOWN_STOCK_IS_AVAILABLE ?? 'true') !== 'false';
