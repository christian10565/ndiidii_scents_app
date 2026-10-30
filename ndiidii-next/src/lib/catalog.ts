import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { readTab, resolveTab } from './sheets';
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
  /**
   * Full-bottle price from the sheet's `Price` column, in naira.
   * null = the row isn't priced, so it can't be bought as a bottle.
   */
  bottlePrice: number | null;
  scentProfile: string | null;
  inspiredBy: string | null;
  season: string | null;
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
      bottlePrice: m.retailPrice,
      scentProfile: m.scentProfile,
      inspiredBy: m.inspiredBy,
      season: m.season,
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
      // Deliberately dropped. Oil photography is a copyright risk for the
      // client, so oils are rendered from text/monogram placeholders only —
      // nulling the URL here means an oil image cannot reach any surface.
      imageUrl: null,
      stock,
      inStock: stock > 0,
      category: m.category,
      extra: m.extra,
    } satisfies Oil;
  });
}

/**
 * Can this perfume actually be bought?
 *
 * Two ways to buy one: a decant inside a tier set (needs `tier`), or a full
 * bottle (needs `bottlePrice`). A row with neither can't be sold at all, so it
 * is hidden everywhere rather than linked to a dead PDP.
 */
export const isSellablePerfume = (p: Perfume): boolean =>
  p.tier !== null || (p.bottlePrice ?? 0) > 0;

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
    let perfumeRows = await readTab(PERFUME_TAB);
    let oilRows = await readTab(OIL_TAB);

    const mappedPerfumes = mapPerfumes(perfumeRows);
    const mappedOils = mapOils(oilRows);

    const snapshot: Snapshot<Perfume> = {
      savedAt: new Date().toISOString(),
      perfumes: mappedPerfumes,
      oils: mappedOils,
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
    console.error(`[catalog] sheet read failed and no snapshot exists: ${(err as Error).message}`);
    return { savedAt: new Date().toISOString(), perfumes: [], oils: [] };
  }
});

export async function getPerfumes(): Promise<Perfume[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  const snap = await readCatalog();
  // Unsellable rows (no decant tier AND no bottle price — 325 of 1,046 today)
  // are filtered here rather than in each surface. One filter keeps /shop,
  // /search, the home rails, the brand counts, the curated-set joins and the
  // PDPs consistent: a product nobody can buy simply does not exist on the
  // site. They stay in the snapshot so they reappear once the sheet is filled.
  return snap.perfumes.filter(isSellablePerfume);
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
  // Derived from getPerfumes() — ONE cached catalog read — rather than from
  // readCatalog(). Prerendering ~1,050 product pages calls this once per slug,
  // and every cold cache entry used to re-read BOTH sheet tabs and rewrite the
  // 858KB snapshot to Redis and disk: ~1,046 sheet reads and ~900MB of Redis
  // writes per build, which is what made static generation take 12+ minutes.
  const perfumes = await getPerfumes();
  return perfumes.find((p: Perfume) => p.slug === slug) ?? null;
}

export interface BrandCount {
  brand: string;
  perfumes: number;
  oils: number;
}

/** One slot in a curated discovery set: the chosen perfume (Option 1) + its profile copy. */
export interface CuratedSlot {
  scentProfile: string;
  description: string;
  perfumeName: string;
  perfume: Perfume | null; // joined from the catalog (for image + slug), null if not found
}

/** A curated discovery set: a named collection of 4 slots. */
export interface CuratedSet {
  collection: string;
  slots: CuratedSlot[];
  slug: string;
}

function slugify(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The AI-generated curated sets live in the "CDS - AI" tab. The old hand-built
// " Curated Discovery Sets" tab (leading space) is kept for reference. Resolved
// against actual tab titles at read time; override via CURATED_TAB.
const CURATED_TAB = process.env.CURATED_TAB ?? 'CDS - AI';

/**
 * Curated discovery sets from the sheet's curated tab.
 *
 * The tab lists, per collection, four rows (Scent Profile / Description /
 * Perfume Option 1 / Perfume Option 2). We only use Perfume Option 1 (per the
 * client). Each Option-1 perfume is joined to the catalog to get its image and
 * PDP link. Grouped into sets of 4 per collection.
 *
 * Reads are cached alongside the rest of the catalog; falls back to an empty
 * list (not the snapshot) so a bad/missing tab never breaks the page.
 */
export async function getCuratedSets(): Promise<CuratedSet[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  try {
    const tab = await resolveTab(CURATED_TAB);
    const rows = await readTab(tab);
    const perfumes = await getPerfumes();
    // Index catalog perfumes by normalised name for Option-1 joins.
    const byName = new Map<string, Perfume>();
    for (const p of perfumes) byName.set(p.name.trim().toLowerCase(), p);

    // Group rows into collections. Every data row carries its Collection Name
    // in column 0 (readTab exposes it as `first`); separator rows have a name
    // but no scent profile / option. So we group directly by the row's own
    // collection name — no need to track a "current" collection.
    const groups = new Map<string, CuratedSlot[]>();
    for (const r of rows) {
      const collection = String(r.first ?? r.cells.collectionname ?? '').trim();
      const scentProfile = String(r.cells.scentprofile ?? '').trim();
      const description = String(r.cells.description ?? '').trim();
      const option1 = String(r.cells.perfumeoption1 ?? '').trim();
      if (!collection || collection.toLowerCase() === 'collection name') continue; // header/blank
      if (!scentProfile || !option1) continue; // separator row
      if (!groups.has(collection)) groups.set(collection, []);
      groups.get(collection)!.push({
        scentProfile,
        description,
        perfumeName: option1,
        perfume: byName.get(option1.trim().toLowerCase()) ?? null,
      });
    }

    const sets: CuratedSet[] = [];
    for (const [collection, slots] of Array.from(groups)) {
      if (slots.length !== 4) continue; // only complete 4-slot sets
      sets.push({ collection, slots, slug: slugify(collection) });
    }
    return sets;
  } catch (err) {
    console.warn(`[curated] tab read failed: ${(err as Error).message}`);
    return [];
  }
}

export async function getBrands(): Promise<BrandCount[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife({ revalidate: 300, expire: 3600 });
  // Counts must agree with what the site actually lists, so this goes through
  // getPerfumes() (sellable only) rather than the raw snapshot.
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