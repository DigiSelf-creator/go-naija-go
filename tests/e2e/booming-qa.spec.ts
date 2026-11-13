/**
 * qa, S3d1 (docs/city.md part 5 step (d)): checks beyond gamedev's booming.spec, from the designer's
 * ruling of 13 Nov 2026 (d5 "The fold" and "Other gamedev choices"):
 *   1. the heading folds to just "Lagos" only at 360 x 300 or smaller with four or more signs up;
 *      "Booming" is dropped first; the spoken label keeps the meter;
 *   2. at 320 x 240 it unfolds as soon as fewer than four signs are up: when a board says "Done ✓",
 *      the meter shows again before its notches fill (0.3 s into the moment);
 *   3. a collect that crosses a step while folded still shows "Lagos is getting brighter!";
 *   4. a coming-soon pin's tap area is 92 x 56 (never wider than 96), and signs keep clear of it;
 *   5. the next board does not pay until the moment (and any boom) ends; a tap skips the wait.
 * Plus: a tiny or huge screen, turning the phone mid-moment, a hidden tab mid-moment, and taps
 * hammered through the moment and the boom.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const HINTS = ['walk', 'buka', 'collect', 'bright'];

async function openCity(page: Page, city: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

const city = (page: Page) => page.evaluate(() => window.__game!.city!);
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos', exact: true });
const head = (page: Page) => lagos(page).locator('.city-top h2');
const signs = async (page: Page): Promise<number> => {
  const c = await city(page);
  return Object.keys(c.boards).length + Object.keys(c.bubbles).length;
};

/** Four signs up (Market board, Lamps, Mast, the Mama Put bubble), nothing affordable. */
const FOUR_SIGNS = { kobo: 0, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: HINTS };

/** Every word the game writes on a canvas (the line over the hero is drawn, not a DOM node). */
async function recordCanvasWords(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __words: { text: string; at: number }[] };
    w.__words = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, max?: number) {
      if (w.__words.length < 5000) w.__words.push({ text: String(text), at: performance.now() });
      return max === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, max);
    };
  });
}
const canvasWords = (page: Page) => page.evaluate(() => (window as unknown as { __words: { text: string }[] }).__words.map((x) => x.text));

test.describe('S3d1 ruling 1: the fold', () => {
  for (const [width, height, folds] of [
    [320, 240, true],
    [360, 300, true],
    [361, 300, false],
    [360, 301, false],
    [568, 320, false],
  ] as const) {
    test(`${width} x ${height} with four signs up: ${folds ? 'folds to just "Lagos"' : 'keeps the full box'}; the spoken label keeps the meter`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openCity(page, FOUR_SIGNS);
      expect(await signs(page)).toBe(4);
      if (folds) {
        await expect(head(page)).toHaveClass(/compact/);
        await expect(head(page).locator('.boom-num')).toBeHidden();
        await expect(head(page).locator('.boom-word')).toBeHidden();
        await expect(head(page)).toContainText('Lagos');
      } else {
        await expect(head(page)).not.toHaveClass(/compact/);
        await expect(head(page).locator('.boom-num')).toHaveText('8 of 20');
      }
      await expect(head(page)).toHaveAccessibleName('Lagos. Booming meter. 8 of 20 to the next boom.');
    });
  }

  test('320 x 240 with three signs and "Sound: off": "Booming" is dropped first, the box is not folded, the bar and numbers stay', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 240 });
    await page.addInitScript(() => localStorage.setItem('gidi-sound', 'false'));
    await openCity(page, { ...FOUR_SIGNS, tech: 0 });
    expect(await signs(page)).toBe(3);
    await expect(lagos(page).getByRole('button', { name: 'Sound: off' })).toBeVisible();
    await expect(head(page)).not.toHaveClass(/compact/);
    await expect(head(page).locator('.boom-num')).toHaveText('8 of 20');
    await expect(head(page).locator('.boom-num')).toBeVisible();
    // Line 1 either shows "Booming" in full or drops it; it never wraps the top row.
    const hb = (await head(page).boundingBox())!;
    for (const b of await lagos(page).locator('.city-top-right button').all()) {
      const r = (await b.boundingBox())!;
      expect(r.y, 'Sound and Settings on the box row').toBeLessThan(hb.y + hb.height);
    }
    await expect(head(page)).toHaveAccessibleName('Lagos. Booming meter. 8 of 20 to the next boom.');
  });
});

