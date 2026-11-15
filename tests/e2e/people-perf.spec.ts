/**
 * S3g1b (docs/design.md "People everywhere" part 11): at 4x CPU slowdown on the phone profile,
 * the street's people (update and draw) take at most 1.5 ms a frame on average; the bake is
 * reported; backing off works when forced; nobody is drawn on the front pavement strip.
 */
import { expect, test } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, gentleOn, startRun } from './helpers';

/** Lagos switched on: the fixed look, the busiest street people (part 3). */
const SWITCHED_ON = JSON.stringify({
  v: 1,
  states: { lagos: { streets: { 1: { done: true, best: 1 }, 2: { done: true, best: 1 }, 3: { done: true, best: 1 } }, parcel: false, hall: { done: true, best: 0 } } },
});

test('slowed 4x CPU: street 2 in the fixed look, the people take at most 1.5 ms a frame; backing off when forced', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((v) => localStorage.setItem('gidi-progress', v), SWITCHED_ON);
  await page.goto('./?level=lagos-2');
  await gentleOn(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let seen = 0;
  const strip: number[] = [];
  try {
    await page.evaluate(() => window.__game!.people);
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(500);
      const p = await page.evaluate(() => window.__game!.people);
      seen = Math.max(seen, p.seen);
      for (const d of p.drawn) if (d.y >= 360) strip.push(d.y);
      if (i % 6 === 5) {
        await page.keyboard.press('Space');
      }
    }
    await page.keyboard.up('ArrowRight');
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const p = await page.evaluate(() => window.__game!.people);
  console.log(`people at 4x CPU, street 2 fixed look: ${p.ms.avg.toFixed(2)} ms a frame on average, longest ${p.ms.max.toFixed(2)} ms, bake ${p.ms.bake.toFixed(1)} ms (at 1x), up to ${seen} people on screen, backing off ${p.backOff}`);
  expect(errors).toEqual([]);
  expect(seen).toBeGreaterThan(0);
  expect(strip).toEqual([]);
  expect(p.ms.avg, 'people ms a frame at 4x').toBeLessThanOrEqual(1.5);
  // Forced backing off: no walkers (level 1).
  await page.evaluate(() => window.__game!.forceBackOff(1));
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__game!.people)).backOff).toBe(1);
});
