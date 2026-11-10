/**
 * A player's plan for Go-Slow Hall (docs/design.md S2.7), shared by the unit bot (hall tests)
 * and the e2e bots (touch and keys). It reads what a player sees (the hero, the lit light, the
 * throws) and says which way to hold and when to jump. Jumps are checked with the game's own
 * physics before they are made.
 *
 * The plan: walk to the spot under the next light and wait there on the floor (the floor is
 * safe from both honks); hop any tyre that is about to touch; once the light is lit and no honk
 * is close, jump straight up onto it (a tap, a held jump, or a held jump and a second jump).
 */
import { createWalker, press, release, step, type Platform, type Terrain } from '../../src/engine/physics';

export type Plan = 'tap' | 'hold' | 'holdAir';

export interface HallHero {
  x: number;
  y: number;
  vy: number;
  vx: number;
  grounded: boolean;
  airJump: boolean;
  dir: 1 | -1;
}

export interface HallThrow {
  kind: string;
  x: number;
  y: number;
  vx: number;
}

export interface HallSight {
  hero: HallHero;
  hits: number;
  lit: number;
  defeated: boolean;
  throws: readonly HallThrow[];
  lights: readonly Platform[];
  groundY: number;
  /** The hero's limits. */
  leftLimit: number;
  rightLimit: number;
}

export interface Decision {
  move: -1 | 0 | 1;
  jump: Plan | null;
  /** Why (for logs). */
  why: string;
}

/** The hall's floor and lights, as the physics sees them. */
export function hallTerrain(s: Pick<HallSight, 'groundY' | 'lights'>): Terrain {
  return { groundY: s.groundY, ground: [{ x0: -200, x1: 2000 }], platforms: s.lights.map((l) => ({ ...l })), fallY: s.groundY + 120 };
}

/** Where a jump pressed after `delay` steps (standing still, no direction held) lands. */
export function landing(terrain: Terrain, h: HallHero, plan: Plan, delay = 0): Platform | null {
  const b = createWalker(h.x, terrain);
  Object.assign(b, { y: h.y, prevY: h.y, vy: h.vy, vx: h.vx, dir: h.dir, grounded: h.grounded, airJump: h.airJump, coyote: h.grounded ? 5 : 0 });
  for (let i = 0; i < delay; i++) step(b, terrain, 1 / 60);
  if (!b.grounded) return null;
  press(b);
  let stage = plan === 'tap' ? 2 : 0;
  if (plan === 'tap') release(b);
  for (let i = 0; i < 240; i++) {
    if (stage < 2 && b.vy >= 0) {
      release(b);
      if (stage === 0 && plan === 'holdAir') {
        press(b);
        stage = 1;
      } else stage = 2;
    }
    step(b, terrain, 1 / 60);
    if (b.grounded) return b.on;
  }
  return null;
}

/** Seconds until a tyre's box first touches a hero standing at x (Infinity if never). */
function tyreContact(t: HallThrow, x: number): number {
  const gap = t.x - 10 - (x + 7); // tyres roll left
  if (t.x + 10 < x - 7) return Infinity; // already past
  if (gap <= 0) return 0;
  return gap / -t.vx;
}

/** A honk is near enough that a jump now would rise into it. */
function honkClose(s: HallSight, x: number, lookAhead: number): boolean {
  return s.throws.some((t) => {
    if (t.kind === 'tyre') return false;
    const later = t.x + t.vx * lookAhead;
    return Math.max(t.x, later) + 18 > x - 30 && Math.min(t.x, later) - 18 < x + 30;
  });
}

/**
 * What to do now. aheadSec: how late the player's press lands after seeing (the jump is planned
 * for where things will be then).
 */
export function decide(s: HallSight, aheadSec = 0): Decision {
  const h = s.hero;
  if (s.defeated) return { move: 0, jump: null, why: 'won' };
  const target = s.lights[Math.min(s.hits, s.lights.length - 1)]!;
  const spot = Math.min(Math.max(target.x + target.w / 2, s.leftLimit + 2), s.rightLimit - 2);
  const dx = spot - h.x;
  const move: -1 | 0 | 1 = Math.abs(dx) <= 10 ? 0 : dx > 0 ? 1 : -1;
  if (!h.grounded) return { move, jump: null, why: 'in the air' };
  const onFloor = h.y >= s.groundY - 0.5;

  // A tyre about to touch: hop it (a short tap is enough and keeps clear of honks).
  if (onFloor) {
    const soon = s.throws.some((t) => t.kind === 'tyre' && tyreContact(t, h.x) - aheadSec < 0.2 && tyreContact(t, h.x) - aheadSec > -0.05);
    if (soon) return { move: 0, jump: 'tap', why: 'hop a tyre' };
  }

  if (move !== 0) return { move, jump: null, why: 'walk to the light' };
  if (s.lit !== s.hits || Math.abs(h.vx) > 8) return { move: 0, jump: null, why: 'wait under the light' };
  // A tyre near enough to roll under the jump's take-off: let it come and hop it first.
  if (onFloor && s.throws.some((t) => t.kind === 'tyre' && tyreContact(t, h.x) - aheadSec < 0.45)) return { move: 0, jump: null, why: 'tyre first' };
  if (honkClose(s, h.x, 0.9 + aheadSec)) return { move: 0, jump: null, why: 'honk near' };
  const terrain = hallTerrain(s);
  const delay = Math.round(aheadSec * 60);
  for (const plan of ['tap', 'hold', 'holdAir'] as const) {
    const p = landing(terrain, h, plan, delay);
    if (p && p.x === target.x && p.y === target.y) return { move: 0, jump: plan, why: `jump onto light ${s.hits}` };
  }
  return { move: 0, jump: null, why: 'no jump lands' };
}
