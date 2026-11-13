/**
 * qa, 5W W5: Mission complete cannot be skipped into a broken state. A first-timer wins street 1
 * from the Potholes card, takes it home, and hammers taps and keys from the first moment of the
 * bus arriving. Whenever the skip lands, the road is paid once, ₦4 is left, the hero stands free
 * on the finished spot, walks again, and all of it survives a reload. Reduced motion shows the end
 * picture straight away. Real-time play, so this file runs in the timing project.
 */
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun, waitOutTapLock } from './helpers';
import { formatMoney } from '../../src/game/money';

const city = (page: Page) => page.evaluate(() => window.__game!.city!);

async function winStreet1(page: Page): Promise<number> {
  await page.goto('./');
  await startRun(page);
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h);
  await h.upAll();
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared).toBeVisible({ timeout: 6000 });
  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  await waitOutTapLock(page);
  await cleared.getByRole('button', { name: 'Take it home' }).tap();
  return Math.max(1400, kobo * 10 + 500);
}

async function checkEnd(page: Page, home: number, onMat = true): Promise<void> {
  await expect.poll(async () => (await city(page)).mission, { timeout: 10_000 }).not.toMatch(/^(bus|walk)$/);
  await expect.poll(async () => (await city(page)).paying, { timeout: 8000 }).toBe(false);
  const c = await city(page);
  expect(c.saved).toMatchObject({ kobo: home - 1000, fixed: ['potholes'], fixes: 1, boom: 4, paid: {} });
  // After a hammered skip the last taps may already walk the hero on: that is fine.
  if (onMat) expect(Math.hypot(c.hero.x - 101, c.hero.y - 480)).toBeLessThan(30);
  await expect(page.getByRole('button', { name: 'New road, fixed' })).toBeAttached();
  // Free to walk: the Mama Put board next, paid by standing on it.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-build="mamaPut"]').tap();
  await expect.poll(async () => (await city(page)).saved.built, { timeout: 20_000 }).toEqual(['buka']);
  expect((await city(page)).saved.kobo).toBe(home - 1400);
  // A reload keeps it all, once.
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(1500);
  expect((await city(page)).saved).toMatchObject({ kobo: home - 1400, fixed: ['potholes'], built: ['buka'], boom: 8, paid: {} });
  expect((await city(page)).mission).toBeNull();
}

test('Mission complete: taps, Space, Enter and Escape hammered from the bus arriving skip to a whole, saved end', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const home = await winStreet1(page);
  await expect.poll(() => screenNow(page)).toBe('city');
  const vp = page.viewportSize()!;
  for (let i = 0; i < 12 && (await city(page))?.mission !== 'end'; i++) {
    await page.touchscreen.tap(vp.width / 2 + (i % 3) * 30, vp.height / 2);
    await page.keyboard.press(['Space', 'Enter', 'Escape'][i % 3]!);
  }
  await checkEnd(page, home, false);
  expect(errors).toEqual([]);
});

test('Mission complete with reduced motion: the end picture at once, paid and built', async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const home = await winStreet1(page);
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect.poll(async () => (await city(page)).mission, { timeout: 2000 }).toBe('end');
  await checkEnd(page, home);
});

test('qa S3d1: Mission complete with the moment runs about 7 to 9 s from the bus to the end', async ({ page }) => {
  test.setTimeout(240_000);
  await winStreet1(page);
  await expect.poll(() => screenNow(page), { intervals: [20] }).toBe('city');
  const t0 = Date.now();
  // The end of Mission complete is the end of the New road's moment (city.md d12).
  await expect.poll(async () => (await city(page)).mission, { timeout: 15_000, intervals: [50] }).toBe('end');
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 10_000, intervals: [50] }).toBeNull();
  const took = (Date.now() - t0) / 1000;
  test.info().annotations.push({ type: 'mission seconds', description: took.toFixed(2) });
  console.log(`Mission complete took ${took.toFixed(2)} s`);
  expect(took).toBeGreaterThan(6.5);
  expect(took).toBeLessThan(9.5);
});

test('qa S3d1: one tap once the moment has begun ends Mission complete and the moment at once', async ({ page }) => {
  test.setTimeout(240_000);
  await winStreet1(page);
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 15_000, intervals: [50] }).not.toBeNull();
  const vp = page.viewportSize()!;
  await page.touchscreen.tap(vp.width / 2, vp.height / 2);
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 1000 }).toBeNull();
  expect((await city(page)).saved).toMatchObject({ fixed: ['potholes'], boom: 4 });
});

/** Plays street 1 by hand to the Street cleared card; returns the coins' kobo. */
async function playToCleared(page: Page): Promise<number> {
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h);
  await h.upAll();
  await expect(page.getByRole('dialog', { name: 'Street cleared!' })).toBeVisible({ timeout: 6000 });
  return (await page.evaluate(() => window.__game!.run.kobo)) * 10;
}
const savedKobo = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? 'null') as { city?: { kobo?: number } } | null)?.city?.kobo ?? null);

// po ruling 12 Nov 2026 (docs/questions.md, "the win top-up counts what you bring home"): the ₦14
// first win comes once; later wins for the unbuilt road bring at least ₦10.
test('po ruling: the ₦14 first win comes only once; after "Play again" a street 1 win for the road brings at least ₦10', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('./');
  await startRun(page);
  const c1 = await playToCleared(page);
  const home1 = Math.max(1400, c1 + 500);
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared.getByText(`You got ${formatMoney(home1)}.`, { exact: false })).toBeVisible();
  expect(await savedKobo(page)).toBe(home1);
  await waitOutTapLock(page);
  await cleared.getByRole('button', { name: 'Play again' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  const c2 = await playToCleared(page);
  // Not ₦14 again: the plain ₦5 prize, topped up so the win reaches the ₦10 road.
  const home2 = Math.max(1000, c2 + 500);
  await expect(cleared.getByText(`You got ${formatMoney(home2)}.`, { exact: false })).toBeVisible();
  expect(await savedKobo(page)).toBe(home1 + home2);
});

test('po ruling: once the road is built, a street 1 win pays the plain ₦5 prize plus coins', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('./');
  // The road built, street 1 never won: no ₦14 and no top-up.
  const city0 = { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: [], trays: {}, boom: 4, hints: ['walk', 'buka', 'collect'] };
  await page.evaluate((p) => {
    localStorage.setItem('gidi-look', '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}');
    localStorage.setItem('gidi-intro', '"seen"');
    localStorage.setItem('gidi-progress', p);
  }, JSON.stringify({ v: 2, states: {}, city: city0 }));
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Streets' }).tap();
  await expect.poll(() => screenNow(page)).toBe('streets');
  await page.locator('[data-where="0"]').tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  const c = await playToCleared(page);
  const cleared = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(cleared.getByText(`You got ${formatMoney(c + 500)}.`, { exact: false })).toBeVisible();
  expect(await savedKobo(page)).toBe(c + 500);
});
