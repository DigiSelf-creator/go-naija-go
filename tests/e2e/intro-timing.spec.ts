/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.11 items 1, 9 and 12), in real time: with no
 * taps "Let's go" shows 26 to 30 s after the start, each beat starts within 0.5 s of a2.2, every
 * a2.6 cue plays once in order, and 3 s into the hold nothing more is drawn.
 */
import { expect, test } from '@playwright/test';

const BEATS = [0, 6, 11, 15.5, 20, 24.5, 27.8];

test('the moving intro, untouched: "Let\'s go" at 26 to 30 s, beats on time, every cue once, then no drawing', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./');
  // Watch every screen frame from the tap on: when the story starts, each beat, and "Let's go".
  await page.evaluate(() => {
    const w = window as unknown as { __rec: { tap: number; start: number; beats: number[]; go: number } };
    w.__rec = { tap: performance.now(), start: -1, beats: [], go: -1 };
    const f = (now: number): void => {
      const r = w.__rec;
      const s = window.__game?.intro;
      if (s && s.mode === 'moving') {
        if (r.start < 0) r.start = now;
        while (r.beats.length <= s.beat) r.beats.push(now);
        const go = document.querySelector('.intro-go');
        if (r.go < 0 && go instanceof HTMLElement && !go.hidden) r.go = now;
      }
      if (r.go < 0) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(page.getByRole('button', { name: "Let's go" })).toBeVisible({ timeout: 40_000 });
  const rec = await page.evaluate(() => (window as unknown as { __rec: { tap: number; start: number; beats: number[]; go: number } }).__rec);
  const length = (rec.go - rec.tap) / 1000;
  const starts = rec.beats.map((b) => (b - rec.start) / 1000);
  console.log(`intro length ${length.toFixed(2)} s; beat starts ${starts.map((s) => s.toFixed(2)).join(', ')}; loaded after ${((rec.start - rec.tap) / 1000).toFixed(2)} s`);
  expect(length).toBeGreaterThanOrEqual(26);
  expect(length).toBeLessThanOrEqual(30);
  expect(starts).toHaveLength(7);
  starts.forEach((s, i) => expect(Math.abs(s - BEATS[i]!), `beat ${i + 1}`).toBeLessThanOrEqual(0.5));
  const now = (await page.evaluate(() => window.__game!.intro!))!;
  expect(now.played).toEqual([
    '0 start 0.6',
    '4 level 1',
    '4 cogBell',
    '7 built',
    '8.6 honk',
    '13 cogRatchet',
    '14.4 cogBell',
    '16 level 0.5',
    '16 honk',
    '16.7 roomThump',
    '17.4 lightClunk',
    '18.1 parcel',
    '19.2 level 0',
    '19.2 crateHit',
    '20.2 strongStep',
    '20.7 strongStep',
    '21.2 strongStep',
    '22.3 restart 1',
    '22.3 bounce',
    '25.4 skid',
    '26 busBoard',
    '27.2 level 0.5',
    '27.2 sting',
  ]);
  // 3 s into the hold the picture stops being drawn.
  await expect.poll(async () => (await page.evaluate(() => window.__game!.intro!)).time, { timeout: 6000 }).toBeGreaterThanOrEqual(30.8);
  const d0 = (await page.evaluate(() => window.__game!.intro!)).draws;
  await page.waitForTimeout(1000);
  expect((await page.evaluate(() => window.__game!.intro!)).draws).toBe(d0);
  expect(await page.evaluate(() => window.__game!.screen)).toBe('intro');
  console.log(`intro pixel ratio cap at full speed: ${(await page.evaluate(() => window.__game!.intro!)).ratio}`);
});
