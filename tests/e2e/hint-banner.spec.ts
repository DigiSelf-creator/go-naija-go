/**
 * qa recheck of piece H: on short screens the hint banner must not hide the "BUS PARK" board.
 * Street 1 is played by hand at each size; when the bus hint shows, the banner's box and the
 * board's drawn box (window.__game.busBoard) must not overlap, the board must be on screen,
 * and the banner text must stay readable (at least 14 px). Screenshots go to $S2H_SHOTS.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { openAndRun } from './helpers';

const SHOTS = process.env['S2H_SHOTS'] ?? 'test-results/s2h-shots';
mkdirSync(SHOTS, { recursive: true });

const BUS_HINT = /yellow bus/i;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const SIZES = [
  [320, 240],
  [568, 230],
  [640, 200],
  [667, 375],
  [932, 430],
] as const;

for (const [width, height] of SIZES) {
  test(`${width}x${height}: the bus hint banner never covers the BUS PARK board`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height });
    await openAndRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    const cdp = await page.context().newCDPSession(page);
    const h = hands(cdp);

    const seen: { banner: Box; board: Box; font: number }[] = [];
    let shot = false;
    await playStreetByHand(page, h, {
      onPoll: async () => {
        const m = await page.evaluate(() => {
          const el = document.querySelector('.toast')!;
          const show = el.classList.contains('show') ? (el.textContent ?? '') : '';
          const r = el.getBoundingClientRect();
          return {
            words: show,
            banner: { x: r.x, y: r.y, w: r.width, h: r.height },
            font: parseFloat(getComputedStyle(el).fontSize),
            board: window.__game!.busBoard,
          };
        });
        if (!BUS_HINT.test(m.words) || !m.board) return;
        seen.push({ banner: m.banner, board: m.board, font: m.font });
        if (!shot) {
          shot = true;
          await page.screenshot({ path: join(SHOTS, `bus-hint-${width}x${height}.png`) });
        }
      },
    });
    await h.upAll();

    expect(seen.length, 'the bus hint showed while the board was drawn').toBeGreaterThan(0);
    for (const { banner, board, font } of seen) {
      expect(font).toBeGreaterThanOrEqual(14);
      expect(overlap(banner, board), `banner ${JSON.stringify(banner)} board ${JSON.stringify(board)}`).toBe(false);
    }
    // The board comes onto the screen while the hint still shows.
    const onScreen = seen.filter(({ board: b }) => b.x >= 0 && b.x + b.w <= width && b.y >= 0 && b.y + b.h <= height);
    expect(onScreen.length, 'the board was fully on screen while the hint showed').toBeGreaterThan(0);
    const last = seen[seen.length - 1]!;
    console.log(`${width}x${height}: banner ${JSON.stringify(last.banner)} board ${JSON.stringify(last.board)} font ${last.font}px`);
  });
}
