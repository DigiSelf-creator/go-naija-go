/**
 * S3f2 the lane run engine (docs/design.md S3f0 parts 3, 4, 5 and 12) on the phone held sideways:
 * the run starts with "3, 2, 1" and its code loads only then; swipes, keys and the four buttons
 * change lane, jump and slide; Pause has the "Buttons instead of swipes" switch; the bus stop
 * card comes at 600 m (reached with the warp test hook); "Keep running for more" goes on.
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, startRun, storySeen, waitOutTapLock } from './helpers';

test.beforeEach(({ page }) => storySeen(page));

const LANE_URL = './?level=lagos-lane';
const lane = (page: Page) =>
  page.evaluate(() => {
    const l = window.__lane;
    if (!l) return null;
    const { stage, phase, dist, lane, x, y, speed, jumping, sliding, tripping, buttons, count, line, tally } = l;
    return { stage, phase, dist, lane, x, y, speed, jumping, sliding, tripping, buttons, count, line, tally };
  });

async function openLane(page: Page): Promise<void> {
  await page.goto(LANE_URL);
  await startRun(page);
  await expect.poll(async () => (await lane(page))?.stage).toBe('play');
}

/** A real finger swipe (touch events, which the page sees as pointer events). */
async function swipe(cdp: CDPSession, x: number, y: number, dx: number, dy: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 4, y: y + (dy * i) / 4 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('the lane run loads only when it opens, then counts "3, 2, 1" and runs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.js')) scripts.push(r.url());
  });
  await page.goto(LANE_URL);
  await page.waitForLoadState('load');
  expect(scripts.some((u) => /\/session-[^/]*\.js$/.test(u))).toBe(false);
  await startRun(page);
  await expect.poll(() => scripts.some((u) => /\/session-[^/]*\.js$/.test(u))).toBe(true);
  await expect.poll(async () => (await lane(page))?.count).toBe('3');
  await expect.poll(async () => (await lane(page))?.stage).toBe('play');
  const d0 = (await lane(page))!.dist;
  await expect.poll(async () => (await lane(page))!.dist).toBeGreaterThan(d0 + 5);
  const l = (await lane(page))!;
  expect(l.lane).toBe(1);
  expect(l.phase).toBe('run');
  expect(l.line).toMatch(/^To the bus stop: \d+ m$/);
  expect(l.buttons).toBe(false);
  expect(errors).toEqual([]);
});

test('swipes change lane, jump and slide; a tap does nothing', async ({ page }) => {
  await openLane(page);
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize()!;
  const cx = vp.width / 2;
  const cy = vp.height * 0.6;
  await page.touchscreen.tap(cx, cy);
  expect((await lane(page))!.tally['moves']).toBe(0);
  await swipe(cdp, cx, cy, -60, 0);
  await expect.poll(async () => (await lane(page))!.lane).toBe(0);
  await expect.poll(async () => (await lane(page))!.x).toBe(-2.5);
  await swipe(cdp, cx, cy, 60, 0);
  await expect.poll(async () => (await lane(page))!.x).toBe(0);
  await swipe(cdp, cx, cy, 0, -60);
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(3);
  await page.waitForTimeout(800);
  await swipe(cdp, cx, cy, 0, 60);
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(4);
});

test('keys: arrows and WASD change lane, jump and slide; P pauses', async ({ page }) => {
  await openLane(page);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await lane(page))!.lane).toBe(0);
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyD');
  await expect.poll(async () => (await lane(page))!.lane).toBe(1);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(3);
  await page.waitForTimeout(800);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(4);
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await expect.poll(async () => (await lane(page))!.stage).toBe('paused');
  const d = (await lane(page))!.dist;
  await page.waitForTimeout(300);
  expect((await lane(page))!.dist).toBe(d);
});

test('Pause: "Buttons instead of swipes" shows the four buttons at once; each fires on touch down; "3, 2, 1" on the way back', async ({ page }) => {
  await openLane(page);
  await page.getByRole('button', { name: 'Pause' }).tap();
  const card = page.getByRole('dialog', { name: 'Paused' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Back to Lagos' })).toBeVisible();
  await waitOutTapLock(page);
  const sw = card.getByRole('switch', { name: 'Buttons instead of swipes: off' });
  await sw.tap();
  await expect(card.getByRole('switch', { name: 'Buttons instead of swipes: on' })).toHaveAttribute('aria-checked', 'true');
  await card.getByRole('button', { name: 'Keep playing' }).tap();
  await expect.poll(async () => (await lane(page))!.stage).toBe('count');
  await expect.poll(async () => (await lane(page))!.stage).toBe('play');
  expect((await lane(page))!.buttons).toBe(true);
  for (const name of ['Left lane', 'Right lane', 'Jump', 'Slide']) {
    const b = page.getByRole('button', { name, exact: true });
    const box = (await b.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(56);
    expect(box.height).toBeGreaterThanOrEqual(56);
  }
  await page.getByRole('button', { name: 'Right lane', exact: true }).tap();
  await expect.poll(async () => (await lane(page))!.lane).toBe(2);
  await page.getByRole('button', { name: 'Jump', exact: true }).tap();
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(2);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Slide', exact: true }).tap();
  await expect.poll(async () => (await lane(page))!.tally['moves']).toBe(3);
  await page.getByRole('button', { name: 'Left lane', exact: true }).tap();
  await expect.poll(async () => (await lane(page))!.lane).toBe(1);
  // Saved: Settings shows it on too.
  expect(await page.evaluate(() => localStorage.getItem('gidi-laneButtons'))).toBe('true');
});

test('reaches the bus stop at 600 m (test hook); "Keep running for more" goes on, "Take it home" goes to Lagos', async ({ page }) => {
  await openLane(page);
  await page.evaluate(() => window.__lane!.warp(585));
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 10_000 });
  const l = (await lane(page))!;
  expect(l.phase).toBe('goal');
  expect(l.dist).toBe(600);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await goal.getByRole('button', { name: 'Keep running for more' }).tap();
  await expect.poll(async () => (await lane(page))!.phase).toBe('endless');
  await expect.poll(async () => (await lane(page))!.stage).toBe('play');
  await expect.poll(async () => (await lane(page))!.dist).toBeGreaterThan(640);
  // The endless chunks are on the road.
  const things = await page.evaluate(() => window.__lane!.things.filter((t) => !t.pickup && t.d > 600));
  expect(things.length).toBeGreaterThan(0);
  expect((await lane(page))!.line).toMatch(/^\d[\d,]* m$/);
  await page.keyboard.press('Escape');
  const pauseCard = page.getByRole('dialog', { name: 'Paused' });
  await expect(pauseCard).toBeVisible();
  await waitOutTapLock(page);
  await pauseCard.getByRole('button', { name: 'Back to Lagos' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game?.screen)).toBe('city');
  expect(await page.evaluate(() => window.__lane)).toBeNull();
});

test('the goal card\'s "Take it home" goes to Lagos', async ({ page }) => {
  await openLane(page);
  await page.evaluate(() => window.__lane!.warp(590));
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await goal.getByRole('button', { name: 'Take it home' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game?.screen)).toBe('city');
});

test('Settings has the "Buttons instead of swipes" switch', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const sw = settings.getByRole('switch', { name: 'Buttons instead of swipes: off' });
  await sw.tap();
  await expect(settings.getByRole('switch', { name: 'Buttons instead of swipes: on' })).toBeVisible();
  const box = (await settings.getByRole('switch', { name: 'Buttons instead of swipes: on' }).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('the run pauses when the page is hidden', async ({ page }) => {
  await openLane(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await lane(page))!.stage).toBe('paused');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
});
