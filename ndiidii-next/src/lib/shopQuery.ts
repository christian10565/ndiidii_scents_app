/**
 * Shop filters live in the URL (?tier=1,2&brand=Lattafa&stock=in&sort=newest) so that
 * links from the nav, the homepage brand strip and the Brands page all "just work",
 * and so a filtered view can be shared or refreshed.
 *
 * Ported from ndiidii-web/src/lib/shopQuery.js.
 */

export type SortValue = 'featured' | 'newest' | 'name';

export interface Filters {
  collection: string | null;
  stock: string[]; // 'in' | 'out'
  tier: string[]; // '1' | '2' | '3'
  gender: string[]; // 'men' | 'women' | 'unisex'
  notes: string[];
  brand: string[];
  sort: SortValue;
}

export const SORTS = [
  { value: 'featured' as SortValue, label: 'Featured' },
  { value: 'newest' as SortValue, label: 'Newest' },
  { value: 'name' as SortValue, label: 'Name (A–Z)' },
];

const list = (v: string | null): string[] =>
  (v ? v.split(',') : []).map((s) => s.trim()).filter(Boolean);

export const EMPTY_FILTERS: Filters = { collection: null, stock: [], tier: [], gender: [], notes: [], brand: [], sort: 'featured' };

export function readFilters(sp: URLSearchParams): Filters {
  const sort = sp.get('sort');
  return {
    collection: list(sp.get('collection')).pop() ?? null,
    stock: list(sp.get('stock')).filter((s) => s === 'in' || s === 'out'),
    tier: list(sp.get('tier')).filter((t) => ['1', '2', '3'].includes(t)),
    gender: list(sp.get('gender'))
      .map((g) => g.toLowerCase())
      .filter((g) => ['men', 'women', 'unisex'].includes(g)),
    notes: list(sp.get('notes')),
    brand: list(sp.get('brand')),
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortValue) : 'featured',
  };
}

export function writeFilters(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.collection) sp.set('collection', f.collection);
  if (f.stock.length) sp.set('stock', f.stock.join(','));
  if (f.tier.length) sp.set('tier', f.tier.join(','));
  if (f.gender.length) sp.set('gender', f.gender.join(','));
  if (f.notes.length) sp.set('notes', f.notes.join(','));
  if (f.brand.length) sp.set('brand', f.brand.join(','));
  if (f.sort !== 'featured') sp.set('sort', f.sort);
  return sp;
}

export const countActive = (f: Filters): number =>
  f.stock.length + f.tier.length + f.gender.length + f.notes.length + f.brand.length;

/** Add the value if absent, remove it if present (case-insensitive). */
export const toggle = (arr: string[], value: string): string[] => {
  const v = String(value).toLowerCase();
  return arr.some((x) => String(x).toLowerCase() === v)
    ? arr.filter((x) => String(x).toLowerCase() !== v)
    : [...arr, String(value)];
};
