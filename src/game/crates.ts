/**
 * Hanging crates (docs/design.md S2.4): the rules only, no drawing or sound, so they can be unit
 * tested. Run (run.ts) calls stepCrates once per fixed step, after the hero has moved.
 *
 * - Only a head hit from below opens a crate: the hero is rising, its centre x is within the
 *   crate's centre x plus or minus 20 (16 half width plus 4 grace at the corners), and the head
 *   (feet y - 44) was at or below the crate's bottom last step and is above it now. The head
 *   stops there, vy becomes +60, the hold for higher ends, the second jump stays if unused.
 * - From the side or from above a crate is not solid: the hero passes in front and it swings
 *   8 degrees. The hero never stands on a crate.
 * - Amala opens a full crate from any side (any touch of the two boxes).
 * - A kobo crate gives 3 kobo at once. A food crate pops its food out; it drops straight down to
 *   the surface under the crate and waits there until taken.
 * - An open crate stays open and empty: a hit gives a "tok" and a small swing, nothing else.
 */
import { foodPopAt } from '../art/crate';
import { headStop, type Body } from '../engine/physics';
import type { CrateContents, CrateData, FoodKind } from './level';

export const CRATE_RULES = {
  /** Half the crate's width (32 wide). */
  halfW: 16,
  /** Crate height. */
  h: 28,
  /** Extra reach each side for a head hit: the hero's centre within halfW + grace. */
  grace: 4,
  /** vy after the head meets a crate: a small push down, u/s. */
  bumpVy: 60,
  /** Kobo in a kobo crate. */
  kobo: 3,
  /** The surface (road or roof) is this far under a crate's bottom. */
  surfaceBelow: 96,
  /** A dropped food waits with its centre this far above the surface (road: y 272). */
  foodAbove: 28,
} as const;

export interface CrateFood {
  readonly kind: FoodKind;
  readonly x: number;
  y: number;
  /** Steps since it popped out. */
  t: number;
  /** Centre y where it comes to rest. */
  readonly restY: number;
  landed: boolean;
  taken: boolean;
}

export interface CrateState {
  readonly x: number;
  readonly bottomY: number;
  readonly contents: CrateContents;
  /** Opened and emptied. */
  open: boolean;
  /** Step count (Run.steps) at the last knock, or null if never knocked. */
  knockStep: number | null;
  /** The last knock: a hit from below (12 degrees) or a brush (8). */
  knock: 'hit' | 'brush';
  /** Which way the last knock pushed the bottom: 1 right, -1 left. */
  dir: 1 | -1;
  /** Step count at which it opened (for the lid, the kobo fan), or null. */
  openStep: number | null;
  /** The hero's box touched the crate's box last step (a brush swings once per touch). */
  touching: boolean;
  /** The food popped out of a food crate, until a lost life fills the crate again. */
  food: CrateFood | null;
}

export type CrateEvent =
  /** A full crate opened: its contents come out. */
  | { type: 'crate'; contents: CrateContents; x: number; y: number }
  /** An empty crate was hit from below: "tok", a small swing. */
  | { type: 'crateEmpty'; x: number; y: number };

export function freshCrates(data: readonly CrateData[]): CrateState[] {
  return data.map((c) => ({
    x: c.x,
    bottomY: c.bottomY,
    contents: c.contents,
    open: false,
    knockStep: null,
    knock: 'hit',
    dir: 1,
    openStep: null,
    touching: false,
    food: null,
  }));
}

/**
 * The crate a head hit from below opens this step, or null (S2.4 hit rule, steps 1 to 3 and 5).
 * `heroH` is the hero's height (head = feet y - heroH).
 */
