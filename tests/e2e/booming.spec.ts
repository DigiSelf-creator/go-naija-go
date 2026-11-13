/**
 * S3d1b, the Booming meter you can see (docs/city.md part 5 step (d), d12 done-when checks):
 * before and after (d12.1), the meter (d12.3), the layout on five screens (d12.4), the moment with
 * its times, skips and reduced motion (d12.5), the boom, its card, the cog and a closed tab
 * (d12.6), and what a screen reader hears (d12.9). Speed is in booming-perf ("slowed").
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
/** Pictures for qa and Tp: SHOTS=<folder> keeps them (the far view at 0, 8, 20; the moment; the boom card). */
const SHOTS = process.env['SHOTS'] ?? '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page: Page, name: string): Promise<void> => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

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
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos', exact: true });
const head = (page: Page) => lagos(page).locator('.city-top h2');
const said = (page: Page) => page.locator('.city-card > .sr-only[aria-live]');
const HINTS = ['walk', 'buka', 'collect', 'bright'];
type Box = { x: number; y: number; w: number; h: number };
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

/** Records, every frame, the moment's clock, the meter's words, the line over the hero and who moves. */
async function sample(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __s: unknown[]; __on: boolean };
    w.__s = [];
    w.__on = true;
    const f = (): void => {
      const c = window.__game!.city;
      if (c) {
        w.__s.push({
          now: performance.now(),
          t: c.watch.moment?.t ?? null,
          boom: c.watch.boom?.t ?? null,
          meter: document.querySelector('.city-head .boom-num')?.textContent ?? '',
          said: document.querySelector('.city-card > .sr-only[aria-live]')?.textContent ?? '',
          walkers: c.watch.walkers,
          danfo: c.watch.danfo,
          pin: !!document.querySelector('[data-spot="potholes"]'),
          card: document.querySelector('.city-problem h2')?.textContent ?? '',
        });
      }
      if (w.__on) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
type Sample = { now: number; t: number | null; boom: number | null; meter: string; said: string; walkers: number; danfo: { x: number; y: number } | null; pin: boolean; card: string };
const samples = (page: Page): Promise<Sample[]> =>
  page.evaluate(() => {
    const w = window as unknown as { __s: Sample[]; __on: boolean };
    w.__on = false;
    return w.__s;
  });

test('d12.1: the far view at 0, 8 and 20 points looks clearly different', async ({ page }) => {
  const saves = [
    { kobo: 0, fixed: [], built: [], boom: 0, hints: HINTS },
    { kobo: 0, fixed: ['potholes'], built: ['buka'], boom: 8, hints: HINTS },
    { kobo: 0, fixed: ['potholes', 'lightsOut'], built: ['buka', 'market'], boom: 20, boomSeen: 20, hints: HINTS },
  ];
  const brights: string[][] = [];
  const pics: Buffer[] = [];
  for (const [i, s] of saves.entries()) {
    await openCity(page, s);
    await page.waitForTimeout(300);
    brights.push([...(await city(page)).watch.bright]);
    pics.push(await page.locator('.city-map').screenshot());
    await shot(page, `far-${[0, 8, 20][i]}`);
  }
  expect(brights[0]).toEqual([]);
  expect(brights[1]!.length).toBeGreaterThanOrEqual(6);
  expect(brights[2]!.length).toBeGreaterThan(brights[1]!.length);
  expect(pics[0]!.equals(pics[1]!)).toBe(false);
  expect(pics[1]!.equals(pics[2]!)).toBe(false);
});

test('d12.3, d12.9: the meter reads "9 of 20" in the heading box and is spoken with it; a full collect fills one notch', async ({ page }) => {
  await openCity(page, { kobo: 0, fixed: ['potholes'], built: ['buka'], trays: { buka: 150 }, boom: 9, hints: HINTS, at: { x: 905, y: 800 } });
  await expect(head(page)).toHaveAccessibleName('Lagos. Booming meter. 9 of 20 to the next boom.');
  await expect(page.getByRole('heading', { name: 'Lagos' })).toBeVisible();
  await expect(head(page).locator('.boom-num')).toHaveText('9 of 20');
  await expect(head(page).locator('.boom-word')).toHaveText('Booming');
  // 5 steps of 4 notches; 2 full steps (a tick each), the third a quarter full.
  const bar = head(page).locator('svg').nth(1);
  await expect(bar.locator('rect[fill="#f2b300"]')).toHaveCount(9);
  await expect(bar.locator('path')).toHaveCount(2);
  // Walk to the Mama Put's door: the full tray is collected, the meter fills one notch.
  await page.locator('[data-place="buka"]').tap();
  await expect(head(page).locator('.boom-num')).toHaveText('10 of 20', { timeout: 10_000 });
  await expect(bar.locator('rect[fill="#f2b300"]')).toHaveCount(10);
  expect((await city(page)).saved.boom).toBe(10);
});

const SIZES = [
  [320, 240],
  [393, 851],
  [568, 320],
  [640, 360],
  [851, 393],
] as const;
for (const [width, height] of SIZES) {
  test(`d12.4 at ${width} x ${height}: the heading box fits its row, no chip wraps, nothing sits under it, the first look shows every pin`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    if (width === 320) await page.addInitScript(() => localStorage.setItem('gidi-sound', 'false'));
    await openCity(page, { kobo: 125000, power: 9, tech: 3, fixed: [], built: [], boom: 19, hints: HINTS });
    const hb = (await head(page).boundingBox())!;
    const small = width <= 640 || height <= 300;
    expect(hb.width, 'box width').toBeLessThanOrEqual(small ? 132 : 190);
    expect(hb.height, 'box height').toBeLessThanOrEqual(small ? 44 : 52);
    // Sound and Settings on the same row as the box, right of it.
    for (const b of await lagos(page).locator('.city-top-right button').all()) {
      const r = (await b.boundingBox())!;
      expect(r.y, `${await b.textContent()} on the box's row`).toBeLessThan(hb.y + hb.height);
      expect(r.x, `${await b.textContent()} right of the box`).toBeGreaterThanOrEqual(hb.x + hb.width);
    }
    // The chips on one row, under the box on a small screen.
    const chips = await lagos(page).locator('.city-chip').all();
    const tops = await Promise.all(chips.map(async (c) => (await c.boundingBox())!.y));
    expect(Math.max(...tops) - Math.min(...tops), 'chips on one row').toBeLessThan(2);
    if (small) expect(Math.min(...tops)).toBeGreaterThanOrEqual(hb.y + hb.height - 1);
    if (width === 320) {
      await expect(lagos(page).getByRole('button', { name: 'Sound: off' })).toBeVisible();
      // The spoken words keep "Booming" even when the word is dropped from line 1.
      await expect(head(page)).toHaveAccessibleName(/Booming meter\. 19 of 20/);
    }
    const c = await city(page);
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const box = { x: hb.x - map.x, y: hb.y - map.y, w: hb.width, h: hb.height };
    for (const [id, b] of Object.entries(c.boards)) expect(apart(b, box), `the ${id} board under the box`).toBe(true);
    for (const a of c.arrows) expect(apart({ x: a.x - a.tap / 2, y: a.y - a.tap / 2, w: a.tap, h: a.tap }, box) || false, `an arrow under the box`).toBe(true);
    // The first look shows every pin, below the top row and inside the screen.
    const top = Math.max(...(await Promise.all((await lagos(page).locator('.city-top h2, .city-chip').all()).map(async (e) => { const r = (await e.boundingBox())!; return r.y + r.height - map.y; }))));
    for (const [spot, p] of Object.entries(c.pins)) {
      expect(p.x, `${spot} pin left`).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w, `${spot} pin right`).toBeLessThanOrEqual(map.width);
      expect(p.y, `${spot} pin under the top row`).toBeGreaterThanOrEqual(top - 1);
      expect(apart(p, box), `${spot} pin under the box`).toBe(true);
    }
    await shot(page, `layout-${width}x${height}`);
  });
}

