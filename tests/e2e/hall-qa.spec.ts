/**
 * qa E5 / F3 / F4, moved to Go-Slow Hall by piece M2 (docs/design.md S2.7, S2.10, S2.11): the
 * hall fight and the Win screen broken on purpose, by touch on the phone profile, plus the
 * pictures for the M2 report. Screenshots go to $QA_SHOTS (default test-results/qa-shots) and
 * $M2_SHOTS (default test-results/m2-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { HALL_URL, hallSnap, playHall, touchPad, waitForWin } from './hall-play';
import { PAST_DOUBLE_TAP_MS, startRun } from './helpers';

const SHOTS = process.env['QA_SHOTS'] ?? 'test-results/qa-shots';
const M2 = process.env['M2_SHOTS'] ?? 'test-results/m2-shots';
mkdirSync(SHOTS, { recursive: true });
mkdirSync(M2, { recursive: true });
const shot = (page: Page, name: string, dir = SHOTS) => page.screenshot({ path: join(dir, `${name}.png`) });

const PHONE = { width: 727, height: 393 }; // Playwright's Pixel 5, sideways
const WIN = 'Lagos is switched on!';

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function toHall(page: Page, gentle = false): Promise<void> {
  await page.goto(HALL_URL);
  if (gentle) {
    await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  }
  await startRun(page);
  await expect.poll(async () => (await hallSnap(page)).steps).toBeGreaterThan(5);
}

/** Nothing in the fight moves for `ms`. */
async function expectFrozen(page: Page, ms: number): Promise<void> {
  const a = await hallSnap(page);
  await page.waitForTimeout(ms);
  const b = await hallSnap(page);
  expect(b.steps).toBe(a.steps);
  expect(b.b).toEqual(a.b);
  expect(b.h).toEqual(a.h);
  expect(b.r.time).toBe(a.r.time);
}

async function keepPlaying(page: Page): Promise<void> {
  const dlg = page.getByRole('dialog', { name: 'Paused' });
  await expect(dlg).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await dlg.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(dlg).toBeHidden();
  const s0 = (await hallSnap(page)).steps;
  await expect.poll(async () => (await hallSnap(page)).steps).toBeGreaterThan(s0 + 10);
}

/** The whole hall is on screen: the camera shows x 0 to 560 or more. */
async function wholeHall(page: Page): Promise<boolean> {
  const c = await page.evaluate(() => ({ x: window.__game!.camX, w: window.__game!.viewW }));
  return c.x <= 0.5 && c.x + c.w >= 559.5;
}

test('M2 pictures: the fight start, a high honk, a hit, the kind finish and the Win screen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await toHall(page, true);
  await page.waitForTimeout(400);
  await shot(page, 'm2-1-fight-start', M2);
  const pad = await touchPad(page);
  // Light 1, then wait under light 3 until a high honk is well inside the hall.
  let hitShot = false;
  await playHall(page, pad, {
    dwell: [0, 0, 30],
    until: (s) => s.b!.hits === 2 && s.b!.throws.some((t) => t.kind === 'highHonk' && t.x < 380 && t.x > 200),
    onPoll: async (s) => {
      if (!hitShot && s.b!.mode === 'hit' && s.b!.modeTime > 0.3) {
        hitShot = true;
        await shot(page, 'm2-3-hit', M2);
      }
    },
  });
  const peep = await hallSnap(page);
  expect(peep.b!.throws.some((t) => t.kind === 'highHonk')).toBe(true);
  await shot(page, 'm2-2-high-honk', M2);
  expect(hitShot).toBe(true);
  // Finish the fight, then the finish at about 3.6 s (doors open, lamps coming on, cones sliding).
  await playHall(page, await touchPad(page));
  await expect.poll(async () => (await hallSnap(page)).b?.modeTime ?? 0, { intervals: [16], timeout: 6000 }).toBeGreaterThan(3.6);
  await shot(page, 'm2-4-finish', M2);
  await expect.poll(async () => (await hallSnap(page)).b?.modeTime ?? 0, { intervals: [16], timeout: 6000 }).toBeGreaterThan(4.7);
  await shot(page, 'm2-5-switched-on', M2);
  await waitForWin(page);
  await page.waitForTimeout(300);
  await shot(page, 'm2-6-win-screen', M2);
  expect(errors).toEqual([]);
});

