/**
 * O5b (docs/ogun.md 5.2 to 5.5 and 8): Pothole Hall on the phone profile. A player who has
 * cleared Sagamu opens Ogun's city (OG-R35), taps the Bad road pin, whose card says to go to
 * Pothole Hall (OG-R37), taps its big "Go to Pothole Hall", and plays it with the keys (arrows and Space): carry the road mix bag, jump
 * over King Pothole three times, hop his gravel. The bot plays the plan in pothole-brain.ts (the
 * unit bot plays the same plan on the rules). Then the kind finish, the Win screen ("Ogun is
 * switched on!", "You got ₦15.", Take it home, Play again, and from O6b Challenge road and the wheel),
 * the save under states.ogun.hall (Lagos and the streets as they were, the one wallet), and
 * Ogun's city after it with "Mission complete!" (OG-R39), the gateway fixed and its built line
 * (OG-R37). No page errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { keyPad } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { playPothole } from './pothole-play';

const LOOK = '{"skin":2,"hair":1,"outfit":2,"body":1,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const LAGOS = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const OGUN_STREETS = { 1: { done: true, best: 300 }, 2: { done: true, best: 400 }, 3: { done: true, best: 500 } };
const save = (parcel: boolean) => ({ v: 2, states: { lagos: LAGOS, ogun: { arrived: true, streets: OGUN_STREETS, parcel } }, city: CITY, where: 'ogun' });

type Saved = { states?: { lagos?: unknown; ogun?: { streets?: unknown; hall?: unknown; parcel?: unknown } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);

async function openOgun(page: Page, parcel: boolean): Promise<string[]> {
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
    { look: LOOK, p: JSON.stringify(save(parcel)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

test('Pothole Hall from Ogun\'s city: carry three bags over King Pothole by the keys, the kind finish, the Win screen and the save under states.ogun.hall', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await openOgun(page, true);
  // Sagamu done: the Bad road card says the hall is open and its button is the big one.
  const city = page.locator('.ogun-city');
  await expect(city.locator('.city-pin[data-spot="badRoad"]')).toHaveAttribute('aria-label', 'Bad road, problem');
  await city.locator('.city-pin[data-spot="badRoad"]').tap();
  const card = page.getByRole('dialog', { name: 'Bad road' });
  await expect(card.getByText('King Pothole is blocking the gateway.')).toBeVisible();
  await expect(card.getByText('Go to Pothole Hall.')).toBeVisible();
  const go = card.getByRole('button', { name: 'Go to Pothole Hall' });
  await expect(go).toHaveClass(/\bgo\b/);
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await go.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  // The saved Ijebu garri parcel: the shield is on at the start.
  await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe('Your Ijebu garri parcel: the shield is on!');
  await expect.poll(() => page.evaluate(() => window.__game!.music.place)).toBe('hall');

  let tries = 0;
  let won = false;
  const all: string[] = [];
  const toasts = new Set<string>();
  while (tries < 3 && !won) {
    tries++;
    const pad = keyPad(page);
    const r = await playPothole(page, pad);
    for (const t of r.toasts) toasts.add(t);
    all.push(`try ${tries}: ${r.last.phase}, bags ${r.last.a?.hits ?? '?'}, lives lost ${r.lost}, presses ${r.presses}`, ...r.log.slice(-12));
    won = r.last.a?.defeated === true;
    if (!won) {
      // Out of lives: Play again (the hall only).
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await expect(over.getByText('King Pothole is still blocking the gateway. Try again!')).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
      await expect.poll(() => screenNow(page)).toBe('play');
    }
  }
  console.log(`Pothole Hall by the keys: won ${won} in ${tries} tries\n${all.join('\n')}\ntoasts: ${[...toasts].join(' | ')}`);
  expect(won).toBe(true);
  expect(tries).toBeLessThanOrEqual(3);
  for (const t of ['King Pothole is blocking the gateway!', 'Plop! 2 more bags.', 'Plop! 1 more bag.']) expect(toasts).toContain(t);

  // The finish: the toasts, the win at 6 s; the save is there from the third bag.
  const after = await saved(page);
  expect(after.states?.ogun?.hall).toEqual({ done: true, best: 0 });
  const seen = new Set<string>();
  for (let i = 0; i < 600 && (await screenNow(page)) !== 'win'; i++) {
    const t = await page.evaluate(() => window.__game!.toast);
    if (t) seen.add(t);
    await page.waitForTimeout(20);
  }
  expect(seen).toContain('The road is smooth!');
  expect(seen).toContain('The gateway is open! Ogun is switched on!');
  const win = page.getByRole('dialog', { name: 'Ogun is switched on!' });
  await expect(win).toBeVisible();
  await expect(win.getByText('The road through the gateway is smooth. The way to the rest of Nigeria is open.')).toBeVisible();
  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  const money = kobo * 10 + 1500;
  await expect(win.getByText(`You got ₦${money / 100}.`)).toBeVisible();
  // O6b: Ogun's Challenge road and the wheel, as Lagos's Win screen.
  for (const b of ['Take it home', 'Play again', 'Challenge road', "See Nigeria's wheel"]) await expect(win.getByRole('button', { name: b, exact: true })).toBeVisible();

  // Saved: Ogun's hall won (the parcel used up), its streets and Lagos as they were; the one wallet.
  const s = await saved(page);
  expect(s.states?.ogun?.hall).toEqual({ done: true, best: kobo * 10 });
  expect(s.states?.ogun?.streets).toEqual(OGUN_STREETS);
  expect(s.states?.ogun?.parcel).toBe(false);
  expect(s.states?.lagos).toEqual(LAGOS);
  expect(s.city?.kobo).toBe(1000 + money);
  expect(await page.evaluate(() => window.__game!.states.ogun.hall.done)).toBe(true);

  await waitOutTapLock(page);
  await win.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // OG-R35: home is Ogun's city; OG-R39: "Mission complete!" over the money; OG-R37: the gateway is
  // fixed (no Bad road pin) and its built line plays once.
  await expect(page.locator('.ogun-city')).toBeVisible();
  await expect(page.locator('.ogun-city .city-banner')).toContainText('Mission complete!');
  await expect(page.locator('.ogun-city .city-pin[data-spot="badRoad"]')).toHaveCount(0);
  await expect(page.locator('.ogun-city .city-banner')).toContainText('The gateway is open. The road is smooth.', { timeout: 10_000 });
  expect(errors).toEqual([]);
});
