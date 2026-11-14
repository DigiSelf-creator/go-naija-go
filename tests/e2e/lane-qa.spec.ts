/**
 * qa S3f1 to S3f3, the lane run (docs/design.md S3f0 part 24): the Blackout's flashes, the shield,
 * Gentle mode numbers, the close warning (the "!", the spoken line, the hum), fast and queued
 * moves, both fixes from their cards with Mission complete, leaving early keeps pickups, saves
 * survive a reload, the phone turned upright, reduced motion, and the HUD and cards at five sizes.
 */
import { expect, test, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, screenNow } from './helpers';

const SHOTS = process.env['LANE_QA_SHOTS'] ?? '';
const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };

const lane = (page: Page) =>
  page.evaluate(() => {
    const l = window.__lane;
    if (!l) return null;
    const { stage, phase, dist, gap, blackout, hint, chips, haul, prize, shield, lane, x, camX, queued, jumping, sliding, tripping, tally, count, line } = l;
    return { stage, phase, dist, gap, blackout, hint, chips, haul, prize, shield, lane, x, camX, queued, jumping, sliding, tripping, tally, count, line };
  });
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { city?: { kobo?: number; power?: number; tech?: number; fixed?: string[] }; lane?: { best: number; goals: number; runs: number; hints: string[] } });

async function open(page: Page, city: object, url = './', extra: Record<string, string> = {}): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city }), extra },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}
async function playing(page: Page): Promise<void> {
  await expect.poll(async () => (await lane(page))?.stage, { timeout: 15_000 }).toBe('play');
}

test('qa: a stumble shows "−15 m" and the Blackout gains 15; a bulb shows "+5 m"', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(48);
  });
  // The cone row at 70 m in the middle lane: run straight into it.
  await expect.poll(async () => (await lane(page))!.blackout, { timeout: 5000 }).toMatch(/−15 m$/);
  const g = (await lane(page))!.gap;
  expect(g).toBeGreaterThan(23);
  expect(g).toBeLessThan(26);
  // The flash goes after about 1 s.
  await expect.poll(async () => (await lane(page))!.blackout, { timeout: 3000 }).not.toMatch(/−15 m/);
  await page.evaluate(() => window.__lane!.warp(140));
  await expect.poll(async () => (await lane(page))!.blackout, { timeout: 5000 }).toMatch(/\+5 m$/);
});

test('qa: Gentle mode starts 60 m back and a stumble gains only 10 ("−10 m")', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane', { 'gidi-gentle': 'true' });
  await playing(page);
  expect((await lane(page))!.blackout).toMatch(/^Blackout: (60|59) m behind/);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(48);
  });
  await expect.poll(async () => (await lane(page))!.blackout, { timeout: 5000 }).toMatch(/−10 m$/);
  const g = (await lane(page))!.gap;
  expect(g).toBeGreaterThan(28);
  expect(g).toBeLessThan(31);
});

test('qa: garri gives the shield; it takes one stumble with "The shield took it!" and no "−15 m"', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(190);
  });
  await expect.poll(async () => (await lane(page))!.shield, { timeout: 5000 }).toBe(true);
  expect((await lane(page))!.hint).toBe('Garri! A shield takes one stumble.');
  // The cones at 262 m sit in the middle lane.
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(244);
  });
  await expect.poll(async () => (await lane(page))!.hint, { timeout: 5000 }).toBe('The shield took it!');
  const l = (await lane(page))!;
  expect(l.shield).toBe(false);
  expect(l.tally['stumbles']).toBe(0);
  expect(l.blackout).not.toMatch(/−/);
  expect(l.gap).toBeGreaterThan(35);
});

test('qa: under 15 m the "!", one polite spoken line and the close hum; back over 15 m they go', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __hums: number };
    w.__hums = 0;
    const make = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      const o = make.call(this);
      const set = o.frequency.setValueAtTime.bind(o.frequency);
      o.frequency.setValueAtTime = (v: number, t: number) => {
        if (Math.abs(v - 82.4) < 0.01) w.__hums++;
        return set(v, t);
      };
      return o;
    };
  });
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(14));
  await expect.poll(async () => (await lane(page))!.blackout).toMatch(/^Blackout: 1[34] m behind!$/);
  await expect(page.locator('.lane-hud [aria-live="polite"]')).toHaveText(/^Blackout 1[34] metres behind$/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __hums: number }).__hums), { timeout: 3000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.__lane!.setGap(40));
  await expect.poll(async () => (await lane(page))!.blackout).toMatch(/^Blackout: (40|39) m behind$/);
});

