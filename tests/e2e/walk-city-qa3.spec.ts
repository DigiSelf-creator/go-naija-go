/**
 * qa, slice 3 step (c) "Walk the city", round 3: short-stick boards at 320 x 240 (W15, W16),
 * signs while the hero walks (only the quick placer runs), and edge arrows for pins fully off
 * screen.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
type Box = { x: number; y: number; w: number; h: number };
// Power and Tech in hand: the Lamps, Market and Mast boards and the Mama Put bubble all up.
const BUSY = { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: ['walk', 'buka', 'collect'] };

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
const apart = (a: Box, b: Box) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const shows = (b: Box, w: number, h: number) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < w && b.y < h;

test('at 320 x 240 with four signs up: every board keeps its words and a tap area of at least 48 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page, BUSY);
  const map = (await page.getByRole('dialog', { name: 'Lagos' }).locator('.city-map').boundingBox())!;
  for (const zoom of ['far', 'near'] as const) {
    await page.keyboard.press(zoom === 'near' ? '+' : '-');
    await page.waitForTimeout(800);
    const c = await city(page);
    const shots = process.env['QA_SHOTS'];
    if (shots) await page.screenshot({ path: `${shots}/r3-320x240-${zoom}.png` });
    for (const [id, b] of Object.entries(c.boards) as [string, Box][]) {
      if (!shows(b, map.width, map.height)) continue;
      expect.soft(b.h, `${zoom}: ${id} board height`).toBeGreaterThanOrEqual(48);
      expect.soft(b.w, `${zoom}: ${id} board width`).toBeGreaterThanOrEqual(48);
      expect.soft(b.w, `${zoom}: ${id} board width`).toBeLessThanOrEqual(96);
    }
    // The spoken words are the drawn words and never change on a short stick.
    for (const el of await page.locator('[data-build]').all()) {
      const id = await el.getAttribute('data-build');
      const label = (await el.getAttribute('aria-label')) ?? '';
      const want = { lamps: /Lamps/, market: /Market/, mast: /Mast/ }[id as 'lamps' | 'market' | 'mast'];
      if (want) expect.soft(label, `${zoom}: ${id} words`).toMatch(want);
    }
  }
});

test('at 320 x 240, while the hero walks: no sign sits over a drawn pin for long, and a board tap mid-walk lands', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openCity(page, BUSY);
  const map = (await page.getByRole('dialog', { name: 'Lagos' }).locator('.city-map').boundingBox())!;
  await page.keyboard.press('+');
  await page.waitForTimeout(800);
  // Longest run of samples in which the same sign covers the same drawn pin.
  const runs = new Map<string, number>();
  let worst = { what: '', ms: 0 };
  for (const target of ['lamps', 'mast', 'market']) {
    // What a finger hits at the board's middle is that board (the round 2 rule, here zoomed in).
    const board = page.locator(`[data-build="${target}"]`);
    const hit = await board.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { ok: e.contains(at), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], at: at ? `${at.tagName} ${at.textContent?.slice(0, 20)}` : '' };
    });
    if (!hit.ok && process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/r3-320x240-near-${target}-covered.png` });
    expect.soft(hit.ok, `zoomed in, standing: the middle of the ${target} board ${JSON.stringify(hit.box)} is covered by ${hit.at}`).toBe(true);
    await board.tap({ timeout: 10_000, force: !hit.ok });
    const t0 = Date.now();
    let last = t0;
    while (Date.now() - t0 < 10_000) {
      const c = await city(page);
      const now = Date.now();
      const hit = new Set<string>();
      for (const [name, b] of [...Object.entries(c.boards), ...Object.entries(c.bubbles)] as [string, Box][]) {
        if (!shows(b, map.width, map.height)) continue;
        for (const [spot, p] of Object.entries(c.pins) as [string, Box][]) {
          if (BUSY.fixed.includes(spot) || !shows(p, map.width, map.height)) continue;
          if (!apart(b, p)) hit.add(`${name} over ${spot}`);
        }
      }
      for (const k of [...runs.keys()]) if (!hit.has(k)) runs.delete(k);
      for (const k of hit) {
        const ms = (runs.get(k) ?? 0) + (now - last);
        runs.set(k, ms);
        if (ms > worst.ms) worst = { what: `walking to ${target}: ${k}`, ms };
      }
      last = now;
      if (!c.hero.moving && now - t0 > 500) break;
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
    // Once the hero stands, nothing covers a drawn pin.
    const c = await city(page);
    for (const [name, b] of [...Object.entries(c.boards), ...Object.entries(c.bubbles)] as [string, Box][]) {
      if (!shows(b, map.width, map.height)) continue;
      for (const [spot, p] of Object.entries(c.pins) as [string, Box][]) {
        if (BUSY.fixed.includes(spot) || !shows(p, map.width, map.height)) continue;
        expect.soft(apart(b, p), `standing after ${target}: ${name} over ${spot}`).toBe(true);
      }
    }
    if (await page.getByRole('dialog').filter({ hasNot: page.locator('.city-map') }).count()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    }
  }
  test.info().annotations.push({ type: 'longest overlap mid-walk', description: `${worst.what} ${worst.ms} ms` });
  // A short pass over a pin is fine; a sign parked on a pin for most of a walk is not.
  expect(worst.ms, worst.what).toBeLessThanOrEqual(1500);
});

for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
  [393, 851],
] as const) {
  test(`at ${width} x ${height}, zoomed in: every drawn pin fully off screen gets an edge arrow`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openCity(page, BUSY);
    const map = (await page.getByRole('dialog', { name: 'Lagos' }).locator('.city-map').boundingBox())!;
    await page.keyboard.press('+');
    await page.waitForTimeout(800);
    let checked = 0;
    // Walk the camera round with the arrow keys so different pins leave the screen.
    for (const key of ['', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
      if (key) {
        await page.keyboard.down(key);
        await page.waitForTimeout(1200);
        await page.keyboard.up(key);
        await expect.poll(async () => (await city(page)).hero.moving, { timeout: 12_000 }).toBe(false);
        await page.waitForTimeout(600);
      }
      const c = await city(page);
      const icons = c.arrows.map((a) => a.icon);
      for (const [spot, p] of Object.entries(c.pins) as [string, Box][]) {
        if (BUSY.fixed.includes(spot) || shows(p, map.width, map.height)) continue;
        checked++;
        if (!icons.includes(spot) && process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/r3-${width}x${height}-no-arrow-${spot}-${checked}.png` });
        expect.soft(icons, `after ${key || 'zoom'}: ${spot} pin ${JSON.stringify(p)} is fully off screen`).toContain(spot);
      }
    }
    test.info().annotations.push({ type: 'off-screen pins checked', description: String(checked) });
    // The test means something only if some pin did leave the screen.
    expect(checked, 'no pin left the screen').toBeGreaterThan(0);
  });
}
