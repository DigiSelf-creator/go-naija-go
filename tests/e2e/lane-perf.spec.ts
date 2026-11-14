/**
 * S3f2 frame rate (docs/design.md S3f0 part 21): the lane run on the phone profile, played by a
 * small bot that reads the road and presses the keys a player would. Two parts: the fixed road
 * (from 100 m, at 10 to 13 m/s) and the endless part at the top speed (16 m/s, warped to 1,700 m
 * after "Keep running for more"). Pass: 60 fps at 1x (55 or more, a busy test computer aside) and
 * at least 45 fps at 4x CPU slowdown, at about 60 physics steps a second. Same method as
 * hall-perf.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, startRun, storySeen } from './helpers';

test.beforeEach(({ page }) => storySeen(page));

const BAR_4X = 45;
const BAR_1X = 55;

const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

/** The bot and the frame log: every frame its time, the step count and the part ('road', 'endless'). */
async function startBotAndLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log: [number, number, string, number][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const key = (code: string): void => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    };
    let lastMove = 0;
    const f = (now: number): void => {
      const l = window.__lane;
      if (l && l.stage === 'play') {
        const w = window as unknown as { __settled?: boolean };
        log.push([now, l.steps, !w.__settled ? 'settle' : l.phase === 'endless' ? 'endless' : 'road', l.things.length]);
        const ahead = l.things.filter((t) => !t.pickup && t.state === 'idle' && t.d > l.dist && t.d - l.dist < 1.1 * l.speed);
        const inLane = (n: number) => ahead.filter((t) => t.lane === n).sort((a, b) => a.d - b.d)[0];
        const mine = inLane(l.lane);
        if (mine && now - lastMove > 200) {
          const dt = (mine.d - l.dist) / l.speed;
          if (mine.kind === 'danfo') {
            const to = [l.lane - 1, l.lane + 1, l.lane - 2, l.lane + 2].find((n) => n >= 0 && n <= 2 && inLane(n)?.kind !== 'danfo');
            if (to !== undefined) {
              key(to < l.lane ? 'ArrowLeft' : 'ArrowRight');
              lastMove = now;
            }
          } else if ((mine.kind === 'cones' || mine.kind === 'pothole') && dt < 0.36 && !l.jumping) {
            key('ArrowUp');
            lastMove = now;
          } else if (mine.kind === 'barrier' && dt < 0.3 && !l.sliding) {
            key('ArrowDown');
            lastMove = now;
          }
        }
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}

async function play(page: Page, secs: number): Promise<void> {
  // The road part: from 100 m for `secs` seconds (never reaching the bus stop at these speeds).
  // The bot dodges, but a slow machine may still stumble: keep the Blackout away while measuring.
  await page.evaluate(() => {
    window.__lane!.warp(100);
    window.__lane!.setGap(1e6);
  });
  // A slow phone settles its pixel count in the first seconds (part 21); measure after that.
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    (window as unknown as { __settled?: boolean }).__settled = true;
  });
  await page.waitForTimeout(secs * 1000);
  // The endless part at the top speed.
  await page.evaluate(() => {
    window.__lane!.setGap(60);
    window.__lane!.warp(592);
  });
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await goal.getByRole('button', { name: 'Keep running for more' }).click();
  await expect.poll(() => page.evaluate(() => window.__lane!.stage), { timeout: 20_000 }).toBe('play');
  await page.evaluate(() => {
    window.__lane!.warp(1700);
    window.__lane!.setGap(1e6);
  });
  await page.waitForTimeout(secs * 1000);
}

function measure(frames: [number, number, string, number][]) {
  return ['road', 'endless'].map((name) => {
    let n = 0;
    let ms = 0;
    let steps = 0;
    let things = 0;
    for (let i = 1; i < frames.length; i++) {
      const [t, s, part, th] = frames[i]!;
      const [t0, s0, part0] = frames[i - 1]!;
      if (part !== name || part0 !== name || t - t0 > 1000) continue;
      n++;
      ms += t - t0;
      steps += s - s0;
      things = Math.max(things, th);
    }
    return { name, fps: ms > 0 ? (n * 1000) / ms : 0, steps: ms > 0 ? (steps * 1000) / ms : 0, secs: ms / 1000, things };
  });
}

for (const rate of [1, 4] as const) {
  test(`slowed ${rate}x CPU: the lane run, the road and the endless part at top speed, ${rate === 4 ? 'at least 45' : 'about 60'} fps`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./?level=lagos-lane');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__lane?.stage)).toBe('play');
    const dpr = await page.evaluate(() => devicePixelRatio);
    const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);
    await startBotAndLog(page);
    const cdp = await page.context().newCDPSession(page);
    const work1 = await busy(page);
    let work = work1;
    if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    try {
      if (rate > 1) work = await busy(page);
      await play(page, 8);
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number, string, number][] }).__frames);
    const parts = measure(frames);
    const tally = await page.evaluate(() => window.__lane!.tally);
    const pixels = await page.evaluate(() => window.__lane!.pixels);
    const bar = rate === 4 ? BAR_4X : BAR_1X;
    const report = parts.map((p) => `${p.name}: ${p.fps.toFixed(1)} fps over ${p.secs.toFixed(1)} s, ${p.steps.toFixed(1)} steps/s, up to ${p.things} things${p.fps < bar ? ' (UNDER)' : ''}`).join('; ');
    console.log(`${rate}x CPU, lane run (dpr ${dpr}, canvas ${canvas} at the start, ${pixels} canvas px per CSS px after settling), bar ${bar}: ${report}. Stumbles ${tally['stumbles']}. Fixed work 1x ${work1.toFixed(0)} ms, now ${work.toFixed(0)} ms`);
    test.info().annotations.push({ type: `lane fps ${rate}x`, description: report });
    expect(errors).toEqual([]);
    if (rate > 1) expect(work, 'the slowdown is on').toBeGreaterThan(work1 * 2.5);
    for (const p of parts) {
      expect(p.secs, `${p.name} was measured`).toBeGreaterThan(5);
      expect(p.fps, `fps in ${p.name}`).toBeGreaterThanOrEqual(bar);
      expect(p.steps, `physics steps a second in ${p.name}`).toBeGreaterThan(55);
      expect(p.things, `things on the road in ${p.name}`).toBeGreaterThan(3);
    }
  });
}
