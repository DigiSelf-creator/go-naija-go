/**
 * qa O7 (docs/plan.md O7, docs/ogun.md parts 1 to 8, OG-R35 to OG-R44): the whole of Ogun as a new
 * player meets it, by touch on the phone profile, in one go:
 * Lagos with Go-Slow Hall won -> Lagos's Challenge road -> "To Ogun" -> the download card -> the
 * bus ride -> the arrival card -> Ogun's city (first visit) -> the Bad road card -> Ota by hand ->
 * Next street -> Abeokuta by hand with the well room and the Ijebu garri parcel -> Next street ->
 * Sagamu by hand -> "Go to Pothole Hall" -> King Pothole by the keys -> "Take it home" -> Ogun's
 * city with "Mission complete!" and the gateway's smooth line (once) -> every board paid from the
 * one wallet -> the boom card -> Ogun's Challenge road -> the Expressway -> Travel to Lagos and
 * back to Ogun.
 * At every step: the save (states.ogun only; Lagos's own fields untouched; one wallet at the top),
 * the exact words of part 8, and no request to any other site (and none for Ogun before Download).
 * With QA_SHOTS=<folder> it saves pictures for Tp (o7-*.png).
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { keyPad } from './hall-play';
import { buttonCentres, hands, LEFT, playStreetByHand, snap, type Hands, type Snap } from './hands';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { playPothole } from './pothole-play';
import { wellBot } from './well-bot';
import { formatMoney } from '../../src/game/money';

const LOOK = '{"skin":4,"hair":1,"outfit":2,"body":1,"age":1}';
const D = { done: true, best: 100 };
const LAGOS = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 0 } };
/** Lagos's city: two fixes, the Mama Put, its meter; ₦10, Power 18 and Tech 6 in the one wallet. */
const CITY = { kobo: 1000, power: 18, tech: 6, fixed: ['potholes', 'lightsOut'], fixes: 2, paid: {}, built: ['buka'], trays: { buka: 60 }, boom: 12, boomCollect: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
const LANE = { best: 700, goals: 1 };
const START = { v: 2, states: { lagos: LAGOS }, city: CITY, lane: LANE };
const SHOTS = process.env['QA_SHOTS'];

type Obj = Record<string, unknown>;
type Saved = { where?: string; city: Obj; lane?: Obj; states: { lagos: Obj; ogun?: Obj & { city?: Obj; lane?: Obj; hall?: Obj; streets?: Record<string, Obj>; parcel?: boolean; arrived?: boolean } } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);
/** Lagos's own city fields (the wallet and trays move by design: decision 80, OG-R8). */
const lagosOwn = (c: Obj) => ({ fixed: c['fixed'], fixes: c['fixes'], built: c['built'], paid: c['paid'], boom: c['boom'] });
const ogunCity = (page: Page) => page.getByRole('dialog', { name: 'Ogun', exact: true });

async function lagosUntouched(page: Page, where: string): Promise<Saved> {
  const s = await saved(page);
  expect(s.states.lagos, `${where}: Lagos's streets and hall`).toEqual(LAGOS);
  expect(lagosOwn(s.city), `${where}: Lagos's city`).toEqual(lagosOwn(CITY));
  expect(s.lane, `${where}: Lagos's lane run`).toMatchObject(LANE);
  for (const k of ['kobo', 'power', 'tech']) {
    expect(s.states.ogun?.[k], `${where}: no second wallet under ogun`).toBeUndefined();
    expect(s.states.ogun?.city?.[k], `${where}: no second wallet under ogun.city`).toBeUndefined();
  }
  return s;
}

/** O7 item 5: every size, with and without 24 px safe edges. */
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;
const PHONE = { width: 851, height: 393 };
type Box = { t: string; x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
async function setSafe(page: Page, px: number): Promise<void> {
  await page.evaluate((px) => {
    for (const s of ['top', 'right', 'bottom', 'left']) {
      if (px) document.documentElement.style.setProperty(`--safe-${s}`, `${px}px`);
      else document.documentElement.style.removeProperty(`--safe-${s}`);
    }
    window.dispatchEvent(new Event('resize'));
  }, px);
}
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
/**
 * The buttons a player can tap now: those of the top-most open card (a dim layer or dialog), else
 * of the screen showing (not the map's own pins and boards, which move with the map and get edge
 * arrows: ogun-city-signs.spec). Also whether the top card needs a scroll.
 */
const tappable = (page: Page) =>
  page.evaluate(() => {
    const vis = (e: Element) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const layers = [...document.querySelectorAll<HTMLElement>('.travel-dim, .city-card-spot:not([hidden]), .road-card, .download-card, [role="dialog"]')].filter(vis);
    const top = layers.filter((l) => !layers.some((o) => o !== l && l.contains(o) && o.matches('.travel-dim, .city-card-spot, .road-card, .download-card'))).pop() ?? document.body;
    const card = top.matches('.card') ? top : [...top.querySelectorAll<HTMLElement>('.card')].filter(vis).pop();
    return {
      vw: innerWidth,
      vh: innerHeight,
      sw: document.documentElement.scrollWidth,
      buttons: [...top.querySelectorAll<HTMLElement>('button')]
        .filter((b) => vis(b) && !b.closest('.city-stage'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { t: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?', x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      scroll: card && !card.classList.contains('city-card') ? card.scrollHeight > card.clientHeight + 1 : false,
    };
  });
/** Checks the screen at every size and safe edge: buttons 44 px, inside the edges, apart; no sideways scroll; no card scroll. */
async function fit(page: Page, name: string, found: string[], shot = false): Promise<void> {
  for (const size of SIZES) {
    for (const safe of [0, 24]) {
      await page.setViewportSize(size);
      await setSafe(page, safe);
      await settle(page);
      const l = await tappable(page);
      const at = `${name} ${size.width}x${size.height}${safe ? ' safe 24' : ''}`;
      const bad = (m: string) => found.push(`${at}: ${m}`);
      if (shot && SHOTS) await page.screenshot({ path: `${SHOTS}/o7-size-${at.replace(/[^\w]+/g, '-')}.png` });
      if (l.sw > l.vw + 1) bad('sideways scroll');
      if (l.scroll) bad('card needs a scroll');
      for (const b of l.buttons) {
        if (b.h < 44 - 0.5 || b.w < 44 - 0.5) bad(`"${b.t}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
        if (b.x < safe - 0.5 || b.x + b.w > l.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > l.vh - safe + 0.5) bad(`"${b.t}" outside the safe area (${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)})`);
      }
      for (let i = 0; i < l.buttons.length; i++)
        for (let j = i + 1; j < l.buttons.length; j++)
          if (overlaps(l.buttons[i]!, l.buttons[j]!)) {
            const m = `"${l.buttons[i]!.t}" overlaps "${l.buttons[j]!.t}"`;
            // QA-O2-4 (known, shared with Lagos): the city's rows meet at 320 x 240 with 24 px edges; its own test.fail below.
            if (/city/i.test(name) && size.width === 320 && safe === 24) test.info().annotations.push({ type: 'QA-O2-4', description: `${at}: ${m}` });
            else bad(m);
          }
    }
  }
  await setSafe(page, 0);
  await page.setViewportSize(PHONE);
  await settle(page);
}

/** Plays the street on screen by the two-thumb hand bot (crates opened), with an optional extra actor. */
type Actor = (s: Snap, h: Hands) => Promise<boolean>;
/** `extra` is made with the street's own hands, so its fingers are the bot's fingers. */
async function street(page: Page, id: string, extra?: (h: Hands) => Promise<Actor>, shot?: { at: number; path: string }) {
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe(id);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const crateAct = await crateActor(page, crates);
  const extraAct = extra ? await extra(h) : null;
  let shotDone = false;
  const { stats, last } = await playStreetByHand(page, h, {
    act: async (s, hh) => (extraAct ? await extraAct(s, hh) : false) || crateAct(s, hh),
    onPoll: async (s) => {
      if (shot && !shotDone && s.h.x >= shot.at) {
        shotDone = true;
        await page.screenshot({ path: shot.path });
      }
    },
  });
  await h.upAll();
  return { stats, last, h };
}

test('qa O7: a new player\'s whole Ogun, by touch, from Lagos with Go-Slow Hall won to the boom, the Expressway and back; saves, words, one wallet, no other site', async ({ page, context }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const other: string[] = [];
  const ogunAsked: string[] = [];
  context.on('request', (r) => {
    if (new URL(r.url()).origin !== origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) other.push(r.url());
    if (/\/worlds\/ogun\//.test(r.url())) ogunAsked.push(r.url());
  });
  const log: string[] = [];
  const found: string[] = [];

  // 0. Lagos with Go-Slow Hall won.
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(START) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  expect(ogunAsked, 'Ogun is not fetched before the player goes there').toEqual([]);

  // 1. Lagos's Challenge road: "To Ogun" (open) and its card.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Challenge road' }).tap();
  const road = page.getByRole('region', { name: 'Challenge road' });
  await expect(road).toBeVisible();
  const toOgun = road.locator('[data-where="ogun"]');
  await expect(toOgun).toHaveAttribute('aria-label', 'To Ogun. Open. The road to Ogun is open.');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await toOgun.tap();
  const toCard = page.getByRole('dialog', { name: 'To Ogun' });
  await expect(toCard.getByText('The road to Ogun is open.')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await toCard.getByRole('button', { name: 'Go to Ogun' }).tap();

  // 2. The download card, word for word; Download; the bus ride under the arch; the arrival card.
  const dl = page.locator('.download-card');
  await expect(dl.getByText('Ogun is ready to download (about 130 KB).')).toBeVisible();
  await expect(dl.getByText('After this it plays with no internet.')).toBeVisible();
  await expect(dl.getByRole('button', { name: 'Not now' })).toBeVisible();
  expect(ogunAsked).toEqual([]);
  await dl.getByRole('button', { name: 'Download' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  expect(ogunAsked.length).toBeGreaterThan(0);
  await expect(page.getByRole('img', { name: 'A yellow bus drives under the gateway arch into Ogun.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  // Let the first ride play out by itself (about 4 s).
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  const arrival = page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' });
  await expect(arrival.getByText('The road to the rest of Nigeria runs through here.')).toBeVisible();
  await expect(arrival.getByText('King Pothole has dug in at the gateway. Fix Ogun, and the way opens.')).toBeVisible();
  let s = await lagosUntouched(page, 'arrival');
  expect(s.where).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await arrival.getByRole('button', { name: "Let's go" }).tap();
  await expect(arrival).toHaveCount(0);
  s = await lagosUntouched(page, 'after the arrival card');
  expect(s.states.ogun?.arrived).toBe(true);
  expect(s.city['kobo']).toBe(1000);

  // 3. Ogun's city on the first visit (OG-R35): heading, map name, first hint, the five boards, the hopping Potholes pin.
  const city = page.locator('.ogun-city');
  await expect(city).toBeVisible();
  const head = ogunCity(page).getByRole('heading', { name: 'Ogun. Booming meter. 0 of 20 to the next boom.' });
  await expect(head).toBeVisible();
  await expect(head).toContainText(/^Ogun/);
  await expect(ogunCity(page).getByRole('img', { name: 'Ogun from above. Tap where you want to go.' })).toHaveCount(1);
  await expect(city.locator('.city-hint')).toHaveText('Tap where you want to go. Walk onto a board to pay.');
  await expect(city.locator('.city-board')).toHaveCount(5);
  expect(await city.locator('.city-board').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['build']).sort())).toEqual(['adire', 'dryTaps', 'lightsOut', 'potholes', 'slowInternet']);
  await expect(city.locator('.city-pin[data-spot="potholes"]')).toHaveClass(/\bfirst\b/);
  await expect(city.locator('.city-pin[data-spot="badRoad"]')).toHaveAttribute('aria-label', 'Bad road, problem');
  for (const b of ['Challenge road', 'Travel']) await expect(city.getByRole('button', { name: b, exact: true })).toBeVisible();
  await page.waitForTimeout(1500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7-ogun-city-first-visit.png` });
  await fit(page, 'Ogun city first visit', found, true);

  // 4. The Bad road card before Ota (OG-R37), then "Run Ota".
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.locator('.city-pin[data-spot="badRoad"]').tap();
  let bad = page.getByRole('dialog', { name: 'Bad road' });
  await expect(bad.getByText('King Pothole is blocking the gateway.')).toBeVisible();
  await expect(bad.getByText('Clear Ota, Abeokuta and Sagamu to reach Pothole Hall.')).toBeVisible();
  await expect(bad.getByRole('button', { name: 'Run Ota' })).toHaveClass(/\bgo\b/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7-bad-road-card.png` });
  await fit(page, 'Bad road card', found, true);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await bad.getByRole('button', { name: 'Run Ota' }).tap();

  // 5. Ota, Abeokuta (well room and parcel), Sagamu by hand, each "Next street".
  let wallet = 1000;
  const room = { visited: false, id: '', parcel: false, back: 0 };
  const streets = [
    { id: 'ogun-1', name: 'Ota', n: 1 },
    { id: 'ogun-2', name: 'Abeokuta', n: 2 },
    { id: 'ogun-3', name: 'Sagamu', n: 3 },
  ];
  for (const st of streets) {
    let extra: ((h: Hands) => Promise<Actor>) | undefined;
    if (st.n === 2) extra = async (h) => {
      const well = await wellBot(page, h);
      const btn = await buttonCentres(page);
      return async (sn, hh) => {
        if (room.visited || sn.h.x < 3380 || sn.h.x > 3520) return false;
        room.visited = true;
        await well.walkTo(3500, 8);
        await well.tapWellButton('down');
        await well.phase('room');
        room.id = await page.evaluate(() => window.__game!.run.room?.id ?? '');
        await well.walkTo(285, 4);
        await well.jump(true);
        await page.waitForTimeout(150);
        room.parcel = await page.evaluate(() => window.__game!.run.parcel);
        await page.waitForTimeout(500);
        await well.walkTo(500, 4);
        await well.tapWellButton('up');
        await well.phase('run', 15_000);
        room.back = (await snap(page)).h.x;
        await hh.down(LEFT, btn.forward.x, btn.forward.y);
        return true;
      };
    }
    let lostTries = 0;
    let r = await street(page, st.id, extra, st.n === 1 && SHOTS ? { at: 2140, path: `${SHOTS}/o7-street-ota.png` } : undefined);
    // A try is 3 lives: Out of lives -> Play again, up to 3 tries.
    while (r.last.r.phase !== 'bus' && lostTries < 2) {
      lostTries++;
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible({ timeout: 8000 });
      await expect(over.getByText(/^You keep .* for Ogun\. The street is still here\. Try again!$/)).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
      r = await street(page, st.id, extra);
    }
    log.push(`${st.name}: ${r.last.r.phase} in ${r.last.r.time.toFixed(1)} s, tries ${lostTries + 1}, lost at ${r.stats.lostAt.map((x) => x.toFixed(0)).join(', ') || 'nowhere'}, kobo ${r.last.r.kobo}`);
    expect(r.last.r.phase, `${st.name} cleared in 3 tries`).toBe('bus');
    const dialog = page.getByRole('dialog', { name: 'Street cleared!' });
    await expect(dialog).toBeVisible({ timeout: 8000 });
    const kobo = await page.evaluate(() => window.__game!.run.kobo);
    const money = kobo * 10 + 500;
    wallet += money;
    await expect(dialog.getByText(`${st.name} is moving again, thanks to you! You got ${formatMoney(money)}.`)).toBeVisible();
    // The parcel line shows on the card of the run that carried it (Abeokuta), as Lagos's.
    if (st.n === 2) await expect(dialog.getByText('Your Ijebu garri parcel is saved for Pothole Hall.')).toBeVisible();
    if (st.n !== 2) await fit(page, `${st.name} cleared card`, found, st.n === 1);
    s = await lagosUntouched(page, `${st.name} cleared`);
    expect(s.states.ogun?.streets?.[String(st.n)]).toEqual({ done: true, best: kobo * 10 });
    expect(s.city['kobo'], `${st.name}: one wallet`).toBe(wallet);
    await waitOutTapLock(page);
    if (st.n < 3) {
      await expect(dialog.getByRole('button', { name: 'Go to Pothole Hall' })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Next street', exact: true }).tap();
    } else {
      await expect(dialog.getByRole('button', { name: 'Next street', exact: true })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Go to Pothole Hall' }).tap();
    }
  }
  expect(room).toMatchObject({ visited: true, id: 'ogun-well', parcel: true });
  expect(s.states.ogun?.parcel).toBe(true);

  // 6. Pothole Hall by the keys, with the parcel's shield (3 tries at most).
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  let won = false;
  let tries = 0;
  for (; tries < 3 && !won; tries++) {
    const r = await playPothole(page, keyPad(page));
    won = r.last.a?.defeated === true;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await expect(over.getByText('King Pothole is still blocking the gateway. Try again!')).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
      await expect.poll(() => screenNow(page)).toBe('play');
    }
  }
  log.push(`Pothole Hall: won ${won} in ${tries} tries`);
  expect(won, 'King Pothole beaten in 3 tries').toBe(true);
  for (let i = 0; i < 600 && (await screenNow(page)) !== 'win'; i++) await page.waitForTimeout(20);
  const win = page.getByRole('dialog', { name: 'Ogun is switched on!' });
  await expect(win).toBeVisible();
  await expect(win.getByText('The road through the gateway is smooth. The way to the rest of Nigeria is open.')).toBeVisible();
  const hallKobo = (await page.evaluate(() => window.__game!.run.kobo)) * 10 + 1500;
  await expect(win.getByText(`You got ${formatMoney(hallKobo)}.`)).toBeVisible();
  await expect(win.getByRole('button', { name: 'Take it home' })).toHaveClass(/\bgo\b/);
  await expect(win.getByRole('button', { name: 'Play again' })).toBeVisible();
  wallet += hallKobo;
  s = await lagosUntouched(page, 'hall won');
  expect(s.states.ogun?.hall?.['done']).toBe(true);
  expect(s.city['kobo']).toBe(wallet);
  await page.waitForTimeout(600);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7-pothole-hall-win.png` });
  await fit(page, 'Pothole Hall win card', found, true);

  // 7. Take it home: "Mission complete!", the money, then the gateway's line; the Bad road pin goes.
  await waitOutTapLock(page);
  await win.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect(city.locator('.city-banner')).toContainText('Mission complete!');
  await expect(city.locator('.city-banner')).toContainText(`You brought ${formatMoney(hallKobo, '₦')} home.`);
  await expect(city.locator('.city-banner')).toContainText('The gateway is open. The road is smooth.', { timeout: 10_000 });
  await expect(city.locator('.city-pin[data-spot="badRoad"]')).toHaveCount(0);
  await expect(city.locator('.chip-naira')).toContainText(formatMoney(wallet, '₦'));

  // 8. Pay every board from the one wallet: road, adire, pump, lamps, mast (the mill comes with the road).
  const pay = async (b: string, kind: 'fixed' | 'built'): Promise<void> => {
    await expect(city.locator(`[data-build="${b}"]`)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2600);
    await city.locator(`[data-build="${b}"]`).tap();
    await expect.poll(async () => ((await saved(page)).states.ogun?.city?.[kind] as string[] | undefined) ?? [], { timeout: 25_000 }).toContain(b);
  };
  const prices: Record<string, [string, number]> = { potholes: ['kobo', 1200], adire: ['kobo', 600], dryTaps: ['power', 10], lightsOut: ['power', 8], slowInternet: ['tech', 6] };
  const left = { kobo: wallet, power: 18, tech: 6 };
  for (const [b, kind] of [['potholes', 'fixed'], ['adire', 'built'], ['dryTaps', 'fixed'], ['lightsOut', 'fixed'], ['slowInternet', 'fixed']] as const) {
    await pay(b, kind);
    const [bucket, price] = prices[b]!;
    left[bucket as 'kobo'] -= price;
    s = await lagosUntouched(page, `paid ${b}`);
    // Trays fill anywhere (OG-R8), so only check the paid bucket and that money never went negative.
    expect(s.city[bucket], `${b}: paid from the one wallet`).toBe(left[bucket as 'kobo']);
    if (b === 'potholes') await expect(city.locator('[data-build="mill"]')).toBeVisible({ timeout: 10_000 });
    if (b !== 'slowInternet') await expect(city.locator('.city-banner')).not.toContainText('The gateway is open. The road is smooth.', { timeout: 10_000 });
  }
  // The fifth place is 20 of 20: Ogun's boom card.
  const boom = page.getByRole('dialog', { name: 'Ogun is booming!' });
  await expect(boom).toBeVisible({ timeout: 20_000 });
  await expect(boom.getByText('New buildings are going up. More people are coming through the gateway, and they need more.')).toBeVisible();
  // The cog turned at the first hall win (OG-R35), so the cog line does not show again.
  await expect(boom.getByText("Ogun's cog is turning on Nigeria's wheel!")).toHaveCount(0);
  await fit(page, 'Ogun boom card', found);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await boom.getByRole('button', { name: 'See Ogun' }).tap();
  await expect(boom).toHaveCount(0);
  await expect(city.locator('[data-build="kola"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(2500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/o7-ogun-city-boomed.png` });
  await fit(page, 'Ogun city boomed', found, true);
  s = await lagosUntouched(page, 'boomed');
  log.push(`Ogun city after the boom: ${JSON.stringify(s.states.ogun?.city)}; wallet ${JSON.stringify({ kobo: s.city['kobo'], power: s.city['power'], tech: s.city['tech'] })}`);

  // 9. Ogun's Challenge road: the Expressway (all three fixes done: its "all done" words), run to the bus stop.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  await expect(page.locator('[data-where="hall"]')).toHaveAttribute('aria-label', 'Stop 4, Pothole Hall. Done.');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="expressway"]').tap();
  const ex = page.getByRole('dialog', { name: 'Side road: Expressway' });
  await expect(ex.getByText('Water on, lamps on and fast internet here.')).toBeVisible();
  await expect(ex.getByText('Earns Naira, Power and Tech.')).toBeVisible();
  await fit(page, 'Expressway road card', found);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await ex.getByRole('button', { name: 'Run the Expressway' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 20_000 }).toBe('play');
  expect(await page.evaluate(() => ({ level: window.__lane!.level, theme: window.__lane!.theme }))).toEqual({ level: 'ogun-lane', theme: 'expressway' });
  await page.evaluate(() => window.__lane!.warp(700));
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? 'gone'), { timeout: 20_000 }).not.toBe('play');
  await page.waitForTimeout(1500);
  const home = page.getByRole('button', { name: /^(Back to Ogun|Take it home)$/ }).first();
  await waitOutTapLock(page);
  await home.tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  // The gateway's smooth line plays once only, never again on a later return.
  await page.waitForTimeout(3000);
  await expect(city.locator('.city-banner')).not.toContainText('The gateway is open. The road is smooth.');
  s = await lagosUntouched(page, 'after the Expressway');
  expect(s.states.ogun?.lane?.['goals']).toBe(1);

  // 10. Travel to Lagos and back to Ogun: no arrival card again, the same wallet, Lagos as it was.
  const before = s.city['kobo'];
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('city');
  await expect(page.locator('.city-card:not(.ogun-city) .chip-naira')).toContainText(formatMoney(before as number, '₦'));
  expect((await saved(page)).where).toBe('lagos');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
  const travel = page.getByRole('dialog', { name: 'Where to?' });
  await expect(travel.locator('[data-state="ogun"]')).toContainText('Booming: 20 of 20 ✓');
  await fit(page, 'Travel card from Lagos', found);
  await travel.locator('[data-state="ogun"]').tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  await expect(page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' })).toHaveCount(0);
  await expect(page.locator('.download-card')).toHaveCount(0);
  s = await lagosUntouched(page, 'back in Ogun');
  expect(s.where).toBe('ogun');

  console.log(log.join('\n'));
  test.info().annotations.push({ type: 'o7 journey', description: log.join(' | ') });
  // QA-O7-2 (open, the card layout Lagos shares; its own test.fail in qa-o7-checks.spec.ts): on the
  // shortest screens these cards are taller than the room and scroll, their buttons under the edge.
  const KNOWN = /^(Pothole Hall win card|Ogun boom card|Expressway road card) (320x240 safe 24|640x200( safe 24)?):/;
  const known = found.filter((f) => KNOWN.test(f));
  const fresh = found.filter((f) => !KNOWN.test(f));
  test.info().annotations.push({ type: 'QA-O7-2 (known)', description: known.join(' | ') || 'none' });
  console.log(`size faults: ${fresh.length} new, ${known.length} known (QA-O7-2)\n  ${found.join('\n  ')}`);
  expect.soft(fresh, 'every size fits').toEqual([]);
  expect(other, 'no request to any other site').toEqual([]);
  expect(errors).toEqual([]);
});