test('S3d1 ruling 2: at 320 x 240 a board that says "Done ✓" brings the meter back before its notches fill (0.3 s)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  // Four signs up and the Lamps affordable: the Lamps board goes at "Done ✓", leaving three.
  await openCity(page, { ...FOUR_SIGNS, power: 10, boom: 8 });
  expect(await signs(page)).toBe(4);
  await expect(head(page)).toHaveClass(/compact/);
  await page.evaluate(() => {
    const w = window as unknown as { __f: { t: number | null; compact: boolean; num: string; shown: boolean }[]; __on: boolean };
    w.__f = [];
    w.__on = true;
    const f = (): void => {
      const c = window.__game!.city;
      const hd = document.querySelector('.city-top h2');
      const num = document.querySelector<HTMLElement>('.city-head .boom-num');
      if (c && hd) w.__f.push({ t: c.watch.moment?.t ?? null, compact: hd.classList.contains('compact'), num: num?.textContent ?? '', shown: !!num && num.offsetParent !== null });
      if (w.__on) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await page.locator('[data-build="lamps"]').tap();
  await expect.poll(async () => (await city(page)).watch.moment?.t ?? 0, { timeout: 20_000 }).toBeGreaterThan(1);
  const f = await page.evaluate(() => {
    const w = window as unknown as { __f: { t: number | null; compact: boolean; num: string; shown: boolean }[]; __on: boolean };
    w.__on = false;
    return w.__f;
  });
  const during = f.filter((x) => x.t !== null);
  expect(during.length).toBeGreaterThan(5);
  // Unfolded and the meter showing from before the first notch fills (0.3 s) on.
  const firstFill = during.find((x) => x.num !== '8 of 20');
  expect(firstFill, 'a notch filled in the moment').toBeTruthy();
  expect(firstFill!.t!).toBeGreaterThanOrEqual(0.3);
  for (const x of during.filter((y) => y.t! >= 0.3 || y.num !== '8 of 20')) {
    expect(x.compact, `folded at ${x.t!.toFixed(2)} s`).toBe(false);
    expect(x.shown, `meter hidden at ${x.t!.toFixed(2)} s`).toBe(true);
  }
});

test('S3d1 ruling 3: at 320 x 240, a full collect that crosses a step while folded still shows "Lagos is getting brighter!" on screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await recordCanvasWords(page);
  // 11 points: the full Mama Put tray fills 1, crossing the 12 step.
  await openCity(page, { ...FOUR_SIGNS, boom: 11, boomCollect: 0 });
  await expect(head(page)).toHaveClass(/compact/);
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.boom, { timeout: 15_000 }).toBe(12);
  await expect.poll(async () => (await canvasWords(page)).some((t) => t.includes('Lagos is getting brighter!')), { timeout: 8000 }).toBe(true);
  await expect(page.locator('.city-card > .sr-only[aria-live]')).toContainText('Lagos is getting brighter.');
});

const SOON_SAVE = { kobo: 0, power: 0, tech: 3, fixed: ['potholes', 'lightsOut'], fixes: 2, built: ['buka', 'market'], trays: { buka: 150, market: 240 }, boom: 20, boomSeen: 20, hints: HINTS };
type QBox = { x: number; y: number; w: number; h: number };
const clear = (a: QBox, b: QBox): boolean => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

