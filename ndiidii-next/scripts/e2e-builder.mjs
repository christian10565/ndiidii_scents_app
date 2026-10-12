// End-to-end: build a set on the Collection Builder, add to cart, verify the
// header badge, then complete the test checkout. Requires `next start` on PORT.
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PORT = process.env.TEST_PORT || '3040';
const pwDir = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const candidates = [
  join(pwDir, 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  join(pwDir, 'chromium-1208', 'chrome-win64', 'chrome.exe'),
];
const executablePath = candidates.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Deprecation|DEP0108|zlib/i.test(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const log = (...a) => console.log(...a);

// 1. Load the builder
await page.goto(`http://localhost:${PORT}/collection-builder`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.builder__grid .bcard', { timeout: 15000 }).catch(() => {});
const tier1Title = await page.locator('.builder__tiers .tiercard.is-active .tiercard__label').textContent().catch(() => '');
log('active tier on load:', tier1Title.trim());
const cardCount = await page.locator('.builder__grid .bcard').count();
log('product cards in tier 1:', cardCount);

// 2. Click 4 cards
const cards = page.locator('.builder__grid .bcard');
for (let i = 0; i < 4; i++) await cards.nth(i).click();
await page.waitForTimeout(300);
const yourSetText = await page.locator('.yourset__tier span').textContent().catch(() => '');
log('your set progress:', yourSetText.trim());
const ctaText = await page.locator('.yourset__cta').textContent().catch(() => '');
log('CTA after 4 picks:', ctaText.trim());
const totalText = await page.locator('.yourset__total strong').textContent().catch(() => '');
log('set total shown:', totalText.trim());

// 3. Add to cart
await page.locator('.yourset__cta').click();
await page.waitForTimeout(300);
const badge = await page.locator('.header__tools .icon-btn__badge').last().textContent().catch(() => '');
log('header cart badge after add:', badge.trim());
const setTextAfter = await page.locator('.yourset__tier span').textContent().catch(() => '');
log('draft cleared to:', setTextAfter.trim());

// 4. Go to checkout
await page.goto(`http://localhost:${PORT}/checkout`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(500);
const lineCount = await page.locator('.cline').count();
log('checkout lines:', lineCount);
const orderTotal = await page.locator('.csummary__row--total strong').textContent().catch(() => '');
log('order total:', orderTotal.trim());

// 5. Fill + place order
await page.fill('input[placeholder="080…"]', '08012345678').catch(() => {});
await page.locator('.cform input').nth(0).fill('Cyriacus Test');
await page.locator('.cform input').nth(1).fill('08012345678');
await page.locator('.cform input').nth(2).fill('test@example.com');
await page.locator('.cform input').nth(3).fill('12 Test Street');
await page.locator('.cform input').nth(4).fill('Enugu');
await page.locator('.cform select').selectOption('Enugu');
await page.locator('.cform__submit').click();
await page.waitForTimeout(500);
const doneVisible = await page.locator('.checkout__done h1').isVisible().catch(() => false);
log('order-placed confirmation shown:', doneVisible);

await page.screenshot({ path: 'scripts/builder-test.png' });
await browser.close();

log('\nconsole errors:', errors.length ? errors.slice(0, 5) : '(none)');
const pass = cardCount > 0 && yourSetText.includes('4 of 4') && badge.trim() === '1' && lineCount === 1 && doneVisible;
log(pass ? '\nE2E PASS — full build→cart→checkout flow works' : '\nE2E issues above');
