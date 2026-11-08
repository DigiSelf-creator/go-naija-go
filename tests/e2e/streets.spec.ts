/**
 * K2 on the phone profile, by touch: Lagos streets 2 (Market road) and 3 (Bus park road) played
 * by hand with two thumbs from the start to the bus, knocking every crate, with the Street
 * cleared screen and "Next street" between them (docs/design.md S2.6, S2.10). Street 3 first
 * walks back to its secret well. On every drawn frame the hint bar covers nothing playable.
 * Screenshots of each street's own look go to $K2_SHOTS (default test-results/k2-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { LEFT, buttonCentres, hands, playStreetByHand, snap, type Snap } from './hands';
import { PAST_DOUBLE_TAP_MS, startRun, waitOutTapLock } from './helpers';

const SHOTS = process.env['K2_SHOTS'] ?? 'test-results/k2-shots';
mkdirSync(SHOTS, { recursive: true });

/** On every drawn frame while a hint shows: anything playable under the bar (S2.2 hint bar rule). */
async function watchBar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log = { frames: 0, hits: [] as string[], words: [] as string[] };
    (window as unknown as { __bar: typeof log }).__bar = log;
    const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const frame = (): void => {
      const g = window.__game!;
      const bar = g.hintBar;
      if (bar.words && g.screen === 'play') {
        log.frames++;
        if (!log.words.includes(bar.words)) log.words.push(bar.words);
        for (const d of g.drawn) if (hit(bar, d) && log.hits.length < 20) log.hits.push(`${d.what} at step ${g.steps} under "${bar.words}"`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const barLog = (page: Page) => page.evaluate(() => (window as unknown as { __bar: { frames: number; hits: string[]; words: string[] } }).__bar);

/** Pictures of a street's parts: one when the hero first passes each x. */
function shooter(page: Page, street: string, parts: readonly (readonly [number, string])[]) {
  const done = new Set<number>();
  return async (s: Snap): Promise<void> => {
    for (const [x, name] of parts) {
      if (done.has(x) || s.h.x < x) continue;
      done.add(x);
      await page.screenshot({ path: join(SHOTS, `${street}-${name}.png`) });
    }
  };
}

/** Plays the street now showing to the bus by hand, opening every crate; returns what happened. */
async function playToBus(page: Page, street: string, parts: readonly (readonly [number, string])[], extra?: (s: Snap) => Promise<void>) {
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const act = await crateActor(page, crates);
  const shoot = shooter(page, street, parts);
  const drums = new Set<string>();
  const { stats, last } = await playStreetByHand(page, h, {
    act,
    onPoll: async (s) => {
      for (const z of s.r.hazards) if (z.kind === 'drum' && z.mode === 'gone') drums.add(String(z.x));
      await shoot(s);
      if (extra) await extra(s);
    },
  });
  await h.upAll();
  return { stats, last, crates, h };
}

async function clearedScreen(page: Page, name: string, kobo: number, big: string) {
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 6000 });
  await expect(dialog.getByText(`${name} is fixed. You got ${kobo} kobo.`)).toBeVisible();
  for (const b of [big, 'Play again', 'Home']) await expect(dialog.getByRole('button', { name: b })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.screen)).toBe('cleared');
  return dialog;
}

async function openStreet(page: Page, id: string) {
  await page.goto(`./?level=${id}`);
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
}

