/**
 * qa for S3a3 and S3a4, the intro that moves (docs/city.md part 5, step (a2), a2.11), past the
 * team's own tests: the early fetch of the scene chunk (our own file only, only for a player who
 * has not seen the story), the scene offline on a second visit, very fast taps, a load that
 * lands while the page is hidden, the music held while the phone is upright even after an app
 * switch, the street drawn again after the story, and very small and very large screens.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const CAPTIONS = [
  'Long ago, light shone on West Africa. Its people and its rich land made the Wheel, so everyone could share, stay safe and keep going.',
  'The Wheel turned, and Lagos grew. More people came, and they need more roads, more light and more buses.',
  "Nigeria's Wheel keeps it all moving. The Wheel was made for everyone.",
  'But the Stoppers want it stuck: traffic, potholes, power cuts and red tape.',
  'Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you.',
  'Your journey starts now. Build up Lagos. Get Nigeria working.',
];

const story = (page: Page) => page.getByRole('dialog', { name: 'The story' });
const intro = (page: Page) => page.evaluate(() => window.__game!.intro!);
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

/** Fails the test on any page error. */
function noErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test.describe('the early fetch of the scene chunk', () => {
  // The page's own requests only (the service worker's precache would fetch the chunk too).
  test.use({ serviceWorkers: 'block' });

  test('a new player: the title fetches only our own scene chunk, about 1.5 s after it opens', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const seen: { url: string; at: number }[] = [];
    const t0 = Date.now();
    page.on('request', (r) => seen.push({ url: r.url(), at: Date.now() - t0 }));
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Make your hero' })).toBeVisible();
    const titleAt = Date.now() - t0;
    await expect.poll(() => seen.some((s) => /\/assets\/intro-scene-[\w-]+\.js$/.test(s.url)), { timeout: 5000 }).toBe(true);
    const chunk = seen.find((s) => /intro-scene-/.test(s.url))!;
    // Not with the page itself: about 1.5 s after the title opens.
    expect(chunk.at).toBeGreaterThanOrEqual(titleAt + 1200);
    expect(new URL(chunk.url).origin).toBe(origin);
    // Every request the page made is our own site (no other host, ever).
    await page.waitForTimeout(500);
    for (const s of seen) expect(new URL(s.url).origin, s.url).toBe(origin);
    // The chunk is fetched once only, and the story then opens moving at once.
    expect(seen.filter((s) => /intro-scene-/.test(s.url))).toHaveLength(1);
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect.poll(async () => (await intro(page)).mode).toBe('moving');
    expect(seen.filter((s) => /intro-scene-/.test(s.url))).toHaveLength(1);
  });

  test('a player who has seen the story: the title does not fetch the scene chunk', async ({ page }) => {
    const chunk: string[] = [];
    page.on('request', (r) => {
      if (/intro-scene-/.test(r.url())) chunk.push(r.url());
    });
    await page.addInitScript(() => localStorage.setItem('gidi-intro', '"seen"'));
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Make your hero' })).toBeVisible();
    await page.waitForTimeout(2500);
    expect(chunk).toEqual([]);
    // "Watch the story" still loads it when asked.
    await page.getByRole('button', { name: 'Settings' }).tap();
    await page.getByRole('button', { name: 'Watch the story' }).tap();
    await expect.poll(async () => (await intro(page)).mode).toBe('moving');
    expect(chunk).toHaveLength(1);
  });
});

test('offline on the second visit: the moving scene comes from the offline cache', async ({ page, context }) => {
  const errors = noErrors(page);
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The scene chunk is in the offline cache.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        for (const name of await caches.keys()) {
          const c = await caches.open(name);
          for (const r of await c.keys()) if (/intro-scene-/.test(r.url)) return true;
        }
        return false;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  // A fresh page, so the chunk is not in memory from the first visit.
  await page.reload();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
  await expect.poll(async () => (await intro(page)).draws).toBeGreaterThan(3);
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('very fast taps: 30 taps in a row reach the hold once; six log lines, none twice; no errors', async ({ page }) => {
  const errors = noErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  for (let i = 0; i < 30; i++) await page.touchscreen.tap(140, 160);
  await expect.poll(async () => (await intro(page)).hold).toBe(true);
  const now = await intro(page);
  expect(now.jumps).toBe(6);
  expect(now.log).toEqual(CAPTIONS);
  expect(await screenNow(page)).toBe('intro');
  // Each cue at most once.
  expect(new Set(now.played).size).toBe(now.played.length);
  // Fast keys in the hold: one "Let's go", into the builder once.
  for (let i = 0; i < 5; i++) await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('a slow load', () => {
  // The service worker would answer from its own cache, past the test's network rules.
  test.use({ serviceWorkers: 'block' });

  test('the scene loads while the page is hidden: it waits, then starts at beat 1 with one log line', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/intro-scene-*.js', async (r) => {
      await held;
      await r.continue();
    });
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect.poll(async () => (await intro(page)).mode).toBe('loading');
    await setHidden(page, true);
    release();
    await expect.poll(async () => (await intro(page)).mode).toBe('moving');
    await page.waitForTimeout(400);
    let now = await intro(page);
    expect(now.paused).toBe(true);
    expect(now.time).toBe(0);
    expect(now.log).toEqual([]);
    await setHidden(page, false);
    await expect.poll(async () => (await intro(page)).time).toBeGreaterThan(0.2);
    now = await intro(page);
    expect(now.log).toEqual([CAPTIONS[0]]);
    expect(now.played.filter((p) => p === '0 start 0.6')).toHaveLength(1);
  });
});

test('upright, then an app switch and back while still upright: picture and music stay paused', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
  // The tap woke the audio; the menu tune is playing.
  await expect.poll(() => page.evaluate(() => window.__game!.music.held)).toBe(false);
  await page.setViewportSize({ width: 393, height: 851 });
  await expect.poll(async () => (await intro(page)).paused).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__game!.music.held)).toBe(true);
  // Switch apps and come back, the phone still upright.
  await setHidden(page, true);
  await setHidden(page, false);
  await page.waitForTimeout(300);
  expect((await intro(page)).paused).toBe(true);
  // a2.11 item 10: turning the phone upright pauses picture and music.
  expect(await page.evaluate(() => window.__game!.music.held), 'music held while upright').toBe(true);
  // Sideways again: the story and the music go on.
  await page.setViewportSize({ width: 851, height: 393 });
  await expect.poll(async () => (await intro(page)).paused).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__game!.music.held)).toBe(false);
});

