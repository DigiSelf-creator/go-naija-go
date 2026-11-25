/**
 * MS3b, MS3c (docs/missions.md part 2, part 8 checks 3, 4, 6, 7): the quick missions by touch.
 * The "Missions" button is first in the city's bottom row (five buttons with Travel) and fits at
 * all six sizes with and without a 24 px safe area; the board and a mission's card fit with no
 * scroll (tiles 56 px, buttons 44 px, words 15 px). Secret wells: Ikeja's well behind the start
 * fills the second star, the chip says so, the star stays after Out of lives, ₦2 is paid once,
 * and a reload keeps it all. The goal chip never covers Pause, Sound or the hero; Ogun's board
 * shows its five. With MS_SHOTS=<folder> it saves pictures (ms-*.png).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, cityToRoad, playStop, screenNow, waitOutTapLock } from './helpers';

const SHOTS = process.env['MS_SHOTS'];
const LOOK = '{"skin":4,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const STREETS = { 1: D, 2: D, 3: D };
const HALL = { done: true, best: 0 };
const CITY = { kobo: 1000, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: {}, boom: 8, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax', 'taxOgun', 'laneBoth'] };
const PROGRESS = (where: string) => ({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, hall: { done: false, best: 0 }, parcel: false } }, city: CITY, lane: { best: 700, goals: 1, runs: 2, hints: [] }, where });
/** Computer Village's well is found already: one of Secret wells' two stars. */
const MISSIONS = { v: 1, stars: { 'lagos-wells': 1 }, found: { 'lagos-wells-2': 1 } };
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ms-${name}.png` });
};
const saved = (page: Page) => page.evaluate(() => ({ m: JSON.parse(localStorage.getItem('gidi-missions') ?? 'null'), p: JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') }));

async function open(page: Page, where = 'lagos', missions: object | null = MISSIONS): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p, m }) => {
      localStorage.clear();
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      if (m) localStorage.setItem('gidi-missions', m);
    },
    { look: LOOK, p: JSON.stringify(PROGRESS(where)), m: missions ? JSON.stringify(missions) : null },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe(where === 'ogun' ? 'ogun' : 'city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

/** Sets a 24 px safe area on every side (as the store app does), or none. */
const safe = (page: Page, px: number) =>
  page.evaluate((px) => {
    for (const s of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--safe-${s}`, `${px}px`);
    window.dispatchEvent(new Event('resize'));
  }, px);

type Box = { x: number; y: number; w: number; h: number; t: string };
const boxes = (page: Page, sel: string) =>
  page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getClientRects().length > 0).map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, t: (e.textContent ?? '').trim().slice(0, 30) };
  }), sel);
const meets = (a: Box, b: Box, gap = 0) => a.x < b.x + b.w + gap - 0.5 && b.x < a.x + a.w + gap - 0.5 && a.y < b.y + b.h + gap - 0.5 && b.y < a.y + a.h + gap - 0.5;

/** Smallest words in shown buttons under `sel` (CSS px). */
const smallest = (page: Page, sel: string) =>
  page.evaluate((sel) => {
    let px = Infinity;
    for (const b of document.querySelectorAll<HTMLElement>(`${sel} button`)) {
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if ((n.textContent ?? '').trim() && n.parentElement!.getClientRects().length) px = Math.min(px, parseFloat(getComputedStyle(n.parentElement!).fontSize));
    }
    return px;
  }, sel);

