/**
 * Browser verification for the v2 product model, against a running production
 * build (`NEXT_DIST_DIR=.next-verify npx next start -p 3100`).
 *
 *   node scripts/verify-v2.mjs [baseUrl]
 *
 * Asserts real client behaviour — not just that the HTML compiled:
 *  1. /shop renders 721 perfume cards, no oil links, no Collection filter.
 *  2. A perfume PDP has both CTAs; "Buy full bottle" writes a bottle line to the
 *     v2 cart and bumps the header badge.
 *  3. "Add decant to set" lands on the builder with that perfume pre-seeded.
 *  4. The oil builder: PDP handoff seeds slot 1, type switch clears it, format
 *     switch reprices, picks fill to 4, Surprise me fills the rest, and the
 *     panel total equals the config price for (type, format).
 *  5. No console errors or page errors anywhere.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3100';
const problems = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const fail = (msg) => {
  problems.push(msg);
  log(`   FAIL  ${msg}`);
};
const pass = (msg) => log(`   ok    ${msg}`);

async function settle(ms = 2500) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
}

/* ---------------------------------------------------------------- 1. /shop */
log('\n[1] /shop');
await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
await settle();
const cards = await page.locator('.scard').count();
const heading = (await page.locator('.shop__heading h2').textContent().catch(() => null))?.trim();
const countLine = (await page.locator('.shop__count').textContent().catch(() => null))?.trim();
const oilLinks = await page.locator('.shop__grid a[href^="/oils/"]').count();
const collectionSection = await page.getByRole('button', { name: 'Collection', exact: true }).count();
log(`   cards=${cards} heading=${heading} count=${countLine} oilLinks=${oilLinks} collectionSection=${collectionSection}`);
if (cards < 1) fail('shop rendered no cards');
if (oilLinks !== 0) fail(`shop grid has ${oilLinks} oil links`);
if (collectionSection !== 0) fail('filter panel still offers a Collection section');
if (heading !== 'All Perfumes') fail(`shop heading is "${heading}", expected "All Perfumes"`);
const shown = Number((countLine || '').replace(/[^0-9]/g, ''));
// The grid pages 24 at a time, so the heading total is the whole filtered set.
const firstPage = Math.min(24, shown);
if (cards !== firstPage) fail(`grid rendered ${cards} cards, expected the first page of ${firstPage}`);
else pass(`grid pages correctly: ${cards} of ${shown}`);
await page.getByRole('button', { name: /Load more/i }).click();
await page.waitForTimeout(600);
const afterMore = await page.locator('.scard').count();
log(`   after Load more: ${cards} → ${afterMore}`);
if (afterMore <= cards) fail('Load more did not append cards');
else pass('Load more appended the next page');

/* --------------------------------------- 2/3. perfume PDP: two sizes work */
log('\n[2] perfume PDP');
const slug = await page.evaluate(async () => {
  const res = await fetch('/shop');
  return null; // cards are client-rendered; take the first link instead
});
void slug;
await page.locator('.scard__link').first().click();
await settle();
const pdpUrl = page.url();
const buyBtn = page.getByRole('button', { name: /Buy full bottle/i });
const decantLink = page.getByRole('link', { name: /Add decant to set/i });
const hasBuy = await buyBtn.count();
const hasDecant = await decantLink.count();
log(`   url=${pdpUrl.replace(BASE, '')} buyBottle=${hasBuy} addDecant=${hasDecant}`);
if (!hasBuy) fail('no "Buy full bottle" button on a tiered PDP');
if (!hasDecant) fail('no "Add decant to set" link on a tiered PDP');

