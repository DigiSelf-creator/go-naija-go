/**
 * qa K5c (docs/kano.md part 10): the Borehole Hall pass, on the phone profile, by touch.
 * - The fight against kano.md 5.3 to 5.5 and KN-R14, watched on every frame inside the page:
 *   the valve says WAIT (a head bump only clonks) until his first whirl of the phase, then STUCK
 *   until it is hit; no whirl leaves while the hero is up after a cloth bounce, and a held one
 *   leaves 0.5 s after the feet touch the floor; first whirls at 2.0, 3.9 and 3.5 s (Gentle 0.4 s
 *   later); "Come down and let him cough!" once a try; gusts a quarter (Gentle an eighth); the kind
 *   finish hurts no one; the Win screen; "Take it home" pays N15 at Kano's home.
 * - Gentle: 5 lives, whirls 45 u/s, and a win in 3 tries.
 * - By hand: at 320 x 240 from Dawanau's Street cleared card ("Go to Borehole Hall"), and at
 *   851 x 393 from Kano's home, with a player a little late on every press (a Dawanau finisher).
 * - The child bot (about 5: Forward held, Jump tapped 3 a second) in Pothole Hall and Borehole Hall.
 * - Offline after one visit; break it (switch apps mid-bounce, turn the phone, mash Jump on WAIT,
 *   a huge screen). Pictures (colour and greyscale) go to QA_SHOTS (a folder), if set.
 */
import { expect, test, type Page } from '@playwright/test';
import { buttonCentres, hands, playStreetByHand, LEFT, RIGHT } from './hands';
import { touchPad, type Pad } from './hall-play';
import { PAST_DOUBLE_TAP_MS, screenNow, waitOutTapLock } from './helpers';
import { decideRusty, newRustyMind } from './rusty-brain';

const LOOK = '{"skin":1,"hair":3,"outfit":2,"body":1,"age":1}';
const CITY = { kobo: 1000, power: 0, tech: 0, fixed: [], fixes: 0, paid: {}, hints: ['walk', 'bright', 'buka', 'collect', 'road'] };
const S3 = { 1: { done: true, best: 100 }, 2: { done: true, best: 100 }, 3: { done: true, best: 100 } };
const DONE = { streets: S3, parcel: false, hall: { done: true, best: 0 } };
const KANO3 = { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 }, 3: { done: true, best: 1300 } };
const KANO2 = { 1: { done: true, best: 900 }, 2: { done: true, best: 1100 } };
const OGUN3 = { 1: { done: true, best: 300 }, 2: { done: true, best: 400 }, 3: { done: true, best: 500 } };
const kanoSave = (parcel: boolean, streets: unknown = KANO3) => ({ v: 2, states: { lagos: DONE, ogun: { ...DONE, arrived: true }, kano: { arrived: true, streets, parcel } }, city: CITY, where: 'kano' });
const SHOTS = process.env['QA_SHOTS'];

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

async function seed(page: Page, p: unknown, extra: Record<string, string> = {}): Promise<void> {
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
}

async function home(page: Page, screen = 'kano'): Promise<void> {
  await page.reload();
  await page.getByRole('button', { name: 'Play' }).tap();
  await expect.poll(() => screenNow(page)).toBe(screen);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
}

