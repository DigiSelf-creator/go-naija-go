/**
 * qa K4c (docs/kano.md part 10): the Dawanau pass.
 * - Dawanau by hand at 320 x 240 (reached from Kofar Mata's cleared card, "Next street") and at
 *   851 x 393 (from Kano's home): the bus, few lives lost (4 tries or fewer is the goal), whirls
 *   met and passed, no bubble cut by the screen's sides, no errors.
 * - A small child's way of playing (about 5): Forward held, Jump tapped about 3 times a second,
 *   never aimed. Run on Kurmi, Kofar Mata and Dawanau to compare (report; the bar is that Dawanau
 *   is no harder for it than Kofar Mata, give or take one life).
 * - Offline after one visit: Dawanau plays past the bus stop with no internet.
 * - Kano's home at 320 x 240: the three Play buttons on screen, 44 px tall, 8 px apart.
 * - Break it: switch apps mid-jump over a whirl, turn the phone, tap very fast through the whirl row.
 * Pictures for the greyscale and small-screen check go to QA_SHOTS (a folder), if set.
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, LEFT, RIGHT, snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const KURMI_DONE = { arrived: true, streets: { 1: { done: true, best: 900 } } };
const KOFAR_DONE = { arrived: true, streets: { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 } } };
const SHOTS = process.env['QA_SHOTS'];
const NAMES = ['Kurmi', 'Kofar Mata', 'Dawanau'] as const;

async function seed(page: Page, kano: unknown = KOFAR_DONE): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano }, city: CITY, where: 'kano' }) },
  );
}

async function playStreet(page: Page, n: 1 | 2 | 3): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.kano-city').getByRole('button', { name: `Play ${NAMES[n - 1]}` }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(`kano-${n}`);
}

/** Watches every frame for a bubble cut by the screen's sides, and counts whirl puffs and hurts. */
async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const out = { seen: 0, cut: [] as string[], puffs: 0, passed: 0 };
    (window as unknown as { __qa: typeof out }).__qa = out;
    const modes = new Map<number, string>();
    const f = (): void => {
      const g = window.__game!;
      const b = g.people?.bubble;
      if (b && g.run.phase === 'run' && !g.below) {
        out.seen++;
        if (b.x < g.camX - 0.5 || b.x + b.w > g.camX + g.viewW + 0.5) out.cut.push(`${b.x.toFixed(0)}+${b.w.toFixed(0)} at cam ${g.camX.toFixed(0)}`);
      }
      g.run.hazards.forEach((z, i) => {
        if (z.kind !== 'whirl') return;
        const was = modes.get(i);
        if (z.mode === 'puff' && was !== 'puff') out.puffs++;
        if (z.mode === 'move' && z.x < g.hero.x - 40 && was !== 'passed') {
          out.passed++;
          modes.set(i, 'passed');
          return;
        }
        if (was !== 'passed') modes.set(i, z.mode);
      });
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
const watched = (page: Page) => page.evaluate(() => (window as unknown as { __qa: { seen: number; cut: string[]; puffs: number; passed: number } }).__qa);

async function shot(page: Page, name: string, greyToo = true): Promise<void> {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  if (!greyToo) return;
  await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
  await page.screenshot({ path: `${SHOTS}/${name}-grey.png` });
  await page.evaluate(() => (document.documentElement.style.filter = ''));
}

/** Shots when a whirl is on screen, 120 to 200 u ahead, once per whirl. */
function whirlShots(page: Page, size: string) {
  const done = new Set<number>();
  return async (s: Awaited<ReturnType<typeof snap>>) => {
    const i = s.r.hazards.findIndex((q, j) => q.kind === 'whirl' && q.mode === 'move' && q.x - s.h.x > 120 && q.x - s.h.x < 200 && !done.has(j));
    if (i < 0) return;
    done.add(i);
    const z = s.r.hazards[i]!;
    const x0 = Math.round(z.x);
    if (done.size <= 4) await shot(page, `${size}-whirl-${x0}`);
  };
}

async function dawanauByHand(page: Page, size: string) {
  await watch(page);
  const h = hands(await page.context().newCDPSession(page));
  const { stats, last } = await playStreetByHand(page, h, { onPoll: whirlShots(page, size) });
  await h.upAll();
  const w = await watched(page);
  console.log(
    `qa K4c ${size}: ${last.r.phase} at ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, ` +
      `whirl puffs ${w.puffs}, passed ${w.passed}, bubble frames ${w.seen}, cut ${w.cut.length} ${w.cut.slice(0, 3).join(' | ')}`,
  );
  expect(last.r.phase).toBe('bus');
  expect(stats.lostAt.length).toBeLessThan(3);
  expect(w.puffs + w.passed).toBeGreaterThanOrEqual(5);
  expect(w.cut).toEqual([]);
}

test('qa K4c: at 320 x 240, Kofar Mata\'s cleared card says "Next street"; it opens Dawanau; Dawanau by hand to the bus', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 320, height: 240 });
  await seed(page, KURMI_DONE);
  await playStreet(page, 2);
  const h = hands(await page.context().newCDPSession(page));
  const k = await playStreetByHand(page, h);
  await h.upAll();
  expect(k.last.r.phase).toBe('bus');
  const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(dialog).toBeVisible({ timeout: 8000 });
  const next = dialog.getByRole('button', { name: 'Next street', exact: true });
  await expect(next).toBeVisible();
  const box = (await next.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(240);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await shot(page, '320-kofar-cleared', false);
  await waitOutTapLock(page);
  await next.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('kano-3');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  await dawanauByHand(page, '320');
  expect(errors).toEqual([]);
});

