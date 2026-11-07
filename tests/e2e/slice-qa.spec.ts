/**
 * qa E5 / F3 / F4: General Go-Slow and the win screen, broken on purpose, by touch on the
 * phone profile. Screenshots for the originality check go to $QA_SHOTS
 * (default test-results/qa-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { playStreet } from './bot';
import { PAST_DOUBLE_TAP_MS } from './helpers';
import { fightBossSloppy } from './sloppy-bot';

const SHOTS = process.env['QA_SHOTS'] ?? 'test-results/qa-shots';
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

const PHONE = { width: 727, height: 393 }; // Playwright's Pixel 5, sideways
const WIN_LINE = /wrong premise/;

const snap = (page: Page) =>
  page.evaluate(() => ({ h: window.__game!.hero, r: window.__game!.run, b: window.__game!.boss, steps: window.__game!.steps, paused: window.__game!.paused, screen: window.__game!.screen }));

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Fresh visit, build a hero by touch, play the street with the bot to the arena line. */
async function toArena(page: Page): Promise<CDPSession> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  const cdp = await page.context().newCDPSession(page);
  await playStreet(page, cdp);
  expect((await snap(page)).r.phase).toBe('arena');
  return cdp;
}

/** Boss frozen: nothing in the fight moves for `ms`. */
async function expectFrozen(page: Page, ms: number): Promise<void> {
  const a = await snap(page);
  await page.waitForTimeout(ms);
  const b = await snap(page);
  expect(b.steps).toBe(a.steps);
  expect(b.b).toEqual(a.b);
  expect(b.h).toEqual(a.h);
  expect(b.r.time).toBe(a.r.time);
}

async function keepRunning(page: Page): Promise<void> {
  const dlg = page.getByRole('dialog', { name: 'Paused' });
  await expect(dlg).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await dlg.getByRole('button', { name: 'Keep running' }).tap();
  await expect(dlg).toBeHidden();
  const s0 = (await snap(page)).steps;
  await expect.poll(async () => (await snap(page)).steps).toBeGreaterThan(s0 + 10);
}

