/**
 * qa O7 (docs/plan.md O7; docs/ogun.md 1.8, part 8, 9.2; OG-R35 to OG-R44): checks beside the long
 * journey in qa-o7.spec.ts:
 * - old saves of every shape the unit and e2e tests know (v1, v2 without `where`, `lane` or Ogun,
 *   an old city with only money, odd values) load safely, open Ogun once the Lagos hall is won, and
 *   Lagos's part is never rewritten by opening Ogun;
 * - a broken states.ogun (number, text, list, null, odd fields): Ogun opens as new, Lagos is left alone;
 * - the play screens of an Ogun street and Pothole Hall at every size, with and without 24 px edges;
 * - QA-O2-4 (known, shared with Lagos): at 320 x 240 with 24 px edges the city's top and bottom rows
 *   meet (test.fail until fixed);
 * - screen reader names of the new buttons (city rows, pins, boards, road stops, Travel places).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const D = { done: true, best: 100 };
const STREETS = { 1: D, 2: D, 3: D };
const HALL = { done: true, best: 0 };

type Obj = Record<string, unknown>;
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? 'null') as Obj | null);
const errorsOf = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

async function openWith(page: Page, progress: string, extra: Record<string, string> = {}): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.clear();
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: progress, extra },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toMatch(/^(city|ogun)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

/** From Lagos's city by Travel to Ogun (downloading if asked, no ride), to Ogun's city. */
async function toOgun(page: Page): Promise<void> {
  if ((await screenNow(page)) === 'city') {
    await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).tap();
    await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').tap();
  }
  const dl = page.locator('.download-card').getByRole('button', { name: 'Download' });
  await expect.poll(async () => (await dl.count()) > 0 || (await screenNow(page)) === 'ogun', { timeout: 15_000 }).toBe(true);
  if ((await dl.count()) > 0) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await dl.tap();
  }
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  const arrival = page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' });
  if ((await arrival.count()) > 0) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await arrival.getByRole('button', { name: "Let's go" }).tap();
  }
  await expect(page.locator('.ogun-city')).toBeVisible();
}

const OLD: { name: string; p: Obj | string; hallWon: boolean; lagos?: Obj }[] = [
  { name: 'v1, street 1 only (city.spec)', p: { v: 1, states: { lagos: { streets: { 1: { done: true, best: 87 } }, parcel: false, hall: { done: false, best: 0 } } } }, hallWon: false },
  { name: 'v1, all of Lagos, no city', p: { v: 1, states: { lagos: { streets: STREETS, parcel: true, hall: HALL } } }, hallWon: true },
  { name: 'v1, odd values (progress.test)', p: { v: 1, states: { lagos: { streets: { 1: { done: 'yes', best: -4 }, 2: null, 3: { done: true, best: 'lots' } }, parcel: 'true', hall: 5 } } }, hallWon: false },
  { name: 'v2, old city with money only', p: { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL } }, city: { kobo: 5000, power: 2, tech: 1, fixed: [], fixes: 0 } }, hallWon: true },
  {
    name: 'v2, Lagos city with places and lane, no where',
    p: { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL } }, city: { kobo: 2500, power: 4, tech: 3, fixed: ['potholes', 'lightsOut'], fixes: 2, paid: { noLights: 3 }, built: ['buka'], trays: { buka: 30 }, boom: 12, hints: ['walk', 'tax'] }, lane: { best: 300, goals: 0 } },
    hallWon: true,
  },
  { name: 'v2, where ogun but Lagos hall not won', p: { v: 2, states: { lagos: { streets: STREETS, parcel: false } }, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0 }, where: 'ogun' }, hallWon: false },
  { name: 'v2, where odd', p: { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL } }, where: 7 }, hallWon: true },
];