test('qa K4c: Dawanau by hand at 851 x 393 from Kano\'s home: the bus, whirls passed, bubbles whole', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 851, height: 393 });
  await seed(page);
  await playStreet(page, 3);
  await dawanauByHand(page, '851');
  expect(errors).toEqual([]);
});

/** The child bot: Forward held, Jump tapped about 3 a second, never aimed; up to 4 games. */
async function child(page: Page, n: 1 | 2 | 3) {
  await playStreet(page, n);
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  const lost: { x: number; fell: boolean }[] = [];
  let games = 1;
  let prev = await snap(page);
  let best = 0;
  let t = 0;
  for (let i = 0; i < 9000; i++) {
    const s = await snap(page);
    best = Math.max(best, s.h.x);
    if (s.r.lives < prev.r.lives && s.screen === 'play') lost.push({ x: Math.round(prev.h.x), fell: prev.h.y > 300 });
    if (s.r.phase === 'bus') break;
    if (s.screen !== 'play') {
      if (prev.screen === 'play') lost.push({ x: Math.round(prev.h.x), fell: prev.h.y > 300 });
      prev = s;
      const again = page.getByRole('button', { name: 'Play again' });
      if (await again.isVisible().catch(() => false)) {
        if (games >= 4) break;
        await h.upAll();
        await page.waitForTimeout(500);
        await again.tap();
        games++;
        await expect.poll(() => screenNow(page)).toBe('play');
        await h.down(LEFT, btn.forward.x, btn.forward.y);
        prev = await snap(page);
      }
      continue;
    }
    prev = s;
    if (++t % 2 === 0) {
      await h.down(RIGHT, btn.jump.x, btn.jump.y);
      await page.waitForTimeout(60);
      await h.up(RIGHT);
    }
    await page.waitForTimeout(90);
  }
  await h.upAll();
  const s = await snap(page);
  return { street: NAMES[n - 1], bus: s.r.phase === 'bus', games, lives: lost.length, best: Math.round(best), lost };
}

test('qa K4c: the child bot (about 5) on Kurmi, Kofar Mata and Dawanau, to compare', async ({ page }) => {
  test.setTimeout(1_800_000);
  await page.setViewportSize({ width: 851, height: 393 });
  await seed(page, { arrived: true, streets: { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 }, 3: { done: true, best: 1000 } } });
  const out = [];
  for (const n of [1, 2, 3] as const) {
    const r = await child(page, n);
    console.log(`qa K4c child ${r.street}: bus ${r.bus}, games ${r.games}, lives lost ${r.lives}, furthest ${r.best}, lost at ${JSON.stringify(r.lost)}`);
    out.push(r);
  }
  const [, kofar, dawanau] = out;
  // Dawanau is no harder for the child than Kofar Mata, give or take one life (or it gets there).
  expect(dawanau!.bus || dawanau!.lives <= kofar!.lives + 1 || dawanau!.best >= kofar!.best).toBe(true);
});

