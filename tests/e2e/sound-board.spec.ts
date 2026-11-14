/**
 * Decision 62: Tp hears the goat's "meeh" and the birds' "hawk hawk" on the ?sounds test board.
 * Each tap plays its sound through the real Sound class (oscillators start), the Sound switch
 * turns them off, and the game itself does not start on that address.
 */
import { expect, test } from '@playwright/test';

test('?sounds: the goat and bird calls come first, play on a tap, and the Sound switch stops them', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Count oscillators that start, in the page.
  await page.addInitScript(() => {
    const w = window as unknown as { __starts: number };
    w.__starts = 0;
    const real = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: Parameters<OscillatorNode['start']>) {
      w.__starts++;
      return real.apply(this, a);
    };
  });
  await page.goto('./?sounds');
  const buttons = page.locator('button[data-sound]');
  await expect(buttons.nth(0)).toHaveAttribute('data-sound', 'meeh');
  await expect(buttons.nth(1)).toHaveAttribute('data-sound', 'hawk');
  await expect(page.getByRole('heading', { name: 'Gbese!' })).toHaveCount(0);
  const starts = () => page.evaluate(() => (window as unknown as { __starts: number }).__starts);

  await buttons.nth(0).click();
  await expect.poll(starts).toBeGreaterThan(0);
  const afterMeeh = await starts();
  await buttons.nth(1).click();
  await expect.poll(starts).toBeGreaterThan(afterMeeh);

  await page.getByRole('button', { name: 'Sound: on' }).click();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  const before = await starts();
  await buttons.nth(0).click();
  await buttons.nth(1).click();
  await page.waitForTimeout(200);
  expect(await starts()).toBe(before);

  // Fits a phone held sideways: no sideways scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