test('E5 break it: boss in every state, pause and turn the phone mid-fight, tiny and huge screens, taps during the defeat, a storm of taps on the win screen, Play again resets fully', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = watchErrors(page);
  let late: string[] | null = null;
  page.context().on('request', (r) => late?.push(`${r.method()} ${r.url()}`));
  const cdp = await toArena(page);
  late = [];

  // The arena as it opens: boss idle, left light lit.
  await expect.poll(async () => (await snap(page)).b?.lit).toBe(0);
  await page.waitForTimeout(700); // camera glides to the arena edge
  const first = await snap(page);
  expect(first.b!.mode).toBe('idle');
  await shot(page, 'e5-arena-idle');

  // Play with the bot, photographing each boss mode the first time it shows.
  const shotModes = new Set<string>(['idle']);
  let didPause = false;
  let didRotate = false;
  let didSizes = false;
  for (let guard = 0; guard < 40; guard++) {
    const { last } = await fightBossSloppy(page, cdp, {
      jitterMs: 0,
      until: (s) => !shotModes.has(s.b!.mode) || (!didPause && s.b!.hits === 1 && s.b!.lit === 1) || (!didRotate && s.b!.hits === 2 && s.b!.lit === 2),
    });
    if (!last.b || last.r.phase !== 'arena') break;
    const mode = (await snap(page)).b!.mode;
    if (!shotModes.has(mode)) {
      shotModes.add(mode);
      await shot(page, `e5-boss-${mode}`);
    }
    if (last.b.defeated) break;
    const s = await snap(page);
    if (!didPause && s.b!.hits === 1 && s.b!.lit === 1) {
      didPause = true;
      // Pause mid-boss: everything stops, Keep running carries on.
      await page.getByRole('button', { name: 'Pause' }).tap();
      await expect.poll(async () => (await snap(page)).paused).toBe(true);
      await expectFrozen(page, 1500);
      await shot(page, 'e5-paused-in-arena');
      await keepRunning(page);
      expect((await snap(page)).b!.hits).toBe(1);
    }
    if (!didRotate && s.b!.hits === 2 && s.b!.lit === 2) {
      didRotate = true;
      // Turn the phone upright mid-boss: pauses with the turn-sideways note.
      await page.setViewportSize({ width: PHONE.height, height: PHONE.width });
      await expect.poll(async () => (await snap(page)).paused).toBe(true);
      await expect(page.locator('#rotate')).toBeVisible();
      await expectFrozen(page, 1000);
      await shot(page, 'e5-upright-in-arena');
      await page.setViewportSize(PHONE);
      await keepRunning(page);
      expect((await snap(page)).b!.hits).toBe(2);
    }
    if (!didSizes && didRotate) {
      didSizes = true;
      // Tiny and huge screens mid-boss: hero, lights and throws stay on screen.
      for (const size of [
        { width: 320, height: 240 },
        { width: 2560, height: 1440 },
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(300);
        const v = await snap(page);
        const worldW = (size.width / size.height) * 360;
        expect(v.paused, `${size.width}x${size.height} keeps playing`).toBe(false);
        expect(v.h.x - 11000, `hero on screen at ${size.width}x${size.height}`).toBeLessThanOrEqual(worldW);
        for (const l of await page.evaluate(() => window.__game!.level.lights)) expect(l.x + l.w - 11000).toBeLessThanOrEqual(worldW);
        await shot(page, `e5-arena-${size.width}x${size.height}`);
      }
      await page.setViewportSize(PHONE);
    }
  }
  expect(didPause && didRotate && didSizes).toBe(true);
  expect([...shotModes].sort()).toEqual(['attack', 'defeat', 'hit', 'idle']);

  // During the defeat: once down from the bounce off the last light, taps do nothing and
  // the hero stands still.
  await expect.poll(async () => (await snap(page)).h.grounded, { intervals: [16] }).toBe(true);
  const d0 = await snap(page);
  expect(d0.b!.defeated).toBe(true);
  for (let i = 0; i < 10; i++) await page.touchscreen.tap(300 + i * 30, 200);
  const d1 = await snap(page);
  expect(d1.h.grounded).toBe(true);
  expect(d1.h.speed).toBe(0);
  expect(d1.h.y).toBe(d0.h.y);
  expect(d1.r.lives).toBe(d0.r.lives);
  await page.waitForTimeout(1200);
  await shot(page, 'e5-boss-defeat-smile');

  // Win screen: words, then a storm of fast taps.
  const won = page.getByRole('dialog', { name: 'Road cleared!' });
  // Poll every frame so shownAt is within a frame of the real show time (toBeVisible backs
  // off up to 1 s between checks, which can eat the whole 0.4 s lock).
  await expect.poll(async () => (await snap(page)).screen, { timeout: 10_000, intervals: [16] }).toBe('win');
  const shownAt = await page.evaluate(() => performance.now());
  await expect(won).toBeVisible();
  const btn = await won.getByRole('button', { name: 'Play again' }).boundingBox();
  // One tap inside the 0.4 s lock does nothing.
  await page.touchscreen.tap(btn!.x + btn!.width / 2, btn!.y + btn!.height / 2);
  const tappedAt = await page.evaluate(() => performance.now());
  if (tappedAt - shownAt < 350) expect((await snap(page)).screen).toBe('win');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if ((await snap(page)).screen === 'win') {
    await expect(won.getByText(WIN_LINE)).toHaveCount(0);
    await shot(page, 'e5-win-screen');
  }
  // 20 very fast taps all over the win screen and on its buttons.
  for (let i = 0; i < 20; i++) {
    await page.touchscreen.tap(i % 2 ? btn!.x + btn!.width / 2 : 100 + i * 30, i % 2 ? btn!.y + btn!.height / 2 : 60 + (i % 5) * 60);
  }
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const afterStorm = await snap(page);
  if (afterStorm.screen === 'win') await won.getByRole('button', { name: 'Play again' }).tap();
  await expect(won).toBeHidden();

  // Play again: a full reset, from the start of the street.
  await expect.poll(async () => (await snap(page)).screen).toBe('play');
  const fresh = await snap(page);
  expect(fresh.r).toMatchObject({ phase: 'run', lives: 3, maxLives: 3, kobo: 0, checkpoint: false, power: { corn: 0, amala: 0, shield: false } });
  expect(fresh.r.time).toBeLessThan(5);
  expect(fresh.b).toBeNull();
  expect(fresh.h.x).toBeLessThan(80 + 156 * 5);
  expect(fresh.h.speed).toBe(156);
  expect(fresh.r.hazards.every((z) => z.mode === 'wait' || z.mode === 'move')).toBe(true);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.locator('.hud-food:not([hidden])')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // ...and the boss is fresh the next time round.
  await playStreet(page, cdp);
  const again = await snap(page);
  expect(again.r.phase).toBe('arena');
  expect(again.b).toMatchObject({ hits: 0, lit: 0, defeated: false, mode: 'idle' });
  expect(again.r.kobo).toBeGreaterThan(0);
  await expect(page.getByText('General Go-Slow blocks the road! Jump onto the green light.')).toBeVisible();

  expect(late).toEqual([]);
  expect(errors).toEqual([]);
});

