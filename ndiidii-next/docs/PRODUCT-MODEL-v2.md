# Ndiidii Scents — product model v2

Written with the client's October 2026 change request. Supersedes the "one product,
one price" model in the older notes. Everything here is implemented unless the
section is explicitly marked **deferred**.

---

## 1. What is sold, and at what price

| Product | Sold as | Price source |
|---|---|---|
| Perfume — **decant** | inside a **set of 4**, one tier only | flat per tier: ₦50,000 / ₦40,000 / ₦30,000 per set (`TIER_BOX_PRICE_NGN`) |
| Perfume — **full bottle** | single bottle, qty 1–99 | sheet **`Price`** column → `Perfume.bottlePrice` |
| Perfume **oil** | inside a **set of 4**, one collection type, one bottle format | `OIL_SET_PRICE_NGN[type][format]` |
| **Curated discovery set** | 4 decants (Perfume Option 1), fixed | `DISCOVERY_SET_PRICE_NGN` = ₦40,000 |

Oil set matrix, per set of four:

| | 5ml roller | 10ml spray | 10ml roller |
|---|---|---|---|
| Designer | ₦35,000 | ₦50,000 | ₦50,000 |
| Niche / High End | ₦50,000 | ₦75,000 | ₦75,000 |

Rules that come with it:

- An oil set **never mixes** Designer and Niche. The collection type is part of
  the cart line (`CartLine.oilType`), not a shop filter.
- A set is exactly 4 bottles; "Add Set to Cart" is disabled until it is.
- Switching **bottle format** keeps the picks (only the price moves). Switching
  **collection type** clears them (different pool of oils).
- The design PDF (`docs/Perfume oils Collection Builder (4).pdf`) shows
  "6ml Roller Bottle" and only two formats. **The written spec wins**: three
  formats, 5ml roller / 10ml spray / 10ml roller.

### `Price` is the bottle price

The Perfumes tab already carries a `Price` column on the 721 rows that have a
tier. It varies *within* a tier (tier 2 spans ₦40,000–₦80,000; overall ₦25,000–
₦200,000, median ₦50,000), so it is a per-perfume price, not a per-set one. The
decant price stays flat per tier.

### Unsellable rows are hidden, not broken

**325 of 1,046 perfumes have neither a tier nor a `Price`** — nothing about them
can be bought. `getPerfumes()` filters them out via `isSellablePerfume`, so they
are absent from `/shop`, `/search`, the home rails, the brand counts and the
curated-set joins, and their PDPs 404. They remain in the snapshot and reappear
the moment the client fills tier + price in the sheet. (Client chose: they fill
the sheet.)

### No oil photography, anywhere

Oil photos are a copyright risk for the client. `mapOils()` sets
`imageUrl: null`, so an oil image cannot reach any surface even by accident, and
oils render a `<Monogram>` tile instead (`ShopCard`, the oil PDP, the oil
builder). Do not wire an oil image back up without an explicit instruction.

---

## 2. Money is computed on the server

The old flow took `amountNaira` from the browser and charged it. That meant
`POST {amountNaira: 1}` bought a ₦50,000 set. Now:

1. The checkout page posts **only slugs, tiers, oil type/format and quantities**
   (`CartPayload` in `src/lib/quote.ts`). No prices.
2. `POST /api/paystack/initialize` → `quoteCart()` (`src/lib/pricing.ts`)
   rebuilds the order from the cached catalog and the price tables:
   validates every slug, that each set has 4 distinct products, that they match
   the declared tier / oil type, that they are in stock, and that a bottle still
   has a price. Any mismatch is a 400 with a customer-readable reason.
3. The server writes a **pending order** to Redis (`order:pending:<ref>`, 24h
   TTL) with the canonical lines and totals, then charges
   `grandTotal − giftCardCredit`.
4. Gift cards are debited **server-side inside the same request**
   (`redeemGiftCard`), not by a client-triggered pre-auth call. Fully-covered
   orders return `fullyCovered: true` and never touch Paystack. If Paystack
   initialisation throws, the debit is refunded immediately.
5. `POST /api/orders/record` accepts **one field: `ref`**. It reads the pending
   order back, verifies with Paystack, and asserts
   `verified.amountNaira === grandTotal − giftCardCredit` (the check the Paystack
   docs require and the old code never did). Unknown references are rejected, so
   the ledger can no longer be written by anyone who posts JSON to it.