for (const o of OLD) {
  test(`qa O7 old save (${o.name}): loads safely, opens where it should, and Ogun only once the Lagos hall is won; Lagos's part is not rewritten`, async ({ page }) => {
    const errors = errorsOf(page);
    const raw = JSON.stringify(o.p);
    await openWith(page, raw);
    expect(await screenNow(page), 'an old save opens Lagos').toBe('city');
    const lagosCard = page.getByRole('dialog', { name: 'Lagos' });
    await expect(lagosCard).toBeVisible();
    await expect(lagosCard.getByRole('button', { name: 'Travel' })).toHaveCount(o.hallWon ? 1 : 0);
    const before = (await saved(page)) ?? {};
    const lagosBefore = JSON.stringify((before['states'] as Obj | undefined)?.['lagos'] ?? null);
    if (o.hallWon) {
      await toOgun(page);
      const after = (await saved(page))!;
      expect(JSON.stringify((after['states'] as Obj)['lagos'] ?? null), "Lagos's part as it was").toBe(lagosBefore);
      expect(after['where']).toBe('ogun');
      // And back to Lagos with no loss.
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await page.locator('.ogun-city').getByRole('button', { name: 'Travel' }).tap();
      await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="lagos"]').tap();
      await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('city');
    }
    expect(errors).toEqual([]);
  });
}

const BROKEN_OGUN: unknown[] = [7, 'x', [], null, { streets: 5, city: 'z', hall: [], arrived: 'yes', parcel: 'no', lane: 3 }, { streets: { 1: { done: 'yes', best: 'lots' }, 9: D }, city: { fixed: 'all', built: [1, 2], trays: 'full', boom: -5, kobo: 99999 } }];
for (const [i, broken] of BROKEN_OGUN.entries()) {
  test(`qa O7 broken states.ogun #${i + 1} (${JSON.stringify(broken).slice(0, 50)}): Ogun opens as new or as far as it can read, no crash; Lagos and the one wallet are left alone`, async ({ page }) => {
    const errors = errorsOf(page);
    const city = { kobo: 1234, power: 5, tech: 2, fixed: ['potholes'], fixes: 1, paid: {}, built: [], trays: {}, boom: 4, hints: ['walk'] };
    const lagos = { streets: STREETS, parcel: false, hall: HALL };
    await openWith(page, JSON.stringify({ v: 2, states: { lagos, ogun: broken }, city, where: 'ogun' }), { 'gidi-busRide': 'false' });
    await toOgun(page);
    // A broken Ogun city never adds money: the wallet is the top-level one only.
    await expect(page.locator('.ogun-city .chip-naira')).toContainText('₦12.34');
    // The city works: open the Bad road card and the road.
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').tap();
    await expect(page.getByRole('dialog', { name: 'Bad road' }).getByText('King Pothole is blocking the gateway.')).toBeVisible();
    await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Back' }).tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
    await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
    const s = (await saved(page))!;
    expect((s['states'] as Obj)['lagos']).toEqual(lagos);
    expect(s['city']).toMatchObject({ kobo: 1234, power: 5, tech: 2, fixed: ['potholes'], fixes: 1 });
    expect(errors).toEqual([]);
  });
}

