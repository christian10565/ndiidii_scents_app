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
- No user accounts. Cart is localStorage-backed (`src/lib/cart.tsx`).

### Gotchas already solved (don't reintroduce)
- **Cart clobbering**: persist effect must be guarded by a `hydrated` flag; otherwise the initial EMPTY state overwrites localStorage before hydration reads it (empties cart on every nav).
- **Cart model**: line-based in `src/lib/cart.tsx`. `lines` holds perfume/oil sets by slug array, `discovery` holds curated sets. `toggleLine` adds/removes a slug from the first incomplete matching line or creates one. `canCheckout()` requires `items.length === BOX_SIZE` for every line.
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

