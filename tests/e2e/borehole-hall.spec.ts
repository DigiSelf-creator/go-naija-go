/**
 * K5b (docs/kano.md 5.2 to 5.5 and 8): Borehole Hall on the phone profile, played by touch. A
 * player who has cleared Dawanau (with the garri parcel saved) opens the game on Kano's home,
 * taps the big "Go to Borehole Hall" and plays with two thumbs on the phone buttons, by the plan
 * in rusty-brain.ts (the unit bot plays the same plan on the rules): walk under the STUCK valve,
 * press and hold so the cloth bounces the hero up to bump it, steer to the next valve in the air,
 * come down on the whirls. Rusty never lets a whirl go while the hero is up after a cloth bounce.
 * Then the kind finish, the Win screen ("Kano is switched on!", "You got ₦15.", big Take it home,
 * small Play again), the save under states.kano.hall (the parcel used up, the one wallet), and
 * Kano's home after it with "You brought ₦15 home." Only the Kano part is fetched (KN-R10).
 * Also: Kano's home at 320 x 240 with the hall open.
 */
import { expect, test, type Page } from '@playwright/test';
import { touchPad } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { decideRusty, newRustyMind } from './rusty-brain';

const LOOK = '{"skin":4,"hair":2,"outfit":1,"body":0,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const KANO_STREETS = { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 }, 3: { done: true, best: 1300 } };
const save = (parcel: boolean) => ({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano: { arrived: true, streets: KANO_STREETS, parcel } }, city: CITY, where: 'kano' });
/** Where to save the in-play picture (the K5b report's screenshot), if set. */
const SHOT = process.env['K5B_SHOT'];

type Saved = { states?: { lagos?: unknown; kano?: { streets?: unknown; hall?: unknown; parcel?: unknown } }; city?: { kobo?: number } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
const partOf = (url: string): string | null => /\/worlds\/([^/]+)\//.exec(new URL(url).pathname)?.[1] ?? null;

interface Arena {
  hits: number;
  stuck: number;
  valves: number[];
  defeated: boolean;
  finishT: number;
  whirls: { x: number; vx: number }[];
  heldBreaks: number;
  held: number;
  whirlsOut: number;
  gust: boolean;
  holding: boolean;
  lives: number;
  time: number;
  runPhase: string;
}
const look = (page: Page) =>
  page.evaluate(() => {
    const g = window.__game!;
    return { h: g.hero, a: g.arena as unknown as Arena | null, screen: g.screen, paused: g.paused, toast: g.toast };
  });

async function openKano(page: Page, parcel: boolean): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save(parcel)) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

/** One try by touch, by the plan, until the third valve or the try is over. */
async function playRusty(page: Page, shot: boolean): Promise<{ won: boolean; lost: number; log: string[]; toasts: Set<string>; heldBreaks: number; held: number; shotTaken: boolean }> {
  const pad = await touchPad(page);
  const m = newRustyMind();
  const log: string[] = [];
  const toasts = new Set<string>();
  let s = await look(page);
  const lives0 = s.a?.lives ?? 0;
  let late = 0.06;
  let lastWhy = '';
  let heldBreaks = 0;
  let held = 0;
  let shotTaken = false;
  for (let i = 0; i < 30000; i++) {
    const t0 = s.a?.time ?? 0;
    s = await look(page);
    const a = s.a;
    if (s.toast) toasts.add(s.toast);
    if (!a || a.runPhase !== 'arena' || a.defeated) break;
    heldBreaks = Math.max(heldBreaks, a.heldBreaks);
    held = Math.max(held, a.held);
    if (a.time > t0) late = Math.min(0.2, Math.max(0.03, late * 0.8 + (a.time - t0) * 0.2 * 1.5));
    if (s.paused || s.screen !== 'play') continue;
    // The report's picture: the STUCK valve, a whirl rolling, the hero up on the cloth's bounce.
    if (shot && !shotTaken && SHOT && a.whirls.length > 0 && s.h.y < 200) {
      await page.screenshot({ path: SHOT });
      shotTaken = true;
    }
    // A first-timer watches him first: waits by the door until his first whirl is out.
    if (a.whirlsOut === 0 && a.hits === 0) {
      await pad.move(0);
      continue;
    }
    const d = decideRusty(m, { hero: s.h, stuck: a.stuck, hits: a.hits, valves: a.valves, defeated: a.defeated, whirls: a.whirls, time: a.time }, late);
    if (d.why !== lastWhy) log.push(`${a.time.toFixed(2)} s x ${s.h.x.toFixed(0)} y ${s.h.y.toFixed(0)} hits ${a.hits} whirls ${a.whirls.map((z) => Math.round(z.x)).join(',')}: ${d.why}`);
    lastWhy = d.why;
    await pad.move(d.move);
    if (d.release) await pad.jumpUp();
    if (d.press) await pad.jumpDown();
  }
  await pad.done();
  return { won: s.a?.defeated === true, lost: lives0 - (s.a?.lives ?? 0), log, toasts, heldBreaks, held, shotTaken };
}

