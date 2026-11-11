/**
 * M2 frame rate: Go-Slow Hall by touch at 4x CPU slowdown on the phone profile (docs/design.md
 * S2.7). The bot waits a few seconds under each light so every phase has its throws on screen
 * (tyres, low honks, high honks), then wins, and the kind finish plays (doors, lamps, cones,
 * arrows). Pass: at least 45 fps in every part (each phase and the finish) at about 60 physics
 * steps a second. Same method as street-perf.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { HALL_URL, playHall, touchPad, waitForWin } from './hall-play';
import { PAST_DOUBLE_TAP_MS, startRun, gentleOn, storySeen } from './helpers';

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

const PARTS = ['phase 1 (tyres)', 'phase 2 (tyres, low honks)', 'phase 3 (tyres, low and high honks)', 'the kind finish'] as const;

test('slowed 4x CPU: Go-Slow Hall by touch, every phase with its throws and the kind finish, at least 45 fps in every part', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(HALL_URL);
  // Gentle mode, so a missed hop on a slow machine does not end the measurement early.
  await gentleOn(page); // slice 3: Gentle mode is in Settings
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const dpr = await page.evaluate(() => devicePixelRatio);
  const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);

  // Every frame: its time, the part (hits so far, 3 once beaten), the step count, throws on screen.
  await page.evaluate(() => {
    const log: [number, number, number, number][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const f = (now: number): void => {
      const g = window.__game!;
      const b = g.boss;
      if (g.screen === 'play' && b) log.push([now, b.defeated ? 3 : b.hits, g.steps, b.throws.length]);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });

  const cdp = await page.context().newCDPSession(page);
  const work1 = await busy(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let work4 = 0;
  try {
    work4 = await busy(page);
    await playHall(page, await touchPad(page, cdp), { dwell: [4, 5, 6] });
    await waitForWin(page);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number, number, number][] }).__frames);

  const parts = PARTS.map((name, k) => {
    let n = 0;
    let ms = 0;
    let steps = 0;
    let throws = 0;
    for (let i = 1; i < frames.length; i++) {
      const [t, part, s, th] = frames[i]!;
      const [t0, , s0] = frames[i - 1]!;
      if (part !== k || t - t0 > 1000) continue;
      n++;
      ms += t - t0;
      steps += s - s0;
      throws = Math.max(throws, th);
    }
    return { name, fps: ms > 0 ? (n * 1000) / ms : 0, steps: ms > 0 ? (steps * 1000) / ms : 0, secs: ms / 1000, throws };
  });
  const worst = Math.min(...parts.map((p) => p.fps));
  const report = parts.map((p) => `${p.name}: ${p.fps.toFixed(1)} fps over ${p.secs.toFixed(1)} s, up to ${p.throws} throws${p.fps < BAR ? ' (UNDER)' : ''}`).join('; ');
  console.log(
    `4x CPU, Go-Slow Hall by touch (dpr ${dpr}, canvas ${canvas}), bar ${BAR}: ${report}. Worst ${worst.toFixed(1)}. ` +
      `Steps/s worst part ${Math.min(...parts.map((p) => p.steps)).toFixed(1)}. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`,
  );
  test.info().annotations.push({ type: 'hall fps 4x', description: `worst ${worst.toFixed(1)} | ${report}` });

  expect(errors).toEqual([]);
  expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
  for (const p of parts) {
    expect(p.secs, `${p.name} was measured`).toBeGreaterThan(2.5);
    expect(p.fps, `fps in ${p.name}`).toBeGreaterThanOrEqual(BAR);
    expect(p.steps, `physics steps a second in ${p.name}`).toBeGreaterThan(55);
  }
  // Each fight phase had throws on screen while it was measured.
  for (const p of parts.slice(0, 3)) expect(p.throws, `throws in ${p.name}`).toBeGreaterThan(0);
});
