/**
 * Pits worked out from a street's road spans (gaps between them), with no level file change:
 * the pothole warning signs and Gentle mode's climb-out point (docs/design.md S2.2, S2.13).
 */
import type { Level } from './level';

/** One gap in the road: left lip a, right lip b, width w. */
export interface Pit {
  a: number;
  b: number;
  w: number;
}

/**
 * S2.2 pit kinds: tap and hold potholes, wide potholes (90 to 110 u), big pits (170 u) and,
 * from S2.16 B4, dash gaps (250 to 270 u: crossed only by a dash jump).
 */
export type PitKind = 'small' | 'wide' | 'big' | 'dash';

/** A gap this wide or wider must be jumped twice for: it gets a warning sign (S2.13 part 4). */
export const SIGN_GAP = 90;
/** Gaps this wide or wider are big pits (cones on both lips, S2.2). */
export const BIG_PIT = 160;
/** Gaps this wide or wider are dash gaps (S2.16 B4). */
export const DASH_GAP = 250;
/**
 * S2.16 B4 Gentle mode: a 60 u stack of cement blocks stands in every dash gap from its left
 * lip + 100 to + 160, so the gap is two 100 u potholes. Worked out from the gap, no level data.
 */
export const BLOCKS_FROM = 100;
export const BLOCKS_W = 60;
/** The sign's post centre stands this far before the gap's left lip (S2.13 part 4). */
export const SIGN_BEFORE = 120;

/** Every gap between road spans, left to right. */
export function pitsOf(ground: Level['ground']): Pit[] {
  const out: Pit[] = [];
  for (let i = 1; i < ground.length; i++) {
    const a = ground[i - 1]![1];
    const b = ground[i]![0];
    if (b > a) out.push({ a, b, w: b - a });
  }
  return out;
}

export function pitKind(p: Pit): PitKind {
  return p.w >= DASH_GAP ? 'dash' : p.w >= BIG_PIT ? 'big' : p.w >= SIGN_GAP ? 'wide' : 'small';
}

/** S2.16 B4: the Gentle mode block stacks, one per dash gap, as road spans [x0, x1]. */
export function gentleBlocks(ground: Level['ground']): (readonly [number, number])[] {
  return pitsOf(ground)
    .filter((p) => p.w >= DASH_GAP)
    .map((p) => [p.a + BLOCKS_FROM, p.a + BLOCKS_FROM + BLOCKS_W] as const);
}

/** The road with the Gentle mode blocks in it, left to right. */
export function withBlocks(ground: Level['ground']): (readonly [number, number])[] {
  return [...ground, ...gentleBlocks(ground)].sort((p, q) => p[0] - q[0]);
}

/** The sign before each gap 90 u or wider: the pothole sign, or the dash sign for a dash gap (S2.16 B4). */
export function roadSigns(level: Pick<Level, 'ground' | 'hall'>): { x: number; dash: boolean }[] {
  if (level.hall) return [];
  return pitsOf(level.ground)
    .filter((p) => p.w >= SIGN_GAP)
    .map((p) => ({ x: p.a - SIGN_BEFORE, dash: p.w >= DASH_GAP }));
}

/**
 * S2.13 part 4: the x of every pothole warning sign's post centre, one 120 u before the left lip
 * of every gap 90 u or wider. Streets only: never in a hall (a well room is not a Level and
 * has no gaps).
 */
export function potholeSigns(level: Pick<Level, 'ground' | 'hall'>): number[] {
  if (level.hall) return [];
  return pitsOf(level.ground)
    .filter((p) => p.w >= SIGN_GAP)
    .map((p) => p.a - SIGN_BEFORE);
}
