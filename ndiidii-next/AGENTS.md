<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ndiidii Scents — project notes

Next.js 16 storefront. Google Sheet is the catalog (no DB). Repo is Cyriacus's fork; upstream is `christian10565/ndiidii_scents_app`. Work as an accepted collaborator.

### Environment / host quirks (Windows + git-bash)
- Shell is bash/MSYS, not PowerShell. `taskkill //F` gets mangled — use `MSYS_NO_PATHCONV=1 taskkill /F /PID <pid>`.
- MSYS curl reports `size 0` on gzipped responses — pass `--compressed`.
- Next dev refuses a 2nd server if one runs on :3000 — check first.
- Backgrounded `next start` from a shell often dies when the parent shell exits; prefer the already-running dev server on :3001/:3000 for live checks, or Playwright against it.
- `.env` holds secrets (gitignored). Never commit it. `.env.example` documents vars.

### Data
- Catalog: Google Sheet, read server-side via `src/lib/sheets.ts` (`readTab`). Column 0 = ID (exposed as `row.first`, NOT in `row.cells`).
- The curated tab's real name is `" Curated Discovery Sets"` (LEADING space). `resolveTab()` fuzzy-matches tab names from sheet metadata — use it, don't hardcode.
- Product images rehosted on Cloudinary (cloud name `deejgpias`). `ProductImage` renders a bottle placeholder for missing images.
- Image pipeline writes to **both** `Perfumes` and `Perfume Oils` tabs via `scripts/write-images.mjs`.
- No user accounts. Cart is localStorage-backed (`src/lib/cart.tsx`).
- **Known catalog issue:** `getOils()` can return perfume data instead of oil data. `/oils/[slug]` currently falls back to `getPerfume()` for slugs that exist in the perfume tab but not the oils tab. This is a workaround; the root cause in `src/lib/catalog.ts` is flagged for debugging later.

### Catalog metadata enrichment
- `scripts/list-perfume-gaps.mjs` → `data/perfume-gaps.json`: every row missing ≥1 of the 8 descriptive fields, with row numbers.
- `scripts/derive-scent-profiles.mjs`: fills `scent profile` **only** for rows whose sole gap is that field, derived from the sheet's own note pyramid (top ×1, heart ×2, base ×2, collapsed to a 2-family label). `--dry` to preview. This is the cheapest win — run it before any web research.
- `scripts/write-perfume-batch.mjs data/batch_N.json`: idempotent writer. Matches on `(brand, name)`, fills blanks only, never overwrites.
- **Duplicate rows exist.** The same `(brand, name)` can appear twice (e.g. `French Avenue | Amber Empire` at rows 814 and 936). The writer must fill *every* match — an earlier version keyed a Map by name and silently only updated the last one. Keep the array-of-matches behaviour.
- Column writes use `'Tab'!E123`-style ranges; per-cell `batchUpdate` is reliable, whole-row writes are not.
- Batch JSON carries `confidence` + `sources` + `flags` per row for audit; empty strings are skipped.

### Researching the metadata (what actually works)
- `web_search` / `web_extract` are Nous-managed and **fail without portal credits**. Do not assume they work.
- Browser automation (`browser_exec`) needs a one-time Chrome approval at `chrome://inspect/#remote-debugging` → "Allow remote debugging for this browser instance". Chrome Remote Desktop is a *different* page and does not count.
- `curl` to Google/DuckDuckGo/fragrance retailers returns JS challenges or Vercel security checkpoints. Don't bother.
- Google search via the browser works but **rate-limits fast** ("unusual traffic"). Space calls ~3.5s, batch ~8–12 queries, and fall back to `https://duckduckgo.com/?q=…&ia=web` when blocked.
- Don't call `wait_for_load()` after a Google query — its AI panel keeps `readyState` incomplete and the call times out. Use `goto_url()` + `sleep(3.5)` + `js('document.body.innerText')`.
- **Highest-yield sources for `inspired by`:** `pickmyclone.com/blog/<brand>-complete-guide` (one page maps an entire house), plus `sniffalike.com`, `thescentatlas.com`, `scentverdict.com`. Parse by document position (original heading → next clone entry), not by zip-ing two arrays — houses with two clones of one original desync index pairing.
- Note pyramids: Fragrantica, brand site, and `fragrances.com.ng` agree often enough to resolve by majority.

