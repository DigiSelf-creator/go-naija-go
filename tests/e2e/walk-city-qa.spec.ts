/**
 * qa, slice 3 step (c) "Walk the city" (docs/city.md part 5W): trying to break it. Fast taps on a
 * board, leaving the mat or reloading mid-pay (money never lost, never paid twice, never below 0),
 * trays that must not fill while hidden or paused, storage that fails on write, keys only through
 * a card, boards and bubbles and pins on small screens with several signs up, turning the phone
 * mid-walk, and the hero never stranded where a tap cannot bring them back.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
type Box = { x: number; y: number; w: number; h: number };

async function openCity(page: Page, city?: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      if (p) localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: city ? JSON.stringify({ v: 2, states: {}, city }) : null },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

const city = (page: Page) => page.evaluate(() => window.__game!.city!);
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos' });
const savedCity = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? 'null') as { city?: Record<string, unknown> } | null)?.city ?? null);
async function onPage(page: Page, m: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const c = await city(page);
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  const p = c.pins;
  const k = (p['slowInternet']!.x + p['slowInternet']!.w / 2 - (p['potholes']!.x + p['potholes']!.w / 2)) / (1300 - 101);
  return { x: map.x + c.cam.x + m.x * k, y: map.y + c.cam.y + m.y * k };
}
const stillHero = (page: Page) => expect.poll(async () => (await city(page)).hero.moving, { timeout: 12_000 }).toBe(false);
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('fast taps on a board while it pays: paid once, never below ₦0, never more than the price', async ({ page }) => {
  const errors = watchErrors(page);
  await openCity(page, { kobo: 600, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  const board = page.locator('[data-build="road"]');
  await board.tap();
  // Hammer the board (and the map) while the hero walks there and pays.
  for (let i = 0; i < 25; i++) {
    if (await board.count()) await board.tap({ force: true, timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  await expect.poll(async () => (await city(page)).saved.paid, { timeout: 15_000 }).toEqual({ potholes: 600 });
  await expect.poll(async () => (await city(page)).paying, { timeout: 8000 }).toBe(false);
  const c = await city(page);
  expect(c.saved.kobo).toBe(0);
  expect(c.saved.fixed).toEqual([]);
  expect(await savedCity(page)).toMatchObject({ kobo: 0, paid: { potholes: 600 } });
  expect(errors).toEqual([]);
});

test('walking off the mat mid-pay: the money already paid stays paid, the road is built once', async ({ page }) => {
  await openCity(page, { kobo: 1250, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).paying, { timeout: 15_000 }).toBe(true);
  // Walk away at once, then come straight back and stand on the mat again.
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowUp');
  await page.locator('[data-build="road"], [data-build="mamaPut"]').first().tap({ force: true }).catch(() => {});
  await expect.poll(async () => (await city(page)).paying, { timeout: 10_000 }).toBe(false);
  await stillHero(page);
  await page.waitForTimeout(1500);
  const c = await city(page);
  expect(c.saved).toMatchObject({ kobo: 250, fixed: ['potholes'], fixes: 1, boom: 4, paid: {} });
  // A Mama Put pay may have begun from the ₦2.50 left; the total money is still right.
  const total = c.saved.kobo + (c.saved.paid['buka'] ?? 0) + (c.saved.built.includes('buka') ? 400 : 0);
  expect(total).toBe(250);
});

test('a reload mid-pay keeps the pay exactly once (no money lost, none paid twice)', async ({ page }) => {
  await openCity(page, { kobo: 600, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).paying, { timeout: 15_000 }).toBe(true);
  await page.reload();
  expect(await savedCity(page)).toMatchObject({ kobo: 0, paid: { potholes: 600 }, fixed: [] });
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(1500);
  const c = await city(page);
  expect(c.saved).toMatchObject({ kobo: 0, paid: { potholes: 600 }, fixed: [] });
  await expect(page.getByRole('button', { name: /New road\. 4 naira left/ })).toBeAttached();
});

test('a reload mid-pay of the whole price: built once, and no second pay from what is left', async ({ page }) => {
  await openCity(page, { kobo: 1500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).paying, { timeout: 15_000 }).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(2000);
  expect((await city(page)).saved).toMatchObject({ kobo: 500, fixed: ['potholes'], fixes: 1, boom: 4, paid: {} });
});

test('trays do not fill while the tab is hidden', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, hints: ['walk', 'buka', 'collect'] });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(16_000);
  expect((await city(page)).saved.trays['buka'] ?? 0).toBe(0);
  expect((await city(page)).saved.trays['market'] ?? 0).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Back in front: it fills again, one plate after 6 s of play.
  await expect.poll(async () => (await city(page)).saved.trays['buka'] ?? 0, { timeout: 10_000 }).toBe(10);
  expect((await city(page)).saved.trays['market'] ?? 0).toBe(0);
});

test('trays do not fill while a challenge is paused', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: {}, hints: ['walk', 'buka', 'collect'] });
  // The road is fixed: start street 1 from the Streets list.
  await lagos(page).getByRole('button', { name: 'Streets' }).tap();
  await expect.poll(() => screenNow(page)).toBe('streets');
  await page.locator('[data-where="0"]').tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await page.getByRole('button', { name: 'Pause' }).tap();
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(14_000);
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Home', exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  expect((await city(page)).saved.trays['buka'] ?? 0).toBe(0);
});

test('storage that fails on write: paying and collecting still work this visit, no errors', async ({ page }) => {
  const errors = watchErrors(page);
  await openCity(page, { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
  expect((await city(page)).saved.kobo).toBe(0);
  expect(errors).toEqual([]);
});

test('keys only: Tab to the Potholes pin, Enter, "Walk there" with Enter pays; Escape closes a card', async ({ page }) => {
  await openCity(page, { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  const pin = page.getByRole('button', { name: 'Potholes, ready to fix' });
  for (let i = 0; i < 25 && !(await pin.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(pin).toBeFocused();
  await page.keyboard.press('Enter');
  const card = page.getByRole('dialog', { name: 'Potholes' });
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(pin).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(card.getByRole('button', { name: 'Walk there' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
});

const SIGN_CASES = [
  { what: 'the market board and a full Mama Put bubble', city: { kobo: 300, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka', 'collect'] }, want: ['board market', 'bubble buka'] },
  { what: 'two full bubbles', city: { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: { buka: 150, market: 240 }, boom: 12, hints: ['walk', 'buka', 'collect'] }, want: ['bubble buka', 'bubble market'] },
  { what: 'the Lamps and Mast boards too (Power and Tech in hand)', city: { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka', 'collect'] }, want: ['board lamps', 'board market', 'board mast', 'bubble buka'] },
] as const;
for (const sc of SIGN_CASES)
for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
  [393, 851],
] as const) {
  test(`at ${width} x ${height}, ${sc.what}: no sign over another, a pin, a chip or a button; all at least 48 px and on screen`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openCity(page, sc.city);
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const covers: (Box & { name: string })[] = [];
    for (const el of await lagos(page).locator('.city-chip, .city-top button, .city-bottom button').all()) {
      const r = (await el.boundingBox())!;
      covers.push({ x: r.x - map.x, y: r.y - map.y, w: r.width, h: r.height, name: ((await el.getAttribute('aria-label')) ?? (await el.textContent()) ?? '').trim() });
    }
    for (const zoom of ['far', 'near'] as const) {
      await page.keyboard.press(zoom === 'near' ? '+' : '-');
      await page.waitForTimeout(800);
      const c = await city(page);
      const signs: [string, Box][] = [...Object.entries(c.boards).map(([k, b]) => [`board ${k}`, b] as [string, Box]), ...Object.entries(c.bubbles).map(([k, b]) => [`bubble ${k}`, b] as [string, Box])];
      if (zoom === 'far') expect(signs.map((s) => s[0]).sort()).toEqual([...sc.want]);
      for (const [name, b] of signs) {
        expect.soft(Math.min(b.w, b.h), `${zoom}: ${name} size`).toBeGreaterThanOrEqual(48);
        const shows = b.x + b.w > 0 && b.y + b.h > 0 && b.x < map.width && b.y < map.height;
        // Boards are kept on screen; a bubble may be off screen when zoomed in (its place is).
        if (name.startsWith('board') || zoom === 'far') expect.soft(b.x >= 0 && b.y >= 0 && b.x + b.w <= map.width + 0.5 && b.y + b.h <= map.height + 0.5, `${zoom}: ${name} on screen`).toBe(true);
        if (!shows) continue;
        for (const [spot, p] of Object.entries(c.pins)) {
          // city.md W15: a fixed block draws no pin; its tap area is not a pin.
          if ((sc.city.fixed as readonly string[]).includes(spot)) continue;
          const pinOnScreen = p.x + p.w > 0 && p.y + p.h > 0 && p.x < map.width && p.y < map.height;
          if (pinOnScreen) expect.soft(apart(b, p), `${zoom}: ${name} ${JSON.stringify(b)} over the ${spot} pin ${JSON.stringify(p)}`).toBe(true);
        }
        for (const o of covers) expect.soft(apart(b, o), `${zoom}: ${name} under "${o.name}"`).toBe(true);
        for (const [other, o] of signs) if (other !== name && o.x + o.w > 0 && o.y + o.h > 0 && o.x < map.width && o.y < map.height) expect.soft(apart(b, o), `${zoom}: ${name} over ${other}`).toBe(true);
      }
      for (const a of c.arrows) for (const o of covers) expect.soft(apart({ x: a.x - 22, y: a.y - 22, w: 44, h: 44 }, o), `${zoom}: edge arrow ${a.icon} under "${o.name}"`).toBe(true);
      // Round 2: an edge arrow is a sign too; it never sits over a board or a bubble.
      for (const a of c.arrows) for (const [name, b] of signs) if (b.x + b.w > 0 && b.y + b.h > 0 && b.x < map.width && b.y < map.height) expect.soft(apart({ x: a.x - 22, y: a.y - 22, w: 44, h: 44 }, b), `${zoom}: edge arrow ${a.icon} at ${Math.round(a.x)},${Math.round(a.y)} over ${name}`).toBe(true);
    }
    // The bubble is tappable: the hero walks over and collects.
    const k0 = sc.city.kobo;
    await page.locator('[data-place="buka"]').tap();
    await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(k0 + 150);
  });
}

// Round 2: the camera follows the hero, so signs are placed again after a walk. They must still
// keep off every drawn pin (W2, W9, W15), and a tap on a board must reach that board.
for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
  [393, 851],
] as const) {
  test(`at ${width} x ${height}, after the camera follows a walk: no sign over a drawn pin, and a board tap reaches its board`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const lamps = SIGN_CASES[2]!;
    await openCity(page, lamps.city);
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const on = (b: Box) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < map.width && b.y < map.height;
    for (const target of ['market', 'lamps', 'mast']) {
      await page.locator(`[data-build="${target}"]`).tap({ timeout: 10_000 });
      await stillHero(page);
      await page.waitForTimeout(600);
      const c = await city(page);
      const signs: [string, Box][] = [...Object.entries(c.boards).map(([k, b]) => [`board ${k}`, b] as [string, Box]), ...Object.entries(c.bubbles).map(([k, b]) => [`bubble ${k}`, b] as [string, Box])];
      for (const [name, b] of signs) {
        if (!on(b)) continue;
        for (const [spot, p] of Object.entries(c.pins)) {
          if ((lamps.city.fixed as readonly string[]).includes(spot) || !on(p)) continue;
          expect.soft(apart(b, p), `after walking to ${target}: ${name} ${JSON.stringify(b)} under the ${spot} pin ${JSON.stringify(p)}`).toBe(true);
        }
      }
      // What a finger hits at each board's middle is that board.
      for (const el of await page.locator('[data-build]').all()) {
        const id = await el.getAttribute('data-build');
        const hit = await el.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        });
        expect.soft(hit, `after walking to ${target}: the middle of the ${id} board is covered`).toBe(true);
      }
      const card = page.getByRole('dialog').filter({ hasNot: page.locator('.city-map') });
      if (await card.count()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      }
    }
  });
}

test('turning the phone mid-walk: the hero keeps walking, stays on screen, and arrives', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).hero.moving).toBe(true);
  await page.keyboard.press('+');
  await page.setViewportSize({ width: 393, height: 851 });
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 851, height: 393 });
  await stillHero(page);
  const c = await city(page);
  expect(Math.hypot(c.hero.x - 101, c.hero.y - 480)).toBeLessThan(45);
  const hero = await onPage(page, c.hero);
  expect(hero.x).toBeGreaterThanOrEqual(0);
  expect(hero.x).toBeLessThanOrEqual(851);
  expect(hero.y).toBeGreaterThanOrEqual(0);
  expect(hero.y).toBeLessThanOrEqual(393);
});

test('switching apps mid-walk (tab hidden) and back: no stuck keys, the hero stops and walks again', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'], at: { x: 1100, y: 560 } });
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await stillHero(page);
  const x0 = (await city(page)).hero.x;
  await page.waitForTimeout(800);
  expect((await city(page)).hero.x).toBe(x0);
  await page.keyboard.up('ArrowLeft');
  const to = await onPage(page, { x: 1000, y: 560 });
  await page.touchscreen.tap(to.x, to.y);
  await stillHero(page);
  expect(Math.abs((await city(page)).hero.x - 1000)).toBeLessThan(30);
});

test('the hero is never stranded: after a tap on the bridge, a tap on the bus park brings them back', async ({ page }) => {
  // Tall phone: the whole map, the bridge too, is on screen at the far zoom.
  await page.setViewportSize({ width: 393, height: 851 });
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'], at: { x: 1280, y: 780 } });
  const bridge = await onPage(page, { x: 1412.5, y: 912.5 });
  await page.touchscreen.tap(bridge.x, bridge.y);
  await page.waitForTimeout(400);
  await stillHero(page);
  const on = (await city(page)).hero;
  // gamedev: the pavement by the bus park (by the Mama Put). At this size the "Lights out" pin's tap
  // area covers the bus park (820, 700) up to x 828, and a tap on or just beside a pin opens its card
  // (the phone snaps a tap to a button a few px away) instead of walking.
  const park = await onPage(page, { x: 905, y: 720 });
  await page.touchscreen.tap(park.x, park.y);
  await page.waitForTimeout(600);
  await stillHero(page);
  const back = (await city(page)).hero;
  expect(Math.hypot(back.x - 905, back.y - 720), `stranded at ${JSON.stringify(on)}`).toBeLessThan(40);
});

test('the walker never enters the lagoon by keys: holding down along the shore stays on land', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'], at: { x: 820, y: 700 } });
  for (const keys of [['ArrowDown'], ['ArrowDown', 'ArrowLeft'], ['ArrowDown', 'ArrowRight']]) {
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(1500);
    for (const k of keys) await page.keyboard.up(k);
    await stillHero(page);
    const h = (await city(page)).hero;
    // Off the jetty and the bridge, land ends above the shore (y 862).
    const onJettyOrBridge = (h.x >= 405 && h.x <= 450) || h.x >= 1300;
    if (!onJettyOrBridge) expect(h.y, JSON.stringify(h)).toBeLessThan(862);
  }
});

test('slowed 4x CPU: walking past the working Mama Put and market with coins flying stays at 45 fps or more', async ({ page }) => {
  test.setTimeout(120_000);
  await openCity(page, { kobo: 800, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka', 'collect'] });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await page.getByRole('button', { name: 'Zoom in' }).tap();
    await page.waitForTimeout(800);
    // Pay the market (flying coins), then collect from the Mama Put, walking all the way.
    await page.locator('[data-build="market"]').tap({ force: true });
    const fps = await page.evaluate(
      () =>
        new Promise<number>((done) => {
          const t: number[] = [];
          const step = (now: number) => {
            t.push(now);
            if (now - t[0]! < 4000) requestAnimationFrame(step);
            else done((t.length - 1) / ((now - t[0]!) / 1000));
          };
          requestAnimationFrame(step);
        }),
    );
    expect(fps).toBeGreaterThanOrEqual(45);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
});