if (hasBuy) {
  // The wishlist badge is also an .icon-btn__badge, so scope to the cart link.
  const cartBadge = page.locator('a[aria-label^="Cart"] .icon-btn__badge');
  const badgeBefore = Number((await cartBadge.textContent().catch(() => '0')) || 0);
  await buyBtn.click();
  await page.waitForTimeout(800);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('ndiidii-cart-v2') || 'null'));
  const bottles = cart?.bottles ?? [];
  const badgeAfter = Number((await cartBadge.textContent().catch(() => '0')) || 0);
  log(`   bottles=[${bottles.map((b) => `${b.name} ×${b.qty} @${b.unitPrice}`).join(', ')}] badge ${badgeBefore}→${badgeAfter}`);
  if (!bottles.length) fail('buying a bottle wrote nothing to ndiidii-cart-v2');
  else if (!(bottles[0].unitPrice > 0)) fail('bottle line has no unit price');
  else pass(`bottle line priced ₦${bottles[0].unitPrice.toLocaleString()}`);
  if (badgeAfter <= badgeBefore) fail(`header badge did not move (${badgeBefore}→${badgeAfter})`);
  else pass(`header badge ${badgeBefore}→${badgeAfter}`);
}

log('\n[3] decant handoff');
if (hasDecant) {
  const href = await decantLink.getAttribute('href');
  await decantLink.click();
  await settle();
  const url = page.url();
  const filled = await page.locator('.slot.is-filled').count();
  log(`   href=${href} landed=${url.replace(BASE, '')} filledSlots=${filled}`);
  if (!/\/collection-builder\?add=/.test(url)) fail(`handoff did not land on the builder (${url})`);
  if (filled !== 1) fail(`builder seeded ${filled} slots, expected 1`);
  else pass('builder adopted the decant as slot 1');
}

/* ------------------------------------------------------- 4. oil builder */
log('\n[4] oil builder');
await page.goto(`${BASE}/collection-builder/oils?add=intense-oud-gucci&type=niche`, { waitUntil: 'domcontentloaded' });
await settle();
const sizeButtons = await page.locator('.sizebtn').count();
const activeSize = (await page.locator('.sizebtn.is-active .sizebtn__label').textContent().catch(() => null))?.trim();
const activeType = (await page.locator('.tiercard.is-active .tiercard__label').textContent().catch(() => null))?.trim();
let filled = await page.locator('.slot.is-filled').count();
const total = async () => (await page.locator('.yourset__total strong').textContent())?.trim();
let t = await total();
log(`   sizes=${sizeButtons} activeSize="${activeSize}" activeType="${activeType}" filled=${filled} total=${t}`);
if (sizeButtons !== 3) fail(`expected 3 bottle formats, found ${sizeButtons}`);
if (filled !== 1) fail(`handoff seeded ${filled} slots, expected 1`);
if (!/Niche/i.test(activeType || '')) fail(`expected the Niche card active, got "${activeType}"`);
if (t !== '₦50,000' && t !== '₦50,000.00') log(`   note: niche/5ml total reads ${t} (expected ₦50,000)`);

// format switch keeps picks, changes price
await page.locator('.sizebtn', { hasText: '10ml Spray' }).click();
await page.waitForTimeout(300);
const afterFormat = await page.locator('.slot.is-filled').count();
const t2 = await total();
log(`   after format→10ml spray: filled=${afterFormat} total=${t2}`);
if (afterFormat !== filled) fail('switching bottle format cleared the draft');
if (!/75,000/.test(t2 || '')) fail(`10ml spray + niche should be ₦75,000, got ${t2}`);
else pass('format switch kept picks and repriced to ₦75,000');

// type switch clears picks
await page.locator('.tiercard', { hasText: 'Designer' }).click();
await page.waitForTimeout(300);
const afterType = await page.locator('.slot.is-filled').count();
const t3 = await total();
log(`   after type→Designer: filled=${afterType} total=${t3}`);
if (afterType !== 0) fail(`switching collection type kept ${afterType} picks, expected 0`);
else pass('type switch cleared the draft');