test('a size change during the story, then Skip: the street under the builder is drawn again', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
  // A new size clears the game's canvas, and the street is not drawn under the story.
  await page.setViewportSize({ width: 800, height: 380 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await story(page).getByRole('button', { name: 'Skip' }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  await page.waitForTimeout(300);
  // The game's canvas has a picture again (not one flat colour).
  const colours = await page.evaluate(() => {
    const c = document.querySelector('canvas:not(.intro-pic)') as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const seen = new Set<string>();
    for (let y = 0; y < c.height; y += Math.max(1, Math.floor(c.height / 12))) {
      for (let x = 0; x < c.width; x += Math.max(1, Math.floor(c.width / 12))) {
        const d = g.getImageData(x, y, 1, 1).data;
        seen.add(`${d[0]},${d[1]},${d[2]}`);
      }
    }
    return seen.size;
  });
  expect(colours).toBeGreaterThan(5);
});

for (const [w, h] of [
  [1920, 1080],
  [480, 220],
  [915, 412],
] as const) {
  test(`break: at ${w} x ${h} the subtitle and "Let's go" show whole, inside the screen and clear of Skip`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect.poll(async () => (await intro(page)).mode).toBe('moving');
    const skip = (await story(page).getByRole('button', { name: 'Skip' }).boundingBox())!;
    const whole = async (sel: string) => {
      const el = page.locator(sel);
      await expect(el).toBeVisible();
      const r = (await el.boundingBox())!;
      expect(await el.evaluate((n) => n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1), `${sel} not cut`).toBe(true);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(w + 0.5);
      expect(r.y + r.height).toBeLessThanOrEqual(h + 0.5);
      expect(r.x + r.width <= skip.x || r.y >= skip.y + skip.height || r.y + r.height <= skip.y, `${sel} clear of Skip`).toBe(true);
      return r;
    };
    // a2.12: each beat's line in the strip, whole and at most 3 lines
    const lines = () => page.locator('.intro-sub').evaluate((n) => Math.round((n as HTMLElement).offsetHeight / parseFloat(getComputedStyle(n).lineHeight)));
    for (let b = 0; b < 6; b++) {
      if (b > 0) await page.keyboard.press('ArrowRight');
      await expect.poll(async () => { const s = (await intro(page)).sub; return s !== '' && CAPTIONS[b]!.startsWith(s); }).toBe(true);
      await whole('.intro-sub');
      expect(await lines()).toBeLessThanOrEqual(3);
    }
    await page.keyboard.press('ArrowRight');
    await expect(story(page).getByRole('button', { name: "Let's go" })).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.intro-sub')).toHaveText(CAPTIONS[5]!);
    await whole('.intro-strip');
    const go = await whole('.intro-go');
    expect(go.height).toBeGreaterThanOrEqual(44);
    expect(go.width).toBeGreaterThanOrEqual(44);
    // "Let's go" sits at the strip's right end, after the words
    const words = await page.locator('.intro-sub').evaluate((n) => {
      const range = document.createRange();
      range.selectNodeContents(n);
      return Math.max(...[...range.getClientRects()].map((r) => r.right));
    });
    expect(words).toBeLessThanOrEqual(go.x);
  });
}

test('only "Skip", "Let\'s go" and the beat\'s own caption (or a piece of it) are ever on screen: no other words in the story card', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
  const shown = async () =>
    page.evaluate(() => {
      const card = document.querySelector('.intro-card')!;
      const out: string[] = [];
      const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const el = n.parentElement!;
        if (!n.textContent?.trim() || el.closest('.sr-only')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === 'hidden' || el.closest('[hidden]')) continue;
        out.push(n.textContent.trim());
      }
      return out;
    });
  const ok = (s: string, b: number) => s === 'Skip' || s === "Let's go" || CAPTIONS[b]!.includes(s);
  for (let b = 0; b < 6; b++) {
    await expect.poll(async () => { const s = (await intro(page)).sub; return s !== '' && CAPTIONS[b]!.includes(s); }).toBe(true);
    for (const s of await shown()) expect(ok(s, b), s).toBe(true);
    await page.keyboard.press('ArrowRight');
  }
  for (const s of await shown()) expect(ok(s, 5), s).toBe(true);
});
