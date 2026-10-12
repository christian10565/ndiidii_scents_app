/**
 * Sheet header aliases: which sheet headers feed which field.
 * Headers are matched after normalising (lowercase, letters/digits only),
 * so "Top Notes", "top notes" and "TOP_NOTES" all become "topnotes".
 * If she names a column differently, add the new name here.
 *
 * Ported verbatim from ndiidii-api/src/sync/mappers.ts.
 */
import type { SheetRow } from './sheets';

const ALIASES = {
  name: ['perfumename', 'perfumeoilname', 'oilname', 'name', 'product', 'productname'],
  brand: ['brand', 'house'],
  gender: ['gender'],
  category: ['category'],
  tier: ['tier'],
  scentProfile: ['scentprofile', 'scentfamily', 'family'],
  inspiredBy: ['inspiredby'],
  topNotes: ['topnotes'],
  heartNotes: ['heartnotes', 'middlenotes'],
  baseNotes: ['basenotes'],
  description: ['description', 'about'],
  stock: ['stock', 'quantity', 'qty', 'inventory', 'available', 'unitsavailable'],
  image: ['image', 'imageurl', 'photo', 'picture', 'imagelink'],
} as const;

type Field = keyof typeof ALIASES;

const pick = (row: SheetRow, field: Field): string | null => {
  for (const key of ALIASES[field]) {
    const v = row.cells[key];
    if (v) return v;
  }
  return null;
};

const knownHeaders = new Set<string>(Object.values(ALIASES).flat());

/** Anything not in ALIASES is preserved untouched in `extra`. */
const extras = (row: SheetRow): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [header, value] of Object.entries(row.raw)) {
    const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (value && !knownHeaders.has(norm)) out[header] = value;
  }
  return out;
};

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const parseTier = (v: string | null): 1 | 2 | 3 | null => {
  const m = v?.match(/[123]/);
  return m ? (Number(m[0]) as 1 | 2 | 3) : null;
};

/**
 * Her sheet uses words like "Masculine", "Feminine" and "Unisex (masculine leaning)".
 * "Unisex" wins first, so "Unisex (masculine leaning)" stays unisex.
 */
export type Gender = 'men' | 'women' | 'unisex';

export const parseGender = (v: string | null): Gender | null => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('unisex')) return 'unisex';
  if (/\b(women|woman|female|feminine|ladies|lady|her)\b/.test(s)) return 'women';
  if (/\b(men|man|male|masculine|gentlemen|him)\b/.test(s)) return 'men';
  return null;
};

export type OilCategory = 'designer' | 'niche';

export const parseOilCategory = (v: string | null): OilCategory | null => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('niche') || s.includes('high')) return 'niche';
  if (s.includes('designer')) return 'designer';
  return null;
};

export const parseStock = (v: string | null): number | null => {
  if (v == null) return null;
  const n = parseInt(v.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
};

interface MappedBase {
  sheetId: string;
  slugBase: string;
  sortOrder: number;
  name: string;
  brand: string | null;
  gender: Gender | null;
  imageUrl: string | null;
  /** null = the sheet has no stock value for this row */
  sheetStock: number | null;
  extra: Record<string, string>;
}

export interface MappedPerfume extends MappedBase {
  scentProfile: string | null;
  inspiredBy: string | null;
  topNotes: string | null;
  heartNotes: string | null;
  baseNotes: string | null;
  description: string | null;
  tier: 1 | 2 | 3 | null;
}

export interface MappedOil extends MappedBase {
  category: OilCategory | null;
}

const mapBase = (row: SheetRow, index: number): MappedBase | null => {
  const name = pick(row, 'name');
  if (!name) return null;
  const brand = pick(row, 'brand');
  return {
    // Prefer the sheet's ID column; fall back to brand+name so a missing ID doesn't break the sync.
    sheetId: row.first || slugify(`${brand ?? ''} ${name}`),
    slugBase: slugify(brand ? `${name} ${brand}` : name),
    sortOrder: index,
    name,
    brand,
    gender: parseGender(pick(row, 'gender')),
    imageUrl: pick(row, 'image'),
    sheetStock: parseStock(pick(row, 'stock')),
    extra: extras(row),
  };
};

export const mapPerfumeRow = (row: SheetRow, index: number): MappedPerfume | null => {
  const base = mapBase(row, index);
  if (!base) return null;
  return {
    ...base,
    scentProfile: pick(row, 'scentProfile'),
    inspiredBy: pick(row, 'inspiredBy'),
    topNotes: pick(row, 'topNotes'),
    heartNotes: pick(row, 'heartNotes'),
    baseNotes: pick(row, 'baseNotes'),
    description: pick(row, 'description'),
    tier: parseTier(pick(row, 'tier')),
  };
};

export const mapOilRow = (row: SheetRow, index: number): MappedOil | null => {
  const base = mapBase(row, index);
  if (!base) return null;
  return { ...base, category: parseOilCategory(pick(row, 'category')) };
};
