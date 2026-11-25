/**
 * K2b (docs/kano.md 3.3, 3.4, 4.1 and 8): Kurmi, Kano street 1, on the phone profile. A player in
 * Kano (Pothole Hall won, the arrival card seen) opens the game on Kano's home, taps "Play Kurmi"
 * and plays by hand with two thumbs from the gate to the bus: the gate's welcome, the wind hints,
 * kilishi, Kurmi's own tune and look, the cleared card ("Take it home" back to Kano's home, no
 * Challenge road yet) and the save under states.kano with the money in the one wallet (decision 80).
 * Kano plays with the Ogun part never fetched (KN-R10).
 */
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const IN_KANO = { v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano: { arrived: true } }, city: CITY, where: 'kano' };
/** Where to save the in-play picture (the K2b report's screenshot), if set. */
const SHOT = process.env['K2B_SHOT'];

type Saved = { states?: { lagos?: unknown; kano?: { streets?: Record<string, { done?: boolean; best?: number }>; arrived?: boolean } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const partOf = (url: string): string | null => /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;

test('Kurmi by hand from Kano\'s home: the gate, wind, kilishi, the bus, the cleared card and the save under states.kano', async ({ page, context }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const asked = new Set<string>();
  context.on('request', (r) => {
    const p = partOf(r.url());
    if (p) asked.add(p);
  });
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(IN_KANO) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const home = page.locator('.kano-city');
  await expect(home.getByText('Kurmi, the first street, is just through the gate.')).toBeVisible();
  const play = home.getByRole('button', { name: 'Play Kurmi' });
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-1');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game!.music.tune)).toBe('kano-kurmi');

  const h = hands(await page.context().newCDPSession(page));
  const toasts = new Set<string>();
  const seen = { kilishi: false, shot: false };
  const { stats, last } = await playStreetByHand(page, h, {
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      if ((s.r.power as { kilishi?: number }).kilishi) seen.kilishi = true;
      // In the tailwind, over the wide pit: the sign, streamers and streaks all point right.
      if (SHOT && !seen.shot && s.h.x > 2560) {
        seen.shot = true;
        await page.screenshot({ path: SHOT });
      }
    },
  });
  await h.upAll();
  console.log(`Kurmi by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}; toasts: ${[...toasts].join(' | ')}`);
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt.length, 'an Ogun finisher clears Kurmi').toBeLessThan(3);
  for (const t of ['Welcome to Kano!', 'Wind behind you! You jump farther.', 'Wind in your face! Short jumps.', "Kilishi! Wind can't hold you back."]) expect(toasts).toContain(t);
  expect(seen.kilishi).toBe(true);

  // The cleared card: Kurmi's line, Take it home and Play again (no Next street, no Challenge road yet).
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const money = (await page.evaluate(() => window.__game!.run.kobo)) * 10;
  await expect(dialog.getByText(`Kurmi is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  for (const b of ['Take it home', 'Play again']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  for (const b of ['Next street', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toHaveCount(0);
  const s = await saved(page);
  expect(s.states?.kano?.streets?.['1']?.done).toBe(true);
  expect(s.states?.kano?.streets?.['1']?.best).toBe(money);
  expect(s.states?.kano?.arrived).toBe(true);
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

test('Kurmi\'s Pause: Home back to Kano, no Challenge road', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(IN_KANO) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.kano-city').getByRole('button', { name: 'Play Kurmi' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await page.getByRole('button', { name: 'Pause' }).tap();
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await expect(pause.getByRole('button', { name: 'Challenge road' })).toHaveCount(0);
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
});
