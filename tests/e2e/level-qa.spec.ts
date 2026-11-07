/**
 * qa C7 and D4: world 1 level 1 and the three foods, by touch on the phone profile.
 * Words are checked exactly against docs/design.md (Power-ups, Screens).
 *
 * Screenshots for the originality check go to $QA_SHOTS (default test-results/qa-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, openAndRun, startRun } from './helpers';

const SHOTS = process.env['QA_SHOTS'] ?? 'test-results/qa-shots';
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

const DESIGN = {
  corn: 'Roasted corn! You run faster for 6 seconds.',
  garri: 'Garri, sugar and epa (groundnut)! A shield takes one hit for you.',
  amala: 'Amala, gbegiri and ewedu! Super strong for 7 seconds. Smash through!',
  cornOff: 'Corn is wearing off!',
  amalaOff: 'Amala is wearing off!',
  shieldUsed: 'Shield used up!',
};

const state = (page: Page) =>
  page.evaluate(() => ({ h: window.__game!.hero, r: window.__game!.run, screen: window.__game!.screen, steps: window.__game!.steps }));

/** A real finger through the DevTools protocol, so it can stay down for a held jump. */
function finger(cdp: CDPSession) {
  return {
    down: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 220, id: 1 }] }),
    up: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

/** Logs every toast and every change of the HUD food slot, with the physics step it happened on. */
async function watchWords(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log: { kind: 'toast' | 'hud'; text: string; step: number; blink?: boolean }[] = [];
    (window as unknown as { __words: typeof log }).__words = log;
    const toast = document.querySelector('.toast')!;
    let lastToast = '';
    new MutationObserver(() => {
      const t = toast.classList.contains('show') ? (toast.textContent ?? '') : '';
      if (t && t !== lastToast) log.push({ kind: 'toast', text: t, step: window.__game!.steps });
      lastToast = t;
    }).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });
    const hud = document.querySelector('.hud')!;
    let lastHud = '';
    new MutationObserver(() => {
      const slots = [...hud.querySelectorAll<HTMLElement>('.hud-food')].filter((s) => !s.hidden);
      const text = slots.map((s) => s.textContent).join(' + ');
      const blink = slots.some((s) => s.classList.contains('blink'));
      const key = `${text}|${blink}`;
      if (key !== lastHud) log.push({ kind: 'hud', text, step: window.__game!.steps, blink });
      lastHud = key;
    }).observe(hud, { attributes: true, childList: true, characterData: true, subtree: true });
  });
}
const words = (page: Page) =>
  page.evaluate(() => (window as unknown as { __words: { kind: 'toast' | 'hud'; text: string; step: number; blink?: boolean }[] }).__words);

interface BotOpts {
  /** Hazards (by start x) the bot lets reach it instead of jumping. */
  letHit?: (x0: number) => boolean;
  /** Potholes (by left edge) the bot does not jump. */
  skipGap?: (a: number) => boolean;
  /** Stop when this is true. */
  until?: (s: Awaited<ReturnType<typeof state>>) => boolean;
  /** Called on every poll; may do things (screenshots, pause). */
  onPoll?: (s: Awaited<ReturnType<typeof state>>) => Promise<void>;
  /** Timing error, ms: every press lands up to this early or late. */
  jitterMs?: number;
  seed?: number;
}

/**
 * A sloppy player by touch: sees each pothole and hazard, means to jump at the right moment,
 * but each press (and each second jump) lands up to jitterMs early or late. Held jumps;
 * a second jump near the top for potholes wider than a held jump clears.
 */