test('qa: fast moves: a second lane move waits and runs; the kerb stops; mashing keys breaks nothing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(60));
  // Two rights at once: the second waits for the first, then runs.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await lane(page))!.lane).toBe(2);
  await page.waitForTimeout(400);
  expect((await lane(page))!.x).toBeCloseTo(2.5, 1);
  // At the kerb: nothing happens and nothing waits.
  await page.keyboard.press('ArrowRight');
  expect((await lane(page))!.queued).toBeNull();
  // Jump then slide in the air: drop to the road and slide.
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await lane(page))!.sliding, { timeout: 1000 }).toBe(true);
  // Mash 60 random moves in about a second.
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
  for (let i = 0; i < 60; i++) await page.keyboard.press(keys[(i * 7 + 3) % keys.length]!);
  const l = (await lane(page))!;
  expect(l.lane).toBeGreaterThanOrEqual(0);
  expect(l.lane).toBeLessThanOrEqual(2);
  expect(l.stage).toBe('play');
  expect(errors).toEqual([]);
});

for (const [spot, name, build, bucket, line] of [
  ['lightsOut', 'Lights out', 'lamps', 'power', 'The lamps are on. The street is awake.'],
  ['slowInternet', 'Slow internet', 'mast', 'tech', 'Fast internet here. Shops are busy.'],
] as const) {
  test(`qa: ${name}: a win from its card tops up to the price, Mission complete with "${line}"; the other pin's hint (LR-Q2)`, async ({ page }) => {
    // Enough of the other bucket already, so LR-Q2's hint should show.
    const other = bucket === 'power' ? { tech: 6 } : { power: 10 };
    await open(page, { ...CITY, ...other });
    await expect.poll(() => screenNow(page)).toBe('city');
    await page.getByRole('button', { name: `${name}, problem` }).tap();
    const card = page.getByRole('dialog', { name });
    await card.getByRole('button', { name: 'Lane run' }).tap();
    await playing(page);
    await page.evaluate(() => {
      window.__lane!.setGap(60);
      window.__lane!.warp(592);
    });
    const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
    await expect(goal).toBeVisible({ timeout: 10_000 });
    const l = (await lane(page))!;
    expect(l.haul[bucket]).toBeGreaterThanOrEqual(bucket === 'power' ? 10 : 6);
    // The goal card's numbers are the run plus the prize.
    await expect(goal.getByText(`You got ${await page.evaluate(() => {
      const h = window.__lane!.haul;
      const parts: string[] = [];
      if (h.kobo > 0) parts.push(`₦${Math.floor(h.kobo / 100)}${h.kobo % 100 ? '.' + String(h.kobo % 100).padStart(2, '0') : ''}`);
      if (h.power > 0) parts.push(`Power ${h.power}`);
      if (h.tech > 0) parts.push(`Tech ${h.tech}`);
      return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    })}.`)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/goal-card-${build}.png` });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await goal.getByRole('button', { name: 'Take it home' }).tap();
    await expect.poll(() => screenNow(page)).toBe('city');
    await expect(page.getByText('Mission complete!')).toBeVisible();
    await expect(page.getByText(line)).toBeVisible({ timeout: 15_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mission-${build}.png` });
    await expect.poll(async () => (await saved(page)).city?.fixed ?? [], { timeout: 30_000 }).toContain(spot);
    // LR-Q2: the other pin's line is drawn on the map (canvas), once; the save marks it given.
    await expect.poll(async () => ((await saved(page)).city as { hints?: string[] } | undefined)?.hints ?? [], { timeout: 20_000 }).toContain('laneBoth');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-${build}.png` });
  });
}

test('qa: leaving early keeps the pickups ("Start again", "Back to Lagos"); the save survives a reload', async ({ page }) => {
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(140);
  });
  await expect.poll(async () => (await lane(page))!.haul.power, { timeout: 5000 }).toBe(1);
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Start again' }).tap();
  await playing(page);
  let l = (await lane(page))!;
  expect(l.haul).toEqual({ kobo: 0, power: 0, tech: 0 });
  expect(l.dist).toBeLessThan(30);
  expect((await saved(page)).city?.power).toBe(1);
  // A chip this time, then "Back to Lagos".
  await page.evaluate(() => {
    window.__lane!.setGap(40);
    window.__lane!.warp(228);
  });
  await expect.poll(async () => (await lane(page))!.haul.tech, { timeout: 5000 }).toBe(1);
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Back to Lagos' }).tap();
  await expect.poll(() => screenNow(page)).toBe('city');
  const s = await saved(page);
  expect(s.city?.power).toBe(1);
  expect(s.city?.tech).toBe(1);
  expect(s.lane?.runs).toBe(2);
  await page.reload();
  const r = await saved(page);
  expect(r.city?.power).toBe(1);
  expect(r.city?.tech).toBe(1);
  expect(r.lane?.runs).toBe(2);
  // Hints count as seen once their thing is passed (the warps passed the bulb and the chip).
  expect(r.lane?.hints).toEqual(expect.arrayContaining(['power', 'tech']));
});

test('qa: phone turned upright mid-jump pauses; back sideways stays on Pause; Keep playing counts "3, 2, 1"', async ({ page }) => {
  // qa bug (S3f3): the "Turn your phone sideways to play." note shows only with body.playing, which a
  // lane run never sets (index.html). Remove this line once it is fixed.
  test.fail();
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(60));
  await page.keyboard.press('ArrowUp');
  await page.setViewportSize({ width: 393, height: 851 });
  await expect.poll(async () => (await lane(page))!.stage).toBe('paused');
  const d = (await lane(page))!.dist;
  await page.waitForTimeout(600);
  expect((await lane(page))!.dist).toBe(d);
  await expect(page.getByText('Turn your phone sideways to play.')).toBeVisible();
  await page.setViewportSize({ width: 851, height: 393 });
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await pause.getByRole('button', { name: 'Keep playing' }).tap();
  await expect.poll(async () => (await lane(page))!.count).toBe('3');
  await playing(page);
});

test('qa: reduced motion: the camera stays on the middle lane', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => window.__lane!.setGap(60));
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(600);
  const l = (await lane(page))!;
  expect(l.lane).toBe(0);
  expect(l.camX).toBe(0);
});

/** Every box inside the screen; buttons at least `min` px. */
async function fits(page: Page, what: string, sel: string, min = 44): Promise<string[]> {
  return page.evaluate(
    ({ sel, min, what }) => {
      const bad: string[] = [];
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        if (el.closest('[hidden]') || el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? el.className).trim().slice(0, 40);
        if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) bad.push(`${what}: "${name}" off screen ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (el.tagName === 'BUTTON' && (r.width < min - 0.5 || r.height < min - 0.5)) bad.push(`${what}: button "${name}" ${Math.round(r.width)}x${Math.round(r.height)} under ${min}`);
        if (el.tagName !== 'BUTTON' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) bad.push(`${what}: "${name}" cut (scroll ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight})`);
      }
      return bad;
    },
    { sel, min, what },
  );
}