test('W15 at 320 x 240 with four signs up (after the lane run): only "Lagos" shows, so the signs have room; the meter is still spoken', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page, { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: HINTS });
  await expect(head(page)).toHaveClass(/compact/);
  await expect(head(page).locator('.boom-num')).toBeHidden();
  await expect(head(page)).toHaveAccessibleName('Lagos. Booming meter. 8 of 20 to the next boom.');
  expect((await head(page).boundingBox())!.width).toBeLessThan(80);
  // Collected: three signs again, and the meter shows.
  await page.locator('[data-place="buka"]').tap();
  await expect(head(page)).not.toHaveClass(/compact/, { timeout: 15_000 });
  await expect(head(page).locator('.boom-num')).toBeVisible();
});

test('d12.5: the moment: the pin goes at "Done ✓", the times of d6, then the bright road and the first hint', async ({ page }) => {
  await openCity(page, { kobo: 1000, fixed: [], built: [], boom: 0, hints: ['walk'] });
  await sample(page);
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 15_000 }).not.toBeNull();
  const shots: Promise<void>[] = [];
  for (const [k, at] of [0.3, 0.9, 1.4, 2.2, 3.0].entries()) {
    await expect.poll(async () => (await city(page)).watch.moment?.t ?? 9, { timeout: 5000, intervals: [30] }).toBeGreaterThanOrEqual(at);
    shots.push(shot(page, `moment-${k + 1}-${at.toFixed(1)}s`));
    await Promise.all(shots.splice(0));
  }
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 5000 }).toBeNull();
  const s = await samples(page);
  const during = s.filter((x) => x.t !== null);
  // The pin went at once.
  expect(during.every((x) => !x.pin)).toBe(true);
  const first = (f: (x: Sample) => boolean): number => during.find(f)?.t ?? -1;
  // Notches 0.3 to 0.7 (0.1 s each), people and the danfo from 1.5, the built line at 2.0, the end at 3.6.
  expect(first((x) => x.meter === '1 of 20')).toBeGreaterThanOrEqual(0.3);
  expect(first((x) => x.meter === '1 of 20')).toBeLessThan(0.45);
  expect(first((x) => x.meter === '4 of 20')).toBeGreaterThanOrEqual(0.6);
  expect(first((x) => x.meter === '4 of 20')).toBeLessThan(0.75);
  expect(first((x) => x.walkers > 0)).toBeGreaterThanOrEqual(1.5);
  expect(first((x) => x.walkers > 0)).toBeLessThan(1.6);
  expect(Math.max(...during.map((x) => x.walkers))).toBeLessThanOrEqual(8);
  expect(first((x) => x.danfo !== null)).toBeLessThan(1.6);
  expect(first((x) => x.said.startsWith('New road! Danfos are back.'))).toBeGreaterThanOrEqual(2.0);
  expect(first((x) => x.said.startsWith('New road! Danfos are back.'))).toBeLessThan(2.1);
  const lastT = during[during.length - 1]!.t!;
  expect(lastT).toBeGreaterThan(3.5);
  expect(lastT).toBeLessThan(3.7);
  // The danfo drove up the new road (north).
  const ds = during.filter((x) => x.danfo).map((x) => x.danfo!.y);
  expect(ds[ds.length - 1]!).toBeLessThan(ds[0]!);
  // d8: spoken, the built line, the step line, then the meter.
  await expect(said(page)).toContainText('New road! Danfos are back. Lagos is getting brighter. Booming meter. 4 of 20 to the next boom.');
  const c = await city(page);
  expect(c.watch.bright).toEqual(expect.arrayContaining(['r0c0', 'r1c0', 'r2c0', 'r1c1']));
  await expect(page.getByRole('button', { name: 'New road, fixed' })).toBeAttached();
  // d6: the first-timer hint, once, then the Mama Put hint.
  await expect(lagos(page).locator('.city-hint')).toHaveText('Each fix makes Lagos brighter!', { timeout: 3000 });
  await expect(lagos(page).locator('.city-hint')).toHaveText('Walk onto the ₦4 board to build a Mama Put.', { timeout: 6000 });
  expect((await city(page)).saved.hints).toContain('bright');
});