async function enterBorehole(page: Page): Promise<void> {
  await page.locator('.kano-city').getByRole('button', { name: 'Go to Borehole Hall' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('kano-hall');
  await expect.poll(() => page.evaluate(() => (window.__game!.arena as { time?: number } | null)?.time ?? 0)).toBeGreaterThan(0);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await page.evaluate(() => (document.documentElement.style.filter = 'grayscale(1)'));
  await page.screenshot({ path: `${SHOTS}/${name}-grey.png` });
  await page.evaluate(() => (document.documentElement.style.filter = ''));
}

interface Arena {
  hits: number;
  phase: number;
  stuck: number;
  ready: boolean;
  valve: string;
  clonks: number;
  waitHints: number;
  valves: number[];
  defeated: boolean;
  finishT: number;
  whirls: { x: number; vx: number }[];
  heldBreaks: number;
  held: number;
  whirlsOut: number;
  gust: boolean;
  holding: boolean;
  waiting: boolean;
  lives: number;
  time: number;
  runPhase: string;
  next: string;
  warn: number;
}
const look = (page: Page) =>
  page.evaluate(() => {
    const g = window.__game!;
    return { h: g.hero, a: g.arena as unknown as Arena | null, screen: g.screen, paused: g.paused, toast: g.toast };
  });

/** What the page saw, frame by frame, in one try. */
interface Rec {
  valves: { t: number; hits: number; valve: string }[];
  outs: { t: number; hits: number; grounded: boolean; holding: boolean; held: number; vx: number }[];
  lands: number[];
  toasts: { t: number; text: string }[];
  gusts: { from: number; to: number }[];
  airGust: number;
  airCalm: number;
  hurts: { t: number; x: number; defeated: boolean }[];
  finishWhirls: number;
  bad: string[];
  last: Arena | null;
}

/** Starts the frame-by-frame watch (a fresh one each try). */
async function watch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __rec: Rec; __recStop?: () => void };
    w.__recStop?.();
    const rec: Rec = { valves: [], outs: [], lands: [], toasts: [], gusts: [], airGust: 0, airCalm: 0, hurts: [], finishWhirls: 0, bad: [], last: null };
    w.__rec = rec;
    let stop = false;
    w.__recStop = () => (stop = true);
    let prev: Arena | null = null;
    let prevT: string | null = null;
    let gustFrom = -1;
    const frame = (): void => {
      if (stop) return;
      const g = window.__game!;
      const a = g.arena as unknown as (Arena & { hero: { x: number; y: number; vy: number; grounded: boolean } }) | null;
      if (a && a.runPhase !== undefined) {
        const t = a.time;
        const h = g.hero;
        if (prev && t < prev.time) prev = null; // a new try
        if (!prev || a.valve !== prev.valve || a.hits !== prev.hits) rec.valves.push({ t, hits: a.hits, valve: a.valve });
        // KN-R14: STUCK stays ready for the phase: never back to WAIT without a hit.
        if (prev && prev.valve === 'stuck' && a.valve === 'shut' && a.hits === prev.hits) rec.bad.push(`${t.toFixed(2)} STUCK went back to WAIT`);
        // Never STUCK before the phase's first whirl.
        if (a.valve === 'stuck' && !rec.outs.some((o) => o.hits === a.hits) && !(prev && a.whirlsOut > prev.whirlsOut)) rec.bad.push(`${t.toFixed(2)} STUCK before a whirl`);
        if (prev && a.whirlsOut > prev.whirlsOut) {
          const z = a.whirls[a.whirls.length - 1];
          rec.outs.push({ t, hits: a.hits, grounded: a.hero.grounded, holding: prev.holding, held: a.held, vx: z?.vx ?? 0 });
          if (prev.holding && !a.hero.grounded) rec.bad.push(`${t.toFixed(2)} a whirl left mid-bounce`);
        }
        if (prev && a.hero.grounded && !(prev as unknown as { hero: { grounded: boolean } }).hero.grounded) rec.lands.push(t);
        if (a.gust && gustFrom < 0) gustFrom = t;
        if (!a.gust && gustFrom >= 0) {
          rec.gusts.push({ from: gustFrom, to: t });
          gustFrom = -1;
        }
        if (!h.grounded && h.vx > 0) {
          if (a.gust) rec.airGust = Math.max(rec.airGust, h.vx);
          else rec.airCalm = Math.max(rec.airCalm, h.vx);
        }
        if (prev && a.lives < prev.lives) rec.hurts.push({ t, x: (prev as unknown as { hero: { x: number } }).hero.x, defeated: prev.defeated });
        if (a.defeated && a.whirls.length > 0) rec.finishWhirls++;
        rec.last = a;
        prev = a;
      }
      const tt = g.toast;
      if (tt && tt !== prevT) rec.toasts.push({ t: a?.time ?? -1, text: tt });
      prevT = tt;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const recNow = (page: Page) => page.evaluate(() => (window as unknown as { __rec: Rec }).__rec);

/**
 * The first whirl of each phase: at 2.0 s, hit 1 + 1.5 + 2.4, hit 2 + 1.5 + 2.0 (Gentle 0.4 s
 * later each), unless he held his breath for it: then 0.5 s after the hero's feet touched the floor.
 */
function checkFirstWhirls(r: Rec, gentle: boolean): string[] {
  const later = gentle ? 0.4 : 0;
  const hitAt = [0, 1, 2].map((n) => r.valves.find((v) => v.hits === n + 1)?.t);
  const lines: string[] = [];
  for (let p = 0; p < 3; p++) {
    const first = r.outs.find((o) => o.hits === p);
    if (!first) continue;
    const from = p === 0 ? 0 : hitAt[p - 1]!;
    const want = p === 0 ? 2.0 + later : 1.5 + [2.8, 2.4, 2.0][p]! + later;
    const due = from + want;
    const lands = r.lands.filter((l) => l <= first.t + 1e-6);
    const land = lands.length ? Math.max(...lands) : -Infinity;
    if (Math.abs(first.t - due) < 0.06) {
      lines.push(`phase ${p}: first whirl ${(first.t - from).toFixed(2)} s (want ${want.toFixed(1)})`);
      continue;
    }
    // Late: only because he held his breath; then it leaves 0.5 s after the feet touch the floor.
    lines.push(`phase ${p}: first whirl held (due ${(want).toFixed(1)} s), out ${(first.t - land).toFixed(2)} s after landing`);
    expect(first.t, `phase ${p} first whirl not early`).toBeGreaterThan(due);
    expect(land + 0.5, `phase ${p} held: landed after it was due`).toBeGreaterThan(due - 0.06);
    expect(first.t - land, `phase ${p} held whirl after landing`).toBeCloseTo(0.5, 1);
  }
  return lines;
}

/** From the door: walk right, press and hold Jump on the way, so the hero is bouncing on the first cloth before his 2.0 s cough. */
async function rushBounce(page: Page, pad: Pad): Promise<void> {
  await pad.move(1);
  let pressed = false;
  for (let i = 0; i < 400; i++) {
    const hx = (await look(page)).h.x;
    if (!pressed && hx >= 106) {
      await pad.jumpDown();
      pressed = true;
    }
    if (hx >= 132) break;
  }
  await pad.move(0);
}

async function walkTo(page: Page, pad: Pad, x: number): Promise<void> {
  for (let i = 0; i < 400; i++) {
    const hx = (await look(page)).h.x;
    if (Math.abs(hx - x) <= 4) break;
    await pad.move(hx < x ? 1 : -1);
  }
  await pad.move(0);
}

/** Holds Jump under the valve the hero is under, for `secs` of play (bouncing on the cloth). */
async function bounceFor(page: Page, pad: Pad, secs: number, x = 140): Promise<void> {
  const t0 = (await look(page)).a!.time;
  if (!(await page.evaluate(() => window.__game!.input.jumpHeld))) await pad.jumpDown();
  for (let i = 0; i < 4000; i++) {
    const s = await look(page);
    const a = s.a!;
    if (a.time - t0 >= secs || a.runPhase !== 'arena') break;
    // Steer over the valve in the air, as a player does (the air keeps the hero's speed).
    const dx = x - s.h.x;
    await pad.move(Math.abs(dx) <= 4 ? 0 : dx > 0 ? 1 : -1);
  }
  await pad.move(0);
  await pad.jumpUp();
}

/** Comes down off the cloth to the floor at x and waits there until `until`. */
async function downTo(page: Page, pad: Pad, x: number): Promise<void> {
  await walkTo(page, pad, x);
  await expect.poll(async () => (await look(page)).h.grounded, { intervals: [16] }).toBe(true);
}

interface PlayOpts {
  /** Every press and lift lands 0 to 2J ms after the plan says (a player a little late). */
  jitterMs?: number;
  seed?: number;
  /** Stand still in this phase until a gust has blown (to see one). */
  seeGustIn?: number;
  onPoll?: (a: Arena, h: { x: number; y: number }) => Promise<void>;
}

/** One try by touch, by the shared plan (rusty-brain.ts), until the third valve or the try is over. */
async function playRusty(page: Page, opts: PlayOpts = {}) {
  const pad = await touchPad(page);
  const m = newRustyMind();
  let s = await look(page);
  let late = 0.06;
  let seed = opts.seed ?? 11;
  const J = opts.jitterMs ?? 0;
  const rand = (): number => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
  const lag = async (): Promise<void> => {
    if (J > 0) await page.waitForTimeout(rand() * 2 * J);
  };
  for (let i = 0; i < 40000; i++) {
    const t0 = s.a?.time ?? 0;
    s = await look(page);
    const a = s.a;
    if (!a || a.runPhase !== 'arena' || a.defeated) break;
    if (a.time > t0) late = Math.min(0.25, Math.max(0.03, late * 0.8 + (a.time - t0) * 0.2 * 1.5)) + J / 1000 / 5;
    if (s.paused || s.screen !== 'play') continue;
    if (opts.onPoll) await opts.onPoll(a, s.h);
    if (a.whirlsOut === 0 && a.hits === 0) {
      await pad.move(0);
      continue;
    }
    const d = decideRusty(m, { hero: s.h, stuck: a.stuck, ready: a.ready, hits: a.hits, valves: a.valves, defeated: a.defeated, whirls: a.whirls, time: a.time }, late);
    // To see a gust: in that phase, do not bounce for the valve until one has blown (whirls are still met).
    if (opts.seeGustIn === a.hits && d.why === 'bounce, hold, bump') {
      const r = await recNow(page);
      const hitT = r.valves.find((v) => v.hits === a.hits)?.t ?? 0;
      if (!a.gust && !r.gusts.some((g) => g.from > hitT)) {
        m.holding = false;
        await pad.move(0);
        continue;
      }
    }
    if (d.release || d.press) await lag();
    await pad.move(d.move);
    if (d.release) await pad.jumpUp();
    if (d.press) await pad.jumpDown();
  }
  await pad.done();
  return { won: s.a?.defeated === true, a: s.a };
}

/** Up to 3 tries; returns the try it was won on (0 if not). Taps Play again between tries. */
async function upTo3(page: Page, opts: PlayOpts = {}, onTry?: (n: number, r: Rec) => void, from = 1): Promise<number> {
  for (let n = from; n <= 3; n++) {
    await watch(page);
    const r = await playRusty(page, { ...opts, seed: (opts.seed ?? 11) + n });
    const rec = await recNow(page);
    onTry?.(n, rec);
    if (r.won) return n;
    const over = page.getByRole('dialog', { name: 'Out of lives' });
    await expect(over).toBeVisible();
    await expect(over.getByText('Rusty Borehole is still dry. Try again!')).toBeVisible();
    if (n === 3) break;
    await waitOutTapLock(page);
    await over.getByRole('button', { name: 'Play again' }).tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    await expect.poll(async () => (await look(page)).a?.time ?? 0).toBeGreaterThan(0);
  }
  return 0;
}

/** After the third valve: the finish, the Win screen's words, Take it home, the money at home. */
async function finishAndHome(page: Page, kobo0: number, w: number, hgt: number): Promise<void> {
  for (let i = 0; i < 800 && (await screenNow(page)) !== 'win'; i++) await page.waitForTimeout(16);
  const r = await recNow(page);
  const defeatT = r.valves.find((v) => v.hits === 3)!.t;
  const open = r.toasts.find((t) => t.text === 'The water is flowing! Kano is switched on!' || t.text === 'The water is flowing!');
  expect(open, 'the finish toast').toBeTruthy();
  expect(open!.t - defeatT).toBeCloseTo(4.0, 0);
  expect(r.hurts.filter((x) => x.defeated)).toEqual([]);
  expect(r.finishWhirls).toBe(0);
  const win = page.getByRole('dialog', { name: 'Kano is switched on!' });
  await expect(win).toBeVisible();
  await expect(win.getByText('The water is flowing. The markets of Kano are busy again.')).toBeVisible();
  await expect(win.getByText('You got ₦15.')).toBeVisible();
  const take = win.getByRole('button', { name: 'Take it home', exact: true });
  for (const b of [take, win.getByRole('button', { name: 'Play again', exact: true })]) {
    const box = (await b.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    expect(box.y + box.height).toBeLessThanOrEqual(hgt);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await shot(page, `${w}-win`);
  await waitOutTapLock(page);
  await take.tap();
  await expect.poll(() => screenNow(page)).toBe('kano');
  await expect(page.locator('.kano-city .city-banner')).toContainText('You brought ₦15 home.');
  const kobo = await page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { city?: { kobo?: number } }).city?.kobo);
  expect(kobo).toBe(kobo0 + 1500);
}

test('qa K5c rules: WAIT and clonk until his first whirl, the held breath, the hint once, STUCK stays, first whirls 2.0 / 3.9 / 3.5 s, a gust, the kind finish', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await seed(page, kanoSave(false));
  await home(page);
  await enterBorehole(page);
  await watch(page);
  const pad = await touchPad(page);
  // Straight to the first valve and bounce, holding, for 4 s: WAIT, clonk, he holds his breath.
  await rushBounce(page, pad);
  let a = (await look(page)).a!;
  expect(a.valve).toBe('shut');
  await shot(page, '851-wait');
  await bounceFor(page, pad, 4.0);
  a = (await look(page)).a!;
  const r0 = await recNow(page);
  console.log(`qa K5c rules: after 4 s of bouncing at ${a.time.toFixed(2)} s: valve ${a.valve}, clonks ${a.clonks}, hits ${a.hits}, whirls out ${a.whirlsOut}, held ${a.held}, waiting ${a.waiting}, hints ${a.waitHints}`);
  expect(a.clonks).toBeGreaterThanOrEqual(1);
  expect(a.hits).toBe(0);
  expect(a.whirlsOut).toBe(0);
  expect(a.held).toBe(1);
  expect(a.valve).toBe('shut');
  expect(r0.toasts.filter((t) => t.text === 'Come down and let him cough!')).toHaveLength(1);
  // Come down to the floor left of the cloth: the waiting whirl leaves 0.5 s after the feet touch.
  await downTo(page, pad, 60);
  await expect.poll(async () => (await look(page)).a!.whirlsOut, { timeout: 3000 }).toBe(1);
  await expect.poll(async () => (await look(page)).a!.valve).toBe('stuck');
  await page.waitForTimeout(300);
  await shot(page, '851-stuck-whirl');
  // Then the plan (by touch) for the rest; it stands still after hit 1 until a gust has blown.
  const won = await playRusty(page, { seeGustIn: 1 });
  const r = await recNow(page);
  console.log(`qa K5c rules play (try 1): won ${won.won}, hurts ${r.hurts.map((x) => `${x.t.toFixed(2)} x${x.x.toFixed(0)}`).join(', ')}; outs ${r.outs.map((o) => `${o.t.toFixed(2)} h${o.hits}`).join(', ')}; valves ${r.valves.map((v) => `${v.t.toFixed(2)} ${v.hits}:${v.valve}`).join(', ')}; gusts ${r.gusts.map((g) => g.from.toFixed(2)).join(',')}`);
  const lines = checkFirstWhirls(r, false);
  console.log(
    `qa K5c rules: ${lines.join('; ')}\n valves ${r.valves.map((v) => `${v.t.toFixed(2)} ${v.hits}:${v.valve}`).join(', ')}\n outs ${r.outs.map((o) => `${o.t.toFixed(2)} h${o.hits} held${o.held} vx${o.vx}`).join(', ')}\n` +
      ` gusts ${r.gusts.map((g) => `${g.from.toFixed(2)}-${g.to.toFixed(2)}`).join(', ')}, air speed calm ${r.airCalm.toFixed(0)} gust ${r.airGust.toFixed(0)}\n toasts ${r.toasts.map((t) => `${t.t.toFixed(1)} ${t.text}`).join(' | ')}\n bad ${r.bad.join(' | ')}`,
  );
  expect(r.bad).toEqual([]);
  expect(r.last!.heldBreaks).toBe(0);
  expect(r.toasts.filter((t) => t.text === 'Come down and let him cough!')).toHaveLength(1);
  expect(r.toasts.map((t) => t.text)).toEqual(expect.arrayContaining(['Rusty Borehole has gone dry!', 'Glug! 2 more valves.', 'Glug! 1 more valve.']));
  expect(r.toasts.some((t) => /Two whirls now/.test(t.text))).toBe(true);
  for (const o of r.outs) expect(o.vx).toBe(-60);
  // A gust in phase 1 lasts 2 s; air speed toward him is a quarter less.
  expect(r.gusts.length).toBeGreaterThanOrEqual(1);
  expect(r.gusts[0]!.to - r.gusts[0]!.from).toBeCloseTo(2.0, 1);
  if (r.airGust > 0 && r.airCalm > 0) expect(r.airGust / r.airCalm).toBeLessThan(0.8);
  let tries = 1;
  if (!won.won) {
    const over = page.getByRole('dialog', { name: 'Out of lives' });
    await expect(over).toBeVisible();
    await waitOutTapLock(page);
    await over.getByRole('button', { name: 'Play again' }).tap();
    await expect.poll(() => screenNow(page)).toBe('play');
    await expect.poll(async () => (await look(page)).a?.time ?? 0).toBeGreaterThan(0);
    tries = await upTo3(page, {}, (n, q) => console.log(`qa K5c rules try ${n}: hurts ${q.hurts.length}`), 2);
  }
  console.log(`qa K5c rules: won on try ${tries}`);
  expect(tries).toBeGreaterThan(0);
  await finishAndHome(page, 1000, 851, 393);
  expect(errors).toEqual([]);
});

test('qa K5c: the parcel shield takes one whirl; Out of lives; Play again: the hint once a try, the first-try hint not again, WAIT through a phase-1 bounce', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await seed(page, kanoSave(true));
  await home(page);
  await enterBorehole(page);
  await watch(page);
  // Try 1: stand still at the door. First whirl at 2.0 s even with the parcel words first.
  await expect.poll(async () => (await look(page)).a?.runPhase ?? 'none', { timeout: 120_000, intervals: [200] }).not.toBe('arena');
  const r1 = await recNow(page);
  console.log(`qa K5c try 1 standing: outs ${r1.outs.map((o) => o.t.toFixed(2)).join(', ')}; hurts ${r1.hurts.map((h) => h.t.toFixed(2)).join(', ')}; toasts ${r1.toasts.map((t) => `${t.t.toFixed(1)} ${t.text}`).join(' | ')}`);
  expect(r1.outs[0]!.t).toBeCloseTo(2.0, 1);
  expect(r1.toasts.map((t) => t.text)).toEqual(expect.arrayContaining(['Your garri parcel: the shield is on!', 'Rusty Borehole has gone dry!', 'Bounce, hold, and bump the valve!', 'Shield used up!']));
  // The shield took exactly one whirl: four whirls reached the hero, three lives went.
  expect(r1.hurts).toHaveLength(3);
  const over = page.getByRole('dialog', { name: 'Out of lives' });
  await expect(over).toBeVisible();
  await expect(over.getByText('Rusty Borehole is still dry. Try again!')).toBeVisible();
  await waitOutTapLock(page);
  await over.getByRole('button', { name: 'Play again' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(async () => (await look(page)).a?.time ?? 0).toBeGreaterThan(0);
  await watch(page);
  // Try 2: bounce 4 s on WAIT: the hint once. Come down, he coughs, STUCK, bump: hit 1.
  const pad = await touchPad(page);
  await rushBounce(page, pad);
  await bounceFor(page, pad, 4.0);
  await downTo(page, pad, 60);
  await expect.poll(async () => (await look(page)).a!.valve, { timeout: 3000 }).toBe('stuck');
  await walkTo(page, pad, 140);
  for (let i = 0; i < 4000 && (await look(page)).a!.hits === 0; i++) {
    if (!(await page.evaluate(() => window.__game!.input.jumpHeld))) await pad.jumpDown();
    const dx = 140 - (await look(page)).h.x;
    await pad.move(Math.abs(dx) <= 4 ? 0 : dx > 0 ? 1 : -1);
  }
  await pad.move(0);
  await pad.jumpUp();
  expect((await look(page)).a!.hits).toBe(1);
  // Keep bouncing on the first cloth 5 s: valve 2 says WAIT, no whirl leaves, no hint again.
  await bounceFor(page, pad, 5.0);
  const a = (await look(page)).a!;
  const r2 = await recNow(page);
  console.log(`qa K5c try 2: valve ${a.valve} hits ${a.hits} outs ${a.whirlsOut} held ${a.held} hints ${a.waitHints}; toasts ${r2.toasts.map((t) => `${t.t.toFixed(1)} ${t.text}`).join(' | ')}`);
  expect(a.hits).toBe(1);
  expect(a.valve).toBe('shut');
  expect(a.whirlsOut).toBe(1);
  expect(a.waitHints).toBe(1);
  expect(r2.toasts.filter((t) => t.text === 'Come down and let him cough!')).toHaveLength(1);
  expect(r2.toasts.some((t) => /^Bounce, hold/.test(t.text))).toBe(false);
  await downTo(page, pad, 60);
  await expect.poll(async () => (await look(page)).a!.whirlsOut, { timeout: 3000 }).toBe(2);
  await pad.done();
  const r3 = await recNow(page);
  checkFirstWhirls(r3, false);
  expect(r3.bad).toEqual([]);
  expect(errors).toEqual([]);
});

test('qa K5c Gentle: 5 lives, whirls 45 u/s, first whirls 2.4 / 4.3 / 3.9 s, gusts an eighth; a win in 3 tries by touch', async ({ page }) => {
  test.setTimeout(400_000);
  const errors = errorsOf(page);
  await seed(page, kanoSave(false), { 'gidi-gentle': 'true' });
  await home(page);
  await enterBorehole(page);
  expect((await look(page)).a!.lives).toBe(5);
  let first: Rec | null = null;
  const tries = await upTo3(page, { seeGustIn: 1 }, (n, r) => {
    first ??= r;
    console.log(`qa K5c Gentle try ${n}: hurts ${r.hurts.length}, outs ${r.outs.map((o) => `${o.t.toFixed(2)} h${o.hits} vx${o.vx}`).join(', ')}, gusts ${r.gusts.map((g) => `${g.from.toFixed(2)}-${g.to.toFixed(2)}`).join(', ')}, air calm ${r.airCalm.toFixed(0)} gust ${r.airGust.toFixed(0)}`);
  });
  expect(tries).toBeGreaterThan(0);
  const r = await recNow(page);
  console.log(`qa K5c Gentle: won on try ${tries}; ${checkFirstWhirls(r, true).join('; ')}`);
  for (const o of r.outs) expect(o.vx).toBe(-45);
  expect(r.bad).toEqual([]);
  if (r.airGust > 0 && r.airCalm > 0) {
    expect(r.airGust / r.airCalm).toBeGreaterThan(0.8);
    expect(r.airGust / r.airCalm).toBeLessThan(0.95);
  }
  await finishAndHome(page, 1000, 851, 393);
  expect(errors).toEqual([]);
});

test('qa K5c by hand at 320 x 240: Dawanau to the bus, its card\'s "Go to Borehole Hall", the hall in 3 tries, the Win, home with N15 and four Play buttons', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = errorsOf(page);
  await page.setViewportSize({ width: 320, height: 240 });
  await seed(page, kanoSave(false, KANO2));
  await home(page);
  await page.locator('.kano-city').getByRole('button', { name: 'Play Dawanau' }).tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.steps)).toBeGreaterThan(5);
  const h = hands(await page.context().newCDPSession(page));
  const k = await playStreetByHand(page, h);
  await h.upAll();
  expect(k.last.r.phase).toBe('bus');
  const card = page.getByRole('dialog', { name: 'Street cleared!' });
  await expect(card).toBeVisible({ timeout: 8000 });
  const go = card.getByRole('button', { name: 'Go to Borehole Hall', exact: true });
  await expect(go).toBeVisible();
  const box = (await go.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(240);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const parcel = (await card.locator('.parcel-line').count()) > 0;
  const kobo0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('gidi-progress') ?? '{}') as { city?: { kobo?: number } }).city?.kobo ?? 0);
  await shot(page, '320-dawanau-cleared');
  await waitOutTapLock(page);
  await go.tap();
  await expect.poll(() => screenNow(page)).toBe('play');
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('kano-hall');
  await expect.poll(async () => (await look(page)).a?.time ?? 0).toBeGreaterThan(0.5);
  await shot(page, '320-wait');
  let shots = 0;
  const tries = await upTo3(page, {
    jitterMs: 60,
    onPoll: async (a) => {
      if (shots === 0 && a.valve === 'stuck' && a.whirls.some((z) => z.x < 400)) {
        shots++;
        await shot(page, '320-stuck-whirl');
      }
      if (shots === 1 && a.gust) {
        shots++;
        await shot(page, '320-gust');
      }
    },
  }, (n, r) => console.log(`qa K5c 320 try ${n}: hurts ${r.hurts.length} at ${r.hurts.map((x) => `${x.t.toFixed(1)}s x${x.x.toFixed(0)}`).join(', ')}, bad ${r.bad.length}`));
  console.log(`qa K5c 320: parcel from Dawanau ${parcel}; won on try ${tries}`);
  expect(tries).toBeGreaterThan(0);
  expect(tries).toBeLessThanOrEqual(3);
  expect((await recNow(page)).bad).toEqual([]);
  await finishAndHome(page, kobo0, 320, 240);
  // Kano's home at 320 x 240 with the hall won: four Play buttons on screen, 44 px, 8 px apart.
  const names = ['Play Kurmi', 'Play Kofar Mata', 'Play Dawanau', 'Go to Borehole Hall'];
  const boxes = [];
  for (const n of names) {
    const b = page.locator('.kano-city').getByRole('button', { name: n });
    await expect(b).toBeVisible();
    boxes.push({ n, ...(await b.boundingBox())! });
    expect(await b.evaluate((e) => e.scrollWidth > e.clientWidth + 1), n).toBe(false);
  }
  await shot(page, '320-home-after');
  for (const b of boxes) {
    expect(b.x, b.n).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, b.n).toBeLessThanOrEqual(320);
    expect(b.y, b.n).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, b.n).toBeLessThanOrEqual(240);
    expect(b.height, b.n).toBeGreaterThanOrEqual(44);
  }
  for (const [i, a] of boxes.entries())
    for (const b of boxes.slice(i + 1)) expect(Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), b.y - (a.y + a.height), a.y - (b.y + b.height)), `${a.n} to ${b.n}`).toBeGreaterThanOrEqual(8);
  expect(errors).toEqual([]);
});

