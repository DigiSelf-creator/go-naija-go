/**
 * O1b1 (docs/ogun.md 9.2): the Ogun part is its own lazy part under worlds/ogun/. Not fetched until
 * asked for; kept by the service worker after the first fetch so it loads offline; a missing or
 * broken part shows plain words and the game keeps going.
 * There is no Ogun screen yet (O1b2), so these use the dev helper __game.loadOgun().
 */
import { expect, test, type Page } from '@playwright/test';

const WORDS = {
  noInternet: 'Ogun needs the internet once to download. Lagos still works with no internet.',
  broken: 'Ogun could not open just now. Lagos still works. Try again later.',
};

const isOgun = (url: string): boolean => /\/worlds\/ogun\//.test(new URL(url).pathname);

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => typeof window.__game?.loadOgun)).toBe('function');
  return errors;
}

test.describe('without the service worker', () => {
  test.use({ serviceWorkers: 'block' });

  test('the Ogun part is not fetched until asked for, then loads', async ({ page, context }) => {
    const asked: string[] = [];
    context.on('request', (r) => {
      if (isOgun(r.url())) asked.push(r.url());
    });
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // the people and other lazy bits load after 200 ms
    expect(asked).toEqual([]);
    const s = await page.evaluate(() => window.__game!.states);
    expect(s).toMatchObject({ where: 'lagos', open: ['lagos'], arrived: false, ogunLoaded: false });

    const r = await page.evaluate(() => window.__game!.loadOgun());
    expect(r.ok).toBe(true);
    expect(asked.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__game!.states.ogunLoaded)).toBe(true);
  });

  test('a missing part (no internet): plain words on screen, no crash, and Lagos still plays', async ({ page }) => {
    const errors = await open(page);
    await page.route(/\/worlds\/ogun\//, (route) => route.abort('internetdisconnected'));
    await page.context().setOffline(true);
    const r = await page.evaluate(() => window.__game!.loadOgun());
    expect(r).toEqual({ ok: false, why: 'missing', message: WORDS.noInternet });
    await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe(WORDS.noInternet);
    expect(errors).toEqual([]);
    // The game is still alive and still reads its saves.
    expect(await page.evaluate(() => window.__game!.states.where)).toBe('lagos');
  });

  test('a broken part: plain words, no crash; a later good try works', async ({ page }) => {
    const errors = await open(page);
    let broken = true;
    await page.route(/\/worlds\/ogun\//, (route) =>
      broken ? route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export const part = { id: "ogun", version: 99 };' }) : route.fallback(),
    );
    const r = await page.evaluate(() => window.__game!.loadOgun());
    expect(r).toEqual({ ok: false, why: 'broken', message: WORDS.broken });
    await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe(WORDS.broken);
    expect(errors).toEqual([]);
    broken = false;
    // The browser keeps the broken module for this page; a fresh page loads the good one.
    await page.reload();
    await expect.poll(() => page.evaluate(() => typeof window.__game?.loadOgun)).toBe('function');
    expect((await page.evaluate(() => window.__game!.loadOgun())).ok).toBe(true);
  });

  test('a file that is not script at all: plain words, no crash', async ({ page }) => {
    const errors = await open(page);
    await page.route(/\/worlds\/ogun\//, (route) => route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not found</h1>' }));
    const r = await page.evaluate(() => window.__game!.loadOgun());
    expect(r).toEqual({ ok: false, why: 'missing', message: WORDS.broken });
    expect(errors).toEqual([]);
  });

  test('an old save loads as Lagos and opens Ogun once the Lagos hall is done', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'gidi-progress',
        JSON.stringify({ v: 2, states: { lagos: { streets: { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } }, parcel: false, hall: { done: true, best: 0 } } }, city: { kobo: 5000, power: 2, tech: 1, fixed: [], fixes: 0 } }),
      );
    });
    await open(page);
    expect(await page.evaluate(() => window.__game!.states)).toMatchObject({ where: 'lagos', open: ['lagos', 'ogun'], wallet: { kobo: 5000, power: 2, tech: 1 } });
  });
});

test('after the first fetch the service worker keeps the Ogun part: it loads offline', async ({ page, context }) => {
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first-visit cache holds no Ogun file.
  const before = await page.evaluate(async () => {
    const all: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) all.push(new URL(r.url).pathname);
    return all;
  });
  expect(before.some((p) => p.includes('/worlds/'))).toBe(false);
  // Take control of the page, so the first fetch goes through the worker.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect((await page.evaluate(() => window.__game!.loadOgun())).ok).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const all: string[] = [];
        for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) all.push(new URL(r.url).pathname);
        return all.some((p) => p.includes('/worlds/ogun/'));
      }),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => typeof window.__game?.loadOgun)).toBe('function');
  const r = await page.evaluate(() => window.__game!.loadOgun());
  expect(r.ok).toBe(true);
});
