/**
 * qa O2 (size): the debug art galleries (?gallery=…) are built into assets/debug/, outside the
 * service worker's first-visit cache, and still open on the test link.
 */
import { expect, test } from '@playwright/test';

test('debug galleries: not in the first-visit cache, and ?gallery=hall-ogun, ota and the old gallery still draw', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A first visit: the worker installs and fills its cache.
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (k) => (await (await caches.open(k)).keys()).length))).reduce((a, b) => a + b, 0)))
    .toBeGreaterThan(10);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) urls.push(new URL(r.url).pathname);
    return urls;
  });
  expect(cached.some((u) => /\/assets\/index-/.test(u))).toBe(true);
  expect(cached.filter((u) => /galler|\/debug\//i.test(u))).toEqual([]);

  for (const [q, chunk] of [['hall-ogun', /assets\/debug\/galleryHallOgun-/], ['ota', /assets\/debug\/galleryOta-/], ['', /assets\/debug\/gallery-/]] as const) {
    const loaded: string[] = [];
    const onResponse = (r: { url(): string; ok(): boolean }): void => {
      if (r.ok()) loaded.push(r.url());
    };
    page.on('response', onResponse);
    await page.goto(q ? `./?gallery=${q}&t=1.5` : './?gallery');
    await expect.poll(() => loaded.some((u) => chunk.test(u)), { message: `?gallery=${q} loads its chunk` }).toBe(true);
    await page.waitForTimeout(400);
    // Something is drawn: the canvas is not one flat colour.
    const colours = await page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set<number>();
      for (let i = 0; i < d.length; i += 4 * 997) seen.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
      return seen.size;
    });
    expect(colours, `?gallery=${q} draws`).toBeGreaterThan(5);
    page.off('response', onResponse);
  }
  expect(errors).toEqual([]);
});
