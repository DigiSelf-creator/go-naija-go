/**
 * K4b (docs/kano.md 3.3, 3.6, 3.7, 4.1 and 8): Dawanau, Kano street 3, on the phone profile. A
 * player who has cleared Kofar Mata opens the game on Kano's home, taps "Play Dawanau" and plays
 * by hand with two thumbs: over the dust whirls, up the sack steps, fura da nono and the row of
 * whirls it puffs apart, down the secret well behind the sacks into the groundnut store for the
 * garri parcel, up at the exit well, on to the bus. The cleared card (Dawanau's line, the parcel's
 * line, K5b: a small "Go to Borehole Hall"), the save under states.kano with the parcel
 * and the money in the one wallet (decision 80). Kano plays with the Ogun part never fetched
 * (KN-R10). Also: Kano's home at 320 x 240 with all three streets open.
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, LEFT, RIGHT, snap, type Hands, type Snap } from './hands';
import { wellBot } from './well-bot';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const KOFAR_DONE = { arrived: true, streets: { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 } } };
const save = (kano: unknown) => ({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano }, city: CITY, where: 'kano' });
/** Where to save the in-play picture (the K4b report's screenshot), if set. */
const SHOT = process.env['K4B_SHOT'];

type Saved = {
  states?: { lagos?: unknown; kano?: { streets?: Record<string, { done?: boolean; best?: number }>; parcel?: boolean } };
  city?: { kobo?: number };
};
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const partOf = (url: string): string | null => /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;

async function openKano(page: Page, kano: unknown): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save(kano)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