export function headHit(crates: readonly CrateState[], hero: Pick<Body, 'x' | 'y' | 'prevY' | 'vy'>, heroH: number): CrateState | null {
  if (!(hero.vy < 0)) return null;
  const head = hero.y - heroH;
  const prevHead = hero.prevY - heroH;
  const reach = CRATE_RULES.halfW + CRATE_RULES.grace;
  let best: CrateState | null = null;
  for (const c of crates) {
    const dx = Math.abs(hero.x - c.x);
    if (dx > reach || prevHead < c.bottomY || head >= c.bottomY) continue;
    if (best === null || dx < Math.abs(hero.x - best.x)) best = c;
  }
  return best;
}

/** The hero's box touches the crate's box (edges touching do not count). */
export function touches(c: CrateState, box: { l: number; r: number; t: number; b: number }): boolean {
  return box.r > c.x - CRATE_RULES.halfW && box.l < c.x + CRATE_RULES.halfW && box.b > c.bottomY - CRATE_RULES.h && box.t < c.bottomY;
}

/** Centre y where a food from this crate comes to rest: 28 u above the surface under it. */
export function foodRestY(c: Pick<CrateState, 'bottomY'>): number {
  return c.bottomY + CRATE_RULES.surfaceBelow - CRATE_RULES.foodAbove;
}

export interface CrateStepInput {
  hero: Body;
  heroBox: { l: number; r: number; t: number; b: number };
  heroH: number;
  /** Amala is on: a full crate opens at any touch. */
  amala: boolean;
  /** Run.steps now. */
  steps: number;
  dt: number;
}

/**
 * One step of the crates: a head hit from below, brushes, amala touches, and dropping foods.
 * Returns the kobo to add, and events for sounds and pictures.
 */
export function stepCrates(crates: CrateState[], s: CrateStepInput): { kobo: number; events: CrateEvent[] } {
  const events: CrateEvent[] = [];
  let kobo = 0;
  const h = s.hero;
  const knock = (c: CrateState, kind: 'hit' | 'brush'): void => {
    c.knockStep = s.steps;
    c.knock = kind;
    const push = h.vx !== 0 ? Math.sign(h.vx) : Math.sign(c.x - h.x) || 1;
    c.dir = push > 0 ? 1 : -1;
  };
  const open = (c: CrateState): void => {
    c.open = true;
    c.openStep = s.steps;
    const top = c.bottomY - CRATE_RULES.h;
    if (c.contents === 'kobo') kobo += CRATE_RULES.kobo;
    else c.food = { kind: c.contents, x: c.x, y: top, t: 0, restY: foodRestY(c), landed: false, taken: false };
    events.push({ type: 'crate', contents: c.contents, x: c.x, y: top });
  };

  const hit = headHit(crates, h, s.heroH);
  if (hit) {
    // S2.4 step 4: the head stops at the crate's bottom, a small push down, the hold ends.
    headStop(h, hit.bottomY + s.heroH, CRATE_RULES.bumpVy);
    if (hit.open) {
      knock(hit, 'brush');
      events.push({ type: 'crateEmpty', x: hit.x, y: hit.bottomY });
    } else {
      knock(hit, 'hit');
      open(hit);
    }
  }
  const box = hit ? { ...s.heroBox, t: h.y - s.heroH, b: h.y } : s.heroBox;
  for (const c of crates) {
    const now = touches(c, box);
    if (now && !c.touching && c !== hit) {
      if (s.amala && !c.open) {
        knock(c, 'hit');
        open(c);
      } else knock(c, 'brush');
    }
    c.touching = now;
  }

  for (const c of crates) {
    const f = c.food;
    if (!f || f.taken || f.landed) continue;
    f.t++;
    const p = foodPopAt((f.t * s.dt), c.bottomY, f.restY);
    f.y = p.y;
    f.landed = p.landed;
  }
  return { kobo, events };
}

/** After a lost life: food crates at or past the restart point fill up again. Kobo crates stay open. */
export function refillCrates(crates: CrateState[], fromX: number): void {
  for (const c of crates) {
    if (c.contents === 'kobo' || c.x < fromX) continue;
    c.open = false;
    c.openStep = null;
    c.food = null;
    c.touching = false;
  }
}
