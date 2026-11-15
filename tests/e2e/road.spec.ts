/**
 * S3e1b: the challenge road on the phone profile (docs/design.md S3e0 parts 4, 5, 7 to 9): the
 * layout and scroll at each screen size, the stop card's words, "See the stop" from a city card,
 * Back and Escape one step at a time, keys and the screen reader list, the hint once, and the
 * first screen's spoken street name.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect'] };

/** A saved hero and progress, then Lagos from above. */
async function open(page: Page, save: object = { v: 2, states: {}, city: CITY }): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(save) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const road = (page: Page) => page.getByRole('region', { name: 'Challenge road' });
async function toRoad(page: Page): Promise<void> {
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Challenge road' }).tap();
  await expect(road(page)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
const errorsOf = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('the layout at every size: the top row fits, every stop is whole, it scrolls only where part 4 says', async ({ page }) => {
  const errors = errorsOf(page);
  await open(page);
  await toRoad(page);
  // [width, height, scrolls]
  const sizes = [
    [320, 240, true],
    [568, 320, true],
    [640, 360, true],
    [851, 393, false],
    [1920, 1080, false],
    [393, 851, true],
  ] as const;
  for (const [w, h, scrolls] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const box = (e: Element) => e.getBoundingClientRect();
      const sc = document.querySelector('.road-scroll') as HTMLElement;
      sc.scrollLeft = 0;
      const top = [...document.querySelectorAll('.road-top button')].map(box);
      const stops = [...document.querySelectorAll('.road-stop')].map((b) => ({ r: box(b), cut: [...b.querySelectorAll('.road-name, .road-st, .road-l3')].some((s) => s.scrollWidth > s.clientWidth + 1) }));
      const head = box(document.querySelector('.road-top h2')!);
      return {
        top: top.map((r) => ({ w: r.width, h: r.height, right: r.right, bottom: r.bottom })),
        head: { left: head.left, right: head.right },
        stops: stops.map((s) => ({ h: s.r.height, cut: s.cut, top: s.r.top, bottom: s.r.bottom })),
        scroll: sc.scrollWidth - sc.clientWidth,
        page: document.documentElement.scrollWidth - window.innerWidth,
        right: !(document.querySelector('.road-arrow.r') as HTMLElement).hidden,
        left: !(document.querySelector('.road-arrow.l') as HTMLElement).hidden,
      };
    });
    for (const b of m.top) {
      expect(b.h, `${w}x${h}`).toBeGreaterThanOrEqual(44);
      expect(b.w).toBeGreaterThanOrEqual(44);
      expect(b.right).toBeLessThanOrEqual(w);
    }
    expect(m.head.left).toBeGreaterThan(m.top[0]!.right);
    expect(m.head.right).toBeLessThan(m.top[1]!.right - m.top[1]!.w);
    for (const s of m.stops) {
      expect(s.h, `${w}x${h}`).toBeGreaterThanOrEqual(44);
      expect(s.cut, `${w}x${h}: a stop's words are cut`).toBe(false);
      expect(s.top).toBeGreaterThanOrEqual(52);
      expect(s.bottom).toBeLessThanOrEqual(h);
    }
    expect(m.page, `${w}x${h}: no page scroll`).toBeLessThanOrEqual(0);
    expect(m.scroll > 0, `${w}x${h}: scrolls`).toBe(scrolls);
    expect(m.right, `${w}x${h}: the right arrow`).toBe(scrolls);
    expect(m.left).toBe(false);
  }
  // 320 x 240: the right arrow scrolls one stop; then the left arrow shows.
  await page.setViewportSize({ width: 320, height: 240 });
  await page.locator('.road-arrow.r').tap();
  await expect.poll(() => page.evaluate(() => (document.querySelector('.road-scroll') as HTMLElement).scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('.road-arrow.l')).toBeVisible();
  // The arrows and the picture are hidden from screen readers.
  await expect(page.locator('.road-arrow.r')).toHaveAttribute('aria-hidden', 'true');
  expect(errors).toEqual([]);
});

test('the screen reader list in road order; Tab and arrow keys; Enter opens a card with its big button first; Escape is Back, then Home', async ({ page }) => {
  await open(page, { v: 2, states: { lagos: { streets: { 1: { done: true, best: 870 } }, parcel: false } }, city: CITY, lane: { best: 840, goals: 1, runs: 1, hints: [] } });
  await toRoad(page);
  const list = road(page).getByRole('list', { name: 'Challenge road stops' });
  await expect(list.getByRole('button')).toHaveText([/Alausa/, /Lane run/, /Computer Village/, /Ikeja/, /Go-Slow Hall/, /Ferry/]);
  expect(await list.getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual([
    'Stop 1, Alausa. Done. Best 8 naira 70 kobo.',
    'Side road, Lane run. Done. Best 840 metres.',
    'Stop 2, Computer Village. Next. Ready to play.',
    'Stop 3, Ikeja. Locked. Finish Computer Village first.',
    'Stop 4, Go-Slow Hall. Locked. Finish Ikeja first.',
    'Ferry. Coming soon. Fixes to go: 5.',
  ]);
  await list.getByRole('button').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-where="1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  const card = page.getByRole('dialog', { name: 'Stop 2: Computer Village' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Run Computer Village' })).toBeFocused();
  for (const t of ['Stop 2', 'The internet is slow here.', 'Earns Naira. Tech comes from the Lane run.']) await expect(card.getByText(t, { exact: true })).toBeVisible();
  await expect(card.getByRole('img', { name: 'Seen from above. A stop sign says Computer Village. Your hero is getting on a danfo.' })).toBeVisible();
  // Escape is Back: the card closes, focus goes back to its stop; Escape again is Home.
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(page.locator('[data-where="1"]')).toBeFocused();
  expect(await screenNow(page)).toBe('road');
  await page.keyboard.press('Escape');
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('"See the stop" from the Slow internet card: the lane run stop opens for the Mast; Back closes the card onto the road; Home goes back to the city', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Slow internet, problem' }).tap();
  const city = page.getByRole('dialog', { name: 'Slow internet' });
  await expect(city.getByRole('button', { name: 'Lane run' })).toBeVisible();
  await city.getByRole('button', { name: 'See the stop' }).tap();
  const card = page.getByRole('dialog', { name: 'Side road: Lane run' });
  await expect(card).toBeVisible();
  await expect(card.getByText('A win pays for the Mast (Tech 6).')).toBeVisible();
  await expect(card.getByText('The internet is slow here.')).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Back' }).tap();
  await expect(card).toBeHidden();
  expect(await screenNow(page)).toBe('road');
  // Back again (Escape) goes to the city.
  await page.keyboard.press('Escape');
  await expect.poll(() => screenNow(page)).toBe('city');
  // From the city's "Challenge road", the same stop is for the Lamps first.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await toRoad(page);
  await page.locator('[data-where="lane"]').tap();
  await expect(page.getByRole('dialog', { name: 'Side road: Lane run' }).getByText('A win pays for the Lamps (Power 10).')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await road(page).getByRole('button', { name: 'Home' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('"See the stop" from the Potholes card opens Alausa for the New road; its big button starts street 1 and says its name', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^Potholes, problem$/ }).tap();
  await page.getByRole('dialog', { name: 'Potholes' }).getByRole('button', { name: 'See the stop' }).tap();
  const card = page.getByRole('dialog', { name: 'Stop 1: Alausa' });
  for (const t of ['Potholes on this road.', 'A win pays for the New road (₦10).']) await expect(card.getByText(t)).toBeVisible();
  // Taps in the first 0.4 s are ignored; after that the big button starts the run.
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await card.getByRole('button', { name: 'Run Alausa' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('lagos-1');
  await expect(page.locator('body > .sr-only[aria-live]').filter({ hasText: 'Alausa' })).toHaveCount(1);
});

test('the hint shows once; a locked stop opens its card and starts nothing; the ferry has no big button', async ({ page }) => {
  await open(page);
  await toRoad(page);
  await expect(page.locator('.road-hint')).toHaveText('Tap a stop to see it.');
  await expect(page.locator('.road-hint')).toBeHidden({ timeout: 5000 });
  await page.locator('[data-where="ferry"]').tap();
  const ferry = page.getByRole('dialog', { name: 'The ferry' });
  await expect(ferry.getByText('A ferry jetty is coming to this shore.')).toBeVisible();
  await expect(ferry.getByText('It is built when Lagos booms: 0 of 20.')).toBeVisible();
  await expect(ferry.locator('.go')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.locator('[data-where="hall"]').tap({ force: true });
  const hall = page.getByRole('dialog', { name: 'Stop 4: Go-Slow Hall' });
  await expect(hall.getByText('General Go-Slow is jamming the hall.')).toBeVisible();
  await expect(hall.getByText('Finish Ikeja first.')).toBeVisible();
  await expect(hall.getByRole('img', { name: 'Go-Slow Hall, with its traffic lights.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await toRoad(page);
  await expect(page.locator('.road-hint')).toBeHidden();
});