### Gotchas already solved (don't reintroduce)
- **Cart clobbering**: persist effect must be guarded by a `hydrated` flag; otherwise the initial EMPTY state overwrites localStorage before hydration reads it (empties cart on every nav).
- **Cart model**: line-based in `src/lib/cart.tsx`. `lines` holds perfume/oil sets by slug array — one line = one *complete* set. `discovery` holds curated sets. `addLine(kind, tier, items, qty)` appends a finished set (this is what the builders call); `toggleLine` is a legacy path that removes the slug from whichever line owns it, else adds it to an incomplete line or creates one; `canCheckout()` requires `items.length === BOX_SIZE` for every line.
- **Builders own their drafts**: `BuilderShell` / `OilBuilderShell` keep picks in React state and only write cart lines on `Add Set to Cart`. Do **not** go back to writing picks into the cart as they're clicked, and do not infer the working set as "the first line with fewer than four items" — that target moves as soon as a set fills, so clicks land in a different set than the one on screen. Symptoms when it regresses: cards that won't tick, the counter bouncing between two sets stuck at 3/4, and `Pick -1 More`.
- **Stale partial lines**: both builders fold leftover partial `perfume`/`oil` lines into the draft on load and delete them. Gate this on `lines.length > 0` (the cart hydrates *after* mount, so an effect that runs on the first render sees an empty cart and marks itself done), and filter adopted slugs to ones still in the catalogue or the counter and the slots disagree.
- **Builder badge units**: the tier badges count **sets in cart**, not items. Say so in the label ("3 sets in cart") — a bare "3 in cart" next to "4 of 4 selected" reads like a contradiction.
- **`useEffect` dep arrays must keep a constant length**. Values only used inside the effect (props like `byTier`/`oils`) go in a ref that's reassigned each render; adding them to the deps array throws "The final argument passed to useEffect changed size between renders" on hot reload.
- **Shop count**: the heading total is `filtered.length`. Don't derive it from the catalogue — it used to be computed from `initial.length`/`oils.length`, so it ignored every filter except Collection.
- **Shop notes filter**: raw sheet prose yields ~2,000 note fragments; `src/lib/notes.ts` canonicalises onto a fixed `CANONICAL` list (~105 chips). Extend that list to expose a note, and keep the Show more/Show less preview (12) — dumping 105 chips open is unusable.
- **Shop drawer backdrop**: `.shop__backdrop` is a child of the `.shop__layout` grid, so it needs `display: none` at base and `display: block` only inside the `max-width: 960px` query. Without the base rule it becomes a grid cell on desktop and pushes the product grid off-screen.
- **Cart badge stuck at 0**: context updates don't cross the header's `<Suspense>` boundary. `CartBadge` reads localStorage + listens for a `ndiidii-cart-change` event instead.
- **Checkout gating**: `CheckoutClient` renders incomplete sets with `x/4` and disables payment until `canCheckout()` passes.
- **Legacy migration**: `load()` reads old `drafts`/`oils` from localStorage and converts them into `lines` so existing carts still work.
- **Controlled qty input**: store the raw string in state, parse to number only on use (avoids uncontrolled→controlled warning on empty input).
- **Dynamic routes** reading the sheet use `export const instant = false` (can't prerender). Routes reading searchParams need a `<Suspense>` wrapper.
- Build lint via standalone `tsc` is slow/noisy on Next's own .d.ts files — trust `next build`, not the standalone tsc.

### Payments (Paystack, REDIRECT flow)
- `PAYSTACK_SECRET_KEY` in `.env` (server-only, never frontend). `sk_test_` set → `isLive()` true + a test-mode banner shows on checkout. Unset/placeholder → mock mode (local `/checkout/mock` page).
- `src/lib/paystack.ts`: `initializeTransaction`, `verifyTransaction`, `toKobo` (₦×100). Routes: `/api/paystack/initialize`, `/api/paystack/verify`. `/checkout/callback` verifies server-side, clears cart on success.
- Order items + delivery ride on the receipt via `metadata.custom_fields` (`{display_name, variable_name, value}`).
- **VAT 7.5%** (`VAT_RATE`) added to every order total. Discovery sets ₦40,000 (`DISCOVERY_SET_PRICE_NGN`).
- Test card: `4084 0840 8408 4081`, any future expiry, CVV `408`.
- **Webhook NOT built yet** — needed before real launch (callback can fail if the customer drops connection post-pay). Needs a public URL + setting it in the Paystack dashboard.

### Gift cards + order ledger (Vercel KV / Upstash Redis)
- Env: `KV_REST_API_URL`, `KV_REST_API_TOKEN` in `.env`.
- `src/lib/giftcard.ts`: codes `NDII-XXXX-XXXX`, balances atomic `DECRBY` (no double-spend). Upstash REST = command-array POST (`['DECRBY', key, amt]`); **`HGETALL` returns a flat `[k,v,k,v]` array** — parse manually, not as an object.
- `src/lib/orders.ts` + `/api/orders/record`: durable order ledger in Redis (best-effort, never blocks a payment).
- `/gift-cards` page: buy → Paystack → reveal code on screen (virtual only; physical not built). Checkout applies a code to deduct from the total; Paystack charges the remainder, or nothing if fully covered (button then reads "Complete Transaction"). Delivery form stays required — we still ship physical decants.

### Conventions
- Keep commit messages SHORT (user asks every time). **Ask before every `git push`** — never push autonomously.
- Design must match the mockups in `docs/` (Discovery Sets, Gift Cards). Reuse existing CSS vocab (oxblood accents, serif headings, black panels).
- Client prefers minimal, non-overengineered solutions.

