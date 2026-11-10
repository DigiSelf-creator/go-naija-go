/**
 * Piece M2 on the phone profile: General Go-Slow fought inside Go-Slow Hall (docs/design.md
 * S2.7, S2.10), by touch and by keys, through to "Lagos is switched on!". Replaces slice 1's
 * road fight (slice.spec.ts) now that w1-l1 is retired.
 *
 * 1. A fresh visit straight to the hall (?level=lagos-hall): build a hero, win by touch, every
 *    hall word, no network after load, then offline on the second visit.
 * 2. The Win screen's Play again starts the hall fresh.
 * 3. Street 3 by keys, "Go to Go-Slow Hall" by keys, the hall fight by keys to the win.
 * 4. Street 3 by touch with the secret well's garri parcel: the hall starts with the shield on;
 *    out of lives in the hall, Play again restarts the hall (with the shield again).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, LEFT, playStreetByHand, RIGHT, type Hands } from './hands';
import { HALL_URL, hallSnap, keyPad, playHall, touchPad, waitForWin } from './hall-play';
import { PAST_DOUBLE_TAP_MS, startRun, waitOutTapLock, gentleOn, storySeen } from './helpers';
import { wellBot } from './well-bot';

// Slice 3 (city.md (a)): the intro story is not what these tests are about; it is marked seen.
test.beforeEach(({ page }) => storySeen(page));

const SHOTS = process.env['M2_SHOTS'] ?? 'test-results/m2-shots';
mkdirSync(SHOTS, { recursive: true });

const WIN = 'Lagos is switched on!';

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Collects every toast shown, in order. */
async function watchToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __toasts: string[] }).__toasts = seen;
    const el = document.querySelector('.toast')!;
    new MutationObserver(() => {
      const t = el.textContent ?? '';
      if (el.classList.contains('show') && seen.at(-1) !== t) seen.push(t);
    }).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
  });
}
const toasts = (page: Page) => page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);

/** The keys for a street: the street bot's thumbs on Forward and Jump become the arrow keys and Space. */
async function keyHands(page: Page): Promise<Hands> {
  const btn = await buttonCentres(page);
  const down = new Map<number, string>();
  const keyAt = (x: number, y: number): string => {
    const near = (b: { x: number; y: number }) => Math.abs(b.x - x) < 4 && Math.abs(b.y - y) < 4;
    return near(btn.forward) ? 'ArrowRight' : near(btn.back) ? 'ArrowLeft' : near(btn.jump) ? 'Space' : '';
  };
  const k: Hands = {
    down: async (id, x, y) => {
      const key = keyAt(x, y);
      if (!key) throw new Error(`no key at ${x}, ${y}`);
      down.set(id, key);
      await page.keyboard.down(key);
    },
    move: async () => {},
    up: async (id) => {
      const key = down.get(id);
      if (!key) return;
      down.delete(id);
      await page.keyboard.up(key);
    },
    cancel: async () => {
      for (const id of [...down.keys()]) await k.up(id);
    },
    upAll: async () => {
      for (const id of [...down.keys()]) await k.up(id);
    },
    isDown: (id) => down.has(id),
  };
  return k;
}

/** Presses a button with the keyboard: focus, then Enter. */
async function pressKey(page: Page, name: string): Promise<void> {
  const b = page.getByRole('button', { name, exact: true });
  await b.focus();
  await page.keyboard.press('Enter');
}

/** The Win screen after the hall, word for word (S2.10). */
async function checkWin(page: Page): Promise<void> {
  const won = page.getByRole('dialog', { name: WIN });
  await expect(won).toBeVisible();
  const r = await page.evaluate(() => window.__game!.run);
  expect(r.phase).toBe('won');
  await expect(won.getByRole('heading', { name: WIN })).toBeVisible();
  // S2.10 (po M4 note): lives left, no kobo; the cog line.
  await expect(won.getByText(`You cleared General Go-Slow with ${r.lives} ${r.lives === 1 ? 'life' : 'lives'} left.`)).toBeVisible();
  await expect(won.getByText(/kobo/)).toHaveCount(0);
  await expect(won.getByText("Lagos's cog is turning: 1 of 37.")).toBeVisible();
  await expect(won.getByText('More of Nigeria is coming soon.')).toBeVisible();
  await expect(won.getByText('Road cleared!')).toHaveCount(0);
  await expect(won.getByText(/wrong premise/)).toHaveCount(0);
  await expect(won.getByRole('button', { name: "See Nigeria's wheel" })).toBeVisible();
  await expect(won.getByRole('button', { name: "See Nigeria's wheel" })).toBeFocused();
  await expect(won.getByRole('button', { name: 'Play again' })).toBeVisible();
  await expect(won.getByRole('button', { name: 'Streets' })).toBeVisible();
  await expect(won.getByRole('button', { name: 'Home' })).toHaveCount(0);
}

