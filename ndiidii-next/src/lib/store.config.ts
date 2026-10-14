/**
 * Business rules that are NOT in the spreadsheet.
 * Change prices here (one place) — the site reads them from this file.
 *
 * Ported from ndiidii-api/src/config/store.config.ts.
 */

export const BOX_SIZE = 4; // a box is checked out only when it holds exactly this many items

export type Tier = 1 | 2 | 3;

export const TIER_LABELS: Record<Tier, string> = { 1: 'Tier One', 2: 'Tier Two', 3: 'Tier Three' };

// Price of one full box of 4 perfumes, in naira.
export const TIER_BOX_PRICE_NGN: Record<Tier, number> = {
  1: 50000,
  2: 50000,
  3: 30000,
};

// Oil box pricing is still to be decided with the client.
export const OIL_BOX_PRICE_NGN: number | null = null;

// Price of one curated discovery set (4 x 10ml decants, Perfume Option 1 only).
export const DISCOVERY_SET_PRICE_NGN = 40000;

// VAT added to every order's final total (Nigeria standard rate).
export const VAT_RATE = 0.075;

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
