import { cacheLife, cacheTag } from 'next/cache';
import { readTab } from './sheets';
import {
  mapOilRow,
  mapPerfumeRow,
  type Gender,
  type OilCategory,
} from './mappers';
import { UNKNOWN_STOCK_IS_AVAILABLE } from './store.config';

/**
 * The catalog: the Google Sheet, mapped and normalized, served server-side.
 * Every product entry is derived fresh from the sheet (the sheet IS the truth —
 * no DB). Cached with `use cache` and revalidated on the 5-minute window, or
 * immediately via the /api/revalidate ping from Apps Script (revalidateTag).
 */

/**
 * Stock shown for a row. A row with no stock value is treated as available
 * (not sold out) unless the sheet actually carries a Stock column — otherwise
 * every product in a sheet with no stock data would render as "out of stock".
 * Once a Stock column exists, its value is authoritative.
 */
function resolveStock(sheetStock: number | null): number {
  if (sheetStock !== null) return sheetStock; // the sheet has a real value
  return UNKNOWN_STOCK_IS_AVAILABLE ? 1 : DEFAULT_STOCK; // no column → default
}

export interface Perfume {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  gender: Gender | null;
  imageUrl: string | null;
  stock: number;
  inStock: boolean;
  tier: 1 | 2 | 3 | null;
  scentProfile: string | null;
  inspiredBy: string | null;
  notes: { top: string | null; heart: string | null; base: string | null };
  description: string | null;
  extra: Record<string, string>;
}

export interface Oil {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  gender: Gender | null;
  imageUrl: string | null;
  stock: number;
  inStock: boolean;
  category: OilCategory | null;
  extra: Record<string, string>;
}

const PERFUME_TAB = process.env.PERFUME_TAB ?? 'Perfumes';
const OIL_TAB = process.env.OIL_TAB ?? 'Perfume Oils';

/** Unique slug per tab; stable given the sheet order. Duplicate sheet IDs collapse to one row. */
function withSlugs<T extends { sheetId: string; slugBase: string }>(mapped: (T | null)[]): (T & { slug: string })[] {
  const usedSlugs = new Set<string>();
  const seen = new Set<string>();
  const out: (T & { slug: string })[] = [];
  for (const m of mapped) {
    if (!m || seen.has(m.sheetId)) continue;
    seen.add(m.sheetId);
    let slug = m.slugBase || m.sheetId;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${m.slugBase}-${n++}`;
    usedSlugs.add(slug);
    out.push({ ...m, slug });
  }
  return out;
}

export async function getPerfumes(): Promise<Perfume[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });

  let rows;
  try {
    rows = await readTab(PERFUME_TAB);
  } catch {
    return [];
  }
  const mapped = withSlugs(rows.map((row, i) => mapPerfumeRow(row, i)));
  return mapped.map((m) => {
    const stock = resolveStock(m.sheetStock);
    return {
      id: m.sheetId,
      slug: m.slug,
      name: m.name,
      brand: m.brand,
      gender: m.gender,
      imageUrl: m.imageUrl,
      stock,
      inStock: stock > 0,
      tier: m.tier,
      scentProfile: m.scentProfile,
      inspiredBy: m.inspiredBy,
      notes: { top: m.topNotes, heart: m.heartNotes, base: m.baseNotes },
      description: m.description,
      extra: m.extra,
    } satisfies Perfume;
  });
}

export async function getOils(): Promise<Oil[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });

  let rows;
  try {
    rows = await readTab(OIL_TAB);
  } catch {
    return [];
  }
  const mapped = withSlugs(rows.map((row, i) => mapOilRow(row, i)));
  return mapped.map((m) => {
    const stock = resolveStock(m.sheetStock);
    return {
      id: m.sheetId,
      slug: m.slug,
      name: m.name,
      brand: m.brand,
      gender: m.gender,
      imageUrl: m.imageUrl,
      stock,
      inStock: stock > 0,
      category: m.category,
      extra: m.extra,
    } satisfies Oil;
  });
}

export async function getPerfume(slug: string): Promise<Perfume | null> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });

  const all = await getPerfumes();
  return all.find((p) => p.slug === slug) ?? null;
}

export interface BrandCount {
  brand: string;
  perfumes: number;
  oils: number;
}

export async function getBrands(): Promise<BrandCount[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });

  const [perfumes, oils] = await Promise.all([getPerfumes(), getOils()]);
  const merged = new Map<string, { brand: string; perfumes: number; oils: number }>();
  const key = (b: string) => b.trim().toLowerCase();
  for (const p of perfumes) {
    if (!p.brand) continue;
    const k = key(p.brand);
    merged.set(k, { brand: p.brand, perfumes: (merged.get(k)?.perfumes ?? 0) + 1, oils: merged.get(k)?.oils ?? 0 });
  }
  for (const o of oils) {
    if (!o.brand) continue;
    const k = key(o.brand);
    const cur = merged.get(k);
    merged.set(k, { brand: cur?.brand ?? o.brand, perfumes: cur?.perfumes ?? 0, oils: (cur?.oils ?? 0) + 1 });
  }
  return [...merged.values()].sort((a, b) =>
    a.brand.localeCompare(b.brand, 'en', { sensitivity: 'base' }),
  );
}
