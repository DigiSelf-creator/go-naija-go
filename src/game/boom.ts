/**
 * The Booming meter you can see (docs/city.md part 5 step (d), d1, d3, d9), with no DOM.
 *
 * Lagos starts tired. What is bright is worked out from the save (`fixed`, `built`, `boom`), never
 * saved itself, so it comes back the same after a reload and only ever grows:
 *   bright = the sets of every board done
 *          + the first `steps` blocks of STEP_ORDER that are not bright already
 *            (`steps` = how many of 4, 8, 12, 16 the meter has passed)
 *          + at the first boom (20), every block but a spot block whose problem is not fixed,
 *            and the bus park and the shore.
 */
import { CITY_AREAS, type SpotId } from '../art/city';
import type { BuildId } from '../art/payspot';
import { FIRST_BOOM, isBuilt, type CityState } from './city';

/** d3: what each board brightens at once, its own set (blocks, 'busPark', 'shore'). */
export const FIX_SET: Readonly<Record<BuildId, readonly string[]>> = {
  road: ['r0c0', 'r1c0', 'r2c0'],
  mamaPut: ['r2c2', 'busPark'],
  market: ['r2c3', 'shore'],
  lamps: ['r2c1', 'r1c1'],
  mast: ['r1c3', 'r0c3'],
};

/** d3: each meter step brightens the first of these not bright yet (from the middle outward). */
export const STEP_ORDER: readonly string[] = ['r1c1', 'r1c2', 'r0c1', 'r0c2', 'r0c3', 'r2c2', 'r2c3', 'r0c0', 'r1c0', 'r2c0'];

/** The blocks with a problem spot: they stay tired until their own fix. */
export const SPOT_BLOCK: Readonly<Partial<Record<SpotId, string>>> = { lightsOut: 'r2c1', slowInternet: 'r1c3' };

/** Points a meter step holds before the first boom (d1: 20 in 5 steps). */
const FIRST_STEP = FIRST_BOOM / 5;

const BUILD_IDS = Object.keys(FIX_SET) as BuildId[];

/** The areas the boards already done brighten. */
export function fixSet(c: CityState): Set<string> {
  const out = new Set<string>();
  for (const b of BUILD_IDS) if (isBuilt(c, b)) for (const a of FIX_SET[b]) out.add(a);
  return out;
}

/** d3: every bright area of the city (in CITY_AREAS order). Only grows as the save grows. */
export function brightAreas(c: CityState): string[] {
  const out = fixSet(c);
  if (c.boom >= FIRST_BOOM) {
    const tired = new Set(Object.entries(SPOT_BLOCK).filter(([s]) => !c.fixed.includes(s as SpotId)).map(([, b]) => b));
    for (const a of CITY_AREAS) if (!tired.has(a)) out.add(a);
  } else {
    const steps = Math.min(4, Math.floor(c.boom / FIRST_STEP));
    for (const b of STEP_ORDER.filter((x) => !out.has(x)).slice(0, steps)) out.add(b);
  }
  return CITY_AREAS.filter((a) => out.has(a));
}

/** The Booming marks: 20, 50, 90, 140, then each gap 10 bigger (d1). */
function marks(upTo: number): number[] {
  const out: number[] = [];
  for (let m = FIRST_BOOM, gap = 30; m <= upTo; m += gap, gap += 10) out.push(m);
  return out;
}

/** The highest mark reached, or 0. */
export function markReached(points: number): number {
  return marks(points).pop() ?? 0;
}

/** A boom whose card has not shown yet (d9): the mark, or 0. */
export function boomDue(c: CityState): number {
  const m = markReached(c.boom);
  return m > c.boomSeen ? m : 0;
}

/** What the city is drawn as: a boom not shown yet is held back until it plays (d6, d9). */
export function shownBoom(c: CityState): { bright: string[]; boom: boolean } {
  const boom = c.boomSeen >= FIRST_BOOM;
  return { bright: brightAreas(boom ? c : { ...c, boom: Math.min(c.boom, FIRST_BOOM - 1) }), boom };
}

export interface Meter {
  /** Points as the words say them ("9 of 20"). */
  points: number;
  /** The last mark (0 before the first) and the next one. */
  prev: number;
  next: number;
  /** Notches a step holds (gap ÷ 5) and notches filled. */
  per: number;
  filled: number;
  /** Full steps (0 to 5). */
  step: number;
}

/**
 * The bar (d1, d5): the stretch from the last mark to the next, in 5 steps. A mark whose boom has
 * not shown yet (`seen` below it) stays the end of the bar, full: "20 of 20" until the boom plays.
 */
export function meterOf(points: number, seen = Infinity): Meter {
  const p = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0));
  let prev = 0;
  let next = FIRST_BOOM;
  for (let gap = 30; p >= next && next <= seen; gap += 10) {
    prev = next;
    next += gap;
  }
  const per = (next - prev) / 5;
  const shown = Math.min(p, next);
  const filled = shown - prev;
  return { points: shown, prev, next, per, filled, step: Math.floor(filled / per) };
}

/**
 * The block a meter step brightened between two saves, or null: only when a step (not a mark) was
 * crossed, and only a block no fix brightened.
 */
export function stepBlock(before: CityState, after: CityState): string | null {
  const m0 = meterOf(before.boom, before.boomSeen);
  const m1 = meterOf(after.boom, after.boomSeen);
  if (m1.prev !== m0.prev || m1.step <= m0.step || m1.points >= m1.next) return null;
  const was = new Set(shownBoom(before).bright);
  const fix = fixSet(after);
  return shownBoom(after).bright.find((a) => !was.has(a) && !fix.has(a) && STEP_ORDER.includes(a)) ?? null;
}
