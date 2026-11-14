/**
 * Slice 3 step (a) (docs/city.md part 5 "The intro"): six frames with real-text captions, Skip
 * from frame 1, a tap or key goes on, it plays once (before the builder on a first visit, once
 * on the next Play for a saved hero), then only from Settings, "Watch the story".
 *
 * From step (a2) the six frames are the reduced-motion version (a2.5), so these tests run with
 * reduce motion on. The moving intro's tests are in intro-moving.spec.ts.
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
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

// a2.5: the six still frames are what a player with reduce motion on sees.
test.use({ reducedMotion: 'reduce' });

const story = (page: Page) => page.getByRole('dialog', { name: 'The story' });
const seen = (page: Page) => page.evaluate(() => localStorage.getItem('gidi-intro'));

test('first visit: the title line, then the story before the builder; every caption is real text', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Build up Lagos. Get Nigeria working.')).toBeVisible();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await expect(story(page).getByRole('button', { name: 'Skip' })).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await expect(story(page).getByText(CAPTIONS[i]!, { exact: true })).toBeVisible();
    expect((await page.evaluate(() => window.__game?.intro))!.frame).toBe(i + 1);
    if (i === 0) {
      // No frame moves on by itself; "Tap to go on" shows after 1.5 s.
      await expect(story(page).getByText('Tap to go on')).toBeVisible();
      expect((await page.evaluate(() => window.__game?.intro))!.frame).toBe(1);
    }
    if (i < 5) {
      await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
      await story(page).tap({ position: { x: 60, y: 120 } });
    }
  }
  await expect(story(page).getByRole('button', { name: 'Skip' })).toBeVisible();
  expect(await seen(page)).toBeNull();
  await story(page).getByRole('button', { name: "Let's go" }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await seen(page)).toBe('"seen"');
  // It never plays by itself again.
  await page.reload();
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await screenNow(page)).toBe('builder');
});

test('Skip from the first frame goes to the builder, and keys work: Space goes on, Escape skips', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await story(page).getByRole('button', { name: 'Skip' }).tap();
  await expect(page.getByRole('dialog', { name: 'Make your hero' })).toBeVisible();
  expect(await seen(page)).toBe('"seen"');

  // Keys, through Settings.
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings' }).tap();
  await page.getByRole('button', { name: 'Watch the story' }).tap();
  await expect(story(page)).toBeVisible();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await page.evaluate(() => window.__game?.intro))?.frame).toBe(2);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await page.evaluate(() => window.__game?.intro))?.frame).toBe(4);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
});

test('a hero saved before the story: it plays once on the next Play, then Play goes straight to Lagos', async ({ page }) => {
  await page.goto('./');
  await page.evaluate((look) => localStorage.setItem('gidi-look', look), LOOK);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect(story(page)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await story(page).getByRole('button', { name: 'Skip' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('replay from Settings: "Watch the story" plays it, then back to Settings; Settings holds the switches', async ({ page }) => {
  await page.goto('./');
  await page.evaluate((look) => {
    localStorage.setItem('gidi-look', look);
    localStorage.setItem('gidi-intro', '"seen"');
  }, LOOK);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.getByRole('dialog', { name: 'Lagos' }).getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  for (const name of ['Sound: on', 'Music: on', 'Gentle mode: 5 lives instead of 3', 'Watch the story', 'Back']) await expect(settings.getByRole(name.startsWith('Gentle') ? 'switch' : 'button', { name, exact: true })).toBeVisible();
  await settings.getByRole('button', { name: 'Watch the story' }).tap();
  await expect(story(page).getByText(CAPTIONS[0]!)).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await story(page).tap({ position: { x: 60, y: 120 } });
  }
  await story(page).getByRole('button', { name: "Let's go" }).tap();
  await expect(settings).toBeVisible();
  await settings.getByRole('button', { name: 'Back' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
});

test('an app switch or a phone turned upright pauses the story; that frame starts again', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.keyboard.press('Space');
  await expect(story(page).getByText('Tap to go on')).toBeVisible();
  const intro = () => page.evaluate(() => window.__game!.intro!);
  // The tab says it is hidden: paused, the time stops.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await intro()).paused).toBe(true);
  const held = (await intro()).time;
  await page.waitForTimeout(300);
  expect((await intro()).time).toBe(held);
  // A tap while paused does nothing.
  await story(page).tap({ position: { x: 60, y: 120 } });
  expect((await intro()).frame).toBe(2);
  // Back: frame 2 starts again (the hint waits again).
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await intro()).paused).toBe(false);
  const back = await intro();
  expect(back.frame).toBe(2);
  expect(back.time).toBeLessThan(1);
  expect(back.hint).toBe('');
  // Turned upright: the turn note shows and the story waits.
  await page.setViewportSize({ width: 393, height: 851 });
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await expect.poll(async () => (await intro()).paused).toBe(true);
  await page.setViewportSize({ width: 851, height: 393 });
  await expect.poll(async () => (await intro()).paused).toBe(false);
  expect((await intro()).frame).toBe(2);
});

test('reduced motion: plain cuts and a still picture (nothing redrawn while it waits)', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Make your hero' }).tap();
  await expect(story(page)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.keyboard.press('Space');
  await expect(story(page).getByText(CAPTIONS[1]!)).toBeVisible();
  // The picture does not change while the frame waits (the Wheel stands still).
  const shot = () => page.locator('.intro-pic').screenshot();
  const a = await shot();
  await page.waitForTimeout(500);
  expect((await shot()).equals(a)).toBe(true);
});

for (const [w, h] of [
  [320, 240],
  [851, 393],
] as const) {
  test(`at ${w} x ${h} every caption shows whole, with no scroll, and Skip is at least 44 px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./');
    await page.getByRole('button', { name: 'Make your hero' }).tap();
    await expect(story(page)).toBeVisible();
    for (let i = 0; i < 6; i++) {
      const cap = story(page).locator('.intro-caption');
      await expect(cap).toHaveText(CAPTIONS[i]!);
      const fit = await cap.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { inside: r.top >= 0 && r.bottom <= window.innerHeight + 0.5, uncut: el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 };
      });
      expect(fit, `caption ${i + 1}`).toEqual({ inside: true, uncut: true });
      const skip = await story(page).getByRole('button', { name: 'Skip' }).boundingBox();
      expect(skip!.width).toBeGreaterThanOrEqual(44);
      expect(skip!.height).toBeGreaterThanOrEqual(44);
      if (i < 5) {
        await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
        await page.keyboard.press('Space');
      }
    }
    const go = await story(page).getByRole('button', { name: "Let's go" }).boundingBox();
    expect(go!.y + go!.height).toBeLessThanOrEqual(h + 0.5);
    expect(go!.height).toBeGreaterThanOrEqual(44);
  });
}

test('Settings fits 320 x 240 with no scroll; every button at least 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings' }).tap();
  const card = page.getByRole('dialog', { name: 'Settings' });
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  for (const b of await card.locator('button').all()) {
    const r = (await b.boundingBox())!;
    expect(r.height).toBeGreaterThanOrEqual(44);
    expect(r.y + r.height).toBeLessThanOrEqual(240);
  }
});