test('E5 break it: the last life lost to a honk cloud, by touch: game over, the fight stops, Play again from the start', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const cdp = await toArena(page);
  // First hit, so honk clouds join in.
  await fightBossSloppy(page, cdp, { jitterMs: 0, until: (s) => s.b!.hits >= 1 });
  expect((await snap(page)).b!.hits).toBe(1);
  const f = { down: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 220, id: 1 }] }), up: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) };
  // Let tyres take lives down to one; then hop tyres and jump into the next honk cloud.
  let s = await snap(page);
  let beforeEnd = s;
  for (let i = 0; i < 20_000 && s.r.phase === 'arena'; i++) {
    beforeEnd = s;
    s = await snap(page);
    if (s.r.phase !== 'arena' || !s.b || !s.h.grounded || s.r.lives > 1 || s.r.safe > 0) continue;
    const honk = s.b.throws.find((t) => t.kind === 'honk' && Math.abs(t.x - s.h.x) < 28);
    const tyre = s.b.throws.find((t) => t.kind === 'tyre' && (t.x - s.h.x) * s.h.dir > -34 && (t.x - s.h.x) * s.h.dir < 75);
    if (honk || tyre) {
      await f.down();
      await page.waitForTimeout(honk ? 120 : 250);
      await f.up();
    }
  }
  const end = await snap(page);
  expect(end.r.phase).toBe('over');
  // It was the honk cloud: one is touching the hero's box (the fight froze on that step).
  const touching = end.b!.throws.find((t) => t.kind === 'honk' && Math.abs(t.x - end.h.x) <= 18 + 7 && end.h.y - 44 <= t.y + 10 && end.h.y >= t.y - 10);
  expect(touching, `throws at game over ${JSON.stringify(end.b!.throws)}, hero ${JSON.stringify(end.h)}, before ${JSON.stringify(beforeEnd.r.lives)}`).toBeTruthy();
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible();
  expect(end.r).toMatchObject({ lives: 0, power: { corn: 0, amala: 0, shield: false } });
  await expect(page.locator('.hud-food:not([hidden])')).toHaveCount(0);
  await expectFrozen(page, 1000);
  // The arena view stays behind the game over screen (the camera does not jump back to the hero).
  const arenaX = await page.evaluate(() => window.__game!.level.arenaX);
  expect(await page.evaluate(() => window.__game!.camX)).toBe(arenaX);
  await shot(page, 'e5-game-over-in-arena');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect(over).toBeHidden();
  const fresh = await snap(page);
  expect(fresh.r).toMatchObject({ phase: 'run', lives: 3, kobo: 0, checkpoint: false });
  expect(fresh.b).toBeNull();
  expect(fresh.h.x).toBeLessThan(600);
  expect(errors).toEqual([]);
});

for (const jitterMs of [80, 150]) {
  test(`E5 first-timer: a sloppy boss bot (+/- ${jitterMs} ms) by touch`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    const cdp = await toArena(page);
    const start = await snap(page);
    const { presses, last } = await fightBossSloppy(page, cdp, { jitterMs, seed: jitterMs });
    await expect.poll(async () => (await snap(page)).r.phase, { timeout: 10_000 }).not.toBe('arena');
    const end = await snap(page);
    const fight = (last.r.time - start.r.time).toFixed(1);
    const line = `sloppy +/-${jitterMs} ms by touch: ${end.r.phase}, ${last.b?.hits ?? 0} hits, fight ${fight} s to the third hit, ${start.r.lives - end.r.lives} lives lost, ${presses} presses`;
    console.log(line);
    test.info().annotations.push({ type: 'sloppy boss', description: line });
    // +/-80 ms wins 98% of tries in the unit simulation, so one try by touch should win.
    if (jitterMs === 80) expect(end.r.phase).toBe('won');
    else expect(last.b?.hits ?? 0).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('F4 break it: a tablet held upright (768x1024, no turn-sideways note) still shows the whole arena', async ({ page }) => {
  test.setTimeout(240_000);
  await toArena(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  const s = await snap(page);
  await shot(page, 'f4-arena-768x1024');
  if (s.paused) {
    // Fine too: the game asks to turn sideways.
    await expect(page.locator('#rotate')).toBeVisible();
    return;
  }
  const worldW = (768 / 1024) * 360;
  const lights = await page.evaluate(() => window.__game!.level.lights);
  const turnRightX = await page.evaluate(() => window.__game!.level.turnRightX);
  // Everything the player must see: the lit lights and the hero's whole path.
  for (const l of lights) expect(l.x + l.w - 11000, `light at ${l.x} on screen (${worldW.toFixed(0)} u wide)`).toBeLessThanOrEqual(worldW);
  expect(turnRightX + 7 - 11000, 'the hero never runs off the right edge').toBeLessThanOrEqual(worldW);
});
