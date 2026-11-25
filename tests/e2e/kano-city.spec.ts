/**
 * K6b (docs/kano.md 6.2 to 6.5 and 8; decisions 71, 80): Kano from above is Kano's home. From a
 * save with Borehole Hall won (the taps flow: no Dry taps pin, the water queue), the leather
 * stalls built with a full tray, and money earned elsewhere in the one wallet:
 * - the heading's Booming meter, the chips, the pins (problem or ready) and the boards (the grain
 *   market waits for the clean road, the groundnut pyramid for the boom);
 * - collect the leather stalls' tray (W18 with Kano's names and the once-only tax line);
 * - pay for the Clean road (the grain market's board comes), then the lamps and the mast; at 20
 *   points "Kano is booming!" and the groundnut pyramid's board;
 * - Travel counts Kano's points; the Challenge road has Kano's stops; Harmattan Road is the lane
 *   run with kano-lane.json and its own look; a Power bulb goes into the one wallet; "Back to Kano".
 * Checks the save at each step (Kano's fixes and places under states.kano.city, never money
 * there; Lagos and Ogun as they were), that the still city draws nothing, and no page errors.
 * Also: before Dawanau is cleared, the Dry taps card sends you to the next street; the city at
 * 320 x 240 keeps its rows on screen.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const DONE = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 0 } };
const KANO_STREETS = { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 }, 3: { done: true, best: 1300 } };
/** Lagos's city with ₦40, Power 9 and Tech 7 in the one wallet. */
const CITY = { kobo: 4000, power: 9, tech: 7, fixed: ['potholes'], fixes: 1, paid: {}, built: [], trays: {}, boom: 4, boomCollect: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const OGUN_CITY = { fixed: ['dryTaps'], fixes: 1, paid: {}, built: [], trays: {}, boom: 4, boomCollect: 0, boomSeen: 0, hints: ['walk', 'pin', 'gate'] };
/** Kano: the leather stalls built (4 points) with a full tray; the dye pits half paid. */
const KANO_CITY = { fixed: [], fixes: 0, paid: { dye: 300 }, built: ['leather'], trays: { leather: 120 }, boom: 4, boomCollect: 0, boomSeen: 0, hints: ['pin'] };
const SAVE = {
  v: 2,
  states: { lagos: DONE, ogun: { ...DONE, arrived: true, city: OGUN_CITY }, kano: { arrived: true, streets: KANO_STREETS, parcel: false, hall: { done: true, best: 0 }, city: KANO_CITY } },
  city: CITY,
  where: 'kano',
};
const SHOTS = process.env['K6B_SHOTS'];
const BOARD: Record<string, string> = { sandyRoad: 'Clean road', leather: 'Leather stalls', lightsOut: 'Lamps', slowInternet: 'Mast', dye: 'Dye pits', grain: 'Grain market', pyramid: 'Groundnut pyramid' };

type Obj = Record<string, unknown>;
type Saved = { city: Obj; states: { lagos: Obj; ogun: Obj & { city?: Obj }; kano: Obj & { city?: Obj; lane?: Obj } } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const kanoCity = async (page: Page): Promise<Obj> => (await saved(page)).states.kano.city ?? {};
const draws = (page: Page) => page.evaluate(() => (window.__game!.kanoHome as unknown as { draws: number } | null)?.draws ?? -1);

async function open(page: Page, save: object): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

/**
 * Taps a pin, board or tray bubble; one under the bottom rows (or off the map) is reached by its
 * edge arrow, as a player would.
 */
async function tapThing(page: Page, sel: string, word: string): Promise<void> {
  const el = page.locator(`.kano-city ${sel}`);
  const arrow = page.locator(`.kano-city .city-arrow[data-for="${word}"]:not([hidden])`);
  await expect.poll(async () => (await arrow.count()) + (await el.isVisible() ? 1 : 0)).toBeGreaterThan(0);
  if ((await arrow.count()) > 0) await arrow.first().tap();
  else await el.tap({ trial: true, timeout: 1000 }).then(() => el.tap(), () => arrow.first().tap());
}

/** Taps a board and waits until the hero has walked onto its mat and the build is saved. */
async function buy(page: Page, board: string, key: 'fixed' | 'built'): Promise<void> {
  const city = page.locator('.kano-city');
  await expect(city.locator(`[data-build="${board}"]`)).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (window.__game!.kanoHome as unknown as { test: { paying: boolean; open: string | null } }).test.paying)).toBe(false);
  await tapThing(page, `[data-build="${board}"]`, BOARD[board]!);
  await expect.poll(async () => ((await kanoCity(page))[key] as string[] | undefined) ?? [], { timeout: 20_000 }).toContain(board);
}

