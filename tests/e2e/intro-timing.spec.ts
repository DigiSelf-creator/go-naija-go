/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.11 items 1, 9 and 12, as changed by a2.12), in
 * real time: with no taps "Let's go" shows 43 to 45 s after the start, each beat starts within
 * 0.5 s of a2.12 point 4, every cue plays once in order, and 3 s into the hold nothing more is
 * drawn.
 */
import { expect, test } from '@playwright/test';

const BEATS = [0, 11, 19.6, 25.4, 31.6, 39, 44];

test('the moving intro, untouched: "Let\'s go" at 43 to 45 s, beats on time, every cue once, then no drawing', async ({ page }) => {
  test.setTimeout(120_000);
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
  await expect(page.getByRole('button', { name: "Let's go" })).toBeVisible({ timeout: 60_000 });
  const rec = await page.evaluate(() => (window as unknown as { __rec: { tap: number; start: number; beats: number[]; go: number } }).__rec);
  const length = (rec.go - rec.tap) / 1000;
  const starts = rec.beats.map((b) => (b - rec.start) / 1000);
  console.log(`intro length ${length.toFixed(2)} s; beat starts ${starts.map((s) => s.toFixed(2)).join(', ')}; loaded after ${((rec.start - rec.tap) / 1000).toFixed(2)} s`);
  expect(length).toBeGreaterThanOrEqual(43);
  expect(length).toBeLessThanOrEqual(45);
  expect(starts).toHaveLength(7);
  starts.forEach((s, i) => expect(Math.abs(s - BEATS[i]!), `beat ${i + 1}`).toBeLessThanOrEqual(0.5));
  const now = (await page.evaluate(() => window.__game!.intro!))!;
  expect(now.played).toEqual([
    '0 start 0.6',
    '6.5 level 1',
    '6.5 cogBell',
    '12.2 built',
    '14.6 honk',
    '21.8 cogRatchet',
    '23.4 cogBell',
    '26 level 0.5',
    '26 honk',
    '26.9 roomThump',
    '27.8 lightClunk',
    '28.7 parcel',
    '30.2 level 0',
    '30.2 crateHit',
    '31.8 strongStep',
    '32.4 strongStep',
    '33 strongStep',
    '34.6 restart 1',
    '34.6 bounce',
    '40 skid',
    '40.6 busBoard',
    // The sting comes with "Let's go"
    '44 level 0.5',
    '44 sting',
  ]);
  // 3 s into the hold the picture stops being drawn.
  await expect.poll(async () => (await page.evaluate(() => window.__game!.intro!)).time, { timeout: 6000 }).toBeGreaterThanOrEqual(47);
  const d0 = (await page.evaluate(() => window.__game!.intro!)).draws;
  await page.waitForTimeout(1000);
  expect((await page.evaluate(() => window.__game!.intro!)).draws).toBe(d0);
  expect(await page.evaluate(() => window.__game!.screen)).toBe('intro');
  console.log(`intro pixel ratio cap at full speed: ${(await page.evaluate(() => window.__game!.intro!)).ratio}`);
});
