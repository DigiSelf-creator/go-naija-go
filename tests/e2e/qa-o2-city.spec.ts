/**
 * qa slice O round 2 (O6c, docs/ogun.md 6.2 to 6.6, decisions 71 and 80, OG-R8): Ogun's city, its
 * Challenge road and the Expressway on the phone profile, beside gamedev's ogun-city.spec.ts.
 * - tiny screens (320 x 240, 640 x 200, with and without 24 px safe edges): every button 44 px,
 *   inside the safe edges, boards and bubbles clear of the buttons;
 * - trays fill anywhere (OG-R8): Ogun's adire tray fills while a Lagos street plays;
 * - W18 in Ogun: "Tax ..." bubble, "The adire market paid ₦1.20 tax!", the taxOgun hint once;
 * - the Booming meter reaching 20: the boom card's words, "See Ogun", the kola market board;
 * - keys only: Escape closes a card (the browser's stand-in for Android back), arrows walk onto a board to pay;
 * - the road: "Coming soon" stops cannot be played; "To Lagos" rides back to Lagos;
 * - the Expressway: a caught run saves its best under states.ogun.lane; Lagos's lane save untouched;
 * - Lagos's lane run draws its roadside and bus stop goal (screenshots for the report).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, playStop, screenNow, waitOutTapLock } from './helpers';

const SHOTS = '/tmp/claude-0/-home-user-go-naija-go/8f053298-216f-5365-a405-cc199ad5be18/scratchpad';
const LOOK = '{"skin":1,"hair":2,"outfit":1,"body":0,"age":1}';
const D = { done: true, best: 100 };
const LAGOS = { streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 0 } };
const OGUN = { arrived: true, streets: { 1: D, 2: D, 3: D }, parcel: false, hall: { done: true, best: 50 } };
const HINTS = ['walk', 'bright', 'buka', 'collect', 'road', 'tax'];
const LANE = { best: 640, goals: 1 };

type Obj = Record<string, unknown>;
type Saved = { city: Obj; lane?: Obj; where?: string; states: { lagos: Obj; ogun: Obj & { city?: Obj; lane?: Obj } } };
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Saved);

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function open(page: Page, city: Obj, ogunCity: Obj, where = 'ogun'): Promise<void> {
  const p = { v: 2, states: { lagos: LAGOS, ogun: { ...OGUN, city: ogunCity } }, city, lane: LANE, where };
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-busRide', 'false');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(p) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe(where === 'ogun' ? 'ogun' : 'city');
  if (where === 'ogun') await expect(page.locator('.ogun-city')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

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

const BUSY = { kobo: 2500, power: 12, tech: 7, fixed: [], fixes: 0, paid: {}, hints: HINTS };
const BUSY_OGUN = { fixed: ['potholes'], fixes: 1, built: ['adire', 'mill'], trays: { adire: 120, mill: 90 }, boom: 12, hints: ['taxOgun'] };

/**
 * BUG QA-O2-3 (low, shared with Lagos's city; fixed in O6b2): at 320 x 240 and 640 x 200 (and 568 x 320 with
 * 24 px safe edges) price boards and tax bubbles can sit partly under the fixed buttons (Travel,
 * Hero, Challenge road, the wheel, Sound, Settings, zoom). Lagos's city does the same, so it is not
 * new in slice O. Fix: count the button rows as taken when placing signs (as the heading is, F1).
 */
