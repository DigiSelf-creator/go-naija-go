/**
 * qa (A6): frame rate on a slowed-down CPU, phone profile (Pixel 5 sideways, pixel ratio capped at 2).
 * Pass: at least 30 frames a second at 4x slowdown. 6x is measured and reported.
 * The game keeps hopping the whole time, so physics and drawing both run.
 */
import { expect, test, type Page } from '@playwright/test';
import { startRun } from './helpers';

interface Sample {
  fps: number;
  /** Fixed physics steps per second (60 means the game runs at full speed). */
  stepsPerSec: number;
  /** Slowest frame, ms. */
  worstMs: number;
  /** 95th percentile frame time, ms. */
  p95Ms: number;
}

async function measure(page: Page, ms = 3000): Promise<Sample> {
  return page.evaluate(
    (dur) =>
      new Promise<Sample>((done) => {
        const times: number[] = [];
        const s0 = window.__game!.steps;
        let t0 = 0;
        let last = 0;
        const f = (now: number): void => {
          if (t0 === 0) {
            t0 = now;
            last = now;
          } else {
            times.push(now - last);
            last = now;
          }
          if (now - t0 < dur) requestAnimationFrame(f);
          else {
            const total = now - t0;
            const sorted = [...times].sort((a, b) => a - b);
            done({
              fps: (times.length * 1000) / total,
              stepsPerSec: ((window.__game!.steps - s0) * 1000) / total,
              worstMs: sorted[sorted.length - 1] ?? 0,
              p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
            });
          }
        };
        requestAnimationFrame(f);
      }),
    ms,
  );
}

test('frame rate on a slowed-down CPU (phone profile)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);
  const dpr = await page.evaluate(() => devicePixelRatio);
  const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);

  // Keep the hero jumping during every measurement.
  const hopper = setInterval(() => void page.touchscreen.tap(500, 150).catch(() => {}), 400);
  const cdp = await page.context().newCDPSession(page);
  const results: Record<string, Sample> = {};
  const work: Record<string, number> = {};
  // The same fixed piece of work, timed, proves the slowdown is really on.
  const busy = () =>
    page.evaluate(() => {
      const t = performance.now();
      let x = 0;
      for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
      return performance.now() - t + (x < 0 ? 1 : 0);
    });
  try {
    for (const rate of [1, 4, 6]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.waitForTimeout(500); // settle
      results[`${rate}x`] = await measure(page);
      work[`${rate}x`] = await busy();
    }
  } finally {
    clearInterval(hopper);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }

  const line = Object.entries(results)
    .map(
      ([k, r]) =>
        `${k}: ${r.fps.toFixed(1)} fps, ${r.stepsPerSec.toFixed(1)} steps/s, p95 ${r.p95Ms.toFixed(1)} ms, worst ${r.worstMs.toFixed(1)} ms`,
    )
    .join(' | ');
  const workLine = Object.entries(work)
    .map(([k, v]) => `${k} ${v.toFixed(0)} ms`)
    .join(', ');
  console.log(`slow CPU (dpr ${dpr}, canvas ${canvas}): ${line}. Fixed work took: ${workLine}`);
  test.info().annotations.push({ type: 'fps', description: line });

  expect(work['4x']!).toBeGreaterThan(work['1x']! * 2.5);
  expect(work['6x']!).toBeGreaterThan(work['4x']!);
  expect(results['4x']!.fps).toBeGreaterThanOrEqual(30);
  // The game itself keeps full speed (60 physics steps a second) at 4x.
  expect(results['4x']!.stepsPerSec).toBeGreaterThan(55);
});