test('Borehole Hall from Kano\'s home by touch: three valves, the kind finish, the Win screen, the save, home with the money', async ({ page, context }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const asked = new Set<string>();
  context.on('request', (r) => {
    const p = partOf(r.url());
    if (p) asked.add(p);
  });
  await openKano(page, true);
  // Dawanau cleared: the hall's big button over the three streets.
  const home = page.locator('.kano-city');
  const go = home.getByRole('button', { name: 'Go to Borehole Hall' });
  await expect(go).toBeVisible();
  await expect(go).toHaveClass(/\bgo\b/);
  for (const b of ['Play Kurmi', 'Play Kofar Mata', 'Play Dawanau']) await expect(home.getByRole('button', { name: b })).toBeVisible();
  await go.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('kano-hall');
  expect(await page.evaluate(() => window.__game!.skin)).toBe(true);
  expect(await page.evaluate(() => (window.__game!.arena as { kind?: string } | null)?.kind)).toBe('rusty-borehole');
  // The saved groundnut garri parcel: the shield is on at the start.
  await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe('Your garri parcel: the shield is on!');
  await expect.poll(() => page.evaluate(() => window.__game!.music.place)).toBe('hall');

  let tries = 0;
  let won = false;
  const all: string[] = [];
  const toasts = new Set<string>();
  let heldBreaks = 0;
  let held = 0;
  let shot = false;
  while (tries < 3 && !won) {
    tries++;
    const r = await playRusty(page, !shot);
    shot ||= r.shotTaken;
    for (const t of r.toasts) toasts.add(t);
    heldBreaks = Math.max(heldBreaks, r.heldBreaks);
    held = Math.max(held, r.held);
    all.push(`try ${tries}: won ${r.won}, lives lost ${r.lost}`, ...r.log.slice(-14));
    won = r.won;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await expect(over.getByText('Rusty Borehole is still dry. Try again!')).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
      await expect.poll(() => screenNow(page)).toBe('play');
    }
  }
  console.log(`Borehole Hall by touch: won ${won} in ${tries} tries, whirls held back ${held}\n${all.join('\n')}\ntoasts: ${[...toasts].join(' | ')}`);
  expect(won).toBe(true);
  expect(tries).toBeLessThanOrEqual(3);
  // He holds his breath: no whirl ever left him while the hero was up after a cloth bounce.
  expect(heldBreaks).toBe(0);
  for (const t of ['Rusty Borehole has gone dry!', 'Glug! 2 more valves.', 'Glug! 1 more valve.']) expect(toasts).toContain(t);

  // Saved from the third valve, before the finish ends.
  expect((await saved(page)).states?.kano?.hall).toEqual({ done: true, best: 0 });
  const seen = new Set<string>();
  for (let i = 0; i < 600 && (await screenNow(page)) !== 'win'; i++) {
    const t = await page.evaluate(() => window.__game!.toast);
    if (t) seen.add(t);
    await page.waitForTimeout(20);
  }
  expect(seen).toContain('The water is flowing! Kano is switched on!');
  const win = page.getByRole('dialog', { name: 'Kano is switched on!' });
  await expect(win).toBeVisible();
  await expect(win.getByText('The water is flowing. The markets of Kano are busy again.')).toBeVisible();
  await expect(win.getByText('You got ₦15.')).toBeVisible();
  const take = win.getByRole('button', { name: 'Take it home', exact: true });
  await expect(take).toHaveClass(/\bgo\b/);
  await expect(win.getByRole('button', { name: 'Play again', exact: true })).toBeVisible();
  // K6b: the Win screen gains Kano's Challenge road.
  await expect(win.getByRole('button', { name: 'Challenge road', exact: true })).toBeVisible();

  const s = await saved(page);
  expect(s.states?.kano?.hall).toEqual({ done: true, best: 0 });
  expect(s.states?.kano?.streets).toEqual(KANO_STREETS);
  expect(s.states?.kano?.parcel).toBe(false);
  expect(s.states?.lagos).toEqual(DONE);
  expect(s.city?.kobo).toBe(1000 + 1500);
  expect(await page.evaluate(() => window.__game!.states.kano.hall.done)).toBe(true);

  await waitOutTapLock(page);
  await take.tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  // K6b: home is Kano's city, "Mission complete!" over the money, then the water's line once.
  await expect(page.locator('.kano-city .city-banner')).toContainText('You brought ₦15 home.');
  await expect(page.locator('.kano-city .city-banner')).toContainText('Mission complete!');
  await expect(page.locator('.kano-city .city-banner')).toContainText('The water is flowing. Everyone can fill up.', { timeout: 10_000 });
  await expect(page.locator('.kano-city .city-pin[data-spot="dryTaps"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__game!.skin)).toBe(false);
  expect([...asked]).toEqual(['kano']);
  expect(errors).toEqual([]);
});

test('Kano\'s city at 320 x 240 with Borehole Hall open: every button on screen, 44 px tall, 8 px apart', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openKano(page, false);
  // K6b: the city's rows (the pins and boards on the map may sit partly off it, with edge arrows).
  const boxes = await page.locator('.kano-city .city-top button, .kano-city .city-bottom button').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent ?? '', ...JSON.parse(JSON.stringify(e.getBoundingClientRect())) as DOMRect })),
  );
  if (process.env['K5B_HOME_SHOT']) await page.screenshot({ path: process.env['K5B_HOME_SHOT'] });
  expect(boxes.map((b) => b.name)).toEqual(expect.arrayContaining(['Go to Borehole Hall', 'Play Kurmi', 'Play Kofar Mata', 'Play Dawanau']));
  for (const b of boxes) {
    expect(b.left, b.name).toBeGreaterThanOrEqual(0);
    expect(b.right, b.name).toBeLessThanOrEqual(320);
    expect(b.top, b.name).toBeGreaterThanOrEqual(0);
    expect(b.bottom, b.name).toBeLessThanOrEqual(240);
    expect(b.height, b.name).toBeGreaterThanOrEqual(44);
  }
  // The Play buttons 8 px apart (kano.md 8; qa K4c), and each name reads whole.
  const plays = boxes.filter((b) => /^(Play |Go to )/.test(b.name));
  expect(plays).toHaveLength(4);
  for (const [i, a] of plays.entries())
    for (const b of plays.slice(i + 1)) expect(Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom), `${a.name} and ${b.name}`).toBeGreaterThanOrEqual(8);
  for (const n of ['Play Kurmi', 'Play Kofar Mata', 'Play Dawanau', 'Go to Borehole Hall']) {
    const over = await page.locator('.kano-city').getByRole('button', { name: n }).evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    expect(over, n).toBe(false);
  }
});
