/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.3 to a2.11): the intro that moves. Skip and
 * Escape from the start and from every beat; a tap, Space, Enter or → jumps to the next beat;
 * the hold ("Let's go"); it plays once; the hidden log; pause and that beat again; reduced
 * motion; the six frames when the scene cannot load; words whole at every size; no drawing
 * after the end. The real-time length is in intro-timing.spec.ts, the frame rate in
 * intro-perf.spec.ts.
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
const BEATS = [0, 6, 11, 15.5, 20, 24.5, 27.8];
const HERO_LINE = 'That hero is you.';
const END_LINE = 'Build up Lagos. Get Nigeria working.';

const story = (page: Page) => page.getByRole('dialog', { name: 'The story' });
const seen = (page: Page) => page.evaluate(() => localStorage.getItem('gidi-intro'));
const intro = (page: Page) => page.evaluate(() => window.__game!.intro!);

/** A first visit: "Make your hero" opens the moving story. */
async function openStory(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
}

/** The story from Settings, "Watch the story". */
async function replay(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).tap();
  await page.getByRole('button', { name: 'Watch the story' }).tap();
  await expect(story(page)).toBeVisible();
  await expect.poll(async () => (await intro(page)).mode).toBe('moving');
}

/** A tap on the picture, away from Skip and "Let's go". */
const tapPicture = (page: Page) => story(page).tap({ position: { x: 120, y: 120 } });

test('first visit: the moving story; only Skip on screen; a tap jumps beat by beat to the hold; "Let\'s go" opens the builder; it plays once', async ({ page }) => {
  await openStory(page);
  await expect(story(page).getByRole('button', { name: 'Skip' })).toBeVisible();
  // No captions on screen, no hint, no "Let's go" yet.
  await expect(page.locator('.intro-caption')).toBeHidden();
  for (const c of CAPTIONS) await expect(page.locator('.intro-stage, .intro-words').getByText(c, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Tap to go on')).toBeHidden();
  await expect(story(page).getByRole('button', { name: "Let's go" })).toBeHidden();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  for (let b = 1; b <= 6; b++) {
    await tapPicture(page);
    await expect.poll(async () => (await intro(page)).beat).toBe(b);
    const now = await intro(page);
    expect(now.jumps).toBe(b);
    expect(now.time).toBeGreaterThanOrEqual(BEATS[b]!);
    expect(now.time).toBeLessThan(b < 6 ? BEATS[b + 1]! : 40);
  }
  // Six jumps reach the hold: "Let's go" and the end line.
  const go = story(page).getByRole('button', { name: "Let's go" });
  await expect(go).toBeVisible();
  await expect(page.getByText(END_LINE, { exact: true }).first()).toBeVisible();
  // A tap in the hold does nothing.
  await tapPicture(page);
  await page.waitForTimeout(200);
  expect((await intro(page)).jumps).toBe(6);
  expect(await screenNow(page)).toBe('intro');
  // Nothing grabbed the focus by itself.
  expect(await page.evaluate(() => document.activeElement?.classList.contains('intro-go') ?? false)).toBe(false);
  expect(await seen(page)).toBeNull();
  await go.tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await seen(page)).toBe('"seen"');
  // It never plays by itself again.
  await page.reload();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await screenNow(page)).toBe('builder');
});

test('Skip and Escape end it from 0.1 s and from every beat; keys jump; Space or Enter in the hold press "Let\'s go"', async ({ page }) => {
  await openStory(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await story(page).getByRole('button', { name: 'Skip' }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await seen(page)).toBe('"seen"');
  await page.goto('./');
  // Escape at once, and from every beat (through Settings, then back to Settings).
  for (let b = 0; b <= 6; b++) {
    await replay(page);
    if (b === 0) expect((await intro(page)).time).toBeLessThan(1);
    for (let i = 0; i < b; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await intro(page)).beat).toBe(b);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).tap();
  }
  // Space, Enter and → each jump one beat.
  await replay(page);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await intro(page)).beat).toBe(1);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await intro(page)).beat).toBe(2);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).beat).toBe(3);
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).hold).toBe(true);
  // → in the hold does nothing; Space presses "Let's go".
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  expect(await screenNow(page)).toBe('intro');
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  // Enter in the hold too.
  await page.getByRole('button', { name: 'Back' }).tap();
  await replay(page);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).hold).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
});

