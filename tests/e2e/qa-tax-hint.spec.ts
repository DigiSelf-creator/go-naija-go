/**
 * qa round 5, W18 (decision 71, lead's tiny-screen ruling): the tax hint may cover a sign or a
 * bubble but never the hero, also while the hero walks in its first 4 s (it stays through a walk
 * then). Break attempt: walk the hero up, left, right and down with the hint showing at
 * 320 x 240, 640 x 200 and 568 x 320 and check every 100 ms.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const TAX = 'Busy shops pay a small tax. Lagos uses it to fix more.';
type Box = { x: number; y: number; w: number; h: number };
const city = (page: Page) => page.evaluate(() => window.__game!.city!);
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos', exact: true });
const hint = (page: Page) => lagos(page).locator('.city-hint');
const apart = (a: Box, b: Box) => a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5;

/** As tax-words.spec: the hero's drawn box on the page (CSS px). */
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

// Was a game bug (qa round 5): the hero could walk under the hint bar in the 4 s it stays through a
// walk. Fixed in src/screens/city.ts placeHint: placed again each frame, hidden when no spot is clear.

for (const [width, height] of [
  [320, 240],
  [640, 200],
] as const) {
  for (const keys of [['ArrowUp', 'ArrowLeft'], ['ArrowUp', 'ArrowRight']] as const) {
    test(`W18 at ${width} x ${height}: the tax hint never covers the hero while it walks ${keys.join('+')} in the first 4 s`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await page.evaluate(
        ({ look, p }) => {
          localStorage.setItem('gidi-look', look);
          localStorage.setItem('gidi-intro', '"seen"');
          localStorage.setItem('gidi-progress', p);
        },
        { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: { kobo: 0, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: { buka: 150, market: 240 }, boom: 8, hints: ['walk', 'buka', 'collect', 'bright'] } }) },
      );
      await page.reload();
      await page.getByRole('button', { name: 'Play' }).tap();
      await expect.poll(() => screenNow(page)).toBe('city');
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await page.locator('[data-place="buka"]').tap();
      await expect.poll(async () => (await city(page)).saved.kobo, { timeout: 15_000 }).toBe(150);
      await expect(hint(page)).toHaveText(TAX, { timeout: 8000 });
      for (const k of keys) await page.keyboard.down(k);
      const over: string[] = [];
      const under: string[] = [];
      try {
        for (let i = 0; i < 35; i++) {
          if (!(await hint(page).isVisible())) {
            await page.waitForTimeout(100);
            continue;
          }
          const r = (await hint(page).boundingBox())!;
          // qa recheck: nor behind a bottom button (its words would be painted over).
          for (const b of await lagos(page).locator('.city-bottom button').all()) {
            const q = await b.boundingBox();
            if (q && !apart({ x: r.x, y: r.y, w: r.width, h: r.height }, { x: q.x, y: q.y, w: q.width, h: q.height })) under.push(`t${i * 100}ms hint ${JSON.stringify(r)} button ${JSON.stringify(q)}`);
          }
          const h = await heroBox(page);
          if (!apart({ x: r.x, y: r.y, w: r.width, h: r.height }, h)) {
            if (!over.length) await page.screenshot({ path: test.info().outputPath('hint-over-hero.png') });
            over.push(`t${i * 100}ms hint ${JSON.stringify(r)} hero ${JSON.stringify(h)}`);
          }
          await page.waitForTimeout(100);
        }
      } finally {
        for (const k of keys) await page.keyboard.up(k);
      }
      expect(over, 'the hint over the hero').toEqual([]);
      expect(under, 'the hint behind a bottom button').toEqual([]);
    });
  }
}
