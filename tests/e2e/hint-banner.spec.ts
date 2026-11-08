/**
 * The hint bar (docs/design.md S2.2, "The hint bar": hints never hide what you play). Every
 * hint and toast shows in the pavement strip between Forward and Jump. At each size qa tests:
 * 1. no bar pixel over Back, Forward, Jump, Sound, Pause, lives, kobo or the food slot;
 * 2. street 1 played by hand: on every frame a hint shows, no bar pixel over any kobo, food,
 *    crate, hazard, pit lip, the hero (unless falling into a pit), a well, the bus or the
 *    BUS PARK board (their drawn boxes come from window.__game.drawn);
 * 3. every hint fits the bar uncut (no scroll), at 11 px or more.
 * Streets 2 and 3 (K2) are played at 320 x 240, 568 x 320 and 667 x 375 the same way.
 * Screenshots of a hint beside high kobo go to $S2H_SHOTS.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { hands, playStreetByHand } from './hands';
import { openAndRun } from './helpers';

const SHOTS = process.env['S2H_SHOTS'] ?? 'test-results/s2h-shots';
mkdirSync(SHOTS, { recursive: true });

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const boxOf = (page: Page, sel: string) =>
  page.locator(sel).evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null || getComputedStyle(e).position === 'fixed')
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { what: e.className || e.tagName, x: r.x, y: r.y, w: r.width, h: r.height };
      })
      .filter((b) => b.w > 0 && b.h > 0),
  );

const SIZES = [
  [320, 240],
  [568, 230],
  [640, 200],
  [667, 375],
  [851, 393],
  [932, 430],
] as const;

for (const [width, height] of SIZES) {
  test(`${width}x${height}: the hint bar sits between the buttons, never over a button or the HUD`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openAndRun(page);
    // The first hint shows 0.5 s after the start.
    await expect.poll(() => page.evaluate(() => window.__game!.hintBar.words)).not.toBe('');
    const bar = await page.evaluate(() => window.__game!.hintBar);
    const L = bar.limits;
    expect(bar.x).toBeGreaterThanOrEqual(L.x - 0.5);
    expect(bar.x + bar.w).toBeLessThanOrEqual(L.x + L.w + 0.5);
    expect(bar.y).toBeGreaterThanOrEqual(L.top - 0.5);
    expect(bar.y + bar.h).toBeLessThanOrEqual(L.bottom + 0.5);
    const others = [
      ...(await boxOf(page, '.pad:not([hidden])')),
      ...(await boxOf(page, '.hud-lives, .hud-kobo, .hud-food:not([hidden]), .hud-btn')),
    ];
    expect(others.length, 'buttons and HUD items found').toBeGreaterThanOrEqual(7);
    for (const o of others) expect(overlap(bar, o), `bar ${JSON.stringify(bar)} over ${JSON.stringify(o)}`).toBe(false);
    console.log(`${width}x${height}: bar x ${bar.x.toFixed(0)} to ${(bar.x + bar.w).toFixed(0)}, y ${bar.y.toFixed(0)} to ${(bar.y + bar.h).toFixed(0)}, ${bar.font} px`);
  });

  test(`${width}x${height}: street 1 by hand, no hint ever covers kobo, food, hazards, pits, the hero or the bus`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height });
    await openAndRun(page);
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    // Checked in the page on every drawn frame, not by polling.
    await page.evaluate(() => {
      const w = window as unknown as { __bar: { frames: number; hits: string[]; words: Record<string, number>; uncut: string[]; highKobo: boolean } };
      const log = { frames: 0, hits: [] as string[], words: {} as Record<string, number>, uncut: [] as string[], highKobo: false };
      w.__bar = log;
      const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      let same = 0;
      let lastWords = '';
      const frame = (): void => {
        const g = window.__game!;
        const bar = g.hintBar;
        same = bar.words && bar.words === lastWords ? same + 1 : 0;
        lastWords = bar.words;
        if (bar.words && g.screen === 'play') {
          log.frames++;
          log.words[bar.words] = Math.min(log.words[bar.words] ?? 99, bar.font);
          if (!bar.fits && !log.uncut.includes(bar.words)) log.uncut.push(bar.words);
          const drawn = g.drawn;
          for (const d of drawn) if (hit(bar, d) && log.hits.length < 20) log.hits.push(`${d.what} at step ${g.steps} under "${bar.words}"`);
          // A kobo high in the air on screen while a hint has shown (faded in) a while: worth a picture.
          log.highKobo = same > 15 && drawn.some((d) => d.what === 'kobo' && d.y + d.h < bar.limits.top * 0.72 && d.x > 0 && d.x + d.w < innerWidth);
        } else log.highKobo = false;
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const cdp = await page.context().newCDPSession(page);
    const h = hands(cdp);
    let shot = false;
    const { last } = await playStreetByHand(page, h, {
      onPoll: async () => {
        if (shot || ![320, 667].includes(width)) return;
        if (await page.evaluate(() => (window as unknown as { __bar: { highKobo: boolean } }).__bar.highKobo)) {
          shot = true;
          await page.screenshot({ path: join(SHOTS, `hint-bar-high-kobo-${width}x${height}.png`) });
        }
      },
    });
    await h.upAll();
    const log = await page.evaluate(() => (window as unknown as { __bar: { frames: number; hits: string[]; words: Record<string, number>; uncut: string[] } }).__bar);
    const small = Object.entries(log.words).filter(([, px]) => px < 12);
    console.log(
      `${width}x${height}: reached ${last.r.phase}; ${log.frames} frames with a hint, ${Object.keys(log.words).length} hints; ` +
        `covered: ${log.hits.length ? log.hits.join('; ') : 'nothing'}; uncut: ${log.uncut.length ? log.uncut.join(' | ') : 'all fit'}; ` +
        `under 12 px: ${small.length ? small.map(([w, px]) => `"${w}" ${px}px`).join(', ') : 'none'}${shot ? '; screenshot taken' : ''}`,
    );
    expect(log.frames, 'hints showed').toBeGreaterThan(100);
    expect(Object.keys(log.words).length, 'the street hints showed').toBeGreaterThanOrEqual(10);
    expect(log.hits, 'nothing playable under the bar').toEqual([]);
    expect(log.uncut, 'every hint fits the bar uncut').toEqual([]);
    for (const px of Object.values(log.words)) expect(px).toBeGreaterThanOrEqual(11);
    if ([320, 667].includes(width)) expect(shot, 'a hint showed beside high kobo').toBe(true);
  });
}

/** S2.2 hint bar qa check 2 on streets 2 and 3 (K2), at the three sizes design names. */
for (const id of ['lagos-2', 'lagos-3'] as const) {
  for (const [width, height] of [
    [320, 240],
    [568, 320],
    [667, 375],
  ] as const) {
    test(`${width}x${height}: ${id} by hand, no hint or toast ever covers anything playable`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width, height });
      await openAndRun(page, `./?level=${id}`);
      await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
      expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
      await page.evaluate(() => {
        const log = { frames: 0, hits: [] as string[], words: {} as Record<string, number>, uncut: [] as string[] };
        (window as unknown as { __bar: typeof log }).__bar = log;
        const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const frame = (): void => {
          const g = window.__game!;
          const bar = g.hintBar;
          if (bar.words && g.screen === 'play') {
            log.frames++;
            log.words[bar.words] = Math.min(log.words[bar.words] ?? 99, bar.font);
            if (!bar.fits && !log.uncut.includes(bar.words)) log.uncut.push(bar.words);
            for (const d of g.drawn) if (hit(bar, d) && log.hits.length < 20) log.hits.push(`${d.what} at step ${g.steps} under "${bar.words}"`);
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      const h = hands(await page.context().newCDPSession(page));
      const { last } = await playStreetByHand(page, h);
      await h.upAll();
      const log = await page.evaluate(() => (window as unknown as { __bar: { frames: number; hits: string[]; words: Record<string, number>; uncut: string[] } }).__bar);
      console.log(
        `${width}x${height} ${id}: reached ${last.r.phase}; ${log.frames} frames with words, ${Object.keys(log.words).join(' | ')}; ` +
          `covered: ${log.hits.length ? log.hits.join('; ') : 'nothing'}; uncut: ${log.uncut.length ? log.uncut.join(' | ') : 'all fit'}`,
      );
      expect(last.r.phase).toBe('bus');
      expect(Object.keys(log.words).length, 'the street hints showed').toBeGreaterThanOrEqual(2);
      expect(log.hits, 'nothing playable under the bar').toEqual([]);
      expect(log.uncut, 'every hint fits the bar uncut').toEqual([]);
      for (const px of Object.values(log.words)) expect(px).toBeGreaterThanOrEqual(11);
    });
  }
}

test('the bar hides when pause opens and does not come back for a hint whose time ran out', async ({ page }) => {
  await openAndRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.hintBar.words)).not.toBe('');
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  expect(await page.evaluate(() => window.__game!.hintBar.words)).toBe('');
  await page.waitForTimeout(3600); // longer than the 3.5 s a hint shows
  await page.getByRole('button', { name: 'Keep running' }).tap();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();
  expect(await page.evaluate(() => window.__game!.hintBar.words)).toBe('');
});
