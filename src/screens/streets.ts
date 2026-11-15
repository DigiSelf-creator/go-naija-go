/**
 * Nigeria's wheel's fit, worked out with no DOM so it can be unit tested (docs/design.md S2.8).
 * The Streets screen became the challenge road (S3e0, src/screens/road.ts).
 */

/** A street index (0 is street 1) or the hall. */
export type Where = number | 'hall';

/** S2.8 "The wheel screen on every size": where the wheel and its rail go (CSS px, inside the safe area). */
export interface WheelFit {
  /** Wheel side. */
  w: number;
  /** Rail width (portrait: the full width under the wheel). */
  r: number;
  /** Narrow rail (R under 200): the short words. */
  narrow: boolean;
  portrait: boolean;
  wheelX: number;
  wheelY: number;
  railX: number;
  railY: number;
  railH: number;
}

/** Biggest wheel, and the widest rail. */
export const WHEEL_MAX = 560;
export const RAIL_MAX = 360;
export const NARROW_RAIL = 200;

/** S2.8 fit rule: SW and SH are the screen inside the safe area, CSS px. */
export function wheelFit(sw: number, sh: number): WheelFit {
  if (sh > sw) {
    // Upright (menus only): wheel on top, the rail under it at full width.
    const w = Math.max(0, Math.floor(Math.min(sw - 16, sh - 200, WHEEL_MAX)));
    const railY = 8 + w + 8;
    return { w, r: sw - 16, narrow: false, portrait: true, wheelX: Math.floor((sw - w) / 2), wheelY: 8, railX: 8, railY, railH: Math.max(0, sh - railY - 8) };
  }
  const w = Math.max(0, Math.floor(Math.min(sh - 8, sw - 100, WHEEL_MAX)));
  const r = Math.max(0, Math.min(sw - w - 20, RAIL_MAX));
  // When the rail is as wide as it gets, the wheel and rail sit together in the middle.
  const left = r >= RAIL_MAX ? Math.floor((sw - (w + 8 + r)) / 2) : 4;
  return { w, r, narrow: r < NARROW_RAIL, portrait: false, wheelX: left, wheelY: Math.floor((sh - w) / 2), railX: left + w + 8, railY: 0, railH: sh };
}
