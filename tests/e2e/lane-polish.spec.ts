/**
 * Round 4, the lane run's not-done items (docs/design.md S3f0) and po's polish note: pickups fly
 * to their chips (part 9; reduced motion: the chip counts up with a short "+1"), the lamp dots
 * from 400 px wide (part 15), the "+5 m" in its own chip, the first run's look back (part 14) and
 * the corn tune's 5, 4, 3, 2, 1 count (part 11).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };
/** A lane run already played once: no look back. */
const PLAYED = { best: 0, goals: 0, runs: 1, hints: [] as string[] };

/** A saved hero and city (and lane part, or none: the first lane run), then the lane run. */
async function open(page: Page, lanePart: object | null): Promise<void> {
  await page.goto('./?level=lagos-lane');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: CITY, ...(lanePart ? { lane: lanePart } : {}) }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const hook = (page: Page) => page.evaluate(() => (window.__lane ? { ...window.__lane } : null));
async function playing(page: Page): Promise<void> {
  await expect.poll(async () => (await hook(page))?.stage, { timeout: 15_000 }).toBe('play');
}

test('the first lane run looks back: both lines, about 2 s, then "3, 2, 1"; the next run does not', async ({ page }) => {
  await open(page, null);
  await expect.poll(async () => (await hook(page))?.stage, { timeout: 15_000 }).toBe('intro');
  await expect.poll(async () => (await hook(page))!.hint).toBe('The Blackout is switching off the lamps.');
  await expect.poll(async () => (await hook(page))!.hint, { timeout: 3000 }).toBe('Run to the bus stop!');
  // Nothing moves and no buttons while it plays.
  expect((await hook(page))!.dist).toBe(0);
  // Then "3, 2, 1" (each number shows 0.6 s, so look for the stage, not one number).
  await expect.poll(async () => (await hook(page))!.stage, { timeout: 5000 }).toMatch(/^(count|play)$/);
  await playing(page);
  expect((await hook(page))!.hint).not.toMatch(/Blackout is switching|Run to the bus stop/);
  // Run again (Pause, Start again): no look back.
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Start again' }).tap();
  await expect.poll(async () => (await hook(page))!.count).toBe('3');
  expect((await hook(page))!.stage).toBe('count');
});

test('a tap skips the look back to "3, 2, 1"', async ({ page }) => {
  await open(page, null);
  await expect.poll(async () => (await hook(page))?.stage, { timeout: 15_000 }).toBe('intro');
  await page.touchscreen.tap(400, 300);
  await expect.poll(async () => (await hook(page))!.stage).toBe('count');
  expect((await hook(page))!.count).toBe('3');
  // Skipping counts as seen: the next start has none.
  await playing(page);
});

test('reduced motion: the look back is one still picture with both lines', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, null);
  await expect.poll(async () => (await hook(page))?.stage, { timeout: 15_000 }).toBe('intro');
  await expect.poll(async () => (await hook(page))!.hint).toBe('The Blackout is switching off the lamps. Run to the bus stop!');
  await page.waitForTimeout(1200);
  const l = (await hook(page))!;
  if (l.stage === 'intro') expect(l.hint).toBe('The Blackout is switching off the lamps. Run to the bus stop!');
  await playing(page);
});

test('the lamp dots from 400 px wide, going dark as the Blackout closes; none under 400', async ({ page }) => {
  await open(page, PLAYED);
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(40));
  await expect.poll(async () => (await hook(page))!.dots).toEqual({ lit: 4, shown: true });
  await expect(page.locator('.lane-dot')).toHaveCount(6);
  await expect(page.locator('.lane-dots')).toBeVisible();
  await page.evaluate(() => window.__lane!.setGap(12));
  await expect.poll(async () => (await hook(page))!.dots.lit).toBe(2);
  await page.setViewportSize({ width: 399, height: 240 });
  await expect.poll(async () => (await hook(page))!.dots.shown).toBe(false);
  await expect(page.locator('.lane-dots')).toBeHidden();
  // The words carry it.
  expect((await hook(page))!.blackout).toMatch(/^Blackout: \d+ m behind!/);
});

