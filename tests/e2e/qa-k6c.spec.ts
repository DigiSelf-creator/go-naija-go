/**
 * K6c (docs/kano.md 6.2 to 6.5, part 10): qa checks of Kano's city, its challenge road, Harmattan
 * Road and the KM1 to KM5 missions, on top of kano-city.spec.ts, missions.spec.ts and
 * borehole-hall.spec.ts:
 * - the challenge road opens stop by stop (Kurmi and Harmattan Road always; Kofar Mata after
 *   Kurmi; Dawanau after Kofar Mata; Borehole Hall after Dawanau; The way on is coming soon);
 * - KM5 Power for the market from the board: the chip counts Power bulbs on Harmattan Road, a
 *   star pays ₦2 at once, the Blackout ending the run keeps it, Play again pays nothing twice,
 *   Harmattan Road saves under states.kano.lane (Lagos's lane save as it was), and the Kano
 *   board shows the star after a reload;
 * - at 320 x 240 and 640 x 200 a child can see and reach every pin and board on Kano's map.
 * With K6C_SHOTS=<folder> it saves pictures.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';

const SHOTS = process.env['K6C_SHOTS'];
const LOOK = '{"skin":2,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const DONE = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 0 } };
const CITY = { kobo: 4000, power: 9, tech: 7, fixed: ['potholes'], fixes: 1, paid: {}, built: [], trays: {}, boom: 4, boomCollect: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const OGUN_CITY = { fixed: ['dryTaps'], fixes: 1, paid: {}, built: [], trays: {}, boom: 4, boomCollect: 0, boomSeen: 0, hints: ['walk', 'pin', 'gate'] };
const FRESH = { fixed: [], fixes: 0, paid: {}, built: [], trays: {}, boom: 0, boomCollect: 0, boomSeen: 0, hints: ['pin'] };
const LAGOS_LANE = { best: 700, goals: 1, runs: 2, hints: [] };
const K = (n: number) => ({ done: true, best: 900 + n * 100 });
const save = (kano: object) => ({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true, city: OGUN_CITY }, kano: { arrived: true, parcel: false, ...kano } }, city: CITY, lane: LAGOS_LANE, where: 'kano' });

type Obj = Record<string, unknown>;
const saved = (page: Page) => page.evaluate(() => ({ p: JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Obj & { city: Obj; states: Record<string, Obj> }, m: JSON.parse(localStorage.getItem('gidi-missions') ?? 'null') as { stars: Record<string, number> } | null }));

async function open(page: Page, s: object, size = { width: 851, height: 393 }): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(size);
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.clear();
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(s) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  return errors;
}

const stops = (page: Page) => page.locator('.road-stop').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).dataset['where']}: ${e.getAttribute('aria-label')}`));

test('Kano\'s challenge road opens stop by stop', async ({ page }) => {
  const steps: { streets: object; hall?: object; want: Record<string, RegExp> }[] = [
    { streets: {}, want: { kurmi: /Kurmi\. (Next\. )?Ready to play\./, lane: /Harmattan Road\. Ready to play\./, kofarMata: /Locked\. Finish Kurmi/, dawanau: /Locked\. Finish Kofar Mata/, hall: /Locked\. Finish Dawanau/ } },
    { streets: { 1: K(1) }, want: { kurmi: /Done/, kofarMata: /Kofar Mata\. (Next\. )?Ready to play\./, dawanau: /Locked/, hall: /Locked/ } },
    { streets: { 1: K(1), 2: K(2) }, want: { dawanau: /Dawanau\. (Next\. )?Ready to play\./, hall: /Locked/ } },
    { streets: { 1: K(1), 2: K(2), 3: K(3) }, want: { dawanau: /Done/, hall: /Borehole Hall\. (Next\. )?Ready to play\./ } },
    { streets: { 1: K(1), 2: K(2), 3: K(3) }, hall: { done: true, best: 0 }, want: { hall: /Borehole Hall\. Done\./, wayOn: /The way on\. More of Nigeria\. Coming soon\./, toOgun: /To Ogun/ } },
  ];
  for (const st of steps) {
    const errors = await open(page, save({ streets: st.streets, ...(st.hall ? { hall: st.hall } : {}), city: FRESH }));
    await page.locator('.kano-city').getByRole('button', { name: 'Challenge road' }).tap();
    await expect.poll(() => screenNow(page)).toBe('road');
    const got = await stops(page);
    expect(got.map((g) => g.split(':')[0])).toEqual(['toOgun', 'kurmi', 'lane', 'kofarMata', 'dawanau', 'hall', 'wayOn']);
    for (const [id, re] of Object.entries(st.want)) expect(got.find((g) => g.startsWith(`${id}:`)), `${JSON.stringify(st.streets)} ${id}`).toMatch(re);
    expect(errors).toEqual([]);
  }
});

/** Steers to each Power bulb ahead (keeping the Blackout back) until four more are picked up. */
async function fourBulbs(page: Page): Promise<void> {
  const p0 = await page.evaluate(() => window.__lane!.haul.power);
  const end = Date.now() + 90_000;
  while (Date.now() < end) {
    const s = await page.evaluate(() => {
      const l = window.__lane!;
      l.setGap(40);
      const next = l.things.filter((t) => t.pickup && t.kind === 'bulb' && t.d > l.dist + 1).sort((a, b) => a.d - b.d)[0];
      return { power: l.haul.power, lane: l.lane, want: next?.lane ?? null };
    });
    if (s.power - p0 >= 4) return;
    if (s.want !== null && s.want !== s.lane) await page.keyboard.press(s.want > s.lane ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForTimeout(120);
  }
  throw new Error('four bulbs not picked up in 90 s');
}

test('KM5 Power for the market: bulbs count, ₦2 a star at once, the Blackout keeps it, never paid twice, Harmattan Road saves', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await open(page, save({ streets: { 1: K(1), 2: K(2), 3: K(3) }, hall: { done: true, best: 0 }, city: FRESH }));
  await page.locator('.kano-city').getByRole('button', { name: 'Missions', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: /^Power for the market\./ }).tap({ force: true });
  const card = page.getByRole('dialog', { name: 'Power for the market' });
  await expect(card.getByText('Catch Power bulbs!')).toBeVisible();
  expect(await card.locator('.ms-goal-star').allTextContents()).toEqual(['4', '8', '12']);
  await card.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? null), { timeout: 15_000 }).toBe('play');
  expect(await page.evaluate(() => window.__lane!.level)).toBe('kano-lane');
  const chip = page.locator('.lane-hud .ms-chip');
  await expect(chip.locator('.ms-n')).toHaveText('0 / 4');
  const wallet0 = (await saved(page)).p.city['kobo'] as number;
  await fourBulbs(page);
  await expect.poll(async () => (await saved(page)).m?.stars['kano-power'] ?? 0).toBe(1);
  // The lane run banks its coins as it goes; on top of them, ₦2 for the star.
  const coins1 = await page.evaluate(() => window.__lane!.haul.kobo);
  expect((await saved(page)).p.city['kobo'], '₦2 at once').toBe(wallet0 + coins1 + 200);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/k6c-km5.png` });
  // The Blackout catches the hero: the run is lost, the star stays.
  await page.evaluate(() => window.__lane!.setGap(0));
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? null), { timeout: 20_000 }).not.toBe('play');
  const end = page.getByRole('dialog', { name: 'The Blackout caught up.' });
  await expect(end).toBeVisible({ timeout: 15_000 });
  await expect(end.getByText('You got a star!')).toBeVisible();
  let s = await saved(page);
  expect(s.m?.stars['kano-power'], 'the star stays after a lost run').toBe(1);
  const wallet1 = s.p.city['kobo'] as number;
  expect(wallet1, 'nothing more but the coins').toBeGreaterThanOrEqual(wallet0 + coins1 + 200);
  expect(s.p.states['kano']!['lane'], 'Harmattan Road saves under Kano').toBeTruthy();
  expect(s.p['lane'], "Lagos's lane run save as it was").toEqual(LAGOS_LANE);
  // Run again: the same four bulbs pay nothing again.
  await waitOutTapLock(page);
  await end.getByRole('button', { name: 'Run again' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? null), { timeout: 15_000 }).toBe('play');
  await expect(chip.locator('.ms-n')).toHaveText('0 / 8');
  await fourBulbs(page);
  await page.waitForTimeout(500);
  s = await saved(page);
  expect(s.m?.stars['kano-power']).toBe(1);
  // Home, reload: the board keeps the star.
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  const coins2 = await page.evaluate(() => window.__lane!.haul.kobo);
  expect((await saved(page)).p.city['kobo'] as number, 'never paid twice: only the coins').toBe(wallet1 + coins2);
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Back to Kano' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.kano-city').getByRole('button', { name: 'Missions', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: 'Power for the market. Harmattan Road. 1 of 3 stars.' })).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * Whether each pin and board on Kano's map can be seen and tapped: its middle is not under a
 * button row, here or after the hero walks to it (the camera follows), or its edge arrow can be.
 */
const reachable = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    for (const e of document.querySelectorAll<HTMLElement>('.kano-city .city-pin, .kano-city .city-board')) {
      const r = e.getBoundingClientRect();
      if (!r.width) continue;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (hit === e || e.contains(hit)) continue;
      const name = e.dataset['spot'] ?? e.dataset['build'] ?? '?';
      out.push(`${e.classList.contains('city-pin') ? 'pin' : 'board'} ${name} under "${(hit?.textContent ?? '').trim().slice(0, 24)}"`);
    }
    return out;
  });

for (const size of [{ width: 320, height: 240 }, { width: 640, height: 200 }]) {
  test(`at ${size.width} x ${size.height} a child can see and reach Kano's pins and boards`, async ({ page }) => {
    await open(page, save({ streets: { 1: K(1), 2: K(2), 3: K(3) }, hall: { done: true, best: 0 }, city: { ...FRESH, built: ['leather'], trays: { leather: 120 }, boom: 4, hints: ['pin', 'walk'] } }), size);
    await page.waitForTimeout(6000);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/k6c-${size.width}.png` });
    // The map must keep a clear strip between the top rows and the bottom rows.
    const strip = await page.evaluate(() => {
      const top = Math.max(...[...document.querySelectorAll<HTMLElement>('.kano-city .city-top > *')].map((e) => e.getBoundingClientRect().bottom));
      const low = Math.min(...[...document.querySelectorAll<HTMLElement>('.kano-city .city-bottom button')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().top));
      return low - top;
    });
    expect(strip, 'clear map between the rows (px)').toBeGreaterThanOrEqual(60);
    expect(await reachable(page)).toEqual([]);
  });
}

/**
 * K7 gate: on Kano's map no board lies on another board or on the top row (heading, chips, top
 * buttons; boards stand below that whole row), and each pin is shown with its word and round
 * clear of every button row and its middle tappable, or has an edge arrow that can be tapped.
 */
const layoutFaults = (page: Page) =>
  page.evaluate(() => {
    const WORD: Record<string, string> = { sandyRoad: 'Sandy road', lightsOut: 'Lights out', slowInternet: 'Slow internet', dryTaps: 'Dry taps' };
    const out: string[] = [];
    const city = document.querySelector<HTMLElement>('.kano-city')!;
    const shown = (e: Element): boolean => !(e as HTMLElement).hidden && (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().width > 0;
    const hit = (a: DOMRect, b: DOMRect): boolean => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    const tops = [...city.querySelectorAll('.city-head, .city-chip, .city-top button')].filter(shown).map((e) => ({ name: (e.textContent ?? '').trim().slice(0, 14), r: e.getBoundingClientRect() }));
    const rowBottom = Math.max(...tops.map((t) => t.r.bottom));
    const rows = [...tops, ...[...city.querySelectorAll('.city-bottom button')].filter(shown).map((e) => ({ name: (e.textContent ?? '').trim().slice(0, 14), r: e.getBoundingClientRect() }))];
    const boards = [...city.querySelectorAll<HTMLElement>('.city-board')].filter(shown).map((e) => ({ name: e.dataset['build']!, r: e.getBoundingClientRect() }));
    const sw = innerWidth;
    const sh = innerHeight;
    for (const [i, b] of boards.entries()) {
      if (b.r.left >= sw || b.r.right <= 0 || b.r.top >= sh || b.r.bottom <= 0) continue;
      for (const o of boards.slice(i + 1)) if (hit(b.r, o.r)) out.push(`board ${b.name} on board ${o.name}`);
      for (const t of tops) if (hit(b.r, t.r)) out.push(`board ${b.name} on "${t.name}"`);
      if (b.r.top < rowBottom - 0.5) out.push(`board ${b.name} in the top row (top ${Math.round(b.r.top)} < ${Math.round(rowBottom)})`);
    }
    // Its middle is on the screen and not under a button row or a board (a pin's may be under a pin beside it).
    const tappable = (e: HTMLElement): boolean => {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > sw || y > sh) return false;
      const at = document.elementFromPoint(x, y);
      return at === e || e.contains(at) || (e.classList.contains('city-pin') && !!at?.closest('.kano-city .city-pin'));
    };
    for (const pin of city.querySelectorAll<HTMLElement>('.city-pin')) {
      const spot = pin.dataset['spot']!;
      const arrow = [...city.querySelectorAll<HTMLElement>(`.city-arrow[data-for="${WORD[spot]}"]`)].find((a) => shown(a) && tappable(a));
      if (shown(pin)) {
        // The picture (the button is the tap area only): the word tag is 16 px tall, 14 px up
        // from the bottom; the round's middle 50 px up.
        const r = pin.querySelector('canvas')!.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const word = new DOMRect(r.left + 4, r.bottom - 30, r.width - 8, 16);
        const under = rows.find((t) => hit(word, t.r) || (cx > t.r.left && cx < t.r.right && r.bottom - 50 > t.r.top && r.bottom - 50 < t.r.bottom));
        if (under) out.push(`pin ${spot} shown under "${under.name}"`);
        // A tap on its word or its round opens this pin, never a neighbour.
        let own = 0;
        for (const [part, y] of [['word', r.bottom - 22], ['round', r.bottom - 50]] as const) {
          const at = document.elementFromPoint(cx, y)?.closest<HTMLElement>('.city-pin');
          if (at === pin) own++;
          else if (at) out.push(`a tap on pin ${spot}'s ${part} opens pin ${at.dataset['spot']}`);
        }
        if (!own && !arrow) out.push(`pin ${spot} cannot be tapped and has no arrow`);
      } else if (!arrow) out.push(`pin ${spot} hidden with no edge arrow`);
    }
    // Pin tap areas never overlap.
    const taps = [...city.querySelectorAll<HTMLElement>('.city-pin')].filter(shown).map((e) => ({ spot: e.dataset['spot'], r: e.getBoundingClientRect() }));
    for (const [i, a] of taps.entries()) for (const b of taps.slice(i + 1)) if (hit(a.r, b.r)) out.push(`pin ${a.spot}'s tap area on pin ${b.spot}'s`);
    // Edge arrows keep off the hero.
    const t = (window.__game!.kanoHome as unknown as { test: { heroBox: { x: number; y: number; w: number; h: number }; arrows: { x: number; y: number; tap: number; for: string }[] } }).test;
    const hb = t.heroBox;
    for (const a of t.arrows) if (a.x + a.tap / 2 > hb.x && hb.x + hb.w > a.x - a.tap / 2 && a.y + a.tap / 2 > hb.y && hb.y + hb.h > a.y - a.tap / 2) out.push(`arrow for ${a.for} on the hero`);
    return out;
  });

