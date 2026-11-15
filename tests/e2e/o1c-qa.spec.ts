/**
 * O1c (qa of O1b1, CO3 and O1b2; docs/ogun.md parts 1, 8 and 9): break attempts on the way from
 * Lagos to Ogun that ogun-way.spec.ts and ogun-part.spec.ts do not cover:
 * - the download card: a double tap on Download, leaving while it downloads;
 * - the bus ride: a tap, then a second tap; Enter; Escape; the first ride long, later rides short;
 *   the welcome tune only with Sound and Music on;
 * - the Travel card's Booming numbers; one wallet across a round trip; a broken states.ogun;
 * - Android back on the download card opened from the road (the native back table's labels);
 * - every button of the new screens at 320 x 240 to 1920 x 1080, 44 px or more, inside the safe edges;
 * - CO3: "Opening the road..." when the road's files are late, and a road that cannot load;
 * - the 4x CPU bus ride (title says "slowed": the perf project runs it alone).
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 12345, power: 3, tech: 2, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'], boom: 7 };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const LAGOS = { streets: STREETS, parcel: false, hall: { done: true, best: 0 } };
const HALL_WON = { v: 2, states: { lagos: LAGOS }, city: CITY };
const ARRIVED = { v: 2, states: { lagos: LAGOS, ogun: { arrived: true } }, city: CITY };

const isOgun = (url: string): boolean => /\/worlds\/ogun\//.test(new URL(url).pathname);
const SIZES = [
  { width: 320, height: 240 },
  { width: 568, height: 320 },
  { width: 640, height: 200 },
  { width: 851, height: 393 },
  { width: 1920, height: 1080 },
] as const;

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as Record<string, unknown>);

async function open(page: Page, save: object, extra: Record<string, string> = {}): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify(save), extra },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos' });
const travelCard = (page: Page) => page.getByRole('dialog', { name: 'Where to?' });
const ogunCard = (page: Page) => page.getByRole('dialog', { name: 'Ogun', exact: true });

async function travel(page: Page, from: 'lagos' | 'ogun', to: 'lagos' | 'ogun'): Promise<void> {
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await (from === 'lagos' ? lagos(page) : ogunCard(page)).getByRole('button', { name: 'Travel' }).tap();
  await travelCard(page).locator(`[data-state="${to}"]`).tap();
}
/** Download, if the card asks (the part is not loaded yet this visit). */
async function downloadIfAsked(page: Page): Promise<void> {
  const dl = page.locator('.download-card').getByRole('button', { name: 'Download' });
  await expect.poll(async () => (await dl.count()) > 0 || (await screenNow(page)) !== 'city').toBe(true);
  if ((await dl.count()) > 0) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await dl.tap();
  }
}
async function downloadCard(page: Page): Promise<void> {
  await travel(page, 'lagos', 'ogun');
  await expect(page.locator('.download-card')).toBeVisible();
}