test('screen readers: a hidden log gets each caption, word for word, at the start of its beat; a jump adds only the new beat', async ({ page }) => {
  await openStory(page);
  const log = page.getByRole('log');
  await expect(log).toHaveAttribute('aria-live', 'polite');
  // Visually hidden: it takes no room on screen.
  const box = (await log.boundingBox())!;
  expect(box.width * box.height).toBeLessThanOrEqual(1);
  await expect.poll(async () => (await intro(page)).log).toEqual([CAPTIONS[0]]);
  // The picture and the two lines are hidden from readers (the log already says them).
  await expect(page.locator('.intro-pic')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.intro-hero-line')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.intro-end-line')).toHaveAttribute('aria-hidden', 'true');
  for (let b = 1; b < 6; b++) {
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await intro(page)).log).toEqual(CAPTIONS.slice(0, b + 1));
  }
  // The hold adds nothing; a pause and the beat again do not add a line twice.
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).hold).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await intro(page)).log).toEqual(CAPTIONS);
  await expect(log.locator('p')).toHaveText(CAPTIONS);
  // The dialog keeps its spoken name.
  await expect(story(page)).toHaveAttribute('aria-label', 'The story');
});

test('an app switch or a phone turned upright pauses picture and story; coming back starts that beat again', async ({ page }) => {
  await openStory(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).time).toBeGreaterThan(16.8);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await intro(page)).paused).toBe(true);
  const held = await intro(page);
  await page.waitForTimeout(400);
  const later = await intro(page);
  expect(later.time).toBe(held.time);
  expect(later.draws).toBe(held.draws);
  // A tap or a key while paused does nothing.
  await tapPicture(page);
  await page.keyboard.press('ArrowRight');
  expect((await intro(page)).beat).toBe(3);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await intro(page)).paused).toBe(false);
  const back = await intro(page);
  expect(back.beat).toBe(3);
  expect(back.time).toBeLessThan(BEATS[3]! + 0.6);
  // The beat's cues play again from its start (the honk at 16 s).
  await expect.poll(async () => (await intro(page)).played.filter((p) => p === '16 honk').length).toBe(2);
  // Turned upright: the turn note, paused; sideways again: that beat again.
  await page.setViewportSize({ width: 393, height: 851 });
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await expect.poll(async () => (await intro(page)).paused).toBe(true);
  await page.setViewportSize({ width: 851, height: 393 });
  await expect.poll(async () => (await intro(page)).paused).toBe(false);
  const again = await intro(page);
  expect(again.beat).toBe(3);
  expect(again.time).toBeLessThan(BEATS[3]! + 0.6);
});

test('3 s into the hold nothing is drawn, until the screen changes size; after Skip or "Let\'s go" nothing is drawn', async ({ page }) => {
  await openStory(page);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await intro(page)).hold).toBe(true);
  await page.waitForTimeout(3300);
  const d0 = (await intro(page)).draws;
  await page.waitForTimeout(800);
  expect((await intro(page)).draws).toBe(d0);
  // A new size draws the picture again, once.
  await page.setViewportSize({ width: 800, height: 380 });
  await expect.poll(async () => (await intro(page)).draws).toBeGreaterThan(d0);
  await page.waitForTimeout(500);
  const d1 = (await intro(page)).draws;
  await page.waitForTimeout(500);
  expect((await intro(page)).draws).toBe(d1);
  // "Let's go": no more intro drawing at all.
  await page.getByRole('button', { name: "Let's go" }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  const total = await page.evaluate(() => window.__game!.introDraws);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__game!.introDraws)).toBe(total);
  // Skip in the middle of a beat: the same.
  await page.goto('./');
  await replay(page);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await story(page).getByRole('button', { name: 'Skip' }).tap();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  const after = await page.evaluate(() => window.__game!.introDraws);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__game!.introDraws)).toBe(after);
});

test('reduced motion keeps the six still frames with their captions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await expect(story(page).getByText(CAPTIONS[0]!, { exact: true })).toBeVisible();
  const now = await intro(page);
  expect(now.mode).toBe('still');
  expect(now.frame).toBe(1);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await tapPicture(page);
  await expect(story(page).getByText(CAPTIONS[1]!, { exact: true })).toBeVisible();
  await expect(story(page).getByText('Tap to go on')).toBeVisible();
});

