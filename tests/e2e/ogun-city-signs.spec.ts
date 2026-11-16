/**
 * O6b2 (OG-R43 a and b; ogun.md part 7; city.md 5W and W15): Ogun's city on small screens and with
 * people. With five boards at once (OG-R36) at 568 x 320 and 851 x 393, far and near: every
 * board, bubble and pin is either whole on the map, clear of the top row, the bottom buttons and
 * each other (a board may stand on its short stick), or off the map with an edge arrow that shows
 * the way (its tap square on the map, clear of every button and sign). At 320 x 240 the rows leave
 * almost no map: a sign never covers a button there (one with no room at all waits, hidden, until
 * the camera moves), and every arrow is on the map and clear of the buttons. An arrow's tap does
 * what tapping the thing does. People walk about once the people's kit is in, and
 * the city draws nothing while it stands still. No page errors.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const D = { done: true, best: 100 };
const LAGOS = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: D };
const CITY = { kobo: 400, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, built: [], trays: {}, boom: 4, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
/** Ogun's city with the adire market built and a full tray, and no other fix: five boards, two pins, a bubble. */
const OGUN_CITY = { fixed: [], fixes: 0, built: ['adire'], trays: { adire: 120 }, boom: 4, hints: ['walk', 'taxOgun', 'pin', 'gate'] };
const SAVE = { v: 2, states: { lagos: LAGOS, ogun: { arrived: true, streets: { 1: D, 2: D, 3: D }, hall: D, city: OGUN_CITY } }, city: CITY, where: 'ogun' };

type Box = { x: number; y: number; w: number; h: number };
type Shot = { boards: Record<string, Box>; bubbles: Record<string, Box>; pins: Record<string, Box>; arrows: { icon: string; x: number; y: number; tap: number; for: string }[]; folk: number; roomless: string[]; short: string[] };
const shot = (page: Page) => page.evaluate(() => (window.__game!.ogunCity as unknown as { test: Shot }).test);
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const NAMES: Record<string, string> = { potholes: 'New road', adire: 'Adire market', dryTaps: 'Water pump', lightsOut: 'Lamps', slowInternet: 'Mast', mill: 'Garri mill', kola: 'Kola market' };
const PIN_NAMES: Record<string, string> = { potholes: 'Potholes', dryTaps: 'Dry taps', lightsOut: 'Lights out', slowInternet: 'Slow internet', badRoad: 'Bad road' };

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      localStorage.setItem('gidi-busRide', 'false');
    },
    { look: LOOK, p: JSON.stringify(SAVE) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 20_000 }).toBe('ogun');
  await expect(page.locator('.ogun-city')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

/** Every sign whole and clear, or off with an arrow; arrows on the map, clear of buttons and signs. */
async function check(page: Page, at: string, found: string[], tiny = false): Promise<void> {
  await settle(page);
  const s = await shot(page);
  const view = await page.locator('.ogun-city').boundingBox();
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.ogun-city .city-top button, .ogun-city .city-bottom button, .ogun-city .city-head, .ogun-city .city-chips')]
      .filter((b) => b.getClientRects().length > 0)
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { t: (b.textContent ?? '').trim() || b.className, x: r.x, y: r.y, w: r.width, h: r.height };
      }),
  );
  const vw = view!.width;
  const vh = view!.height;
  const bad = (m: string) => found.push(`${at}: ${m}`);
  const onMap = (b: Box): boolean => b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= vw + 0.5 && b.y + b.h <= vh + 0.5;
  const centreOff = (b: Box): boolean => b.x + b.w / 2 < 0 || b.y + b.h / 2 < 0 || b.x + b.w / 2 > vw || b.y + b.h / 2 > vh;
  const signs: [string, Box][] = [...Object.entries(s.boards).map(([k, b]) => [`board ${k}`, b] as [string, Box]), ...Object.entries(s.bubbles).map(([k, b]) => [`bubble ${k}`, b] as [string, Box])];
  for (const [name, b] of signs) {
    const label = name.startsWith('board') ? NAMES[name.slice(6)]! : 'the adire market';
    if (s.roomless.includes(name.split(' ')[1]!)) {
      if (!tiny) bad(`${name} found no room`);
      continue;
    }
    if (centreOff(b)) {
      // At 320 x 240 the rows leave room for only a few arrows: those that fit are checked below.
      if (s.arrows.some((a) => a.for === label)) continue;
      if (tiny) console.log(`${at}: ${name} is off the map, no room for its arrow`);
      else bad(`${name} is off the map with no arrow`);
      continue;
    }
    if (!onMap(b)) bad(`${name} is cut by the map's edge`);
    for (const t of buttons) if (overlaps(b, t)) bad(`${name} covers "${t.t}"`);
    if (tiny) continue;
    for (const [other, o] of signs) if (other !== name && !centreOff(o) && overlaps(b, o)) bad(`${name} overlaps ${other}`);
    for (const [pin, p] of Object.entries(s.pins)) if (!centreOff(p) && overlaps(b, p)) bad(`${name} covers the ${pin} pin`);
  }
  if (!tiny) for (const [pin, p] of Object.entries(s.pins)) if (centreOff(p) && !s.arrows.some((a) => a.for === PIN_NAMES[pin])) bad(`the ${pin} pin is off the map with no arrow`);
  for (const a of s.arrows) {
    const sq = { x: a.x - a.tap / 2, y: a.y - a.tap / 2, w: a.tap, h: a.tap };
    if (a.tap < (tiny ? 36 : 44)) bad(`arrow for ${a.for} is ${a.tap} px`);
    if (!onMap(sq)) bad(`arrow for ${a.for} is off the map`);
    for (const t of buttons) if (overlaps(sq, t)) bad(`arrow for ${a.for} covers "${t.t}"`);
    for (const [name, b] of signs) if (!centreOff(b) && overlaps(sq, b)) bad(`arrow for ${a.for} covers ${name}`);
    for (const o of s.arrows) if (o !== a && overlaps(sq, { x: o.x - o.tap / 2, y: o.y - o.tap / 2, w: o.tap, h: o.tap })) bad(`arrow for ${a.for} overlaps the one for ${o.for}`);
  }
}