async function playByTouch(page: Page, opts: BotOpts = {}): Promise<{ presses: number; last: Awaited<ReturnType<typeof state>> }> {
  const level = await page.evaluate(() => window.__game!.level);
  const f = finger(await page.context().newCDPSession(page));
  const jitter = opts.jitterMs ?? 80;
  let seed = opts.seed ?? 1;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let holding = false;
  let second = false;
  let presses = 0;
  const handled = new Set<string>();
  let lastLives = 99;
  let s = await state(page);
  for (;;) {
    s = await state(page);
    if (s.r.phase !== 'run' || s.screen !== 'play' || opts.until?.(s)) break;
    if (opts.onPoll) {
      await opts.onPoll(s);
      s = await state(page);
      if (s.r.phase !== 'run' || s.screen !== 'play') break;
    }
    // A fall sends the hero back: forget potholes and hazards (they come back, Q14).
    if (s.r.lives < lastLives) handled.clear();
    lastLives = s.r.lives;
    const { h } = s;
    const speed = s.r.power.corn > 0 ? 228 : 156;
    if (holding) {
      // About jitter ms before the top (rising under hold gravity, 1152 u/s²), then a random wait.
      if (h.vy >= -1152 * (jitter / 1000)) {
        if (second) {
          await page.waitForTimeout(rand() * 2 * jitter);
          await f.up();
          await f.down();
          presses++;
          second = false;
          continue;
        }
        if (h.vy >= 0) {
          await f.up();
          holding = false;
        }
      }
      continue;
    }
    if (!h.grounded) continue;
    if (h.x < 0) continue;
    const early = (jitter / 1000) * speed;
    const gap = level.gaps.find(([a]) => !handled.has(`g${a}`) && a - h.x > -4 && a - h.x < 16 + early);
    const z = s.r.hazards.find(
      (q, i) => !handled.has(`z${i}`) && (q.mode === 'wait' || q.mode === 'move') && q.x - h.x > 0 && q.x - h.x < 80 + (jitter / 1000) * (speed + 60),
    );
    if (gap && opts.skipGap?.(gap[0])) {
      handled.add(`g${gap[0]}`);
      continue;
    }
    if (gap || z) {
      const zi = z ? s.r.hazards.indexOf(z) : -1;
      if (z && opts.letHit && opts.letHit(HAZARD_X0[zi]!)) {
        handled.add(`z${zi}`);
        if (!gap) continue;
      }
      await page.waitForTimeout(rand() * 2 * jitter);
      await f.down();
      presses++;
      holding = true;
      second = !!gap && gap[1] - gap[0] > 110;
      if (gap) handled.add(`g${gap[0]}`);
      if (z) handled.add(`z${zi}`);
    }
  }
  if (holding) await f.up();
  return { presses, last: s };
}
/** Hazard start x in level order (src/data/levels/w1-l1.json). */
const HAZARD_X0 = [4950, 5450, 6400, 8900, 10000, 10300, 10550];