6. The old `/api/giftcard/preauth-debit` route is deleted — the checkout has one
   debit path. `/api/giftcard/redeem` is now unused (it was the "order fully
   covered" path); it is left in place for now but should be deleted or gated —
   it is an unauthenticated debit for anyone holding a code.

### Shipping (worth flagging to the client)

Shipping **is** implemented, client-side only, in the old code and still:
flat **₦2,500** below **₦150,000**, free at or above it
(`SHIPPING_FLAT_NGN`, `FREE_SHIPPING_THRESHOLD_NGN` in `store.config.ts`). Both
sides of the money now read the same constants. The client believed shipping was
not charged — **confirm which is intended**; if shipping is free, set
`SHIPPING_FLAT_NGN = 0` and the "Free shipping over ₦150,000" line should come
out of the copy.

---

## 3. Cart model v2

`localStorage` key is now **`ndiidii-cart-v2`**. v1 carts are dropped, not
migrated: they hold oil lines with no bottle format, which cannot be repriced.

```ts
CartLine    { kind: 'perfume' | 'oil', tier, oilType, oilFormat, items[4], qty, unitPrice }
BottleLine  { slug, name, brand, tier, unitPrice, qty }   // full bottle
DiscoveryLine { collection, slug, items[], qty, unitPrice }
```

- Only **complete** sets are ever written to `lines`; builders hold their drafts
  in local component state (unchanged rule, still the thing that fixed the
  3/4-oscillation bug).
- `toggleLine` and `linesFor` are gone. Nothing adds a single product to a set
  from a PDP any more.
- A full bottle is its own line kind, so `canCheckout()` no longer requires that
  *something* be a set.

---

## 4. Surfaces

| Surface | Perfumes | Oils |
|---|---|---|
| `/shop` | yes, only perfumes | **excluded entirely** (data and filter options) |
| `/search` | yes | yes, monogram cards |
| Home rails, brands index, brand counts | yes | yes, monogram cards |
| `/collection-builder` | decant sets by tier | — |
| `/collection-builder/oils` | — | the only place a set is built |
| `/perfumes/[slug]` | "Add decant to set" + "Buy full bottle" | — |
| `/oils/[slug]` | — | detail + "Build a set with this oil" → builder prefilled |

**PDP handoff.** "Add decant to set" is a link to
`/collection-builder?add=<slug>&tier=<n>`; "Build a set with this oil" is
`/collection-builder/oils?add=<slug>&type=<cat>`. The builder page reads the
params server-side and **keys the shell component on them**, so a second handoff
remounts and re-seeds instead of reusing a component that already holds a draft.
The builder keeps ownership of the draft — the PDP never writes to the cart.

The oil builder also has a **Surprise me** button (from the mockup's "or let us
surprise you"): it fills the remaining slots with random in-stock oils from the
active collection; individual picks stay swappable.

---

## 5. Catalog snapshot write

`data/catalog-snapshot.json` is written write-to-temp-then-rename, which on
Windows fails when a reader holds the destination open. The failure was silently
swallowed, so every failed save left an 858KB orphan — **24 had accumulated**
(~20MB) in `data/`. Now: retry once after unlinking the destination, always
delete the temp file in a `finally`, clear the snapshot's in-process cache
regardless, and `data/*.tmp` is gitignored.

---

## 6. Curated discovery sets — generator

Client: "replace the static data in the sheet with generated sets", 4 decants per
set, each perfume **at most twice** across all sets, most **once**.

Grounding: observed how Fragrance Viking (`fragranceviking.co.uk`) picks its
discovery sets — three rules, stated in their own copy:

1. **Note/theme** — perfumes sharing a note, *across* houses ("Mad About
   Vanilla"; homepage "Citrus / Sweet / Woods & Incense / Floral").
2. **DNA/flanker line** — the variants of one house's line ("Lattafa Khamrah
   Set" = Khamrah + Qahwa + Dukhan + Waha).
3. **Occasion/vibe** — a mood bundle ("Masculine Daily Bundle").

`scripts/generate-discovery-sets.mjs` reproduces all three, deterministically,
off `data/catalog-snapshot.json`:

- **note/theme** — 7 note families (Citrus & Fresh, Sweet & Gourmand, Woods &
  Incense, Floral, Amber & Resin, Spicy & Warm, Leather & Tobacco) mapped onto
  the canonical `notes.ts` list; 4 perfumes each, brand-diverse.
- **dna** — same house + same first-word line root (`Khamrah`, `Club`, `9PM`),
  stopwords stripped.
- **vibe** — canonicalised `Occasion` → fixed tags (date night, evening, office,
  daily, formal, party, summer, winter, fresh).

Selection is two-phase under the cap-of-2:
- **Phase 1 (disjoint)** — each perfume in at most ONE set, rarity-first so the
  popular perfumes don't hoover up all the candidate sets.
- **Phase 2 (fill)** — cover stragglers, each set preferring never-used
  perfumes and only allowing a *second* appearance (never a third).

Measured on today's catalog (`--seed 1`):

| Metric | Value |
|---|---|
| Pool (sellable, in-stock) | 721 |
| Sets generated | 224 (note 117 · vibe 104 · dna 3) |
| Coverage | **100%** (721/721) |
| Usage | 546 once · 175 twice · 0 uncovered |

The dna family is small because this catalog has few ≥4-flanker lines — the
data genuinely doesn't support many of them, so we don't force it.

Run: `node scripts/generate-discovery-sets.mjs` (report) /
`--write` (emit `data/discovery-sets-generated.json`) / `--seed N` (reproduce).

`scripts/write-cds-ai.mjs` pushes the sets to a **"CDS - AI"** tab in the same
spreadsheet, mirroring the old " Curated Discovery Sets" layout (Collection Name
/ Scent Profile / Description / Perfume Option 1 / Perfume Option 2, 4 slots +
blank/title separators). It assigns an evocative name per set from a per-family
pool and fills each slot's profile + description from real catalog notes. The
write uses `valueInputOption: RAW` — `USER_ENTERED` makes Sheets parse `9AM`
into a time (`09:00`), RAW stores the literal string.

`src/lib/catalog.ts` reads `CURATED_TAB` (env, default **`CDS - AI`**), so
`/discovery-sets` is served from the AI tab; the old hand-built tab is kept for
reference only. `Accords` remain un-enriched (no field exists); accord-driven
sets would need a separate enrichment pass first.

---

## 7. Still deferred (not in this change)

1. **Paystack webhook** — success is still only confirmed by the redirect
   callback. If the customer closes the tab after paying, the pending order
   expires and nothing ships. Needs a public URL + dashboard config.
2. **Snapshot gzip for Redis** — 858KB raw vs Upstash's 1MB request cap; a
   failed `SET` is silent. Gzip+base64 before `SET` when it grows.
3. **Product images** — no `srcset`, no width/height (CLS).
4. **CSS** — one 63KB global bundle imported by the root layout.
5. **Server-side shop filtering** — `/shop` still ships all perfumes and filters
   in the browser.
6. **`/checkout` is `instant = false`** — could be static.