test('OG-R43 b: Ogun\'s boards, bubble and pins stay whole and clear on small screens, or get an edge arrow that works', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await open(page);
  const found: string[] = [];
  let arrows = 0;
  for (const size of [
    { width: 320, height: 240 },
    { width: 568, height: 320 },
    { width: 851, height: 393 },
  ]) {
    await page.setViewportSize(size);
    for (const zoom of ['far', 'near'] as const) {
      await page.getByRole('button', { name: zoom === 'near' ? 'Zoom in' : 'Zoom out' }).tap();
      await page.waitForTimeout(700);
      await check(page, `${size.width}x${size.height} ${zoom}`, found, size.width === 320);
      const s = await shot(page);
      arrows += s.arrows.length;
      if (s.short.length || s.roomless.length) console.log(`${size.width}x${size.height} ${zoom}: short ${s.short.join(',') || '-'}, no room ${s.roomless.join(',') || '-'}`);
    }
  }
  if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/ogun-city-arrows.png` });
  console.log(`arrows seen: ${arrows}; faults:\n  ${found.join('\n  ') || 'none'}`);
  test.info().annotations.push({ type: 'sign faults', description: found.join(' | ') || 'none' });
  expect(found).toEqual([]);
  // Near on a small screen something is always off the map: its arrow works like the thing.
  expect(arrows).toBeGreaterThan(0);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await page.waitForTimeout(700);
  const s = await shot(page);
  const arrow = s.arrows.find((a) => Object.values(NAMES).includes(a.for)) ?? s.arrows[0]!;
  const box = (await page.locator('.ogun-city').boundingBox())!;
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.touchscreen.tap(box.x + arrow.x, box.y + arrow.y);
  if (Object.values(PIN_NAMES).includes(arrow.for)) await expect(page.getByRole('dialog', { name: arrow.for })).toBeVisible();
  else await expect.poll(() => page.evaluate(() => (window.__game!.ogunCity as unknown as { hero: { moving: boolean } }).hero.moving)).toBe(true);
  expect(errors).toEqual([]);
});

test('OG-R43 a: people walk about Ogun\'s city once the people\'s kit is in; still, nothing is drawn', async ({ page }) => {
  const errors = await open(page);
  // 3, plus 1 for the adire market, plus 2 for the one Booming step: 6 walkers.
  await expect.poll(async () => (await shot(page)).folk, { timeout: 15_000 }).toBe(6);
  // Walk a little so they move and the sheet is drawn, then stand still: no draws at all (the tray is full).
  const map = (await page.locator('.ogun-city .city-map').boundingBox())!;
  await page.touchscreen.tap(map.x + map.width * 0.6, map.y + map.height * 0.6);
  await expect.poll(() => page.evaluate(() => (window.__game!.ogunCity as unknown as { hero: { moving: boolean } }).hero.moving), { timeout: 10_000 }).toBe(false);
  await page.waitForTimeout(1200);
  const d0 = await page.evaluate(() => window.__game!.ogunCity!.draws);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__game!.ogunCity!.draws)).toBe(d0);
  if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/ogun-city-people.png` });
  expect(errors).toEqual([]);
});