/** Every visible button in the layer: at least 44 x 44, inside the window less the safe edges. */
/** Buttons that need a scroll to be seen (the card scrolls): noted, then checked once scrolled to. */
const scrolled: string[] = [];
async function buttonsFit(page: Page, at: string, safe = 0): Promise<void> {
  const below = await page.evaluate((safe) => {
    const out: string[] = [];
    const top = [...document.querySelectorAll<HTMLElement>('.travel-dim')].pop() ?? document.querySelector<HTMLElement>('.screen[data-ui]')!;
    for (const b of top.querySelectorAll<HTMLElement>('button')) {
      if (b.getClientRects().length === 0) continue;
      const x = b.getBoundingClientRect();
      if (x.y < safe - 0.5 || x.bottom > window.innerHeight - safe + 0.5) {
        out.push((b.textContent ?? '').trim());
        b.scrollIntoView({ block: 'nearest' });
      }
    }
    return out;
  }, safe);
  if (below.length) scrolled.push(`${at}: ${below.join(', ')}`);
  const r = await page.evaluate(() => ({
    vw: window.innerWidth,
    vh: window.innerHeight,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    card: (() => {
      const c = [...document.querySelectorAll<HTMLElement>('.travel-dim .card')].pop();
      const x = c?.getBoundingClientRect();
      return x ? { y: x.y, h: x.height } : null;
    })(),
    b: [...([...document.querySelectorAll<HTMLElement>('.travel-dim')].pop() ?? document.querySelector<HTMLElement>('.screen[data-ui]')!).querySelectorAll<HTMLElement>('button')]
      .filter((b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden')
      .map((b) => {
        const x = b.getBoundingClientRect();
        return { t: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?', x: x.x, y: x.y, w: x.width, h: x.height };
      }),
  }));
  expect(r.sw, `${at}: no sideways page scroll`).toBeLessThanOrEqual(r.vw + 1);
  expect(r.b.length, `${at}: buttons`).toBeGreaterThan(0);
  for (const b of r.b) {
    expect(b.h, `${at}: "${b.t}" at least 44 px tall`).toBeGreaterThanOrEqual(44);
    expect(b.w, `${at}: "${b.t}" at least 44 px wide`).toBeGreaterThanOrEqual(44);
    expect(b.x, `${at}: "${b.t}" inside the left edge`).toBeGreaterThanOrEqual(safe - 0.5);
    expect(b.x + b.w, `${at}: "${b.t}" inside the right edge`).toBeLessThanOrEqual(r.vw - safe + 0.5);
    // A card that scrolls clips its buttons itself: then the card's box is checked instead.
    if (below.length) continue;
    expect(b.y, `${at}: "${b.t}" inside the top`).toBeGreaterThanOrEqual(safe - 0.5);
    expect(b.y + b.h, `${at}: "${b.t}" inside the bottom`).toBeLessThanOrEqual(r.vh - safe + 0.5);
  }
  if (below.length) {
    expect(r.card, `${at}: a card`).not.toBeNull();
    expect(r.card!.y, `${at}: the card inside the top`).toBeGreaterThanOrEqual(safe - 0.5);
    expect(r.card!.y + r.card!.h, `${at}: the card inside the bottom`).toBeLessThanOrEqual(r.vh - safe + 0.5);
  }
}
async function everySize(page: Page, name: string): Promise<void> {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await buttonsFit(page, `${name} ${size.width}x${size.height}`);
  }
  // A phone with a notch and rounded corners: 24 px safe edges all round, at the smallest size.
  await page.setViewportSize(SIZES[0]);
  await page.evaluate(() => {
    for (const s of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--safe-${s}`, '24px');
    window.dispatchEvent(new Event('resize'));
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await buttonsFit(page, `${name} 320x240 with 24 px safe edges`, 24);
  await page.evaluate(() => {
    for (const s of ['top', 'right', 'bottom', 'left']) document.documentElement.style.removeProperty(`--safe-${s}`);
  });
  await page.setViewportSize({ width: 851, height: 393 });
}

test.describe('O1c on the web, no service worker', () => {
  test.use({ serviceWorkers: 'block' });

  test('o1c: a double tap on Download fetches each Ogun file once and plays one ride', async ({ page, context }) => {
    const errors = errorsOf(page);
    const asked: string[] = [];
    context.on('request', (r) => {
      if (isOgun(r.url())) asked.push(r.url());
    });
    await open(page, HALL_WON);
    await downloadCard(page);
    const go = page.locator('.download-card').getByRole('button', { name: 'Download' });
    const box = (await go.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => screenNow(page)).toBe('ride');
    expect(await page.locator('.ride-screen').count()).toBe(1);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('button', { name: 'Skip' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await page.waitForTimeout(1000);
    expect(new Set(asked).size).toBe(asked.length);
    expect(await page.locator('.ride-screen').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('o1c: leaving while Ogun downloads (Escape on "Downloading Ogun...") starts no bus ride later', async ({ page }) => {
    // Game bug O1c-1: withOgun() goes on to the ride after the card was closed (menus.ts withOgun:
    // the success path checks only `this.screen !== from`, not that the card is still open).
    test.fail(true, 'O1c-1: the ride starts after the player left the download card');
    const errors = errorsOf(page);
    await open(page, HALL_WON);
    await page.route(/\/worlds\/ogun\//, async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await downloadCard(page);
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect(page.locator('.download-card').getByText('Downloading Ogun...')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.download-card')).toHaveCount(0);
    // The files come in after the player left: Lagos stays, no ride, nothing saved as Ogun.
    await page.waitForTimeout(3500);
    expect(await screenNow(page)).toBe('city');
    expect((await saved(page))['where']).not.toBe('ogun');
    expect(errors).toEqual([]);
  });

  test('o1c: the ride by tap (end picture, then out), by Enter, by Escape; the first ride long, later rides short', async ({ page }) => {
    const errors = errorsOf(page);
    await open(page, HALL_WON);
    // First ride, no input: about 4 s and the end picture 1 s.
    await downloadCard(page);
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    const t0 = Date.now();
    await expect.poll(() => screenNow(page), { timeout: 15_000, intervals: [50] }).toBe('ogun');
    const first = Date.now() - t0;
    await page.getByRole('button', { name: "Let's go" }).tap();

    // Ogun to Lagos, no input: the short ride (2 s and 1 s).
    await travel(page, 'ogun', 'lagos');
    await expect.poll(() => screenNow(page)).toBe('ride');
    const t1 = Date.now();
    await expect.poll(() => screenNow(page), { timeout: 15_000, intervals: [50] }).toBe('city');
    const again = Date.now() - t1;
    test.info().annotations.push({ type: 'ride lengths', description: `first ${first} ms, again ${again} ms` });
    expect(first).toBeGreaterThan(4500);
    expect(again).toBeLessThan(4200);
    expect(first - again).toBeGreaterThan(1200);

    // A tap jumps to the end picture; the ride stays; a second tap ends it.
    await travel(page, 'lagos', 'ogun');
    await expect.poll(() => screenNow(page)).toBe('ride');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.locator('.ride-pic').tap({ position: { x: 100, y: 150 } });
    await page.waitForTimeout(300);
    expect(await screenNow(page)).toBe('ride');
    await page.locator('.ride-pic').tap({ position: { x: 100, y: 150 } });
    await expect.poll(() => screenNow(page)).toBe('ogun');

    // Enter twice: the end picture, then out.
    await travel(page, 'ogun', 'lagos');
    await expect.poll(() => screenNow(page)).toBe('ride');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await screenNow(page)).toBe('ride');
    await page.keyboard.press('Enter');
    await expect.poll(() => screenNow(page)).toBe('city');

    // Escape: out at once.
    await travel(page, 'lagos', 'ogun');
    await expect.poll(() => screenNow(page)).toBe('ride');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await expect.poll(() => screenNow(page), { timeout: 1000 }).toBe('ogun');
    expect(errors).toEqual([]);
  });

  test('o1c: the Travel card shows each state\'s own Booming number; one wallet across a round trip', async ({ page }) => {
    const errors = errorsOf(page);
    const ogun = { arrived: true, city: { boom: 25, boomSeen: 20, kobo: 999999, fixed: [] } };
    await open(page, { ...ARRIVED, states: { lagos: LAGOS, ogun } }, { 'gidi-busRide': 'false' });
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    const labels = () => travelCard(page).locator('.travel-place').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')));
    expect(await labels()).toEqual(['Lagos. Booming 7 of 20. Cog turning. You are here.', 'Ogun. Booming 20 of 20. Cog turning.']);
    await travelCard(page).locator('[data-state="ogun"]').tap();
    await downloadIfAsked(page);
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await ogunCard(page).getByRole('button', { name: 'Travel' }).tap();
    expect(await labels()).toEqual(['Lagos. Booming 7 of 20. Cog turning.', 'Ogun. Booming 20 of 20. Cog turning. You are here.']);
    // Back closes the card onto Ogun, not Lagos.
    await travelCard(page).getByRole('button', { name: 'Back' }).tap();
    expect(await screenNow(page)).toBe('ogun');
    await travel(page, 'ogun', 'lagos');
    await expect.poll(() => screenNow(page)).toBe('city');
    // The one wallet is the top-level one (the stray Ogun kobo is never used) and nothing is lost.
    const s = (await saved(page)) as { city: typeof CITY; states: { lagos: unknown; ogun: { city: { kobo: number } } }; where: string };
    expect(s.city).toMatchObject({ kobo: 12345, power: 3, tech: 2 });
    expect(s.states.lagos).toEqual(LAGOS);
    expect(s.where).toBe('lagos');
    await expect(lagos(page).getByText(/123\.45/).first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  for (const bad of ['"oops"', '[]', '{"arrived":"yes","city":7}']) {
    test(`o1c: a broken states.ogun (${bad}) with "where":"ogun" opens Lagos, and Ogun still works`, async ({ page }) => {
      const errors = errorsOf(page);
      await open(page, { ...HALL_WON, where: 'ogun', states: { lagos: LAGOS, ogun: JSON.parse(bad) } });
      await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun)$/);
      if ((await screenNow(page)) === 'city') {
        await downloadCard(page);
        await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
        await expect.poll(() => screenNow(page)).toBe('ride');
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        await page.getByRole('button', { name: 'Skip' }).tap();
      }
      await expect.poll(() => screenNow(page)).toBe('ogun');
      expect(((await saved(page)) as { states: { lagos: unknown } }).states.lagos).toEqual(LAGOS);
      expect(errors).toEqual([]);
    });
  }

  test('o1c: the welcome tune plays only with Sound and Music on', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __starts: number };
      w.__starts = 0;
      const start = AudioScheduledSourceNode.prototype.start;
      AudioScheduledSourceNode.prototype.start = function (...a: Parameters<typeof start>) {
        if ((window as unknown as { __game?: { screen?: string } }).__game?.screen === 'ride') w.__starts++;
        return start.apply(this, a);
      };
    });
    const during = async (): Promise<number> => {
      await expect.poll(() => screenNow(page)).toBe('ride');
      await page.evaluate(() => ((window as unknown as { __starts: number }).__starts = 0));
      await expect.poll(() => screenNow(page), { timeout: 15_000 }).not.toBe('ride');
      return page.evaluate(() => (window as unknown as { __starts: number }).__starts);
    };
    const results: Record<string, number> = {};
    for (const [name, extra] of [
      ['on', {}],
      ['music off', { 'gidi-music': 'false' }],
      ['sound off', { 'gidi-sound': 'false' }],
    ] as const) {
      await open(page, ARRIVED, extra);
      // A tap first, so the audio can start (as on a phone).
      await travel(page, 'lagos', 'ogun');
      await downloadIfAsked(page);
      results[name] = await during();
    }
    test.info().annotations.push({ type: 'sound starts in the ride', description: JSON.stringify(results) });
    expect(results['on']).toBeGreaterThan(0);
    expect(results['music off']).toBe(0);
    expect(results['sound off']).toBe(0);
  });

  test('o1c: Android back on the download card opened from the road presses "Not now", not the road\'s own button', async ({ page }) => {
    // Game bug O1c-2: the road's "To Ogun" card stays open under the download card, so the back
    // table (cardOut: Back, Not now, OK, Let's go) finds that card's "Back" first.
    test.fail(true, 'O1c-2: Android back presses the hidden road card\'s Back, not "Not now"');
    await open(page, HALL_WON);
    await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
    const road = page.getByRole('region', { name: 'Challenge road' });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await road.locator('[data-where="ogun"]').tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.getByRole('dialog', { name: 'To Ogun' }).getByRole('button', { name: 'Go to Ogun' }).tap();
    await expect(page.locator('.download-card')).toBeVisible();
    // The native back table (src/native/app.ts press()): the first showing button with one of these labels.
    const pressed = await page.evaluate((labels) => {
      const shown = [...document.querySelectorAll<HTMLButtonElement>('[data-ui] button')].filter((b) => b.getClientRects().length > 0);
      for (const l of labels) {
        const b = shown.find((x) => x.textContent?.trim() === l);
        if (b) return `${l} in ${b.closest('[role=dialog],[role=region]')?.getAttribute('aria-label') ?? '?'}`;
      }
      return null;
    }, ['Back', 'Not now', 'OK', "Let's go"]);
    expect(pressed).toBe('Not now in Ogun');
  });

  test('o1c: every new screen at 320 x 240 to 1920 x 1080: buttons 44 px or more, whole, inside the safe edges', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = errorsOf(page);
    await open(page, HALL_WON);
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await everySize(page, 'Travel card');
    await travelCard(page).locator('[data-state="ogun"]').tap();
    await expect(page.locator('.download-card')).toBeVisible();
    await everySize(page, 'download card');
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    // The first ride is long enough to look at it at every size.
    await everySize(page, 'bus ride');
    await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('ogun');
    await everySize(page, 'arrival card');
    await page.getByRole('button', { name: "Let's go" }).tap();
    await everySize(page, "Ogun's place");
    test.info().annotations.push({ type: 'seen only after a scroll', description: scrolled.join(' | ') || 'none' });
    console.log(`seen only after a scroll: ${scrolled.join(' | ') || 'none'}`);
    expect(errors).toEqual([]);
  });

  test('o1c CO3: "Opening the road..." shows while the road is late, then the road comes', async ({ page }) => {
    const errors = errorsOf(page);
    await page.route(/\/assets\/road-[^/]*\.js$/, async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await open(page, HALL_WON);
    await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
    await expect(page.getByRole('status').filter({ hasText: 'Opening the road...' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Challenge road' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Opening the road...')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('o1c CO3: a road that cannot load (offline, never downloaded) leaves the player in Lagos, no crash', async ({ page }) => {
    const errors = errorsOf(page);
    await page.route(/\/assets\/road-[^/]*\.js$/, (route) => route.abort('internetdisconnected'));
    await open(page, HALL_WON);
    await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await expect(lagos(page)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('o1c: the bus ride slowed to 4x CPU has no frame over 100 ms', async ({ page }) => {
    await open(page, HALL_WON);
    const cdp = await page.context().newCDPSession(page);
    await downloadCard(page);
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const gaps = await page.evaluate(
      () =>
        new Promise<number[]>((done) => {
          const out: number[] = [];
          let last = performance.now();
          const step = (now: number): void => {
            out.push(now - last);
            last = now;
            if ((window as unknown as { __game?: { screen?: string } }).__game?.screen === 'ride') requestAnimationFrame(step);
            else done(out);
          };
          requestAnimationFrame(step);
        }),
    );
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const body = gaps.slice(2, -2);
    const avg = body.reduce((a, b) => a + b, 0) / body.length;
    const max = Math.max(...body);
    const long = body.filter((g) => g > 100).length;
    test.info().annotations.push({ type: 'ride at 4x CPU', description: `${body.length} frames, ${(1000 / avg).toFixed(1)} fps, longest ${max.toFixed(0)} ms, ${long} over 100 ms` });
    console.log(`ride at 4x CPU: ${body.length} frames, ${(1000 / avg).toFixed(1)} fps, longest ${max.toFixed(0)} ms, ${long} over 100 ms`);
    expect(long).toBe(0);
    expect(1000 / avg).toBeGreaterThanOrEqual(30);
  });
});

test('o1c CO3: the road opens offline after one visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await open(page, HALL_WON);
  await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
  await expect(page.getByRole('region', { name: 'Challenge road' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Challenge road' }).locator('[data-where="ogun"]')).toHaveAttribute('aria-label', 'To Ogun. Open. The road to Ogun is open.');
});
