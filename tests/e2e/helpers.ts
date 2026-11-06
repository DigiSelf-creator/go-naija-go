import { expect, type Page } from '@playwright/test';

/**
 * From the title screen into a run, by touch: "Make your hero" then "Start running" on a
 * first visit, or straight "Start running" when a hero is saved.
 */
export async function startRun(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Make your hero|Start running)$/ }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  if (await builder.isVisible()) await builder.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game?.screen)).toBe('play');
}

/** Opens the game and starts a run. */
export async function openAndRun(page: Page): Promise<void> {
  await page.goto('./');
  await startRun(page);
}
