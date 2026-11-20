/**
 * qa polish round (0d12c8a): Ogun's first-visit hint now waits hidden until a spot clear of boards,
 * bubbles and arrows opens. At 320 x 240 that spot never opens: the band between the chips and the
 * bottom buttons always holds a board, so a first-time player never reads the hint, even after walking.
 */
import { expect, test, type Page } from '@playwright/test';
import { screenNow } from './helpers';

const LOOK = '{"skin":3,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const STREETS = { 1: D, 2: D, 3: D };
const HALL = { done: true, best: 0 };
const FRESH_OGUN = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true } }, city: { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] }, where: 'ogun' };

const hintShown = (page: Page) =>
  page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.ogun-city .city-hint');
    return !!h && !h.hidden && getComputedStyle(h).visibility !== 'hidden';
  });

async function openFreshOgun(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  await page.goto('./');
  await page.evaluate(({ look, p }) => {
    localStorage.setItem('gidi-look', look);
    localStorage.setItem('gidi-intro', '"seen"');
    localStorage.setItem('gidi-busRide', 'false');
    localStorage.setItem('gidi-progress', p);
  }, { look: LOOK, p: JSON.stringify(FRESH_OGUN) });
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
}

test('Ogun first visit, upright 360 x 640: the walk hint shows at once', async ({ page }) => {
  await openFreshOgun(page, { width: 360, height: 640 });
  await expect.poll(() => hintShown(page)).toBe(true);
});

test('QA-POL-1 (open): Ogun first visit at 320 x 240: the walk hint shows once the hero has walked about', async ({ page }) => {
  test.fail(true, 'QA-POL-1: at 320 x 240 the hint waits for a spot clear of boards that never opens, so it is never seen');
  test.setTimeout(90_000);
  await openFreshOgun(page, { width: 320, height: 240 });
  let seen = await hintShown(page);
  // Walk to five places across the map, watching for the hint as the camera follows.
  for (const [fx, fy] of [[0.85, 0.3], [0.2, 0.3], [0.6, 0.45], [0.9, 0.42], [0.3, 0.45]] as const) {
    if (seen) break;
    await page.touchscreen.tap(320 * fx, 240 * fy);
    for (let i = 0; i < 16 && !seen; i++) {
      await page.waitForTimeout(250);
      seen = await hintShown(page);
    }
  }
  expect(seen).toBe(true);
});
