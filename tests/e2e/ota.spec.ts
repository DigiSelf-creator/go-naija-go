/**
 * O2b (docs/ogun.md 1.4, 3.3, 3.4, 4.1, 7 and 8): Ota, Ogun street 1, on the phone profile.
 * A player with Go-Slow Hall won and Ogun as the city last used opens the game on Ogun's city
 * (OG-R35: from the first visit), taps the Potholes pin and its "Run Ota", and plays by hand with
 * two thumbs from the arch to the bus: the arch's welcome, mud that slows to walk speed, ikokore
 * that keeps the feet firm, the bus stop, the cleared card ("Take it home" back to Ogun's city,
 * "Mission complete!", OG-R39), and the save under states.ogun with the money in the one wallet
 * (decision 80). Out of lives says "You keep {money} for Ogun"; Pause and the cards have Ogun's
 * Challenge road (OG-R35).
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { LEFT, buttonCentres, hands, playStreetByHand, snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
/** Go-Slow Hall won, Ogun open, the arrival card seen, Ogun the city last used. */
const IN_OGUN = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: { done: true, best: 0 } }, ogun: { arrived: true } }, city: CITY, where: 'ogun' };

type Saved = { states?: { lagos?: unknown; ogun?: { streets?: Record<string, { done?: boolean; best?: number }>; arrived?: boolean } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const ogunCity = (page: Page) => page.locator('.ogun-city');

/** A saved hero and progress, then "Play": Ogun's city (its part loads from the phone). */
async function openOgun(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(IN_OGUN) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

/** OG-R35: the Potholes pin's card in Ogun's city: "Run Ota". */
async function playOta(page: Page): Promise<void> {
  await expect(ogunCity(page)).toBeVisible();
  await ogunCity(page).getByRole('button', { name: /^Potholes, (problem|ready to fix)$/ }).tap();
  const play = page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'Run Ota' });
  await expect(play).toBeVisible();
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await play.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-1');
}

test('Ota by hand from Ogun\'s city: the arch, mud, ikokore, the bus stop, the bus, the cleared card and the save under states.ogun', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await openOgun(page);
  // OG-R37: before any street, the Bad road pin is a problem whose card says to run Ota.
  await expect(ogunCity(page).locator('.city-pin[data-spot="badRoad"]')).toHaveAttribute('aria-label', 'Bad road, problem');
  await playOta(page);
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  expect(await page.evaluate(() => window.__game!.run.lives)).toBe(3);

  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const act = await crateActor(page, crates);
  const toasts = new Set<string>();
  /** Top speed with the feet in mud, with and without ikokore; ikokore seen. */
  const mud = { slowTop: 0, firmTop: 0, slowSteps: 0, ikokore: false, mudFrames: 0 };
  const { stats, last } = await playStreetByHand(page, h, {
    act,
    onPoll: async (s) => {
      const t = await page.evaluate(() => window.__game!.toast);
      if (t) toasts.add(t);
      const r = s.r as typeof s.r & { mud: boolean; slowed: boolean; power: { ikokore: number } };
      if (r.power.ikokore > 0) mud.ikokore = true;
      if (r.mud) mud.mudFrames++;
      if (r.slowed) {
        mud.slowSteps++;
        if (mud.slowSteps > 12) mud.slowTop = Math.max(mud.slowTop, s.h.speed);
      } else mud.slowSteps = 0;
      if (r.mud && r.power.ikokore > 0) mud.firmTop = Math.max(mud.firmTop, s.h.speed);
    },
  });
  await h.upAll();
  console.log(
    `Ota by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, presses ${stats.presses}, ` +
      `lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, crates ${crates.opened.join(', ')}, mud frames ${mud.mudFrames}, ` +
      `slowed top ${mud.slowTop.toFixed(1)}, with ikokore top ${mud.firmTop.toFixed(1)}; toasts: ${[...toasts].join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.lostAt.length, 'a Lagos finisher clears Ota on the first try').toBeLessThan(3);
  // The arch's welcome, the mud hint, the bus stop and the ikokore words.
  expect(toasts).toContain('Welcome to Ogun, the Gateway State!');
  expect(toasts).toContain('Mud! It slows you down.');
  expect([...toasts].some((t) => t.startsWith('Bus stop!'))).toBe(true);
  expect(toasts).toContain("Ikokore! Mud won't slow you for 12 seconds.");
  // Mud: walk speed at most (corn's walk 120 in the corn stretch); ikokore: a run through it.
  expect(mud.mudFrames).toBeGreaterThan(20);
  expect(mud.slowTop).toBeGreaterThan(0);
  expect(mud.slowTop).toBeLessThanOrEqual(120.5);
  expect(mud.ikokore).toBe(true);
  expect(mud.firmTop).toBeGreaterThan(130);
  expect(crates.opened.length).toBeGreaterThanOrEqual(3);

  // The cleared card: Ota's line, Take it home, Next street (O3b: on to Abeokuta), Play again and Ogun's Challenge road (OG-R35).
  const kobo = last.r.kobo;
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const money = (await page.evaluate(() => window.__game!.run.kobo)) * 10 + 500;
  await expect(dialog.getByText(`Ota is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
  for (const b of ['Take it home', 'Next street', 'Play again', 'Challenge road']) await expect(dialog.getByRole('button', { name: b, exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Go to Go-Slow Hall', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Take it home' })).toBeFocused();
  // Saved under states.ogun; Lagos as it was; the money in the one wallet (decision 80).
  const s = await saved(page);
  expect(s.states?.ogun?.streets?.['1']?.done).toBe(true);
  expect(s.states?.ogun?.streets?.['1']?.best).toBe(kobo * 10);
  expect(s.states?.ogun?.arrived).toBe(true);
  expect(s.states?.lagos).toEqual(IN_OGUN.states.lagos);
  expect(s.city?.kobo).toBe(1000 + money);

  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // Ogun's city: "Mission complete!" over the money brought home (OG-R39); the Bad road card now says "Run Abeokuta".
  await expect(ogunCity(page).locator('.city-banner')).toContainText('Mission complete!');
  await expect(ogunCity(page).locator('.city-banner')).toContainText(`You brought ${formatMoney(money)} home.`);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await ogunCity(page).locator('.city-pin[data-spot="badRoad"]').tap();
  await expect(page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Run Abeokuta' })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.skin)).toBe(false);
  expect(errors).toEqual([]);
});

test('Ota out of lives: "You keep {money} for Ogun", Ogun\'s Challenge road, Home is Ogun\'s city; Pause has the Challenge road', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openOgun(page);
  await playOta(page);
  // Pause from Ota: Keep playing, Start again, Challenge road (OG-R35), Home.
  await page.getByRole('button', { name: 'Pause' }).tap();
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await expect(pause.getByRole('button', { name: 'Challenge road' })).toBeVisible();
  await expect(pause.getByRole('button', { name: 'Home' })).toBeVisible();
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Keep playing' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');

  // Walk into the first pothole three times (forward held, no jump).
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => screenNow(page), { timeout: 60_000 }).toBe('gameover');
  await h.upAll();
  const s = await snap(page);
  expect(s.r.lives).toBe(0);
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over.getByText(/^You keep .+ for Ogun\. The street is still here\. Try again!$/)).toBeVisible();
  await expect(over.getByRole('button', { name: 'Challenge road' })).toBeVisible();
  await waitOutTapLock(page);
  await over.getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect(ogunCity(page)).toBeVisible();
  // OG-R39: after a loss, no "Mission complete!".
  await expect(ogunCity(page).locator('.city-banner')).not.toContainText('Mission complete!');
  expect((await saved(page)).states?.ogun?.streets?.['1']?.done).not.toBe(true);
  expect(errors).toEqual([]);
});
