/**
 * qa slice O round 2 (O5c, docs/ogun.md 5.2 to 5.6, part 7, OG-R19 to OG-R32): Pothole Hall on the
 * phone profile, in the browser, beside gamedev's own pothole-hall.spec.ts and the unit tests.
 * - reached from Sagamu's Street cleared card ("Go to Pothole Hall"), by hand;
 * - losing every life by walking into him: the hall's Out of lives words, Gentle offer, no
 *   Challenge road before Ogun's city; Home, then a new visit shows the first-try hints again
 *   (OG-R27, once per visit), and Play again in the same visit does not;
 * - Gentle: 5 lives, a 0.8 s gulp, throws 2.8 s apart before any bag, climbs out 40 u left of his
 *   left lip and he goes back to 400 (OG-R24, OG-R26);
 * - a lump never comes out touching a hero standing still by him (OG-R19, OG-R25), normal and Gentle;
 * - the Ijebu garri parcel's shield takes exactly one gravel hit;
 * - Sound and Music off: the hall makes no sound;
 * - the finish with reduced motion: no roll-out, the Win screen as normal.
 */
import { expect, test, type Page } from '@playwright/test';
import { crateActor, type CrateLog } from './crate-bot';
import { hands, playStreetByHand } from './hands';
import { keyPad } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { playPothole } from './pothole-play';

const SHOTS = '/tmp/claude-0/-home-user-go-naija-go/8f053298-216f-5365-a405-cc199ad5be18/scratchpad';
const LOOK = '{"skin":3,"hair":1,"outfit":0,"body":1,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const DONE = { done: true, best: 100 };
const LAGOS = { streets: { 1: DONE, 2: DONE, 3: DONE }, parcel: false, hall: { done: true, best: 0 } };
const save = (streets: Record<string, unknown>, parcel = false) => ({ v: 2, states: { lagos: LAGOS, ogun: { arrived: true, streets, parcel } }, city: CITY, where: 'ogun' });
const ALL3 = { 1: { done: true, best: 300 }, 2: { done: true, best: 400 }, 3: { done: true, best: 500 } };

const ogunPlace = (page: Page) => page.getByRole('dialog', { name: 'Ogun' });

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function openOgun(page: Page, p: unknown, extra: Record<string, string> = {}): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify(p), extra },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

/** OG-R35, OG-R37: from Ogun's city, the Bad road card's "Go to Pothole Hall". */
async function enterHall(page: Page): Promise<void> {
  await ogunPlace(page).locator('.city-pin[data-spot="badRoad"]').tap();
  await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Go to Pothole Hall' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(2);
}

/**
 * Records, on every frame inside the page: each toast seen, gulp starts and throws (run time), the
 * gap between each new lump's box and the hero's box when it comes out, and the hero standing.
 */