test('Go-Slow Hall from a fresh visit, by touch: hero, the fight, Lagos is switched on, no network, offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const late: string[] = [];
  let loaded = false;
  context.on('request', (r) => {
    if (loaded) late.push(`${r.method()} ${r.url()}`);
  });
  await page.goto(HALL_URL);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForLoadState('networkidle');
  loaded = true;

  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await builder.getByRole('button', { name: 'Skin tone 5' }).tap();
  await builder.getByRole('button', { name: 'Gele' }).tap();
  await builder.getByRole('button', { name: 'Ankara' }).tap();
  const look = await page.evaluate(() => window.__game!.look);
  await builder.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await watchToasts(page);
  // P2: at the first frame after the third hit, note the hint bar's words ('' when hidden).
  await page.evaluate(() => {
    const w = window as unknown as { __toastAtDefeat?: string };
    const look = (): void => {
      if (window.__game!.boss?.defeated) w.__toastAtDefeat = window.__game!.toast;
      else requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });

  // The hall as it opens (S2.7 t = 0, S2.14): inside by the left door, no light lit yet, the boss words.
  const s0 = await hallSnap(page);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  expect(s0.r.phase).toBe('arena');
  expect(s0.b).toMatchObject({ hits: 0, lit: -1, defeated: false });
  expect(s0.h.x).toBeLessThan(60);
  expect(s0.r.power.shield).toBe(false);
  await expect(page.getByText('General Go-Slow is jamming the hall! Wait for the green light.')).toBeVisible();
  // The phone buttons show: the player moves the hero here.
  expect(await page.evaluate(() => window.__game!.input.buttons)).toBe(true);

  const { presses, log } = await playHall(page, await touchPad(page));
  console.log(`hall by touch: ${presses} presses; ${log.join(' | ')}`);
  await waitForWin(page);
  await checkWin(page);
  const end = await page.evaluate(() => window.__game!.run);
  test.info().annotations.push({ type: 'hall by touch', description: `${end.time.toFixed(1)} s, ${end.lives} lives, ${presses} presses` });

  const seen = await toasts(page);
  for (const words of [
    'General Go-Slow is jamming the hall! Wait for the green light.',
    'Green light! Jump on it!',
    'Green light! 2 more.',
    'Green light! 1 more.',
    'PEEP! High honks fly high. Stay low on the floor.',
    'Green light! The hall is clear!',
    'Lagos is switched on!',
  ]) {
    expect(seen, words).toContain(words);
  }
  expect(seen.indexOf('Green light! The hall is clear!')).toBeLessThan(seen.indexOf('Lagos is switched on!'));
  // P2: the toast is hidden at the third hit, so no fight hint shows over the kind finish.
  expect(await page.evaluate(() => (window as unknown as { __toastAtDefeat?: string }).__toastAtDefeat)).toBe('');
  expect(late).toEqual([]);
  expect(errors).toEqual([]);

  // Offline: reload, the saved hero comes back and the game plays.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.look)).toEqual(look);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(30);
  expect(await page.evaluate(() => window.__game!.run.phase)).toBe('arena');
  expect(errors).toEqual([]);
});