test('E5 break it in the hall: pause and turn the phone mid-fight, tiny and huge screens, taps during the finish, a storm of taps on the win screen, Play again resets fully', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  let late: string[] | null = null;
  page.context().on('request', (r) => late?.push(`${r.method()} ${r.url()}`));
  await toHall(page);
  late = [];
  expect(await wholeHall(page)).toBe(true);
  await shot(page, 'e5-hall-start');

  // Light 1, then pause while light 2 is lit.
  await playHall(page, await touchPad(page), { until: (s) => s.b!.hits === 1 && s.b!.lit === 1 });
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect.poll(async () => (await hallSnap(page)).paused).toBe(true);
  await expectFrozen(page, 1500);
  await shot(page, 'e5-paused-in-hall');
  await keepPlaying(page);
  expect((await hallSnap(page)).b!.hits).toBe(1);

  // Light 2, then turn the phone upright while light 3 is lit: pauses with the turn-sideways note.
  await playHall(page, await touchPad(page), { until: (s) => s.b!.hits === 2 && s.b!.lit === 2 });
  await page.setViewportSize({ width: PHONE.height, height: PHONE.width });
  await expect.poll(async () => (await hallSnap(page)).paused).toBe(true);
  await expect(page.locator('#rotate')).toBeVisible();
  await expectFrozen(page, 1000);
  await shot(page, 'e5-upright-in-hall');
  await page.setViewportSize(PHONE);
  await keepPlaying(page);
  expect((await hallSnap(page)).b!.hits).toBe(2);

  // Tiny and huge sideways screens mid-fight: the whole hall shows, the game keeps playing.
  for (const size of [
    { width: 320, height: 240 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
    const v = await hallSnap(page);
    expect(v.paused, `${size.width}x${size.height} keeps playing`).toBe(false);
    expect(await wholeHall(page), `the whole hall at ${size.width}x${size.height}`).toBe(true);
    await shot(page, `e5-hall-${size.width}x${size.height}`);
  }
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(300);

  // The third light.
  await playHall(page, await touchPad(page));
  expect((await hallSnap(page)).b!.defeated).toBe(true);

  // During the finish: once down from the bounce off the last light, taps and arrows do nothing.
  await expect.poll(async () => (await hallSnap(page)).h.grounded, { intervals: [16] }).toBe(true);
  const d0 = await hallSnap(page);
  for (let i = 0; i < 10; i++) await page.touchscreen.tap(300 + i * 30, 200);
  const pad = await touchPad(page);
  await pad.move(-1);
  await page.waitForTimeout(300);
  await pad.done();
  const d1 = await hallSnap(page);
  expect(d1.h.grounded).toBe(true);
  expect(d1.h.x).toBe(d0.h.x);
  expect(d1.h.y).toBe(d0.h.y);
  expect(d1.r.lives).toBe(d0.r.lives);

  // Win screen: words, then a storm of fast taps.
  const won = page.getByRole('dialog', { name: WIN });
  await expect.poll(async () => (await hallSnap(page)).screen, { timeout: 10_000, intervals: [16] }).toBe('win');
  const shownAt = await page.evaluate(() => performance.now());
  await expect(won).toBeVisible();
  const btn = await won.getByRole('button', { name: 'Play again' }).boundingBox();
  await page.touchscreen.tap(btn!.x + btn!.width / 2, btn!.y + btn!.height / 2);
  const tappedAt = await page.evaluate(() => performance.now());
  if (tappedAt - shownAt < 350) expect((await hallSnap(page)).screen).toBe('win');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if ((await hallSnap(page)).screen === 'win') {
    await expect(won.getByText(/wrong premise/)).toHaveCount(0);
    await shot(page, 'e5-win-screen');
  }
  for (let i = 0; i < 20; i++) {
    await page.touchscreen.tap(i % 2 ? btn!.x + btn!.width / 2 : 100 + i * 30, i % 2 ? btn!.y + btn!.height / 2 : 60 + (i % 5) * 60);
  }
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if ((await hallSnap(page)).screen === 'win') await won.getByRole('button', { name: 'Play again' }).tap();
  await expect(won).toBeHidden();

  // Play again: the hall from its start, a full reset.
  await expect.poll(async () => (await hallSnap(page)).screen).toBe('play');
  const fresh = await hallSnap(page);
  expect(fresh.r).toMatchObject({ phase: 'arena', lives: 3, maxLives: 3, kobo: 0, power: { corn: 0, amala: 0, shield: false } });
  expect(fresh.r.time).toBeLessThan(5);
  expect(fresh.b).toMatchObject({ hits: 0, lit: -1, defeated: false });
  expect(fresh.h.x).toBeLessThan(60 + 156 * 5);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('General Go-Slow is jamming the hall! Wait for the green light.')).toBeVisible();

  expect(late).toEqual([]);
  expect(errors).toEqual([]);
});

