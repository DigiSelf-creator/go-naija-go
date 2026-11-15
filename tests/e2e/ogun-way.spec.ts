/**
 * O1b2 (docs/ogun.md parts 1 and 8): the way from Lagos to Ogun on the phone profile. The Travel
 * button and card, the web download card (Not now, Download, no internet), the bus ride (Skip,
 * reduced motion, "Show the bus ride" off), the arrival card once, the "To Ogun" road stop, the
 * wheel's line and pennant, the Settings line, and opening on the city last used, offline too.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const STREETS = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
/** Go-Slow Hall won: Ogun is open (ogun.md 1.1). */
const HALL_WON = { v: 2, states: { lagos: { streets: STREETS, parcel: false, hall: { done: true, best: 0 } } }, city: CITY };
const NO_HALL = { v: 2, states: { lagos: { streets: STREETS, parcel: false } }, city: CITY };

const isOgun = (url: string): boolean => /\/worlds\/ogun\//.test(new URL(url).pathname);
const errorsOf = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { where?: string; states?: { ogun?: { arrived?: boolean } } });

/** A saved hero and progress, then "Play" (the city last used). */
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
  await play(page);
}
async function play(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toMatch(/^(city|ogun)$/);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const lagos = (page: Page) => page.getByRole('dialog', { name: 'Lagos' });
const travelCard = (page: Page) => page.getByRole('dialog', { name: 'Where to?' });
const ogunCard = (page: Page) => page.getByRole('dialog', { name: 'Ogun' });

test.describe('on the web, before the Ogun part is on the phone', () => {
  test.use({ serviceWorkers: 'block' });

  test('locked: no Travel button, the "To Ogun" stop says how to open it, and nothing is fetched', async ({ page, context }) => {
    const errors = errorsOf(page);
    const asked: string[] = [];
    context.on('request', (r) => {
      if (isOgun(r.url())) asked.push(r.url());
    });
    await open(page, NO_HALL);
    await expect(lagos(page).getByRole('button', { name: 'Travel' })).toHaveCount(0);
    await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
    const road = page.getByRole('region', { name: 'Challenge road' });
    await expect(road).toBeVisible();
    const stop = road.locator('[data-where="ogun"]');
    await expect(stop).toHaveAttribute('aria-label', 'To Ogun. Locked. Win Go-Slow Hall to open the road to Ogun.');
    await expect(stop).toContainText('Win Go-Slow Hall');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    // A locked stop is aria-disabled (Playwright will not tap it): Enter opens its card, as a tap does.
    await stop.focus();
    await page.keyboard.press('Enter');
    const card = page.getByRole('dialog', { name: 'To Ogun' });
    await expect(card.getByText('Win Go-Slow Hall to open the road to Ogun.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Go to Ogun' })).toHaveCount(0);
    expect(asked).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('Travel, Not now, Download, the bus ride with Skip, the arrival card once, then home again by bus', async ({ page, context }) => {
    const errors = errorsOf(page);
    const asked: string[] = [];
    context.on('request', (r) => {
      if (isOgun(r.url())) asked.push(r.url());
    });
    await open(page, HALL_WON);
    // The Travel button sits between "Challenge road" and "Hero".
    const row = await lagos(page).locator('.city-buttons button').allTextContents();
    expect(row.map((t) => t.trim())).toEqual(['Challenge road', 'Travel', 'Hero', "Nigeria's wheel"]);
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    const t = travelCard(page);
    await expect(t).toBeVisible();
    await expect(t.getByRole('heading', { name: 'Where to?' })).toBeVisible();
    const places = t.locator('.travel-place');
    expect(await places.evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual(['Lagos. Booming 0 of 20. Cog turning. You are here.', 'Ogun. Booming 0 of 20.']);
    await expect(places.first()).toContainText('You are here');
    await expect(places.first()).toContainText('Booming: 0 of 20 ✓');
    for (const b of await places.all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(140);
      expect(box.height).toBeGreaterThanOrEqual(72);
    }
    // "You are here" just closes the card; Back closes it too.
    await places.first().tap();
    await expect(t).toHaveCount(0);
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).getByRole('button', { name: 'Back' }).tap();
    await expect(travelCard(page)).toHaveCount(0);
    expect(asked).toEqual([]);

    // Ogun: the download card (web), word for word. Not now asks for nothing.
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).locator('[data-state="ogun"]').tap();
    const dl = page.locator('.download-card');
    await expect(dl.getByText('Ogun is ready to download (about 130 KB).')).toBeVisible();
    await expect(dl.getByText('After this it plays with no internet.')).toBeVisible();
    await expect(dl.getByRole('button', { name: 'Download' })).toBeFocused();
    await dl.getByRole('button', { name: 'Not now' }).tap();
    await expect(dl).toHaveCount(0);
    expect(asked).toEqual([]);
    expect(await screenNow(page)).toBe('city');

    // Download: the part comes, the bus ride plays; Skip ends it; the arrival card shows.
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).locator('[data-state="ogun"]').tap();
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    expect(asked.length).toBeGreaterThan(0);
    await expect(page.getByRole('img', { name: 'A yellow bus drives under the gateway arch into Ogun.' })).toBeVisible();
    const skip = page.getByRole('button', { name: 'Skip' });
    const sb = (await skip.boundingBox())!;
    expect(sb.width).toBeGreaterThanOrEqual(44);
    expect(sb.height).toBeGreaterThanOrEqual(44);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await skip.tap();
    await expect.poll(() => screenNow(page)).toBe('ogun');
    const arrival = page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' });
    await expect(arrival.getByText('The road to the rest of Nigeria runs through here.')).toBeVisible();
    await expect(arrival.getByText('King Pothole has dug in at the gateway. Fix Ogun, and the way opens.')).toBeVisible();
    const go = arrival.getByRole('button', { name: "Let's go" });
    await expect(go).toBeFocused();
    expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    expect((await saved(page)).where).toBe('ogun');
    expect((await saved(page)).states?.ogun?.arrived).not.toBe(true);
    // Escape closes it like the button, and it is saved as seen.
    await page.keyboard.press('Escape');
    await expect(arrival).toHaveCount(0);
    expect((await saved(page)).states?.ogun?.arrived).toBe(true);
    await expect(ogunCard(page).getByText('Ota, the first street on the road from Lagos, is coming next.')).toBeVisible();

    // Reload: "Play" opens Ogun again, with no ride and no arrival card.
    await page.reload();
    await play(page);
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await expect(page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' })).toHaveCount(0);

    // Home to Lagos by bus (the short ride, under the arch's back).
    await ogunCard(page).getByRole('button', { name: 'Travel' }).tap();
    expect(await travelCard(page).locator('.travel-place').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual(['Lagos. Booming 0 of 20. Cog turning.', 'Ogun. Booming 0 of 20. You are here.']);
    await travelCard(page).locator('[data-state="lagos"]').tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    await expect(page.getByRole('img', { name: 'A yellow bus drives back under the arch to Lagos.' })).toBeVisible();
    // It ends by itself (2 s and a moment).
    await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe('city');
    expect((await saved(page)).where).toBe('lagos');
    expect(errors).toEqual([]);
  });

  test('no internet: the download card says so, OK closes it, and Lagos still plays', async ({ page }) => {
    const errors = errorsOf(page);
    await open(page, HALL_WON);
    await page.route(/\/worlds\/ogun\//, (route) => route.abort('internetdisconnected'));
    await page.context().setOffline(true);
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).locator('[data-state="ogun"]').tap();
    const dl = page.locator('.download-card');
    await dl.getByRole('button', { name: 'Download' }).tap();
    await expect(dl.getByText('Ogun needs the internet once to download. Lagos still works with no internet.')).toBeVisible();
    await dl.getByRole('button', { name: 'OK' }).tap();
    await expect(dl).toHaveCount(0);
    expect(await screenNow(page)).toBe('city');
    expect((await saved(page)).where).not.toBe('ogun');
    expect(errors).toEqual([]);
  });

  test('a broken part: plain words and OK; no crash', async ({ page }) => {
    const errors = errorsOf(page);
    await open(page, HALL_WON);
    await page.route(/\/worlds\/ogun\//, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export const part = { id: "ogun", version: 99 };' }));
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).locator('[data-state="ogun"]').tap();
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect(page.locator('.download-card').getByText('Ogun could not open just now. Lagos still works. Try again later.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the "To Ogun" stop opens after the hall and goes by bus; reduced motion shows the end picture only', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, HALL_WON);
    await lagos(page).getByRole('button', { name: 'Challenge road' }).tap();
    const road = page.getByRole('region', { name: 'Challenge road' });
    const stop = road.locator('[data-where="ogun"]');
    await expect(stop).toHaveAttribute('aria-label', 'To Ogun. Open. The road to Ogun is open.');
    const list = await road.getByRole('list', { name: 'Challenge road stops' }).getByRole('button').allTextContents();
    expect(list.findIndex((x) => x.includes('To Ogun'))).toBe(list.findIndex((x) => x.includes('Go-Slow Hall')) + 1);
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await stop.tap();
    const card = page.getByRole('dialog', { name: 'To Ogun' });
    await expect(card.getByText('The road to Ogun is open.')).toBeVisible();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await card.getByRole('button', { name: 'Go to Ogun' }).tap();
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    await expect.poll(() => screenNow(page)).toBe('ride');
    // Reduced motion: the end picture, still; it goes on by itself after 1.5 s.
    const a = await page.locator('.ride-pic').screenshot();
    await page.waitForTimeout(300);
    const b = await page.locator('.ride-pic').screenshot();
    expect(a.equals(b)).toBe(true);
    await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe('ogun');
  });

  test('the wheel: "Next: Ogun" with the pennant; Settings: the saved line and "Show the bus ride" off skips the ride', async ({ page }) => {
    await open(page, { ...HALL_WON, states: { ...HALL_WON.states, ogun: { arrived: true } } });
    await lagos(page).getByRole('button', { name: "Nigeria's wheel" }).tap();
    const wheel = page.getByRole('dialog', { name: "Nigeria's wheel" });
    await expect(wheel.getByText('Next: Ogun, the Gateway State.').first()).toBeAttached();
    await expect(wheel.locator('.gdw-pennant')).toHaveCount(1);
    await expect(wheel.getByRole('listitem').filter({ hasText: 'Ogun, next' })).toHaveCount(1);
    await wheel.getByRole('button', { name: 'Back' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await lagos(page).getByRole('button', { name: 'Settings' }).tap();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings.getByText('Your hero, Lagos and Ogun are saved on this phone.')).toBeVisible();
    const sw = settings.getByRole('switch', { name: 'Show the bus ride: on' });
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.tap();
    await expect(settings.getByRole('switch', { name: 'Show the bus ride: off' })).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => localStorage.getItem('gidi-busRide'))).toBe('false');
    await settings.getByRole('button', { name: 'Back' }).tap();
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await lagos(page).getByRole('button', { name: 'Travel' }).tap();
    await travelCard(page).locator('[data-state="ogun"]').tap();
    await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
    // Straight to Ogun: no ride, and no arrival card (it was closed before).
    await expect.poll(() => screenNow(page)).toBe('ogun');
    await expect(page.getByRole('dialog', { name: 'Welcome to Ogun, the Gateway State!' })).toHaveCount(0);
  });
});

test('after one visit Ogun opens offline with no download card, and the game opens on it', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ ...HALL_WON, states: { ...HALL_WON.states, ogun: { arrived: true } } }) },
  );
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await play(page);
  await lagos(page).getByRole('button', { name: 'Travel' }).tap();
  await travelCard(page).locator('[data-state="ogun"]').tap();
  await page.locator('.download-card').getByRole('button', { name: 'Download' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  await page.getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) if (new URL(r.url).pathname.includes('/worlds/ogun/')) return true;
        return false;
      }),
    )
    .toBe(true);

  // Offline, a fresh start: "Play" opens Ogun (the city last used) straight from the phone.
  await context.setOffline(true);
  await page.reload();
  await play(page);
  await expect.poll(() => screenNow(page)).toBe('ogun');
  // Back to Lagos and to Ogun again offline: no download card (the part is on the phone).
  await ogunCard(page).getByRole('button', { name: 'Travel' }).tap();
  await travelCard(page).locator('[data-state="lagos"]').tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  await page.getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await lagos(page).getByRole('button', { name: 'Travel' }).tap();
  await travelCard(page).locator('[data-state="ogun"]').tap();
  await expect.poll(() => screenNow(page)).toBe('ride');
  await expect(page.locator('.download-card')).toHaveCount(0);
});