test('Kano from above: collect, buy with the one wallet, the boom, Travel, the Challenge road and Harmattan Road', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await open(page, SAVE);
  const city = page.locator('.kano-city');
  await expect(city).toBeVisible();
  await expect(city.locator('.city-head')).toHaveAttribute('aria-label', 'Kano. Booming meter. 4 of 20 to the next boom.');
  await expect(city.locator('.chip-naira')).toContainText('₦40');
  await expect(city.locator('.chip-power')).toContainText('Power 9');
  await expect(city.locator('.chip-tech')).toContainText('Tech 7');
  // The taps flow (the hall is won): no Dry taps pin; the others problem or ready, never colour alone.
  await expect(city.locator('.city-pin[data-spot="dryTaps"]')).toHaveCount(0);
  await expect(city.locator('[data-spot="sandyRoad"]')).toHaveAttribute('aria-label', 'Sandy road, ready to fix');
  await expect(city.locator('[data-spot="lightsOut"]')).toHaveAttribute('aria-label', 'Lights out, ready to fix');
  await expect(city.locator('[data-spot="slowInternet"]')).toHaveAttribute('aria-label', 'Slow internet, ready to fix');
  // The boards: road, lamps, mast, dye pits (the grain market waits for the road, the pyramid for the boom).
  expect(await city.locator('.city-board').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['build']).sort())).toEqual(['dye', 'lightsOut', 'sandyRoad', 'slowInternet']);
  await expect(city.locator('[data-build="dye"]')).toHaveAttribute('aria-label', 'Dye pits. 5 naira left. You have 40 naira. Walk there.');
  // The Play buttons, KM1 to KM5's Missions, the Challenge road, Travel, Hero and the wheel (MS-R4:
  // in Settings where the row has no room); Sound and Settings at the top.
  for (const b of ['Play Kurmi', 'Play Kofar Mata', 'Play Dawanau', 'Go to Borehole Hall', 'Missions', 'Challenge road', 'Travel', 'Hero']) await expect(city.locator('.city-bottom').getByRole('button', { name: b, exact: true })).toBeVisible();
  await expect(city.locator('.city-top').getByRole('button', { name: 'Settings' })).toBeVisible();

  // The still city draws nothing (its only place is full, so it rests).
  await page.waitForTimeout(2500);
  const d0 = await draws(page);
  await page.waitForTimeout(1500);
  expect(await draws(page), 'a still city draws nothing').toBe(d0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/k6b-city.png` });

  // 1. Collect the leather stalls' full tray: W18 with Kano's names, the tax line once, 1 Booming point.
  await tapThing(page, '[data-place="leather"]', 'Leather stalls');
  await expect(city.locator('.city-banner')).toHaveText('The leather stalls paid ₦1.20 tax!', { timeout: 20_000 });
  await expect(city.locator('.city-hint')).toHaveText('Busy shops pay a small tax. Kano uses it to fix more.');
  let s = await saved(page);
  expect(s.city['kobo']).toBe(4120);
  expect(s.states.kano.city!['trays']).toEqual({ leather: 0 });
  expect(s.states.kano.city!['boom']).toBe(5);
  expect(s.states.kano.city!['hints']).toContain('taxKano');

  // 2. The Clean road (₦12): the grain market's board comes.
  await buy(page, 'sandyRoad', 'fixed');
  s = await saved(page);
  expect(s.city['kobo']).toBe(2920);
  expect(s.states.kano.city).not.toHaveProperty('kobo');
  expect(s.states.kano.city!['boom']).toBe(9);
  await expect(city.locator('.city-banner')).toHaveText('Clean road here. Carts and buses are moving.', { timeout: 10_000 });
  await expect(city.locator('[data-build="grain"]')).toHaveCount(1);
  await expect(city.locator('.city-pin[data-spot="sandyRoad"]')).toHaveCount(0);

  // 3. The lamps (Power 8) and the mast (Tech 6).
  await buy(page, 'lightsOut', 'fixed');
  await buy(page, 'slowInternet', 'fixed');
  s = await saved(page);
  expect([s.city['power'], s.city['tech']]).toEqual([1, 1]);
  expect(s.states.kano.city!['boom']).toBe(17);

  // 4. The grain market (₦8) makes 21: "Kano is booming!" and the groundnut pyramid's board.
  await buy(page, 'grain', 'built');
  const boom = page.getByRole('dialog', { name: 'Kano is booming!' });
  await expect(boom).toBeVisible({ timeout: 15_000 });
  await expect(boom.getByText('New shops are opening. More traders are coming to Kano.')).toBeVisible();
  await boom.getByRole('button', { name: 'See Kano' }).tap();
  await expect(city.locator('[data-build="pyramid"]')).toHaveCount(1);
  s = await saved(page);
  expect(s.city['kobo']).toBe(2120);
  expect(s.states.kano.city!['boomSeen']).toBe(20);
  // Lagos's and Ogun's own fields as they were; only the shared wallet moved.
  expect({ ...s.city, kobo: 0, power: 0, tech: 0, trays: {} }).toMatchObject({ fixed: ['potholes'], built: [], boom: 4 });
  expect(s.states.ogun.city).toMatchObject({ fixed: ['dryTaps'], boom: 4 });

  // 5. Travel counts Kano's points.
  await page.waitForTimeout(2600);
  await city.getByRole('button', { name: 'Travel' }).tap();
  const travel = page.getByRole('dialog', { name: 'Where to?' });
  await expect(travel.locator('[data-state="kano"]')).toContainText('Booming: 20 of 20');
  await travel.getByRole('button', { name: 'Back' }).tap();

  // 6. Kano's Challenge road: its stops in order, Harmattan Road's card.
  await city.getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await expect(page.locator('.road-stop')).toHaveCount(7);
  expect(await page.locator('.road-stop').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['where']))).toEqual(['toOgun', 'kurmi', 'lane', 'kofarMata', 'dawanau', 'hall', 'wayOn']);
  await expect(page.locator('[data-where="hall"]')).toHaveAttribute('aria-label', 'Stop 4, Borehole Hall. Done.');
  await expect(page.locator('[data-where="wayOn"]')).toHaveAttribute('aria-label', 'The way on. More of Nigeria. Coming soon.');
  await page.waitForTimeout(800);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/k6b-road.png` });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="lane"]').tap();
  const card = page.getByRole('dialog', { name: 'Side road: Harmattan Road' });
  await expect(card.getByText('Lamps on and fast internet here.')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Run the Harmattan Road' }).tap();

  // 7. Harmattan Road: the lane run with Kano's file and look; a bulb's Power goes into the one wallet.
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  expect(await page.evaluate(() => ({ level: window.__lane!.level, theme: window.__lane!.theme }))).toEqual({ level: 'kano-lane', theme: 'harmattan' });
  await page.evaluate(() => {
    window.__lane!.warp(140);
    window.__lane!.setGap(30);
  });
  await expect.poll(() => page.evaluate(() => window.__lane!.haul.power), { timeout: 8000 }).toBeGreaterThanOrEqual(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/k6b-lane.png` });
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  const haul = await page.evaluate(() => window.__lane!.haul);
  s = await saved(page);
  expect(s.city['power']).toBe(1 + haul.power);
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Back to Kano' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await expect(page.locator('.kano-city .city-banner')).toContainText(/^You brought .* home\.$/);
  await expect(page.locator('.kano-city .chip-power')).toContainText(`Power ${1 + haul.power}`);
  s = await saved(page);
  expect(s.states.kano['lane']).toBeTruthy();
  expect(s.states.lagos).toEqual(DONE);
  expect(s.states.kano['streets']).toEqual(KANO_STREETS);
  expect(errors).toEqual([]);
});

test('before Dawanau is cleared the Dry taps card sends you on to the next street; Kurmi from the Sandy road card', async ({ page }) => {
  const errors = await open(page, { ...SAVE, states: { ...SAVE.states, kano: { arrived: true, streets: { 1: KANO_STREETS[1] }, parcel: false } } });
  const city = page.locator('.kano-city');
  await expect(city.locator('[data-spot="dryTaps"]')).toHaveAttribute('aria-label', 'Dry taps, problem');
  await tapThing(page, '.city-pin[data-spot="dryTaps"]', 'Dry taps');
  const dry = page.getByRole('dialog', { name: 'Dry taps' });
  await expect(dry.getByText('The taps are dry. Rusty Borehole is clogged with dust.')).toBeVisible();
  await expect(dry.getByText('Clear Kurmi, Kofar Mata and Dawanau to reach Borehole Hall.')).toBeVisible();
  await expect(dry.getByRole('button', { name: 'Run Kofar Mata' })).toBeVisible();
  await dry.getByRole('button', { name: 'Back' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await tapThing(page, '.city-pin[data-spot="sandyRoad"]', 'Sandy road');
  const sandy = page.getByRole('dialog', { name: 'Sandy road' });
  await expect(sandy.getByText("Sand is on the road. Carts can't get through.")).toBeVisible();
  await expect(sandy.getByText('Run Kurmi to earn Naira.')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await sandy.getByRole('button', { name: 'Run Kurmi' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-1');
  expect(errors).toEqual([]);
});

/** Kano before Borehole Hall is won: the Dry taps pin is on the map. */
const DRY = { ...SAVE, states: { ...SAVE.states, kano: { arrived: true, streets: KANO_STREETS, parcel: false, city: { ...KANO_CITY, paid: {} } } } };
for (const size of [{ width: 568, height: 320 }, { width: 851, height: 393 }]) {
  test(`K7 (qa): at ${size.width} x ${size.height} no shown pin's round sits under a top button (within 10 px); a hidden pin has its edge arrow`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors = await open(page, DRY);
    await page.waitForTimeout(1200);
    const out = await page.evaluate(() => {
      const city = document.querySelector<HTMLElement>('.kano-city')!;
      const tops = [...city.querySelectorAll<HTMLElement>('.city-top button')].filter((e) => e.offsetParent !== null).map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent ?? '', r: e.getBoundingClientRect() }));
      const WORD: Record<string, string> = { sandyRoad: 'Sandy road', lightsOut: 'Lights out', slowInternet: 'Slow internet', dryTaps: 'Dry taps' };
      const faults: string[] = [];
      const spots: string[] = [];
      for (const pin of city.querySelectorAll<HTMLElement>('.city-pin')) {
        const spot = pin.dataset['spot']!;
        spots.push(spot);
        if (pin.hidden) {
          const arrow = [...city.querySelectorAll<HTMLElement>(`.city-arrow[data-for="${WORD[spot]}"]`)].some((a) => !a.hidden);
          if (!arrow) faults.push(`pin ${spot} hidden with no edge arrow`);
          continue;
        }
        // The round's middle: 50 px up from the picture's bottom (as qa-k6c reads it).
        const r = pin.querySelector('canvas')!.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.bottom - 50;
        for (const t of tops) if (x > t.r.left - 10 && x < t.r.right + 10 && y > t.r.top - 10 && y < t.r.bottom + 10) faults.push(`pin ${spot}'s round under "${t.name}"`);
      }
      return { faults, spots };
    });
    expect(out.spots).toContain('dryTaps');
    expect(out.faults).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('Kano from above at 320 x 240: the top and bottom rows on screen, 44 px tall', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await open(page, SAVE);
  const boxes = await page.locator('.kano-city .city-top button, .kano-city .city-bottom button').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent ?? '', ...(JSON.parse(JSON.stringify(e.getBoundingClientRect())) as DOMRect) })),
  );
  // Sound, Settings; K6c: one Play button, Missions, Challenge road, Travel, Hero and the zoom pair.
  expect(boxes.length).toBeGreaterThanOrEqual(9);
  for (const b of boxes) {
    expect(b.left, b.name).toBeGreaterThanOrEqual(0);
    expect(b.right, b.name).toBeLessThanOrEqual(320);
    expect(b.top, b.name).toBeGreaterThanOrEqual(0);
    expect(b.bottom, b.name).toBeLessThanOrEqual(240);
    expect(b.height, b.name).toBeGreaterThanOrEqual(44);
  }
});