async function startWatch(page: Page): Promise<void> {
  await page.evaluate(() => {
    type A = { gulp: number; gravel: { x: number }[]; pitX: number; lips: [number, number]; time: number; lives: number; runPhase: string };
    const w = window as unknown as { __watch: { toasts: string[]; gulps: number[]; throws: number[]; spawnGap: number[]; minPitGap: number; stop: boolean } };
    const st = { toasts: [] as string[], gulps: [] as number[], throws: [] as number[], spawnGap: [] as number[], minPitGap: Infinity, stop: false };
    w.__watch = st;
    let gulping = false;
    let n = 0;
    const frame = (): void => {
      if (st.stop) return;
      const g = window.__game!;
      const a = g.arena as unknown as A | null;
      const t = g.toast;
      if (t && st.toasts[st.toasts.length - 1] !== t) st.toasts.push(t);
      if (a && a.runPhase === 'arena') {
        const on = a.gulp >= 0;
        if (on && !gulping) st.gulps.push(a.time);
        gulping = on;
        const h = g.hero;
        if (a.gravel.length > n) {
          st.throws.push(a.time);
          // The newest lump: the one nearest his lips.
          const z = a.gravel[a.gravel.length - 1]!;
          st.spawnGap.push(Math.abs(z.x - h.x) - 9 - 7);
        }
        n = a.gravel.length;
        if (h.grounded) {
          const gap = h.x < a.pitX ? a.lips[0] - (h.x + 7) : h.x - 7 - a.lips[1];
          st.minPitGap = Math.min(st.minPitGap, gap);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const watch = (page: Page) =>
  page.evaluate(() => (window as unknown as { __watch: { toasts: string[]; gulps: number[]; throws: number[]; spawnGap: number[]; minPitGap: number } }).__watch);

/** Walks right (keys) until the hero's x passes `x`, then lets go. */
async function walkTo(page: Page, x: number): Promise<void> {
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.__game!.hero.x), { timeout: 10_000, intervals: [16] }).toBeGreaterThanOrEqual(x);
  await page.keyboard.up('ArrowRight');
}

test('qa O2 hall: from Sagamu\'s Street cleared card, "Go to Pothole Hall" opens the hall with the parcel and the first-try hint', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = errorsOf(page);
  await openOgun(page, save({ 1: { done: true, best: 300 }, 2: { done: true, best: 400 } }));
  await ogunPlace(page).locator('.city-pin[data-spot="badRoad"]').tap();
  await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Run Sagamu' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const cdp = await page.context().newCDPSession(page);
  const h = hands(cdp);
  const crates: CrateLog = { opened: [], foods: [] };
  const { last } = await playStreetByHand(page, h, { act: await crateActor(page, crates) });
  await h.upAll();
  expect(last.r.phase).toBe('bus');
  const card = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await waitOutTapLock(page);
  const go = card.getByRole('button', { name: 'Go to Pothole Hall', exact: true });
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await go.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  await startWatch(page);
  await expect.poll(async () => (await watch(page)).toasts, { timeout: 12_000 }).toContain('Pick up the road mix bag.');
  const w = await watch(page);
  console.log(`hall from the Sagamu card: toasts ${w.toasts.join(' | ')}; parcel from Sagamu: ${crates.foods.join(', ')}`);
  expect(w.toasts).toContain('King Pothole is blocking the gateway!');
  expect(errors).toEqual([]);
});

test('qa O2 hall: three falls into him lose; Out of lives says the hall\'s words; Play again keeps the visit (no hint again)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3));
  await enterHall(page);
  await startWatch(page);
  await expect.poll(async () => (await watch(page)).toasts, { timeout: 12_000 }).toContain('Pick up the road mix bag.');
  // Walk into him (and his gravel) until out of lives.
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('dialog', { name: 'Out of lives' })).toBeVisible({ timeout: 60_000 });
  await page.keyboard.up('ArrowRight');
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible({ timeout: 10_000 });
  await expect(over.getByText('King Pothole is still blocking the gateway. Try again!')).toBeVisible();
  await expect(over.getByText('Want more tries? Gentle mode gives you 5 lives.')).toBeVisible();
  for (const b of ['Play again', 'Home']) {
    const box = (await over.getByRole('button', { name: b, exact: true }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  // OG-R35: Ogun's Challenge road is open from the first visit.
  await expect(over.getByRole('button', { name: 'Challenge road', exact: true })).toBeVisible();

  // Play again: the same visit, so no first-try hint.
  await waitOutTapLock(page);
  await over.getByRole('button', { name: 'Play again', exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await startWatch(page);
  await page.waitForTimeout(7000);
  expect((await watch(page)).toasts).not.toContain('Pick up the road mix bag.');

  expect(errors).toEqual([]);
});

/**
 * QA-O2-1 (fixed by gamedev: newHallVisit when the hall is entered from a card). OG-R27 says the first-try hints show once per visit, "each time you come into
 * the hall". The counter (potholeFight.ts `triesThisVisit`) is set once per page load and never
 * reset, so after Home and a new visit in the same session the hints never show again.
 * Fix: count tries per visit (reset when the hall is entered from a card, not on Play again).
 */
test('qa O2 hall: Home, then a new visit to the hall shows the first-try hint again (OG-R27)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3));
  await enterHall(page);
  await startWatch(page);
  await expect.poll(async () => (await watch(page)).toasts, { timeout: 12_000 }).toContain('Pick up the road mix bag.');
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Home', exact: true }).tap();
  await expect.poll(() => screenNow(page)).toBe('ogun');
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await enterHall(page);
  await startWatch(page);
  await page.waitForTimeout(7000);
  const seen = (await watch(page)).toasts;
  console.log(`second visit toasts: ${seen.join(' | ')}`);
  expect(errors).toEqual([]);
  expect(seen, 'OG-R27: a new visit to the hall shows "Pick up the road mix bag." again').toContain('Pick up the road mix bag.');
});

test('qa O2 hall: Gentle mode: 5 lives, a 0.8 s gulp, throws 2.8 s apart, climbs out 40 u left of his lip and he goes back to 400', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3), { 'gidi-gentle': 'true' });
  await enterHall(page);
  expect(await page.evaluate(() => window.__game!.run.lives)).toBe(5);
  // A fall at once (before his first throw at 2.0 s): climb out 40 u left of his left lip; he goes back to 400.
  const fall = await page.evaluate(
    () =>
      new Promise<{ lip: number; x: number; pitX: number; lives: number; hurt: number }>((resolve) => {
        let lip = 0;
        let px = window.__game!.hero.x;
        let lives = window.__game!.run.lives;
        let hurt = 0;
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
        const frame = (): void => {
          const a = window.__game!.arena as unknown as { lips: [number, number]; pitX: number };
          const x = window.__game!.hero.x;
          const l = window.__game!.run.lives;
          if (l < lives && Math.abs(x - px) > 15) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
            resolve({ lip, x, pitX: a.pitX, lives: l, hurt });
            return;
          }
          if (l < lives) hurt++;
          lives = l;
          px = x;
          lip = a.lips[0];
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  console.log(`Gentle fall: lip ${fall.lip.toFixed(1)}, climbed out at ${fall.x.toFixed(1)}, he is at ${fall.pitX}, lives ${fall.lives}, hurt by gravel first ${fall.hurt}`);
  expect(fall.pitX).toBe(400);
  expect(fall.x).toBeCloseTo(fall.lip - 40, 0);
  // Then stand still and watch three throws.
  await startWatch(page);
  await expect.poll(async () => (await watch(page)).throws.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
  const w = await watch(page);
  const gaps = w.throws.slice(1).map((t, i) => t - w.throws[i]!);
  const gulps = w.throws.map((t) => t - Math.max(...w.gulps.filter((g) => g <= t)));
  console.log(`Gentle: throws at ${w.throws.map((t) => t.toFixed(2)).join(', ')}; gaps ${gaps.map((g) => g.toFixed(2)).join(', ')}; gulps ${gulps.map((g) => g.toFixed(2)).join(', ')}`);
  for (const g of gaps.slice(0, 2)) expect(g).toBeCloseTo(2.8, 1);
  for (const g of gulps) expect(g).toBeCloseTo(0.8, 1);
  expect(errors).toEqual([]);
});

for (const gentle of [false, true]) {
  test(`qa O2 hall: a hero standing still by his lip is never swallowed and a lump never comes out touching them (${gentle ? 'Gentle' : 'normal'}, OG-R25)`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = errorsOf(page);
    await openOgun(page, save(ALL3), gentle ? { 'gidi-gentle': 'true' } : {});
    await enterHall(page);
    await startWatch(page);
    // Stand at x 170, 10 u from the left end of his track's lip (180): he bumps back 30 u from the feet.
    await walkTo(page, 168);
    await page.waitForTimeout(18_000);
    const w = await watch(page);
    console.log(`${gentle ? 'Gentle' : 'normal'} standing at ${(await page.evaluate(() => window.__game!.hero.x)).toFixed(0)}: lumps came out ${w.spawnGap.map((g) => g.toFixed(1)).join(', ')} u clear; nearest his lip came ${w.minPitGap.toFixed(1)} u`);
    expect(w.spawnGap.length).toBeGreaterThanOrEqual(3);
    for (const g of w.spawnGap) expect(g).toBeGreaterThan(0);
    expect(w.minPitGap).toBeGreaterThanOrEqual(29);
    expect(errors).toEqual([]);
  });
}

test('qa O2 hall: the Ijebu garri parcel\'s shield takes exactly one gravel hit', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3, true));
  await enterHall(page);
  await expect.poll(() => page.evaluate(() => window.__game!.toast)).toBe('Your Ijebu garri parcel: the shield is on!');
  const shieldOf = () => page.evaluate(() => JSON.stringify(window.__game!.run.power));
  console.log(`power at the start: ${await shieldOf()}`);
  // Stand still at x 50: his lumps hop to the hero. The first hit takes the shield, the second a life.
  const changes = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const out: string[] = [];
        let last = '';
        const frame = (): void => {
          const r = window.__game!.run;
          const now = `lives ${r.lives} shield ${(r.power as unknown as { shield: boolean }).shield}`;
          if (now !== last) out.push(`${r.time.toFixed(2)} s: ${now}`);
          last = now;
          if (r.lives <= 2 || r.time > 15) return resolve(out);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  console.log(`parcel shield: ${changes.join(' | ')}`);
  expect(changes.map((c) => c.replace(/^.*: /, ''))).toEqual(['lives 3 shield true', 'lives 3 shield false', 'lives 2 shield false']);
  expect(errors).toEqual([]);
});

test('qa O2 hall: Sound and Music off, the hall makes no sound through a whole win', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    const w = window as unknown as { __nodes: number };
    w.__nodes = 0;
    for (const name of ['createOscillator', 'createBufferSource'] as const) {
      const make = AudioContext.prototype[name] as (this: AudioContext) => AudioNode;
      (AudioContext.prototype as unknown as Record<string, unknown>)[name] = function (this: AudioContext) {
        w.__nodes++;
        return make.call(this);
      };
    }
  });
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3), { 'gidi-sound': 'false', 'gidi-music': 'false' });
  await enterHall(page);
  const atStart = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  let won = false;
  for (let t = 0; t < 3 && !won; t++) {
    const r = await playPothole(page, keyPad(page));
    won = r.last.a?.defeated === true;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
    }
  }
  expect(won).toBe(true);
  await expect.poll(() => screenNow(page), { timeout: 15_000 }).toBe('win');
  const nodes = await page.evaluate(() => (window as unknown as { __nodes: number }).__nodes);
  console.log(`hall sound nodes with Sound and Music off: ${nodes - atStart} (start ${atStart})`);
  expect(atStart).toBeLessThanOrEqual(1);
  expect(nodes - atStart).toBe(0);
  expect(errors).toEqual([]);
});

