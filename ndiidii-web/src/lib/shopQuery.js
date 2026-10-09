/**
 * Shop filters live in the URL (?tier=1,2&brand=Lattafa&stock=in&sort=newest) so that
 * links from the nav, the homepage brand strip and the Brands page all "just work",
 * and so a filtered view can be shared or refreshed.
 */

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A–Z)' },
];

const list = (v) =>
  (v ? v.split(',') : [])
    .map((s) => s.trim())
    .filter(Boolean);

export const EMPTY_FILTERS = { stock: [], tier: [], gender: [], brand: [], sort: 'featured' };

export function readFilters(sp) {
  const sort = sp.get('sort');
  return {
    stock: list(sp.get('stock')).filter((s) => s === 'in' || s === 'out'),
    tier: list(sp.get('tier')).filter((t) => ['1', '2', '3'].includes(t)),
    gender: list(sp.get('gender'))
      .map((g) => g.toLowerCase())
      .filter((g) => ['men', 'women', 'unisex'].includes(g)),
    brand: list(sp.get('brand')),
    sort: SORTS.some((s) => s.value === sort) ? sort : 'featured',
  };
}

export function writeFilters(f) {
  const sp = new URLSearchParams();
  if (f.stock.length) sp.set('stock', f.stock.join(','));
  if (f.tier.length) sp.set('tier', f.tier.join(','));
  if (f.gender.length) sp.set('gender', f.gender.join(','));
  if (f.brand.length) sp.set('brand', f.brand.join(','));
  if (f.sort !== 'featured') sp.set('sort', f.sort);
  return sp;
}

/** Filters -> query string params for GET /api/perfumes */
export function toApiParams(f) {
  const p = { sort: f.sort };
  // Both or neither availability box ticked = no restriction.
  if (f.stock.length === 1) p.inStock = f.stock[0] === 'in';
  if (f.tier.length) p.tier = f.tier.join(',');
  if (f.gender.length) p.gender = f.gender.join(',');
  if (f.brand.length) p.brand = f.brand.join(',');
  return p;
}

export const countActive = (f) => f.stock.length + f.tier.length + f.gender.length + f.brand.length;

/** Add the value if absent, remove it if present (case-insensitive). */
export const toggle = (arr, value) => {
  const v = String(value).toLowerCase();
  return arr.some((x) => String(x).toLowerCase() === v)
    ? arr.filter((x) => String(x).toLowerCase() !== v)
    : [...arr, String(value)];
};
