/**
 * Pepper fufu by hand (docs/design.md S2.15 qa done checks 2 and 5): street 2 played by touch
 * up to the fufu bowl at x 4800; the Throw button shows beside Jump (64 px or more), says
 * "Throw fufu, 8 left", takes its own taps (never a jump), and X throws too; it hides at 0
 * balls. The hint bar ends 6 px left of Throw, except at 320 x 240 where it keeps its place
 * over the button (which still works under it).
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, RIGHT, type Hands } from './hands';
import { startRun } from './helpers';

async function toFufu(page: Page): Promise<Hands> {
  await page.goto('./?level=lagos-2');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h, { until: (s) => s.r.fufu > 0 });
  await h.upAll();
  return h;
}

const fufu = (page: Page) => page.evaluate(() => window.__game!.run.fufu);
const throwBtn = (page: Page) => page.evaluate(() => window.__game!.throwButton);

test('street 2 by touch: pick up fufu, Throw beside Jump, its own taps, X too, hidden at 0', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const h = await toFufu(page);
  expect(await fufu(page)).toBe(8);
  await expect(page.getByText('Pepper fufu! Press Throw to throw.')).toBeVisible();

  const b = (await throwBtn(page))!;
  expect(b.label).toBe('Throw fufu, 8 left');
  await expect(page.getByRole('button', { name: 'Throw fufu, 8 left' })).toBeVisible();
  const layout = await page.evaluate(() => window.__game!.input.layout);
  // The drawn circle (5 px inside the touch box) is 64 px or more, its right edge 10 px left of Jump.
  expect(b.w - 10).toBeGreaterThanOrEqual(64);
  expect(Math.round(b.x + b.w - 5)).toBe(Math.round(layout.jump.x - 10));
  expect(Math.round(b.y + b.h - 5)).toBe(Math.round(layout.jump.y + layout.jump.h));
  // The hint bar ends 6 px left of the drawn Throw.
  const bar = await page.evaluate(() => window.__game!.hintBar);
  expect(bar.x + bar.w).toBeLessThanOrEqual(b.x + 5 - 6 + 0.5);
  expect(bar.limits.overThrow).toBe(false);

  // A tap on Throw throws one ball and never jumps.
  const cx = Math.round(b.x + b.w / 2);
  const cy = Math.round(b.y + b.h / 2);
  await h.down(RIGHT, cx, cy);
  await expect.poll(() => fufu(page)).toBe(7);
  expect(await page.evaluate(() => window.__game!.input.jumpHeld)).toBe(0);
  expect(await page.evaluate(() => window.__game!.hero.grounded)).toBe(true);
  expect((await page.evaluate(() => window.__game!.run.balls)).length).toBeGreaterThanOrEqual(1);
  // Holding does not repeat.
  await page.waitForTimeout(600);
  expect(await fufu(page)).toBe(7);
  await h.up(RIGHT);
  expect((await throwBtn(page))!.label).toBe('Throw fufu, 7 left');

  // X throws too (key repeat ignored).
  await page.waitForTimeout(300);
  await page.keyboard.press('x');
  await expect.poll(() => fufu(page)).toBe(6);
  expect(await page.evaluate(() => window.__game!.input.lastKind)).toBe('keys');

  // Throw them all: the button hides at 0 and the bar takes its old right edge (Jump - 6).
  for (let n = 6; n > 0; n--) {
    await page.waitForTimeout(300);
    await expect.poll(() => page.evaluate(() => window.__game!.run.balls.filter((q) => q.mode === 'fly' || q.mode === 'roll').length), { timeout: 4000 }).toBeLessThan(3);
    await h.down(RIGHT, cx, cy);
    await expect.poll(() => fufu(page)).toBe(n - 1);
    await h.up(RIGHT);
  }
  await expect.poll(() => throwBtn(page)).toBe(null);
  const bar0 = await page.evaluate(() => window.__game!.hintBar.limits);
  expect(bar0.x + bar0.w).toBeCloseTo(layout.jump.x - 6, 0);
  // A tap where Throw was is a jump now.
  await page.waitForTimeout(500);
  await h.down(RIGHT, cx, cy);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded)).toBe(false);
  await h.up(RIGHT);
  expect(errors).toEqual([]);
});

test('320 x 240: the hint bar keeps its place over Throw, and Throw still works under it', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 240 });
  const h = await toFufu(page);
  const bar = await page.evaluate(() => window.__game!.hintBar);
  expect(bar.words).toContain('fufu');
  expect(bar.limits.overThrow).toBe(true);
  const layout = await page.evaluate(() => window.__game!.input.layout);
  const fwd = layout.forward.x + layout.forward.w;
  expect(Math.round(bar.limits.x)).toBe(Math.round(fwd + 6));
  expect(Math.round(bar.limits.x + bar.limits.w)).toBe(Math.round(layout.jump.x - 6));
  const b = (await throwBtn(page))!;
  expect(b.w - 10).toBeGreaterThanOrEqual(64);
  const { jump } = await buttonCentres(page);
  expect(b.x + b.w).toBeLessThan(jump.x);
  // Under the bar (it takes no taps): a tap throws.
  await h.down(RIGHT, Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2));
  await expect.poll(() => fufu(page)).toBe(7);
  await h.up(RIGHT);
});