/** Frames while a mouse holds and slides on open map for about 2 s (the hero walks, the map draws). */
async function drag(page: Page): Promise<{ fps: number; draws: number }> {
  const box = (await page.locator('.kano-city .city-map').boundingBox())!;
  await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__f = [];
    w.__on = true;
    const f = (now: number): void => {
      w.__f.push(now);
      if (w.__on) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const d0 = await draws(page);
  const start = await page.evaluate(({ x, y, w, h }) => {
    for (let dy = 0; dy < h / 3; dy += 12)
      for (const sy of [1, -1])
        for (let dx = 0; dx < w / 4; dx += 12)
          for (const sx of [1, -1]) if (document.elementFromPoint(x + w / 2 + sx * dx, y + h / 2 + sy * dy)?.matches('.kano-city .city-map')) return { x: x + w / 2 + sx * dx, y: y + h / 2 + sy * dy };
    return { x: x + w / 2, y: y + h / 2 };
  }, { x: box.x, y: box.y, w: box.width, h: box.height });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(start.x - 150, start.y - 40, { steps: 15 });
    await page.mouse.move(start.x + 150, start.y + 40, { steps: 15 });
  }
  await page.mouse.up();
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__on = false;
    return w.__f;
  });
  return { fps: (frames.length - 1) / ((frames.at(-1)! - frames[0]!) / 1000), draws: (await draws(page)) - d0 };
}