const POOR = { ...save({ streets: {}, city: { ...FRESH, hints: ['pin', 'walk'] } }), city: { ...CITY, kobo: 0, power: 0, tech: 0 } };
const RICH = save({ streets: { 1: K(1) }, city: { ...FRESH, paid: { dye: 300 }, hints: ['pin', 'walk'] } });
for (const size of [{ width: 320, height: 240 }, { width: 568, height: 320 }, { width: 640, height: 200 }]) {
  test(`K7: at ${size.width} x ${size.height} no board is on another board or the top row, and every pin shows (a tap on it opens it) or has an edge arrow off the hero`, async ({ page }) => {
    for (const [name, s] of [['poor', POOR], ['rich', RICH]] as const) {
      const errors = await open(page, s, size);
      await page.waitForTimeout(1500);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/k7-${name}-${size.width}.png` });
      expect(await layoutFaults(page), `${name} ${size.width}x${size.height}`).toEqual([]);
      // A real tap on each shown pin's word opens that pin's card.
      const words = await page.locator('.kano-city .city-pin:not([hidden])').evaluateAll((els) =>
        els.map((e) => {
          const r = e.querySelector('canvas')!.getBoundingClientRect();
          return { spot: (e as HTMLElement).dataset['spot']!, x: r.left + r.width / 2, y: r.bottom - 22 };
        }),
      );
      for (const w of words) {
        await page.touchscreen.tap(w.x, w.y);
        await expect(page.locator('.city-problem'), `${name} ${size.width}: tap on ${w.spot}'s word`).toHaveAttribute('data-spot', w.spot);
        await waitOutTapLock(page);
        await page.locator('.city-problem').getByRole('button', { name: 'Back' }).tap();
        await expect(page.locator('.city-problem')).toHaveCount(0);
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      }
      // Zoomed in, the camera moves: still no board on a board or the top row.
      await page.locator('.kano-city').getByRole('button', { name: /zoom in/i }).tap();
      await page.waitForTimeout(800);
      expect(await layoutFaults(page), `${name} ${size.width}x${size.height} zoomed in`).toEqual([]);
      expect(errors).toEqual([]);
    }
  });
}

