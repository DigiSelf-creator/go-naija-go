/**
 * O1c (docs/ogun.md 9.2; U1, decision 52 and 68): an update keeps the downloaded Ogun part, so
 * Ogun still opens with no internet after the update; and the "New version ready" banner during
 * the bus ride. The built game is served twice from our own small server (as update-prompt.spec.ts):
 * build A, then build B with a new service worker version.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const BANNER = 'New version ready. Tap to update.';
const MARK = '<meta name="gidi-test-build" content="b" />';
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const SAVE = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: { done: true, best: 0 } }, ogun: { arrived: true } }, city: CITY };
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

let tmp = '';
let root = '';
let server: Server;
let base = '';
const builds = { a: '', b: '' };

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const dist = resolve('dist');
  if (!existsSync(join(dist, 'sw.js'))) throw new Error('Build the game first (npm run build)');
  tmp = mkdtempSync(join(tmpdir(), 'gidi-o1c-'));
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

const update = (page: Page) => page.evaluate(() => window.__game!.update);
const ogunCached = (page: Page) =>
  page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) if (new URL(r.url).pathname.includes('/worlds/ogun/')) out.push(k);
    return [...new Set(out)];
  });

/** Build A, controlled by its worker, with the save; Play; then to Ogun (download, ride, skipped). */
async function toOgun(page: Page): Promise<void> {
  await page.goto(base);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20_000 }).toBe(true);
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(SAVE) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
  await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect.poll(() => ogunCached(page)).toHaveLength(1);
}

test('o1c: an update keeps the Ogun part: after it, Ogun opens with no internet', async ({ page, context }) => {
  test.setTimeout(120_000);
  await toOgun(page);
  const before = await ogunCached(page);
  root = builds.b;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => (await update(page)).ready, { timeout: 20_000 }).toBe(true);
  await page.getByRole('button', { name: BANNER }).tap();
  await expect.poll(() => page.evaluate(() => !!document.querySelector('meta[name="gidi-test-build"]')).catch(() => false), { timeout: 20_000 }).toBe(true);
  await page.waitForLoadState('load');
  // The new cache holds Ogun; the old one is gone.
  await expect.poll(() => ogunCached(page).catch(() => before), { timeout: 10_000 }).not.toEqual(before);
  expect(await ogunCached(page)).toHaveLength(1);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  // "Play" opens the city last used: Ogun, from the phone, no download card.
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect(page.locator('.download-card')).toHaveCount(0);
});

test('o1c: the update banner does not show during the bus ride', async ({ page }) => {
  // Game bug O1c-4: inAttempt() (src/update.ts) counts only runs, so the banner shows over the
  // ride, and a tap there reloads before the ride sets `where` (the ride and arrival play again).
  test.setTimeout(120_000);
  await toOgun(page);
  root = builds.b;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => (await update(page)).ready, { timeout: 20_000 }).toBe(true);
  // Home to Lagos by bus (the short ride); look at the banner all through it.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Ogun', exact: true }).getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  const seen: boolean[] = [];
  while ((await screenNow(page)) === 'ride') {
    seen.push((await update(page)).shown);
    await page.waitForTimeout(150);
  }
  test.info().annotations.push({ type: 'banner during ride', description: `${seen.filter(Boolean).length} of ${seen.length} looks` });
  expect(seen.length).toBeGreaterThan(3);
  expect(seen.some(Boolean)).toBe(false);
});