for (const where of ['lagos', 'ogun'] as const) {
test(`qa O2 city (${where}): tiny screens with and without 24 px safe edges: buttons 44 px inside the edges; boards and tax bubbles clear of every button`, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await open(page, where === 'lagos' ? { ...BUSY, built: ['buka'], trays: { buka: 150 } } : BUSY, BUSY_OGUN, where);
  const found: string[] = [];
  for (const [width, height] of [
    [320, 240],
    [640, 200],
    [568, 320],
    [851, 393],
  ] as const) {
    for (const safe of [0, 24]) {
      await page.setViewportSize({ width, height });
      await setSafe(page, safe);
      await page.waitForTimeout(500);
      const at = `${width}x${height}${safe ? ' safe 24' : ''}`;
      const l = await page.evaluate(() => {
        const box = (e: Element) => {
          const r = e.getBoundingClientRect();
          return { t: (e.getAttribute('aria-label') || (e.textContent ?? '').trim() || e.className).slice(0, 40), x: r.x, y: r.y, w: r.width, h: r.height, cls: e.className };
        };
        const root = [...document.querySelectorAll('.ogun-city, .city-card')].find((e) => e.getClientRects().length > 0)!;
        const shown = [...root.querySelectorAll<HTMLElement>('button')].filter((b) => b.getClientRects().length > 0).map(box);
        return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, shown };
      });
      if (safe === 0 && width === 320) await page.screenshot({ path: `${SHOTS}/oqa2-${where}-city-320x240.png` });
      if (safe === 0 && width === 851) await page.screenshot({ path: `${SHOTS}/oqa2-${where}-city.png` });
      const signs = l.shown.filter((b) => /city-board|city-bubble/.test(b.cls));
      const pins = l.shown.filter((b) => /city-pin/.test(b.cls) || b.cls.includes('pin'));
      const buttons = l.shown.filter((b) => !signs.includes(b) && !pins.includes(b) && !/city-arrow/.test(b.cls));
      if (l.sw > l.vw + 1) found.push(`${at}: sideways scroll`);
      for (const b of buttons) {
        if (b.h < 44 || b.w < 44) found.push(`${at}: button "${b.t}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
        if (b.x < safe - 0.5 || b.x + b.w > l.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > l.vh - safe + 0.5) found.push(`${at}: "${b.t}" outside the safe edges`);
      }
      for (const s of signs) {
        if (s.h < 44 && s.w < 44) found.push(`${at}: sign "${s.t}" is ${s.w.toFixed(0)}x${s.h.toFixed(0)}`);
        for (const b of buttons) if (overlaps(s, b)) found.push(`${at}: sign "${s.t}" under button "${b.t}"`);
      }
      console.log(`${where} ${at}: ${buttons.length} buttons, ${signs.length} signs shown (${signs.map((s) => `${s.t.slice(0, 18)} ${s.w.toFixed(0)}x${s.h.toFixed(0)}`).join('; ')})`);
    }
  }
  await setSafe(page, 0);
  console.log(`${where}:\n${found.join('\n') || 'no layout problems'}`);
  expect(found).toEqual([]);
  expect(errors).toEqual([]);
});
}

test('qa O2 city: W18 in Ogun: the full adire bubble says "Tax ₦1.20", a collect says "The adire market paid ₦1.20 tax!", the taxOgun hint shows once', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = errorsOf(page);
  await open(page, { ...BUSY, kobo: 1000 }, { fixed: [], fixes: 0, built: ['adire'], trays: { adire: 120 }, boom: 4, hints: [] });
  const city = page.locator('.ogun-city');
  const bubble = city.locator('[data-place="adire"]');
  await expect(bubble).toHaveAttribute('aria-label', 'Tax from the adire market: 1 naira 20 kobo. Full.');
  await bubble.tap();
  await expect(city.locator('.city-banner')).toHaveText('The adire market paid ₦1.20 tax!', { timeout: 20_000 });
  await expect(city.locator('.city-hint')).toHaveText('Busy shops pay a small tax. Ogun uses it to fix more.');
  const s = await saved(page);
  expect(s.city['kobo']).toBe(1120);
  expect((s.states.ogun.city!['hints'] as string[]).filter((h) => h === 'taxOgun')).toHaveLength(1);
  expect(s.states.ogun.city).not.toHaveProperty('kobo');
  // Lagos's own tax hint record is not used for Ogun's (it was already there; still once).
  expect((s.city['hints'] as string[]).filter((h) => h === 'tax')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('qa O2 city: the Booming meter reaches 20: the boom card\'s words, "See Ogun", then the kola market\'s board; Travel says 20 of 20', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = errorsOf(page);
  await open(page, { ...BUSY, kobo: 3000 }, { fixed: ['dryTaps', 'lightsOut', 'slowInternet'], fixes: 3, built: ['adire'], trays: {}, boom: 16, hints: ['taxOgun'] });
  const city = page.locator('.ogun-city');
  await expect(city.locator('.city-head')).toHaveAttribute('aria-label', 'Ogun. Booming meter. 16 of 20 to the next boom.');
  await city.locator('[data-build="potholes"]').tap();
  const boom = page.getByRole('dialog', { name: 'Ogun is booming!' });
  await expect(boom).toBeVisible({ timeout: 30_000 });
  await expect(boom.getByText('New buildings are going up. More people are coming through the gateway, and they need more.')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/oqa2-ogun-boom.png` });
  const go = boom.getByRole('button', { name: 'See Ogun' });
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Escape does not skip the boom card (it waits for its button).
  await page.keyboard.press('Escape');
  await expect(boom).toBeVisible();
  await waitOutTapLock(page);
  await go.tap();
  await expect(boom).toBeHidden();
  await expect(city.locator('[data-build="kola"]')).toBeVisible({ timeout: 10_000 });
  const s = await saved(page);
  expect(s.states.ogun.city!['boom']).toBe(20);
  expect(s.city['kobo']).toBe(1800);
  await page.waitForTimeout(2600);
  await city.getByRole('button', { name: 'Travel' }).tap();
  const travel = page.getByRole('dialog', { name: 'Where to?' });
  await expect(travel.locator('[data-state="ogun"]')).toContainText('Booming: 20 of 20 ✓');
  expect(errors).toEqual([]);
});

test('qa O2 city: keys only: arrows walk the hero onto the adire board\'s mat and pay; a pin card opens with Enter and Escape closes it', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = errorsOf(page);
  await open(page, { ...BUSY, kobo: 1000 }, { fixed: [], fixes: 0, built: [], trays: {}, boom: 0, hints: ['taxOgun'] });
  const city = page.locator('.ogun-city');
  // A pin card by the keys: focus the Slow internet pin, Enter, then Escape.
  const pin = city.locator('[data-spot="slowInternet"]');
  await pin.focus();
  await page.keyboard.press('Enter');
  const card = page.locator('.ogun-city .city-problem');
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(pin).toBeFocused();
  // The adire board by Tab and Enter: the hero walks to its mat and pays ₦6.
  const board = city.locator('[data-build="adire"]');
  await board.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => ((await saved(page)).states.ogun.city?.['built'] as string[] | undefined) ?? [], { timeout: 25_000 }).toEqual(['adire']);
  expect((await saved(page)).city['kobo']).toBe(400);
  const focused = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return a ? `${a.tagName}.${a.className} ${a.getAttribute('aria-label') ?? a.textContent?.trim() ?? ''}` : 'none';
  });
  console.log(`focus after paying by the keys: ${focused}`);
  expect(errors).toEqual([]);
});