// ---------- Sizes of the play screens (item 5) ----------
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;
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
type Box = { t: string; x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

for (const level of ['ogun-1', 'ogun-2', 'ogun-3', 'ogun-hall']) {
  test(`qa O7 sizes: ${level}'s play screen (touch buttons, Pause, chips) at every size with and without 24 px edges`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = errorsOf(page);
    await openWith(page, JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS } }, city: { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0 }, where: 'ogun' }), { 'gidi-busRide': 'false' });
    await page.goto(`./?level=${level}`);
    await page.getByRole('button', { name: 'Play' }).tap();
    await expect.poll(() => screenNow(page), { timeout: 20_000 }).toBe('play');
    await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
    expect(await page.evaluate(() => window.__game!.level.id)).toBe(level);
    const found: string[] = [];
    for (const size of SIZES)
      for (const safe of [0, 24]) {
        await page.setViewportSize(size);
        await setSafe(page, safe);
        await settle(page);
        await page.waitForTimeout(150);
        const at = `${level} ${size.width}x${size.height}${safe ? ' safe 24' : ''}`;
        if (process.env['QA_SHOTS'] && (size.width === 320 || size.width === 640)) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-play-${at.replace(/[^\w]+/g, '-')}.png` });
        const l = await page.evaluate(() => ({
          vw: innerWidth,
          vh: innerHeight,
          sw: document.documentElement.scrollWidth,
          canvas: (() => {
            const r = document.querySelector('canvas')!.getBoundingClientRect();
            return { w: r.width, h: r.height };
          })(),
          buttons: [...document.querySelectorAll<HTMLElement>('button, [role="button"]')]
            .filter((b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden' && !b.closest('[hidden]'))
            .map((b) => {
              const r = b.getBoundingClientRect();
              return { t: b.getAttribute('aria-label') || (b.textContent ?? '').trim() || b.className, x: r.x, y: r.y, w: r.width, h: r.height };
            }),
        }));
        if (l.sw > l.vw + 1) found.push(`${at}: sideways scroll`);
        if (l.canvas.w < l.vw - 1 && l.canvas.h < l.vh - 1) found.push(`${at}: the picture does not fill the screen (${l.canvas.w}x${l.canvas.h})`);
        for (const b of l.buttons) {
          if (b.w < 43.5 || b.h < 43.5) found.push(`${at}: "${b.t}" is ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
          if (b.x < safe - 0.5 || b.x + b.w > l.vw - safe + 0.5 || b.y < safe - 0.5 || b.y + b.h > l.vh - safe + 0.5) found.push(`${at}: "${b.t}" outside the safe area`);
        }
        for (let i = 0; i < l.buttons.length; i++) for (let j = i + 1; j < l.buttons.length; j++) if (overlaps(l.buttons[i]!, l.buttons[j]!)) found.push(`${at}: "${l.buttons[i]!.t}" overlaps "${l.buttons[j]!.t}"`);
      }
    await setSafe(page, 0);
    await page.setViewportSize({ width: 851, height: 393 });
    console.log(`${level}: ${found.length} faults\n  ${found.join('\n  ')}`);
    test.info().annotations.push({ type: 'play size faults', description: found.join(' | ') || 'none' });
    expect(found).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// ---------- QA-O2-4 (known, open) ----------
