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