test('street 2, Market road, by hand: start to bus, every crate, the cleared screen, then Next street opens street 3', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await openStreet(page, 'lagos-2');
  await page.screenshot({ path: join(SHOTS, 'street2-start.png') });
  await watchBar(page);
  const { stats, last, crates } = await playToBus(page, 'street2', [
    [700, 'market-stalls'],
    [1180, 'roof-crate'],
    [2900, 'well'],
    [4100, 'exit-well'],
    [5250, 'bus-stop'],
    [5810, 'big-pit'],
    [7060, 'goat-and-stall'],
    [10200, 'amala-run'],
    [10900, 'bus-park'],
  ]);
  console.log(
    `street 2 by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, ` +
      `presses ${stats.presses}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, crates ${crates.opened.join(', ')}, foods ${crates.foods.join(', ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(crates.opened).toEqual([600, 1200, 1600, 7300, 8000]);
  expect(crates.foods).toEqual(['corn']);
  const bar = await barLog(page);
  console.log(`street 2 hint bar: ${bar.frames} frames, words ${bar.words.join(' | ')}; covered: ${bar.hits.join('; ') || 'nothing'}`);
  expect(bar.hits, 'nothing playable under the hint bar').toEqual([]);
  // The well hint waits for L2 (going down is not built yet).
  expect(bar.words.some((w) => /well/i.test(w))).toBe(false);
  expect(bar.words).toContain('Big pit! Run, then jump twice.');

  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  const dialog = await clearedScreen(page, 'Market road', kobo, 'Next street');
  await page.screenshot({ path: join(SHOTS, 'street2-cleared.png') });
  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Next street' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  const next = await page.evaluate(() => ({ id: window.__game!.level.id, r: window.__game!.run, x: window.__game!.hero.x }));
  expect(next.id).toBe('lagos-3');
  expect(next.r.kobo).toBe(0);
  expect(next.r.lives).toBe(next.r.maxLives);
  expect(next.x).toBe(420);
  expect(errors).toEqual([]);
});

test('street 3, Bus park road, by hand: back to the secret well, then start to bus with drums, two big pits, and Go to Go-Slow Hall', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await openStreet(page, 'lagos-3');
  await page.screenshot({ path: join(SHOTS, 'street3-start.png') });
  await watchBar(page);

  // Back-tracking (S2.2 Camera rule 5): hold Back to the start fence; the 3 kobo lead to the well.
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.back.x, btn.back.y);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.x), { timeout: 10_000 }).toBeLessThan(30);
  await page.waitForTimeout(500); // the camera settles looking left
  await page.screenshot({ path: join(SHOTS, 'street3-secret-well.png') });
  await h.up(LEFT);
  const back = await snap(page);
  expect(back.r.kobo).toBe(3);
  expect(back.h.x).toBe(27); // start fence + 7
  const cam = await page.evaluate(() => ({ x: window.__game!.camX, w: window.__game!.viewW, look: window.__game!.camLook }));
  expect(cam.look).toBe(-1);
  expect(cam.x).toBeLessThanOrEqual(160 - 50); // the whole well is in view
  expect(cam.x + cam.w).toBeGreaterThanOrEqual(160 + 50);
  expect(back.r.lives).toBe(3);

  let drumShot = false;
  const { stats, last, crates } = await playToBus(
    page,
    'street3',
    [
      [600, 'vulcanizer-row'],
      [1050, 'shed-roof-crate'],
      [1330, 'exit-well'],
      [3600, 'group'],
      [4650, 'bus-stop'],
      [5310, 'big-pit-1'],
      [7010, 'big-pit-2'],
      [9720, 'roof'],
      [11300, 'bus-park'],
    ],
    async (s) => {
      // A rolling drum close ahead, on screen.
      if (drumShot) return;
      const d = s.r.hazards.find((z) => z.kind === 'drum' && z.mode === 'move' && z.x - s.h.x > 60 && z.x - s.h.x < 260);
      if (d) {
        drumShot = true;
        await page.screenshot({ path: join(SHOTS, 'street3-rolling-drum.png') });
      }
    },
  );
  console.log(
    `street 3 by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, ` +
      `presses ${stats.presses}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, crates ${crates.opened.join(', ')}, foods ${crates.foods.join(', ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(drumShot).toBe(true);
  expect(crates.opened).toEqual([700, 850, 1100, 4900, 7500, 8400]);
  expect(crates.foods).toEqual(['garri', 'corn']);
  // Both big pits crossed by run-up jumps.
  expect(stats.bigPitJumps.filter((j) => j.speed >= 156).length).toBeGreaterThanOrEqual(2);
  const bar = await barLog(page);
  console.log(`street 3 hint bar: ${bar.frames} frames, words ${bar.words.join(' | ')}; covered: ${bar.hits.join('; ') || 'nothing'}`);
  expect(bar.hits, 'nothing playable under the hint bar').toEqual([]);
  expect(bar.words).toContain('Fast rolling drum! Jump over it.');

  const kobo = await page.evaluate(() => window.__game!.run.kobo);
  const dialog = await clearedScreen(page, 'Bus park road', kobo, 'Go to Go-Slow Hall');
  await page.screenshot({ path: join(SHOTS, 'street3-cleared.png') });
  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Go to Go-Slow Hall' }).tap();
  // Until Go-Slow Hall (piece M): the slice 1 boss fight, full lives and 0 kobo.
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase)).toBe('arena');
  await expect(page.getByText('General Go-Slow blocks the road! Jump onto the green light.')).toBeVisible();
  const boss = await snap(page);
  expect(boss.r.kobo).toBe(0);
  expect(boss.r.lives).toBe(boss.r.maxLives);
  expect(boss.i.buttons).toBe(true);
  expect(errors).toEqual([]);
});

test('Street cleared: Play again replays the same street from its start; Home goes to the title', async ({ page }) => {
  test.setTimeout(120_000);
  await openStreet(page, 'lagos-2');
  const level = await page.evaluate(() => window.__game!.level);
  const h = hands(await page.context().newCDPSession(page));
  // The bot to the bus (no stops for crates).
  const { last } = await playStreetByHand(page, h);
  await h.upAll();
  expect(last.r.phase).toBe('bus');
  const dialog = await clearedScreen(page, 'Market road', await page.evaluate(() => window.__game!.run.kobo), 'Next street');
  await waitOutTapLock(page);
  await dialog.getByRole('button', { name: 'Play again' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.screen)).toBe('play');
  const again = await page.evaluate(() => ({ id: window.__game!.level.id, kobo: window.__game!.run.kobo, x: window.__game!.hero.x, phase: window.__game!.run.phase }));
  expect(again).toEqual({ id: 'lagos-2', kobo: 0, x: level.spawnX, phase: 'run' });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await waitOutTapLock(page);
  await page.getByRole('button', { name: 'Home' }).tap();
  await expect(page.getByRole('dialog', { name: 'Gbese!' })).toBeVisible();
});