for (const where of ['lagos', 'ogun'] as const) {
  test(`qa O7 QA-O2-4 (open bug, shared with Lagos): ${where}'s city at 320 x 240 with 24 px safe edges: the top and bottom button rows do not meet`, async ({ page }) => {
    test.fail(true, 'QA-O2-4: at 320 x 240 with 24 px safe edges the city top row (chips, Sound, Settings) and bottom row (Challenge road, Travel, Hero, wheel) overlap');
    const errors = errorsOf(page);
    await openWith(page, JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true } }, city: { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] }, where }), { 'gidi-busRide': 'false' });
    if (where === 'ogun') await toOgun(page);
    await page.setViewportSize({ width: 320, height: 240 });
    await setSafe(page, 24);
    await settle(page);
    const card = where === 'ogun' ? page.locator('.ogun-city') : page.getByRole('dialog', { name: 'Lagos' });
    const boxes = await card.locator('button:visible').evaluateAll((els) =>
      els
        .filter((b) => !b.closest('.city-stage'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { t: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?', x: r.x, y: r.y, w: r.width, h: r.height };
        }),
    );
    const meets: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i]!, boxes[j]!)) meets.push(`"${boxes[i]!.t}" / "${boxes[j]!.t}" (${Math.min(boxes[i]!.y + boxes[i]!.h, boxes[j]!.y + boxes[j]!.h) - Math.max(boxes[i]!.y, boxes[j]!.y)} px)`);
    if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-qa-o2-4-${where}.png` });
    console.log(`QA-O2-4 ${where}: ${meets.join('; ') || 'none'}`);
    test.info().annotations.push({ type: 'QA-O2-4', description: meets.join('; ') || 'none' });
    expect(errors).toEqual([]);
    expect(meets).toEqual([]);
  });
}

// ---------- Screen reader names (item 7) ----------
test('qa O7 a11y: every new Ogun button has a name a screen reader says; pins say problem or fixed; the road list in order', async ({ page }) => {
  const errors = errorsOf(page);
  await openWith(page, JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: { 1: D } } }, city: { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] }, where: 'ogun' }), { 'gidi-busRide': 'false' });
  await toOgun(page);
  const city = page.locator('.ogun-city');
  const names = await city.locator('button').evaluateAll((els) => els.map((b) => ({ name: (b.getAttribute('aria-label') ?? b.textContent ?? '').trim(), shown: b.getClientRects().length > 0 })));
  const nameless = names.filter((n) => n.shown && !n.name);
  expect(nameless, 'every button shown has a name').toEqual([]);
  await expect(city.locator('.city-pin[data-spot="badRoad"]')).toHaveAttribute('aria-label', 'Bad road, problem');
  await expect(city.locator('.city-pin[data-spot="potholes"]')).toHaveAttribute('aria-label', /^Potholes, (problem|ready to fix)$/);
  for (const b of ['potholes', 'adire', 'dryTaps', 'lightsOut', 'slowInternet']) {
    const label = (await city.locator(`[data-build="${b}"]`).getAttribute('aria-label')) ?? (await city.locator(`[data-build="${b}"]`).textContent());
    expect(label?.trim(), `board ${b} has a name`).toBeTruthy();
  }
  await expect(page.getByRole('dialog', { name: 'Ogun', exact: true }).getByRole('img', { name: 'Ogun from above. Tap where you want to go.' })).toHaveCount(1);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await city.getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  const stops = await page.locator('.road-stop').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
  console.log(stops.join('\n'));
  test.info().annotations.push({ type: 'road spoken', description: stops.join(' | ') });
  for (const s of stops) expect(s).toBeTruthy();
  expect(stops.find((s) => s.startsWith('The way on'))).toBe('The way on. The road to the rest of Nigeria is still being built. Coming soon.');
  expect(stops.find((s) => s.startsWith('Border market'))).toBe('Border market. A busy market road. Coming soon.');
  expect(errors).toEqual([]);
});

test('qa O7 OG-R41 (QA-O7-1, fixed): Pothole Hall\'s road card picture is spoken "Pothole Hall, with its road cones."; its crop shows the roof and three cones at 320 x 240', async ({ page }) => {
  const errors = errorsOf(page);
  await openWith(page, JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS } }, city: { kobo: 500, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] }, where: 'ogun' }), { 'gidi-busRide': 'false' });
  await toOgun(page);
  await page.setViewportSize({ width: 320, height: 240 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="hall"]').tap();
  const hall = page.locator('.road-card');
  await expect(hall).toBeVisible();
  await page.waitForTimeout(500);
  if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-hall-road-card-320.png` });
  const spoken = await hall.locator('[role="img"]').getAttribute('aria-label');
  console.log(`hall card picture spoken: ${spoken}`);
  test.info().annotations.push({ type: 'hall card picture', description: spoken ?? '' });
  expect(errors).toEqual([]);
  expect(spoken).toBe('Pothole Hall, with its road cones.');
});

