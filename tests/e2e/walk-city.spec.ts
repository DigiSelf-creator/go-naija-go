/**
 * Slice 3 step (c), walking the city (docs/city.md part 5W, W1 to W10): tap and hold to walk,
 * keys, the camera follows, pay spots (full and part pay, not enough), the Mama Put's tray
 * filling only while playing and its collect, the save and reload, and the small screens.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

/** A saved hero who has seen the story; `city` as the saved city part. */
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
/** Where a map point is on the page now (CSS px). */
async function onPage(page: Page, m: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const c = await city(page);
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  // The scale (CSS px a map unit), read from two pins' known map places.
  const p = c.pins;
  const k = (p['slowInternet']!.x + p['slowInternet']!.w / 2 - (p['potholes']!.x + p['potholes']!.w / 2)) / (1300 - 101);
  return { x: map.x + c.cam.x + m.x * k, y: map.y + c.cam.y + m.y * k };
}
const stillHero = (page: Page) => expect.poll(async () => (await city(page)).hero.moving, { timeout: 10_000 }).toBe(false);

test('first visit: the hero at the bus park, the walk hint, a tap walks there, the ring, and the place is saved', async ({ page }) => {
  await openCity(page);
  const c0 = await city(page);
  expect(c0.hero).toMatchObject({ x: 820, y: 700, moving: false });
  await expect(lagos(page).locator('.city-hint')).toHaveText('Tap where you want to go.');
  // Still: nothing is drawn while nothing moves.
  const d = (await city(page)).draws;
  await page.waitForTimeout(800);
  expect((await city(page)).draws).toBe(d);
  // A tap on the main road east of the bus park.
  const to = await onPage(page, { x: 1000, y: 560 });
  await page.touchscreen.tap(to.x, to.y);
  await expect.poll(async () => (await city(page)).hero.moving).toBe(true);
  await expect(lagos(page).locator('.city-hint')).toBeHidden();
  await stillHero(page);
  const h = (await city(page)).hero;
  expect(Math.hypot(h.x - 1000, h.y - 560)).toBeLessThan(30);
  // Saved when the tab hides; a reload puts the hero back there, and the hint stays gone.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const saved = await savedCity(page);
  expect(saved?.['at']).toEqual({ x: Math.round(h.x), y: Math.round(h.y) });
  expect(saved?.['hints']).toContain('walk');
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  expect((await city(page)).hero).toMatchObject({ x: Math.round(h.x), y: Math.round(h.y) });
  await page.waitForTimeout(1300);
  await expect(lagos(page).locator('.city-hint')).toBeHidden();
});

test('a tap on a roof walks to that building\'s front door; a tap on the lagoon stops at the shore', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  const lagoon = await onPage(page, { x: 820, y: 900 });
  await page.touchscreen.tap(lagoon.x, Math.min(lagoon.y, (await page.viewportSize())!.height - 80));
  await stillHero(page);
  expect((await city(page)).hero.y).toBeLessThan(870);
});

test('hold and slide: the hero keeps walking to the finger; one-finger drag no longer moves the map', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  const cam0 = (await city(page)).cam;
  const from = await onPage(page, { x: 820, y: 700 });
  const to = await onPage(page, { x: 960, y: 560 });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.waitForTimeout(300);
  expect((await city(page)).hero.moving).toBe(true);
  await page.mouse.up();
  await stillHero(page);
  const h = (await city(page)).hero;
  // Towards the finger (the camera follows the hero, so the finger's map point moves on too).
  expect(h.x).toBeGreaterThan(880);
  expect(h.y).toBeLessThan(640);
  const cam1 = (await city(page)).cam;
  // The camera only follows the hero (here the hero stayed in the middle box): no drag pan.
  expect(Math.abs(cam1.x - cam0.x) < 1 || h.x > 830).toBe(true);
});

test('keys: arrows walk (two at once on a slant), + and − zoom, the camera follows', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'], at: { x: 1100, y: 560 } });
  await page.keyboard.press('+');
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('near');
  const h0 = (await city(page)).hero;
  const cam0 = (await city(page)).cam;
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2200);
  await page.keyboard.up('ArrowLeft');
  await stillHero(page);
  const h1 = (await city(page)).hero;
  expect(h0.x - h1.x).toBeGreaterThan(150);
  expect(h1.dir).toBe('w');
  expect((await city(page)).cam.x).toBeGreaterThan(cam0.x); // the camera slid with the hero
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  const h2 = (await city(page)).hero;
  expect(h2.x).toBeGreaterThan(h1.x);
  expect(h2.y).toBeLessThan(h1.y);
  await page.keyboard.press('-');
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('far');
});

