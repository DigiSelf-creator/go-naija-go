/**
 * Slice 3 step (b) (docs/city.md part 5 (b)): Lagos from above is home. Counters, pins and their
 * cards (exact words), the way to street 1 and back home, looking around, a fix paid from its
 * own bucket, the save on the phone, and the old save moved to Naira.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

/** A saved hero who has seen the story; `progress` as saved under gidi-progress. */
async function openCity(page: Page, progress?: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      if (p) localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: progress ? JSON.stringify(progress) : null },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

const city = (page: Page) => page.evaluate(() => window.__game!.city!);
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos' });

test('the city: heading, the three counters with words, the buttons, three pins', async ({ page }) => {
  await openCity(page);
  const c = lagos(page);
  await expect(c.getByRole('heading', { name: 'Lagos' })).toBeVisible();
  await expect(c.locator('.city-chip')).toHaveText(['₦0Naira: 0 naira', 'Power 0Power: 0', 'Tech 0Tech: 0']);
  for (const name of ['Sound: on', 'Settings', 'Streets', 'Hero', "Nigeria's wheel", 'Zoom in', 'Zoom out']) await expect(c.getByRole('button', { name, exact: true })).toBeVisible();
  for (const name of ['Potholes, problem', 'Lights out, problem', 'Slow internet, problem']) await expect(c.getByRole('button', { name })).toBeAttached();
  // Still: nothing is drawn while nothing moves.
  const before = (await city(page)).draws;
  await page.waitForTimeout(1200);
  expect((await city(page)).draws).toBe(before);
});

test('pin cards say the exact words; Back closes them', async ({ page }) => {
  await openCity(page);
  await page.getByRole('button', { name: 'Lights out, problem' }).tap();
  let card = page.getByRole('dialog', { name: 'Lights out' });
  await expect(card.getByText('Lamps are out here.')).toBeVisible();
  await expect(card.getByText('Switching them on costs Power 10.')).toBeVisible();
  await expect(card.getByText('Lane run: coming soon')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Lane run' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Back' }).tap();
  await expect(card).toHaveCount(0);

  await page.getByRole('button', { name: 'Slow internet, problem' }).tap();
  card = page.getByRole('dialog', { name: 'Slow internet' });
  await expect(card.getByText('The internet is slow here.')).toBeVisible();
  await expect(card.getByText('Fixing it costs Tech 6.')).toBeVisible();
  await expect(card.getByText('Lane run: coming soon')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);

  await page.getByRole('button', { name: 'Potholes, problem' }).tap();
  card = page.getByRole('dialog', { name: 'Potholes' });
  await expect(card.getByText('Potholes on this road.')).toBeVisible();
  await expect(card.getByText('Fixing it costs ₦10.')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Run Alausa' })).toBeVisible();
  // No place name on a line that says something is wrong.
  await expect(card.getByText(/Alausa|Ikeja|Computer Village/).filter({ hasNot: page.getByRole('button') })).toHaveCount(1);
});

test('go to the street from the Potholes card, then back home to the city', async ({ page }) => {
  await openCity(page);
  await page.getByRole('button', { name: 'Potholes, problem' }).tap();
  await page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'Run Alausa' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Pause' }).tap();
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Home', exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(lagos(page)).toBeVisible();
});

test('the city buttons: Streets (Home comes back), Hero, the wheel (Back comes back), Settings', async ({ page }) => {
  await openCity(page);
  await lagos(page).getByRole('button', { name: 'Streets' }).tap();
  await expect.poll(() => screenNow(page)).toBe('streets');
  await page.getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await lagos(page).getByRole('button', { name: "Nigeria's wheel" }).tap();
  await expect.poll(() => screenNow(page)).toBe('wheel');
  await page.getByRole('button', { name: 'Back' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await lagos(page).getByRole('button', { name: 'Hero' }).tap();
  await expect.poll(() => screenNow(page)).toBe('builder');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Start running' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('looking around: + and −, drag, keys, and double tap on a block', async ({ page }) => {
  await openCity(page);
  expect((await city(page)).cam.zoom).toBe('far');
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('near');
  const a = (await city(page)).cam;
  // Drag with one finger (a mouse here): the map follows.
  const box = (await page.locator('.city-map').boundingBox())!;
  const x0 = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 - 60, y0 - 30, { steps: 6 });
  await page.mouse.up();
  const b = (await city(page)).cam;
  expect(b.x).toBeLessThan(a.x);
  expect(b.y).toBeLessThan(a.y);
  // Keys: an arrow moves 120 px.
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await city(page)).cam.x).toBeCloseTo(b.x + 120, 0);
  await page.keyboard.press('-');
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('far');
  await page.keyboard.press('+');
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('near');
  await page.getByRole('button', { name: 'Zoom out' }).tap();
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('far');
  // Double tap the park block (row 1, top): near, centred on it.
  const view = { w: box.width, h: box.height };
  const cam = (await city(page)).cam;
  const s = view.h / 1000;
  const px = box.x + cam.x + 990 * s;
  const py = box.y + cam.y + 200 * s;
  await page.mouse.click(px, py);
  await page.mouse.click(px, py);
  await expect.poll(async () => (await city(page)).cam.zoom).toBe('near');
});

