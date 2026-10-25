import type { Perfume } from './catalog';

/**
 * Note normalisation for the shop's Notes filter.
 *
 * The sheet stores notes as prose ("Rich Agarwood (Oud) and deep Woodsy Notes."),
 * not as a controlled vocabulary. Raw text yields ~2000 distinct fragments, most
 * of them singletons ("moked agarwood", "strawberry fizz candy"), which makes a
 * useless filter. So each fragment is mapped onto a canonical note name; anything
 * that maps to nothing is dropped rather than turned into a junk chip.
 *
 * Adding a note here adds it to the filter. Keep the list to real ingredients —
 * it is a UI surface, not an archive of everything the sheet has ever said.
 */

const CANONICAL = [
  'Agarwood', 'Aldehyde', 'Almond', 'Amber', 'Ambergris', 'Ambroxan', 'Anise', 'Apple',
  'Apricot', 'Aquatic Notes', 'Basil', 'Bay Leaf', 'Beeswax', 'Benzoin', 'Bergamot', 'Birch',
  'Black Currant', 'Black Pepper', 'Blackberry', 'Cacao', 'Cannabis', 'Caramel', 'Cardamom',
  'Cashmere Wood', 'Cedar', 'Cherry', 'Chocolate', 'Cinnamon', 'Citrus', 'Clove', 'Coconut',
  'Coffee', 'Coriander', 'Coumarin', 'Cypress', 'Davana', 'Fig', 'Freesia', 'Fruity Notes',
  'Galbanum', 'Gardenia', 'Geranium', 'Ginger', 'Grape', 'Grapefruit', 'Guaiac Wood',
  'Heliotrope', 'Honey', 'Immortelle', 'Incense', 'Iris', 'Jasmine', 'Lavender', 'Leather',
  'Lemon', 'Licorice', 'Lily Of The Valley', 'Lime', 'Litchi', 'Magnolia', 'Mandarin', 'Mango',
  'Marshmallow', 'Melon', 'Milk', 'Mint', 'Moss', 'Musk', 'Myrrh', 'Neroli', 'Nutmeg',
  'Oakmoss', 'Olibanum', 'Orange', 'Orange Blossom', 'Orris', 'Osmanthus', 'Oud', 'Patchouli',
  'Peach', 'Pear', 'Peony', 'Pepper', 'Pineapple', 'Pistachio', 'Plum', 'Praline', 'Raspberry',
  'Rhubarb', 'Rose', 'Rum', 'Saffron', 'Sage', 'Sandalwood', 'Sea Notes', 'Spicy Notes',
  'Strawberry', 'Tea', 'Tobacco', 'Tonka Bean', 'Tuberose', 'Vanilla', 'Vetiver', 'Violet',
  'Watermelon', 'Whiskey', 'Woody Notes', 'Ylang-Ylang', 'Yuzu',
];

const CANON_BY_LOWER = new Map(CANONICAL.map((c) => [c.toLowerCase(), c]));
/** Longest first so "Orange Blossom" wins over "Orange". */
const CANON_LONGEST_FIRST = [...CANONICAL].sort((a, b) => b.length - a.length);

const NOISE = new Set(['notes', 'note', 'accords', 'accord']);

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Split prose notes into short fragments. */
export function splitNotes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/·|]|\band\b|\bwith\b|\bplus\b|\./gi)
    .map((part) => part.replace(/[^A-Za-z\u00C0-\u024F' -]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => {
      if (part.length < 3 || part.length > 40) return false;
      if (part.split(' ').length > 4) return false;
      return !NOISE.has(part.toLowerCase());
    })
    .map(titleCase);
}

/** Map a fragment onto a canonical note name, or null when it isn't one. */
export function canonicalNote(fragment: string): string | null {
  const low = fragment.toLowerCase();
  const exact = CANON_BY_LOWER.get(low);
  if (exact) return exact;
  for (const canon of CANON_LONGEST_FIRST) {
    const pattern = new RegExp(`\\b${canon.toLowerCase().replace(/-/g, '[- ]')}\\b`);
    if (pattern.test(low)) return canon;
  }
  return null;
}

/** Canonical notes for one product (top → heart → base, deduped). */
export function perfumeNotes(p: Perfume): string[] {
  const seen = new Set<string>();
  for (const raw of [p.notes?.top, p.notes?.heart, p.notes?.base]) {
    for (const fragment of splitNotes(raw)) {
      const canon = canonicalNote(fragment);
      if (canon) seen.add(canon);
    }
  }
  return [...seen];
}

/** True when the product carries at least one of the selected notes. */
export function hasAnyNote(p: Perfume, wanted: string[]): boolean {
  if (wanted.length === 0) return true;
  const own = new Set(perfumeNotes(p).map((n) => n.toLowerCase()));
  return wanted.some((w) => own.has(w.toLowerCase()));
}

/**
 * Notes present in at least `minProducts` perfumes, alphabetical.
 * The threshold keeps one-off prose out of the filter panel.
 */
export function noteIndex(perfumes: Perfume[], minProducts = 2): string[] {
  const counts = new Map<string, number>();
  for (const p of perfumes) {
    for (const note of perfumeNotes(p)) counts.set(note, (counts.get(note) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minProducts)
    .map(([note]) => note)
    .sort((a, b) => a.localeCompare(b));
}