for (const seedN of [3, 5, 9]) {
  test(`qa K5c by hand at 851 x 393: a player 0 to 160 ms late on each press wins in 3 tries (seed ${seedN})`, async ({ page }) => {
    test.setTimeout(400_000);
    const errors = errorsOf(page);
    await page.setViewportSize({ width: 851, height: 393 });
    await seed(page, kanoSave(false));
    await home(page);
    await enterBorehole(page);
    const tries = await upTo3(page, { jitterMs: 80, seed: seedN * 100 }, (n, r) =>
      console.log(`qa K5c 851 seed ${seedN} try ${n}: hurts ${r.hurts.length} at ${r.hurts.map((x) => `${x.t.toFixed(1)}s x${x.x.toFixed(0)}`).join(', ')}, outs ${r.outs.length}, bad ${r.bad.length}`),
    );
    console.log(`qa K5c 851 seed ${seedN}: won on try ${tries}`);
    expect(tries).toBeGreaterThan(0);
    expect((await recNow(page)).bad).toEqual([]);
    expect(errors).toEqual([]);
  });
}

/** The child bot: Forward held, Jump tapped about 3 a second, never aimed; up to 3 games. */
async function childHall(page: Page, kind: 'borehole' | 'pothole') {
  const h = hands(await page.context().newCDPSession(page));
  const btn = await buttonCentres(page);
  await h.down(LEFT, btn.forward.x, btn.forward.y);
  const games: { hits: number; secs: number; won: boolean; hurtX: number[] }[] = [];
  let cur = { hits: 0, secs: 0, won: false, hurtX: [] as number[] };
  let lives = Infinity;
  for (let i = 0; i < 6000; i++) {
    const s = await page.evaluate(() => ({ a: window.__game!.arena as unknown as { hits: number; defeated: boolean; time: number; lives: number; runPhase: string } | null, screen: window.__game!.screen, x: window.__game!.hero.x }));
    if (s.a && s.screen === 'play') {
      cur.hits = Math.max(cur.hits, s.a.hits);
      cur.secs = s.a.time;
      if (s.a.lives < lives && lives !== Infinity) cur.hurtX.push(Math.round(s.x));
      lives = s.a.lives;
      if (s.a.defeated) {
        cur.won = true;
        games.push(cur);
        break;
      }
    }
    if (s.screen !== 'play') {
      const again = page.getByRole('dialog', { name: 'Out of lives' }).getByRole('button', { name: 'Play again' });
      if (await again.isVisible().catch(() => false)) {
        games.push(cur);
        if (games.length >= 3) break;
        await h.upAll();
        await page.waitForTimeout(500);
        await again.tap();
        await expect.poll(() => screenNow(page)).toBe('play');
        cur = { hits: 0, secs: 0, won: false, hurtX: [] };
        lives = Infinity;
        await h.down(LEFT, btn.forward.x, btn.forward.y);
      }
      continue;
    }
    if (i % 2 === 0) {
      await h.down(RIGHT, btn.jump.x, btn.jump.y);
      await page.waitForTimeout(60);
      await h.up(RIGHT);
    }
    await page.waitForTimeout(90);
  }
  await h.upAll();
  return { kind, games };
}