test('the Missions button leads the bottom row and the five buttons fit at every size, safe area or not', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const row = page.locator('.city-bottom .city-buttons > button');
  await page.setViewportSize({ width: 851, height: 393 });
  await settle(page);
  await expect(row.first()).toHaveText('Missions');
  expect(await row.allTextContents()).toEqual(['Missions', 'Challenge road', 'Travel', 'Hero', "Nigeria's wheel"]);
  const moved: string[] = [];
  // Its star disc is a picture only; the button is read as "Missions".
  await expect(page.getByRole('button', { name: 'Missions', exact: true })).toBeVisible();
  for (const px of [0, 24]) {
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await safe(page, px);
      await settle(page);
      const at = `${size.width}x${size.height} safe ${px}`;
      if (size.width === 851 || size.width === 320) await shot(page, `city-row-${size.width}x${size.height}-safe${px}`);
      const b = await boxes(page, '.city-bottom button');
      const top = await boxes(page, '.city-top h2, .city-chip, .city-top button');
      // MS-R4: five in one row, or "Nigeria's wheel" moves into Settings.
      const inRow = await row.allTextContents();
      if (inRow.length === 4) {
        expect(inRow, at).toEqual(['Missions', 'Challenge road', 'Travel', 'Hero']);
        moved.push(at);
      } else expect(inRow, at).toHaveLength(5);
      for (const q of b) {
        expect(q.h, `${at} ${q.t} 44 px`).toBeGreaterThanOrEqual(44);
        expect(q.w, `${at} ${q.t} 44 px`).toBeGreaterThanOrEqual(44);
        expect(q.x >= px - 0.5 && q.y >= px - 0.5 && q.x + q.w <= size.width - px + 0.5 && q.y + q.h <= size.height - px + 0.5, `${at} ${q.t} inside the safe edges`).toBe(true);
        for (const o of b) if (o !== q) expect(meets(q, o), `${at} ${q.t} / ${o.t}`).toBe(false);
        // 320 x 240 with 24 px on every side leaves 272 x 192: there even today's four buttons
        // take two rows and meet the chips (as before the missions; qa-o2-city checks 44 px and the edges).
        if (!(px && size.width === 320)) for (const o of top) expect(meets(q, o), `${at} ${q.t} under ${o.t}`).toBe(false);
      }
      expect(await smallest(page, '.city-bottom'), at).toBeGreaterThanOrEqual(15);
      if (size.width === 851 || size.width === 320) await shot(page, `city-row-${size.width}x${size.height}-safe${px}`);
    }
  }
  console.log(`MS-R4: the wheel moves into Settings at ${moved.join(', ') || 'no size'}`);
  // Where it moved, Settings has it (same words), and it opens the wheel.
  await page.setViewportSize({ width: 320, height: 240 });
  await safe(page, 0);
  await settle(page);
  const out = (await row.count()) === 4;
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByRole('button', { name: "Nigeria's wheel" })).toHaveCount(out ? 1 : 0);
  if (out) {
    // It pairs up with "Show the bus ride" in the two columns: Settings is no taller than before
    // (with Ogun open it already scrolls a little at 320 x 240, for its "saved on this phone" line).
    const rows = await page.evaluate(() => new Set([...document.querySelectorAll('.settings-list > button')].map((b) => Math.round(b.getBoundingClientRect().top))).size);
    expect(rows).toBe(4);
    await shot(page, 'settings-320x240');
    await settings.getByRole('button', { name: "Nigeria's wheel" }).tap();
    await expect.poll(() => screenNow(page)).toBe('wheel');
  }
});

