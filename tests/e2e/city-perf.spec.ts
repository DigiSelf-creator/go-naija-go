/**
 * Slice 3 step (b) done check (docs/city.md part 5 (b)): dragging Lagos from above stays at 45 fps
 * or more at 4x CPU slowdown, and a still city draws nothing.
 */
import { expect, test } from '@playwright/test';
import { screenNow } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';

test('slowed 4x CPU: dragging Lagos from above near and far, at least 45 fps; still, nothing is drawn', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await page.evaluate((look) => {
    localStorage.setItem('gidi-look', look);
    localStorage.setItem('gidi-intro', '"seen"');
  }, LOOK);
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  const cdp = await page.context().newCDPSession(page);
  const box = (await page.locator('.city-map').boundingBox())!;
  const results: string[] = [];
  try {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.waitForTimeout(500);
    for (const zoom of ['far', 'near'] as const) {
      if (zoom === 'near') await page.getByRole('button', { name: 'Zoom in' }).tap();
      await page.waitForTimeout(300);
      // Count screen frames while a finger drags back and forth for about 2 s.
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
      const draws0 = (await page.evaluate(() => window.__game!.city!.draws));
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let i = 0; i < 4; i++) {
        await page.mouse.move(cx - 150, cy - 40, { steps: 15 });
        await page.mouse.move(cx + 150, cy + 40, { steps: 15 });
      }
      await page.mouse.up();
      const frames = await page.evaluate(() => {
        const w = window as unknown as { __f: number[]; __on: boolean };
        w.__on = false;
        return w.__f;
      });
      const draws = (await page.evaluate(() => window.__game!.city!.draws)) - draws0;
      const secs = (frames[frames.length - 1]! - frames[0]!) / 1000;
      const fps = (frames.length - 1) / secs;
      results.push(`${zoom}: ${fps.toFixed(1)} fps over ${secs.toFixed(1)} s, ${draws} map draws`);
      expect(draws, `${zoom}: the drag redraws the map`).toBeGreaterThan(10);
      expect(fps, `${zoom}: fps while dragging`).toBeGreaterThanOrEqual(45);
    }
    // Still: no draws at all for a second.
    const d0 = await page.evaluate(() => window.__game!.city!.draws);
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__game!.city!.draws)).toBe(d0);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  console.log(`city drag at 4x CPU: ${results.join('; ')}`);
  test.info().annotations.push({ type: 'city drag', description: results.join('; ') });
});