test('qa K5c: the child bot (about 5) in Pothole Hall and Borehole Hall, to compare', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 851, height: 393 });
  // Pothole Hall, from Ogun's city (the Bad road card).
  await seed(page, { v: 2, states: { lagos: DONE, ogun: { arrived: true, streets: OGUN3, parcel: false } }, city: CITY, where: 'ogun' });
  await home(page, 'ogun');
  await page.getByRole('dialog', { name: 'Ogun' }).locator('.city-pin[data-spot="badRoad"]').tap();
  await page.getByRole('dialog', { name: 'Bad road' }).getByRole('button', { name: 'Go to Pothole Hall' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.level.id)).toBe('ogun-hall');
  const pot = await childHall(page, 'pothole');
  // Borehole Hall, from Kano's home.
  await seed(page, kanoSave(false));
  await home(page);
  await enterBorehole(page);
  const bore = await childHall(page, 'borehole');
  for (const r of [pot, bore]) console.log(`qa K5c child ${r.kind}: ${r.games.map((g) => `hits ${g.hits}, ${g.secs.toFixed(1)} s, won ${g.won}, hurt at x ${g.hurtX.join('/')}`).join(' | ')}`);
  const sum = (r: typeof pot) => ({ hits: r.games.reduce((n, g) => n + g.hits, 0), secs: r.games.reduce((n, g) => n + g.secs, 0) / r.games.length });
  const p = sum(pot);
  const b = sum(bore);
  // Borehole Hall is no harder for the child than Pothole Hall, give or take one hit (or it lasts as long).
  expect(b.hits >= p.hits - 1 || b.secs >= p.secs).toBe(true);
});