test('C7/D4: a sloppy player (+/- 80 ms) plays level 1 by touch, gets all three foods with the exact words, no network', async ({ page, context }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const late: string[] = [];
  let loaded = false;
  context.on('request', (r) => {
    if (loaded) late.push(`${r.method()} ${r.url()}`);
  });
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForLoadState('networkidle');
  loaded = true;
  await startRun(page);
  expect(await page.evaluate(() => window.__game!.run.hazards.map((z) => z.x))).toEqual(HAZARD_X0);
  await watchWords(page);

  const taken = new Set<string>();
  let pausedOnCorn = false;
  const at = async (s: Awaited<ReturnType<typeof state>>, x: number, name: string): Promise<void> => {
    if (s.h.x >= x && !taken.has(name)) {
      taken.add(name);
      await shot(page, name);
    }
  };
  const { last } = await playByTouch(page, {
    seed: 42,
    // Spend the garri shield on the goat at 6400, as the design means.
    letHit: (x0) => x0 === 6400,
    onPoll: async (s) => {
      await at(s, 300, 'c7-street-start');
      await at(s, 4700, 'c7-goat-ahead');
      await at(s, 5230, 'c7-tyre-ahead');
      await at(s, 5450, 'c7-bus-stop');
      await at(s, 5700, 'd4-garri-on-road');
      await at(s, 6000, 'd4-hud-shield');
      await at(s, 6950, 'd4-corn-on-road');
      await at(s, 7250, 'd4-hud-fast-speed-lines');
      await at(s, 9520, 'd4-amala-on-road');
      await at(s, 9850, 'd4-hud-strong-glow');
      // Break it: pause mid-air while corn runs; the corn timer must not run down while paused.
      if (!pausedOnCorn && s.r.power.corn > 0 && !s.h.grounded && s.h.x > 7600) {
        pausedOnCorn = true;
        await page.getByRole('button', { name: 'Pause' }).tap();
        const card = page.getByRole('dialog', { name: 'Paused' });
        await expect(card).toBeVisible();
        const a = await state(page);
        await shot(page, 'c7-pause-screen');
        await page.waitForTimeout(1500);
        const b = await state(page);
        expect(b.r.power.corn).toBe(a.r.power.corn);
        expect(b.h).toEqual(a.h);
        expect(b.steps).toBe(a.steps);
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        await card.getByRole('button', { name: 'Keep running' }).tap();
        await expect(card).toBeHidden();
      }
    },
  });
  const end = await state(page);
  const log = await words(page);
  console.log(`sloppy touch bot: ${end.r.phase} at x ${end.h.x}, ${end.r.time.toFixed(1)} s, ${end.r.lives} lives, ${end.r.kobo} kobo`);
  expect(last).toBeTruthy();
  expect(pausedOnCorn).toBe(true);

  // Reached the arena without running out of lives.
  expect(end.r.phase).toBe('arena');
  expect(end.r.lives).toBeGreaterThanOrEqual(1);
  // gamedev (piece E): the placeholder card is gone; the boss fight starts instead.
  await expect.poll(() => page.evaluate(() => window.__game!.boss?.lit)).toBe(0);

  // Every food: its toast word for word, in level order, plus the shield and wearing-off toasts.
  const toasts = log.filter((l) => l.kind === 'toast').map((l) => l.text);
  const order = [DESIGN.garri, DESIGN.shieldUsed, DESIGN.corn, DESIGN.cornOff, DESIGN.amala, DESIGN.amalaOff];
  const idx = order.map((w) => toasts.indexOf(w));
  expect(idx.every((i) => i >= 0), `toasts seen: ${JSON.stringify(toasts)}`).toBe(true);
  expect([...idx].sort((a, b) => a - b)).toEqual(idx);

  // HUD: "Shield" until the goat, then gone; "Fast 6" down to "Fast 1", "Strong 7" down to "Strong 1".
  const hud = log.filter((l) => l.kind === 'hud');
  const hudTexts = hud.map((l) => l.text);
  for (const w of ['Shield', 'Fast 6', 'Fast 5', 'Fast 4', 'Fast 3', 'Fast 2', 'Fast 1', 'Strong 7', 'Strong 6', 'Strong 5', 'Strong 4', 'Strong 3', 'Strong 2', 'Strong 1']) {
    expect(hudTexts, `HUD never showed "${w}"`).toContain(w);
  }
  // The last 2 s blink; before that they do not.
  for (const [w, blink] of [['Fast 3', false], ['Fast 2', true], ['Fast 1', true], ['Strong 3', false], ['Strong 2', true], ['Strong 1', true]] as const) {
    expect(hud.filter((l) => l.text === w).every((l) => l.blink === blink), `${w} blink`).toBe(true);
  }
  // Ends on time: counted in physics steps (60 a second), from the HUD showing to the HUD clearing.
  const lasted = (first: string, prefix: string): number => {
    const s0 = hud.find((l) => l.text === first)!.step;
    const s1 = hud.find((l) => l.step > s0 && !l.text.includes(prefix))!.step;
    return (s1 - s0) / 60;
  };
  const cornS = lasted('Fast 6', 'Fast');
  const amalaS = lasted('Strong 7', 'Strong');
  console.log(`corn lasted ${cornS.toFixed(2)} s, amala ${amalaS.toFixed(2)} s (HUD, in game time)`);
  expect(Math.abs(cornS - 6)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(amalaS - 7)).toBeLessThanOrEqual(0.1);
  // The shield took the goat at 6400: "Shield" left the HUD with no life lost there.
  const shieldGone = hud.find((l, i) => i > 0 && hud[i - 1]!.text === 'Shield' && l.text === '')!;
  expect(shieldGone).toBeTruthy();

  expect(late).toEqual([]);
  expect(errors).toEqual([]);
});