test('S3d1 ruling 4: the coming-soon pins tap 92 x 56 at most 96 wide, and boards keep clear of them', async ({ page }) => {
  await page.setViewportSize({ width: 851, height: 393 });
  await openCity(page, SOON_SAVE);
  const pins = page.locator('[data-soon]');
  await expect(pins).toHaveCount(2);
  for (const el of await pins.all()) {
    const name = await el.getAttribute('aria-label');
    const r = (await el.boundingBox())!;
    expect(r.width, `${name} tap width`).toBeGreaterThanOrEqual(92);
    expect(r.width, `${name} tap width`).toBeLessThanOrEqual(96);
    expect(r.height, `${name} tap height`).toBeGreaterThanOrEqual(56);
  }
  const c = await city(page);
  for (const s of Object.values(c.watch.soon)) {
    expect(s.w, 'the box signs keep clear of is the tap area').toBeGreaterThanOrEqual(92);
    expect(s.w).toBeLessThanOrEqual(96);
    for (const [id, b] of [...Object.entries(c.boards), ...Object.entries(c.bubbles)]) expect(clear(b, s), `${id} over a coming-soon pin`).toBe(true);
  }
});

// Designer ruling (e79e83d, d5 "Soft coming-soon pins on tiny screens"): at 360 x 300 or smaller a
// coming-soon pin that a sign covers is hidden whole until the sign moves or goes.
test('S3d1 ruling 4 at 320 x 240: a coming-soon pin a sign covers is hidden whole; shown ones are clear; it comes back when the sign goes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page, SOON_SAVE);
  await page.waitForTimeout(500);
  const c = await city(page);
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  const signs: [string, QBox][] = [...Object.entries(c.boards).map(([k, b]) => [`board ${k}`, b] as [string, QBox]), ...Object.entries(c.bubbles).map(([k, b]) => [`bubble ${k}`, b] as [string, QBox])];
  const covered = Object.entries(c.watch.soon).filter(([, s]) => signs.some(([, b]) => !clear(b, s)));
  expect(covered.length, 'this packed save covers a coming-soon pin').toBeGreaterThan(0);
  for (const [id, s] of Object.entries(c.watch.soon)) {
    const el = page.locator(`[data-soon="${id}"]`);
    const hidden = covered.some(([k]) => k === id);
    if (hidden) {
      // (2) Hidden whole: not visible, not focusable; a tap on the overlap does what the sign does.
      await expect(el).toBeHidden();
      expect(await el.evaluate((e) => { (e as HTMLElement).focus(); return document.activeElement === e; })).toBe(false);
      const [name, b] = signs.find(([, q]) => !clear(q, s))!;
      const x = map.x + (Math.max(b.x, s.x) + Math.min(b.x + b.w, s.x + s.w)) / 2;
      const y = map.y + (Math.max(b.y, s.y) + Math.min(b.y + b.h, s.y + s.h)) / 2;
      const hit = await page.evaluate(({ x, y }) => {
        const e = document.elementFromPoint(x, y)?.closest('[data-build],[data-place],[data-soon]');
        return e ? e.getAttribute('data-build') ?? e.getAttribute('data-place') ?? `soon ${e.getAttribute('data-soon')}` : null;
      }, { x, y });
      expect(hit, `a tap on the overlap of ${name} and ${id}`).toBe(name.split(' ')[1]);
    } else {
      // (1) Shown: 92 to 96 wide, at least 56 tall. (3) Clear of every sign.
      await expect(el).toBeVisible();
      const r = (await el.boundingBox())!;
      expect(r.width).toBeGreaterThanOrEqual(92);
      expect(r.width).toBeLessThanOrEqual(96);
      expect(r.height).toBeGreaterThanOrEqual(56);
      for (const [name, b] of signs) expect(clear(b, s), `${name} over the shown ${id} pin`).toBe(true);
    }
  }
  expect([...c.watch.soonHidden].sort()).toEqual(covered.map(([k]) => k).sort());
  // (4) Signs stay clear of the chips and the buttons.
  for (const e of await lagos(page).locator('.city-chip, .city-top button, .city-bottom button').all()) {
    const r = (await e.boundingBox())!;
    const o = { x: r.x - map.x, y: r.y - map.y, w: r.width, h: r.height };
    for (const [name, b] of signs) expect(clear(b, o), `${name} under "${(await e.textContent())?.trim()}"`).toBe(true);
  }
  // (5) Collecting the Mama Put tray takes its bubble away: a pin it hid comes back, shown and tappable.
  const byBuka = covered.filter(([, s]) => !clear(c.bubbles['buka']!, s)).map(([k]) => k);
  expect(byBuka.length, 'the Mama Put bubble covers a coming-soon pin').toBeGreaterThan(0);
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(150);
  // Straight after the collect (the tray fills again in steps of 6 s), the pins the bubble hid are back.
  await expect.poll(async () => {
    const now = await city(page);
    return now.bubbles['buka'] === undefined && byBuka.every((id) => !now.watch.soonHidden.includes(id));
  }, { timeout: 4000, intervals: [50] }).toBe(true);
  let checked = 0;
  for (const id of byBuka) {
    const el = page.locator(`[data-soon="${id}"]`);
    await expect(el).toBeVisible();
    // Tappable and back in the Tab order: focus it and press Enter (the pins overlap each other at
    // 320 x 240, so a tap at its middle may land on its neighbour).
    expect(await el.evaluate((e) => { (e as HTMLElement).focus(); return document.activeElement === e; })).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('.city-problem').getByText('Coming soon.')).toBeVisible();
    await page.keyboard.press('Escape');
    checked++;
  }
  expect(checked, 'a hidden pin came back').toBeGreaterThan(0);
});