test('qa K5c: offline after one visit, Borehole Hall opens from Kano\'s home and is won', async ({ page, context }) => {
  test.setTimeout(240_000);
  const failed: string[] = [];
  const asked: string[] = [];
  context.on('requestfailed', (r) => failed.push(r.url()));
  await seed(page, kanoSave(false));
  await home(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  context.on('request', (r) => asked.push(r.url()));
  await home(page);
  await enterBorehole(page);
  const tries = await upTo3(page);
  expect(tries).toBeGreaterThan(0);
  for (let i = 0; i < 800 && (await screenNow(page)) !== 'win'; i++) await page.waitForTimeout(16);
  await expect(page.getByRole('dialog', { name: 'Kano is switched on!' })).toBeVisible();
  await context.setOffline(false);
  console.log(`qa K5c offline: won on try ${tries}; requests while offline ${asked.length}, failed ${failed.length} ${failed.slice(0, 3).join(' ')}`);
  // The tab icon (index.html link rel=icon) is a browser fetch outside the game, as the favicon.
  expect(failed.filter((u) => !/favicon|icons\/icon-192\.png/.test(u))).toEqual([]);
});

test('qa K5c break: switch apps mid-bounce, turn the phone, mash Jump on WAIT, a huge screen', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOf(page);
  await page.setViewportSize({ width: 851, height: 393 });
  await seed(page, kanoSave(false));
  await home(page);
  await enterBorehole(page);
  await watch(page);
  const pad = await touchPad(page);
  // Mash Jump as fast as a finger can under the first valve while it says WAIT.
  await walkTo(page, pad, 140);
  for (let i = 0; i < 80; i++) {
    await pad.jumpDown();
    await page.waitForTimeout(15);
    await pad.jumpUp();
    await page.waitForTimeout(15);
  }
  const a = (await look(page)).a!;
  console.log(`qa K5c break mash: clonks ${a.clonks}, hits ${a.hits}, valve ${a.valve}, outs ${a.whirlsOut}`);
  expect(a.hits).toBe(0);
  // Switch apps mid-bounce: paused; back, the bounce goes on and no whirl leaves in the air.
  await pad.jumpDown();
  await expect.poll(async () => (await look(page)).h.y, { intervals: [16] }).toBeLessThan(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__game!.paused)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pad.done();
  // Turn the phone, and back.
  await page.setViewportSize({ width: 393, height: 851 });
  await page.waitForTimeout(400);
  await shot(page, '393-portrait');
  await page.setViewportSize({ width: 851, height: 393 });
  await page.waitForTimeout(400);
  await page.waitForTimeout(PAST_DOUBLE_TAP_MS);
  const resume = page.getByRole('button', { name: /^(Resume|Play on|Keep playing)$/ });
  if (await resume.first().isVisible().catch(() => false)) await resume.first().tap();
  await expect.poll(() => page.evaluate(() => window.__game!.paused)).toBe(false);
  // A huge screen.
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.waitForTimeout(500);
  await shot(page, '2560-hall');
  const r = await recNow(page);
  expect(r.bad).toEqual([]);
  expect(r.last!.heldBreaks).toBe(0);
  expect(errors).toEqual([]);
});

