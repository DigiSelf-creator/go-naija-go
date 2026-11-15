/**
 * The lane run's round 4 polish (docs/design.md S3f0), as plain rules with no DOM, so they are
 * unit tested: the lamp dots (part 15), the pickups' flight to their chips (part 9), the first
 * run's look-back (part 14) and where the corn count goes (part 11).
 */
import type { HintBarBox } from '../screens/controls';
import { lanePopAt } from '../art/lane-things';
import { HORIZON } from './view';

/* ------------------------------------------------------------------ lamp dots */

/** Part 15: 6 lamp dots after the Blackout words, each 10 m; from 400 px wide. */
export const LAMP_DOTS = 6;
export const LAMP_DOT_M = 10;
export const DOTS_FROM_W = 400;

/** How many of the 6 dots are lit with the Blackout `gap` metres behind: they go dark as it closes. */
export function litDots(gap: number): number {
  if (!(gap > 0)) return 0;
  return Math.min(LAMP_DOTS, Math.ceil(gap / LAMP_DOT_M));
}

/* ------------------------------------------------------------- pop to chip */

export type ChipKind = 'naira' | 'power' | 'tech';
/** Seconds a pickup takes to fly from where it was taken to its chip. */
export const FLY_TIME = 0.55;
/** Several from one burst leave one after another, this far apart. */
export const FLY_GAP = 0.06;
/** Reduced motion: the chip counts up at once with a short "+1" for this long. */
export const PLUS_TIME = 0.8;
/** At most this many in the air at once; more land at once (a long coin line on a slow phone). */
export const FLY_MAX = 16;

export interface Flyer {
  kind: ChipKind;
  /** Kobo for naira, else 1. */
  amount: number;
  x0: number;
  y0: number;
  /** Seconds since it set off (negative: still waiting to leave). */
  t: number;
}

/**
 * Part 9: what you pick up flies straight to its chip at the top. The buckets fill at once
 * (LR-Q1 a); only the chips' numbers wait for their flyer, so each chip counts up as it lands.
 */
export class PopFlights {
  readonly list: Flyer[] = [];

  /** Sends `n` of a kind from one screen point (CSS px), one after another. */
  send(kind: ChipKind, amount: number, n: number, x0: number, y0: number): void {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= FLY_MAX) return;
      this.list.push({ kind, amount, x0, y0, t: i === 0 ? 0 : -i * FLY_GAP });
    }
  }

  /** Moves them on; those that reached their chip are gone. */
  step(dt: number): void {
    let j = 0;
    for (const f of this.list) {
      f.t += dt;
      if (f.t < FLY_TIME) this.list[j++] = f;
    }
    this.list.length = j;
  }

  /** What is still in the air, by chip (its chip shows that much less until it lands). */
  inFlight(): { kobo: number; power: number; tech: number } {
    const out = { kobo: 0, power: 0, tech: 0 };
    for (const f of this.list) {
      if (f.kind === 'naira') out.kobo += f.amount;
      else out[f.kind] += f.amount;
    }
    return out;
  }

  clear(): void {
    this.list.length = 0;
  }

  /** Where a flyer is now, on its way to the chip at (x1, y1); null before it leaves. */
  static at(f: Flyer, x1: number, y1: number): { x: number; y: number } | null {
    if (f.t < 0) return null;
    return lanePopAt(f.x0, f.y0, x1, y1, f.t / FLY_TIME);
  }
}

/* ----------------------------------------------------------- the look back */

/** Part 14: the first lane run's start shows what chases you, in 2 s. */
export const INTRO_TIME = 2;
/** The camera looks back while the far lamps switch off, then turns to behind the hero. */
export const LOOK_BACK_UNTIL = 1.3;
export const TURN_TIME = 0.4;
/** The first line shows until here, the second after. */
export const LINE_SWAP_AT = 1.0;
/** Reduced motion: the still picture of the look back, with the lamps this far switched off. */
export const STILL_LAMPS = 0.6;

export interface IntroFrame {
  /** 'back': looking back down the road; 'turn': turning round; 'front': behind the hero. */
  view: 'back' | 'turn' | 'front';
  /** 0 to 1: how far the switching off of the far lamps has come. */
  lamps: number;
  /** 0 to 1 through the turn. */
  turn: number;
  /** Which line: 0 "The Blackout is switching off the lamps.", 1 "Run to the bus stop!", 2 both (reduced motion). */
  line: 0 | 1 | 2;
}

/** The look back at `t` seconds. Reduced motion (`still`): one still picture with both lines. */
export function introAt(t: number, still: boolean): IntroFrame {
  if (still) return { view: 'back', lamps: STILL_LAMPS, turn: 0, line: 2 };
  const line = t < LINE_SWAP_AT ? 0 : 1;
  const lamps = Math.min(1, Math.max(0, t / (LOOK_BACK_UNTIL - 0.1)));
  if (t < LOOK_BACK_UNTIL) return { view: 'back', lamps, turn: 0, line };
  const p = (t - LOOK_BACK_UNTIL) / TURN_TIME;
  if (p < 1) return { view: 'turn', lamps: 1, turn: p * p * (3 - 2 * p), line };
  return { view: 'front', lamps: 1, turn: 1, line };
}

/* ----------------------------------------------------------- the corn count */

/** S2.9's count heights: 40 px under 280 px tall, 56 for 280 to 419, 72 from 420. */
const COUNT_PX = { small: 40, mid: 56, big: 72 } as const;
/** The lane hint bar's own height: the count is never smaller than the bar it stands in for. */
const BAR_MIN = 22;

/**
 * Part 11: the corn count in the hint bar's place, under row 2, centred. It is as tall as S2.9
 * allows but stops above the horizon (where far things come into view), and never less than the
 * hint bar's own height. Width fits the corn icon and one number.
 */
export function laneCountBox(w: number, h: number, safeTop: number): HintBarBox {
  const size: HintBarBox['size'] = h < 280 ? 'small' : h < 420 ? 'mid' : 'big';
  const row1 = h >= 360 ? 48 : 44;
  const top = safeTop + row1 + 20 + 4;
  const room = Math.max(BAR_MIN, Math.min(COUNT_PX[size] + 6, Math.round(HORIZON * h) - 2 - top));
  const font = Math.max(11, Math.min(COUNT_PX[size], room - 6));
  const bw = Math.min(300, w - 16, Math.round(font * 2.2 + 20));
  return { x: Math.round((w - bw) / 2), w: bw, top, bottom: top + room, size, overThrow: false };
}