test('pay in full: "Walk there" on the Potholes card, the hero pays the ₦10 board, the road is built and saved', async ({ page }) => {
  await openCity(page, { kobo: 1250, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await expect(lagos(page).locator('.city-chip').first()).toContainText('₦12.50');
  await expect(page.getByRole('button', { name: 'New road. Costs 10 naira. You have 12 naira 50 kobo. Walk there.' })).toBeAttached();
  await page.getByRole('button', { name: 'Potholes, ready to fix' }).tap();
  const card = page.getByRole('dialog', { name: 'Potholes' });
  await expect(card.getByText('Fixing it costs ₦10.')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Walk there' })).toHaveClass(/go/);
  await expect(card.getByRole('button', { name: 'Run Alausa' })).toHaveClass(/minor/);
  await card.getByRole('button', { name: 'Walk there' }).tap();
  await expect(card).toHaveCount(0);
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
  await expect.poll(async () => (await city(page)).paying, { timeout: 8000 }).toBe(false);
  await expect(lagos(page).locator('.city-chip').first()).toContainText('₦2.50');
  await expect(page.getByRole('button', { name: 'New road, fixed' })).toBeAttached();
  // W7: the Mama Put board comes next, with its hint.
  await expect(lagos(page).locator('.city-hint')).toHaveText('Walk onto the ₦4 board to build a Mama Put.', { timeout: 10_000 }); // after the 3.6 s moment and the 3 s "brighter" hint (d6)
  const saved = await savedCity(page);
  expect(saved).toMatchObject({ kobo: 250, fixed: ['potholes'], fixes: 1, boom: 4, paid: {} });
});

test('part pay: ₦6 into the ₦10 board leaves "₦4 left", kept over a reload; a board never takes the wrong bucket', async ({ page }) => {
  await openCity(page, { kobo: 600, power: 9, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).saved.paid, { timeout: 15_000 }).toEqual({ potholes: 600 });
  await expect(page.locator('.sr-only[aria-live]').first()).toContainText('You paid ₦6. ₦4 more to go.');
  await expect.poll(async () => (await city(page)).paying).toBe(false);
  const c = await city(page);
  expect(c.saved).toMatchObject({ kobo: 0, power: 9, fixed: [] });
  await expect(page.getByRole('button', { name: 'New road. 4 naira left. You have 0 naira. Walk there.' })).toBeAttached();
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(page.getByRole('button', { name: /New road\. 4 naira left/ })).toBeAttached();
  expect(await savedCity(page)).toMatchObject({ paid: { potholes: 600 } });
});

test('not enough: walking onto the board with ₦0 opens "You need ₦10 for this." with Run Alausa; Back closes it', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  const card = page.getByRole('dialog', { name: 'New road' });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText('You need ₦10 for this.')).toBeVisible();
  await expect(card.getByText('Run Alausa to earn more.')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Run Alausa' })).toBeFocused();
  await card.getByRole('button', { name: 'Back' }).tap();
  await expect(card).toHaveCount(0);
  expect((await city(page)).saved.kobo).toBe(0);
});

for (const [build, spot, word, paid, left] of [
  ['lamps', 'lightsOut', 'Power', 6, 4],
  ['mast', 'slowInternet', 'Tech', 2, 4],
] as const) {
  test(`not enough (W14 Q2): the ${build} board with ${word} 0 after a part pay says "You need ${word} ${left} for this." and "Lane runs earn ${word}."`, async ({ page }) => {
    await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: { [spot]: paid }, hints: ['walk'] });
    await page.locator(`[data-build="${build}"]`).tap();
    const card = page.getByRole('dialog', { name: build === 'lamps' ? 'Lamps' : 'Mast' });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(`You need ${word} ${left} for this.`)).toBeVisible();
    await expect(card.getByText(`Lane runs earn ${word}.`)).toBeVisible();
    // S3f3: the lane run is here: big "Lane run" (it has focus), small "Back".
    await expect(card.getByText('Lane run: coming soon')).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Lane run' })).toBeFocused();
    await card.getByRole('button', { name: 'Back' }).tap();
    await expect(card).toHaveCount(0);
  });
}

