/**
 * S2.16 by touch on the phone profile (P14, P16, P17):
 * - street 2: the garri tech suit hums, takes a goat's hit (no life lost, the hum stops), then
 *   the dash turns on at its hint (saved), and a double tap and hold of Forward dashes over
 *   the dash gap;
 * - street 3: a pepper fufu ball dries the gutter's weeds ("The weeds dried up!"), the hero walks
 *   across unhurt, then the egret by the rubbish flies off, fine.
 */
import { expect, test } from '@playwright/test';
import { hands, playStreetByHand, snap } from './hands';
import { dashSaved, startRun } from './helpers';

test('street 2 by touch: the suit takes a goat\'s hit and stops humming; then the dash crosses the dash gap', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?level=lagos-2');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));

  let humBefore: boolean | null = null;
  let popped = false;
  let livesAtPop = -1;
  let sawDash = false;
  let lostAtGap = false;
  let lives = 3;
  const { last } = await playStreetByHand(page, h, {
    until: (s) => s.h.x > 7150,
    // With the suit on, walk straight into the goat at 6200 (no jump) so it takes the hit.
    act: async (s) => {
      if (!s.r.power.shield) return false;
      return s.r.hazards.some((z) => z.kind === 'goat' && (z.mode === 'wait' || z.mode === 'move') && z.x - s.h.x > 0 && z.x - s.h.x < 100);
    },
    onPoll: async (s) => {
      if (s.r.power.shield && humBefore === null && s.h.x > 4600) humBefore = s.r.hum;
      if (!popped && humBefore !== null && !s.r.power.shield && s.h.x > 6000) {
        popped = true;
        livesAtPop = s.r.lives;
      }
      if (s.r.dash.dashing) sawDash = true;
      if (s.r.lives < lives && s.h.x > 6500 && s.h.x < 7000) lostAtGap = true;
      lives = s.r.lives;
    },
  });
  await h.upAll();
  // The suit: on from the garri at 4500, it hummed (when sound has started), and a goat broke it.
  expect(humBefore).not.toBeNull();
  const sound = await page.evaluate(() => window.__game!.sound);
  if (sound.started && sound.enabled) expect(humBefore).toBe(true);
  expect(popped).toBe(true);
  expect(livesAtPop).toBe(3);
  expect((await snap(page)).r.hum).toBe(false);
  // The dash: on at street 2's hint and saved; used before the gap; no life lost at the gap.
  expect(last.r.dash.on).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}').dash)).toBe(true);
  expect(sawDash).toBe(true);
  expect(lostAtGap).toBe(false);
  expect(last.h.x).toBeGreaterThan(7150);
  expect(last.h.y).toBe(300);
  expect(errors).toEqual([]);
});

test('street 3 by touch: a fufu ball dries the gutter\'s weeds, the hero walks across unhurt; the egret flies off', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await dashSaved(page);
  await page.goto('./?level=lagos-3');
  await startRun(page);
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));
  await playStreetByHand(page, h, { until: (s) => s.r.fufu > 0 });
  // qa round 2: the long gutter moved from 6150 to 6306 (past the drum's landing spot), out of
  // a ball's reach from the fufu. Play on by hand past the goat (6000) and the drum (6280), and
  // stop on the road about 150 u short of the gutter.
  await playStreetByHand(page, h, { until: (s) => s.h.x > 6150 && s.h.x < 6260 && s.h.grounded });
  await h.upAll();

  // Throw balls (X) from where the hero stands: one stops in the long gutter at 6306 and dries
  // its weeds.
  const gutter = () => page.evaluate(() => window.__game!.run.gutters.find((q) => q.x === 6306)!.state);
  expect(await gutter()).toBe('weeds');
  for (let i = 0; i < 16 && (await gutter()) === 'weeds'; i++) {
    await page.keyboard.press('x');
    await page.waitForTimeout(450);
  }
  expect(['drying', 'dry']).toContain(await gutter());
  await expect(page.getByText('The weeds dried up! Safe to cross.')).toBeVisible();
  await expect.poll(gutter).toBe('dry');
  const before = await snap(page);

  // Walk across the dried gutter (hold Right, no jump): no life lost, the feet stay on the road.
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snap(page)).h.x, { timeout: 15_000 }).toBeGreaterThan(6370);
  await page.keyboard.up('ArrowRight');
  const after = await snap(page);
  expect(after.r.lives).toBe(before.r.lives);

  // On to the egret by the rubbish at 7400: past big pit 2, then a ball for it (or, with none
  // left, walk into it). Either way it flies off, fine.
  let seen: { mode: string; y: number }[] = [];
  const egret = (s: Awaited<ReturnType<typeof snap>>) => s.r.hazards.find((z) => z.kind === 'egret' && z.x < 8000);
  await playStreetByHand(page, h, { until: (s) => s.h.x > 7230 && s.h.grounded });
  await h.upAll();
  const flown = async () => ['flyOff', 'gone'].includes(egret(await snap(page))?.mode ?? 'gone');
  if ((await snap(page)).r.fufu > 0) {
    for (let i = 0; i < 6 && !(await flown()); i++) {
      await page.keyboard.press('x');
      await page.waitForTimeout(400);
    }
  }
  if (!(await flown())) await page.keyboard.down('ArrowRight');
  await expect.poll(flown, { timeout: 10_000 }).toBe(true);
  for (let i = 0; i < 6; i++) {
    const z = egret(await snap(page));
    if (z) seen.push({ mode: z.mode, y: z.y });
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('ArrowRight');
  seen = seen.filter((z) => z.mode === 'flyOff');
  expect(seen.length).toBeGreaterThan(1);
  expect(seen.at(-1)!.y).toBeLessThan(seen[0]!.y); // up and away
  expect(errors).toEqual([]);
});