for (const key of ['tap', 'Space', 'Enter', 'Escape', 'ArrowLeft'] as const) {
  test(`d12.5: a ${key} skips the moment to its end and does nothing else`, async ({ page }) => {
    await openCity(page, { kobo: 1000, fixed: [], built: [], boom: 0, hints: HINTS });
    await page.locator('[data-build="road"]').tap();
    await expect.poll(async () => (await city(page)).watch.moment?.t ?? -1, { timeout: 15_000 }).toBeGreaterThan(0.6);
    await expect(lagos(page).locator('.city-skipline')).toHaveText(key === 'tap' ? 'Tap to skip' : /skip/);
    const h0 = (await city(page)).hero;
    if (key === 'tap') {
      const map = (await lagos(page).locator('.city-map').boundingBox())!;
      await page.touchscreen.tap(map.x + map.width * 0.7, map.y + map.height * 0.6);
    } else if (key === 'ArrowLeft') await page.keyboard.down('ArrowLeft');
    else await page.keyboard.press(key);
    await expect.poll(async () => (await city(page)).watch.moment, { timeout: 1000 }).toBeNull();
    await expect(lagos(page).locator('.city-skipline')).toBeHidden();
    await page.waitForTimeout(600);
    const c = await city(page);
    // Nothing else: the hero did not walk; everything is at its end.
    expect(c.hero).toMatchObject({ x: h0.x, y: h0.y, moving: false });
    expect(c.watch.walkers).toBe(0);
    expect(c.watch.standing).toBeGreaterThan(0);
    expect(c.watch.bright).toEqual(expect.arrayContaining(['r0c0', 'r1c0', 'r2c0', 'r1c1']));
    await expect(said(page)).toContainText('New road! Danfos are back.');
    if (key === 'ArrowLeft') {
      // The arrow walks only once pressed again.
      await page.keyboard.up('ArrowLeft');
      await page.keyboard.down('ArrowRight');
      await expect.poll(async () => (await city(page)).hero.x, { timeout: 3000 }).toBeGreaterThan(h0.x + 20);
      await page.keyboard.up('ArrowRight');
    }
  });
}

