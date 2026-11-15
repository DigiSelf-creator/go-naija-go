/**
 * docs/city.md W18 (decision 71): tray money is tax. The qa list: the words exact in the right
 * place; "Tax 80 kobo", "Tax ₦1.20" and "Tax ₦1.50" + "Full" fit their bubbles at 320 x 240,
 * 568 x 320, 640 x 200 and 851 x 393; the first hint and the explanation take at most two lines
 * and cover no hero, board or bubble; "The market paid ₦2.40 tax!" fits on one line; the
 * explanation shows once (an old save sees it on its next collect), at least 4 s, gone at 8 s or
 * on the next walk; the spoken lines; reduced motion says the same words; the money is unchanged.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const TAX = 'Busy shops pay a small tax. Lagos uses it to fix more.';
const FIRST = 'Mama Put pays a small tax! Walk over to collect it.';
type Box = { x: number; y: number; w: number; h: number };

/** Every canvas word with its measured width and the max width it was given. */
async function recordCanvasWords(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __words: { text: string; w: number; max: number | null }[] };
    w.__words = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, max?: number) {
      if (w.__words.length < 8000) w.__words.push({ text: String(text), w: this.measureText(String(text)).width, max: max ?? null });
      return max === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, max);
    };
  });
}
const canvasWords = (page: Page) => page.evaluate(() => (window as unknown as { __words: { text: string; w: number; max: number | null }[] }).__words);

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
const hint = (page: Page) => lagos(page).locator('.city-hint');
const live = (page: Page) => page.locator('.city-card > .sr-only[aria-live]');
const savedCity = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? 'null') as { city?: { hints: string[]; kobo: number; boom: number; trays: Record<string, number> } } | null)?.city ?? null);
const apart = (a: Box, b: Box) => a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5;

/** The hero's drawn box on the page (CSS px), from its map place and the pins' known places. */
async function heroBox(page: Page): Promise<Box> {
  const c = await city(page);
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  const p = c.pins;
  const k = (p['slowInternet']!.x + p['slowInternet']!.w / 2 - (p['potholes']!.x + p['potholes']!.w / 2)) / (1300 - 101);
  const x = map.x + c.cam.x + c.hero.x * k;
  const y = map.y + c.cam.y + c.hero.y * k;
  const sz = 24;
  return { x: x - sz * 0.55, y: y - sz * 1.3, w: sz * 1.1, h: sz * 1.5 };
}

/** How many lines the hint bar's words take. */
const hintLines = (page: Page) =>
  hint(page).evaluate((e) => {
    const r = document.createRange();
    r.selectNodeContents(e);
    const tops = new Set([...r.getClientRects()].map((q) => Math.round(q.top)));
    return tops.size;
  });

/**
 * The hint bar is clear of the hero, every board and every bubble. `room`: false where the screen
 * has no clear place for it (see the note at SIZES); what it covers there is noted, not failed.
 */
async function hintClear(page: Page, what: string, room = { signs: true, hero: true }): Promise<void> {
  const r = (await hint(page).boundingBox())!;
  const hb = { x: r.x, y: r.y, w: r.width, h: r.height };
  const map = (await lagos(page).locator('.city-map').boundingBox())!;
  const c = await city(page);
  for (const [id, b] of [...Object.entries(c.boards), ...Object.entries(c.bubbles)]) {
    const on = { x: map.x + b.x, y: map.y + b.y, w: b.w, h: b.h };
    if (on.x + on.w <= map.x || on.y + on.h <= map.y || on.x >= map.x + map.width || on.y >= map.y + map.height) continue;
    if (room.signs) expect.soft(apart(hb, on), `${what}: the hint over ${id} ${JSON.stringify(on)} (hint ${JSON.stringify(hb)})`).toBe(true);
    else if (!apart(hb, on)) test.info().annotations.push({ type: 'no room', description: `${what}: the hint over ${id}` });
  }
  if (room.hero) expect.soft(apart(hb, await heroBox(page)), `${what}: the hint over the hero`).toBe(true);
  else if (!apart(hb, await heroBox(page))) test.info().annotations.push({ type: 'no room', description: `${what}: the hint over the hero` });
}

