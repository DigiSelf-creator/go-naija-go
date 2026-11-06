import { expect, test } from '@playwright/test';

test('game loads on a phone held sideways', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('./');
  const canvas = page.locator('canvas#game');
  await expect(canvas).toBeVisible();

  // Canvas fills the screen.
  const box = await canvas.boundingBox();
  const vp = page.viewportSize()!;
  expect(box?.width).toBe(vp.width);
  expect(box?.height).toBe(vp.height);

  // Landscape: no "turn sideways" note. The loop is running.
  await expect(page.locator('#rotate')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(10);

  // No scrolling.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
  );
  expect(scrolls).toBe(false);

  // Offline support registers.
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true);

  expect(errors).toEqual([]);
});

test('pauses when the tab is hidden and a tap keeps running', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.__game?.paused)).toBe(true);
  const before = await page.evaluate(() => window.__game!.steps);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__game!.steps)).toBe(before);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.touchscreen.tap(200, 200);
  expect(await page.evaluate(() => window.__game?.paused)).toBe(false);
});

test('shows the turn sideways note when held upright', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('./');
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  expect(await page.evaluate(() => window.__game?.paused)).toBe(true);
});

test('plays offline on the second visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game?.steps ?? 0)).toBeGreaterThan(5);
});

test('a tap anywhere makes the hero jump and land again', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => window.__game?.hero.grounded)).toBe(true);
  const start = await page.evaluate(() => window.__game!.hero);

  await page.touchscreen.tap(600, 120);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { intervals: [16] }).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.y)).toBeLessThan(start.y - 20);
  await expect.poll(() => page.evaluate(() => window.__game!.hero.grounded), { timeout: 3000 }).toBe(true);
  const end = await page.evaluate(() => window.__game!.hero);
  expect(end.y).toBe(300);
  expect(end.x).toBeGreaterThan(start.x);
});
