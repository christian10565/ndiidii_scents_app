/**
 * Name/brand normalisation + matching for the Zaoud → sheet image pipeline.
 *
 * Two naming worlds:
 *   Sheet : brand + name in separate columns, clean Title Case, no suffixes
 *           e.g. "Ameer Al Oudh Intense Oud"
 *   Zaoud : vendor (brand, ALL CAPS) + title (name + concentration + type, mixed caps)
 *           e.g. "AMEER AL OUDH INTENSE OUD Edp"
 *
 * We normalise both sides to a comparable key: strip concentration/type noise,
 * casefold, drop punctuation, collapse whitespace. Brand is matched separately
 * (also normalised) so we never match across houses.
 */

// Concentration / product-type tokens that carry no identity for matching.
const NOISE = new Set([
  'edp', 'edt', 'edc', 'ed', 'parfum', 'de', 'du', 'la', 'le',
  'extrait', 'extraitdeparfum', 'exdp', 'dp',
  'elixir', 'elixirdeparfum',
  'eau', 'toilette', 'cologne', 'parfumee',
  'for', 'men', 'women', 'man', 'woman', 'unisex',
  'gift', 'set', 'collection', 'giftset',
  'mini', 'pcs', 'pc', 'ml', 'oz', 'limited', 'edition',
  'perfume', 'perfumes', 'fragrance', 'scent',
  'spray', 'by', 'fede', 'revival', 'intense', 'noir', 'rouge', 'exclusif',
  // NOTE: do NOT strip 'deodorant', 'sample', 'air freshener', 'body spray',
  // 'oil', etc. — those are DIFFERENT products; stripping them caused the
  // matcher to pick a deodorant/sample for a full-bottle perfume. They must
  // survive so the name won't score as an exact match.
]);

/** Lowercase, strip accents, remove punctuation → spaces, collapse whitespace. */
function base(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bamp\b/g, 'and') // "Rose & Romance" vs "Rose and Romance"
    .replace(/([a-z])(\d)/g, '$1 $2') // "100ml" → "100 ml", "50ml" → "50 ml"
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim();
}

/** Full key for a product name: drop noise tokens, keep the identity words. */
export function normaliseName(name) {
  const words = base(name).split(' ').filter(Boolean);
  const kept = words.filter((w) => !NOISE.has(w) && !/^\d+$/.test(w));
  return kept.join(' ') || words.join(' ');
}

/** Drop a trailing or leading brand token (vendors append/prepend their own name to titles). */
export function dropTrailingBrand(nameKey, brandKey) {
  if (!brandKey) return nameKey;
  const brandWords = brandKey.split(' ').filter(Boolean);
  const words = nameKey.split(' ').filter(Boolean);
  const maxN = Math.min(brandWords.length, words.length);

  // Trailing first: "... Lattafa"
  for (let n = maxN; n > 0; n--) {
    const tail = words.slice(words.length - n).join(' ');
    const head = brandWords.slice(0, n).join(' ');
    if (tail === head) return words.slice(0, words.length - n).join(' ') || nameKey;
  }
  // Leading: "Rayhaan Tiger..."
  for (let n = maxN; n > 0; n--) {
    const head = words.slice(0, n).join(' ');
    const brandHead = brandWords.slice(0, n).join(' ');
    if (head === brandHead) return words.slice(n).join(' ') || nameKey;
  }
  return nameKey;
}

/** Brand key: normalised, with a couple of known spelling variants folded. */
const BRAND_ALIASES = {
  'lattafa': 'lattafa',
  'ard al zaafaran': 'ard al zaafaran',
  'maison alhambra': 'maison alhambra',
  'arabiyat': 'arabiyat',
  'arabiyat prestige': 'arabiyat',
  'khadlaj': 'khadlaj',
  'asdaaf': 'asdaaf',
  'afnan': 'afnan',
  'armaf': 'armaf',
  'al haramain': 'al haramain',
  'gulf orchid': 'gulf orchid',
  'rayhaan': 'rayhaan',
  'maison asrar': 'maison asrar',
  'fragrance world': 'fragrance world',
  'french avenue': 'french avenue',
  'riiffs': 'riiffs',
  'swiss arabian': 'swiss arabian',
  'rasasi': 'rasasi',
  'nabeel': 'nabeel',
  'emir': 'emir',
  'zimaya': 'zimaya',
  'paris corner': 'paris corner',
  'nusuk': 'nusuk',
  'ajmal': 'ajmal',
  'al rehab': 'al rehab',
  'the spirit of dubai': 'the spirit of dubai',
};

export function normaliseBrand(brand) {
  const b = base(brand);
  const folded = BRAND_ALIASES[b] ?? b;
  // "Lattafa Pride" / "Lattafa Pride …" is the same house as Lattafa.
  if (folded.startsWith('lattafa pride')) return 'lattafa';
  // "Arabiyat Prestige" is Arabiyat.
  if (folded.startsWith('arabiyat prestige')) return 'arabiyat';
  return folded;
}

/** Similarity 0..1 between two normalised name keys (token-based Jaccard + prefix bonus). */
export function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const as = new Set(a.split(' '));
  const bs = new Set(b.split(' '));
  let inter = 0;
  for (const t of as) if (bs.has(t)) inter++;
  const union = as.size + bs.size - inter;
  let score = inter / union;
  // Prefix containment on whole tokens. Only treat as a confident match when the
  // longer name's extra tokens are pure noise (concentration/type) — e.g.
  // "khamrah" vs "khamrah qahwa edp" is fine, but "la charmante" vs
  // "la charmante eclatant" is a DIFFERENT product (Éclatant is a real
  // differentiator), so that must not auto-pass.
  const aw = a.split(' ');
  const bw = b.split(' ');
  const shorter = aw.length <= bw.length ? aw : bw;
  const longer = aw.length <= bw.length ? bw : aw;
  const isTokenPrefix = shorter.every((w, i) => w === longer[i]);
  const extraTokens = longer.slice(shorter.length);
  const extraIsNoise = extraTokens.length > 0 && extraTokens.every((w) => NOISE.has(w));
  if (isTokenPrefix && extraIsNoise) {
    score = Math.max(score, 0.88);
  } else if (a.startsWith(b) || b.startsWith(a)) {
    score = Math.max(score, 0.75); // real word differences → review, not confident
  }
  return score;
}
