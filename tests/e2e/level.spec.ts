/**
 * Piece C: World 1 level 1 on the phone profile, by touch.
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, openAndRun } from './helpers';

const run = (page: Page) => page.evaluate(() => window.__game!.run);

/** A real finger through the DevTools protocol, so it can stay down for a held jump. */
function finger(cdp: CDPSession) {
  return {
    down: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 220, id: 1 }] }),
    up: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

test('a bot plays level 1 by touch from the start to the boss fight with lives to spare', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await openAndRun(page);
  const level = await page.evaluate(() => window.__game!.level);
  const f = finger(await page.context().newCDPSession(page));

  // The bot reads what is ahead (potholes from the level data, hazards as they move)
  // and plays by touch: a held jump over every pothole and hazard, plus a second jump
  // at the top for potholes wider than a held jump can clear.
  let holding = false;
  let secondJump = false;
  let taps = 0;
  const seen = { lives: 3, foods: new Set<string>() };
  for (;;) {
    const s = await page.evaluate(() => ({ h: window.__game!.hero, r: window.__game!.run, screen: window.__game!.screen }));
    if (s.r.phase !== 'run' || s.screen !== 'play') break;
    if (s.r.power.corn) seen.foods.add('corn');
    if (s.r.power.amala) seen.foods.add('amala');
    if (s.r.power.shield) seen.foods.add('garri');
    seen.lives = s.r.lives;
    const { h } = s;
    if (holding) {
      if (h.vy >= 0) {
        await f.up();
        holding = false;
        if (secondJump) {
          await f.down();
          taps++;
          holding = true;
          secondJump = false;
        }
      }
      continue;
    }
    if (!h.grounded) continue;
    const gap = level.gaps.find(([a]) => a - h.x > -4 && a - h.x < 32);
    const hazard = s.r.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 0 && z.x - h.x < 80);
    if (gap || hazard) {
      await f.down();
      taps++;
      holding = true;
      secondJump = !!gap && gap[1] - gap[0] > 110;
    }
  }
  if (holding) await f.up();

  const end = await run(page);
  const hero = await page.evaluate(() => window.__game!.hero);
  console.log(`bot: reached ${end.phase} at x ${hero.x} in ${end.time.toFixed(1)} s of play, ${end.lives} lives, ${end.kobo} kobo, ${taps} presses, foods ${[...seen.foods].join(', ')}`);
  test.info().annotations.push({ type: 'level time', description: `${end.time.toFixed(1)} s` });
  expect(end.phase).toBe('arena');
  expect(hero.x).toBeGreaterThanOrEqual(level.arenaX);
  expect(end.lives).toBeGreaterThanOrEqual(1);
  expect(end.checkpoint).toBe(true);
  expect([...seen.foods].sort()).toEqual(['amala', 'corn', 'garri']);
  // The boss fight starts: the left light is lit and the arrival words show.
  await expect.poll(() => page.evaluate(() => window.__game!.boss?.lit)).toBe(0);
  await expect(page.getByText('General Go-Slow blocks the road! Jump onto the green light.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('out of lives: game over, then Play again starts the level fresh', async ({ page }) => {
  test.setTimeout(120_000);
  await openAndRun(page);
  // Never tap: the hero runs into the first pothole three times (no bus stop yet).
  await expect.poll(() => run(page).then((r) => r.lives), { timeout: 20_000 }).toBe(2);
  expect((await page.evaluate(() => window.__game!.hero)).x).toBeLessThan(400); // back at the start
  await expect(page.locator('.hud-lives')).toHaveText('♥ 2');
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 60_000 });
  const r = await run(page);
  expect(r.phase).toBe('over');
  expect(r.lives).toBe(0);
  await expect(over.getByText(`You got ${r.kobo} kobo. The road is still here. Try again!`)).toBeVisible();
  await expect(over.getByText('Want more tries? Gentle mode gives you 5 lives.')).toBeVisible();
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

test('gentle mode from the title gives 5 lives on the next run', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  expect(await run(page)).toMatchObject({ lives: 5, maxLives: 5 });
  await expect(page.locator('.hud-lives')).toHaveText('♥ 5');
});

test('HUD: lives, kobo going up, a spoken pause button and the sound button', async ({ page }) => {
  await openAndRun(page);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.locator('.hud-lives')).toHaveAttribute('aria-label', 'Lives: 3');
  // Kobo on the road at x 300: picked up by running.
  await expect(page.locator('.hud-kobo')).toHaveText('Kobo 5', { timeout: 5000 });
  await expect(page.getByText('Tap to jump.')).toBeVisible();
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

test('pause screen: Start the level again and Home', async ({ page }) => {
  await openAndRun(page);
  await expect.poll(() => run(page).then((r) => r.kobo)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause' }).tap();
  const card = page.getByRole('dialog', { name: 'Paused' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Start the level again' }).tap();
  expect(await run(page)).toMatchObject({ phase: 'run', lives: 3, kobo: 0 });
  expect(await page.evaluate(() => window.__game!.paused)).toBe(false);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Home' }).tap();
  await expect(page.getByRole('heading', { name: 'Gbese!' })).toBeVisible();
  await expect(page.locator('.hud')).toBeHidden();
});
