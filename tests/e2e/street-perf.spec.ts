/**
 * Frame rate through the whole of each Lagos street (lagos-1 Alausa, lagos-2 Computer Village,
 * lagos-3 Ikeja, each with its own backdrop, and again in the fixed look once Lagos is switched on, N2), played by hand with two thumbs, at 4x CPU slowdown on
 * the phone profile. Pass: at least 45 fps in every 1000 u part of the street,
 * and the game keeps full speed (about 60 physics steps a second). The hero knocks every crate
 * on the way (J2), so swings, kobo fans and the food pop are measured too.
 *
 * Go-Slow Hall's frame rate is in hall-perf.spec.ts (piece M2 retired the slice 1 level, w1-l1).
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, startRun } from './helpers';

/** The bar for each part of the street, fps at 4x slowdown. */
const BAR = 45;

/** The same fixed piece of work, timed: proves the slowdown is really on. */
const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

const STREETS = [
  { n: 1, id: 'lagos-1', url: './', fixed: false },
  { n: 2, id: 'lagos-2', url: './?level=lagos-2', fixed: false },
  { n: 3, id: 'lagos-3', url: './?level=lagos-3', fixed: false },
  { n: 1, id: 'lagos-1', url: './?level=lagos-1', fixed: true },
  { n: 2, id: 'lagos-2', url: './?level=lagos-2', fixed: true },
  { n: 3, id: 'lagos-3', url: './?level=lagos-3', fixed: true },
] as const;

/** N2: Lagos switched on, so the streets draw their fixed look (lamps, lit signs, bunting, fresh paint). */
const SWITCHED_ON = JSON.stringify({
  v: 1,
  states: { lagos: { streets: { 1: { done: true, best: 1 }, 2: { done: true, best: 1 }, 3: { done: true, best: 1 } }, parcel: false, hall: { done: true, best: 0 } } },
});

for (const { n, id, url, fixed } of STREETS) test(`slowed 4x CPU: street ${n}${fixed ? ' in the fixed look' : ''} by hand, start to bus, at least 45 fps in every part`, async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // PERF_LOOK (optional): a saved look to run with, e.g. '{"skin":4,"hair":1,"outfit":3,"body":0,"age":2}'
  // for an Elder, so each body and age can be measured. Unset: the default hero.
  const perfLook = process.env['PERF_LOOK'];
  if (perfLook) await page.addInitScript((v) => localStorage.setItem('gidi-look', v), perfLook);
  if (fixed) await page.addInitScript((v) => localStorage.setItem('gidi-progress', v), SWITCHED_ON);
  await page.goto(url);
  if (perfLook) expect(await page.evaluate(() => window.__game!.look)).toEqual(JSON.parse(perfLook));
  // Gentle mode, so a missed jump on a slow machine does not end the measurement early.
  await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
  expect(await page.evaluate(() => window.__game!.fixedLook)).toBe(fixed);
  const dpr = await page.evaluate(() => devicePixelRatio);
  const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);

  // Every frame: its time, the hero's x and the physics step count.
  await page.evaluate(() => {
    const log: [number, number, number][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const f = (now: number): void => {
      log.push([now, window.__game!.hero.x, window.__game!.steps]);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });

  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const work1 = await busy(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let work4 = 0;
  let last;
  const crates: CrateLog = { opened: [], foods: [] };
  const act = await crateActor(page, crates);
  try {
    work4 = await busy(page);
    ({ last } = await playStreetByHand(page, h, { act }));
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await h.upAll().catch(() => {});
  }
  const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number, number][] }).__frames);

  // fps for each 1000 u of street: frames whose hero x is in that part, over the time they span
  // (only gaps of under a second count, so a fall back to the bus stop is not a slow frame).
  const parts: { x: number; fps: number; steps: number }[] = [];
  for (let x = 0; x < 12000; x += 1000) {
    let n = 0;
    let ms = 0;
    let steps = 0;
    for (let i = 1; i < frames.length; i++) {
      const [t, hx, s] = frames[i]!;
      const [t0, , s0] = frames[i - 1]!;
      if (hx < x || hx >= x + 1000 || t - t0 > 1000) continue;
      n++;
      ms += t - t0;
      steps += s - s0;
    }
    if (n >= 20) parts.push({ x, fps: (n * 1000) / ms, steps: (steps * 1000) / ms });
  }
  const worst = Math.min(...parts.map((p) => p.fps));
  const report = parts.map((p) => `${p.x}: ${p.fps.toFixed(1)}${p.fps < BAR ? ' (UNDER)' : ''}`).join(', ');
  const total = frames.length > 1 ? ((frames.length - 1) * 1000) / (frames.at(-1)![0] - frames[0]![0]) : 0;
  console.log(
    `4x CPU, street ${n}${fixed ? ' (fixed look)' : ''} by hand (dpr ${dpr}, canvas ${canvas}), fps by part (bar ${BAR}): ${report}. ` +
      `Worst ${worst.toFixed(1)}, overall ${total.toFixed(1)}. Steps/s worst part ${Math.min(...parts.map((p) => p.steps)).toFixed(1)}. ` +
      `Crates opened ${crates.opened.join(', ') || 'none'}. Reached ${last?.r.phase} at x ${last?.h.x.toFixed(0)}, ${last?.r.lives} lives. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`,
  );
  test.info().annotations.push({ type: `street ${n}${fixed ? ' fixed' : ''} fps 4x`, description: `worst ${worst.toFixed(1)} | ${report}` });

  expect(errors).toEqual([]);
  expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
  expect(['bus', 'cleared', 'arena']).toContain(last?.r.phase);
  // Every part of the street from start to bus was measured.
  expect(parts.length).toBeGreaterThanOrEqual(10);
  for (const p of parts) {
    expect(p.fps, `fps in part ${p.x}`).toBeGreaterThanOrEqual(BAR);
    expect(p.steps, `physics steps a second in part ${p.x}`).toBeGreaterThan(55);
  }
});
