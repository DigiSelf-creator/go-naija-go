/**
 * qa slice O (O2c, O3c, O4c): the three Ogun streets one after another by hand, as a player does
 * it: "Run Ota" on Ogun's city's Potholes card (OG-R35), then "Next street" on each cleared card, Ota to Abeokuta to
 * Sagamu. Each street is played by the two-thumb hand bot with crates; lives lost are the "tries"
 * proxy (3 lives a try). After Sagamu: no "Next street", "Take it home" goes to Ogun's city, whose
 * Bad road card now sends you to Pothole Hall (OG-R37), the saves are under states.ogun.streets 1
 * to 3 and the money is in the one wallet (top-level city). With QA_SHOTS=<folder> it saves a
 * picture of each street and the city.
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":4,"hair":2,"outfit":1,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const DONE = { done: true, best: 100 };
const LAGOS = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 0 } };
const IN_OGUN = { v: 2, states: { lagos: LAGOS, ogun: { arrived: true } }, city: CITY, where: 'ogun' };
type Saved = { states?: { lagos?: unknown; ogun?: { streets?: Record<string, { done?: boolean; best?: number }>; parcel?: boolean } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const ogunCity = (page: Page) => page.getByRole('dialog', { name: 'Ogun', exact: true });
const SHOTS = process.env['QA_SHOTS'];
/** Where each street's picture is taken (a calm moment: mud, a crack's sign, the flyover). */
const SHOT_AT: Record<string, number> = { 'ogun-1': 2140, 'ogun-2': 5080, 'ogun-3': 4250 };
const NAMES: Record<string, string> = { 'ogun-1': 'ota', 'ogun-2': 'abeokuta', 'ogun-3': 'sagamu' };

async function playHere(page: Page, id: string) {
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const act = await crateActor(page, crates);
  let shot = false;
  const { stats, last } = await playStreetByHand(page, h, {
    act,
    onPoll: async (s) => {
      if (SHOTS && !shot && s.h.x >= SHOT_AT[id]!) {
        shot = true;
        await page.screenshot({ path: `${SHOTS}/oqa-${NAMES[id]}.png` });
      }
    },
  });
  await h.upAll();
  return { stats, last, crates };
}

test('qa O: Ota, Next street, Abeokuta, Next street, Sagamu by hand from Ogun\'s city; saves and one wallet', async ({ page }) => {
  test.setTimeout(480_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
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
  await ogunCity(page).locator('[data-spot="potholes"]').tap();
  await page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'Run Ota' }).tap();

  let wallet = 1000;
  const report: string[] = [];
  const streets = [
    { id: 'ogun-1', name: 'Ota', n: 1 },
    { id: 'ogun-2', name: 'Abeokuta', n: 2 },
    { id: 'ogun-3', name: 'Sagamu', n: 3 },
  ];
  for (const st of streets) {
    const { stats, last, crates } = await playHere(page, st.id);
    report.push(`${st.name}: ${last.r.phase} at ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives left ${last.r.lives}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, kobo ${last.r.kobo}, crates ${crates.opened.length}`);
    expect(last.r.phase, `${st.name} reaches the bus`).toBe('bus');
    const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
    await expect(dialog).toBeVisible({ timeout: 8000 });
    const kobo = await page.evaluate(() => window.__game!.run.kobo);
    const money = kobo * 10 + 500;
    wallet += money;
    await expect(dialog.getByText(`${st.name} is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
    const s = await saved(page);
    expect(s.states?.ogun?.streets?.[String(st.n)]).toEqual({ done: true, best: kobo * 10 });
    expect(s.city?.kobo, 'one wallet, top-level city').toBe(wallet);
    expect(s.states?.lagos).toEqual(LAGOS);
    expect((s.states?.ogun as Record<string, unknown> | undefined)?.['kobo'], 'no second wallet under ogun').toBeUndefined();
    await waitOutTapLock(page);
    if (st.n < 3) {
      await dialog.getByRole('button', { name: 'Next street', exact: true }).tap();
    } else {
      await expect(dialog.getByRole('button', { name: 'Next street', exact: true })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Take it home' }).tap();
    }
  }
  console.log(report.join('\n'));
  test.info().annotations.push({ type: 'chain', description: report.join(' | ') });
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // O5b, OG-R37: Pothole Hall is open: the Bad road card's big button; the three streets stay open on the road.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await ogunCity(page).locator('[data-spot="badRoad"]').tap();
  const bad = page.getByRole('dialog', { name: 'Bad road' });
  await expect(bad.getByText('Go to Pothole Hall.')).toBeVisible();
  await expect(bad.getByRole('button', { name: 'Go to Pothole Hall' })).toHaveClass(/\bgo\b/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/oqa-ogun-city.png` });
  await bad.getByRole('button', { name: 'Back' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await ogunCity(page).getByRole('button', { name: 'Challenge road' }).tap();
  for (const w of ['ota', 'abeokuta', 'sagamu']) await expect(page.locator(`[data-where="${w}"]`)).toHaveAttribute('aria-label', /Done/);
  await expect(page.locator('[data-where="hall"]')).toHaveAttribute('aria-label', /Next/);
  const s = await saved(page);
  expect(Object.keys(s.states?.ogun?.streets ?? {}).sort()).toEqual(['1', '2', '3']);
  expect(errors).toEqual([]);
});
