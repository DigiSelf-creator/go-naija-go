/**
 * Go-Slow Hall played on the phone profile by real input (docs/design.md S2.7): the shared hall
 * plan (hall-brain.ts) drives either two thumbs on the phone buttons (DevTools touch events, so
 * Forward and Jump can be held together) or the keys (arrows and Space).
 */
import type { CDPSession, Page } from '@playwright/test';
import { buttonCentres, hands, LEFT, RIGHT, type Hands } from './hands';
import { decide, type HallSight, type Plan } from './hall-brain';

export const HALL_URL = './?level=lagos-hall';

export type HallSnap = Awaited<ReturnType<typeof hallSnap>>;
export const hallSnap = (page: Page) =>
  page.evaluate(() => ({
    h: window.__game!.hero,
    r: window.__game!.run,
    b: window.__game!.boss,
    screen: window.__game!.screen,
    paused: window.__game!.paused,
    steps: window.__game!.steps,
    toast: window.__game!.toast,
  }));

/** What the player's hands can do: hold a direction, press and lift Jump. */
export interface Pad {
  move(dir: -1 | 0 | 1): Promise<void>;
  jumpDown(): Promise<void>;
  jumpUp(): Promise<void>;
  /** Lift everything. */
  done(): Promise<void>;
}

/** Two thumbs on the phone buttons: left thumb on Back or Forward, right thumb on Jump. */
export async function touchPad(page: Page, cdp?: CDPSession, h?: Hands): Promise<Pad> {
  const fingers = h ?? hands(cdp ?? (await page.context().newCDPSession(page)));
  const btn = await buttonCentres(page);
  let held: -1 | 0 | 1 = 0;
  return {
    move: async (dir) => {
      if (dir === held) return;
      if (held !== 0) await fingers.up(LEFT);
      held = dir;
      if (dir !== 0) {
        const b = dir > 0 ? btn.forward : btn.back;
        await fingers.down(LEFT, b.x, b.y);
      }
    },
    jumpDown: () => fingers.down(RIGHT, btn.jump.x, btn.jump.y),
    jumpUp: () => fingers.up(RIGHT),
    done: async () => {
      held = 0;
      // Each finger still down is lifted (a touchEnd with none down is an error).
      await fingers.up(LEFT);
      await fingers.up(RIGHT);
    },
  };
}

/** The keys: left and right arrows walk, Space jumps. */
export function keyPad(page: Page): Pad {
  let held: -1 | 0 | 1 = 0;
  let jump = false;
  const key = (d: -1 | 1) => (d > 0 ? 'ArrowRight' : 'ArrowLeft');
  return {
    move: async (dir) => {
      if (dir === held) return;
      if (held !== 0) await page.keyboard.up(key(held));
      held = dir;
      if (dir !== 0) await page.keyboard.down(key(dir));
    },
    jumpDown: async () => {
      jump = true;
      await page.keyboard.down('Space');
    },
    jumpUp: async () => {
      if (!jump) return;
      jump = false;
      await page.keyboard.up('Space');
    },
    done: async () => {
      if (held !== 0) await page.keyboard.up(key(held));
      held = 0;
      if (jump) await page.keyboard.up('Space');
      jump = false;
    },
  };
}

export interface HallPlayOpts {
  /** Stop (hands lifted) when this is true. */
  until?: (s: HallSnap) => boolean;
  /** Seconds to keep waiting under each light after it comes on (so throws come), by light index. */
  dwell?: readonly number[];
  /** Called on every poll. */
  onPoll?: (s: HallSnap) => Promise<void>;
  /** A sloppy first-timer: every press, release and change of direction lands up to this many ms early or late. */
  jitterMs?: number;
  seed?: number;
}

/**
 * Plays the hall fight until the third hit (or game over, or `until`). Returns the presses made
 * and the last look. The finish and the Win screen come after.
 */
export async function playHall(page: Page, pad: Pad, opts: HallPlayOpts = {}): Promise<{ presses: number; last: HallSnap; log: string[] }> {
  const lv = await page.evaluate(() => window.__game!.level);
  const hall = lv.hall!;
  let presses = 0;
  /** The jump being made: its plan, which press (0 first, 1 the second jump), held or not. */
  let plan: Plan | null = null;
  let stage = 0;
  let holding = false;
  let rising = false;
  let sawAir = false;
  let pressedAt = 0;
  const litAt = new Map<number, number>();
  const log: string[] = [];
  let lastWhy = '';
  const J = opts.jitterMs ?? 0;
  let seed = opts.seed ?? 7;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  /** The player acts J ms after seeing, give or take J: 0 to 2J ms from now. */
  const late = async (): Promise<void> => {
    if (J > 0) await page.waitForTimeout(rand() * 2 * J);
  };
  const act = { up: async () => (await late(), pad.jumpUp()), down: async () => (await late(), pad.jumpDown()) };
  let s = await hallSnap(page);
  for (;;) {
    s = await hallSnap(page);
    if (s.r.phase !== 'arena' || !s.b || s.b.defeated || opts.until?.(s)) break;
    if (opts.onPoll) await opts.onPoll(s);
    if (s.paused || s.screen !== 'play') continue;
    const h = s.h;
    if (plan) {
      if (!h.grounded) sawAir = true;
      if (h.vy < 0) rising = true;
      // A held jump: let go at the top; for a second jump press again there and hold to the next top.
      if (holding && rising && h.vy >= -1152 * (J / 1000) && !h.grounded) {
        await act.up();
        holding = false;
        if (plan === 'holdAir' && stage === 0) {
          await act.down();
          presses++;
          stage = 1;
          holding = true;
          rising = false;
        }
      }
      const stuck = !sawAir && s.r.time - pressedAt > 0.5; // the press never made a jump
      if ((sawAir && h.grounded) || stuck) {
        if (holding) await pad.jumpUp();
        holding = false;
        plan = null;
      }
      continue;
    }
    if (!litAt.has(s.b.lit) && s.b.lit >= 0) litAt.set(s.b.lit, s.r.time);
    const sight: HallSight = {
      hero: h,
      hits: s.b.hits,
      lit: s.b.lit,
      defeated: s.b.defeated,
      throws: s.b.throws,
      lights: lv.lights,
      groundY: lv.groundY,
      leftLimit: hall.leftLimit,
      rightLimit: hall.rightLimit,
    };
    const d = decide(sight, 0.05 + J / 1000);
    const wait = opts.dwell?.[s.b.hits] ?? 0;
    const waiting = d.jump !== null && d.why.startsWith('jump onto') && s.r.time - (litAt.get(s.b.lit) ?? s.r.time) < wait;
    if (d.why !== lastWhy) log.push(`${s.r.time.toFixed(2)} s x ${h.x.toFixed(0)}: ${waiting ? 'dwell' : d.why}`);
    lastWhy = d.why;
    if (d.move !== 0 || !d.jump) await pad.move(d.move);
    if (d.jump && !waiting) {
      await pad.move(0);
      await act.down();
      presses++;
      plan = d.jump;
      stage = 0;
      holding = true;
      rising = false;
      sawAir = false;
      pressedAt = s.r.time;
      if (plan === 'tap') {
        await page.waitForTimeout(30);
        await act.up();
        holding = false;
      }
    }
  }
  await pad.done();
  return { presses, last: s, log };
}

/** Waits for the Win screen after the third hit (6.0 s of the kind finish). */
export async function waitForWin(page: Page): Promise<void> {
  for (let i = 0; i < 2000; i++) {
    const s = await page.evaluate(() => window.__game!.screen);
    if (s === 'win') return;
    await page.waitForTimeout(16);
  }
  throw new Error('no Win screen');
}
