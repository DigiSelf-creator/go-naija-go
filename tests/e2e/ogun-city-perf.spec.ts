/**
 * O6b (docs/ogun.md 9.2: Ogun's city idle draws nothing, drag at least 45 fps at 4x CPU; O6c's
 * bar): Ogun's city beside Lagos's city in the same run, on the phone profile at 4x CPU. In each,
 * a finger holds and slides back and forth for about 2 s at far and at near zoom (the hero walks,
 * the camera follows). Ogun's has its three tax places built and serving, all its boards up but
 * the ones paid, and the hero walking past them. Pass: 45 fps or more in every case; standing
 * still, Ogun's city draws nothing once its places are full (and with reduced motion). The fixed
 * work at 1x and 4x shows the slowdown is on (the computer's load is reported).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const BAR = 45;
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const D = { done: true, best: 100 };
const LAGOS = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: D };
const CITY = { kobo: 5000, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 40 }, boom: 8, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
/** Ogun's city: the road, the adire market and the garri mill built and serving (trays not full), the boom not yet. */
const OGUN_CITY = { fixed: ['potholes'], fixes: 1, built: ['adire', 'mill'], trays: { adire: 20, mill: 30 }, boom: 12, hints: ['walk', 'taxOgun'] };
const save = (where: 'lagos' | 'ogun') => ({ v: 2, states: { lagos: LAGOS, ogun: { arrived: true, streets: { 1: D, 2: D, 3: D }, hall: D, city: OGUN_CITY } }, city: CITY, where });

type Shot = { draws: number; hero: { moving: boolean } };
const drawsOf = (page: Page, ogun: boolean) => page.evaluate((o) => (o ? (window.__game!.ogunCity as unknown as Shot | null)?.draws : window.__game!.city?.draws) ?? -1, ogun);
const movingOf = (page: Page, ogun: boolean) => page.evaluate((o) => (o ? (window.__game!.ogunCity as unknown as Shot | null)?.hero.moving : window.__game!.city?.hero.moving) ?? false, ogun);

const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

/**
 * Opens a city from a fresh save. The save is written as the new page starts (an init script):
 * the page going away still writes its own copy as it hides, which would win otherwise.
 */
async function open(page: Page, where: 'lagos' | 'ogun', p: object = save(where)): Promise<void> {
  await page.evaluate((seed) => sessionStorage.setItem('o6b-seed', seed), JSON.stringify(p));
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 20_000 }).toBe(where === 'ogun' ? 'ogun' : 'city');
  if (where === 'ogun') await expect(page.locator('.ogun-city')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS + 800);
}

/** Frames while a finger drags back and forth for about 2 s; the map draws in that time. */
async function drag(page: Page, ogun: boolean): Promise<{ fps: number; secs: number; draws: number }> {
  const box = (await page.locator(ogun ? '.ogun-city .city-map' : '.city-map').boundingBox())!;
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
  const d0 = await drawsOf(page, ogun);
  // Start the hold on open map, not on a pin, board or bubble (a press there is a tap on it).
  const start = await page.evaluate(({ x, y, w, h, sel }) => {
    for (let dy = 0; dy < h / 3; dy += 12)
      for (const sy of [1, -1])
        for (let dx = 0; dx < w / 4; dx += 12)
          for (const sx of [1, -1]) {
            const px = x + w / 2 + sx * dx;
            const py = y + h / 2 + sy * dy;
            if (document.elementFromPoint(px, py)?.matches(sel)) return { x: px, y: py };
          }
    return { x: x + w / 2, y: y + h / 2 };
  }, { x: box.x, y: box.y, w: box.width, h: box.height, sel: ogun ? '.ogun-city .city-map' : '.city-map' });
  const cx = start.x;
  const cy = start.y;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(cx - 150, cy - 40, { steps: 15 });
    await page.mouse.move(cx + 150, cy + 40, { steps: 15 });
  }
  await page.mouse.up();
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__on = false;
    return w.__f;
  });
  const secs = (frames[frames.length - 1]! - frames[0]!) / 1000;
  return { fps: (frames.length - 1) / secs, secs, draws: (await drawsOf(page, ogun)) - d0 };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((look) => {
    const seed = sessionStorage.getItem('o6b-seed');
    if (!seed) return;
    sessionStorage.removeItem('o6b-seed');
    localStorage.setItem('gidi-look', look);
    localStorage.setItem('gidi-intro', '"seen"');
    localStorage.setItem('gidi-progress', seed);
  }, LOOK);
});

test('slowed 4x CPU: Ogun\'s city beside Lagos\'s, walking by hold and slide near and far, at least 45 fps; Ogun\'s still city draws nothing once its places rest', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  const cdp = await page.context().newCDPSession(page);
  const work1 = await busy(page);
  const results: string[] = [];
  const all: { name: string; fps: number }[] = [];
  let work4 = 0;
  try {
    for (const where of ['lagos', 'ogun'] as const) {
      await open(page, where);
      const ogun = where === 'ogun';
      // O6b2 (OG-R43 a): Ogun's walkers are in before it is timed, as Lagos's are (people must stay cheap).
      if (ogun) {
        await expect.poll(() => page.evaluate(() => (window.__game!.ogunCity as unknown as { test: { folk: number } }).test.folk), { timeout: 15_000 }).toBeGreaterThan(0);
        results.push(`ogun walkers: ${await page.evaluate(() => (window.__game!.ogunCity as unknown as { test: { folk: number } }).test.folk)}`);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      if (!work4) work4 = await busy(page);
      await page.waitForTimeout(500);
      for (const zoom of ['far', 'near'] as const) {
        if (zoom === 'near') await page.getByRole('button', { name: 'Zoom in' }).tap();
        await page.waitForTimeout(400);
        const r = await drag(page, ogun);
        const name = `${where} ${zoom}`;
        results.push(`${name}: ${r.fps.toFixed(1)} fps over ${r.secs.toFixed(1)} s, ${r.draws} map draws`);
        all.push({ name, fps: r.fps });
        expect(r.draws, `${name}: the walk redraws the map`).toBeGreaterThan(10);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await expect.poll(() => movingOf(page, ogun), { timeout: 20_000 }).toBe(false);
    }
    // Ogun, standing still: its places serve with a small redraw at most twice a second; once
    // they are full they rest and nothing at all is drawn.
    await page.waitForTimeout(800);
    let d0 = await drawsOf(page, true);
    await page.waitForTimeout(2000);
    const serving = (await drawsOf(page, true)) - d0;
    results.push(`ogun still, places serving: ${serving} draws in 2 s`);
    expect(serving, 'at most 2 small redraws a second while a place serves').toBeLessThanOrEqual(5);
    await open(page, 'ogun', { ...save('ogun'), states: { ...save('ogun').states, ogun: { ...save('ogun').states.ogun, city: { ...OGUN_CITY, trays: { adire: 120, mill: 240 } } } } });
    await page.waitForTimeout(700);
    d0 = await drawsOf(page, true);
    await page.waitForTimeout(1500);
    const rest = (await drawsOf(page, true)) - d0;
    results.push(`ogun still, places full: ${rest} draws in 1.5 s`);
    expect(rest, 'a still city with its places full draws nothing').toBe(0);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const line = `4x CPU, the cities (bar ${BAR}): ${results.join('; ')}. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`;
  console.log(line);
  test.info().annotations.push({ type: 'ogun city fps 4x', description: line });
  expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
  for (const r of all) expect(r.fps, `fps: ${r.name}`).toBeGreaterThanOrEqual(BAR);
  expect(errors).toEqual([]);
});
