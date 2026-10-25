import type { Perfume } from './catalog';

/**
 * Note-name normalisation for the shop's Notes filter.
 *
 * The sheet stores notes as prose ("Rich Agarwood (Oud) and deep Woodsy Notes."),
 * not as a controlled vocabulary, so the filter index is derived from that text:
 * strip parentheticals, split on separators and conjunctions, then keep only
 * short entries that read as a single ingredient. Anything longer is a phrase,
 * not a note, and would make an unusable filter chip.
 */

const NOISE = new Set(['notes', 'note', 'accords', 'accord']);

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function splitNotes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/·|]|\band\b|\bwith\b|\bplus\b|\./gi)
    .map((part) => part.replace(/[^A-Za-z\u00C0-\u024F' -]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => {
      if (part.length < 3 || part.length > 32) return false;
      if (part.split(' ').length > 3) return false;
      return !NOISE.has(part.toLowerCase());
    })
    .map(titleCase);
}

/** Unique notes for one product, order preserved (top → heart → base). */
export function perfumeNotes(p: Perfume): string[] {
  const seen = new Map<string, string>();
  for (const raw of [p.notes?.top, p.notes?.heart, p.notes?.base]) {
    for (const note of splitNotes(raw)) {
      const key = note.toLowerCase();
      if (!seen.has(key)) seen.set(key, note);
    }
  }
  return [...seen.values()];
}

/** True when the product carries at least one of the selected notes. */
export function hasAnyNote(p: Perfume, wanted: string[]): boolean {
  if (wanted.length === 0) return true;
  const own = new Set(perfumeNotes(p).map((n) => n.toLowerCase()));
  return wanted.some((w) => own.has(w.toLowerCase()));
}

/** Alphabetical index of every note present in the catalogue. */
export function noteIndex(perfumes: Perfume[]): string[] {
  const seen = new Map<string, string>();
  for (const p of perfumes) {
    for (const note of perfumeNotes(p)) {
      const key = note.toLowerCase();
      if (!seen.has(key)) seen.set(key, note);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
