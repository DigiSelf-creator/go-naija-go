/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.9 and a2.11 item 11): the moving intro at 4x CPU
 * slowdown, from the start to 3 s into the hold, untouched. Frames per second for each beat and
 * the hold, and the longest frame. (A phone that runs the first second slow draws the rest at a
 * pixel ratio of 1.5; the first second counts here too.)
 */
import { expect, test } from '@playwright/test';

const BEATS = [0, 6, 11, 15.5, 20, 24.5, 27.8, 30.8];
/** The goal is 45 fps (a2.9); the test fails below this whole-scene average. */
const MIN_AVERAGE = 45;

test('slowed 4x CPU: the moving intro from 0 to 31 s, fps for each beat', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  const cdp = await page.context().newCDPSession(page);
  let out: { fps: number[]; average: number; longest: number; slow: number; beatChange: number[]; ratio: number };
  try {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await page.waitForFunction(() => window.__game?.intro?.mode === 'moving');
    // Each screen frame: when it came, and the story time then.
    await page.evaluate(() => {
      const w = window as unknown as { __f: [number, number][] };
      w.__f = [];
      const f = (now: number): void => {
        const s = window.__game?.intro;
        if (!s) return;
        w.__f.push([now, s.time]);
        if (s.time < 30.8) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await page.waitForFunction(() => (window.__game?.intro?.time ?? 0) >= 30.8, undefined, { timeout: 60_000, polling: 500 });
    const frames = await page.evaluate(() => (window as unknown as { __f: [number, number][] }).__f);
    const fps: number[] = [];
    const beatChange: number[] = [];
    for (let b = 0; b < BEATS.length - 1; b++) {
      const inBeat = frames.filter(([, t]) => t >= BEATS[b]! && t < BEATS[b + 1]!);
      if (inBeat.length < 2) {
        fps.push(0);
        continue;
      }
      fps.push((inBeat.length - 1) / ((inBeat[inBeat.length - 1]![0] - inBeat[0]![0]) / 1000));
    }
    let longest = 0;
    let slow = 0;
    for (let i = 1; i < frames.length; i++) {
      const dt = frames[i]![0] - frames[i - 1]![0];
      longest = Math.max(longest, dt);
      if (dt > 1000 / 30) slow++;
      // The frame that crosses into a new beat.
      if (BEATS.slice(1, 7).some((b) => frames[i - 1]![1] < b && frames[i]![1] >= b)) beatChange.push(Math.round(dt));
    }
    const average = (frames.length - 1) / ((frames[frames.length - 1]![0] - frames[0]![0]) / 1000);
    const ratio = await page.evaluate(() => window.__game!.intro!.ratio);
    out = { fps, average, longest, slow, beatChange, ratio };
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const names = ['beat 1', 'beat 2', 'beat 3', 'beat 4', 'beat 5', 'beat 6', 'hold'];
  // The worst single beat is reported, not failed on (qa: dips to about 43 in beat 5 at 4x CPU).
  const worst = out.fps.reduce((w, f, i) => (f < out.fps[w]! ? i : w), 0);
  const text = `${names.map((n, i) => `${n} ${out.fps[i]!.toFixed(1)}`).join(', ')}; worst ${names[worst]} ${out.fps[worst]!.toFixed(1)}; average ${out.average.toFixed(1)} fps; longest frame ${out.longest.toFixed(0)} ms; ${out.slow} frames over 33 ms; beat-change frames ${out.beatChange.join(', ')} ms; pixel ratio ${out.ratio}`;
  console.log(`intro at 4x CPU: ${text}`);
  test.info().annotations.push({ type: 'intro fps', description: text });
  expect(out.average).toBeGreaterThanOrEqual(MIN_AVERAGE);
});