test('Win screen buttons: Play again starts the hall fresh, after a short tap lock', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(HALL_URL);
  await gentleOn(page); // slice 3: Gentle mode is in Settings
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await startRun(page);
  await playHall(page, await touchPad(page));
  await waitForWin(page);
  const won = page.getByRole('dialog', { name: WIN });
  await expect(won).toBeVisible();
  // An instant tap is ignored (0.4 s lock), a later one works.
  await won.getByRole('button', { name: 'Play again' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if (await won.isVisible()) await won.getByRole('button', { name: 'Play again' }).tap();
  await expect(won).toBeHidden();
  const s = await hallSnap(page);
  expect(s.r).toMatchObject({ phase: 'arena', lives: 5, kobo: 0 });
  expect(s.b).toMatchObject({ hits: 0, lit: -1, defeated: false });
  expect(s.h.x).toBeLessThan(60);
});

test('street 3 by keys, then Go to Go-Slow Hall by keys, the hall fight by keys to Lagos is switched on', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await page.goto('./?level=lagos-3');
  await pressKey(page, 'Make your hero');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pressKey(page, 'Start running');
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-3');

  const { last } = await playStreetByHand(page, await keyHands(page));
  expect(last.r.phase).toBe('bus');
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  await expect(cleared.getByRole('button', { name: 'Go to Go-Slow Hall' })).toBeVisible();
  await waitOutTapLock(page);
  await pressKey(page, 'Go to Go-Slow Hall');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  const s0 = await hallSnap(page);
  expect(s0.r).toMatchObject({ phase: 'arena', kobo: 0, lives: s0.r.maxLives });
  await expect(page.getByText('General Go-Slow is jamming the hall! Wait for the green light.')).toBeVisible();

  const { presses, log } = await playHall(page, keyPad(page));
  expect(await page.evaluate(() => window.__game!.input.lastKind)).toBe('keys');
  console.log(`hall by keys: ${presses} presses; ${log.join(' | ')}`);
  await waitForWin(page);
  await checkWin(page);
  expect(errors).toEqual([]);
});

test('street 3 by touch with the secret well parcel: the hall starts with the shield on; out of lives, Play again restarts the hall', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await page.goto('./?level=lagos-3');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));
  const bot = await wellBot(page, h);
  // Back to the secret well behind the start, down, every gift (the garri parcel), and up.
  await bot.walkTo(160, 10);
  await bot.tapWellButton('down');
  const room = await bot.playRoom();
  expect(room.r.parcel).toBe(true);
  await bot.tapWellButton('up');
  await bot.phase('run');
  const { last } = await playStreetByHand(page, h);
  await h.upAll();
  expect(last.r.phase).toBe('bus');
  expect(last.r.parcel).toBe(true);
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  await waitOutTapLock(page);
  await cleared.getByRole('button', { name: 'Go to Go-Slow Hall' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');

  // S2.7 t = 0 with a parcel: the shield is on, its words first, then the boss words.
  const s0 = await hallSnap(page);
  expect(s0.r.power.shield).toBe(true);
  await expect(page.getByText('Your garri parcel: the shield is on!')).toBeVisible();
  await expect(page.getByText('General Go-Slow is jamming the hall! Wait for the green light.')).toBeVisible({ timeout: 4000 });
  await page.screenshot({ path: join(SHOTS, 'm2-parcel-shield-start.png') });

  // Stand in the way of the tyres: the shield takes the first, then every life goes.
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(async () => (await hallSnap(page)).h.x).toBeGreaterThan(280);
  await h.up(LEFT);
  await expect.poll(async () => (await hallSnap(page)).r.power.shield, { timeout: 8000 }).toBe(false);
  expect((await hallSnap(page)).r.lives).toBe(s0.r.maxLives);
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 30_000 });
  await expect(over.getByText('General Go-Slow is still jamming the hall. Try again!')).toBeVisible();
  const dead = await hallSnap(page);
  expect(dead.r).toMatchObject({ phase: 'over', lives: 0 });
  await page.screenshot({ path: join(SHOTS, 'm2-hall-game-over.png') });
  await waitOutTapLock(page);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect(over).toBeHidden();

  // The hall again (never the streets), from its start, with the shield on again (every try).
  const again = await hallSnap(page);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-hall');
  expect(again.r).toMatchObject({ phase: 'arena', lives: again.r.maxLives, kobo: 0, power: { shield: true } });
  expect(again.b).toMatchObject({ hits: 0, lit: -1, defeated: false });
  expect(again.h.x).toBeLessThan(60);
  // ...and it plays: a jump by touch.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await h.down(RIGHT, btn.jump.x, btn.jump.y);
  await expect.poll(async () => (await hallSnap(page)).h.grounded, { intervals: [16] }).toBe(false);
  await h.up(RIGHT);
  expect(errors).toEqual([]);
});
