import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, waitOutTapLock } from './helpers';

/**
 * U1 (decision 52): "New version ready. Tap to update."
 * The built game (dist, made by the web server step) is served twice from our own small server:
 * build A as it is, and build B with a changed sw.js version and a marker in index.html. A visit
 * to A, then B served: the next look at the game shows the banner, and one tap loads B.
 */
const WORDS = 'New version ready. Tap to update.';
const MARK = '<meta name="gidi-test-build" content="b" />';
const SHOTS = process.env['UPDATE_SHOTS'] ?? '';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

let tmp = '';
let root = '';
let server: Server;
let base = '';
const builds = { a: '', b: '' };

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const dist = resolve('dist');
  if (!existsSync(join(dist, 'sw.js'))) throw new Error('Build the game first (npm run build)');
  tmp = mkdtempSync(join(tmpdir(), 'gidi-update-'));
  builds.a = join(tmp, 'a');
  builds.b = join(tmp, 'b');
  cpSync(dist, builds.a, { recursive: true });
  cpSync(dist, builds.b, { recursive: true });
  const sw = join(builds.b, 'sw.js');
  writeFileSync(sw, readFileSync(sw, 'utf8').replace(/const VERSION = '([^']*)'/, "const VERSION = '$1b'"));
  const page = join(builds.b, 'index.html');
  writeFileSync(page, readFileSync(page, 'utf8').replace('<head>', `<head>\n    ${MARK}`));
  root = builds.a;
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

test.afterAll(async () => {
  await new Promise((done) => server?.close(done));
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

test.beforeEach(() => {
  root = builds.a;
});

const region = (page: Page) => page.getByRole('status').filter({ hasText: WORDS });
const banner = (page: Page) => region(page).getByRole('button', { name: WORDS });
const update = (page: Page) => page.evaluate(() => window.__game!.update);
const controlled = (page: Page) => page.evaluate(() => !!navigator.serviceWorker.controller);
const isB = (page: Page) => page.evaluate(() => !!document.querySelector('meta[name="gidi-test-build"]'));

/** First visit to build A: the service worker installs and takes control. */
async function firstVisit(page: Page, url = ''): Promise<void> {
  await page.goto(base + url);
  await expect.poll(() => controlled(page), { timeout: 20_000 }).toBe(true);
}

/** No request goes anywhere but our own server. */
function ownOnly(page: Page): string[] {
  const other: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) other.push(r.url());
  });
  return other;
}

/** Boxes overlap (a bit of rounding allowed). */
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

/** The banner covers no button of the screen showing (the HUD under Pause is covered by Pause itself). */
async function coversNothing(page: Page): Promise<void> {
  const box = (await banner(page).boundingBox())!;
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  for (const b of await page.locator('.screen:not([hidden])').getByRole('button').all()) {
    if (!(await b.isVisible())) continue;
    if ((await b.textContent())?.trim() === WORDS) continue;
    const other = await b.boundingBox();
    if (!other || other.width === 0) continue;
    expect(overlaps(box, other), `banner covers "${await b.textContent()}"`).toBe(false);
  }
}

test('first visit: no banner, and none on the next open of the same version', async ({ page }) => {
  const other = ownOnly(page);
  await firstVisit(page);
  await page.waitForTimeout(1500);
  expect(await update(page)).toEqual({ ready: false, shown: false });
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await expect.poll(() => controlled(page)).toBe(true);
  // The page coming back to the front looks for a new sw.js: the same one, so nothing.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(1500);
  expect(await update(page)).toEqual({ ready: false, shown: false });
  await expect(banner(page)).toHaveCount(0);
  expect(other).toEqual([]);
});

