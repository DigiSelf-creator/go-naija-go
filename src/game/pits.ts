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

/** S2.2 pit kinds: tap and hold potholes, wide potholes (90 to 110 u) and big pits (170 u). */
export type PitKind = 'small' | 'wide' | 'big';

/** A gap this wide or wider must be jumped twice for: it gets a warning sign (S2.13 part 4). */
export const SIGN_GAP = 90;
/** Gaps this wide or wider are big pits (cones on both lips, S2.2). */
export const BIG_PIT = 160;
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
  return p.w >= BIG_PIT ? 'big' : p.w >= SIGN_GAP ? 'wide' : 'small';
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