test('d12.5: reduced motion: the still tired picture for 0.5 s, then the bright one with the people already standing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openCity(page, { kobo: 1000, fixed: [], built: [], boom: 0, hints: HINTS });
  await sample(page);
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 15_000 }).toEqual(['potholes']);
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 3000 }).toBeNull();
  const s = (await samples(page)).filter((x) => x.t !== null);
  expect(s.length).toBeGreaterThan(5);
  expect(s[s.length - 1]!.t!).toBeGreaterThanOrEqual(0.45);
  expect(s[s.length - 1]!.t!).toBeLessThan(0.6);
  expect(s.every((x) => x.walkers === 0 && x.danfo === null)).toBe(true);
  const c = await city(page);
  expect(c.watch.standing).toBeGreaterThan(0);
  expect(c.watch.bright).toEqual(expect.arrayContaining(['r0c0', 'r1c1']));
  await expect(head(page).locator('.boom-num')).toHaveText('4 of 20');
});

/** A save one board from the first boom: road, Mama Put and Market built, two full collects, Power for the Lamps. */
const NEAR_BOOM = { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } };

test('d12.6: the Lamps reach 20: the moment, then the boom, its card with the cog line, the cog turns, the coming-soon pins', async ({ page }) => {
  test.setTimeout(90_000);
  await openCity(page, NEAR_BOOM);
  await expect(head(page).locator('.boom-num')).toHaveText('16 of 20');
  await page.locator('[data-build="lamps"]').tap();
  await expect.poll(async () => (await city(page)).watch.boom, { timeout: 20_000 }).not.toBeNull();
  await sample(page);
  await expect(head(page).locator('.boom-num')).toHaveText('20 of 20');
  for (const at of [0.8, 1.6, 2.2]) {
    await expect.poll(async () => (await city(page)).watch.boom?.t ?? 9, { timeout: 5000, intervals: [30] }).toBeGreaterThanOrEqual(at);
    await shot(page, `boom-${at.toFixed(1)}s`);
  }
  const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
  await expect(card).toBeVisible({ timeout: 4000 });
  const s = (await samples(page)).filter((x) => x.boom !== null);
  expect(s[s.length - 1]!.boom!).toBeGreaterThan(2.9);
  expect(s[s.length - 1]!.boom!).toBeLessThan(3.1);
  await expect(card.getByText('New buildings are going up. More people are coming, and they need more.')).toBeVisible();
  await expect(card.getByText("Lagos's cog is turning on Nigeria's wheel!")).toBeVisible();
  await shot(page, 'boom-card');
  expect((await city(page)).saved).toMatchObject({ boom: 20, boomSeen: 20, fixed: ['potholes', 'lightsOut'] });
  await expect(said(page)).toContainText('Lagos is booming!');
  await card.getByRole('button', { name: 'See Lagos' }).tap();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go-slow, coming soon.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crowded buses, coming soon.' })).toBeVisible();
  await expect(head(page).locator('.boom-num')).toHaveText('20 of 50');
  const c = await city(page);
  expect(c.watch.bright).toHaveLength(13); // all but r1c3 (the Mast is still to do)
  expect(c.watch.bright).not.toContain('r1c3');
  await page.waitForTimeout(700);
  await shot(page, 'boom-after');
  // Signs keep clear of the coming-soon pins (they are drawn pins).
  for (const [id, b] of Object.entries(c.boards)) for (const p of Object.values(c.watch.soon)) expect(apart(b, p), `${id} board over a coming-soon pin`).toBe(true);
  // A coming-soon card.
  await page.getByRole('button', { name: 'Go-slow, coming soon.' }).tap();
  const soon = page.getByRole('dialog', { name: 'Go-slow' });
  await expect(soon.getByText('The traffic is stuck here.')).toBeVisible();
  await expect(soon.getByText('Coming soon.')).toBeVisible();
  await soon.getByRole('button', { name: 'Back' }).tap();
  await expect(soon).toHaveCount(0);
  // The cog turns on Nigeria's wheel; the boom plays once (a reload shows no card).
  await lagos(page).getByRole('button', { name: "Nigeria's wheel" }).tap();
  await expect.poll(() => screenNow(page)).toBe('wheel');
  await expect(page.locator('.names li.on')).toContainText(['Lagos']);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(1500);
  await expect(page.getByRole('dialog', { name: 'Lagos is booming!' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go-slow, coming soon.' })).toBeVisible();
});

test('d12.6: a tab closed mid-boom shows the boom and its card on the next visit; a hall cog stays turned with no cog line', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  await page.evaluate((look) => {
    localStorage.setItem('gidi-look', look);
    localStorage.setItem('gidi-intro', '"seen"');
    const city = { kobo: 0, power: 0, tech: 0, fixed: ['potholes', 'lightsOut'], fixes: 2, built: ['buka', 'market'], trays: {}, boom: 20, hints: ['walk', 'buka', 'collect', 'bright'] };
    localStorage.setItem('gidi-progress', JSON.stringify({ v: 2, states: { lagos: { streets: {}, parcel: false, hall: { done: true, best: 3 } } }, city }));
  }, LOOK);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(async () => (await city(page))?.watch.boom?.t ?? 0, { timeout: 5000 }).toBeGreaterThan(1);
  // Closed mid-boom: nothing marked as seen.
  await page.reload();
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress')!) as { city: { boomSeen?: number } }).city.boomSeen ?? 0)).toBe(0);
  await page.getByRole('button', { name: 'Play' }).tap();
  const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
  await expect(card).toBeVisible({ timeout: 8000 });
  // The hall already turned the cog: no cog line.
  await expect(card.getByText("Lagos's cog is turning on Nigeria's wheel!")).toHaveCount(0);
  // Escape closes it like "See Lagos".
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crowded buses, coming soon.' })).toBeVisible();
});

for (const on of [true, false]) {
  test(`d12.8: Sound ${on ? 'on: the music dips to half under the sting, then comes back' : 'off: nothing plays and the music never dips'}`, async ({ page }) => {
    if (!on) await page.addInitScript(() => localStorage.setItem('gidi-sound', 'false'));
    await openCity(page, { kobo: 1000, fixed: [], built: [], boom: 0, hints: HINTS });
    expect((await page.evaluate(() => window.__game!.sound)).enabled).toBe(on);
    await page.locator('[data-build="road"]').tap();
    await expect.poll(async () => (await city(page)).watch.moment?.t ?? 0, { timeout: 15_000 }).toBeGreaterThan(2.1);
    const dipped = await page.evaluate(() => window.__game!.corn.musicLevel);
    expect(dipped).toBe(on ? 0.5 : 1);
    await expect.poll(() => page.evaluate(() => window.__game!.corn.musicLevel), { timeout: 3000 }).toBe(1);
  });
}

test('d12.6: a skip during the boom goes straight to the open card; with reduced motion the boom is one cut', async ({ page }) => {
  await openCity(page, { ...NEAR_BOOM, power: 0, fixed: ['potholes', 'lightsOut'], fixes: 2, boom: 20 });
  await expect.poll(async () => (await city(page)).watch.boom?.t ?? 0, { timeout: 5000 }).toBeGreaterThan(0.3);
  await page.keyboard.press('Space');
  const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
  await expect(card).toBeVisible({ timeout: 1000 });
  expect((await city(page)).watch.walkers).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openCity(page, { ...NEAR_BOOM, power: 0, fixed: ['potholes', 'lightsOut'], fixes: 2, boom: 20 });
  await expect(card).toBeVisible({ timeout: 1500 });
});
