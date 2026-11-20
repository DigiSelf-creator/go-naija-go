import { expect, test, type Page } from '@playwright/test';

/**
 * ST3 (decision 56): public/privacy.html is a plain page on the site, not part of the game.
 * The service worker leaves it to the network: never cached, never answered with the game page.
 */
const TITLE = 'Gbese! privacy';

/** Every request the page makes that leaves our own site. */
function outside(page: Page, base: string): string[] {
  const seen: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) seen.push(u);
  });
  return seen;
}

async function isPrivacyPage(page: Page): Promise<void> {
  await expect(page).toHaveTitle(TITLE);
  await expect(page.locator('h1')).toHaveText(TITLE);
  await expect(page.locator('canvas#game')).toHaveCount(0);
}

test('a fresh visit to privacy.html shows the privacy page, asks no other site, fits a small phone', async ({ page, baseURL }) => {
  const away = outside(page, baseURL!);
  await page.setViewportSize({ width: 320, height: 240 });
  await page.goto('./privacy.html');
  await isPrivacyPage(page);
  await expect(page.getByRole('link', { name: 'Back to the game' })).toBeVisible();
  // No sideways scroll on a small phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(away).toEqual([]);
});

test('after the game is opened (worker in charge), privacy.html is still the privacy page and is not cached', async ({ page, baseURL }) => {
  const away = outside(page, baseURL!);
  await page.goto('./');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Make sure the worker controls the next page load.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.goto('./privacy.html');
  await isPrivacyPage(page);
  // A second look (now certainly under the worker) is still the privacy page.
  await page.reload();
  await isPrivacyPage(page);

  const cached = await page.evaluate(async () => {
    const hits: string[] = [];
    for (const k of await caches.keys()) {
      for (const r of await (await caches.open(k)).keys()) if (/privacy/.test(r.url)) hits.push(r.url);
    }
    return hits;
  });
  expect(cached).toEqual([]);
  expect(away).toEqual([]);
});

test('offline after a visit: privacy.html fails as a normal page would (never the game), and the game still plays offline', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto('./privacy.html');
  await isPrivacyPage(page);

  await context.setOffline(true);
  let failed = '';
  try {
    await page.goto('./privacy.html');
  } catch (e) {
    failed = String(e);
  }
  // The browser's own "no internet" error, not our game in the privacy page's place.
  expect(failed).toMatch(/ERR_INTERNET_DISCONNECTED|ERR_FAILED/);
  await expect(page.locator('canvas#game')).toHaveCount(0);

  await page.goto('./');
  await expect(page.locator('canvas#game')).toBeVisible();
});

test('dark mode: the privacy page words stay readable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./privacy.html');
  await isPrivacyPage(page);
  const ratio = await page.evaluate(() => {
    const rgb = (s: string) => (s.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const bg = lum(rgb(getComputedStyle(document.body).backgroundColor));
    const worst = (sel: string) => {
      const fg = lum(rgb(getComputedStyle(document.querySelector(sel)!).color));
      const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg];
      return (hi + 0.05) / (lo + 0.05);
    };
    return Math.min(worst('p'), worst('h1'), worst('a'));
  });
  expect(ratio).toBeGreaterThanOrEqual(7);
  // Dark really is dark.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(15, 26, 18)');
});
