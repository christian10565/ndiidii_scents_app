// End-to-end: loads the running shop page in a real headless Chromium, waits for
// the streamed shell to hydrate, and asserts the full shop UI is present.
// Requires `next start` running on PORT (default 3101).
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PORT = process.env.TEST_PORT || '3101';
const url = `http://localhost:${PORT}/shop`;

// Use the chromium build already on disk (Playwright's expected build number
// may differ from what's installed; fall back to whatever 1208 build exists).
const pwDir = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const candidates = [
  join(pwDir, 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  join(pwDir, 'chromium-1208', 'chrome-win64', 'chrome.exe'),
];
const executablePath = candidates.find((p) => existsSync(p));

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
// Give the streamed Suspense boundary a moment to paint + hydrate.
await page.waitForSelector('.shop__grid', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);

const result = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  return {
    hero: !!q('.shop-hero'),
    heroTitle: (q('.shop-hero h1') || {}).textContent || '',
    layout: !!q('.shop__layout'),
    filterPanel: !!q('.fpanel'),
    filterSections: [...document.querySelectorAll('.fsec__head')].map((e) => e.textContent.trim()),
    grid: !!q('.shop__grid'),
    allProducts: (document.body.innerText.match(/All Products/) || [])[0] || '',
    sortBy: !!q('.sort'),
    productCards: document.querySelectorAll('.scard').length,
    countLine: (q('.shop__count') || {}).textContent || '',
    loadMore: !!q('.shop__more'),
    chromeFooter: !!q('.footer__grid'),
    navLinks: [...document.querySelectorAll('.nav__link')].slice(0, 6).map((e) => e.textContent.trim()),
  };
});

await page.screenshot({ path: 'scripts/shop-screenshot.png', fullPage: false });
await browser.close();

console.log('URL:', url);
console.log(JSON.stringify(result, null, 2));

const checks = {
  'shop hero present': result.hero,
  'filter panel present': result.filterPanel,
  'grid present': result.grid,
  '"All Products" heading': result.allProducts === 'All Products',
  'sort control present': result.sortBy,
  '5 filter sections': result.filterSections.length === 5,
  'chrome footer present': result.chromeFooter,
  'no console errors': errors.length === 0,
};
let ok = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(v ? '✓' : '✗', k);
  if (!v) ok = false;
}
if (errors.length) console.log('console errors:', errors.slice(0, 5));
console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
