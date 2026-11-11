/**
 * L2 frame rate: street 2 by hand at 4x CPU slowdown on the phone profile, down the well, every
 * gift in the room, up at the exit well, on to the bus (docs/design.md S2.5). Pass: at least 45
 * fps in every 1000 u part of the street, in the room, and going down and up, at about 60
 * physics steps a second. Same method as street-perf.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, startRun, gentleOn, storySeen } from './helpers';
import { wellBot } from './well-bot';

// Slice 3 (city.md (a)): the intro story is not what these tests are about; it is marked seen.
test.beforeEach(({ page }) => storySeen(page));

const BAR = 45;

const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

test('slowed 4x CPU: street 2 by hand with the well room, at least 45 fps in every part, the room too', async ({ page }) => {
  test.setTimeout(400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?level=lagos-2');
  await gentleOn(page); // slice 3: Gentle mode is in Settings
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);

  // Every frame: its time, the hero's x, the step count, and whether the room shows.
  await page.evaluate(() => {
    const log: [number, number, number, boolean][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const f = (now: number): void => {
      const g = window.__game!;
      log.push([now, g.hero.x, g.steps, g.below]);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });

  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const bot = await wellBot(page, h);
  const work1 = await busy(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let work4 = 0;
  let last;
  let roomKobo = 0;
  try {
    work4 = await busy(page);
    await playStreetByHand(page, h, { until: (s) => s.h.x >= 2950 - 150 });
    await bot.walkTo(2950, 10);
    await bot.tapWellButton('down');
    const k0 = await page.evaluate(() => window.__game!.run.kobo);
    await bot.playRoom();
    roomKobo = (await page.evaluate(() => window.__game!.run.kobo)) - k0;
    await bot.tapWellButton('up');
    await bot.phase('run');
    ({ last } = await playStreetByHand(page, h));
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await h.upAll().catch(() => {});
  }
  const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number, number, boolean][] }).__frames);

  const parts: { name: string; fps: number; steps: number; n: number }[] = [];
  const measure = (name: string, keep: (f: [number, number, number, boolean]) => boolean): void => {
    let n = 0;
    let ms = 0;
    let steps = 0;
    for (let i = 1; i < frames.length; i++) {
      const f = frames[i]!;
      const [t0, , s0] = frames[i - 1]!;
      if (!keep(f) || f[0] - t0 > 1000) continue;
      n++;
      ms += f[0] - t0;
      steps += f[2] - s0;
    }
    if (n >= 20) parts.push({ name, fps: (n * 1000) / ms, steps: (steps * 1000) / ms, n });
  };
  for (let x = 0; x < 12000; x += 1000) measure(String(x), (f) => !f[3] && f[1] >= x && f[1] < x + 1000);
  measure('room', (f) => f[3]);
  const worst = Math.min(...parts.map((p) => p.fps));
  const report = parts.map((p) => `${p.name}: ${p.fps.toFixed(1)}${p.fps < BAR ? ' (UNDER)' : ''}`).join(', ');
  console.log(
    `4x CPU, street 2 with the well room, fps by part (bar ${BAR}): ${report}. Worst ${worst.toFixed(1)}. ` +
      `Steps/s worst part ${Math.min(...parts.map((p) => p.steps)).toFixed(1)}. Room kobo ${roomKobo}. ` +
      `Reached ${last?.r.phase} at x ${last?.h.x.toFixed(0)}. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`,
  );
  test.info().annotations.push({ type: 'street 2 + room fps 4x', description: `worst ${worst.toFixed(1)} | ${report}` });

  expect(errors).toEqual([]);
  expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
  expect(roomKobo).toBe(17);
  expect(['bus', 'cleared']).toContain(last?.r.phase);
  expect(parts.some((p) => p.name === 'room')).toBe(true);
  for (const p of parts) {
    expect(p.fps, `fps in part ${p.name}`).toBeGreaterThanOrEqual(BAR);
    expect(p.steps, `physics steps a second in part ${p.name}`).toBeGreaterThan(55);
  }
});