test.describe('loading the moving scene', () => {
  // The service worker would answer from its own cache, past the test's network rules.
  test.use({ serviceWorkers: 'block' });

  test('if the moving scene cannot load (offline before the cache filled), the six still frames play', async ({ page }) => {
    await page.route('**/intro-scene-*.js', (r) => r.abort());
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect(story(page)).toBeVisible();
    await expect(story(page).getByText(CAPTIONS[0]!, { exact: true })).toBeVisible();
    expect((await intro(page)).mode).toBe('still');
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await page.keyboard.press('Space');
    await expect(story(page).getByText(CAPTIONS[1]!, { exact: true })).toBeVisible();
  });

  test('while the moving scene loads, the first still frame shows and Skip works', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/intro-scene-*.js', async (r) => {
      await held;
      await r.continue();
    });
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect(story(page)).toBeVisible();
    expect((await intro(page)).mode).toBe('loading');
    await expect.poll(async () => (await intro(page)).draws).toBeGreaterThan(0);
    // A tap while it loads does nothing; Skip ends it.
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await tapPicture(page);
    expect((await intro(page)).mode).toBe('loading');
    await story(page).getByRole('button', { name: 'Skip' }).tap();
    await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
    release();
  });
});

for (const [w, h] of [
  [320, 240],
  [568, 320],
  [640, 360],
  [851, 393],
] as const) {
  test(`at ${w} x ${h} the two lines and "Let's go" show whole, inside the screen, clear of Skip; Skip and "Let's go" at least 44 px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openStory(page);
    const skip = (await story(page).getByRole('button', { name: 'Skip' }).boundingBox())!;
    expect(skip.width).toBeGreaterThanOrEqual(44);
    expect(skip.height).toBeGreaterThanOrEqual(44);
    const whole = async (sel: string) => {
      const el = page.locator(sel);
      await expect(el).toBeVisible();
      const r = (await el.boundingBox())!;
      const fit = await el.evaluate((n) => ({
        uncut: n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1,
        lines: Math.round(n.clientHeight / parseFloat(getComputedStyle(n).lineHeight)),
      }));
      expect(fit.uncut, `${sel} not cut`).toBe(true);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(w + 0.5);
      expect(r.y + r.height).toBeLessThanOrEqual(h + 0.5);
      const clear = r.x + r.width <= skip.x || r.y >= skip.y + skip.height || r.y + r.height <= skip.y;
      expect(clear, `${sel} clear of Skip`).toBe(true);
      return r;
    };
    // Beat 5: "That hero is you."
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(HERO_LINE, { exact: true })).toBeVisible({ timeout: 6000 });
    await whole('.intro-hero-line');
    // Beat 6 and the hold: the end line in the top 48 px (two lines at most), "Let's go" at the bottom right.
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(HERO_LINE, { exact: true })).toBeHidden();
    await expect(story(page).getByRole('button', { name: "Let's go" })).toBeVisible({ timeout: 6000 });
    const end = await whole('.intro-end-line');
    await expect(page.locator('.intro-end-line')).toHaveText(END_LINE);
    if (h <= 240) expect(end.y + end.height).toBeLessThanOrEqual(48);
    const go = await whole('.intro-go');
    expect(go.height).toBeGreaterThanOrEqual(44);
    expect(go.x + go.width).toBeGreaterThan(w / 2);
    // The end line and "Let's go" do not cover each other.
    expect(end.y + end.height <= go.y || go.y + go.height <= end.y).toBe(true);
  });
}

test('portrait: the story waits under the turn note, which shows whole; sideways again it goes on', async ({ page }) => {
  await openStory(page);
  await page.setViewportSize({ width: 393, height: 851 });
  const note = page.getByText('Turn your phone sideways to play.');
  await expect(note).toBeVisible();
  const r = (await note.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(393.5);
  expect(await note.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
  await expect.poll(async () => (await intro(page)).paused).toBe(true);
  await page.setViewportSize({ width: 851, height: 393 });
  await expect.poll(async () => (await intro(page)).paused).toBe(false);
});