test('Dawanau by hand from Kano\'s home: whirls, sacks, fura da nono, the secret well, the bus, the save', async ({ page, context }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const asked = new Set<string>();
  context.on('request', (r) => {
    const p = partOf(r.url());
    if (p) asked.add(p);
  });

  // Kurmi alone cleared: no Dawanau yet.
  await openKano(page, { arrived: true, streets: { 1: { done: true, best: 900 } } });
  await expect(page.locator('.kano-city').getByRole('button', { name: 'Play Dawanau' })).toHaveCount(0);

  // Kofar Mata cleared: Dawanau opens beside the other two.
  await openKano(page, KOFAR_DONE);
  const home = page.locator('.kano-city');
  for (const b of ['Play Kurmi', 'Play Kofar Mata']) await expect(home.getByRole('button', { name: b })).toBeVisible();
  const play = home.getByRole('button', { name: 'Play Dawanau' });
  await expect(play).toBeVisible();
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-3');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game!.music.tune)).toBe('kano-dawanau');
  const whirls = (await page.evaluate(() => window.__game!.run.hazards)).filter((z) => z.kind === 'whirl').map((z) => z.x);
  expect(whirls).toEqual([1500, 2200, 4300, 4600, 4900, 8100, 11000]);
  const level = await page.evaluate(() => window.__game!.level);
  for (const [x, h] of [[2800, 50], [2930, 100], [3060, 150]] as const) expect(level.platforms).toContainEqual({ x, y: 300 - h, w: 100 });
  expect(level.wells).toEqual([{ x: 5150, exitX: 5480, room: 'kano-well' }]);
  const puffs0 = await page.evaluate(() => window.__game!.whirlPuffs);

  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  const well = await wellBot(page, h);
  const room = { visited: false, id: '', parcel: false, toast: '', back: 0 };
  /** Down the secret well at 5150 (behind the sacks), the parcel from the kuli-kuli shelf, up at 5480. */
  const wellAct = async (s: Snap, hh: Hands): Promise<boolean> => {
    if (room.visited || s.h.x < 5030 || s.h.x > 5170) return false;
    room.visited = true;
    await well.walkTo(5150, 8);
    await well.tapWellButton('down');
    await well.phase('room');
    room.id = await page.evaluate(() => window.__game!.run.room?.id ?? '');
    await well.walkTo(280, 4);
    await well.jump(true);
    await page.waitForTimeout(150);
    room.parcel = await page.evaluate(() => window.__game!.run.parcel);
    room.toast = (await page.evaluate(() => window.__game!.toast)) ?? '';
    await well.walkTo(500, 4);
    await well.tapWellButton('up');
    await well.phase('run', 15_000);
    room.back = (await snap(page)).h.x;
    await hh.down(LEFT, btn.forward.x, btn.forward.y);
    return true;
  };
  /** With fura da nono, walk straight into the whirls ahead (no jump): each touch puffs one apart. */
  const furaAct = async (s: Snap): Promise<boolean> => {
    const near = (t: Snap) => t.r.power.fura > 0 && t.r.hazards.some((z) => z.kind === 'whirl' && z.mode === 'move' && z.x - t.h.x > -20 && z.x - t.h.x < 80);
    if (!near(s)) return false;
    for (let i = 0; i < 400 && near(await snap(page)); i++) await page.waitForTimeout(16);
    return true;
  };
  /** A held jump onto the first sack step, then on up the next two. */
  const climbed = new Set<number>();
  const sackAct = async (s: Snap, hh: Hands): Promise<boolean> => {
    const x = [2800, 2930, 3060].find((a) => !climbed.has(a) && a - s.h.x > 0 && a - s.h.x < 40);
    if (x === undefined) return false;
    climbed.add(x);
    await hh.down(RIGHT, btn.jump.x, btn.jump.y);
    for (let i = 0; i < 300; i++) if ((await snap(page)).h.vy >= 0) break;
    await hh.up(RIGHT);
    for (let i = 0; i < 300; i++) if ((await snap(page)).h.grounded) break;
    return true;
  };
  const toasts = new Set<string>();
  const seen = { fura: false, onSack: 0 };
  let shot = false;
  const { stats, last } = await playStreetByHand(page, h, {
    act: async (s, hh) => (await wellAct(s, hh)) || (await furaAct(s)) || sackAct(s, hh),
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      if (s.r.power.fura > 0) seen.fura = true;
      if (s.h.x > 2800 && s.h.x < 3160 && s.h.y < 300 - 40 && s.h.grounded) seen.onSack++;
      // In the fura row: a whirl near, the fura chip in the HUD.
      if (SHOT && !shot && s.r.power.fura > 0 && s.h.x > 4150 && s.r.hazards.some((z) => z.kind === 'whirl' && z.mode === 'move' && z.x - s.h.x > 40 && z.x - s.h.x < 160)) {
        shot = true;
        await page.screenshot({ path: SHOT });
      }
    },
  });
  await h.upAll();
  const puffs = (await page.evaluate(() => window.__game!.whirlPuffs)) - puffs0;
  console.log(
    `Dawanau by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, ` +
      `puffs ${puffs}, on sacks ${seen.onSack}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, room ${JSON.stringify(room)}; toasts: ${[...toasts].join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt.length, 'a Kofar Mata finisher clears Dawanau').toBeLessThan(3);
  expect(seen.fura).toBe(true);
  expect(puffs, 'fura puffs the row of whirls').toBeGreaterThanOrEqual(2);
  expect(seen.onSack, 'stood on the sack steps').toBeGreaterThan(0);
  for (const t of ['Dust whirl! Jump over it.', "Fura da nono! Dust can't stop you."]) expect(toasts).toContain(t);
  // The secret well: down at 5150, the parcel, up at the exit well before the bus stop.
  expect(room.visited).toBe(true);
  expect(room.id).toBe('kano-well');
  expect(room.parcel).toBe(true);
  expect(room.toast).toMatch(/^(Groundnut garri parcel|Garri parcel)! Shield for the hall\.$/);
  expect(Math.abs(room.back - 5480)).toBeLessThan(40);
  expect(last.r.parcel).toBe(true);

  // The cleared card: Dawanau's line and the parcel's; Take it home, K5b: Go to Borehole Hall, and Play again.
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  // K6b (city.md W3, as Ogun's streets): the card's money is the coins plus the ₦5 win prize; the best is the coins.
  const coins = (await page.evaluate(() => window.__game!.run.kobo)) * 10;
  const money = coins + 500;
  await expect(dialog.getByText(`Dawanau is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  await expect(dialog.getByText('Your garri parcel is saved for Borehole Hall.')).toBeVisible();
  for (const b of ['Take it home', 'Go to Borehole Hall', 'Play again']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  for (const b of ['Next street', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toHaveCount(0);
  const s = await saved(page);
  expect(s.states?.kano?.streets?.['3']).toEqual({ done: true, best: coins });
  expect(s.states?.kano?.streets?.['2']).toEqual({ done: true, best: 1100 });
  expect(s.states?.kano?.parcel).toBe(true);
  expect(s.states?.lagos).toEqual(DONE);
  expect(s.city?.kobo).toBe(1000 + money);

  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(false);
  // KN-R10: Kano played with only its own part fetched.
  expect([...asked]).toEqual(['kano']);
  expect(errors).toEqual([]);
});

test('Kano\'s home at 320 x 240 with Dawanau open: every button on screen, 44 px tall, none overlapping', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openKano(page, KOFAR_DONE);
  const boxes = await page.locator('.kano-city .city-top button, .kano-city .city-bottom button').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent ?? '', ...JSON.parse(JSON.stringify(e.getBoundingClientRect())) as DOMRect })),
  );
  if (process.env['K4B_HOME_SHOT']) await page.screenshot({ path: process.env['K4B_HOME_SHOT'] });
  expect(boxes.map((b) => b.name)).toEqual(expect.arrayContaining(['Play Kurmi', 'Play Kofar Mata', 'Play Dawanau']));
  for (const b of boxes) {
    expect(b.left, b.name).toBeGreaterThanOrEqual(0);
    expect(b.right, b.name).toBeLessThanOrEqual(320);
    expect(b.top, b.name).toBeGreaterThanOrEqual(0);
    expect(b.bottom, b.name).toBeLessThanOrEqual(240);
    expect(b.height, b.name).toBeGreaterThanOrEqual(44);
  }
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `${a.name} and ${b.name}`).toBe(true);
});