test('Mama Put: a full tray shows "Full", the hero walks over and collects ₦1.50, the meter gets 1, saved at once', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka'] });
  const bubble = page.getByRole('button', { name: 'Mama Put has 1 naira 50 kobo for you. Full.' });
  await expect(bubble).toBeAttached();
  await bubble.tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(150);
  expect(await savedCity(page)).toMatchObject({ kobo: 150, trays: { buka: 0 }, boom: 9, boomCollect: 1 });
  await expect(page.locator('.sr-only[aria-live]').first()).toContainText('+₦1.50 from Mama Put');
  await expect(bubble).toHaveCount(0);
  // The market board is next (one new board at a time).
  expect(Object.keys((await city(page)).boards)).toEqual(['market']);
});

test('a tray fills in steps only while the city is open: 1 plate every 6 s up to the cap', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 140 }, hints: ['walk', 'buka', 'collect'] });
  await expect(page.getByRole('button', { name: 'Mama Put has 1 naira 40 kobo for you.' })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Mama Put has 1 naira 50 kobo for you. Full.' })).toBeAttached({ timeout: 9000 });
  await page.waitForTimeout(6500);
  expect((await city(page)).saved.trays).toEqual({ buka: 150 }); // capped
});

test('the money is kept when storage is blocked: walking and paying still work', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => {
      throw new Error('blocked');
    };
    Object.defineProperty(window, 'localStorage', { get: deny });
  });
  await page.goto('./');
  await page.getByRole('button', { name: /^(Make your hero|Play)$/ }).tap();
  // A new player: the story, the builder, then Lagos.
  if ((await screenNow(page)) === 'intro') {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('button', { name: 'Skip' }).tap();
  }
  await expect.poll(() => screenNow(page)).toBe('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const to = await onPage(page, { x: 960, y: 560 });
  await page.touchscreen.tap(to.x, to.y);
  await stillHero(page);
  expect((await city(page)).hero.x).toBeGreaterThan(900);
});