test('the board and a mission card fit with no scroll; tiles 56 px, words 15 px; Back goes back', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  const board = page.getByRole('dialog', { name: 'Missions' });
  await expect(board).toBeVisible();
  await expect(board.getByText('Get stars! Tap a mission.')).toBeVisible();
  await expect(board.getByText('Stars: 1 of 14')).toBeVisible();
  const tiles = board.locator('.ms-tile');
  await expect(tiles).toHaveCount(5);
  expect(await tiles.evaluateAll((t) => t.map((e) => e.getAttribute('aria-label')))).toEqual([
    'Coin catch. Alausa. 0 of 3 stars.',
    'Lunch for Mama Put. Alausa. 0 of 3 stars.',
    'Goat friends. Computer Village. 0 of 3 stars.',
    'Secret wells. Computer Village, Ikeja. 1 of 2 stars.',
    'Light it up. Lane run. 0 of 3 stars.',
  ]);
  // The first with a star still to win glows (the next one).
  await expect(tiles.first()).toHaveClass(/next/);
  for (const px of [0, 24]) {
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await safe(page, px);
      await settle(page);
      const at = `${size.width}x${size.height} safe ${px}`;
      if (px === 0 && (size.width === 851 || size.width === 320 || size.height === 200)) await shot(page, `board-${size.width}x${size.height}`);
      const fit = await page.evaluate(() => {
        const c = document.querySelector<HTMLElement>('.ms-card')!;
        return { sh: c.scrollHeight, ch: c.clientHeight };
      });
      if (size.height >= 320) expect(fit.sh, `${at}: the board shows with no scroll`).toBeLessThanOrEqual(fit.ch + 1);
      // Short screens: the heading and Back always show; the tiles scroll between them.
      const keep = await boxes(page, '.ms-card h2, .ms-foot button');
      for (const q of keep) expect(q.y >= px - 0.5 && q.y + q.h <= size.height - px + 0.5, `${at} ${q.t} shows`).toBe(true);
      for (let i = 0; i < 5; i++) {
        await page.locator('.ms-tile').nth(i).evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
        const tile = (await boxes(page, '.ms-tile'))[i]!;
        const list = (await boxes(page, '.ms-tiles'))[0]!;
        expect(tile.y >= list.y - 0.5 && tile.y + tile.h <= list.y + list.h + 0.5, `${at}: tile ${i + 1} can be reached`).toBe(true);
      }
      const t = await boxes(page, '.ms-tile');
      for (const q of t) expect(q.h, `${at} ${q.t}`).toBeGreaterThanOrEqual(55.9);
      // qa MS4: the star row sits inside the tile, clear of its bottom border (two-line names too).
      const clear = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.ms-tile')].map((e) => {
          const r = e.getBoundingClientRect();
          const s = e.querySelector('.ms-stars')!.getBoundingClientRect();
          return { t: e.querySelector('b')?.textContent ?? '', gap: r.bottom - parseFloat(getComputedStyle(e).borderBottomWidth) - s.bottom };
        }),
      );
      for (const c of clear) expect(c.gap, `${at} ${c.t}: stars clear of the tile's edge`).toBeGreaterThanOrEqual(1);
      for (const q of t) for (const o of t) if (o !== q) expect(meets(q, o, 7), `${at} 8 px apart: ${q.t} / ${o.t}`).toBe(false);
      for (const q of await boxes(page, '.ms-card button')) {
        expect(q.h, `${at} ${q.t}`).toBeGreaterThanOrEqual(44);
        expect(q.x + q.w <= size.width - px + 0.5 && q.x >= px - 0.5, `${at} ${q.t} on screen`).toBe(true);
      }
      expect(await smallest(page, '.ms-card'), at).toBeGreaterThanOrEqual(15);
    }
  }
  await safe(page, 0);
  await page.setViewportSize({ width: 851, height: 393 });
  // A mission's card: its picture, name, line, stars with their numbers, Play and Back.
  await board.getByRole('button', { name: /^Coin catch\./ }).tap({ force: true });
  const card = page.getByRole('dialog', { name: 'Coin catch' });
  await expect(card.getByText('Catch coins on Alausa!')).toBeVisible();
  expect(await card.locator('.ms-goal-star').allTextContents()).toEqual(['60', '100', '135']);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await settle(page);
    const fit = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('.ms-card')!;
      return { sh: c.scrollHeight, ch: c.clientHeight };
    });
    expect(fit.sh, `${size.width}x${size.height}: the card shows with no scroll`).toBeLessThanOrEqual(fit.ch + 1);
    expect(await smallest(page, '.ms-card'), `${size.width}x${size.height}`).toBeGreaterThanOrEqual(15);
    if (size.width === 851 || size.width === 320) await shot(page, `card-${size.width}x${size.height}`);
  }
  await page.setViewportSize({ width: 851, height: 393 });
  await card.getByRole('button', { name: 'Back' }).tap();
  await expect(page.getByRole('dialog', { name: 'Missions' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: 'Back' }).tap();
  await expect(page.locator('.ms-card')).toHaveCount(0);
});

/** Holds a key until the hero's x is past `x`, then lets go and waits for the hero to stand. */
async function keyTo(page: Page, x: number): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const hx = await page.evaluate(() => window.__game!.hero.x);
    if (Math.abs(hx - x) <= 8) return;
    const fwd = x > hx;
    await page.keyboard.down(fwd ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForFunction(({ x, fwd }) => {
      const h = window.__game!.hero;
      const early = h.speed > 100 ? 14 : 4;
      return fwd ? h.x >= x - early : h.x <= x + early;
    }, { x, fwd }, { polling: 'raf', timeout: 20_000 });
    await page.keyboard.up(fwd ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForFunction(() => window.__game!.hero.vx === 0 && window.__game!.hero.grounded, null, { polling: 'raf' });
  }
}

/** The chip, Pause, Sound and the hero on screen now (CSS px). */
async function chipClear(page: Page, at: string): Promise<void> {
  const chip = (await boxes(page, '.ms-chip'))[0]!;
  expect(chip, `${at}: the chip shows`).toBeTruthy();
  for (const b of await boxes(page, '.hud-btn')) expect(meets(chip, b), `${at}: chip over ${b.t || 'a HUD button'}`).toBe(false);
  const hero = (await page.evaluate(() => window.__game!.drawn)).filter((d) => d.what === 'hero' || d.what === 'goat' || d.what === 'drum' || d.what === 'tyre' || d.what === 'pit lip');
  for (const d of hero) expect(meets(chip, { ...d, t: d.what }), `${at}: chip over the ${d.what}`).toBe(false);
}

