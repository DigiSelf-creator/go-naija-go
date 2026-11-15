/**
 * S3f0 part 25 (decision 70): tilt to steer, with simulated tilt (25.10 check 1). The page sends
 * `deviceorientation` readings every 16 ms from a test pump, with `screen.orientation.angle`
 * stubbed to 90 or 270, and for the iPhone path `DeviceOrientationEvent.requestPermission` stubbed
 * to say "granted" or "denied". The switch in Settings and on the lane Pause card at 320 x 240 and
 * 851 x 393; the offer card on the second lane run; a computer with no sensor hides it all.
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { PAST_DOUBLE_TAP_MS, waitOutTapLock } from './helpers';

const LOOK = '{"skin":2,"hair":0,"outfit":0,"body":0,"age":1}';
const CITY = { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright'] };
const W = {
  off: 'Tilt to steer: off',
  on: 'Tilt to steer: on',
  privacy: 'Tilt is only used to steer. Nothing is saved or sent.',
  ask: 'Your phone will ask first. Tap Allow.',
  denied: 'Your phone said no to tilt, so swipes are on.',
  retry: 'To try again, close the game and open it again.',
  lost: 'Tilt is not working. Swipe to change lane.',
  hold: 'Hold your phone the way you like.',
  hint: 'Tilt your phone left or right to change lane.',
  spoken: 'Tilt your phone left or right to change lane. Swipe up to jump, down to slide.',
  spokenButtons: 'Tilt your phone left or right to change lane. Use Jump and Slide to jump and slide.',
  offer: 'New: tilt your phone to change lane.',
};

interface Setup {
  /** The pretend iPhone's answer; leave out for an Android phone (no box). */
  permit?: 'granted' | 'denied';
  /** The pump starts at once with this beta (Android: the 1.5 s check finds the sensor). null: silent. */
  beta?: number | null;
  turn?: number;
  storage?: Record<string, string>;
  lane?: Record<string, unknown>;
}

/** The pump, the screen's turn, and (iPhone) the box, before the game's own code runs. */
async function rig(page: Page, s: Setup): Promise<void> {
  await page.addInitScript(
    ({ permit, beta, turn }) => {
      const w = window as unknown as Record<string, unknown>;
      w['__beta'] = beta;
      w['__turn'] = turn;
      w['__asks'] = 0;
      w['__permit'] = permit;
      Object.defineProperty(screen.orientation, 'angle', { configurable: true, get: () => w['__turn'] });
      if (permit) {
        // A pretend iPhone: Apple's name, and Apple's box.
        Object.defineProperty(Navigator.prototype, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
        (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = () => {
          w['__asks'] = (w['__asks'] as number) + 1;
          // Like Safari: no readings until the phone says yes.
          if (w['__permit'] === 'granted') w['__granted'] = true;
          return Promise.resolve(w['__permit'] as string);
        };
      }
      setInterval(() => {
        const b = w['__beta'];
        if (typeof b !== 'number') return;
        if (w['__permit'] && !w['__granted']) return;
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: b, gamma: 0 }));
      }, 16);
      /** Plays [beta, ms] steps on the page's own clock; returns the tilt moves after each step. */
      w['__tiltPlay'] = async (seq: [number | null, number][]) => {
        const out: number[] = [];
        for (const [b, ms] of seq) {
          w['__beta'] = b;
          const t0 = performance.now();
          await new Promise<void>((r) => {
            const f = (): void => {
              if (performance.now() - t0 >= ms) r();
              else setTimeout(f, 4);
            };
            f();
          });
          const lane = w['__lane'] as { tilt: { moves: number } } | null;
          out.push(lane ? lane.tilt.moves : -1);
        }
        return out;
      };
    },
    { permit: s.permit ?? null, beta: s.beta === undefined ? 0 : s.beta, turn: s.turn ?? 90 },
  );
}

