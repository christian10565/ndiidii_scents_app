// End-to-end: loads the running homepage in headless Chromium and asserts the
// full homepage renders with no console errors. Requires `next start` on PORT.
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PORT = process.env.TEST_PORT || '3101';
const url = `http://localhost:${PORT}/`;

const pwDir = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const candidates = [
  join(pwDir, 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  join(pwDir, 'chromium-1208', 'chrome-win64', 'chrome.exe'),
];
const executablePath = candidates.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const result = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const txt = document.body.innerText;
  return {
    title: document.title,
    hero: !!q('.hero'),
    heroSlides: document.querySelectorAll('.hero__slide').length,
    brandStatement: !!q('.statement'),
    newInStore: !!q('.new-in'),
    howItWorks: !!q('.how'),
    tiers: !!q('.tiers'),
    tierTabs: [...document.querySelectorAll('.tabs [role="tab"]')].map((e) => e.textContent.trim()),
    giftBanner: !!q('.gift'),
    subscription: !!q('.subs'),
    collections: !!q('.collections'),
    logoCarousel: !!q('.logos'),
    footer: !!q('.footer__grid'),
    hasNewScentsMsg: txt.includes('New scents are on the way'),
    announcementBar: !!q('.announce'),
  };
});

await page.screenshot({ path: 'scripts/home-screenshot.png', fullPage: false });
await browser.close();

console.log('title:', result.title);
console.log(JSON.stringify(result, null, 2));

const checks = {
  'hero present': result.hero,
  '3 hero slides': result.heroSlides === 3,
  'brand statement': result.brandStatement,
  'new in store': result.newInStore,
  'how it works': result.howItWorks,
  'tier showcase': result.tiers,
  '3 tier tabs': result.tierTabs.length === 3,
  'gift banner': result.giftBanner,
  'subscription plans': result.subscription,
  'featured collections': result.collections,
  'logo carousel': result.logoCarousel,
  'announcement bar': result.announcementBar,
  'footer': result.footer,
  'empty-catalog graceful ("New scents are on the way")': result.hasNewScentsMsg,
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
