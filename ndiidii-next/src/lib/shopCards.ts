import type { Gender, OilCategory } from './mappers';
import type { Perfume, Oil } from './catalog';
import { notesFromParts } from './notes';

/**
 * Lean projections of the catalog for the shop grid.
 *
 * The full `Perfume` carries `description`, `inspiredBy`, `season`, `extra`
 * (long sheet prose) and the raw note strings — ~764 bytes per row. The client
 * grid only renders name / brand / image / tier / stock and filters on gender,
 * brand, tier and canonical note keys, so shipping the full object puts ~800KB
 * of JSON into the /shop HTML and into every link prefetch of that route.
 *
 * Note filtering runs off `noteKeys` (canonical note names, computed on the
 * server) instead of the raw note prose, which drops another ~200 bytes/row and
 * saves re-parsing 1,400 rows of prose in the browser just to build the filter
 * panel.
 *
 * Only type imports from `catalog` here — this module is safe to import from
 * client components.
 */

export interface PerfumeCard {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  gender: Gender | null;
  imageUrl: string | null;
  inStock: boolean;
  tier: 1 | 2 | 3 | null;
  /** Canonical note names, precomputed server-side. */
  noteKeys: string[];
}

export interface OilCard {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  gender: Gender | null;
  imageUrl: string | null;
  inStock: boolean;
  category: OilCategory | null;
}

export type ShopItem = PerfumeCard | OilCard;

/**
 * The only product fields the PDP cart panels resolve (name + image by slug,
 * plus the 4 slots of the current set). A PDP is prerendered once per product,
 * so passing the full catalogue here would bake ~800KB into every one of the
 * ~1,400 product pages.
 */
export interface ProductRef {
  slug: string;
  name: string;
  imageUrl: string | null;
}

export function toProductRef(p: { slug: string; name: string; imageUrl: string | null }): ProductRef {
  return { slug: p.slug, name: p.name, imageUrl: p.imageUrl };
}

export function toPerfumeCard(p: Perfume): PerfumeCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    gender: p.gender,
    imageUrl: p.imageUrl,
    inStock: p.inStock,
    tier: p.tier,
    noteKeys: notesFromParts(p.notes),
  };
}

export function toOilCard(o: Oil): OilCard {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    brand: o.brand,
    gender: o.gender,
    imageUrl: o.imageUrl,
    inStock: o.inStock,
    category: o.category,
  };
}