test('qa K4c: offline after one visit, Dawanau plays past the bus stop', async ({ page, context }) => {
  test.setTimeout(180_000);
  const failed: string[] = [];
  context.on('requestfailed', (r) => failed.push(r.url()));
  await seed(page);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await playStreet(page, 3);
  const h = hands(await page.context().newCDPSession(page));
  const { last } = await playStreetByHand(page, h, { until: (s) => s.h.x > 5700 });
  await h.upAll();
  expect(last.h.x).toBeGreaterThan(5700);
  expect(last.r.checkpoint).toBe(true);
  await context.setOffline(false);
  expect(failed.filter((u) => !/favicon/.test(u))).toEqual([]);
});

test('qa K4c: Kano\'s home at 320 x 240: three Play buttons on screen, 44 px tall, 8 px apart', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await seed(page);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await shot(page, '320-kano-home', false);
  const boxes = [];
  for (const n of NAMES) {
    const b = page.locator('.kano-city').getByRole('button', { name: `Play ${n}` });
    await expect(b).toBeVisible();
    boxes.push({ n, ...(await b.boundingBox())! });
  }
  console.log(`qa K4c home 320x240: ${boxes.map((b) => `${b.n} ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}`).join('; ')}`);
  for (const b of boxes) {
    expect(b.x, b.n).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, b.n).toBeLessThanOrEqual(320);
    expect(b.y + b.height, b.n).toBeLessThanOrEqual(240);
    expect(b.height, b.n).toBeGreaterThanOrEqual(44);
    expect(b.width, b.n).toBeGreaterThanOrEqual(44);
  }
  for (const [i, a] of boxes.entries())
    for (const b of boxes.slice(i + 1)) {
      const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
      const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
      expect(Math.max(gapX, gapY), `${a.n} to ${b.n}`).toBeGreaterThanOrEqual(8);
    }
  // Each name reads whole (not cut off with an ellipsis or overflow).
  for (const n of NAMES) {
    const over = await page.locator('.kano-city').getByRole('button', { name: `Play ${n}` }).evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    expect(over, n).toBe(false);
  }
});

test('qa K4c break: switch apps mid-jump over a whirl, turn the phone, mash Jump through the whirl row', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 851, height: 393 });
  await seed(page);
  await playStreet(page, 3);
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  let done = 0;
  let { last } = await playStreetByHand(page, h, {
    onPoll: async (s) => {
      const z = s.r.hazards.find((q) => q.kind === 'whirl' && q.mode === 'move' && Math.abs(q.x - s.h.x) < 40);
      if (done === 0 && z && !s.h.grounded) {
        done = 1;
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
          Object.defineProperty(document, 'hidden', { value: true, configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => window.__game!.paused)).toBe(true);
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
          Object.defineProperty(document, 'hidden', { value: false, configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.setViewportSize({ width: 393, height: 851 });
        await page.waitForTimeout(300);
        await page.setViewportSize({ width: 851, height: 393 });
        await page.waitForTimeout(300);
        await h.upAll();
        const resume = page.getByRole('button', { name: /^(Resume|Play on|Keep playing)$/ });
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        if (await resume.first().isVisible().catch(() => false)) await resume.first().tap();
        await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(false);
        await h.down(LEFT, btn.forward.x, btn.forward.y);
        done = 2;
      }
    },
    until: (s) => s.h.x > 3700,
  });
  expect(done).toBe(2);
  expect(last.h.x).toBeGreaterThan(3700);
  // Mash Jump as fast as a finger can (every 30 ms) from the fura through the whirl row.
  const b = await buttonCentres(page);
  await h.down(LEFT, b.forward.x, b.forward.y);
  for (let i = 0; i < 400; i++) {
    last = await snap(page);
    if (last.h.x > 5100 || last.screen !== 'play' || last.r.phase !== 'run') break;
    await h.down(RIGHT, b.jump.x, b.jump.y);
    await page.waitForTimeout(15);
    await h.up(RIGHT);
    await page.waitForTimeout(15);
  }
  await h.upAll();
  console.log(`qa K4c break: mashed to ${last.h.x.toFixed(0)}, lives ${last.r.lives}, phase ${last.r.phase}`);
  expect(last.screen).toBe('play');
  expect(errors).toEqual([]);
});
