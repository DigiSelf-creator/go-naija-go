/**
 * The corn tune by hand (docs/design.md S2.9 "Corn tune", qa done checks 1 to 6): street 1 by
 * touch to the roasted corn, then standing still while it works. The corn tune plays on its own
 * output with the street tune and every effect turned down to 30 percent; the last 5 seconds show
 * a big 5, 4, 3, 2, 1 in the hint bar's place, each step slower and softer; at 0 everything
 * comes back. Screen readers hear two lines. Music off mid-count: no corn tune, no turn-down,
 * the count still shows. Reduced motion: no pop.
 */
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { startRun } from './helpers';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const corn = (page: Page) => page.evaluate(() => ({ c: window.__game!.corn, left: window.__game!.run.power.corn, lives: window.__game!.run.lives }));

async function toCorn(page: Page): Promise<void> {
  await page.goto('./');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h, { until: (s) => s.r.power.corn > 0 });
  await h.upAll();
}

test('street 1: the corn tune, the turn-down, the 5 4 3 2 1 count with its steps, and everything back at 0', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await toCorn(page);
  const s0 = await corn(page);
  expect(await page.evaluate(() => window.__game!.music.started)).toBe(true);
  expect(s0.c).toMatchObject({ on: true, place: 'corn', count: 0, step: 0 });
  await expect.poll(async () => (await corn(page)).c.effectsLevel).toBeCloseTo(0.3, 5);
  expect((await corn(page)).c.musicLevel).toBeCloseTo(0.3, 5);
  // The old "Corn is wearing off!" toast is gone; corn's end is the count.
  const toasts: string[] = [];
  const seen: { count: number; step: number; tempo: number; level: number; fx: number }[] = [];
  const pads = await page.locator('.pad:not([hidden]), .hud-btn, .hud-lives, .hud-kobo, .hud-food:not([hidden])').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  let spoken5 = '';
  for (let i = 0; i < 600; i++) {
    const s = await corn(page);
    const t = await page.evaluate(() => window.__game!.toast);
    if (t) toasts.push(t);
    if (s.c.count > 0) {
      if (seen.at(-1)?.count !== s.c.count) seen.push({ count: s.c.count, step: s.c.step, tempo: s.c.tempo, level: s.c.level, fx: s.c.effectsLevel });
      if (s.c.count === 5 && !spoken5) spoken5 = s.c.spoken;
      // The count never covers a button or the HUD, and keeps to the hint bar's place.
      const b = s.c.countBox!;
      for (const p of pads) expect(overlap(b, p), `count ${JSON.stringify(b)} over ${JSON.stringify(p)}`).toBe(false);
      const lim = await page.evaluate(() => window.__game!.hintBar.limits);
      expect(b.x).toBeGreaterThanOrEqual(lim.x - 0.5);
      expect(b.x + b.w).toBeLessThanOrEqual(lim.x + lim.w + 0.5);
      expect(b.y + b.h).toBeLessThanOrEqual(lim.bottom + 0.5);
      expect(b.y).toBeGreaterThanOrEqual(lim.top - 0.5);
      expect(t).toBe(''); // no toast over the count
    }
    expect(s.lives).toBe(3);
    if (s.left === 0) break;
    await page.waitForTimeout(50);
  }
  expect(seen.map((x) => x.count)).toEqual([5, 4, 3, 2, 1]);
  expect(seen.map((x) => x.step)).toEqual([1, 2, 3, 4, 5]);
  expect(toasts).not.toContain('Corn is wearing off!');
  expect(spoken5).toBe('Corn ends in 5 seconds');
  // Slower and softer with each number; the rest comes back up.
  await expect.poll(async () => (await corn(page)).c.on).toBe(false);
  const end = await corn(page);
  expect(end.c.count).toBe(0);
  expect(end.c.spoken).toBe('Corn is done');
  expect(end.c.effectsLevel).toBe(1);
  expect(end.c.musicLevel).toBe(1);
  expect(end.c.place).toBe(null);
  expect(await page.evaluate(() => window.__game!.music.place)).toBe('street');
  const fxSteps = seen.map((x) => x.fx);
  for (let i = 1; i < fxSteps.length; i++) expect(fxSteps[i]!).toBeGreaterThanOrEqual(fxSteps[i - 1]!);
  expect(errors).toEqual([]);
});

test('street 1: Music off mid-count stops the corn tune and the turn-down; the count still shows; reduced motion: no pop', async ({ page }) => {
  test.setTimeout(240_000);
  await toCorn(page);
  expect((await corn(page)).c.on).toBe(true);
  await expect.poll(async () => (await corn(page)).c.count, { timeout: 15_000, intervals: [50] }).toBe(4);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.press('m');
  await expect.poll(async () => (await corn(page)).c.on).toBe(false);
  const s = await corn(page);
  expect(s.c.effectsLevel).toBe(1);
  expect(s.c.musicLevel).toBe(1);
  expect(await page.evaluate(() => window.__game!.music.on)).toBe(false);
  // The count still shows, and its numbers just change (no pop animation).
  await expect.poll(async () => (await corn(page)).c.count, { timeout: 5000, intervals: [50] }).toBe(2);
  const anim = await page.locator('.corn-count .count-num').evaluate((e) => getComputedStyle(e).animationName);
  expect(anim).toBe('none');
  await expect.poll(async () => (await corn(page)).left, { timeout: 5000 }).toBe(0);
  expect((await corn(page)).c.on).toBe(false);
});