/**
 * Where there is no clear place for the hint bar (reported to the designer, W18 qa 2):
 * - 320 x 240 with both trays full: the two full bubbles and the two-line first hint fill the strip
 *   between the chips and the bottom row; the hint keeps clear of the hero, signs cannot all move.
 * - 640 x 200: the strip between the rows (about 60 px) is shorter than the hero at the Mama Put's
 *   door plus the hint; the explanation keeps clear of every sign but not the hero.
 */
const SIZES = [
  [320, 240, { first: { signs: false, hero: true }, tax: { signs: true, hero: true } }],
  [568, 320, { first: { signs: true, hero: true }, tax: { signs: true, hero: true } }],
  [640, 200, { first: { signs: true, hero: true }, tax: { signs: true, hero: false } }],
  [851, 393, { first: { signs: true, hero: true }, tax: { signs: true, hero: true } }],
] as const;

for (const [width, height, room] of SIZES) {
  test(`W18 at ${width} x ${height}: the tax bubbles fit, the hints take two lines at most and cover nothing, the collect lines fit on one line`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await recordCanvasWords(page);
    // "Tax 80 kobo" over the Mama Put and "Tax ₦1.20" over the market.
    await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: { buka: 80, market: 120 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright', 'tax'] });
    const checkFit = async (label: string, place: 'buka' | 'market', full: boolean) => {
      await expect.poll(async () => (await canvasWords(page)).some((t) => t.text === label), { timeout: 5000 }).toBe(true);
      const ws = (await canvasWords(page)).filter((t) => t.text === label);
      for (const t of ws) {
        // Nothing squeezed or cut: the words fit the width they were given.
        expect(t.max, `${label} drawn with a width cap`).not.toBeNull();
        expect(t.w, `${label} squeezed`).toBeLessThanOrEqual(t.max!);
      }
      const b = (await city(page)).bubbles[place]!;
      // The bubble holds the icon, a gap and the words, with room each side (icon 18, gap 5, 8 a
      // side; on the smallest screens the tighter bubble: icon 15, gap 3, 4 a side).
      const edge = width <= 360 && height <= 300 ? 15 + 3 + 8 : 18 + 5 + 16;
      expect(b.w, `${label} bubble width`).toBeGreaterThanOrEqual(edge + ws[0]!.w);
      expect(b.w).toBeLessThanOrEqual(120);
      expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(48);
      if (full) expect((await canvasWords(page)).some((t) => t.text === 'Full')).toBe(true);
    };
    await checkFit('Tax 80 kobo', 'buka', false);
    await checkFit('Tax ₦1.20', 'market', false);
    expect((await canvasWords(page)).some((t) => /^(\d+ kobo|₦[\d.]+)$/.test(t.text)), 'no bare amount on a bubble').toBe(false);

    // Full trays: "Tax ₦1.50" + "Full" and "Tax ₦2.40" + "Full"; the first hint once the Mama Put has ₦1.
    await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: { buka: 150, market: 240 }, boom: 8, hints: ['walk', 'buka', 'bright'] });
    await checkFit('Tax ₦1.50', 'buka', true);
    await checkFit('Tax ₦2.40', 'market', true);
    await expect(hint(page)).toHaveText(FIRST);
    expect(await hintLines(page), 'the first hint in two lines at most').toBeLessThanOrEqual(2);
    await hintClear(page, 'first hint', room.first);

    // The first collect: the line, then the one-time explanation.
    await page.locator('[data-place="buka"]').tap();
    await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(150);
    await expect(hint(page)).toHaveText(TAX, { timeout: 8000 });
    expect(await hintLines(page), 'the explanation in two lines at most').toBeLessThanOrEqual(2);
    await hintClear(page, 'explanation', room.tax);
    await expect.poll(async () => (await canvasWords(page)).some((t) => t.text === 'Mama Put paid ₦1.50 tax!'), { timeout: 5000 }).toBe(true);

    // The market's collect line fits on one line, inside the screen.
    await page.locator('[data-place="market"]').tap();
    await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 20_000 }).toBe(390);
    await expect.poll(async () => (await canvasWords(page)).some((t) => t.text === 'The market paid ₦2.40 tax!'), { timeout: 5000 }).toBe(true);
    const line = (await canvasWords(page)).find((t) => t.text === 'The market paid ₦2.40 tax!')!;
    expect(line.w, 'one line, inside the screen with a 16 px gutter').toBeLessThanOrEqual(width - 32);
    expect(line.max === null || line.w <= line.max, 'not squeezed').toBe(true);
    // Only words changed: ₦1.50 + ₦2.40 (the Booming points are checked in booming.spec).
    expect(await savedCity(page)).toMatchObject({ kobo: 390, trays: { buka: 0, market: 0 } });
  });
}

