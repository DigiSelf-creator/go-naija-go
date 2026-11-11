/**
 * Piece C on the phone profile, by touch. Slice 2: lives, the HUD and pause on street 1 by
 * hand (lagos-1). The slice 1 level bot went with w1-l1 (piece M2).
 */
import { expect, test, type Page } from '@playwright/test';
import { LEFT, buttonCentres, hands } from './hands';
import { PAST_DOUBLE_TAP_MS, openAndRun, gentleOn, storySeen, screenNow } from './helpers';
import { formatMoney } from '../../src/game/money';

// Slice 3 (city.md (a)): the intro story is not what these tests are about; it is marked seen.
test.beforeEach(({ page }) => storySeen(page));

/** Street 1: a thumb on Forward. */
async function holdForward(page: Page) {
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  return h;
}

const run = (page: Page) => page.evaluate(() => window.__game!.run);

test('out of lives: game over, then Play again starts the level fresh', async ({ page }) => {
  test.setTimeout(120_000);
  await openAndRun(page);
  // Hold Forward and never jump: the hero runs into the first pothole three times (no bus stop yet).
  const h = await holdForward(page);
  await expect.poll(() => run(page).then((r) => r.lives), { timeout: 25_000 }).toBe(2);
  expect((await page.evaluate(() => window.__game!.hero)).x).toBeLessThan(400); // back at the start
  await expect(page.locator('.hud-lives')).toHaveText('♥ 2');
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 60_000 });
  await h.upAll();
  const r = await run(page);
  expect(r.phase).toBe('over');
  expect(r.lives).toBe(0);
  // N2 (slice 3): money words, a coin is 10 kobo.
  await expect(over.getByText(`You got ${formatMoney(r.kobo * 10)}. The street is still here. Try again!`)).toBeVisible();
  await expect(over.getByText('Want more tries? Gentle mode gives you 5 lives, and you climb out of holes.')).toBeVisible();
  // Taps meant as jumps do nothing to a stopped run.
  const steps = await page.evaluate(() => window.__game!.steps);
  await page.touchscreen.tap(30, 30);
  expect(await page.evaluate(() => window.__game!.steps)).toBe(steps);

  await page.waitForTimeout(PAST_DOUBLE_TAP_MS + 100);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect(over).toBeHidden();
  const fresh = await run(page);
  expect(fresh).toMatchObject({ phase: 'run', lives: 3, maxLives: 3, kobo: 0, checkpoint: false });
  expect((await page.evaluate(() => window.__game!.hero)).x).toBeLessThan(120);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.locator('.hud-kobo')).toHaveText(/^Kobo \d+$/);
});

test('gentle mode from Settings gives 5 lives on the next run', async ({ page }) => {
  // Slice 3: Gentle mode is in Settings; ?level=lagos-1 starts street 1 from the builder.
  await page.goto('./?level=lagos-1');
  await gentleOn(page);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  expect(await run(page)).toMatchObject({ lives: 5, maxLives: 5 });
  await expect(page.locator('.hud-lives')).toHaveText('♥ 5');
});

test('gentle mode: a pothole fall climbs out just before it, with a hint (S2.13 part 5)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./?level=lagos-1');
  await gentleOn(page);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  // Hold Forward and never jump: the hero walks into the first pothole (30 u wide, left lip 2450).
  const h = await holdForward(page);
  const back = await page.waitForFunction(() => (window.__game!.run.lives === 4 ? window.__game!.hero.x : null), null, { timeout: 30_000 });
  expect(await back.jsonValue()).toBe(2350); // 100 u before the lip, not back at the start
  await expect(page.getByText('Up you come! Try that jump again.')).toBeVisible();
  await expect(page.locator('.hud-lives')).toHaveText('♥ 4');
  await h.upAll();
});

test('HUD: lives, kobo going up, a spoken pause button and the sound button', async ({ page }) => {
  await openAndRun(page);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.locator('.hud-lives')).toHaveAttribute('aria-label', 'Lives: 3');
  // The first hint shows 0.5 s after the start, in touch words.
  await expect(page.getByText('Hold \u2192 to walk. Hold on to run.')).toBeVisible();
  // Kobo on the road at x 300: picked up by walking there.
  const h = await holdForward(page);
  await expect(page.locator('.hud-kobo')).toHaveText('Kobo 5', { timeout: 5000 });
  await h.upAll();
  for (const b of await page.locator('.hud button').all()) {
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const soundBtn = page.getByRole('button', { name: 'Sound: on' });
  await soundBtn.tap();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.sound.enabled)).toBe(false);
  // Tapping HUD buttons never jumps.
  expect((await page.evaluate(() => window.__game!.hero)).grounded).toBe(true);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  // Remembered on the phone.
  expect(await page.evaluate(() => localStorage.getItem('gidi-sound'))).toBe('false');
});

test('sound starts only after the first tap', async ({ page }) => {
  await page.goto('./');
  expect(await page.evaluate(() => window.__game!.sound.started)).toBe(false);
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  expect(await page.evaluate(() => window.__game!.sound.started)).toBe(true);
});

test('pause screen: Start again and Home', async ({ page }) => {
  await openAndRun(page);
  const h = await holdForward(page);
  await expect.poll(() => run(page).then((r) => r.kobo)).toBeGreaterThan(0);
  await h.upAll();
  await page.getByRole('button', { name: 'Pause' }).tap();
  const card = page.getByRole('dialog', { name: 'Paused' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Start again' }).tap();
  expect(await run(page)).toMatchObject({ phase: 'run', lives: 3, kobo: 0 });
  expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Home' }).tap();
  // Slice 3 (city.md (b)): Home is Lagos from above.
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(page.locator('.hud')).toBeHidden();
});