test('Secret wells at Ikeja: the chip, the star fills, Out of lives keeps it, ₦2 once, a reload keeps it all', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Secret wells\./ }).tap({ force: true });
  const card = page.getByRole('dialog', { name: 'Secret wells' });
  await expect(card.getByText('Find the secret wells!')).toBeVisible();
  // No help line before two goes.
  await expect(card.locator('.ms-help')).toHaveCount(0);
  await card.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  // Computer Village's well is found: Play goes to Ikeja.
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-3');
  const chip = page.locator('.ms-chip');
  await expect(chip).toBeVisible();
  await expect(chip.locator('.ms-n')).toHaveText('0 / 1');
  await expect(chip.locator('.ms-stars .won')).toHaveCount(1);
  for (const size of [{ width: 851, height: 393 }, { width: 320, height: 240 }, { width: 640, height: 200 }]) {
    await page.setViewportSize(size);
    await settle(page);
    await chipClear(page, `${size.width}x${size.height}`);
    await shot(page, `run-chip-${size.width}x${size.height}`);
  }
  await page.setViewportSize({ width: 851, height: 393 });
  await settle(page);
  const wallet0 = (await saved(page)).p.city.kobo as number;
  // Back behind the start to the well, and down it: the star fills at once.
  await keyTo(page, 160);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 8000 }).toBe('room');
  await expect(chip.locator('.ms-stars .won')).toHaveCount(2);
  await expect(chip.locator('.ms-n')).toHaveText('1');
  await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe('Star!');
  await expect(page.locator('.run-said')).toHaveText('Star! 2 of 2.');
  let s = await saved(page);
  expect(s.m.stars['lagos-wells']).toBe(2);
  expect(s.m.found).toEqual({ 'lagos-wells-2': 1, 'lagos-wells-3': 1 });
  expect(s.p.city.kobo, '₦2 into the wallet at once').toBe(wallet0 + 200);
  // Up again, then run right into the street's hazards until out of lives.
  await page.waitForTimeout(800);
  await keyTo(page, 500);
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 8000 }).toBe('run');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => screenNow(page), { timeout: 120_000, intervals: [200] }).toMatch(/gameover|cleared/);
  await page.keyboard.up('ArrowRight');
  const ended = await screenNow(page);
  const coins = (await page.evaluate(() => window.__game!.run.kobo)) * 10;
  const over = page.getByRole('dialog', { name: ended === 'gameover' ? 'Out of lives' : 'Street cleared!' });
  await expect(over.getByText('Both stars!')).toBeVisible();
  s = await saved(page);
  expect(s.m.stars['lagos-wells'], 'the star stays').toBe(2);
  const wallet1 = s.p.city.kobo as number;
  expect(wallet1).toBeGreaterThanOrEqual(wallet0 + 200 + coins);
  // Play again, down the well again: no new star, nothing paid again.
  await waitOutTapLock(page);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect(chip.locator('.ms-n')).toHaveText('0 / 1');
  await keyTo(page, 160);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.__game!.run.phase), { timeout: 8000 }).toBe('room');
  await page.waitForTimeout(300);
  expect((await saved(page)).p.city.kobo, 'never paid twice').toBe(wallet1);
  // Home (Pause): the chip goes; a reload keeps every star and the board says so.
  await page.getByRole('button', { name: 'Pause' }).tap();
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await expect(chip).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  const board = page.getByRole('dialog', { name: 'Missions' });
  await expect(board.getByText('Stars: 2 of 14')).toBeVisible();
  await expect(board.getByRole('button', { name: 'Secret wells. Computer Village, Ikeja. 2 of 2 stars.' })).toBeVisible();
  expect((await saved(page)).p.city.kobo).toBe(wallet1);
  expect(errors).toEqual([]);
});

test('the wells help line shows after two goes without the well, and only then', async ({ page }) => {
  await open(page, 'lagos', { v: 1, tries: { 'lagos-wells-2': 1 } });
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Secret wells\./ }).tap({ force: true });
  await expect(page.getByRole('dialog', { name: 'Secret wells' }).locator('.ms-help')).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem('gidi-missions', JSON.stringify({ v: 1, tries: { 'lagos-wells-2': 2, 'lagos-wells-3': 2 }, found: { 'lagos-wells-3': 1 } })));
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Secret wells\./ }).tap({ force: true });
  // Computer Village's well is still to find; Ikeja's is found, so only one line.
  expect(await page.locator('.ms-help').allTextContents()).toEqual(['Look for a well by the road!']);
});

