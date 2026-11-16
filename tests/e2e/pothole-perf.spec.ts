/**
 * O5b frame rate (docs/ogun.md 9.2: the hall at least 45 fps at 4x CPU; plan CO1: hall people
 * cost 1 fps or less). Pothole Hall by the keys at 4x CPU slowdown on the phone profile (the plan
 * plays inside the page; a lost try plays again, 3 at most). Every phase (gravel; gravel
 * and mud; two gravel and mud) and the kind finish (lamps, doors, roller, the door people walking
 * in and cheering). Pass: at least 45 fps in every part at about 60 physics steps a second. The
 * door people's own draw time is reported (ms a frame), with what it comes to in fps.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';
import { startPilot } from './pothole-play';

const BAR = 45;
const LOOK = '{"skin":4,"hair":2,"outfit":1,"body":0,"age":1}';
const DONE = { done: true, best: 100 };
const SAVE = { v: 2, states: { lagos: { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: DONE }, ogun: { arrived: true, streets: { 1: DONE, 2: DONE, 3: DONE } } }, where: 'ogun' };

const busy = (page: Page) =>
  page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
    return performance.now() - t + (x < 0 ? 1 : 0);
  });

const PARTS = ['phase 1 (gravel)', 'phase 2 (gravel, mud)', 'phase 3 (gravel, gravel, mud)', 'the kind finish'] as const;

test('slowed 4x CPU: Pothole Hall by the keys, every phase and the kind finish, at least 45 fps in every part; the door people\'s cost', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.evaluate(
    ({ look, p }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
    },
    { look: LOOK, p: JSON.stringify(SAVE) },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  // OG-R35/R37 (qa O7: this test still used the retired Ogun place screen): the Bad road pin's card.
  await page.locator('.ogun-city .city-pin[data-spot="badRoad"]').tap();
  await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Go to Pothole Hall' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  const dpr = await page.evaluate(() => devicePixelRatio);
  const canvas = await page.evaluate(() => `${document.querySelector('canvas')!.width}x${document.querySelector('canvas')!.height}`);

  // Every frame: its time, the part (the phase, 3 once beaten), the step count, throws out.
  await page.evaluate(() => {
    const log: [number, number, number, number][] = [];
    (window as unknown as { __frames: typeof log }).__frames = log;
    const f = (now: number): void => {
      const g = window.__game!;
      const a = g.arena as { phase: number; defeated: boolean; blobs: unknown[]; gravel: unknown[] } | null;
      if (g.screen === 'play' && a) {
        log.push([now, a.defeated ? 3 : a.phase, g.steps, a.gravel.length + a.blobs.length]);
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });

  const cdp = await page.context().newCDPSession(page);
  const work1 = await busy(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let work4 = 0;
  let door: { avg: number; max: number; frames: number } | null = null;
  try {
    work4 = await busy(page);
    // The plan plays inside the page (the test's own looks come too late at 4x); a lost try plays again.
    let won = false;
    for (let t = 0; t < 3 && !won; t++) {
      await startPilot(page);
      await page.waitForFunction(() => (window as unknown as { __pilot: { done: boolean } }).__pilot.done, undefined, { timeout: 120_000, polling: 250 });
      won = await page.evaluate(() => (window.__game!.arena as { defeated?: boolean } | null)?.defeated === true);
      const pilot = await page.evaluate(() => (window as unknown as { __pilot: { bags: number; lost: number; log?: string[] } }).__pilot);
      console.log(`try ${t + 1}: ${won ? 'won' : 'lost'}, bags ${pilot.bags}, lives lost ${pilot.lost}${pilot.log ? `: ${pilot.log.join(' / ')}` : ''}`);
      if (!won) {
        const over = page.getByRole('dialog', { name: 'Out of lives' });
        await expect(over).toBeVisible();
        await page.waitForTimeout(600);
        await over.getByRole('button', { name: 'Play again' }).tap();
        await expect.poll(() => screenNow(page)).toBe('play');
      }
    }
    expect(won, 'beaten in 3 tries').toBe(true);
    for (let i = 0; i < 1000 && (await screenNow(page)) !== 'win'; i++) await page.waitForTimeout(20);
    door = (await page.evaluate(() => (window.__game!.arena as { doorMs?: { avg: number; max: number; frames: number } } | null)?.doorMs ?? null)) ?? null;
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  if (!door) door = await page.evaluate(() => (window.__game!.arena as { doorMs?: { avg: number; max: number; frames: number } } | null)?.doorMs ?? null);
  const frames = await page.evaluate(() => (window as unknown as { __frames: [number, number, number, number][] }).__frames);

  const parts = PARTS.map((name, k) => {
    let n = 0;
    let ms = 0;
    let steps = 0;
    let throws = 0;
    for (let i = 1; i < frames.length; i++) {
      const [t, part, s, th] = frames[i]!;
      const [t0, , s0] = frames[i - 1]!;
      if (part !== k || t - t0 > 1000) continue;
      n++;
      ms += t - t0;
      steps += s - s0;
      throws = Math.max(throws, th);
    }
    return { name, fps: ms > 0 ? (n * 1000) / ms : 0, steps: ms > 0 ? (steps * 1000) / ms : 0, secs: ms / 1000, throws, frameMs: n > 0 ? ms / n : 0 };
  });
  const worst = Math.min(...parts.map((p) => p.fps));
  const fight = parts.slice(0, 3);
  const frameMs = fight.reduce((a, p) => a + p.frameMs * p.secs, 0) / Math.max(1e-9, fight.reduce((a, p) => a + p.secs, 0));
  // What the door people's draw time would add up to in fps, at this frame time.
  const doorFps = door && frameMs > 0 ? 1000 / Math.max(1, frameMs - door.avg) - 1000 / frameMs : 0;
  const report = parts.map((p) => `${p.name}: ${p.fps.toFixed(1)} fps over ${p.secs.toFixed(1)} s, up to ${p.throws} throws${p.fps < BAR ? ' (UNDER)' : ''}`).join('; ');
  const people = door ? `door people avg ${door.avg.toFixed(3)} ms, max ${door.max.toFixed(3)} ms a frame over ${door.frames} frames (about ${doorFps.toFixed(2)} fps)` : 'door people: no reading';
  console.log(
    `4x CPU, Pothole Hall by the keys (dpr ${dpr}, canvas ${canvas}), bar ${BAR}: ${report}. Worst ${worst.toFixed(1)}. ` +
      `Steps/s worst part ${Math.min(...parts.map((p) => p.steps)).toFixed(1)}. ${people}. Fixed work 1x ${work1.toFixed(0)} ms, 4x ${work4.toFixed(0)} ms`,
  );
  test.info().annotations.push({ type: 'pothole hall fps 4x', description: `worst ${worst.toFixed(1)} | ${report} | ${people}` });

  expect(errors).toEqual([]);
  expect(work4, 'the 4x slowdown is on').toBeGreaterThan(work1 * 2.5);
  for (const p of parts) {
    expect(p.secs, `${p.name} was measured`).toBeGreaterThan(1.5);
    expect(p.fps, `fps in ${p.name}`).toBeGreaterThanOrEqual(BAR);
    expect(p.steps, `physics steps a second in ${p.name}`).toBeGreaterThan(55);
  }
  // CO1: the door people cost 1 fps or less.
  expect(door, 'the door people were drawn').not.toBeNull();
  expect(doorFps, 'the door people cost in fps').toBeLessThanOrEqual(1);
});
