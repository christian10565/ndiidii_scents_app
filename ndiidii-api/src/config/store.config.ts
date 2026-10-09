/**
 * Business rules that are NOT in the spreadsheet.
 * Change prices here (one place) — the React app reads them from GET /api/config.
 */

export const BOX_SIZE = 4; // a box is checked out only when it holds exactly this many items

export type Tier = 1 | 2 | 3;

// Price of one full box of 4 perfumes, in naira.
export const TIER_BOX_PRICE_NGN: Record<Tier, number> = {
  1: 50000,
  2: 50000,
  3: 30000,
};

// Oil box pricing is still to be decided with the client.
export const OIL_BOX_PRICE_NGN: number | null = null;

export const NIGERIA_STATES: string[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];