test('Coin catch on Alausa: the chip counts coins at every size and never covers Pause, Sound or the hero', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, 'lagos', null);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Coin catch\./ }).tap({ force: true });
  await page.getByRole('dialog', { name: 'Coin catch' }).getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
  const n = page.locator('.ms-chip .ms-n');
  await expect(n).toHaveText('0 / 60');
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.__game!.run.kobo), { timeout: 20_000 }).toBeGreaterThan(3);
  await page.keyboard.up('ArrowRight');
  const k = await page.evaluate(() => window.__game!.run.kobo);
  await expect(n).toHaveText(`${k} / 60`);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await settle(page);
    await chipClear(page, `${size.width}x${size.height}`);
  }
  // Without a mission, no chip.
  await page.setViewportSize({ width: 851, height: 393 });
  await page.getByRole('button', { name: 'Pause' }).tap();
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await cityToRoad(page);
  await playStop(page, '0');
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect(page.locator('.ms-chip')).toBeHidden();
});

test('Light it up: the lane run shows the chip in its top row, clear of Pause and Sound', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, 'lagos', null);
  await page.getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Light it up\./ }).tap({ force: true });
  await page.getByRole('dialog', { name: 'Light it up' }).getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? null), { timeout: 15_000 }).not.toBeNull();
  const chip = page.locator('.lane-hud .ms-chip');
  await expect(chip).toBeVisible();
  await expect(chip.locator('.ms-n')).toHaveText('0 / 4');
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await settle(page);
    await shot(page, `lane-${size.width}x${size.height}`);
    const c = (await boxes(page, '.ms-chip'))[0]!;
    for (const b of await boxes(page, '.lane-row button, .lane-chip')) expect(meets(c, b), `${size.width}x${size.height}: chip over ${b.t}`).toBe(false);
    expect(c.x + c.w).toBeLessThanOrEqual(size.width);
  }
});

test('Ogun\'s board: its five missions from the Ogun part, coin stars from Ota', async ({ page }) => {
  await open(page, 'ogun', null);
  await page.locator('.ogun-city').getByRole('button', { name: 'Missions', exact: true }).tap();
  const board = page.getByRole('dialog', { name: 'Missions' });
  await expect(board.getByText('Stars: 0 of 14')).toBeVisible();
  expect(await board.locator('.ms-tile b').allTextContents()).toEqual(['Coin catch', 'Fill the potholes', 'Garri for the mill', 'Stomp the gravel', 'Tech chips']);
  await board.getByRole('button', { name: /^Coin catch\./ }).tap({ force: true });
  const card = page.getByRole('dialog', { name: 'Coin catch' });
  await expect(card.getByText('Catch coins on Ota!')).toBeVisible();
  expect(await card.locator('.ms-goal-star').allTextContents()).toEqual(['60', '100', '135']);
  await shot(page, 'ogun-card-851x393');
});

/** KM1 to KM5: Kano with Kurmi cleared (Kofar Mata open, Dawanau not yet), one Ride the wind star won. */
const KANO_SAVE = {
  v: 2,
  states: {
    lagos: { streets: STREETS, parcel: false, hall: HALL },
    ogun: { arrived: true, streets: STREETS, hall: HALL, parcel: false },
    kano: { arrived: true, streets: { 1: D }, parcel: false },
  },
  city: CITY,
  where: 'kano',
};
/** Set KM_SHOT to a file path to keep a picture of Kano's board at 851 x 393. */
const KM_SHOT = process.env['KM_SHOT'];