test('offline after one visit: Kano\'s city, its road, Harmattan Road and the Missions board', async ({ page, context }) => {
  test.setTimeout(120_000);
  const failed: string[] = [];
  context.on('requestfailed', (r) => failed.push(r.url()));
  await open(page, save({ streets: { 1: K(1) }, city: FRESH }));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 }).toBeGreaterThan(0);
  // The Kano part's two files are kept on the phone once it has loaded (K1b).
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const all: string[] = [];
        for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) all.push(new URL(r.url).pathname);
        return all.filter((p) => p.includes('/worlds/kano/')).length;
      }),
    { timeout: 30_000 })
    .toBe(2);
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const city = page.locator('.kano-city');
  await city.getByRole('button', { name: 'Missions', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Missions' }).locator('.ms-tile')).toHaveCount(5);
  await page.getByRole('dialog', { name: 'Missions' }).getByRole('button', { name: 'Back' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="lane"]').tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Side road: Harmattan Road' }).getByRole('button', { name: 'Run the Harmattan Road' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  expect(await page.evaluate(() => window.__lane!.theme)).toBe('harmattan');
  await page.keyboard.press('KeyP');
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Back to Kano' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await context.setOffline(false);
  expect(failed.filter((u) => !/favicon|icons\/icon-192\.png/.test(u))).toEqual([]);
});

test('break: fast taps on the map, turn the phone, switch apps mid-lane, a huge screen', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await open(page, save({ streets: { 1: K(1), 2: K(2), 3: K(3) }, hall: { done: true, best: 0 }, city: { ...FRESH, built: ['leather'], trays: { leather: 120 }, boom: 4, hints: ['pin', 'walk'] } }));
  const map = page.locator('.kano-city .city-map');
  const box = (await map.boundingBox())!;
  // 40 taps in 2 s all over the map: the hero walks, nothing is bought by accident, no error.
  for (let i = 0; i < 40; i++) await page.touchscreen.tap(box.x + 40 + ((i * 97) % (box.width - 80)), box.y + box.height / 2 + ((i * 31) % 40) - 20);
  await page.waitForTimeout(1500);
  const s = await saved(page);
  expect((s.p.states['kano']!['city'] as Obj)['fixed']).toEqual([]);
  // Turn the phone, twice, and a huge screen: the rows stay on screen.
  for (const size of [{ width: 393, height: 851 }, { width: 851, height: 393 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(600);
    const off = await page.locator('.kano-city .city-top button, .kano-city .city-bottom button').evaluateAll((els, sz) =>
      els.filter((e) => (e as HTMLElement).offsetParent).map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() })).filter((b) => b.r.left < -0.5 || b.r.right > sz.w + 0.5 || b.r.top < -0.5 || b.r.bottom > sz.h + 0.5).map((b) => b.t),
    { w: size.width, h: size.height });
    expect(off, `${size.width}x${size.height}`).toEqual([]);
  }
  await page.setViewportSize({ width: 851, height: 393 });
  // Harmattan Road: switch apps mid-run; it pauses and nothing is lost.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.kano-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="lane"]').tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Side road: Harmattan Road' }).getByRole('button', { name: 'Run the Harmattan Road' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 15_000 }).toBe('play');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  const d0 = await page.evaluate(() => window.__lane!.dist);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__lane!.dist)).toBe(d0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Back to Kano' }).tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  expect(errors).toEqual([]);
});
