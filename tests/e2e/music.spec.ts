/**
 * O2: the music player in the game (docs/design.md S2.9). Reads window.__game.music:
 * `on` (the Music switch), `audible` (Music and Sound both on), `place` (the tune asked for),
 * `held` (Pause or a hidden page), `started` (the first tap opened the audio).
 */
import { expect, test, type Page } from '@playwright/test';
import { waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

const music = (page: Page) => page.evaluate(() => window.__game!.music);

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

/** Opens the game with a saved hero on the title. */
async function openSaved(page: Page): Promise<void> {
  await page.goto('./');
  await page.evaluate((look) => localStorage.setItem('gidi-look', look), LOOK);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Gbese!' })).toBeVisible();
}

test('music: starts on the first tap, follows the street, holds on Pause and carries on', async ({ page }) => {
  const errors = watchErrors(page);
  await openSaved(page);
  // Nothing plays before a tap: the title asks for the menu tune, but no audio is open yet.
  expect(await music(page)).toMatchObject({ on: true, audible: true, place: 'menu', started: false });
  await page.getByRole('heading', { name: 'Gbese!' }).tap();
  await expect.poll(async () => (await music(page)).started).toBe(true);
  expect((await music(page)).place).toBe('menu');
  // Play: street 1 (no street done yet) plays the street tune at its first tempo.
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await expect.poll(async () => (await music(page)).place).toBe('street');
  expect(await music(page)).toMatchObject({ tempo: 0, held: false });
  // Pause holds the tune; Keep playing lets it go on.
  await page.keyboard.press('KeyP');
  const card = page.getByRole('dialog', { name: 'Paused' });
  await expect(card).toBeVisible();
  expect(await music(page)).toMatchObject({ place: 'street', held: true });
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Keep playing' }).tap();
  await expect(card).toBeHidden();
  expect(await music(page)).toMatchObject({ place: 'street', held: false });
  // Home: back to the menu tune.
  await page.keyboard.press('KeyP');
  await waitOutTapLock(page);
  await card.getByRole('button', { name: 'Home' }).tap();
  await expect.poll(async () => (await music(page)).place).toBe('menu');
  expect(errors).toEqual([]);
});

test('music: the Sound switch silences music too; Music keeps its own switch', async ({ page }) => {
  await openSaved(page);
  await page.getByRole('button', { name: 'Sound: on' }).tap();
  expect(await music(page)).toMatchObject({ on: true, audible: false });
  await page.getByRole('button', { name: 'Sound: off' }).tap();
  expect(await music(page)).toMatchObject({ on: true, audible: true });
  await page.getByRole('button', { name: 'Music: on' }).tap();
  expect(await music(page)).toMatchObject({ on: false, audible: false });
  expect(await page.evaluate(() => window.__game!.sound.enabled)).toBe(true);
});

test('music: the M key switches it, the title switch shows it, and it is saved', async ({ page }) => {
  await openSaved(page);
  await page.keyboard.press('KeyM');
  await expect(page.getByRole('button', { name: 'Music: off' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gidi-music'))).toBe('false');
  await page.keyboard.press('KeyM');
  await expect(page.getByRole('button', { name: 'Music: on' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gidi-music'))).toBe('true');
  // In play, M works too, and Pause shows the new state.
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await page.keyboard.press('KeyM');
  expect((await music(page)).on).toBe(false);
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Music: off' })).toBeVisible();
});

test('music: Music off stays off after a reload, on the title and in a run', async ({ page }) => {
  const errors = watchErrors(page);
  await openSaved(page);
  await page.getByRole('button', { name: 'Music: on' }).tap();
  await expect(page.getByRole('button', { name: 'Music: off' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Music: off' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gidi-music'))).toBe('false');
  await page.getByRole('heading', { name: 'Gbese!' }).tap();
  await expect.poll(async () => (await music(page)).started).toBe(true);
  expect(await music(page)).toMatchObject({ on: false, audible: false });
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(10);
  expect(await music(page)).toMatchObject({ on: false, audible: false });
  // Sound effects still follow only the Sound switch.
  expect(await page.evaluate(() => window.__game!.sound.enabled)).toBe(true);
  expect(errors).toEqual([]);
});