test('S3d1 ruling 5: the next board does not pay during the moment or the boom; a tap skips the wait', async ({ page }) => {
  test.setTimeout(90_000);
  // Lamps and Mast both affordable, Lamps take the meter to 20: moment, then the boom.
  await openCity(page, { kobo: 0, power: 10, tech: 10, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } });
  await page.locator('[data-build="lamps"]').tap();
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 20_000 }).not.toBeNull();
  // While the moment and the boom play, nothing pays and the Mast is untouched.
  const t0 = Date.now();
  while (Date.now() - t0 < 2500) {
    const c = await city(page);
    if (!c.watch.moment && !c.watch.boom) break;
    // The Lamps' own build may still be going up; the Mast must not be touched.
    expect(c.saved.tech, 'the Mast took Tech during the moment or boom').toBe(10);
    expect(c.saved.paid?.slowInternet ?? 0).toBe(0);
    await page.waitForTimeout(100);
  }
  // A tap skips the moment, a second the boom: straight to the card, then the Mast pays normally.
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  for (let i = 0; i < 2 && (await page.getByRole('dialog', { name: 'Lagos is booming!' }).count()) === 0; i++) {
    await page.touchscreen.tap(map.x + map.width / 2, map.y + map.height / 2);
    await page.waitForTimeout(150);
  }
  const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
  await expect(card).toBeVisible({ timeout: 3000 });
  expect((await city(page)).saved.tech).toBe(10);
  await card.getByRole('button', { name: 'See Lagos' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-build="mast"]').tap();
  await expect.poll(async () => (await city(page)).saved.fixed, { timeout: 25_000 }).toContain('slowInternet');
});