test('C7 Q14: a fall after the bus stop: back at the bus stop, garri comes back, kobo stay counted', async ({ page }) => {
  test.setTimeout(120_000);
  await openAndRun(page);
  await watchWords(page);
  // Jump everything; leave the 50 pothole at 6700 alone.
  await playByTouch(page, { jitterMs: 0, skipGap: (a) => a === 6700, until: (s) => s.r.lives < 3 });
  await expect.poll(() => page.evaluate(() => window.__game!.run.lives)).toBe(2);
  const after = await state(page);
  expect(after.h.x).toBeLessThan(5700);
  expect(after.h.x).toBeGreaterThanOrEqual(5600);
  expect(after.r.checkpoint).toBe(true);
  expect(after.r.power).toEqual({ corn: 0, amala: 0, shield: false });
  await expect(page.locator('.hud-lives')).toHaveText('♥ 2');
  const kobo = after.r.kobo;
  // Run on through the garri again: the coins from 5600 to 6000 were taken, so the count stays.
  await expect.poll(() => page.evaluate(() => window.__game!.hero.x), { timeout: 10_000 }).toBeGreaterThan(6000);
  const again = await state(page);
  expect(again.r.kobo).toBe(kobo);
  expect(again.r.power.shield).toBe(true);
  await expect(page.locator('.hud-food:not([hidden])')).toHaveText('Shield');
  const toasts = (await words(page)).filter((l) => l.kind === 'toast').map((l) => l.text);
  expect(toasts.filter((t) => t === DESIGN.garri)).toHaveLength(2);
  // Hazards past the bus stop came back: the goat at 6400 is waiting there again.
  const goat = (await state(page)).r.hazards[2]!;
  expect(goat.kind).toBe('goat');
  expect(['wait', 'move']).toContain(goat.mode);

  // Break it: turn the phone upright with the shield on, then back: paused, nothing lost.
  const vp = page.viewportSize()!;
  const before = await state(page);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(true);
  await page.waitForTimeout(1000);
  await page.setViewportSize(vp);
  const card = page.getByRole('dialog', { name: 'Paused' });
  await expect(card).toBeVisible();
  const still = await state(page);
  expect(still.r.power.shield).toBe(true);
  expect(still.r.lives).toBe(before.r.lives);
  expect(still.h.x - before.h.x).toBeLessThan(20); // a frame or two before the pause, no more
  await card.getByRole('button', { name: 'Keep running' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.hero.x)).toBeGreaterThan(still.h.x);
});

test('C7 slowed CPU: 4x through the whole level by touch, at least 30 fps in every part', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('./');
  // Gentle mode, so a missed jump on a slow machine does not end the measurement early.
  await page.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' }).tap();
  await startRun(page);
  await page.evaluate(() => {
    const log: [number, number][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const f = (now: number): void => {
      log.push([now, window.__game!.hero.x]);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await playByTouch(page, { jitterMs: 0 });
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number][] }).__frames);
  const end = await state(page);
  // fps for each 1000 u of road (frames whose hero x is in that stretch, time they span).
  const parts: string[] = [];
  let worst = Infinity;
  for (let x = 0; x < 11000; x += 1000) {
    const fr = frames.filter(([, hx]) => hx >= x && hx < x + 1000);
    if (fr.length < 10) continue;
    const fps = ((fr.length - 1) * 1000) / (fr.at(-1)![0] - fr[0]![0]);
    worst = Math.min(worst, fps);
    parts.push(`${x}: ${fps.toFixed(1)}`);
  }
  console.log(`4x CPU, fps by part of the level: ${parts.join(', ')}. Reached ${end.r.phase} at x ${end.h.x.toFixed(0)}, ${end.r.lives} lives`);
  expect(end.r.phase).toBe('arena');
  expect(worst).toBeGreaterThanOrEqual(30);
});

test('C7 break it: last life lost in the pothole just past the bus stop, shield or not: game over, then Play again from the start', async ({ page }) => {
  test.setTimeout(120_000);
  await openAndRun(page);
  // Let the goat at 4950 and the tyre at 5450 hit (2 lives gone), pick up garri, jump the
  // goat at 6400, then miss the 50 pothole at 6700 on the last life.
  await playByTouch(page, { jitterMs: 0, letHit: (x0) => x0 === 4950 || x0 === 5450, skipGap: (a) => a === 6700 });
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 30_000 });
  const r = (await state(page)).r;
  expect(r).toMatchObject({ phase: 'over', lives: 0, checkpoint: true });
  // The garri shield did not save a pothole fall (design: no food saves you from a pothole).
  await expect(over.getByText(`You got ${r.kobo} kobo. The road is still here. Try again!`)).toBeVisible();
  await expect(over.getByRole('heading', { name: 'Out of lives' })).toBeVisible();
  await shot(page, 'c7-game-over');
  // A tap on "Play again" straight away (a jump tap that arrived late) does nothing.
  await over.getByRole('button', { name: 'Play again' }).tap();
  // It may or may not land inside the 400 ms guard on a slow machine; either way the screen
  // must be sane: game over, or a fresh run.
  const screen = await page.evaluate(() => window.__game!.screen);
  if (screen === 'gameover') {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS + 100);
    await over.getByRole('button', { name: 'Play again' }).tap();
  }
  await expect(over).toBeHidden();
  const fresh = await state(page);
  // Play again starts from the beginning, not the bus stop.
  expect(fresh.r).toMatchObject({ phase: 'run', lives: 3, maxLives: 3, kobo: 0, checkpoint: false });
  expect(fresh.r.power).toEqual({ corn: 0, amala: 0, shield: false });
  expect(fresh.h.x).toBeLessThan(150);
  await expect(page.locator('.hud-lives')).toHaveText('♥ 3');
  await expect(page.locator('.hud-food:not([hidden])')).toHaveCount(0);
});

