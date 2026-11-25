/**
 * qa K3c (docs/kano.md part 10): the Kofar Mata pass.
 * - Kofar Mata by hand from Kano's home at 320 x 240 and 851 x 393: the bus, few lives lost
 *   (4 tries or fewer is the goal), a bounce, no bubble cut by the screen's sides, no errors.
 * - A small child's way of playing: Forward held, Jump tapped over and over, never aimed (a stress
 *   model, report only; qa's K3c run: it got further on Kofar Mata than on Kurmi). No fall comes
 *   within 1.2 s of a cloth bounce.
 * - Lagos and Ogun street bubbles still show, and are never cut at 320 x 240 (K3b changed this
 *   for every street).
 * - Offline after one visit: Kano's home and Kofar Mata play, with no debug gallery ever asked for.
 * - Break it: app switched away mid-bounce, the phone turned mid-bounce.
 * Pictures for the greyscale check go to QA_SHOTS (a folder), if set.
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, LEFT, RIGHT, snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, startRun } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const KURMI_DONE = { arrived: true, streets: { 1: { done: true, best: 900 } } };
const SAVE = { v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano: KURMI_DONE }, city: CITY, where: 'kano' };
const SHOTS = process.env['QA_SHOTS'];

async function seed(page: Page, where = 'kano'): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ ...SAVE, where }) },
  );
}

async function playKofarMata(page: Page): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.kano-city').getByRole('button', { name: 'Play Kofar Mata' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-2');
}

/** Watches every frame for a bubble cut by the screen's sides. */
async function watchBubbles(page: Page): Promise<void> {
  await page.evaluate(() => {
    const out = { seen: 0, cut: [] as string[] };
    (window as unknown as { __bubbles: typeof out }).__bubbles = out;
    const f = (): void => {
      const g = window.__game!;
      const b = g.people?.bubble;
      if (b && g.run.phase === 'run' && !g.below) {
        out.seen++;
        if (b.x < g.camX - 0.5 || b.x + b.w > g.camX + g.viewW + 0.5) out.cut.push(`${b.x.toFixed(0)}+${b.w.toFixed(0)} at cam ${g.camX.toFixed(0)}`);
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
const bubbles = (page: Page) => page.evaluate(() => (window as unknown as { __bubbles: { seen: number; cut: string[] } }).__bubbles);

/** Greyscale picture of the screen now (for qa's eye), when QA_SHOTS is set. */
async function grey(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await page.evaluate(() => (document.documentElement.style.filter = ''));
}

for (const size of [
  { width: 320, height: 240 },
  { width: 851, height: 393 },
]) {
  test(`qa K3c: Kofar Mata by hand at ${size.width} x ${size.height}: the bus, a bounce, bubbles whole`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.setViewportSize(size);
    await seed(page);
    await playKofarMata(page);
    await watchBubbles(page);
    const springs = (await page.evaluate(() => window.__game!.level.platforms)).filter((p) => p.spring !== undefined).map((p) => p.x);
    const b0 = await page.evaluate(() => window.__game!.clothBounces);
    const h = hands(await page.context().newCDPSession(page));
    const btn = await buttonCentres(page);
    const tried = new Set<number>();
    const shots = new Set<string>();
    const { stats, last } = await playStreetByHand(page, h, {
      // Bounce on every frame (a tap jump just before it).
      act: async (s, hh) => {
        const x = springs.find((a) => !tried.has(a) && a - s.h.x > 8 && a - s.h.x < 8 + s.h.speed * 0.14);
        if (x === undefined) return false;
        tried.add(x);
        await hh.down(RIGHT, btn.jump.x, btn.jump.y);
        await page.waitForTimeout(40);
        await hh.up(RIGHT);
        return true;
      },
      onPoll: async (s) => {
        for (const [name, a, b] of [
          ['sign-1250', 1140, 1220],
          ['roof-1950', 1830, 1900],
          ['long-roof-5850', 5650, 5720],
          ['big-pit-6720', 6560, 6640],
          ['roof-8950', 8760, 8830],
        ] as const) {
          if (!shots.has(name) && s.h.x > a && s.h.x < b) {
            shots.add(name);
            await grey(page, `${size.width}-${name}`);
          }
        }
      },
    });
    await h.upAll();
    const bounces = (await page.evaluate(() => window.__game!.clothBounces)) - b0;
    const bub = await bubbles(page);
    console.log(
      `qa K3c ${size.width}x${size.height}: ${last.r.phase} at ${last.h.x.toFixed(0)} in ${last.r.time.toFixed(1)} s, lives ${last.r.lives}, lost at ${stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, ` +
        `bounces ${bounces} of ${springs.length} tried ${tried.size}, bubble frames ${bub.seen}, cut ${bub.cut.length} ${bub.cut.slice(0, 3).join(' | ')}`,
    );
    expect(last.r.phase).toBe('bus');
    expect(stats.lostAt.length).toBeLessThan(3);
    expect(bounces).toBeGreaterThanOrEqual(2);
    expect(bub.cut).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const street of ['Kofar Mata']) {
  test(`qa K3c: a small child mashing Jump with Forward held on ${street} ; no life lost just after a bounce`, async ({ page }) => {
    test.setTimeout(480_000);
    await page.setViewportSize({ width: 851, height: 393 });
    await seed(page);
    await page.reload();
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page)).toBe('kano');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator('.kano-city').getByRole('button', { name: `Play ${street}` }).tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    const h = hands(await page.context().newCDPSession(page));
    const btn = await buttonCentres(page);
    await h.down(LEFT, btn.forward.x, btn.forward.y);
    const lost: { x: number; fell: boolean; bounceAgo: number }[] = [];
    let tries = 1;
    let bounceT = -1e9;
    let prev = await snap(page);
    let lastBounces = await page.evaluate(() => window.__game!.clothBounces);
    let t = 0;
    for (let i = 0; i < 5000; i++) {
      const s = await snap(page);
      const now = await page.evaluate(() => window.__game!.clothBounces);
      if (now > lastBounces) bounceT = s.r.time;
      lastBounces = now;
      if (s.r.lives < prev.r.lives && s.screen === 'play') lost.push({ x: Math.round(prev.h.x), fell: prev.h.y > 300, bounceAgo: +(s.r.time - bounceT).toFixed(1) });
      if (s.r.phase === 'bus') break;
      if (s.screen !== 'play') {
        if (prev.screen === 'play') lost.push({ x: Math.round(prev.h.x), fell: prev.h.y > 300, bounceAgo: +(prev.r.time - bounceT).toFixed(1) });
        prev = s;
        const again = page.getByRole('button', { name: 'Play again' });
        if (await again.isVisible().catch(() => false)) {
          if (tries >= 4) break;
          await h.upAll();
          await page.waitForTimeout(500);
          await again.tap();
          tries++;
          await expect.poll(() => screenNow(page)).toBe('play');
          await h.down(LEFT, btn.forward.x, btn.forward.y);
          prev = await snap(page);
        }
        continue;
      }
      prev = s;
      // A child's tap: short, about 3 a second, never aimed.
      if (++t % 2 === 0) {
        await h.down(RIGHT, btn.jump.x, btn.jump.y);
        await page.waitForTimeout(60);
        await h.up(RIGHT);
      }
      await page.waitForTimeout(90);
    }
    await h.upAll();
    const s = await snap(page);
    console.log(`qa K3c masher ${street}: ${s.r.phase} at ${s.h.x.toFixed(0)}, tries ${tries}, lost ${JSON.stringify(lost)}`);
    // Report only: an unaimed masher is a stress model, not the 4-try bar.
    expect(lost.filter((l) => l.bounceAgo >= 0 && l.bounceAgo < 1.2 && l.fell)).toEqual([]);
  });
}

for (const st of [
  { name: 'Lagos street 1', url: './?level=lagos-1' },
  { name: 'Ota', url: './?level=ogun-1' },
]) {
  test(`qa K3c: ${st.name} at 320 x 240: bubbles still show, never cut by the screen's sides`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 320, height: 240 });
    await seed(page, 'lagos');
    await page.goto(st.url);
    await startRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    await watchBubbles(page);
    const h = hands(await page.context().newCDPSession(page));
    const { last } = await playStreetByHand(page, h, { until: (s) => s.h.x > 6000 });
    await h.upAll();
    const bub = await bubbles(page);
    console.log(`qa K3c ${st.name} 320x240: to ${last.h.x.toFixed(0)}, bubble frames ${bub.seen}, cut ${bub.cut.length} ${bub.cut.slice(0, 3).join(' | ')}`);
    expect(bub.seen).toBeGreaterThan(0);
    expect(bub.cut).toEqual([]);
  });
}

test('qa K3c: offline after one visit Kofar Mata plays; no debug gallery is ever asked for or cached', async ({ page, context }) => {
  test.setTimeout(180_000);
  const asked: string[] = [];
  const failed: string[] = [];
  context.on('request', (r) => asked.push(new URL(r.url()).pathname));
  context.on('requestfailed', (r) => failed.push(r.url()));
  await seed(page);
  // First visit: open Kano so its part is fetched, then wait for the worker to hold everything.
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const cached = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
    return out;
  });
  expect(cached.some((p) => /\/worlds\/kano\/art-/.test(p))).toBe(true);
  expect(cached.filter((p) => /debug|galler/i.test(p))).toEqual([]);

  await context.setOffline(true);
  await playKofarMata(page);
  const h = hands(await page.context().newCDPSession(page));
  const { last } = await playStreetByHand(page, h, { until: (s) => s.h.x > 2200 });
  await h.upAll();
  expect(last.h.x).toBeGreaterThan(2200);
  expect(await page.evaluate(() => window.__game!.clothBounces)).toBeGreaterThanOrEqual(0);
  await context.setOffline(false);
  expect(asked.filter((p) => /debug|galler/i.test(p))).toEqual([]);
  expect(failed.filter((u) => !/favicon/.test(u))).toEqual([]);
});

test('qa K3c break: switch apps mid-bounce, turn the phone mid-bounce; the game pauses and plays on', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 851, height: 393 });
  await seed(page);
  await playKofarMata(page);
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  let done = 0;
  const { last } = await playStreetByHand(page, h, {
    act: async (s, hh) => {
      if (done === 0 && s.h.x > 1230 - s.h.speed * 0.14 && s.h.x < 1240) {
        await hh.down(RIGHT, btn.jump.x, btn.jump.y);
        await page.waitForTimeout(40);
        await hh.up(RIGHT);
        done = 1;
        return true;
      }
      return false;
    },
    onPoll: async (s) => {
      if (done === 1 && s.h.y < 240) {
        done = 2;
        // Switch apps mid-bounce.
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
          Object.defineProperty(document, 'hidden', { value: true, configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.__game!.paused)).toBe(true);
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
          Object.defineProperty(document, 'hidden', { value: false, configurable: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        // Turn the phone (upright, then back) while paused.
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
      }
    },
    until: (s) => s.h.x > 2400,
  });
  await h.upAll();
  expect(done).toBe(2);
  expect(last.h.x).toBeGreaterThan(2400);
  expect(errors).toEqual([]);
});