test('break: taps hammered through the moment and the boom land on one boom card, saved once, no errors', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCity(page, { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } });
  await page.locator('[data-build="lamps"]').tap();
  // Hammer from the moment's start: every tap and key is a skip.
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 20_000 }).not.toBeNull();
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(map.x + map.width * (0.3 + (i % 7) * 0.05), map.y + map.height * 0.5);
    if (i % 5 === 0) await page.keyboard.press(['Space', 'Enter', 'ArrowUp', 'Escape'][i % 4]!);
  }
  await page.waitForTimeout(500);
  // Whatever the hammering did, the boom has been seen once and the city is whole.
  const c = await city(page);
  expect(c.saved).toMatchObject({ boom: 20, boomSeen: 20 });
  expect(c.watch.moment).toBeNull();
  expect(c.watch.boom).toBeNull();
  // At most one card; if the hammering left it open, "See Lagos" closes it and the pins drop in.
  const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
  expect(await card.count()).toBeLessThanOrEqual(1);
  if ((await card.count()) === 1) await card.getByRole('button', { name: 'See Lagos' }).tap();
  await expect(page.getByRole('button', { name: 'Go-slow, coming soon.' })).toBeAttached({ timeout: 5000 });
  expect(errors).toEqual([]);
});

test('break: a pin tapped while the Lamps pay (before "Done ✓") must not show a stale card or lose the boom', async ({ page }) => {
  test.setTimeout(60_000);
  await openCity(page, { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } });
  await page.locator('[data-build="lamps"]').tap();
  // The count is running (Power going from the chip into the board).
  await expect.poll(async () => (await city(page)).paying, { timeout: 20_000 }).toBe(true);
  const pin = page.locator('[data-spot="lightsOut"]');
  if (await pin.count()) {
    await pin.tap({ force: true });
    const card = page.getByRole('dialog', { name: 'Lights out' });
    if (await card.count()) {
      // Already paid: the card must not still ask for Power 10.
      await expect.soft(card.getByText('Switching them on costs Power 10.')).toHaveCount(0);
      await card.getByRole('button', { name: 'Back' }).tap();
    }
  }
  // Whatever was tapped, the boom still plays in this visit and its card opens.
  await expect(page.getByRole('dialog', { name: 'Lagos is booming!' })).toBeVisible({ timeout: 12_000 });
});

test('break: turning the phone mid-moment, and a hidden tab mid-moment, still end bright with the hero free', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCity(page, { kobo: 1000, fixed: [], built: [], boom: 0, hints: HINTS });
  await page.locator('[data-build="road"]').tap();
  await expect.poll(async () => (await city(page)).watch.moment?.t ?? 0, { timeout: 15_000 }).toBeGreaterThan(0.6);
  // Turn to portrait and back.
  await page.setViewportSize({ width: 393, height: 851 });
  await page.waitForTimeout(300);
  // Switch apps: the tab is hidden for 2 s.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.setViewportSize({ width: 851, height: 393 });
  await expect.poll(async () => (await city(page)).watch.moment, { timeout: 8000 }).toBeNull();
  const c = await city(page);
  expect(c.watch.bright).toEqual(expect.arrayContaining(['r0c0', 'r1c0', 'r2c0', 'r1c1']));
  expect(c.saved).toMatchObject({ fixed: ['potholes'], boom: 4 });
  await expect(head(page).locator('.boom-num')).toHaveText('4 of 20');
  // Free to walk.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-build="mamaPut"]').tap();
  await expect.poll(async () => (await city(page)).hero.moving, { timeout: 3000 }).toBe(true);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[280, 200], [1920, 1080]] as const) {
  test(`break: a ${width} x ${height} screen: the meter box, the moment and the boom card all work`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height });
    await openCity(page, { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } });
    await expect(head(page)).toHaveAccessibleName('Lagos. Booming meter. 16 of 20 to the next boom.');
    const hb = (await head(page).boundingBox())!;
    expect(hb.x).toBeGreaterThanOrEqual(0);
    expect(hb.x + hb.width).toBeLessThanOrEqual(width);
    await page.locator('[data-build="lamps"]').tap();
    const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
    await expect(card).toBeVisible({ timeout: 25_000 });
    const see = card.getByRole('button', { name: 'See Lagos' });
    await expect(see).toBeInViewport();
    await see.tap();
    await expect(page.getByRole('button', { name: 'Crowded buses, coming soon.' })).toBeAttached();
  });
}