test('po note: "+5 m" is its own chip, apart from the Blackout words, for 1 s', async ({ page }) => {
  for (const [w, h] of [
    [851, 393],
    [320, 240],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await open(page, PLAYED);
    await playing(page);
    await page.evaluate(() => {
      window.__lane!.setGap(17);
      window.__lane!.warp(140);
    });
    // Read in one go while it shows (it lasts 1 s; the float's first frames start a little low).
    const read = () =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLElement>('.lane-change')!;
        if (c.hidden || c.textContent !== '+5 m') return null;
        const a = document.querySelector('.lane-dark')!.getBoundingClientRect();
        const b = c.getBoundingClientRect();
        return { words: document.querySelector('.lane-dark')!.textContent ?? '', apart: b.left >= a.right + 2 || b.top >= a.bottom + 2 };
      });
    let seen: Awaited<ReturnType<typeof read>> = null;
    await expect
      .poll(
        async () => {
          seen = await read();
          return seen !== null;
        },
        { timeout: 5000, intervals: [50] },
      )
      .toBe(true);
    const got = seen as unknown as { words: string; apart: boolean };
    expect(got.words).toMatch(/^Blackout: \d+ m behind$/);
    expect(got.apart, `the change chip sits apart from the words at ${w} x ${h}`).toBe(true);
    // Gone after about 1 s.
    await expect.poll(async () => (await hook(page))!.change, { timeout: 3000 }).toBe('');
  }
});

test('pop to chip: a bulb flies to its chip, which counts up when it lands', async ({ page }) => {
  await open(page, PLAYED);
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(140);
  });
  await expect.poll(async () => (await hook(page))!.haul.power, { timeout: 5000 }).toBe(1);
  // The bucket has it at once (LR-Q1); the flyer lands within about half a second.
  await expect.poll(async () => (await hook(page))!.chips[1], { timeout: 3000 }).toBe('Power 1');
  expect((await hook(page))!.plus).toEqual(['', '', '']);
  await expect.poll(async () => (await hook(page))!.flying).toBe(0);
});

test('reduced motion: nothing flies; the chip counts up at once with a short "+1"', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, PLAYED);
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(140);
  });
  // Read in one go: the "+1" shows for 0.8 s only.
  const read = () =>
    page.evaluate(() => {
      const l = window.__lane!;
      const el = document.querySelector<HTMLElement>('.lane-chip.power .lane-plus')!;
      return { power: l.haul.power, chip: l.chips[1], flying: l.flying, plus: l.plus[1], shown: !el.hidden && el.getBoundingClientRect().height > 0 };
    });
  await expect.poll(async () => (await read()).power, { timeout: 5000, intervals: [50] }).toBe(1);
  const l = await read();
  expect(l.chip).toBe('Power 1');
  expect(l.flying).toBe(0);
  expect(l.plus).toBe('+1');
  expect(l.shown).toBe(true);
  await expect.poll(async () => (await hook(page))!.plus[1], { timeout: 3000 }).toBe('');
});

test('corn: the 5, 4, 3, 2, 1 count in the hint bar\'s place, then "Corn is done"', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, PLAYED);
  await playing(page);
  // The roasted corn is in the middle lane at 418 m; the hero runs in the middle.
  await page.evaluate(() => {
    window.__lane!.setGap(1e6);
    window.__lane!.warp(410);
  });
  await expect.poll(async () => (await hook(page))!.corn, { timeout: 5000 }).toBeGreaterThan(0);
  expect((await hook(page))!.cornCount).toBe(0);
  await expect.poll(async () => (await hook(page))!.cornCount, { timeout: 15_000 }).toBe(5);
  const g = await page.evaluate(() => window.__game!.corn);
  expect(g.count).toBe(5);
  expect(g.spoken).toBe('Corn ends in 5 seconds');
  // In the hint bar's place: under row 2, and the hint bar itself hides meanwhile.
  const row2 = (await page.locator('.lane-row2').boundingBox())!;
  expect(g.countBox!.y).toBeGreaterThanOrEqual(row2.y + row2.height);
  expect((await hook(page))!.hint).toBe('');
  await expect.poll(async () => (await hook(page))!.cornCount, { timeout: 4000 }).toBe(3);
  await expect.poll(async () => (await hook(page))!.cornCount, { timeout: 6000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__game!.corn.spoken)).toBe('Corn is done');
});
