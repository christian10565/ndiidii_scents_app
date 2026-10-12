import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { readTab } from './sheets';
import {
  mapOilRow,
  mapPerfumeRow,
  type Gender,
  type OilCategory,
} from './mappers';
import { DEFAULT_STOCK, UNKNOWN_STOCK_IS_AVAILABLE } from './store.config';
import { loadSnapshot, saveSnapshot, type Snapshot } from './snapshot';

/**
 * The catalog: the Google Sheet, mapped and normalized, served server-side.
 * Every product entry is derived fresh from the sheet (the sheet IS the truth —
 * no DB). Cached with `use cache` and revalidated on the 5-minute window, or
 * immediately via the /api/revalidate ping from Apps Script (revalidateTag).
 *
 * If the sheet read fails, the last good snapshot is served instead (see
 * snapshot.ts) so a dead sheet never blanks the site.
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

function mapPerfumes(rows: Awaited<ReturnType<typeof readTab>>): Perfume[] {
  return withSlugs(rows.map((row, i) => mapPerfumeRow(row, i))).map((m) => {
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

function mapOils(rows: Awaited<ReturnType<typeof readTab>>): Oil[] {
  return withSlugs(rows.map((row, i) => mapOilRow(row, i))).map((m) => {
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

/**
 * Fetch the whole catalog from the live sheet with snapshot fallback.
 *
 * Wrapped in React `cache()` so that within a single render pass every getter
 * (getPerfumes / getOils / getBrands / getPerfume) shares ONE network fetch
 * instead of each firing its own. The homepage renders NewInStore and
 * TierShowcase side by side, so without this a single page load could hit the
 * Sheets API two or three times (~3s each on a cold call).
 */
const readCatalog = cache(async (): Promise<Snapshot<Perfume>> => {
  try {
    const [perfumeRows, oilRows] = await Promise.all([
      readTab(PERFUME_TAB),
      readTab(OIL_TAB),
    ]);
    const snapshot: Snapshot<Perfume> = {
      savedAt: new Date().toISOString(),
      perfumes: mapPerfumes(perfumeRows),
      oils: mapOils(oilRows),
    };
    await saveSnapshot(snapshot);
    return snapshot;
  } catch (err) {
    const cached = await loadSnapshot<Perfume>();
    if (cached && (cached.perfumes.length > 0 || cached.oils.length > 0)) {
      console.warn(
        `[catalog] live sheet read failed (${(err as Error).message}); ` +
          `serving snapshot from ${cached.savedAt}`,
      );
      return cached;
    }
    // No snapshot either — genuinely empty. Log so it's not silent.
    console.error(`[catalog] sheet read failed and no snapshot exists: ${(err as Error).message}`);
    return { savedAt: new Date().toISOString(), perfumes: [], oils: [] };
  }
});

export async function getPerfumes(): Promise<Perfume[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  const snap = await readCatalog();
  return snap.perfumes;
}

export async function getOils(): Promise<Oil[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  const snap = await readCatalog();
  return snap.oils as Oil[];
}

export async function getPerfume(slug: string): Promise<Perfume | null> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  const snap = await readCatalog();
  return snap.perfumes.find((p: Perfume) => p.slug === slug) ?? null;
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
  const snap = await readCatalog();
  const perfumes = snap.perfumes;
  const oils = snap.oils as Oil[];

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