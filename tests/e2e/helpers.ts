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

/** The screen showing now ('play' in a run). */
export const screenNow = (page: Page): Promise<string | null | undefined> => page.evaluate(() => window.__game?.screen);

/**
 * Slice 3 (city.md (a)): the intro story plays once before the builder on a first visit, and once
 * on the next "Play" for a hero saved before it. If it is showing, tap Skip.
 */
export async function skipIntro(page: Page): Promise<void> {
  await expect.poll(() => screenNow(page)).not.toBe('title');
  if ((await screenNow(page)) !== 'intro') return;
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).not.toBe('intro');
}

/** Slice 3 (city.md (b)): from Lagos from above into street 1, by the Potholes pin and "Run Alausa". */
export async function cityToStreet1(page: Page): Promise<void> {
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Potholes, problem' }).tap();
  await page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'Run Alausa' }).tap();
}

/**
 * From the title screen into a run, by touch: "Make your hero" (then the intro, skipped) and
 * "Start running" on a first visit, or "Play" when a hero is saved. Slice 3: with no ?level
 * these open Lagos from above, and the Potholes pin's "Run Alausa" starts street 1.
 */
export async function startRun(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Make your hero|Play)$/ }).tap();
  await skipIntro(page);
  if ((await screenNow(page)) === 'builder') {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
    await expect.poll(() => screenNow(page)).not.toBe('builder');
  }
  if ((await screenNow(page)) === 'city') await cityToStreet1(page);
  await expect.poll(() => screenNow(page)).toBe('play');
}


/** Opens the game (street 1 by hand, or `url`) and starts a run. */
export async function openAndRun(page: Page, url = './'): Promise<void> {
  await page.goto(url);
  await startRun(page);
}

/**
 * Slice 3 (city.md (a)): for tests about other screens, mark the intro story as seen before the
 * page loads, so "Make your hero" opens the builder as before. Set only when nothing is saved
 * under gidi-intro yet (a test may still clear or block storage itself).
 */
export async function storySeen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (localStorage.getItem('gidi-intro') === null) localStorage.setItem('gidi-intro', '"seen"');
    } catch {
      /* storage blocked: the story shows; the test skips it */
    }
  });
}
