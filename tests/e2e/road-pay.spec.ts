/**
 * qa round 5, decision 69 (S3e0 part 11 check 5, CR-Q1 a): a win started from a challenge road
 * stop pays for that stop's own fix, as the city cards do. A first Alausa win from its stop brings
 * ₦14 and Mission complete builds the New road; a Lane run win from its stop pays the Lamps, and
 * the next one the Mast. Street 1 is played by hand, so this file runs in the timing project.
 */
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, cityToRoad, playStop, screenNow, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const city = (page: Page) => page.evaluate(() => window.__game!.city!);

async function openCity(page: Page, cityPart: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: cityPart }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
}

test('a first Alausa win from its road stop brings ₦14 and Mission complete builds the New road', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'road'] });
  await cityToRoad(page);
  await playStop(page, '0');
  await expect.poll(() => screenNow(page)).toBe('play');
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h);
  await h.upAll();
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  const home = Math.max(1400, kobo * 10 + 500);
  await waitOutTapLock(page);
  await cleared.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(page.getByText('Mission complete!')).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 30_000 }).toEqual(['potholes']);
  await expect.poll(async () => (await city(page)).paying, { timeout: 10_000 }).toBe(false);
  expect((await city(page)).saved.kobo, 'the New road (₦10) paid from the ₦14 brought home').toBe(home - 1000);
  expect(errors).toEqual([]);
});

test('Lane run stop: a win pays the Lamps, and the next win from the stop pays the Mast', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'road'] });
  for (const [fix, bucket] of [
    ['lightsOut', 'power'],
    ['slowInternet', 'tech'],
  ] as const) {
    await cityToRoad(page);
    await playStop(page, 'lane');
    await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
    await page.evaluate(() => {
      window.__lane!.setGap(60);
      window.__lane!.warp(592);
    });
    const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
    await expect(goal).toBeVisible({ timeout: 10_000 });
    const haul = await page.evaluate(() => window.__lane!.haul);
    expect(haul[bucket], `the prize brings ${bucket} for ${fix}`).toBeGreaterThanOrEqual(bucket === 'power' ? 10 : 6);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await goal.getByRole('button', { name: 'Take it home' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await expect(page.getByText('Mission complete!')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await city(page)).saved.fixed ?? [], { timeout: 30_000 }).toContain(fix);
    await expect.poll(async () => (await city(page)).mission, { timeout: 30_000 }).toBeNull();
  }
  expect((await city(page)).saved.fixed).toEqual(['lightsOut', 'slowInternet']);
  expect(errors).toEqual([]);
});