async function open(page: Page, s: Setup, url = './?level=lagos-lane'): Promise<void> {
  await rig(page, s);
  await page.goto(url);
  await page.evaluate(
    ({ look, p, extra }) => {
      localStorage.setItem('gidi-look', look);
      localStorage.setItem('gidi-intro', '"seen"');
      localStorage.setItem('gidi-progress', p);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    },
    { look: LOOK, p: JSON.stringify({ v: 2, states: {}, city: CITY, lane: { best: 0, goals: 0, runs: 1, hints: [], tiltOffered: true, tiltNoes: 0, ...(s.lane ?? {}) } }), extra: s.storage ?? {} },
  );
  await page.reload();
}

async function play(page: Page): Promise<void> {
  // Android: the quiet check needs one reading first (it comes within 16 ms of the pump).
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Play' }).tap();
}

const lane = (page: Page) => page.evaluate(() => window.__lane);
const stage = async (page: Page) => (await lane(page))?.stage;
const tilt = async (page: Page) => (await lane(page))!.tilt;
const playSeq = (page: Page, seq: [number | null, number][]) => page.evaluate((q) => (window as unknown as { __tiltPlay: (s: typeof q) => Promise<number[]> }).__tiltPlay(q), seq);
/** Keeps the run on a quiet stretch with the Blackout far behind while the readings play. */
const quiet = (page: Page) =>
  page.evaluate(() => {
    window.__lane!.warp(180);
    window.__lane!.setGap(60);
  });
const saved = (page: Page) => page.evaluate(() => ({ progress: JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { lane?: Record<string, unknown> }, tilt: localStorage.getItem('gidi-tiltToSteer') }));

