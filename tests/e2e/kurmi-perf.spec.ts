/**
 * K2b (docs/kano.md 9.1): Kurmi's frame rate at 4x CPU slowdown on the phone profile, beside Ota
 * (Ogun street 1) measured the same way in the same file. Played by hand with two thumbs from the
 * start to the bus (Gentle mode, so a missed jump on a slow machine does not end the measurement),
 * with Kurmi's own backdrop and dust streaks, the gate, the wind signs and streamers, its traders
 * and people. Pass: at least 45 fps in every 1000 u part, about 60 physics steps a second, and
 * Kurmi's first street frame no more than 30 ms later than Lagos's (kano.md 9.1).
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, gentleOn, startRun } from './helpers';

const BAR = 45;

const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

const STREETS = [
  { id: 'ogun-1', name: 'Ota', url: './?level=ogun-1' },
  { id: 'kano-1', name: 'Kurmi', url: './?level=kano-1' },
] as const;

for (const { id, name, url } of STREETS) {
  test(`slowed 4x CPU: ${name} by hand, start to bus, at least 45 fps in every part`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await gentleOn(page);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.steps), { timeout: 20_000 }).toBeGreaterThan(5);
    expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
    expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
    const dpr = await page.evaluate(() => devicePixelRatio);
    const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);

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
    const people = await page.evaluate(() => window.__game!.people?.ms ?? null);
    console.log(
      `4x CPU, ${name} by hand (dpr ${dpr}, canvas ${canvas}), fps by part (bar ${BAR}): ${report}. Worst ${worst.toFixed(1)}, overall ${total.toFixed(1)}. ` +
        `Steps/s worst part ${Math.min(...parts.map((p) => p.steps)).toFixed(1)}. People ms ${people ? `avg ${people.avg.toFixed(2)}, max ${people.max.toFixed(2)}` : 'off'}. ` +
        `Reached ${last?.r.phase} at x ${last?.h.x.toFixed(0)}. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`,
    );
    test.info().annotations.push({ type: `${name} fps 4x`, description: `worst ${worst.toFixed(1)}, overall ${total.toFixed(1)} | ${report}` });

    expect(errors).toEqual([]);
    expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
    expect(['bus', 'cleared']).toContain(last?.r.phase);
    expect(parts.length).toBeGreaterThanOrEqual(10);
    for (const p of parts) {
      expect(p.fps, `fps in part ${p.x}`).toBeGreaterThanOrEqual(BAR);
      expect(p.steps, `physics steps a second in part ${p.x}`).toBeGreaterThan(55);
    }
  });
}

/** kano.md 9.1: Kurmi's first street frame no more than 30 ms later than a Lagos street's, at 4x CPU. */
test('slowed 4x CPU: Kurmi\'s first frames cost no more than 30 ms more than Lagos street 1\'s', async ({ page }) => {
  test.setTimeout(180_000);
  const firstFrames = async (url: string): Promise<number> => {
    await page.goto(url);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.steps), { timeout: 20_000 }).toBeGreaterThan(5);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    try {
      // The slowest of the first 30 frames after the run starts again from the top ("Start again").
      return await page.evaluate(
        () =>
          new Promise<number>((done) => {
            const gaps: number[] = [];
            let t0 = performance.now();
            const f = (now: number): void => {
              gaps.push(now - t0);
              t0 = now;
              if (gaps.length < 31) requestAnimationFrame(f);
              else done(Math.max(...gaps.slice(1)));
            };
            requestAnimationFrame(f);
          }),
      );
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  };
  const lagos = await firstFrames('./?level=lagos-1');
  const kurmi = await firstFrames('./?level=kano-1');
  console.log(`4x CPU, slowest of the first 30 frames: Lagos street 1 ${lagos.toFixed(1)} ms, Kurmi ${kurmi.toFixed(1)} ms`);
  expect(kurmi - lagos).toBeLessThanOrEqual(30);
});
