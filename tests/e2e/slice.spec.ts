/**
 * Piece E and the whole first slice, by touch on the phone profile, from a fresh visit:
 * build a hero, play level 1 with all three foods, beat General Go-Slow, see the win screen,
 * no network after load, then a reload offline brings back the saved hero and plays.
 */
import { expect, test } from '@playwright/test';
import { fightBoss, playStreet } from './bot';
import { PAST_DOUBLE_TAP_MS } from './helpers';

test('the first slice from a fresh visit: hero, level 1, all foods, General Go-Slow, win, offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const late: string[] = [];
  let loaded = false;
  context.on('request', (r) => {
    if (loaded) late.push(`${r.method()} ${r.url()}`);
  });

  // A fresh visit.
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForLoadState('networkidle');
  loaded = true;

  // Build a hero by touch.
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  const builder = page.getByRole('dialog', { name: 'Make your hero' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await builder.getByRole('button', { name: 'Skin tone 5' }).tap();
  await builder.getByRole('button', { name: 'Gele' }).tap();
  await builder.getByRole('button', { name: 'Ankara' }).tap();
  const look = { skin: 4, hair: 3, outfit: 1 };
  expect(await page.evaluate(() => window.__game!.look)).toEqual(look);
  await builder.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');

  // Collect every toast, to check the food words and the boss words.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __toasts: string[] }).__toasts = seen;
    const el = document.querySelector('.toast')!;
    new MutationObserver(() => {
      const t = el.textContent ?? '';
      if (el.classList.contains('show') && seen.at(-1) !== t) seen.push(t);
    }).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
  });

  const cdp = await context.newCDPSession(page);
  const streetPresses = await playStreet(page, cdp);
  const atArena = await page.evaluate(() => ({ r: window.__game!.run, h: window.__game!.hero }));
  expect(atArena.r.phase).toBe('arena');
  expect(atArena.r.lives).toBeGreaterThanOrEqual(1);

  const bossPresses = await fightBoss(page, cdp);
  const won = page.getByRole('dialog', { name: 'Road cleared!' });
  await expect(won).toBeVisible({ timeout: 10_000 });
  const end = await page.evaluate(() => window.__game!.run);
  console.log(`slice: won in ${end.time.toFixed(1)} s of play, ${end.lives} lives, ${end.kobo} kobo, ${streetPresses} + ${bossPresses} presses`);
  test.info().annotations.push({ type: 'slice time', description: `${end.time.toFixed(1)} s` });
  expect(end.phase).toBe('won');

  // The win screen, word for word (design.md: Screens, Win).
  const lifeWord = end.lives === 1 ? 'life' : 'lives';
  await expect(won.getByText(`You beat General Go-Slow with ${end.kobo} kobo and ${end.lives} ${lifeWord} left.`)).toBeVisible();
  await expect(won.getByText('More roads are coming soon.')).toBeVisible();
  await expect(won.getByText('Remember: a wrong premise often leads to a misleading conclusion.')).toBeVisible();
  await expect(won.getByRole('button', { name: 'Play again' })).toBeVisible();
  await expect(won.getByRole('button', { name: 'Home' })).toBeVisible();

  const toasts = await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
  for (const words of [
    'Garri, sugar and epa (groundnut)! A shield takes one hit for you.',
    'Roasted corn! You run faster for 6 seconds.',
    'Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through!',
    'General Go-Slow blocks the road! Jump onto the green light.',
    'Green light! 2 more.',
    'Green light! 1 more.',
    'Green light! The road is free!',
  ]) {
    expect(toasts, words).toContain(words);
  }

  // No network requests after the first load, all the way through.
  expect(late).toEqual([]);
  expect(errors).toEqual([]);

  // Offline: reload, the saved hero comes back and the game plays.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start running' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change hero' })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.look)).toEqual(look);
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(30);
  await page.touchscreen.tap(600, 150);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  expect(errors).toEqual([]);
});

test('Win screen buttons: Play again starts fresh, after a short tap lock', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('./');
  await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  const cdp = await page.context().newCDPSession(page);
  await playStreet(page, cdp);
  await fightBoss(page, cdp);
  const won = page.getByRole('dialog', { name: 'Road cleared!' });
  await expect(won).toBeVisible({ timeout: 10_000 });
  // An instant tap is ignored (0.4 s lock), a later one works.
  await won.getByRole('button', { name: 'Play again' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  if (await won.isVisible()) await won.getByRole('button', { name: 'Play again' }).tap();
  await expect(won).toBeHidden();
  expect(await page.evaluate(() => window.__game!.run)).toMatchObject({ phase: 'run', lives: 5, kobo: 0 });
});

test('slowed CPU: 4x in the boss fight, at least 30 fps', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('./');
  await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Make your hero' }).getByRole('button', { name: 'Start running' }).tap();
  const cdp = await page.context().newCDPSession(page);
  await playStreet(page, cdp);
  expect(await page.evaluate(() => window.__game!.run.phase)).toBe('arena');
  // qa: start measuring once the first throw is out, so the 6 s always has a throw on
  // screen (if the bot lands the first light before 2.0 s, the window could hold none).
  await expect.poll(() => page.evaluate(() => window.__game!.boss?.throws.length ?? 0), { intervals: [16], timeout: 5000 }).toBeGreaterThan(0);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let sample: { fps: number; stepsPerSec: number; throws: number };
  try {
    // Measure 6 s of the fight while the bot plays it (throws, lights, boss, HUD all drawn).
    const measuring = page.evaluate(
      () =>
        new Promise<{ fps: number; stepsPerSec: number; throws: number }>((done) => {
          let frames = 0;
          let t0 = 0;
          let maxThrows = 0;
          const s0 = window.__game!.steps;
          const f = (now: number): void => {
            if (!t0) t0 = now;
            frames++;
            maxThrows = Math.max(maxThrows, window.__game!.boss?.throws.length ?? 0);
            if (now - t0 < 6000) requestAnimationFrame(f);
            else done({ fps: ((frames - 1) * 1000) / (now - t0), stepsPerSec: ((window.__game!.steps - s0) * 1000) / (now - t0), throws: maxThrows });
          };
          requestAnimationFrame(f);
        }),
    );
    void fightBoss(page, cdp).catch(() => {});
    sample = await measuring;
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  console.log(`4x CPU in the boss fight: ${sample.fps.toFixed(1)} fps, ${sample.stepsPerSec.toFixed(1)} steps/s, up to ${sample.throws} throws on screen`);
  test.info().annotations.push({ type: 'boss fps 4x', description: sample.fps.toFixed(1) });
  expect(sample.throws).toBeGreaterThan(0);
  expect(sample.fps).toBeGreaterThanOrEqual(30);
});