test('Kano\'s board: KM1 to KM5 from the Kano part, at 320 x 240 and 851 x 393; a mission plays its street', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.evaluate(
    ({ look, p, m }) => {
      localStorage.clear();
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      localStorage.setItem('gidi-missions', m);
    },
    { look: LOOK, p: JSON.stringify(KANO_SAVE), m: JSON.stringify({ v: 1, stars: { 'kano-wind': 1 } }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  for (const size of [{ width: 851, height: 393 }, { width: 320, height: 240 }]) {
    const at = `${size.width}x${size.height}`;
    await page.setViewportSize(size);
    await settle(page);
    // Missions sits in Kano's bottom row after its Play buttons, every button 44 px and on screen.
    const missions = page.locator('.kano-city .city-bottom').getByRole('button', { name: 'Missions', exact: true });
    await expect(missions).toBeVisible();
    const b = await boxes(page, '.kano-city .city-bottom button');
    for (const q of b) {
      expect(q.h, `${at} ${q.t}`).toBeGreaterThanOrEqual(44);
      expect(q.x >= -0.5 && q.y >= -0.5 && q.x + q.w <= size.width + 0.5 && q.y + q.h <= size.height + 0.5, `${at} ${q.t} on screen`).toBe(true);
      for (const o of b) if (o !== q) expect(meets(q, o), `${at} ${q.t} / ${o.t}`).toBe(false);
    }
    await missions.tap();
    const board = page.getByRole('dialog', { name: 'Missions' });
    await expect(board.getByText('Stars: 1 of 14')).toBeVisible();
    const tiles = board.locator('.ms-tile');
    expect(await tiles.evaluateAll((t) => t.map((e) => e.getAttribute('aria-label')))).toEqual([
      'Coin catch. Kurmi. 0 of 3 stars.',
      'Ride the wind. Kurmi. 1 of 2 stars.',
      'Bounce high. Kofar Mata. 0 of 3 stars.',
      'Puff the dust. Locked. Open Dawanau first.',
      'Power for the market. Harmattan Road. 0 of 3 stars.',
    ]);
    await expect(tiles.first()).toHaveClass(/next/);
    await expect(tiles.nth(3)).toHaveClass(/locked/);
    // Kano's own pictures (the wind sign, the cloth) are drawn: their canvases are not blank.
    const inked = await board.locator('canvas.ms-pic').evaluateAll((cs) =>
      (cs as HTMLCanvasElement[]).map((c) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 3 && v > 0).length),
    );
    expect(inked.length).toBe(3); // the coin, the wind sign, the cloth (the whirl's tile is locked; Power is a picture in words)
    for (const n of inked) expect(n).toBeGreaterThan(20);
    if (size.width === 851 && KM_SHOT) await page.screenshot({ path: KM_SHOT });
    await shot(page, `kano-board-${at}`);
    const keep = await boxes(page, '.ms-card h2, .ms-foot button');
    for (const q of keep) expect(q.y >= -0.5 && q.y + q.h <= size.height + 0.5, `${at} ${q.t} shows`).toBe(true);
    for (let i = 0; i < 5; i++) {
      await tiles.nth(i).evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
      const tile = (await boxes(page, '.ms-tile'))[i]!;
      const list = (await boxes(page, '.ms-tiles'))[0]!;
      expect(tile.h, `${at} tile ${i + 1}`).toBeGreaterThanOrEqual(55.9);
      expect(tile.y >= list.y - 0.5 && tile.y + tile.h <= list.y + list.h + 0.5, `${at}: tile ${i + 1} can be reached`).toBe(true);
    }
    expect(await smallest(page, '.ms-card'), at).toBeGreaterThanOrEqual(15);
    // A card: Ride the wind's line and its two stars (1 won).
    await board.getByRole('button', { name: /^Ride the wind\./ }).tap({ force: true });
    const card = page.getByRole('dialog', { name: 'Ride the wind' });
    await expect(card.getByText('Jump far with the wind!')).toBeVisible();
    expect(await card.locator('.ms-goal-star').allTextContents()).toEqual(['1', '2']);
    const fit = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('.ms-card')!;
      return { sh: c.scrollHeight, ch: c.clientHeight };
    });
    expect(fit.sh, `${at}: the card shows with no scroll`).toBeLessThanOrEqual(fit.ch + 1);
    for (const q of await boxes(page, '.ms-card button')) expect(q.h, `${at} ${q.t}`).toBeGreaterThanOrEqual(44);
    await card.getByRole('button', { name: 'Back' }).tap();
    await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: 'Back' }).tap();
    await expect(page.locator('.ms-card')).toHaveCount(0);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  }
  // Bounce high plays Kofar Mata, with its chip.
  await page.setViewportSize({ width: 851, height: 393 });
  await settle(page);
  await page.locator('.kano-city .city-bottom').getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Bounce high\./ }).tap({ force: true });
  await page.getByRole('dialog', { name: 'Bounce high' }).getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-2');
  await expect(page.locator('.ms-chip .ms-n')).toHaveText('0 / 3');
  expect(errors).toEqual([]);
});