/** The HUD's own parts (the sr-only live line is left out: it is not on screen by design). */
const HUD = '.lane-chip, .lane-pause, .lane-dark, .lane-line, .lane-best, .lane-hint, .lane-button';

/** Two boxes overlap (the HUD's own parts must not). */
async function overlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.lane-chip, .lane-pause, .lane-dark, .lane-line, .lane-best, .lane-hint, .lane-button')].filter((e) => !e.closest('[hidden]') && e.offsetParent !== null && e.getBoundingClientRect().width > 0);
    const out: string[] = [];
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i]!.getBoundingClientRect();
        const b = els[j]!.getBoundingClientRect();
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.push(`${els[i]!.className} "${els[i]!.textContent}" over ${els[j]!.className} "${els[j]!.textContent}"`);
      }
    return out;
  });
}

for (const [w, hgt] of [
  [320, 240],
  [568, 320],
  [640, 200],
  [851, 393],
  [1920, 1080],
] as const) {
  test(`qa: at ${w} x ${hgt} the HUD, hint, buttons and every lane card fit; nothing overlaps`, async ({ page }) => {
    // qa bug (S3f3): at 320 x 240 the Pause card's "Buttons instead of swipes" switch and the caught
    // card's "Take it home" fall below the screen. Remove this line once it is fixed.
    test.fail(w === 320, 'Pause and caught cards cut at 320 x 240');
    await page.setViewportSize({ width: w, height: hgt });
    await open(page, CITY, './?level=lagos-lane', { 'gidi-laneButtons': 'true' });
    await playing(page);
    await page.evaluate(() => window.__lane!.setGap(12));
    await expect.poll(async () => (await lane(page))!.hint, { timeout: 5000 }).not.toBe('');
    await page.evaluate(() => window.__lane!.warp(150));
    await expect.poll(async () => (await lane(page))!.blackout, { timeout: 5000 }).toMatch(/\+5 m/);
    const bad = [...(await fits(page, 'play', HUD, 44)), ...(await overlaps(page))];
    const btn = await page.locator('.lane-button').first().boundingBox();
    expect(btn?.width).toBe(56);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/play-${w}x${hgt}.png` });
    // Pause card.
    await page.keyboard.press('KeyP');
    const pause = page.getByRole('dialog', { name: 'Paused' });
    await expect(pause).toBeVisible();
    bad.push(...(await fits(page, 'pause', '.screen:not([hidden]) .card, .screen:not([hidden]) .card *', 44)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pause-${w}x${hgt}.png` });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await pause.getByRole('button', { name: 'Keep playing' }).tap();
    await playing(page);
    // Caught before the goal.
    await page.evaluate(() => window.__lane!.setGap(0.2));
    const caught = page.getByRole('dialog', { name: 'The Blackout caught up.' });
    await expect(caught).toBeVisible({ timeout: 10_000 });
    bad.push(...(await fits(page, 'caught', '.lane-card .card, .lane-card .card *', 44)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/caught-${w}x${hgt}.png` });
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await caught.getByRole('button', { name: 'Run again' }).tap();
    await playing(page);
    // The goal card.
    await page.evaluate(() => {
      window.__lane!.setGap(60);
      window.__lane!.warp(592);
    });
    const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
    await expect(goal).toBeVisible({ timeout: 10_000 });
    bad.push(...(await fits(page, 'goal', '.lane-card .card, .lane-card .card *', 44)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/goal-${w}x${hgt}.png` });
    // Caught after the goal.
    await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
    await goal.getByRole('button', { name: 'Keep running for more' }).tap();
    await playing(page);
    await page.waitForTimeout(800);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/endless-${w}x${hgt}.png` });
    bad.push(...(await fits(page, 'endless', HUD, 44)), ...(await overlaps(page)));
    await page.evaluate(() => window.__lane!.setGap(0.2));
    const after = page.getByRole('dialog', { name: /^The Blackout caught up at / });
    await expect(after).toBeVisible({ timeout: 10_000 });
    bad.push(...(await fits(page, 'caught after goal', '.lane-card .card, .lane-card .card *', 44)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/caught-after-${w}x${hgt}.png` });
    expect(bad).toEqual([]);
  });
}

test('qa: the lane cards\' big button is at least 56 px tall (part 15)', async ({ page }) => {
  // qa bug (S3f3): "Take it home" on the goal card is 44 px tall at 320 x 240 and 52 px at 851 x 393.
  // Remove this line once it is fixed.
  test.fail();
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await page.evaluate(() => {
    window.__lane!.setGap(60);
    window.__lane!.warp(592);
  });
  const goal = page.getByRole('dialog', { name: 'You made it to the bus stop!' });
  await expect(goal).toBeVisible({ timeout: 10_000 });
  const big = await goal.getByRole('button', { name: 'Take it home' }).boundingBox();
  expect(big!.height).toBeGreaterThanOrEqual(56);
});

test('qa: the lane HUD has a Sound button beside Pause (parts 14 and 15)', async ({ page }) => {
  // qa bug (S3f3): only Pause is in the lane HUD. Remove this line once it is fixed.
  test.fail();
  await open(page, CITY, './?level=lagos-lane');
  await playing(page);
  await expect(page.locator('.lane-hud').getByRole('button', { name: /^Sound/ })).toBeVisible();
});