test('slowed 4x CPU: walking Kano from above by hold and slide, far and near, at least 45 fps; still, it draws nothing', async ({ page }) => {
  test.setTimeout(120_000);
  const city = { ...KANO_CITY, fixed: ['sandyRoad', 'lightsOut'], built: ['leather', 'dye', 'grain'], trays: { leather: 120, dye: 120, grain: 240 }, boom: 20, boomSeen: 20, hints: ['pin', 'walk', 'taxKano'] };
  await open(page, { ...SAVE, states: { ...SAVE.states, kano: { ...SAVE.states.kano, city } } });
  await page.waitForTimeout(3000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const out: string[] = [];
  for (const zoom of ['far', 'near'] as const) {
    if (zoom === 'near') await page.locator('.kano-city').getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(1500);
    const r = await drag(page);
    out.push(`${zoom}: ${r.fps.toFixed(1)} fps, ${r.draws} draws`);
    expect(r.draws, 'the walk redraws the map').toBeGreaterThan(10);
    expect(r.fps, `fps ${zoom}`).toBeGreaterThanOrEqual(45);
  }
  // Every place is full: once still, nothing is drawn.
  await page.waitForTimeout(3000);
  const d0 = await draws(page);
  await page.waitForTimeout(1500);
  expect(await draws(page), 'a still city with its places full draws nothing').toBe(d0);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  test.info().annotations.push({ type: 'kano city fps 4x', description: out.join('; ') });
  console.log(`kano city 4x: ${out.join('; ')}`);
});
