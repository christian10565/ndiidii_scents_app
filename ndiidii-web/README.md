# Ndiidii Scents — web (homepage)

React + Vite. Plain CSS, no UI library.

## Run it

```bash
npm install
cp .env.example .env     # set VITE_API_URL to your NestJS API
npm run dev              # http://localhost:5173
```

Without the API running, "New in Store" and the tier tabs show a friendly error line — everything else renders.

## Where things live

| What | File |
| --- | --- |
| All copy, links, nav, plans, brand list, footer | `src/config/site.js` |
| Colours + fonts | `src/styles/tokens.css` |
| Homepage styles | `src/styles/home.css` |
| Homepage sections | `src/components/*` (composed in `src/pages/Home.jsx`) |
| API calls | `src/lib/api.js`, `src/lib/useApi.js` |

## Images to drop in (`/public`)

- `images/hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` — hero slides (≈1600×520, subject centred)
- `images/gift-card.jpg` — right half of the gift card banner
- `images/collection-discovery.jpg`, `collection-oils.jpg`, `collection-occasion.jpg`, `collection-notes.jpg` — portrait 5:8
- `brands/lattafa.png`, `zaoud.png`, … — see `BRAND_LOGOS` in `site.js` for each filename

Missing files fall back to a dark gradient (or the brand name in text), so nothing breaks.

## Shop page (`/shop`)

- Built from the "Shop with filter" design. Needs `public/images/shop-hero.jpg` (≈1600×330); a grey gradient shows until then.
- Every filter lives in the URL: `/shop?tier=1,2&gender=men&brand=Lattafa&stock=in&sort=newest`. The nav's Men/Women/Unisex links, the homepage brand strip and the future Brands page all link this way.
- Tier prices in the filter come from the API (`/api/config`), so they change in one place: `ndiidii-api/src/config/store.config.ts`.
- Added beyond the design: a **Gender** filter, and a "Load more" button (24 at a time) instead of loading all products at once.
- Collection filter: Discovery Sets and Perfume Oils link to their pages. Occasion and Notes are hidden (`hidden: true` in `SHOP.collections` in `site.js`) until the data exists.
- Needs the API running with the filter changes in `ndiidii-api` (multi-tier, multi-gender, out-of-stock).

## Switching out-of-scope pieces off

`FEATURES` at the top of `src/config/site.js` — set `subscription`, `wishlist`, `account`, `guide`, `affiliate`, `requestPerfume` to `false` and the matching nav links, hearts, sections and footer links disappear. All `true` = identical to the mockup.

## Not wired yet

- Cart and wishlist counts in the header (fixed at 0 until the cart step)
- Newsletter "Join" form (needs an email service)
- Every link except `/` shows a "Coming soon" page until that page is built

## Fonts

Headlines use Amiri and everything else Manrope, per the brand book. The mockup's headline serif looks different from Amiri. To match the mockup exactly, change `--font-serif` in `tokens.css` and the Google Fonts link in `index.html`.
