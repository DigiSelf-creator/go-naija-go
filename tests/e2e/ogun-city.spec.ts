/**
 * O6b (docs/ogun.md part 6; decision 80): from a save with Sagamu cleared, Ogun's city is already
 * home (OG-R35): the Bad road pin is a problem and its card sends you to Pothole Hall (OG-R37).
 * Win the hall by the keys; the Win screen goes on to Ogun's Challenge road and the wheel, and
 * "Take it home" opens Ogun's city with "Mission complete!" (OG-R39), the gateway fixed and lit and
 * its built line (OG-R37). There, buy the adire market and the water pump with the one wallet (Naira
 * and Power earned in Lagos), see the Booming meter and the Travel card count Ogun's points, open
 * Ogun's Challenge road, run the Expressway (the lane run in Ogun's look: ogun-lane.json, theme
 * "expressway"), pick up Power, and go back to Ogun's city. Checks the save at each step: Ogun's
 * fixes, places and meter under states.ogun.city (never money there); Lagos's fixes, places,
 * meter and lane run as they were, only the shared wallet moving; no page errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { keyPad } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { playPothole } from './pothole-play';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":3,"hair":2,"outfit":1,"body":1,"age":1}';
const D = { done: true, best: 100 };
const LAGOS = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 0 } };
const OGUN_STREETS = { 1: { done: true, best: 300 }, 2: { done: true, best: 400 }, 3: { done: true, best: 500 } };
/** Lagos's city: two fixes, the Mama Put with a little tax, its meter; ₦13, Power 12 and Tech 2 in the one wallet. */
const CITY = { kobo: 1300, power: 12, tech: 2, fixed: ['potholes', 'lightsOut'], fixes: 2, paid: {}, built: ['buka'], trays: { buka: 60 }, boom: 12, boomCollect: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
const LANE = { best: 700, goals: 1 };
const SAVE = { v: 2, states: { lagos: LAGOS, ogun: { arrived: true, streets: OGUN_STREETS, parcel: false } }, city: CITY, lane: LANE, where: 'ogun' };

type Obj = Record<string, unknown>;
type Saved = { city: Obj; lane?: Obj; states: { lagos: Obj; ogun: Obj & { city?: Obj; lane?: Obj; hall?: Obj } } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);

/** Lagos's own city fields (not the wallet, not the trays: those fill in play time anywhere, OG-R8). */
const lagosOwn = (c: Obj) => ({ fixed: c['fixed'], fixes: c['fixes'], built: c['built'], paid: c['paid'], boom: c['boom'] });

test('Pothole Hall won, then Ogun\'s city: buy with the one wallet, the Booming meter and Travel count, the Challenge road, the Expressway run and back', async ({ page }) => {
  test.setTimeout(300_000);
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
    { look: LOOK, p: JSON.stringify(SAVE) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  // OG-R35: before the hall, Ogun's city is home; OG-R37: the Bad road pin shows the problem and its
  // card sends you to the hall (all three streets are cleared).
  await expect(page.locator('.ogun-city')).toBeVisible();
  await expect(page.locator('.ogun-city [data-spot="badRoad"]')).toHaveAttribute('aria-label', 'Bad road, problem');
  await page.locator('.ogun-city [data-spot="badRoad"]').tap();
  const bad = page.getByRole('dialog', { name: 'Bad road' });
  await expect(bad.getByText('King Pothole is blocking the gateway.')).toBeVisible();
  await expect(bad.getByText('Go to Pothole Hall.')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await bad.getByRole('button', { name: 'Go to Pothole Hall' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');

  // 1. Win the hall by the keys (3 tries at most).
  let won = false;
  for (let t = 0; t < 3 && !won; t++) {
    const r = await playPothole(page, keyPad(page));
    won = r.last.a?.defeated === true;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
      await expect.poll(() => screenNow(page)).toBe('play');
    }
  }
  expect(won, 'King Pothole beaten in 3 tries').toBe(true);
  for (let i = 0; i < 600 && (await screenNow(page)) !== 'win'; i++) await page.waitForTimeout(20);
  const win = page.getByRole('dialog', { name: 'Ogun is switched on!' });
  await expect(win).toBeVisible();
  // The Win screen goes on as Lagos's does: Take it home (the city), Play again, Challenge road, the wheel.
  for (const b of ['Take it home', 'Play again', 'Challenge road', "See Nigeria's wheel"]) await expect(win.getByRole('button', { name: b, exact: true })).toBeVisible();
  const hallKobo = (await page.evaluate(() => window.__game!.run.kobo)) * 10 + 1500;
  let s = await saved(page);
  expect(s.states.ogun.hall).toEqual({ done: true, best: hallKobo - 1500 });
  expect(s.city['kobo']).toBe(1300 + hallKobo);
  let wallet = 1300 + hallKobo;

  // 2. Take it home: Ogun's city, "Mission complete!" over the money (OG-R39), then the gateway's line (OG-R37).
  await waitOutTapLock(page);
  await win.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  const city = page.locator('.ogun-city');
  await expect(city).toBeVisible();
  await expect(city.locator('.city-banner')).toContainText('Mission complete!');
  await expect(city.locator('.city-banner')).toContainText(`You brought ${formatMoney(hallKobo, '₦')} home.`);
  await expect(city.locator('.city-banner')).toContainText('The gateway is open. The road is smooth.', { timeout: 10_000 });
  await expect(city.locator('.city-head')).toHaveAttribute('aria-label', 'Ogun. Booming meter. 0 of 20 to the next boom.');
  await expect(city.locator('.chip-naira')).toContainText(formatMoney(wallet, '₦'));
  await expect(city.locator('.chip-power')).toContainText('Power 12');
  // The boards: road, adire market, pump, lamps, mast (the garri mill waits for the road, kola for the boom).
  await expect(city.locator('.city-board')).toHaveCount(5);
  expect(await city.locator('.city-board').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['build']).sort())).toEqual(['adire', 'dryTaps', 'lightsOut', 'potholes', 'slowInternet']);
  // Pins: problem or ready, never colour alone (Bad road is fixed by the hall: no pin).
  await expect(city.locator('[data-spot="dryTaps"]')).toHaveAttribute('aria-label', 'Dry taps, ready to fix');
  await expect(city.locator('[data-spot="slowInternet"]')).toHaveAttribute('aria-label', 'Slow internet, problem');
  await expect(city.locator('[data-spot="badRoad"]')).toHaveCount(0);

  // 3. Buy the adire market (₦6) from the one wallet: tap its board, the hero walks onto its mat and pays.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.locator('[data-build="adire"]').tap();
  await expect.poll(async () => ((await saved(page)).states.ogun.city?.['built'] as string[] | undefined) ?? [], { timeout: 20_000 }).toEqual(['adire']);
  wallet -= 600;
  s = await saved(page);
  expect(s.city['kobo']).toBe(wallet);
  expect(s.states.ogun.city).not.toHaveProperty('kobo');
  expect(s.states.ogun.city).not.toHaveProperty('power');
  expect(s.states.ogun.city!['boom']).toBe(4);
  expect(lagosOwn(s.city)).toEqual(lagosOwn(CITY));
  await expect(city.locator('.city-banner')).toHaveText('The adire market is open here.', { timeout: 10_000 });
  await expect(city.locator('.city-head')).toHaveAttribute('aria-label', 'Ogun. Booming meter. 4 of 20 to the next boom.');

  // 4. The water pump with Power 10 of the 12 earned in Lagos.
  await expect(city.locator('[data-build="dryTaps"]')).toBeVisible();
  await page.waitForTimeout(2600);
  await city.locator('[data-build="dryTaps"]').tap();
  await expect.poll(async () => ((await saved(page)).states.ogun.city?.['fixed'] as string[] | undefined) ?? [], { timeout: 20_000 }).toEqual(['dryTaps']);
  s = await saved(page);
  expect(s.city['power']).toBe(2);
  expect(s.city['kobo']).toBe(wallet);
  expect(s.states.ogun.city!['boom']).toBe(8);
  expect(lagosOwn(s.city)).toEqual(lagosOwn(CITY));
  await expect(city.locator('[data-spot="dryTaps"]')).toHaveCount(0, { timeout: 10_000 });
  await expect(city.locator('.chip-power')).toContainText('Power 2');

  // 5. Travel counts Ogun's city: "Ogun ... Booming: 8 of 20"; Lagos keeps its own 12.
  await page.waitForTimeout(2600);
  await city.getByRole('button', { name: 'Travel' }).tap();
  const travel = page.getByRole('dialog', { name: 'Where to?' });
  await expect(travel.locator('[data-state="ogun"]')).toContainText('Booming: 8 of 20');
  await expect(travel.locator('[data-state="lagos"]')).toContainText('Booming: 12 of 20');
  await travel.getByRole('button', { name: 'Back' }).tap();

  // 6. Ogun's Challenge road: its stops, the Expressway card for the lamps (the pump is on).
  await city.getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  // The road's own part may still be opening ("Opening the road...").
  await expect(page.locator('.road-stop')).toHaveCount(8);
  const stops = await page.locator('.road-stop').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['where']));
  expect(stops).toEqual(['toLagos', 'ota', 'expressway', 'abeokuta', 'sagamu', 'hall', 'wayOn', 'border']);
  await expect(page.locator('[data-where="hall"]')).toHaveAttribute('aria-label', 'Stop 4, Pothole Hall. Done.');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="expressway"]').tap();
  const card = page.getByRole('dialog', { name: 'Side road: Expressway' });
  await expect(card.getByText('A win pays for the Lamps (Power 8).')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Run the Expressway' }).tap();

  // 7. The Expressway: the lane run with Ogun's file and look; a bulb's Power goes into the one wallet at once.
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  expect(await page.evaluate(() => ({ level: window.__lane!.level, theme: window.__lane!.theme }))).toEqual({ level: 'ogun-lane', theme: 'expressway' });
  await page.evaluate(() => {
    window.__lane!.warp(140);
    window.__lane!.setGap(30);
  });
  await expect.poll(() => page.evaluate(() => window.__lane!.haul.power), { timeout: 8000 }).toBeGreaterThanOrEqual(1);
  await test.info().attach('expressway', { body: await page.screenshot(), contentType: 'image/png' });
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  const haul = await page.evaluate(() => window.__lane!.haul);
  s = await saved(page);
  expect(s.city['power']).toBe(2 + haul.power);
  expect(s.city['kobo']).toBe(wallet + haul.kobo);
  wallet += haul.kobo;
  // The Pause card goes home to Ogun; Lagos's lane run is untouched.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Back to Ogun' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // OG-R39: leaving early says the line alone, with no "Mission complete!".
  await expect(page.locator('.ogun-city .city-banner')).toContainText(/^You brought .* home\.$/);
  await expect(page.locator('.ogun-city .city-banner .city-mission-head')).toHaveCount(0);
  await expect(page.locator('.ogun-city .chip-power')).toContainText(`Power ${2 + haul.power}`);

  // 8. The save at the end: Ogun's city as bought; Lagos's fixes, places, meter and lane run as they were.
  s = await saved(page);
  expect(s.states.ogun.city!['fixed']).toEqual(['dryTaps']);
  expect(s.states.ogun.city!['built']).toEqual(['adire']);
  expect(lagosOwn(s.city)).toEqual(lagosOwn(CITY));
  expect(s.lane).toMatchObject(LANE);
  expect(s.states.lagos).toEqual(LAGOS);
  expect(s.states.ogun['streets']).toEqual(OGUN_STREETS);
  expect(s.city['kobo']).toBe(wallet);

  // 9. Travel to Lagos: the same wallet shows there.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city').getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('city');
  await expect(page.locator('.city-card:not(.ogun-city) .chip-power')).toContainText(`Power ${2 + haul.power}`);
  expect(errors).toEqual([]);
});