test('C7 gentle mode: switched on from the game over screen, the next run has 5 lives and loses all 5', async ({ page }) => {
  test.setTimeout(150_000);
  await openAndRun(page);
  // Never tap: three falls at the first pothole.
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS + 100);
  const sw = over.getByRole('switch', { name: 'Gentle mode: 5 lives instead of 3' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.tap();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await over.getByRole('button', { name: 'Play again' }).tap();
  expect((await state(page)).r).toMatchObject({ lives: 5, maxLives: 5, kobo: 0 });
  await expect(page.locator('.hud-lives')).toHaveText('♥ 5');
  // Remembered on the phone.
  expect(await page.evaluate(() => localStorage.getItem('gidi-gentle') ?? JSON.stringify(localStorage))).toMatch(/true/);
  // Never tap: five falls, then game over; the offer to turn gentle mode on is gone.
  await expect(over).toBeVisible({ timeout: 100_000 });
  expect((await state(page)).r.lives).toBe(0);
  await expect(over.getByText('Want more tries? Gentle mode gives you 5 lives.')).toHaveCount(0);
  // Not mid-level (Q15): the pause screen has no gentle switch.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS + 100);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0);
});

test('C7 bounce: landing on the goat and on the tyre by touch bounces, costs nothing, the goat runs off', async ({ page }) => {
  test.setTimeout(90_000);
  await openAndRun(page);
  const f = finger(await page.context().newCDPSession(page));
  const level = await page.evaluate(() => window.__game!.level);
  const bounced: string[] = [];
  // Clear the potholes with held jumps; for the goat and tyre, a short tap timed to come down on top.
  let holding = false;
  let second = false;
  const done = new Set<number>();
  for (;;) {
    const s = await state(page);
    if (s.r.phase !== 'run' || s.h.x > 5600) break;
    const goat = s.r.hazards[0]!;
    const tyre = s.r.hazards[1]!;
    if (goat.mode === 'runAway' && !bounced.includes('goat')) {
      bounced.push('goat');
      await shot(page, 'c7-goat-runs-off-after-bounce');
    }
    if (tyre.mode === 'gone' && !bounced.includes('tyre') && s.h.x < tyre.x + 200) bounced.push('tyre');
    if (holding) {
      if (s.h.vy >= 0) {
        await f.up();
        holding = false;
        if (second) {
          await f.down();
          holding = true;
          second = false;
        }
      }
      continue;
    }
    if (!s.h.grounded) continue;
    const gap = level.gaps.find(([a]) => a - s.h.x > -4 && a - s.h.x < 32);
    if (gap) {
      await f.down();
      holding = true;
      second = gap[1] - gap[0] > 110;
      continue;
    }
    // A quick tap (finger straight up again), as in the unit test: goat 90 u ahead, tyre 100.
    for (const [k, z, lead] of [[0, goat, 92], [1, tyre, 102]] as const) {
      if (!done.has(k) && z.mode === 'move' && z.x - s.h.x < lead) {
        done.add(k);
        await f.down();
        await f.up();
      }
    }
  }
  const r = (await state(page)).r;
  console.log(`bounce run: ${JSON.stringify(r.hazards.slice(0, 2))}, lives ${r.lives}`);
  expect(bounced).toEqual(['goat', 'tyre']);
  expect(r.lives).toBe(3);
  expect(r.hazards[0]!.mode).toMatch(/runAway|gone/); // the goat ran off, unhurt
  expect(r.hazards[1]!.mode).toBe('gone');
});

test('originality: the art gallery on the phone profile', async ({ page }) => {
  await page.goto('./?gallery');
  await page.waitForTimeout(800);
  await shot(page, 'gallery');
});