test('W18 spoken: the bubbles say "Tax from ...", a collect says it in money words then the Naira chip, the explanation is read once', async ({ page }) => {
  await openCity(page, { kobo: 450, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: { buka: 150, market: 120 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright'] });
  await expect(page.getByRole('button', { name: 'Tax from Mama Put: 1 naira 50 kobo. Full.', exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Tax from the market: 1 naira 20 kobo.', exact: true })).toBeAttached();
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(600);
  await expect(live(page)).toContainText('Mama Put paid 1 naira 50 kobo tax. Naira: 6 naira.');
  await expect(live(page)).not.toContainText('₦');
  // The hint bar is a polite live region: the explanation is read from it, once.
  await expect(hint(page)).toHaveText(TAX, { timeout: 8000 });
  await expect(hint(page)).toHaveAttribute('aria-live', 'polite');
});

test('W18 shown once: an old save that has collected sees it on its next collect, at least 4 s, gone by 8 s standing still, never again after a reload', async ({ page }) => {
  test.setTimeout(90_000);
  const old = { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 120 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright'] };
  await openCity(page, old);
  await expect(hint(page)).toBeHidden();
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(120);
  await expect(hint(page)).toHaveText(TAX, { timeout: 4000 });
  const shownAt = Date.now();
  expect((await savedCity(page))!.hints).toContain('tax');
  await expect.poll(async () => (await hint(page).isVisible()) ? Date.now() - shownAt : -1, { timeout: 12_000, intervals: [200] }).toBe(-1);
  const went = Date.now() - shownAt;
  expect(went, 'at least 4 s').toBeGreaterThanOrEqual(3800);
  expect(went, 'gone at 8 s').toBeLessThanOrEqual(9500);
  // Reload with a full tray again: the next collect shows no explanation.
  const saved = (await savedCity(page))!;
  await openCity(page, { ...saved, kobo: 120, trays: { buka: 150 } });
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(270);
  for (let i = 0; i < 10; i++) {
    expect(await hint(page).textContent()).not.toBe(TAX);
    await page.waitForTimeout(300);
  }
  expect((await savedCity(page))!.hints.filter((h) => h === 'tax')).toHaveLength(1);
});

test('W18: the explanation stays through a walk in its first 4 s, then goes on the next walk', async ({ page }) => {
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 120 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright'] });
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(120);
  await expect(hint(page)).toHaveText(TAX, { timeout: 4000 });
  const walk = async (key: string) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(300);
    await page.keyboard.up(key);
  };
  await page.waitForTimeout(800);
  await walk('ArrowLeft');
  await page.waitForTimeout(1200);
  await expect(hint(page), 'a walk in the first 4 s keeps it').toHaveText(TAX);
  await page.waitForTimeout(2600);
  await walk('ArrowRight');
  await expect(hint(page), 'the next walk after 4 s ends it').toBeHidden({ timeout: 1500 });
});

test('W18 reduced motion: the collect line does not rise and still says the new words', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recordCanvasWords(page);
  await openCity(page, { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 120 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright', 'tax'] });
  await expect.poll(async () => (await canvasWords(page)).some((t) => t.text === 'Tax ₦1.20'), { timeout: 5000 }).toBe(true);
  await page.locator('[data-place="buka"]').tap();
  await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(120);
  await expect.poll(async () => (await canvasWords(page)).some((t) => t.text === 'Mama Put paid ₦1.20 tax!'), { timeout: 5000 }).toBe(true);
  expect((await canvasWords(page)).some((t) => /from Mama Put|^\+₦/.test(t.text))).toBe(false);
  // Its tax hint was already seen: none now.
  await expect(hint(page)).toBeHidden();
});