/** K5c fix: where to save the 320 x 240 picture of the hall with the HUD clear of it, if set. */
const FIT_SHOT = process.env['K5C_FIT_SHOT'];

type Box = { x: number; y: number; w: number; h: number; name?: string };
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('qa K5c fix: at 320 x 240 the HUD covers no valve, tag (WAIT or STUCK, any valve), the pipe between them or the counter; 568 x 320, 640 x 200 and 851 x 393 too', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  for (const [w, hgt] of [[320, 240], [568, 320], [640, 200], [851, 393]] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    // The parcel: its shield chip shows beside the lives, as wide as the HUD's left side gets in the hall.
    await seed(page, kanoSave(true));
    await home(page);
    await enterBorehole(page);
    // Past his first whirl: valve 1 says STUCK (WAIT before it); look at both.
    for (const after of [0.5, 2.3]) {
      await expect.poll(() => page.evaluate(() => (window.__game!.arena as { time?: number } | null)?.time ?? 0)).toBeGreaterThan(after);
      const r = await page.evaluate(() => {
        const rect = (e: Element, name: string, lip = 0) => {
          const b = e.getBoundingClientRect();
          return { x: b.left, y: b.top, w: b.width, h: b.height + lip, name };
        };
        const shown = (e: Element) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden';
        // Each chip has a 3 px lip under it (box-shadow), counted as covered.
        const hud = [...[...document.querySelectorAll('.hud-left > *')].filter(shown).map((e) => rect(e, e.className, 3)), ...[...document.querySelectorAll('.hud-right > *')].filter(shown).map((e) => rect(e, e.className))];
        const c = document.querySelector('canvas')!.getBoundingClientRect();
        const a = window.__game!.arena as unknown as { valve: string; screen: { z: number; tagLeft: boolean[]; seen: { valves: Box[]; tags: Box[]; pipe: Box; counter: Box } } };
        const at = (b: Box, name: string) => ({ ...b, x: b.x + c.left, y: b.y + c.top, name });
        const s = a.screen.seen;
        return {
          valve: a.valve,
          z: a.screen.z,
          tagLeft: a.screen.tagLeft,
          hud,
          things: [...s.valves.map((b, i) => at(b, `valve ${i + 1}`)), ...s.tags.map((b, i) => at(b, `valve ${i + 1}'s tag`)), at(s.pipe, 'the pipe between the valves'), at(s.counter, 'the counter')],
        };
      });
      expect(r.hud.some((b) => /hud-food/.test(b.name)), 'the shield chip shows').toBe(true);
      expect(r.valve).toBe(after < 2 ? 'shut' : 'stuck');
      for (const t of r.things) {
        for (const b of r.hud) expect(overlap(t, b), `${w} x ${hgt}: ${t.name} under ${b.name}`).toBe(false);
        expect(t.x >= 0 && t.y >= 0 && t.x + t.w <= w && t.y + t.h <= hgt, `${w} x ${hgt}: ${t.name} on screen`).toBe(true);
      }
      if (w === 320) {
        // Drawn a little smaller, never tiny; valve 3's tag hangs left, clear of Sound.
        expect(r.z).toBeLessThan(1);
        expect(r.z).toBeGreaterThanOrEqual(0.8);
        expect(r.tagLeft).toEqual([false, false, true]);
      } else {
        // As before: full size, every tag on the right.
        expect(r.z).toBe(1);
        expect(r.tagLeft).toEqual([false, false, false]);
      }
    }
    if (w === 320 && FIT_SHOT) await page.screenshot({ path: FIT_SHOT });
    await shot(page, `fit-${w}x${hgt}`);
  }
  expect(errors).toEqual([]);
});
