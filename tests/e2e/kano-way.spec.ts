/**
 * K1b (docs/kano.md parts 1 and 8): the way to Kano on the phone profile. Kano opens with Pothole
 * Hall won; the Travel card's third button, the web download card, the long ride north (Skip),
 * the arrival card once over Kano's home, "Play" opening Kano again, and the ride back to Lagos.
 * Kano opens with the Ogun part never fetched (KN-R10).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
/** Pothole Hall won: Kano is open (kano.md 1.1). An old save with no `kano` part. */
const OGUN_WON = { v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true } }, city: CITY };

const partOf = (url: string): string | null => /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;

async function open(page: Page, save: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun|kano)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

test.describe('on the web, before the Kano part is on the phone', () => {
  test.use({ serviceWorkers: 'block' });

  test('Travel shows Kano third; download, the ride north, the arrival card once, Play opens Kano, back to Lagos', async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const asked: string[] = [];
    context.on('request', (r) => {
      const p = partOf(r.url());
      if (p) asked.push(p);
    });
    await open(page, OGUN_WON);
    const lagos = page.getByRole('dialog', { name: 'Lagos' });
    await lagos.getByRole('button', { name: 'Travel' }).tap();
    const t = page.getByRole('dialog', { name: 'Where to?' });
    const places = t.locator('.travel-place');
    expect(await places.evaluateAll((b) => b.map((x) => x.getAttribute('data-state')))).toEqual(['lagos', 'ogun', 'kano']);
    expect(await places.nth(2).getAttribute('aria-label')).toBe('Kano. Booming 0 of 20.');
    const boxes = await Promise.all((await places.all()).map(async (b) => (await b.boundingBox())!));
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(140);
      expect(box.height).toBeGreaterThanOrEqual(72);
    }
    // 851 wide: side by side.
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
    await places.nth(2).tap();
    const dl = page.locator('.download-card');
    await expect(dl.getByText('Kano is ready to download (about 85 KB).')).toBeVisible();
    await expect(dl.getByText('After this it plays with no internet.')).toBeVisible();
    expect(asked).toEqual([]);
    await dl.getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    await expect(page.getByRole('img', { name: 'A long bus drives north across the grassland to the old wall of Kano.' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Skip' }).tap();
    await expect.poll(() => screenNow(page)).toBe('kano');
    const card = page.getByRole('dialog', { name: 'Welcome to Kano!' });
    await expect(card.getByText('Kano is the Centre of Commerce. People come here to buy and sell.')).toBeVisible();
    await expect(card.getByText('The dust has dried up the borehole. Fix Kano, and the water will flow.')).toBeVisible();
    const go = card.getByRole('button', { name: "Let's go" });
    expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await go.tap();
    await expect(card).toHaveCount(0);
    // KN-R10: only the Kano part was fetched.
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.every((p) => p === 'kano')).toBe(true);
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}'));
    expect(s.where).toBe('kano');
    expect(s.states.kano.arrived).toBe(true);
    expect(s.states.lagos).toEqual(DONE);

    // Play opens Kano again, with no arrival card.
    await page.reload();
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe('kano');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await expect(page.getByRole('dialog', { name: 'Welcome to Kano!' })).toHaveCount(0);
    // K6b: Kano's city (it replaced the still home): once it settles, a still city draws nothing.
    await page.waitForTimeout(2500);
    const d0 = await page.evaluate(() => window.__game!.kanoHome?.draws ?? -1);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__game!.kanoHome?.draws)).toBe(d0);

    // Back to Lagos: Kano's ride, the other way.
    await page.locator('.kano-city').getByRole('button', { name: 'Travel' }).tap();
    await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    await expect(page.getByRole('img', { name: 'A long bus drives from Kano back down the road.' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Skip' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    expect(errors).toEqual([]);
  });

  test('Ogun\'s road: "To Kano" is open after Pothole Hall; the wheel says Kano is next', async ({ page }) => {
    await open(page, { ...OGUN_WON, where: 'ogun' });
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
    const stop = page.getByRole('region', { name: 'Challenge road' }).locator('[data-where="wayOn"]');
    await expect(stop).toHaveAttribute('aria-label', 'To Kano. Open. The road to Kano is open.');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await stop.tap();
    const card = page.getByRole('dialog', { name: 'To Kano' });
    await expect(card.getByText('The road to Kano is open.')).toBeVisible();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await card.getByRole('button', { name: 'Go to Kano' }).tap();
    await expect(page.locator('.download-card').getByText('Kano is ready to download (about 85 KB).')).toBeVisible();
    await page.locator('.download-card').getByRole('button', { name: 'Not now' }).tap();
    await page.getByRole('button', { name: 'Home' }).first().tap();
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator('.ogun-city').getByRole('button', { name: "Nigeria's wheel" }).tap();
    await expect(page.getByText('Next: Kano, the Centre of Commerce.').first()).toBeAttached();
  });
});
