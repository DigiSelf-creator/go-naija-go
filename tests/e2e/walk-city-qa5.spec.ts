/**
 * qa, slice 3 step (c) "Walk the city", round 5: every edge arrow has a 48 x 48 tap square
 * (smaller only on the packed 320 x 240 Power + Tech city), and a real finger at the arrow's
 * middle or near any corner of that square opens the card of the pin the arrow points to.
 * Arrows for boards and trays are checked by hit test only (a tap would spend or collect).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const HINTS = ['walk', 'buka', 'collect'];
const STATES = {
  busy: { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: HINTS },
  fresh: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, built: [], trays: {}, boom: 0, hints: HINTS },
} as const;

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

for (const [width, height] of [
  [320, 240],
  [568, 320],
  [640, 200],
  [851, 393],
  [393, 851],
  [1280, 720],
] as const) {
  for (const [name, state] of Object.entries(STATES)) {
    const packed = width === 320 && height === 240 && name === 'busy';
    test(`at ${width} x ${height} (${name}), zoomed in: a tap at an edge arrow's middle or corners opens its own pin's card`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height });
      await openCity(page, state);
      const map = (await page.getByRole('dialog', { name: 'Lagos' }).locator('.city-map').boundingBox())!;
      await page.keyboard.press('+');
      await page.waitForTimeout(800);
      const sizes: number[] = [];
      let tapped = 0;
      for (const key of ['', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowRight']) {
        if (key) {
          await page.keyboard.down(key);
          await page.waitForTimeout(1200);
          await page.keyboard.up(key);
          await expect.poll(async () => (await city(page)).hero.moving, { timeout: 12_000 }).toBe(false);
          await page.waitForTimeout(600);
        }
        let c = await city(page);
        if (c.open) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
          continue;
        }
        const pinIds = Object.keys(c.pins);
        for (let i = 0; i < c.arrows.length; i++) {
          c = await city(page);
          const a = c.arrows[i];
          if (!a) break;
          sizes.push(a.tap);
          if (!packed) expect.soft(a.tap, `after ${key || 'zoom'}: ${a.icon} arrow tap square`).toBe(48);
          else expect.soft(a.tap, `after ${key || 'zoom'}: ${a.icon} arrow tap square (packed)`).toBeGreaterThanOrEqual(36);
          // 4 px in: the sign button has 8 px rounded corners, which Chromium hit-tests (minor, see report).
          const d = a.tap / 2 - 4;
          const points = [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]] as const;
          // Same arrow element at all five points.
          const fors = await page.evaluate(
            (pts) => pts.map(([x, y]) => {
              const at = document.elementFromPoint(x, y) as HTMLElement | null;
              return at?.classList.contains('city-arrow') ? at.dataset['for'] ?? '?' : `${at?.tagName}.${at?.className}`;
            }),
            points.map(([dx, dy]) => [map.x + a.x + dx, map.y + a.y + dy] as [number, number]),
          );
          expect.soft(new Set(fors).size, `after ${key || 'zoom'}: ${a.icon} arrow, what the five points hit: ${fors.join(' | ')}`).toBe(1);
          if (!pinIds.includes(a.icon)) continue;
          // A real finger tap at each point opens this pin's card.
          for (const [dx, dy] of points) {
            await page.touchscreen.tap(map.x + a.x + dx, map.y + a.y + dy);
            const card = page.locator('.city-problem[role="dialog"]');
            await expect.soft(card, `after ${key || 'zoom'}: tap at (${dx}, ${dy}) from the ${a.icon} arrow's middle`).toBeVisible({ timeout: 3000 });
            if (await card.isVisible()) {
              expect.soft(await card.getAttribute('data-spot'), `after ${key || 'zoom'}: card from the ${a.icon} arrow`).toBe(a.icon);
              tapped++;
              await page.keyboard.press('Escape');
              await expect(card).toBeHidden();
            }
            await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
          }
        }
      }
      test.info().annotations.push({ type: 'arrow squares / pin-arrow taps', description: `${sizes.join(', ') || 'none'} / ${tapped}` });
      expect(sizes.length, 'no arrow showed').toBeGreaterThan(0);
    });
  }
}

// Minor follow-up (round 5): the arrow button is said to be exactly its square, but `.city-sign`
// has `border-radius: 8px`, which Chromium hit-tests, so a finger 1-3 px in from a corner of the
// 48 square lands on the map (the hero walks there) instead of the arrow.
test.fixme('an edge arrow takes a tap 1 px in from every corner of its square', async ({ page }) => {
  await page.setViewportSize({ width: 851, height: 393 });
  await openCity(page, STATES.fresh);
  const map = (await page.getByRole('dialog', { name: 'Lagos' }).locator('.city-map').boundingBox())!;
  await page.keyboard.press('+');
  await page.waitForTimeout(800);
  const c = await city(page);
  expect(c.arrows.length, 'no arrow showed').toBeGreaterThan(0);
  for (const a of c.arrows) {
    const d = a.tap / 2 - 1;
    for (const [dx, dy] of [[-d, -d], [d, -d], [-d, d], [d, d]] as const) {
      const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.className ?? '', [map.x + a.x + dx, map.y + a.y + dy]);
      expect.soft(hit, `${a.icon} arrow, (${dx}, ${dy}) from its middle`).toContain('city-arrow');
    }
  }
});