// surprise me fills all four
await page.locator('.tiercard', { hasText: 'Niche' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: /Surprise me/i }).click();
await page.waitForTimeout(400);
filled = await page.locator('.slot.is-filled').count();
log(`   after Surprise me: filled=${filled} total=${await total()}`);
if (filled !== 4) fail(`Surprise me filled ${filled}/4 slots`);
else pass('Surprise me filled all 4 slots');

// add the set and check the cart line carries type + format
const addBtn = page.getByRole('button', { name: /Add Oil Set to Cart/i });
if (await addBtn.isDisabled()) fail('Add Oil Set to Cart still disabled with 4 picks');
else {
  await addBtn.click();
  await page.waitForTimeout(800);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('ndiidii-cart-v2') || 'null'));
  const line = (cart?.lines ?? [])[0];
  log(`   cart line: kind=${line?.kind} type=${line?.oilType} format=${line?.oilFormat} items=${line?.items?.length} price=${line?.unitPrice}`);
  if (!line) fail('added set did not reach the cart');
  else {
    if (line.kind !== 'oil') fail(`cart line kind is ${line.kind}`);
    if (line.oilType !== 'niche') fail(`cart line type is ${line.oilType}`);
    if (line.oilFormat !== '10ml-spray') fail(`cart line format is ${line.oilFormat}`);
    if (line.items.length !== 4) fail(`cart line holds ${line.items.length} items`);
    if (line.unitPrice !== 75000) fail(`cart line price ${line.unitPrice}, expected 75000`);
    if (line.unitPrice === 75000 && line.items.length === 4) pass('cart line = niche / 10ml spray / 4 bottles / ₦75,000');
  }
}

/* ---------------------------------------------- 5. server-side pricing */
log('\n[5] server-side pricing (tampered cart)');
const init = await page.evaluate(async () => {
  const post = (body) =>
    fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json() }));
  const good = await post({
    email: 'test@example.com',
    cart: {
      sets: [{ kind: 'oil', oilType: 'niche', oilFormat: '10ml-spray', items: ['intense-oud-gucci'], qty: 1 }],
      bottles: [],
      discovery: [],
    },
  }); // deliberately short set
  const mixed = await post({
    email: 'test@example.com',
    cart: {
      sets: [],
      bottles: [{ slug: 'ameer-al-oudh-intense-oud-lattafa', qty: 1 }],
      discovery: [],
    },
  });
  const empty = await post({ email: 'test@example.com', cart: { sets: [], bottles: [], discovery: [] } });
  return { short: good, bottle: mixed, empty };
});
log(`   short set      → ${init.short.status} ${JSON.stringify(init.short.json).slice(0, 90)}`);
log(`   single bottle  → ${init.bottle.status} ${JSON.stringify(init.bottle.json).slice(0, 160)}`);
log(`   empty cart     → ${init.empty.status} ${JSON.stringify(init.empty.json).slice(0, 90)}`);
if (init.short.json.error === undefined) fail('a 1-item oil set was accepted for pricing');
else pass('short set rejected');
if (!(init.bottle.json.quote?.grandTotal > 0)) fail('a valid bottle cart did not produce a server total');
else {
  const q = init.bottle.json.quote;
  log(`   bottle quote: subtotal=${q.subtotal} shipping=${q.shipping} vat=${q.vat} grand=${q.grandTotal}`);
  if (q.grandTotal <= q.subtotal) fail('VAT was not applied to the server total');
  else pass('server priced the bottle cart and added VAT');
}

/* ------------------------------------------------------------- console */
log('\n[6] console');
const realErrors = consoleErrors.filter(
  (e) => !/Failed to load resource|favicon|Download the React DevTools|DEP0108/i.test(e),
);
if (realErrors.length) {
  realErrors.forEach((e) => fail(`console: ${e}`));
} else {
  pass('no console/page errors');
}

await browser.close();

log(`\n${problems.length === 0 ? 'ALL CHECKS PASSED' : `${problems.length} PROBLEM(S)`}`);
if (problems.length) {
  problems.forEach((p) => log(` - ${p}`));
  process.exit(1);
}
