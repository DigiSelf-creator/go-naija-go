/**
 * J2 on the phone profile, by touch: street 1 played by hand with two thumbs, knocking every
 * hanging crate from below (docs/design.md S2.4): the kobo crates give 3 kobo each, the garri
 * crate's garri is taken, and on every drawn frame the hint bar covers no crate (nor anything
 * else playable). Reduced motion: knocked crates do not swing.
 * Screenshots go to $CRATE_SHOTS (default test-results/crate-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand } from './hands';
import { openAndRun } from './helpers';

const SHOTS = process.env['CRATE_SHOTS'] ?? 'test-results/crate-shots';
mkdirSync(SHOTS, { recursive: true });

/** On every drawn frame while a hint shows: anything playable under the bar (S2.2 hint bar rule). */
async function watchBar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log = { frames: 0, crateFrames: 0, hits: [] as string[] };
    (window as unknown as { __bar: typeof log }).__bar = log;
    const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const frame = (): void => {
      const g = window.__game!;
      const bar = g.hintBar;
      if (bar.words && g.screen === 'play') {
        log.frames++;
        const drawn = g.drawn;
        if (drawn.some((d) => d.what === 'crate')) log.crateFrames++;
        for (const d of drawn) if (hit(bar, d) && log.hits.length < 20) log.hits.push(`${d.what} at step ${g.steps} under "${bar.words}"`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const barLog = (page: Page) => page.evaluate(() => (window as unknown as { __bar: { frames: number; crateFrames: number; hits: string[] } }).__bar);

async function begin(page: Page) {
  await openAndRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const cdp = await page.context().newCDPSession(page);
  return hands(cdp);
}

test('street 1 by hand opens every crate from below, gets the garri, and the hint bar never covers a crate', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const h = await begin(page);
  const start = await page.evaluate(() => window.__game!.run);
  expect(start.crates.map((c) => [c.x, c.contents, c.open])).toEqual([
    [2000, 'kobo', false],
    [2150, 'kobo', false],
    [6500, 'garri', false],
    [7670, 'kobo', false],
  ]);
  await watchBar(page);

  const shots = { knocked: false, fan: false, empty: false, food: false };
  const kobo: { x: number; before: number; after: number; coins: number }[] = [];
  const log: CrateLog = {
    opened: [],
    foods: [],
    onOpen: async (c, p) => {
      if (c.contents === 'kobo' && !shots.fan) {
        // The three kobo fan out of the top for 0.35 s: catch them on the way up.
        shots.fan = true;
        await p.screenshot({ path: join(SHOTS, 'crate-kobo-fan.png') });
      } else if (!shots.knocked) {
        shots.knocked = true;
        await p.screenshot({ path: join(SHOTS, 'crate-knocked.png') });
      }
      if (c.contents !== 'kobo') {
        await p.waitForFunction((x) => (window.__game!.run.crates.find((q) => q.x === x)?.food?.y ?? 0) < 160, c.x, { polling: 16 });
        shots.food = true;
        await p.screenshot({ path: join(SHOTS, 'crate-food-pop.png') });
      }
    },
  };
  const act = await crateActor(page, log);
  let koboBefore = 0;
  let coinsBefore = 0;
  const { stats, last } = await playStreetByHand(page, h, {
    act: async (s, hh) => {
      koboBefore = s.r.kobo;
      coinsBefore = s.r.coinsTaken;
      const n = log.opened.length;
      const moved = await act(s, hh);
      if (log.opened.length > n) {
        const r = await page.evaluate(() => window.__game!.run);
        const x = log.opened.at(-1)!;
        if (r.crates.find((c) => c.x === x)!.contents === 'kobo') kobo.push({ x, before: koboBefore, after: r.kobo, coins: r.coinsTaken - coinsBefore });
        if (!shots.knocked && r.crates.find((c) => c.x === x)!.contents === 'kobo') {
          // Knocked a moment ago: swinging, lid hanging open.
          shots.knocked = true;
          await page.screenshot({ path: join(SHOTS, 'crate-knocked.png') });
        }
      }
      return moved;
    },
    onPoll: async (s) => {
      // Both road kobo crates open and on screen, hanging still and empty.
      if (!shots.empty && s.h.x > 2230 && s.h.grounded && s.r.crates.filter((c) => c.open && c.x < 2200).length === 2) {
        shots.empty = true;
        await page.screenshot({ path: join(SHOTS, 'crate-empty.png') });
      }
    },
  });
  await h.upAll();
  const bar = await barLog(page);
  const end = await page.evaluate(() => window.__game!.run);
  console.log(
    `crates by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)}, opened ${log.opened.join(', ')}, crate foods ${log.foods.join(', ')}, ` +
      `kobo ${kobo.map((k) => `${k.x}: ${k.before} -> ${k.after} (${k.coins} single kobo picked up on the way)`).join('; ')}, lives ${last.r.lives}, foods seen ${[...stats.foods].join(', ')}; ` +
      `hint frames ${bar.frames} (${bar.crateFrames} with a crate on screen), covered: ${bar.hits.length ? bar.hits.join('; ') : 'nothing'}`,
  );
  expect(['bus', 'cleared', 'arena']).toContain(last.r.phase);
  expect([...log.opened].sort((a, b) => a - b)).toEqual([2000, 2150, 6500, 7670]);
  expect(end.crates.every((c) => c.open)).toBe(true);
  // Each kobo crate: 3 kobo (besides any single kobo picked up while getting under it).
  for (const k of kobo) expect(k.after - k.before - k.coins, `kobo crate at ${k.x}`).toBe(3);
  expect(kobo).toHaveLength(3);
  expect(log.foods).toEqual(['garri']);
  expect(stats.foods.has('garri')).toBe(true);
  expect(bar.crateFrames, 'hints showed with a crate on screen').toBeGreaterThan(30);
  expect(bar.hits, 'nothing playable under the hint bar').toEqual([]);
  expect(shots).toEqual({ knocked: true, fan: true, empty: true, food: true });
  expect(errors).toEqual([]);
});

test('reduced motion: a knocked crate does not swing, and still opens and pays', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const h = await begin(page);
  const log: CrateLog = { opened: [], foods: [] };
  const act = await crateActor(page, log);
  const angles: number[] = [];
  await playStreetByHand(page, h, {
    act,
    until: (s) => s.r.crates[0]!.open,
  });
  for (let i = 0; i < 20; i++) angles.push(...(await page.evaluate(() => window.__game!.run.crates.map((c) => c.angle))));
  await h.upAll();
  const r = await page.evaluate(() => window.__game!.run);
  expect(r.crates[0]!.open).toBe(true);
  expect(r.kobo).toBeGreaterThanOrEqual(3);
  expect(angles.every((a) => a === 0)).toBe(true);
});