test('E5 break it: the last life lost in the hall, by touch: hall game over words, the fight stops, Play again restarts the hall', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await toHall(page);
  // Light 1, so low honks join in; then stand in the tyres' way until the lives are gone.
  await playHall(page, await touchPad(page), { until: (s) => s.b!.hits >= 1 });
  const pad = await touchPad(page);
  await pad.move(1);
  await expect.poll(async () => (await hallSnap(page)).h.x).toBeGreaterThan(250);
  await pad.done();
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 40_000 });
  const end = await hallSnap(page);
  expect(end.r).toMatchObject({ phase: 'over', lives: 0, power: { corn: 0, amala: 0, shield: false } });
  await expect(over.getByText('General Go-Slow is still jamming the hall. Try again!')).toBeVisible();
  await expect(over.getByText(/The street is still here/)).toHaveCount(0);
  await expectFrozen(page, 1000);
  // The hall stays in view behind the game over screen.
  expect(await wholeHall(page)).toBe(true);
  await shot(page, 'e5-game-over-in-hall');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect(over).toBeHidden();
  const fresh = await hallSnap(page);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  expect(fresh.r).toMatchObject({ phase: 'arena', lives: 3, kobo: 0 });
  expect(fresh.b).toMatchObject({ hits: 0, lit: -1, defeated: false });
  expect(fresh.h.x).toBeLessThan(60);
  // ...and the fight plays again to the win.
  await playHall(page, await touchPad(page));
  await waitForWin(page);
  await expect(page.getByRole('dialog', { name: WIN })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const jitterMs of [80, 150]) {
  test(`E5 first-timer: a sloppy hall bot (+/- ${jitterMs} ms) by touch`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await toHall(page);
    const start = await hallSnap(page);
    const { presses, last } = await playHall(page, await touchPad(page), { jitterMs, seed: jitterMs });
    await expect.poll(async () => (await hallSnap(page)).r.phase, { timeout: 10_000 }).not.toBe('arena');
    const end = await hallSnap(page);
    const line = `sloppy +/-${jitterMs} ms by touch: ${end.r.phase}, ${last.b?.hits ?? 0} hits, fight ${(last.r.time - start.r.time).toFixed(1)} s to the third hit, ${start.r.lives - end.r.lives} lives lost, ${presses} presses`;
    console.log(line);
    test.info().annotations.push({ type: 'sloppy hall', description: line });
    if (jitterMs === 80) expect(end.r.phase).toBe('won');
    else expect(last.b?.hits ?? 0).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('F4 break it: a tablet held upright (768x1024) asks to turn sideways, or still shows the hero', async ({ page }) => {
  test.setTimeout(120_000);
  await toHall(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  const s = await hallSnap(page);
  await shot(page, 'f4-hall-768x1024');
  if (s.paused) {
    await expect(page.locator('#rotate')).toBeVisible();
    return;
  }
  const c = await page.evaluate(() => ({ x: window.__game!.camX, w: window.__game!.viewW }));
  expect(s.h.x).toBeGreaterThanOrEqual(c.x);
  expect(s.h.x).toBeLessThanOrEqual(c.x + c.w);
});