const heroAt = (page: Page) => page.evaluate(() => (window.__game!.ogunCity as unknown as { test: { hero: { x: number; y: number } } }).test.hero);
for (const where of ['lagos', 'ogun'] as const) {
  test(`qa O2 city (${where}): keys only: the arrows walk the hero when the city opens`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors = errorsOf(page);
    await open(page, BUSY, { fixed: [], fixes: 0, built: [], trays: {}, boom: 0, hints: ['taxOgun'] }, where);
    const at = where === 'ogun' ? heroAt : (p: Page) => p.evaluate(() => window.__game!.city!.hero as { x: number; y: number });
    const walk = async (): Promise<number> => {
      const b = await at(page);
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(900);
      await page.keyboard.up('ArrowLeft');
      await page.waitForTimeout(300);
      return b.x - (await at(page)).x;
    };
    const fresh = await walk();
    const sel = where === 'ogun' ? '.ogun-city .city-board' : '.city-card .city-board';
    await page.locator(sel).first().focus();
    const onBoard = await walk();
    console.log(`${where}: arrows walked ${fresh.toFixed(0)} u when the city opened, ${onBoard.toFixed(0)} u with a board focused`);
    expect(fresh, 'arrows walk when the city opens').toBeGreaterThan(5);
    // With a board focused the arrows do not walk in Lagos either (the same in both; noted, not a slice O bug).
    expect(onBoard).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('qa O2 city: trays fill anywhere (OG-R8): Ogun\'s adire tray fills while a Lagos street plays; Lagos\'s own tray too', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await open(page, { ...BUSY, kobo: 1000, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: { buka: 0 } }, { fixed: [], fixes: 0, built: ['adire'], trays: {}, boom: 4, hints: ['taxOgun'] });
  // Travel to Lagos, then its Challenge road, then street 1.
  await page.locator('.ogun-city').getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.road-stop').first().waitFor();
  const stops = await page.locator('.road-stop').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['where']));
  console.log(`Lagos road stops: ${stops.join(', ')}`);
  await playStop(page, '0');
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('play');
  // About 18 s of play (the hero stands; Lagos street 1 has nothing that hurts at the start).
  await expect.poll(() => page.evaluate(() => window.__game!.run.time), { timeout: 40_000 }).toBeGreaterThan(18);
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  const s = await saved(page);
  const adire = ((s.states.ogun.city!['trays'] as Obj | undefined) ?? {})['adire'] as number | undefined;
  const buka = ((s.city['trays'] as Obj | undefined) ?? {})['buka'] as number | undefined;
  console.log(`after 18 s of Lagos street 1, as saved (written every 10 s of play): Ogun adire tray ${adire}, Lagos buka tray ${buka}`);
  expect(adire ?? 0).toBeGreaterThanOrEqual(10);
  expect(buka ?? 0).toBeGreaterThan(0);
  // In Ogun's city the bubble shows what the 18 s earned: 2 cloths, 20 kobo.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
  await expect(page.locator('.ogun-city')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.ogun-city [data-place="adire"]')).toHaveAttribute('aria-label', 'Tax from the adire market: 20 kobo.');
  expect(errors).toEqual([]);
});

