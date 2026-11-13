/**
 * S3d1b speed (docs/city.md d10, d12.7): at 4x CPU slowdown the moment, the boom and walking in
 * the brightened city stay at 45 fps or more, and the still city afterwards draws at most 2 small
 * redraws a second.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const HINTS = ['walk', 'buka', 'collect', 'bright'];

async function openCity(page: Page, city: object): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city }) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

const watch = (page: Page) => page.evaluate(() => window.__game!.city!.watch);

/** Counts screen frames from now until `done` says stop; fps over that time. */
async function framesUntil(page: Page, done: () => Promise<boolean>, max = 15_000): Promise<{ fps: number; secs: number; longest: number }> {
  await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__f = [];
    w.__on = true;
    const f = (now: number): void => {
      w.__f.push(now);
      if (w.__on) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const t0 = Date.now();
  while (!(await done()) && Date.now() - t0 < max) await page.waitForTimeout(50);
  const f = await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__on = false;
    return w.__f;
  });
  const secs = (f[f.length - 1]! - f[0]!) / 1000;
  let longest = 0;
  for (let i = 1; i < f.length; i++) longest = Math.max(longest, f[i]! - f[i - 1]!);
  return { fps: (f.length - 1) / secs, secs, longest };
}

test('slowed 4x CPU: the moment, the boom and walking in bright Lagos stay at 45 fps or more; the still city draws at most 2 small redraws a second', async ({ page }) => {
  test.setTimeout(150_000);
  await openCity(page, { kobo: 0, power: 10, tech: 0, fixed: ['potholes'], fixes: 1, built: ['buka', 'market'], trays: {}, boom: 16, boomCollect: 4, hints: HINTS, at: { x: 640, y: 760 } });
  const cdp = await page.context().newCDPSession(page);
  const results: string[] = [];
  try {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.waitForTimeout(800);
    await page.locator('[data-build="lamps"]').tap();
    await expect.poll(async () => (await watch(page)).moment, { timeout: 20_000 }).not.toBeNull();
    const m = await framesUntil(page, async () => (await watch(page)).moment === null);
    results.push(`moment: ${m.fps.toFixed(1)} fps over ${m.secs.toFixed(1)} s (longest frame ${m.longest.toFixed(0)} ms)`);
    expect(m.fps, 'fps in the moment').toBeGreaterThanOrEqual(45);
    await expect.poll(async () => (await watch(page)).boom, { timeout: 3000 }).not.toBeNull();
    const b = await framesUntil(page, async () => (await watch(page)).boom === null);
    results.push(`boom: ${b.fps.toFixed(1)} fps over ${b.secs.toFixed(1)} s (longest frame ${b.longest.toFixed(0)} ms)`);
    expect(b.fps, 'fps in the boom').toBeGreaterThanOrEqual(45);
    const card = page.getByRole('dialog', { name: 'Lagos is booming!' });
    await card.getByRole('button', { name: 'See Lagos' }).tap();
    await expect(card).toHaveCount(0);
    // Wait for the walkers from the bridge to arrive and stand.
    await expect.poll(async () => (await watch(page)).walkers, { timeout: 15_000 }).toBe(0);
    // Walking in the bright city, near, with the people standing.
    await page.getByRole('button', { name: 'Zoom in' }).tap();
    await page.waitForTimeout(800);
    const box = (await page.locator('.city-map').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.evaluate(() => {
      const w = window as unknown as { __f: number[]; __on: boolean };
      w.__f = [];
      w.__on = true;
      const f = (now: number): void => {
        w.__f.push(now);
        if (w.__on) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(cx - 150, cy - 40, { steps: 15 });
      await page.mouse.move(cx + 150, cy + 40, { steps: 15 });
    }
    await page.mouse.up();
    const f = await page.evaluate(() => {
      const w = window as unknown as { __f: number[]; __on: boolean };
      w.__on = false;
      return w.__f;
    });
    const wfps = (f.length - 1) / ((f[f.length - 1]! - f[0]!) / 1000);
    results.push(`walking: ${wfps.toFixed(1)} fps`);
    expect(wfps, 'fps walking in bright Lagos').toBeGreaterThanOrEqual(45);
    // Still: at most 2 small redraws a second.
    await expect.poll(() => page.evaluate(() => window.__game!.city!.hero.moving), { timeout: 20_000 }).toBe(false);
    await page.waitForTimeout(1500);
    const d0 = await page.evaluate(() => window.__game!.city!.draws);
    await page.waitForTimeout(3000);
    const per = ((await page.evaluate(() => window.__game!.city!.draws)) - d0) / 3;
    results.push(`still: ${per.toFixed(1)} draws a second`);
    expect(per, 'still city redraws a second').toBeLessThanOrEqual(2);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  console.log(`booming at 4x CPU: ${results.join('; ')}`);
  test.info().annotations.push({ type: 'booming speed', description: results.join('; ') });
});
