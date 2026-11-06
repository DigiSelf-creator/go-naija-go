import { expect, type Page } from '@playwright/test';

/**
 * A tap within 300 ms and 48 px of the tap that opened a screen counts as the second
 * half of a double tap and is ignored (B4). Playwright taps far faster than a person,
 * so wait this long before a tap that may land where the last one did.
 */
export const PAST_DOUBLE_TAP_MS = 350;

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