test('qa O2 road: Ogun\'s Challenge road: Coming soon stops cannot be played; "To Lagos" rides back to Lagos', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = errorsOf(page);
  await open(page, BUSY, BUSY_OGUN);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect.poll(() => screenNow(page)).toBe('road');
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.screenshot({ path: `${SHOTS}/oqa2-ogun-road.png` });
  for (const [id, spoken, line3] of [
    // OG-R42: a coming-soon stop is spoken "{name}. {line} Coming soon."; line 3 shows on its plate.
    ['wayOn', 'The way on. The road to the rest of Nigeria is still being built. Coming soon.', 'More of Nigeria'],
    ['border', 'Border market. A busy market road. Coming soon.', 'More soon'],
  ] as const) {
    const stop = page.locator(`[data-where="${id}"]`);
    await expect(stop).toHaveAttribute('aria-label', spoken);
    await expect(stop).toContainText(line3);
    await stop.tap();
    const card = page.locator('[role="dialog"]').last();
    await expect(card).toContainText('Coming soon');
    await expect(card.locator('button.go')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  }
  await page.locator('[data-where="toLagos"]').tap();
  const card = page.locator('[role="dialog"]').last();
  await expect(card).toBeVisible();
  console.log(`To Lagos card: ${(await card.innerText()).replace(/\s+/g, ' ')}`);
  await waitOutTapLock(page);
  await card.locator('button.go').tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('city');
  await expect.poll(async () => (await saved(page)).where).toBe('lagos');
  expect(errors).toEqual([]);
});

test('qa O2 road: the Expressway: reaching the bus stop saves its best and goal under states.ogun.lane; Lagos\'s lane save is untouched; "Back to Ogun"', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await open(page, BUSY, BUSY_OGUN);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="expressway"]').tap();
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Side road: Expressway' }).getByRole('button', { name: 'Run the Expressway' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage), { timeout: 20_000 }).toBe('play');
  expect(await page.evaluate(() => window.__lane!.theme)).toBe('expressway');
  await page.evaluate(() => window.__lane!.warp(300));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/oqa2-expressway.png` });
  await page.evaluate(() => {
    window.__lane!.warp(700);
  });
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? 'gone'), { timeout: 20_000 }).not.toBe('play');
  await page.waitForTimeout(1500);
  const s = await saved(page);
  console.log(`after the Expressway: states.ogun.lane ${JSON.stringify(s.states.ogun.lane)}, lane ${JSON.stringify(s.lane)}; stage ${await page.evaluate(() => window.__lane?.stage)}`);
  expect((s.states.ogun.lane?.['best'] as number) ?? 0).toBeGreaterThanOrEqual(600);
  expect(s.states.ogun.lane?.['goals']).toBe(1);
  expect(s.lane).toMatchObject(LANE);
  const home = page.getByRole('button', { name: /Back to Ogun|Take it home/ }).first();
  await waitOutTapLock(page);
  await home.tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  expect(errors).toEqual([]);
});

test('qa O2 lane: Lagos\'s lane run draws its roadside and the bus stop goal (O6b fix), screenshots', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = errorsOf(page);
  await page.goto('./?level=lagos-lane');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: BUSY }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => page.evaluate(() => window.__lane?.stage ?? null), { timeout: 20_000 }).toBe('play');
  expect(await page.evaluate(() => window.__lane!.level)).toBe('lagos-lane');
  await page.evaluate(() => {
    window.__lane!.warp(300);
    window.__lane!.setGap(60);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/oqa2-lagos-lane-300.png` });
  const end = await page.evaluate(() => window.__lane!.things.length);
  await page.evaluate(() => window.__lane!.warp(585));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/oqa2-lagos-lane-goal.png` });
  console.log(`Lagos lane: things ahead at 300 m: ${end}`);
  expect(errors).toEqual([]);
});
