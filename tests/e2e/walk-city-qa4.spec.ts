/**
 * qa, slice 3 step (c) "Walk the city", round 4: an edge arrow with no clear spot may now sit
 * over a drawn pin or the "Lagos" heading (soft). Whatever it covers, a finger at a drawn pin's
 * middle still opens that pin, a finger at the arrow's middle still hits the arrow, and the
 * arrow is never mostly hidden under the heading. Boards and bubbles never go under the heading.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
type Box = { x: number; y: number; w: number; h: number };
const HINTS = ['walk', 'buka', 'collect'];
const STATES = {
  // Power and Tech in hand: the Lamps, Market and Mast boards and the Mama Put bubble all up.
  busy: { kobo: 300, power: 4, tech: 2, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 150 }, boom: 8, hints: HINTS },
  // Nothing fixed yet: every pin drawn.
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
const shows = (b: Box, w: number, h: number) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < w && b.y < h;
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const R = 22;

for (const [width, height] of [
  [320, 240],
  [640, 200],
  [851, 393],
  [393, 851],
] as const) {
  for (const [name, state] of Object.entries(STATES)) {
    test(`at ${width} x ${height} (${name}), zoomed in: an edge arrow over a drawn pin or the heading never hides the pin's tap or the arrow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openCity(page, state);
      const dlg = page.getByRole('dialog', { name: 'Lagos' });
      const map = (await dlg.locator('.city-map').boundingBox())!;
      await page.keyboard.press('+');
      await page.waitForTimeout(800);
      const seen = { arrows: 0, overPin: 0, underHeading: 0 };
      const fixed: readonly string[] = state.fixed;
      for (const key of ['', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight']) {
        if (key) {
          await page.keyboard.down(key);
          await page.waitForTimeout(1200);
          await page.keyboard.up(key);
          await expect.poll(async () => (await city(page)).hero.moving, { timeout: 12_000 }).toBe(false);
          await page.waitForTimeout(600);
        }
        const c = await city(page);
        // A card open over the map takes every tap; arrows wait.
        if (c.open) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
          continue;
        }
        const hb = (await dlg.locator('.city-top h2').boundingBox())!;
        const heading = { x: hb.x - map.x, y: hb.y - map.y, w: hb.width, h: hb.height };
        // F1: the heading is words only: a tap there goes to the map below.
        const under = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.tagName ?? '', [hb.x + hb.width / 2, hb.y + hb.height / 2]);
        expect.soft(under, `after ${key || 'zoom'}: a tap at the heading's middle`).not.toBe('H2');
        // F1: the heading is hard for boards and bubbles: none sits under it, even partly.
        for (const [id, b] of [...Object.entries(c.boards), ...Object.entries(c.bubbles)] as [string, Box][]) {
          if (!shows(b, map.width, map.height)) continue;
          expect.soft(overlap(b, heading), `after ${key || 'zoom'}: the ${id} sign ${JSON.stringify(b)} under the heading`).toBe(0);
        }
        for (const a of c.arrows) {
          seen.arrows++;
          const ab = { x: a.x - R, y: a.y - R, w: 2 * R, h: 2 * R };
          // The arrow's own middle: the arrow takes that tap.
          const mid = await page.evaluate(([x, y]) => {
            const at = document.elementFromPoint(x!, y!);
            const pin = at?.closest('[data-spot]')?.getAttribute('data-spot');
            return pin ? `pin ${pin}` : at ? `${at.tagName}.${at.className}` : '';
          }, [map.x + a.x, map.y + a.y]);
          if (!mid.includes('city-arrow') && process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/r4-${width}x${height}-${name}-${a.icon}-mid-${key}.png` });
          const cover = Object.entries(c.pins)
            .filter(([s, p]) => !fixed.includes(s) && overlap(ab, p as Box))
            .map(([s, p]) => `${s} ${Math.round((100 * overlap(ab, p as Box)) / (ab.w * ab.h))}%`);
          expect.soft(mid, `after ${key || 'zoom'}: the middle of the ${a.icon} arrow (${Math.round(a.x)}, ${Math.round(a.y)}); pins over it: ${cover.join(', ') || 'none'}`).toContain('city-arrow');
          // Under the heading it would be hidden: at most a sliver may go under it.
          const under = overlap(ab, heading);
          if (under) seen.underHeading++;
          expect.soft(under / (ab.w * ab.h), `after ${key || 'zoom'}: ${a.icon} arrow under the heading`).toBeLessThanOrEqual(0.25);
          for (const [spot, p] of Object.entries(c.pins) as [string, Box][]) {
            if (fixed.includes(spot) || !shows(p, map.width, map.height) || !overlap(ab, p)) continue;
            seen.overPin++;
            if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/r4-${width}x${height}-${name}-${a.icon}-over-${spot}.png` });
            // The pin is drawn above the arrow and keeps its tap at its middle.
            const hit = await page.evaluate(([x, y]) => {
              const at = document.elementFromPoint(x!, y!);
              return at?.closest('[data-spot]')?.getAttribute('data-spot') ?? (at ? `${at.tagName}.${at.className}` : '');
            }, [map.x + p.x + p.w / 2, map.y + p.y + p.h / 2]);
            expect.soft(hit, `after ${key || 'zoom'}: the ${a.icon} arrow over the ${spot} pin; a tap at the pin's middle`).toBe(spot);
          }
        }
      }
      test.info().annotations.push({ type: 'arrows seen / over a pin / under the heading', description: `${seen.arrows} / ${seen.overPin} / ${seen.underHeading}` });
      expect(seen.arrows, 'no arrow showed').toBeGreaterThan(0);
    });
  }
}

// The mid-walk sign fit (round 4) runs only when signs crowd: the busy city on the smallest screens.
for (const [width, height] of [
  [320, 240],
  [640, 200],
] as const) {
  test(`slowed 4x CPU: at ${width} x ${height} with four signs up, zoomed in, walking stays at 45 fps or more`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height });
    await openCity(page, STATES.busy);
    await page.keyboard.press('+');
    await page.waitForTimeout(800);
    const box = (await page.locator('.city-map').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    let fps = 0;
    let secs = 0;
    try {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(500);
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
      // Hold and slide across the map, so the camera slides and the signs keep moving.
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let i = 0; i < 4; i++) {
        await page.mouse.move(cx - box.width * 0.4, cy - box.height * 0.2, { steps: 15 });
        await page.mouse.move(cx + box.width * 0.4, cy + box.height * 0.2, { steps: 15 });
      }
      await page.mouse.up();
      const frames = await page.evaluate(() => {
        const w = window as unknown as { __f: number[]; __on: boolean };
        w.__on = false;
        return w.__f;
      });
      secs = (frames[frames.length - 1]! - frames[0]!) / 1000;
      fps = (frames.length - 1) / secs;
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    test.info().annotations.push({ type: 'busy walk at 4x CPU', description: `${fps.toFixed(1)} fps over ${secs.toFixed(1)} s` });
    expect(fps).toBeGreaterThanOrEqual(45);
  });
}
