// Tests the mobile nav dropdown fix: submenus start collapsed, open on toggle,
// and close again after navigating. Desktop hover behaviour is unaffected.
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PORT = process.env.TEST_PORT || '3050';
const pwDir = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const exe = join(pwDir, 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });

// ---- MOBILE ----
const m = await browser.newPage({ viewport: { width: 390, height: 780 } });
await m.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });

// open the burger
await m.click('.header__burger');
await m.waitForTimeout(300);
const submenuVisibleInitially = await m.locator('.nav__item--parent').first().locator('.nav__menu').isVisible();
console.log('MOBILE: submenu visible before toggle (should be false):', submenuVisibleInitially);

// expand the first dropdown (Shop)
await m.locator('.nav__toggle').first().click();
await m.waitForTimeout(300);
const submenuVisibleAfter = await m.locator('.nav__item--parent').first().locator('.nav__menu').isVisible();
console.log('MOBILE: submenu visible after toggle (should be true):', submenuVisibleAfter);

// click a sublink -> should navigate AND collapse
await m.locator('.nav__item--parent').first().locator('.nav__menu a').first().click();
await m.waitForTimeout(600);
const url = m.url();
const burgerOpenAfter = await m.locator('.nav--open').count();
console.log('MOBILE: navigated to:', url.replace(`http://localhost:${PORT}`, ''));
console.log('MOBILE: burger menu still open after nav (0 = closed, good):', burgerOpenAfter);
// reopen burger, confirm submenu collapsed again
await m.click('.header__burger');
await m.waitForTimeout(300);
const submenuAfterNav = await m.locator('.nav__item--parent').first().locator('.nav__menu').isVisible();
console.log('MOBILE: submenu visible again after reopening (should be false):', submenuAfterNav);
await m.close();

// ---- DESKTOP (hover still works, toggle hidden) ----
const d = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await d.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
const toggleHidden = await d.locator('.nav__toggle').first().isHidden();
console.log('\nDESKTOP: toggle button hidden (should be true):', toggleHidden);
const parent = d.locator('.nav__item--parent').first();
const menuBefore = await parent.locator('.nav__menu').isVisible();
await parent.hover();
await d.waitForTimeout(300);
const menuAfter = await parent.locator('.nav__menu').isVisible();
console.log('DESKTOP: submenu visible on hover (before/after):', menuBefore, '->', menuAfter);
await d.close();

await browser.close();
const pass = !submenuVisibleInitially && submenuVisibleAfter && burgerOpenAfter === 0 && !submenuAfterNav && toggleHidden && menuAfter;
console.log(pass ? '\nNAV FIX PASS' : '\nNAV FIX ISSUES ABOVE');