test('a new version served: the next open shows the banner; a tap loads the new version', async ({ page }) => {
  // Chromium runs a sw.js check made without a tap at most about once a minute. This open comes
  // a second after the first visit's check, so the check (the game's own on opening, or the
  // browser's) runs about a minute later. On a phone the next open is normally much later.
  test.setTimeout(150_000);
  const other = ownOnly(page);
  await firstVisit(page);
  expect(await isB(page)).toBe(false);
  root = builds.b;
  // Revisit: the old worker answers with the old page; a new sw.js is looked for.
  await page.reload();
  expect(await isB(page)).toBe(false);
  await expect(banner(page)).toBeVisible({ timeout: 90_000 });
  await expect(region(page)).toHaveClass(/update-banner/);
  await coversNothing(page);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'update-title-851x393.png') });
  // Keyboard: it is a real button.
  await banner(page).focus();
  await expect(banner(page)).toBeFocused();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await banner(page).tap();
  await page.waitForURL(base, { waitUntil: 'load' }).catch(() => {});
  await expect(page.locator('meta[name="gidi-test-build"]')).toHaveCount(1, { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__game?.screen)).toBe('title');
  await page.waitForTimeout(1000);
  await expect(banner(page)).toHaveCount(0);
  expect(other).toEqual([]);
});

test('never mid-run: it waits for Pause, goes when the run carries on, at 320 x 240 too', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await firstVisit(page, '?level=lagos-1');
  await startRun(page);
  await expect.poll(() => screenNow(page)).toBe('play');
  root = builds.b;
  // The game comes back to the front mid-run: it looks for a new sw.js and finds one.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => (await update(page)).ready, { timeout: 20_000 }).toBe(true);
  // Ready, but the run is on: no banner while the screen is 'play'.
  for (let i = 0; i < 6; i++) {
    const s = await page.evaluate(() => ({ screen: window.__game!.screen, shown: window.__game!.update.shown, n: document.querySelectorAll('.update-btn').length }));
    if (s.screen !== 'play') break;
    expect(s.shown).toBe(false);
    expect(s.n).toBe(0);
    await page.waitForTimeout(250);
  }
  // Pause (if the run is still going): now it shows.
  if ((await screenNow(page)) === 'play') await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expect(banner(page)).toBeVisible();
  await coversNothing(page);
  if ((await screenNow(page)) !== 'pause') return;
  await page.setViewportSize({ width: 320, height: 240 });
  await page.waitForTimeout(300);
  await expect(banner(page)).toBeVisible();
  await coversNothing(page);
  // The pause card's buttons all still show in the screen below it.
  const card = await page.getByRole('dialog', { name: 'Paused' }).boundingBox();
  const bar = (await banner(page).boundingBox())!;
  expect(card!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'update-pause-320x240.png') });
  await page.setViewportSize({ width: 851, height: 393 });
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'update-pause-851x393.png') });
  // Keep playing: the banner goes at once (reduced motion: no close animation).
  await waitOutTapLock(page);
  await page.getByRole('button', { name: 'Keep playing' }).tap();
  expect(await page.evaluate(() => document.querySelectorAll('.update-btn').length)).toBe(0);
  expect((await update(page)).shown).toBe(false);
});

test('the screens that fill the page start below it: intro, builder, city, wheel, at 851 x 393 and 320 x 240', async ({ page }) => {
  await firstVisit(page);
  root = builds.b;
  await page.reload();
  await expect(banner(page)).toBeVisible({ timeout: 20_000 });
  const shot = async (name: string) => {
    for (const [w, hgt] of [[851, 393], [320, 240]] as const) {
      await page.setViewportSize({ width: w, height: hgt });
      await page.waitForTimeout(400);
      await expect(banner(page)).toBeVisible();
      await coversNothing(page);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `update-${name}-${w}x${hgt}.png`) });
    }
    await page.setViewportSize({ width: 851, height: 393 });
    await page.waitForTimeout(300);
  };
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('intro');
  await shot('intro');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await shot('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(1500);
  await shot('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: "Nigeria's wheel", exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('wheel');
  await shot('wheel');
});