async function swipe(cdp: CDPSession, x: number, y: number, dx: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 4, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('tilt 1a to 1e: the centre from "3, 2, 1", 15 out, 8 back, one tilt one lane, held 2 s recentres', async ({ page }) => {
  await open(page, { beta: 20, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  // a. During the count: 40 for a moment makes no move; the centre is the held 20.
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('count');
  expect((await tilt(page)).hold).toBe(W.hold);
  await expect(page.locator('.lane-hud .sr-only')).toHaveText(W.spoken);
  await playSeq(page, [[40, 300], [20, 50]]);
  await expect.poll(() => stage(page)).toBe('play');
  let t = await tilt(page);
  expect(t.moves).toBe(0);
  expect(t.listening).toBe(true);
  expect(t.centre).toBeGreaterThan(19);
  expect(t.centre).toBeLessThan(21.5);
  await quiet(page);
  // b. 24 nothing, 33 nothing, 36 one lane right, held 1.9 s in all (0.2 + 1.7) no second move
  // (past 2 s it would become the new centre, check e; the timer starts when the move fires).
  expect(await playSeq(page, [[24, 200], [33, 200], [36, 200], [36, 1700]])).toEqual([0, 0, 1, 1]);
  t = await tilt(page);
  expect(t.last).toBe('right');
  expect((await lane(page))!.lane).toBe(2);
  await quiet(page);
  // c. 27 re-arms, 36 right again; 29 does not re-arm, 36 then nothing.
  expect(await playSeq(page, [[27, 200], [36, 200], [29, 200], [36, 200]])).toEqual([1, 2, 2, 2]);
  await quiet(page);
  // d. Back to 20, then 4: one lane left.
  expect(await playSeq(page, [[20, 200], [4, 200]])).toEqual([2, 3]);
  expect((await tilt(page)).last).toBe('left');
  await quiet(page);
  // e. Back to 20, 36 right; held 2 s it is the new centre with no move; then 52 right.
  expect(await playSeq(page, [[20, 200], [36, 200], [36, 2300], [52, 200]])).toEqual([3, 4, 4, 5]);
  expect((await tilt(page)).last).toBe('right');
  // Tilt never jumps or slides; the hint is the tilt one (25.8).
  const l = (await lane(page))!;
  expect(l.jumping || l.sliding).toBe(false);
});

test('tilt 1f and 1g: at 270 the same readings go the other way; a flip makes no move', async ({ page }) => {
  await open(page, { beta: 20, turn: 270, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await quiet(page);
  expect(await playSeq(page, [[36, 200]])).toEqual([1]);
  expect((await tilt(page)).last).toBe('left');
  expect(await playSeq(page, [[20, 200], [4, 200]])).toEqual([1, 2]);
  expect((await tilt(page)).last).toBe('right');
  // g. Turned round to 90 mid-run, the phone still held at 20: no move, and a fresh centre.
  await playSeq(page, [[20, 300]]);
  await page.evaluate(() => ((window as unknown as { __turn: number }).__turn = 90));
  expect(await playSeq(page, [[20, 800]])).toEqual([2]);
  expect((await tilt(page)).centre).toBeGreaterThan(19);
  // And steering works the new way round: 36 is right at 90.
  expect(await playSeq(page, [[36, 200]])).toEqual([3]);
  expect((await tilt(page)).last).toBe('right');
});

test('tilt 1h and 1i: paused and on cards nothing moves and the listener is off; a resume takes a fresh centre; no readings for 1 s shows the line once and swipes steer', async ({ page }) => {
  await open(page, { beta: 10, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  expect((await tilt(page)).listening).toBe(false);
  expect(await playSeq(page, [[60, 300], [-60, 300]])).toEqual([0, 0]);
  // Resume while held at 40: "3, 2, 1" takes 40 as the centre.
  await page.evaluate(() => ((window as unknown as { __beta: number }).__beta = 40));
  await waitOutTapLock(page);
  await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Keep playing' }).tap();
  await expect.poll(() => stage(page)).toBe('count');
  await expect.poll(() => stage(page)).toBe('play');
  const t = await tilt(page);
  expect(t.moves).toBe(0);
  expect(t.centre).toBeGreaterThan(38);
  // i. The readings stop: once "Tilt is not working", and a swipe still changes lane.
  await quiet(page);
  await playSeq(page, [[null, 1300]]);
  await expect.poll(async () => (await lane(page))!.hint).toBe(W.lost);
  const vp = page.viewportSize()!;
  const cdp = await page.context().newCDPSession(page);
  const before = (await lane(page))!.lane;
  await swipe(cdp, vp.width / 2, vp.height * 0.6, -60);
  await expect.poll(async () => (await lane(page))!.lane).toBe(before - 1);
  // The caught card: the listener goes.
  await page.evaluate(() => window.__lane!.setGap(0.2));
  await expect(page.getByRole('dialog', { name: 'The Blackout caught up.' })).toBeVisible({ timeout: 10_000 });
  expect((await tilt(page)).listening).toBe(false);
  expect(await playSeq(page, [[80, 300]])).toEqual([0]);
});

test('the sideways card (upright) pauses: no listener, no move', async ({ page }) => {
  await open(page, { beta: 10, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await page.evaluate(() => ((window as unknown as { __turn: number }).__turn = 0));
  await page.setViewportSize({ width: 393, height: 851 });
  await expect.poll(() => stage(page)).toBe('paused');
  expect((await tilt(page)).listening).toBe(false);
  expect(await playSeq(page, [[60, 300]])).toEqual([0]);
});

test('buttons and tilt on together: ◀ ▶ hide, ▲ ▼ stay; keys and swipes still steer; the spoken line says Jump and Slide', async ({ page }) => {
  await open(page, { beta: 0, storage: { 'gidi-tiltToSteer': 'true', 'gidi-laneButtons': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('count');
  await expect(page.locator('.lane-hud .sr-only')).toHaveText(W.spokenButtons);
  await expect.poll(() => stage(page)).toBe('play');
  await expect(page.getByRole('button', { name: 'Jump', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Slide', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Left lane', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Right lane', exact: true })).toBeHidden();
  await quiet(page);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await lane(page))!.lane).toBe(0);
  expect((await tilt(page)).moves).toBe(0);
});

test('with tilt on, the change-lane hint is the tilt one', async ({ page }) => {
  await open(page, { beta: 0, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await expect.poll(async () => (await lane(page))!.hint, { timeout: 10_000 }).toBe(W.hint);
});

test('Android: Settings shows the switch with the privacy line, no ask line; it saves only on or off', async ({ page }) => {
  await open(page, { beta: 5 }, './');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const sw = settings.getByRole('switch', { name: 'Tilt to steer' });
  await expect(sw).toHaveText(W.off);
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(settings.getByText(W.privacy)).toBeVisible();
  await expect(settings.getByText(W.ask)).toHaveCount(0);
  await sw.tap();
  await expect(sw).toHaveText(W.on);
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  const s = await saved(page);
  expect(s.tilt).toBe('true');
  expect(JSON.stringify(s.progress)).not.toMatch(/beta|angle|centre/);
});

test('iPhone, yes: no box on load; the switch asks from the tap, then tilt steers', async ({ page }) => {
  await open(page, { permit: 'granted', beta: 20 }, './');
  await page.waitForTimeout(1600);
  expect(await page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(0);
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByText(W.ask)).toBeVisible();
  const sw = settings.getByRole('switch', { name: 'Tilt to steer' });
  await sw.tap();
  await expect(sw).toHaveText(W.on);
  expect(await page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(1);
  await expect(settings.getByText(W.ask)).toHaveCount(0);
  // Into a lane run: already asked this visit, so no second box.
  await page.goto('./?level=lagos-lane');
  // (a new visit: Safari forgets) the Play tap asks.
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(1);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await quiet(page);
  expect(await playSeq(page, [[20, 200], [36, 200]])).toEqual([0, 1]);
});

test('iPhone, no: the switch goes back to off with the two lines; a run plays with swipes', async ({ page }) => {
  await open(page, { permit: 'denied', beta: 20 }, './');
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const sw = settings.getByRole('switch', { name: 'Tilt to steer' });
  await sw.tap();
  await expect(sw).toHaveText(W.off);
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(settings.getByText(W.denied)).toBeVisible();
  await expect(settings.getByText(W.retry)).toBeVisible();
  expect((await saved(page)).tilt).toBe('false');
});

test('iPhone, no from a run\'s start tap: swipes and the line for 3 s; tilt stays saved on; two noes turn it off', async ({ page }) => {
  await open(page, { permit: 'denied', beta: 20, storage: { 'gidi-tiltToSteer': 'true' } });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  expect(await page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(0);
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(async () => (await lane(page))?.hint, { timeout: 15_000 }).toBe(W.denied);
  expect(await page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(1);
  await expect.poll(() => stage(page)).toBe('play');
  expect((await tilt(page)).on).toBe(false);
  expect((await tilt(page)).listening).toBe(false);
  let s = await saved(page);
  expect(s.tilt).toBe('true');
  expect(s.progress.lane?.['tiltNoes']).toBe(1);
  // The next visit asks again from a tap; a second no turns the switch off.
  await page.reload();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(async () => (await lane(page))?.hint, { timeout: 15_000 }).toBe(W.denied);
  s = await saved(page);
  expect(s.progress.lane?.['tiltNoes']).toBe(2);
  expect(s.tilt).toBe('false');
});

test('the offer: not on the first lane run; on the second, once, before "3, 2, 1"; "Try tilt" turns it on', async ({ page }) => {
  await open(page, { beta: 10, lane: { runs: 0, tiltOffered: false } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  await expect(page.getByRole('dialog', { name: W.offer })).toHaveCount(0);
  // The second run ("Start again" from Pause).
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Paused' });
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Start again' }).tap();
  const offer = page.getByRole('dialog', { name: W.offer });
  await expect(offer).toBeVisible();
  await expect(offer).toContainText('You can still swipe to jump and slide.');
  await expect(offer.getByText(W.ask)).toHaveCount(0);
  expect(await stage(page)).toBe('card');
  expect((await saved(page)).progress.lane?.['tiltOffered']).toBe(true);
  const big = (await offer.getByRole('button', { name: 'Try tilt' }).boundingBox())!;
  expect(big.height).toBeGreaterThanOrEqual(56);
  const small = (await offer.getByRole('button', { name: 'No thanks' }).boundingBox())!;
  expect(small.height).toBeGreaterThanOrEqual(44);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await offer.getByRole('button', { name: 'Try tilt' }).tap();
  await expect.poll(() => stage(page)).toBe('count');
  expect((await tilt(page)).on).toBe(true);
  expect((await saved(page)).tilt).toBe('true');
  // Never again.
  await expect.poll(() => stage(page)).toBe('play');
  await page.keyboard.press('KeyP');
  await waitOutTapLock(page);
  await pause.getByRole('button', { name: 'Start again' }).tap();
  await expect.poll(() => stage(page)).toBe('count');
  await expect(page.getByRole('dialog', { name: W.offer })).toHaveCount(0);
});

test('the offer on an iPhone says the phone will ask; "No thanks" leaves tilt off and it never comes back', async ({ page }) => {
  await open(page, { permit: 'granted', beta: 10, lane: { runs: 1, tiltOffered: false } });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Play' }).tap();
  const offer = page.getByRole('dialog', { name: W.offer });
  await expect(offer).toBeVisible({ timeout: 15_000 });
  await expect(offer.getByText(W.ask)).toBeVisible();
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await offer.getByRole('button', { name: 'No thanks' }).tap();
  await expect.poll(() => stage(page)).toBe('count');
  expect((await tilt(page)).on).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { __asks: number }).__asks)).toBe(0);
  const s = await saved(page);
  expect(s.tilt === null || s.tilt === 'false').toBe(true);
  expect(s.progress.lane?.['tiltOffered']).toBe(true);
});

test('no network call during a run with tilt on', async ({ page }) => {
  await open(page, { beta: 10, storage: { 'gidi-tiltToSteer': 'true' } });
  await play(page);
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  const calls: string[] = [];
  page.on('request', (r) => calls.push(r.url()));
  await quiet(page);
  await playSeq(page, [[30, 300], [10, 300], [-10, 300]]);
  expect(calls).toEqual([]);
});

/** Card children that are drawn: none overlaps another; buttons at least 44 px tall. */
async function cardCheck(page: Page, dialog: string) {
  return page.evaluate((name) => {
    const card = document.querySelector<HTMLElement>(`[role=dialog][aria-label="${name}"]`)!;
    const els = [...card.querySelectorAll<HTMLElement>('h2, p, button')].filter((e) => !e.closest('[hidden]') && e.getBoundingClientRect().width > 0);
    const bad: string[] = [];
    for (let i = 0; i < els.length; i++) {
      const a = els[i]!.getBoundingClientRect();
      if (els[i]!.tagName === 'BUTTON' && a.height < 43.5) bad.push(`"${els[i]!.textContent}" ${a.height} px tall`);
      if (a.right > window.innerWidth + 0.5 || a.left < -0.5) bad.push(`"${els[i]!.textContent}" off the side`);
      for (let j = i + 1; j < els.length; j++) {
        if (els[i]!.contains(els[j]!) || els[j]!.contains(els[i]!)) continue;
        const b = els[j]!.getBoundingClientRect();
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push(`"${els[i]!.textContent}" over "${els[j]!.textContent}"`);
      }
    }
    return bad;
  }, dialog);
}

for (const [w, hgt] of [
  [320, 240],
  [851, 393],
] as const) {
  test(`at ${w} x ${hgt}: the switch in Settings and on the lane Pause card fits, 44 px tall, with no overlap`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: hgt });
    await open(page, { beta: 5, storage: { 'gidi-tiltToSteer': 'true' } }, './');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Settings' }).tap();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    const sw = settings.getByRole('switch', { name: 'Tilt to steer' });
    await expect(sw).toHaveText(W.on);
    // Under "Buttons instead of swipes".
    const order = await settings.evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.textContent));
    expect(order.indexOf(W.on)).toBe(order.indexOf('Buttons instead of swipes: off') + 1);
    expect(await cardCheck(page, 'Settings')).toEqual([]);
    for (const b of await settings.locator('button').all()) {
      const r = (await b.boundingBox())!;
      expect(r.y + r.height, `${await b.textContent()} in sight`).toBeLessThanOrEqual(hgt + 0.5);
    }
    const line = (await settings.getByText(W.privacy).boundingBox())!;
    expect(line.y + line.height).toBeLessThanOrEqual(hgt + 0.5);
    // The lane Pause card.
    await page.goto('./?level=lagos-lane');
    await play(page);
    await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
    await page.keyboard.press('KeyP');
    const pause = page.getByRole('dialog', { name: 'Paused' });
    await expect(pause).toBeVisible();
    const keep = (await pause.getByRole('button', { name: 'Keep playing' }).boundingBox())!;
    expect(keep.y + keep.height).toBeLessThanOrEqual(hgt + 0.5);
    const psw = pause.getByRole('switch', { name: 'Tilt to steer' });
    await psw.scrollIntoViewIfNeeded();
    await expect(psw).toBeInViewport();
    expect((await psw.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await cardCheck(page, 'Paused')).toEqual([]);
    // It switches at once, and the card's other buttons still work.
    await waitOutTapLock(page);
    await psw.tap();
    await expect(psw).toHaveText(W.off);
    expect((await saved(page)).tilt).toBe('false');
  });
}

test('the offer card fits 320 x 240', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await open(page, { permit: 'granted', beta: 10, lane: { runs: 1, tiltOffered: false } });
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  await page.getByRole('button', { name: 'Play' }).tap();
  const offer = page.getByRole('dialog', { name: W.offer });
  await expect(offer).toBeVisible({ timeout: 15_000 });
  expect(await cardCheck(page, W.offer)).toEqual([]);
  for (const b of await offer.locator('button, p, h2').all()) {
    const r = (await b.boundingBox())!;
    expect(r.y + r.height).toBeLessThanOrEqual(240.5);
    expect(r.y).toBeGreaterThanOrEqual(0);
  }
  const box = (await offer.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(300.5);
  expect(box.height).toBeLessThanOrEqual(220.5);
});

test('a phone that sends no readings hides the switch; a saved "on" plays with swipes', async ({ page }) => {
  await open(page, { beta: null, storage: { 'gidi-tiltToSteer': 'true' } }, './');
  await page.waitForTimeout(1700);
  await page.getByRole('button', { name: 'Settings' }).tap();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByRole('switch', { name: 'Buttons instead of swipes: off' })).toBeVisible();
  await expect(settings.getByRole('switch', { name: 'Tilt to steer' })).toHaveCount(0);
  await expect(settings.getByText(W.privacy)).toBeHidden();
  await page.goto('./?level=lagos-lane');
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => stage(page), { timeout: 15_000 }).toBe('play');
  expect((await tilt(page)).on).toBe(false);
  expect((await tilt(page)).listening).toBe(false);
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused' }).getByRole('switch', { name: 'Tilt to steer' })).toHaveCount(0);
});

test.describe('a computer (no touch, no sensor)', () => {
  test.use({ isMobile: false, hasTouch: false, viewport: { width: 1280, height: 720 } });
  test('hides the switch, even when it sends an event with no numbers', async ({ page }) => {
    await page.addInitScript(() => {
      setTimeout(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: null, beta: null, gamma: null } as DeviceOrientationEventInit)), 50);
    });
    await page.goto('./');
    await page.waitForTimeout(1700);
    await page.getByRole('button', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings.getByRole('switch', { name: 'Buttons instead of swipes: off' })).toBeVisible();
    await expect(settings.getByRole('switch', { name: 'Tilt to steer' })).toHaveCount(0);
  });
});