// ---------- QA-O7-2 (open, shared with Lagos) ----------
for (const where of ['lagos', 'ogun'] as const) {
  test(`qa O7 QA-O7-2 (open bug, shared with Lagos): ${where}'s side road card fits 640 x 200 whole, its buttons in view with no scroll`, async ({ page }) => {
    test.fail(true, 'QA-O7-2: at 640 x 200 the side road card is taller than the room (Lagos 190 in 184 px, Ogun 198 in 184; with 24 px edges 136 px and the buttons are scrolled out of sight)');
    const errors = errorsOf(page);
    const city = { kobo: 5000, power: 3, tech: 1, fixed: ['potholes'], fixes: 1, built: ['buka'], trays: {}, boom: 8, hints: ['walk', 'bright', 'buka', 'collect', 'road', 'tax'] };
    await openWith(page, JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL }, ogun: { arrived: true, streets: STREETS, hall: HALL } }, city, lane: { best: 700, goals: 1 }, where }), { 'gidi-busRide': 'false' });
    if (where === 'ogun') await toOgun(page);
    await page.locator(where === 'ogun' ? '.ogun-city' : '.city-card').getByRole('button', { name: 'Challenge road' }).first().tap();
    await expect(page.locator('.road-stop').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator(`[data-where="${where === 'ogun' ? 'expressway' : 'lane'}"]`).tap();
    const card = page.locator('.road-card');
    await expect(card).toBeVisible();
    await page.setViewportSize({ width: 640, height: 200 });
    await settle(page);
    if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-qa-o7-2-${where}-640x200.png` });
    const m = await card.evaluate((c) => ({ sh: c.scrollHeight, ch: c.clientHeight }));
    const go = (await card.locator('.go').boundingBox())!;
    console.log(`QA-O7-2 ${where}: card ${m.sh} in ${m.ch} px; big button bottom ${(go.y + go.height).toFixed(0)} of 200`);
    test.info().annotations.push({ type: 'QA-O7-2', description: `${where}: card ${m.sh} in ${m.ch} px` });
    expect(errors).toEqual([]);
    expect(m.sh).toBeLessThanOrEqual(m.ch + 1);
    expect(go.y + go.height).toBeLessThanOrEqual(200);
  });
}

// ---------- Keys only, reduced motion, Sound and Music off, Gentle (item 7) ----------
test('qa O7 a11y: keys only with reduced motion, Sound and Music off and Gentle: Travel, download, arrival, Ogun\'s city, the Bad road card, Ota with 5 lives, Pause, home, the road; greyscale pictures', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const w = window as unknown as { __nodes: number };
    w.__nodes = 0;
    for (const name of ['createOscillator', 'createBufferSource'] as const) {
      const make = AudioContext.prototype[name] as (this: AudioContext) => AudioNode;
      (AudioContext.prototype as unknown as Record<string, unknown>)[name] = function (this: AudioContext) {
        w.__nodes++;
        return make.call(this);
      };
    }
  });
  const errors = errorsOf(page);
  const city = { kobo: 2000, power: 0, tech: 0, fixed: [], fixes: 0, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      localStorage.setItem('gidi-gentle', 'true');
      localStorage.setItem('gidi-sound', 'false');
      localStorage.setItem('gidi-music', 'false');
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: HALL } }, city }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const atStart = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Travel' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'Where to?' }).locator('[data-state="ogun"]').focus();
  await page.keyboard.press('Enter');
  const dl = page.locator('.download-card').getByRole('button', { name: 'Download' });
  await expect(dl).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  const arrival = page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' });
  await expect(arrival.getByRole('button', { name: "Let's go" })).toBeFocused();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.keyboard.press('Enter');
  await expect(arrival).toHaveCount(0);
  // The phone profile is a touch phone, so the touch words show (the keys words are for a phone with no touch: unit tests).
  await expect(page.locator('.ogun-city .city-hint')).toHaveText(/^(Tap where you want to go|Use the arrow keys to walk)\. Walk onto a board to pay\.$/);
  await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
  if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-grey-ogun-city.png` });
  await page.evaluate(() => (document.documentElement.style.filter = ''));
  await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').focus();
  await page.keyboard.press('Enter');
  const bad = page.getByRole('dialog', { name: 'Bad road' });
  await expect(bad).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bad).toHaveCount(0);
  await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').focus();
  await page.keyboard.press('Enter');
  await bad.getByRole('button', { name: 'Run Ota' }).focus();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.keyboard.press('Enter');
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-1');
  expect(await page.evaluate(() => window.__game!.run.lives), 'Gentle: 5 lives').toBe(5);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__game!.hero.x)).toBeGreaterThan(150);
  await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
  if (process.env['QA_SHOTS']) await page.screenshot({ path: `${process.env['QA_SHOTS']}/o7-grey-ota.png` });
  await page.evaluate(() => (document.documentElement.style.filter = ''));
  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Home' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('.ogun-city').getByRole('button', { name: 'Challenge road' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.road-stop')).toHaveCount(8, { timeout: 15_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="ota"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.road-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.road-card')).toHaveCount(0);
  const nodes = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  console.log(`keys pass: sound nodes ${nodes - atStart} with Sound and Music off`);
  expect(nodes - atStart, 'no sound with Sound and Music off').toBe(0);
  expect(errors).toEqual([]);
});