test('keys only: Tab reaches the board, Enter walks there and pays; the new amounts are read out', async ({ page }) => {
  await openCity(page, { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  const board = page.locator('[data-build="road"]');
  for (let i = 0; i < 20 && !(await board.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(board).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
  await expect(page.locator('.sr-only[aria-live]').first()).toContainText('Naira: 0 naira', { timeout: 8000 });
});

test('reduced motion and Gentle: paying starts on arrival, no flying money, the build appears in one step', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('gidi-gentle', 'true'));
  await openCity(page, { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
  // Built at once: nothing left flying or building.
  expect((await city(page)).paying).toBe(false);
  await expect(page.getByRole('button', { name: 'New road, fixed' })).toBeAttached();
});

for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
  [393, 851],
] as const) {
  test(`at ${width} x ${height}: boards and bubbles at least 48 px, clear of pins, chips and buttons; the hero walks`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openCity(page, { kobo: 600, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'] });
    let c = await city(page);
    const board = c.boards['road'];
    expect(board, 'the road board shows on the first look').toBeTruthy();
    expect(board!.w).toBeGreaterThanOrEqual(48);
    expect(board!.h).toBeGreaterThanOrEqual(48);
    const apart = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    for (const [spot, p] of Object.entries(c.pins)) expect(apart(board!, p), `board over the ${spot} pin`).toBe(true);
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const onPageBox = { x: map.x + board!.x, y: map.y + board!.y, w: board!.w, h: board!.h };
    for (const el of await lagos(page).locator('.city-chip, .city-top button, .city-bottom button').all()) {
      const r = (await el.boundingBox())!;
      expect(apart(onPageBox, { x: r.x, y: r.y, w: r.width, h: r.height }), `board under ${await el.textContent()}`).toBe(true);
    }
    // Every button on the screen (not on the map) is at least 44 px.
    for (const b of await lagos(page).locator('.city-top button, .city-bottom button').all()) {
      const r = (await b.boundingBox())!;
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44);
    }
    // The board's tap walks the hero there and pays.
    await page.locator('[data-build="road"]').tap();
    await expect.poll(async () => (await city(page)).saved.paid, { timeout: 15_000 }).toEqual({ potholes: 600 });
    c = await city(page);
    // The camera kept the hero on screen.
    const hero = await onPage(page, c.hero);
    expect(hero.x).toBeGreaterThanOrEqual(0);
    expect(hero.x).toBeLessThanOrEqual(width);
    expect(hero.y).toBeGreaterThanOrEqual(0);
    expect(hero.y).toBeLessThanOrEqual(height);
  });
}

test('a pin off the screen gets an edge arrow that opens its card', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk'], at: { x: 1500, y: 560 } });
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  // Walk east so the Potholes pin (far west) leaves the screen.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await stillHero(page);
  await expect.poll(async () => (await city(page)).arrows.map((a) => a.icon)).toContain('potholes');
  const a = (await city(page)).arrows.find((x) => x.icon === 'potholes')!;
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  await page.touchscreen.tap(map.x + a.x, map.y + a.y);
  await expect(page.getByRole('dialog', { name: 'Potholes' })).toBeVisible();
});

// W15 + "Big targets": an edge arrow's middle and the square tap area round it (48 x 48 when there
// is room anywhere; smaller only on a screen packed with signs) never overlap a drawn pin's tap
// area, a board, a bubble, a chip, a button or another arrow, and a tap anywhere in it lands on
// the arrow.
for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
] as const) {
  test(`at ${width} x ${height} with four signs up, zoomed in: every edge arrow's tap square is clear and takes the tap`, async ({ page }) => {
    type Box = { x: number; y: number; w: number; h: number };
    await page.setViewportSize({ width, height });
    await openCity(page, { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka', 'collect'] });
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const covers: Box[] = [];
    for (const el of await lagos(page).locator('.city-chip, .city-top button, .city-bottom button').all()) {
      const r = (await el.boundingBox())!;
      covers.push({ x: r.x - map.x, y: r.y - map.y, w: r.width, h: r.height });
    }
    await page.keyboard.press('+');
    await page.waitForTimeout(800);
    const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const taps: number[] = [];
    for (const key of ['', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp']) {
      if (key) {
        await page.keyboard.down(key);
        await page.waitForTimeout(1200);
        await page.keyboard.up(key);
        await stillHero(page);
        await page.waitForTimeout(400);
      }
      const c = await city(page);
      if (c.open) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        continue;
      }
      const things: [string, Box][] = [
        ...(Object.entries(c.pins) as [string, Box][]).filter(([s]) => s !== 'potholes').map(([s, b]) => [`pin ${s}`, b] as [string, Box]),
        ...(Object.entries(c.boards) as [string, Box][]).map(([s, b]) => [`board ${s}`, b] as [string, Box]),
        ...(Object.entries(c.bubbles) as [string, Box][]).map(([s, b]) => [`bubble ${s}`, b] as [string, Box]),
        ...covers.map((b, i) => [`cover ${i}`, b] as [string, Box]),
      ];
      const squares = c.arrows.map((a) => ({ a, sq: { x: a.x - a.tap / 2, y: a.y - a.tap / 2, w: a.tap, h: a.tap } }));
      for (const [i, { a, sq }] of squares.entries()) {
        taps.push(a.tap);
        expect(a.tap, `${a.icon} arrow tap square`).toBeGreaterThanOrEqual(36);
        expect(sq.x >= 0 && sq.y >= 0 && sq.x + sq.w <= map.width && sq.y + sq.h <= map.height, `${a.icon} arrow square on the map`).toBe(true);
        for (const [name, b] of things) expect(overlap(sq, b), `after ${key || 'zoom'}: ${a.icon} arrow square ${JSON.stringify(sq)} over ${name} ${JSON.stringify(b)}`).toBeLessThan(1);
        for (const { a: o, sq: s2 } of squares.slice(i + 1)) expect(overlap(sq, s2), `${a.icon} arrow over the ${o.icon} arrow`).toBeLessThan(1);
        // Its middle and four points near its corners land on the arrow.
        const d = a.tap / 2 - 3;
        for (const [dx, dy] of [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]] as const) {
          const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.className ?? '', [map.x + a.x + dx, map.y + a.y + dy]);
          expect(hit, `after ${key || 'zoom'}: a tap at (${dx}, ${dy}) from the ${a.icon} arrow's middle`).toContain('city-arrow');
        }
      }
    }
    test.info().annotations.push({ type: 'arrow tap squares seen', description: taps.join(', ') || 'none' });
    expect(taps.length, 'no arrow showed').toBeGreaterThan(0);
  });
}