test('enough Naira: the pin says Ready, "Fix it (₦10)" pays from the bucket, and it is saved', async ({ page }) => {
  await openCity(page, { v: 2, states: {}, city: { kobo: 1250, power: 3, tech: 0, fixed: [], fixes: 0 } });
  await expect(lagos(page).locator('.city-chip').first()).toContainText('₦12.50');
  await page.getByRole('button', { name: 'Potholes, ready to fix' }).tap();
  const card = page.getByRole('dialog', { name: 'Potholes' });
  await card.getByRole('button', { name: 'Fix it (₦10)' }).tap();
  await expect(card).toHaveCount(0);
  await expect(lagos(page).locator('.city-chip').first()).toContainText('₦2.50');
  await expect(page.getByRole('button', { name: 'New road, fixed' })).toBeAttached();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress')!) as unknown);
  expect(saved).toEqual({ v: 2, states: {}, city: { kobo: 250, power: 3, tech: 0, fixed: ['potholes'], fixes: 1 } });
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'New road, fixed' }).tap();
  await expect(page.getByText('Fixed ✓')).toBeVisible();
});

test('an old save (version 1) is moved to Naira once: bests times 10, the purse at ₦0', async ({ page }) => {
  await openCity(page, { v: 1, states: { lagos: { streets: { 1: { done: true, best: 87 } }, parcel: false, hall: { done: false, best: 0 } } } });
  await expect(lagos(page).locator('.city-chip').first()).toContainText('₦0');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress')!) as unknown)).toEqual({
    v: 2,
    states: { lagos: { streets: { 1: { done: true, best: 870 } }, parcel: false, hall: { done: false, best: 0 } } },
  });
  await lagos(page).getByRole('button', { name: 'Streets' }).tap();
  await expect(page.getByText('Done ✓ Best: ₦8.70')).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress')!) as { states: { lagos: { streets: { 1: { best: number } } } } }).states.lagos.streets[1].best)).toBe(870);
});

test('a broken city part starts at zeros and the game still plays', async ({ page }) => {
  await openCity(page, { v: 2, states: {}, city: { kobo: 'lots', fixed: 'x' } });
  await expect(lagos(page).locator('.city-chip')).toHaveText(['₦0Naira: 0 naira', 'Power 0Power: 0', 'Tech 0Tech: 0']);
});

test('at 320 x 240 every tap target is at least 44 px and the pins at least 48 x 56', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page);
  for (const b of await lagos(page).locator('button:not(.city-pin)').all()) {
    const r = (await b.boundingBox())!;
    expect(Math.min(r.width, r.height), (await b.textContent()) ?? "").toBeGreaterThanOrEqual(44);
  }
  for (const [spot, r] of Object.entries((await city(page)).pins)) {
    expect(r.w, spot).toBeGreaterThanOrEqual(48);
    expect(r.h, spot).toBeGreaterThanOrEqual(56);
  }
});

test('qa F1: at 320 x 240 with ₦1,250 the three chips sit on one row and no chip overlaps any button', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page, { v: 2, states: {}, city: { kobo: 125000, power: 0, tech: 0, fixed: [], fixes: 0 } });
  const chips = lagos(page).locator('.city-chip');
  await expect(chips.first()).toContainText('₦1,250');
  const boxes = await Promise.all((await chips.all()).map(async (c) => (await c.boundingBox())!));
  expect(new Set(boxes.map((b) => Math.round(b.y))).size, 'one row').toBe(1);
  for (const b of boxes) expect(b.x + b.width).toBeLessThanOrEqual(320);
  // The chip shows its whole text (nothing clipped).
  const clipped = await chips.evaluateAll((els) => els.some((e) => e.scrollWidth > e.clientWidth + 1));
  expect(clipped).toBe(false);
  // The screen's buttons (the pins are on the map, which moves; the chips never take taps).
  for (const btn of await lagos(page).locator('button:not(.city-pin)').all()) {
    if (!(await btn.isVisible())) continue;
    const r = (await btn.boundingBox())!;
    for (const b of boxes) {
      const apart = b.x + b.width <= r.x || r.x + r.width <= b.x || b.y + b.height <= r.y || r.y + r.height <= b.y;
      expect(apart, `chip over "${(await btn.getAttribute('aria-label')) ?? (await btn.textContent())}"`).toBe(true);
    }
  }
});

for (const [width, height] of [
  [320, 240],
  [393, 851],
  [851, 393],
] as const) {
  test(`qa F2: at ${width} x ${height} all three pins are fully on screen on the first look`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openCity(page);
    const pins = (await city(page)).pins;
    expect(Object.keys(pins)).toHaveLength(3);
    for (const [spot, r] of Object.entries(pins)) {
      expect(r.x, spot).toBeGreaterThanOrEqual(0);
      expect(r.y, spot).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, spot).toBeLessThanOrEqual(width);
      expect(r.y + r.h, spot).toBeLessThanOrEqual(height);
    }
    // qa round 2 (F1 + F2): no pin's sign sits under a counter chip (pin boxes are in map px).
    const map = (await lagos(page).locator('.city-map').boundingBox())!;
    const chips = await Promise.all((await lagos(page).locator('.city-chip').all()).map(async (c) => (await c.boundingBox())!));
    expect(chips).toHaveLength(3);
    for (const [spot, r] of Object.entries(pins)) {
      const p = { x: map.x + r.x, y: map.y + r.y, w: r.w, h: r.h };
      for (const c of chips) {
        const apart = c.x + c.width <= p.x || p.x + p.w <= c.x || c.y + c.height <= p.y || p.y + p.h <= c.y;
        expect(apart, `${spot} pin under a chip at ${width} x ${height}`).toBe(true);
      }
    }
  });
}
