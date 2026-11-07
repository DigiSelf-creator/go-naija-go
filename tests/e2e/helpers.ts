import { expect, type Page } from '@playwright/test';

/**
 * A tap within 300 ms and 48 px of the tap that opened a screen counts as the second
 * half of a double tap and is ignored (B4), and screens that open during play (Pause,
 * Game over, Win) ignore all taps for 0.4 s. Playwright taps far faster than a person,
 * so wait this long before such a tap.
 */
export const PAST_DOUBLE_TAP_MS = 450;

/** design.md: Pause, Game over and Win ignore taps for their first 0.4 s (EVENT_SCREEN_GUARD_MS in src/screens/menus.ts). */
export const TAP_LOCK_MS = 400;

/**
 * Waits until a screen that opens during play (Pause, Game over, Win) takes taps again.
 * Call it once the screen shows. The game starts the lock when it opens the screen, which is
 * before this reads the page clock, so 0.4 s on that same clock (performance.now, the one the
 * game checks) always clears the lock, however slow or busy the computer is.
 */
export async function waitOutTapLock(page: Page): Promise<void> {
  const from = await page.evaluate(() => performance.now());
  await page.waitForFunction(({ from, ms }) => performance.now() - from > ms, { from, ms: TAP_LOCK_MS }, { polling: 16 });
}

/**
 * From the title screen into a run, by touch: "Make your hero" then "Start running" on a
 * first visit, or straight "Start running" when a hero is saved.
 */
export async function startRun(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Make your hero|Start running)$/ }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  if (await builder.isVisible()) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await builder.getByRole('button', { name: 'Start running' }).tap();
  }
  await expect.poll(() => page.evaluate(() => window.__game?.screen)).toBe('play');
}

/** Opens the game and starts a run. */
export async function openAndRun(page: Page): Promise<void> {
  await page.goto('./');
  await startRun(page);
}
