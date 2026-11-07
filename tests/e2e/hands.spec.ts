/**
 * Slice 2 piece H on the phone profile, by touch: street 1 (lagos-1) by hand with two thumbs,
 * the big pit by a run-up jump, the bus at the end, and the finger and let-go rules
 * (docs/design.md S2.1, S2.2, S2.6). Screenshots go to $S2H_SHOTS (default test-results/s2h-shots).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { LEFT, RIGHT, buttonCentres, hands, playStreetByHand, snap } from './hands';
import { openAndRun, waitOutTapLock } from './helpers';

const SHOTS = process.env['S2H_SHOTS'] ?? 'test-results/s2h-shots';
mkdirSync(SHOTS, { recursive: true });

const hero = (page: Page) => page.evaluate(() => window.__game!.hero);
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

async function begin(page: Page) {
  await openAndRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const cdp = await page.context().newCDPSession(page);
  return { h: hands(cdp), btn: await buttonCentres(page) };
}

test('street 1 by hand with two thumbs: walk, run, potholes, the big pit by a run-up jump, a fall back to the bus stop, foods, the bus', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const { h } = await begin(page);
  const level = await page.evaluate(() => window.__game!.level);
  expect(level.id).toBe('lagos-1');
  expect(level.manual).toBe(true);
  const bigPit = level.gaps.find(([a, b]) => b - a >= 160)!;
  expect(bigPit[1] - bigPit[0]).toBe(170);

  // Standing still at the start: nothing happens until a thumb moves the hero.
  await page.waitForTimeout(400);
  const still = await hero(page);
  expect(still.x).toBe(level.spawnX);
  expect(still.vx).toBe(0);
  expect(await page.evaluate(() => window.__game!.input.buttons)).toBe(true);

  let shotPlaying = false;
  let shotPit = false;
  let shotWalk = false;
  let shotRun = false;
  const seen = { walk: false, run: false, dust: false };
  let fellAt: { x: number; lives: number } | null = null;
  const { stats, last } = await playStreetByHand(page, h, {
    fallIntoOnce: (a) => a === bigPit[0],
    onPoll: async (s) => {
      // H5 poses: a walk at walk speed, a run (with the start-of-run dust puff) at run speed.
      if (s.h.grounded && s.h.speed === 90) seen.walk ||= s.a.gait === 'walk';
      if (s.h.grounded && s.h.speed === 156) seen.run ||= s.a.gait === 'run';
      seen.dust ||= s.a.dust;
      if (!shotWalk && s.h.grounded && s.h.speed === 90 && s.h.x > level.spawnX + 30) {
        shotWalk = true;
        await page.screenshot({ path: join(SHOTS, 'walking.png') });
      }
      if (!shotRun && s.h.grounded && s.h.speed === 156 && s.h.x > 300) {
        shotRun = true;
        await page.screenshot({ path: join(SHOTS, 'running.png') });
      }
      if (!shotPlaying && s.h.x > 600 && s.i.dir === 1) {
        shotPlaying = true;
        await page.screenshot({ path: join(SHOTS, 'playing-by-hand.png') });
      }
      // Mid run-up jump over the big pit, after the deliberate fall.
      if (!shotPit && fellAt && !s.h.grounded && s.h.x > bigPit[0] + 40 && s.h.x < bigPit[1] - 40) {
        shotPit = true;
        await page.screenshot({ path: join(SHOTS, 'big-pit-run-up-jump.png') });
      }
      if (!fellAt && s.r.lives < 3 && s.h.x <= level.checkpoint + 1) fellAt = { x: s.h.x, lives: s.r.lives };
    },
  });
  console.log(
    `by hand: ${last.r.phase} at x ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, kobo ${last.r.kobo}, ` +
      `presses ${stats.presses}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ')}, foods ${[...stats.foods].join(', ')}, ` +
      `big pit take-offs ${stats.bigPitJumps.map((j) => `x ${j.x.toFixed(0)} at ${j.speed.toFixed(0)} u/s`).join('; ')}`,
  );
  await h.upAll();
  // Getting on: the door is open and the hero is hopping through it (0.2 to 0.8 s).
  await page.waitForFunction(() => window.__game!.run.busTime >= 0.5, undefined, { polling: 16 });
  await page.screenshot({ path: join(SHOTS, 'boarding-the-bus.png') });
  expect(seen).toEqual({ walk: true, run: true, dust: true });
  expect(shotWalk && shotRun).toBe(true);

  // Reached the bus: controls locked, then on to the boss fight (slice 1's, until piece M).
  expect(last.r.phase).toBe('bus');
  expect(last.r.checkpoint).toBe(true);
  expect(stats.maxSpeed).toBe(228); // ran, and ran on corn
  expect([...stats.foods].sort()).toEqual(['amala', 'corn']); // garri is in a crate (piece J)
  // The one deliberate fall into the big pit: back at the bus stop, standing, facing right.
  expect(fellAt).not.toBeNull();
  expect(fellAt!.x).toBe(level.checkpoint);
  // The big pit was then cleared by a running double jump (no loss there after the fall).
  expect(stats.bigPitJumps.length).toBeGreaterThanOrEqual(1);
  expect(stats.bigPitJumps.at(-1)!.speed).toBe(156);
  expect(stats.lostAt.filter((x) => x > bigPit[1])).toEqual([]);
  expect(last.r.lives).toBe(2);
  expect(shotPlaying && shotPit).toBe(true);

  await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 5000 }).toBe('arena');
  await expect(page.getByText('General Go-Slow blocks the road! Jump onto the green light.')).toBeVisible();
  const boss = await snap(page);
  expect(boss.r.lives).toBe(2);
  expect(boss.r.kobo).toBe(last.r.kobo);
  expect(boss.i.buttons).toBe(true);
  expect(errors).toEqual([]);
});

test('Forward walks, then runs after 0.5 s; letting go stops within 0.2 s; Back turns round through a stop', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await page.waitForTimeout(300);
  const walking = await hero(page);
  expect(walking.vx).toBe(90);
  expect(walking.move).toBe(1);
  await page.waitForTimeout(900);
  expect((await hero(page)).vx).toBe(156);
  await page.screenshot({ path: join(SHOTS, 'forward-pressed.png') });
  // Rock the thumb across to Back without lifting: a turn.
  await h.move(LEFT, btn.back.x, btn.back.y);
  await expect.poll(() => hero(page).then((x) => x.dir)).toBe(-1);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(-90);
  await h.up(LEFT);
  await page.waitForTimeout(200);
  const stopped = await hero(page);
  expect(stopped.vx).toBe(0);
  expect(stopped.move).toBe(0);
});

test('back-tracking to the start fence: the hero stops at it and the camera never shows more than 40 u past it', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.x), { timeout: 10_000 }).toBeGreaterThan(1200);
  await h.move(LEFT, btn.back.x, btn.back.y);
  await expect.poll(() => page.evaluate(() => window.__game!.camLook), { timeout: 5000 }).toBe(-1);
  await expect.poll(() => hero(page).then((x) => x.x), { timeout: 15_000 }).toBe(27); // startWall 20 + 7
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__game!.camX)).toBeCloseTo(-20, 5);
  expect((await hero(page)).vx).toBe(0);
  await h.up(LEFT);
});

test('two thumbs: walk and jump at the same time; the hold belongs to the finger that started the jump', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await page.waitForTimeout(300);
  await h.down(RIGHT, btn.jump.x, btn.jump.y);
  await expect.poll(() => hero(page).then((x) => x.grounded), { intervals: [16] }).toBe(false);
  const s = await snap(page);
  expect(s.i.fingers).toEqual({ dir: 1, jump: 1 });
  expect(s.h.vx).toBeGreaterThan(0);
  // A third finger taps the jump side: the second jump. Lifting it ends the hold (it started that jump).
  await h.down(3, btn.jump.x - 60, btn.jump.y - 120);
  await expect.poll(() => hero(page).then((x) => x.airJump)).toBe(false);
  await h.up(3);
  await h.up(RIGHT);
  await expect.poll(() => hero(page).then((x) => x.grounded), { timeout: 3000 }).toBe(true);
  // Still walking forward with the left thumb.
  expect((await hero(page)).vx).toBeGreaterThan(0);
  await h.upAll();
});

test('a finger sliding from Forward into the jump area lets go: the hero stops, and that finger does nothing more', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(90);
  // Sliding up inside the left part keeps it.
  await h.move(LEFT, btn.forward.x, 120);
  await page.waitForTimeout(100);
  expect((await hero(page)).move).toBe(1);
  await h.move(LEFT, btn.jump.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(0);
  await h.move(LEFT, btn.forward.x, btn.forward.y); // back over Forward: still let go
  await page.waitForTimeout(150);
  expect((await hero(page)).vx).toBe(0);
  expect((await hero(page)).grounded).toBe(true);
  await h.up(LEFT);
});

test('a pause never leaves the hero moving: app switch while running, then a thumb still on the glass does nothing until lifted', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx), { timeout: 3000 }).toBe(156);
  await setHidden(page, true);
  expect(await page.evaluate(() => window.__game!.paused)).toBe(true);
  expect((await snap(page)).i.dir).toBe(0); // let go of everything
  await setHidden(page, false);
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Keep running' }).click();
  // The hero slows to a stop at the normal rate and stays stopped, thumb or no thumb.
  await page.waitForTimeout(400);
  const a = await hero(page);
  expect(a.vx).toBe(0);
  await page.waitForTimeout(300);
  expect((await hero(page)).x).toBe(a.x);
  // Lift and press again: walks.
  await h.up(LEFT);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBeGreaterThan(0);
  await h.upAll();
});

test('turning the phone upright while running lets go; turning back and Keep running: the hero stands still', async ({ page }) => {
  const { h, btn } = await begin(page);
  const vp = page.viewportSize()!;
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx), { timeout: 3000 }).toBeGreaterThan(0);
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(true);
  expect((await snap(page)).i.dir).toBe(0);
  await page.setViewportSize(vp);
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Keep running' }).click();
  await page.waitForTimeout(400);
  expect((await hero(page)).vx).toBe(0);
  await h.upAll();
});

test('a cancelled finger (a call coming in) lets go of everything', async ({ page }) => {
  const { h, btn } = await begin(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBeGreaterThan(0);
  await h.cancel();
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(0);
  expect((await snap(page)).i.dir).toBe(0);
});

test('buttons: sizes and places per screen, see-through, spoken names; pressed shows by size', async ({ page }) => {
  const { h, btn } = await begin(page);
  const vp = page.viewportSize()!;
  const l = (await snap(page)).i.layout;
  expect(l.d).toBe(80);
  expect(l.back.x).toBe(12);
  expect(l.forward.x).toBe(12 + 80 + 10);
  expect(l.jump.x + l.jump.w).toBe(vp.width - 12);
  expect(l.jump.w).toBe(120);
  expect(l.back.y + l.back.h).toBe(vp.height - 8);
  // Fully below the road line (y 300 of 420).
  expect(l.back.y).toBeGreaterThanOrEqual((vp.height * 300) / 420);
  for (const name of ['Back', 'Forward', 'Jump']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  // Art's drawing (H5) fills its button: the round face of the shown look sits inside the box.
  const face = () =>
    page.evaluate(() => {
      const pad = document.querySelector('.pad-forward')!;
      const shown = [...pad.querySelectorAll('svg')].find((s) => s.getBoundingClientRect().width > 0)!;
      const c = shown.querySelector('circle')!.getBoundingClientRect();
      const b = pad.getBoundingClientRect();
      return { w: c.width, inside: c.left >= b.left - 1 && c.right <= b.right + 1 && c.top >= b.top - 1 && c.bottom <= b.bottom + 1 };
    });
  const up = await face();
  expect(up.inside).toBe(true);
  expect(up.w).toBeGreaterThan(l.d * 0.8);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  await expect(page.locator('.pad-forward')).toHaveClass(/down/);
  const pressed = await face();
  expect(pressed.inside).toBe(true);
  expect(pressed.w).toBeCloseTo(up.w * 0.94, 0);
  await h.up(LEFT);
  await expect(page.locator('.pad-forward')).not.toHaveClass(/down/);
  // 320 x 240: D is 56.
  await page.setViewportSize({ width: 320, height: 240 });
  await expect.poll(() => page.evaluate(() => window.__game!.input.layout.d)).toBe(56);
  const small = await page.evaluate(() => window.__game!.input.layout);
  expect(small.forward.x + small.forward.w).toBe(134);
  expect(small.jump.x).toBe(224);
  expect(small.lift).toBe(0);
  // 640 x 200, very short: D stays 56 and the picture is raised so the road line (drawn at
  // world y 300 - lift) sits 4 px above the buttons instead of 7 px below their tops.
  await page.setViewportSize({ width: 640, height: 200 });
  await expect.poll(() => page.evaluate(() => window.__game!.input.layout.lift)).toBeGreaterThan(0);
  const short = await page.evaluate(() => window.__game!.input.layout);
  expect(short.d).toBe(56);
  const road = ((300 - short.lift) * 200) / 420;
  expect(road).toBeCloseTo(short.back.y - 4, 1);
  await page.screenshot({ path: join(SHOTS, 'buttons-640x200-raised-road.png') });
});

test('keys on a computer: arrows and A/D walk and run, Space and Up jump, the last direction pressed wins', async ({ page }) => {
  await begin(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(90);
  await expect.poll(() => hero(page).then((x) => x.vx), { timeout: 3000 }).toBe(156);
  await page.keyboard.down('KeyA'); // both held: the last pressed wins
  await expect.poll(() => hero(page).then((x) => x.dir)).toBe(-1);
  await page.keyboard.up('KeyA'); // hands back to the right arrow
  await expect.poll(() => hero(page).then((x) => x.vx)).toBeGreaterThan(0);
  await page.keyboard.down('Space');
  await expect.poll(() => hero(page).then((x) => x.grounded), { intervals: [16] }).toBe(false);
  await page.keyboard.up('Space');
  await page.keyboard.press('ArrowUp'); // second jump in the air
  expect((await hero(page)).airJump).toBe(false);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => hero(page).then((x) => x.grounded), { timeout: 3000 }).toBe(true);
  await expect.poll(() => hero(page).then((x) => x.vx)).toBe(0);
  expect((await snap(page)).i.lastKind).toBe('keys');
});