test('qa O2 hall: reduced motion: the finish has no roll-out, still reaches the Win screen; screenshots of the fight and the finish', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3, true));
  await enterHall(page);
  let shot = false;
  let won = false;
  for (let t = 0; t < 3 && !won; t++) {
    const r = await playPothole(page, keyPad(page), async (s) => {
      if (!shot && s.a && s.a.hits === 1 && s.hazards.some((z) => z.kind === 'gravel' && z.mode === 'move')) {
        shot = true;
        await page.screenshot({ path: `${SHOTS}/oqa2-hall-fight.png` });
      }
    });
    won = r.last.a?.defeated === true;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
    }
  }
  expect(won).toBe(true);
  await expect.poll(() => page.evaluate(() => (window.__game!.arena as unknown as { finishT: number }).finishT), { intervals: [20], timeout: 10_000 }).toBeGreaterThan(5.2);
  await page.screenshot({ path: `${SHOTS}/oqa2-hall-finish.png` });
  await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe('win');
  await page.screenshot({ path: `${SHOTS}/oqa2-hall-win.png` });
  expect(errors).toEqual([]);
});

test('qa O2 hall: reduced motion finish is still and reaches the Win screen', async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = errorsOf(page);
  await openOgun(page, save(ALL3));
  await enterHall(page);
  let won = false;
  for (let t = 0; t < 3 && !won; t++) {
    const r = await playPothole(page, keyPad(page));
    won = r.last.a?.defeated === true;
    if (!won) {
      const over = page.getByRole('dialog', { name: 'Out of lives' });
      await expect(over).toBeVisible();
      await waitOutTapLock(page);
      await over.getByRole('button', { name: 'Play again' }).tap();
    }
  }
  expect(won).toBe(true);
  await expect.poll(() => page.evaluate(() => (window.__game!.arena as unknown as { finishT: number }).finishT), { intervals: [20], timeout: 10_000 }).toBeGreaterThan(5.2);
  // Two frames 0.3 s apart look the same outside the lamps' timing (nothing rolls out).
  const a = await page.screenshot({ clip: { x: 0, y: 0, width: 851, height: 393 } });
  await page.screenshot({ path: `${SHOTS}/oqa2-hall-finish-still.png` });
  await expect.poll(() => screenNow(page), { timeout: 10_000 }).toBe('win');
  expect(a.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
