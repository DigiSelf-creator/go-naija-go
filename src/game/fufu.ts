/**
 * Pepper fufu balls (docs/design.md S2.15): how a ball flies, plops, hops twice (each hop
 * smaller), rolls, settles, and what it does to what it meets. Pure rules, no drawing or sound;
 * Run (run.ts) owns the balls and applies what they do (plugs, knocks, fed goats, hall pops).
 *
 * Units as S2.2: world units, y grows down, 60 steps a second. A ball's y is its bottom (where
 * it touches the road), so a ball on the road has y = groundY.
 *
 * Fufu balls are soft hot food, never fire (CLAUDE.md rule 2): the rules never say "fireball".
 */
import { groundAt, type Platform, type Terrain } from '../engine/physics';
import type { HazardKind } from './level';
import type { Pit } from './pits';

const STEPS = 60;
const secs = (s: number): number => Math.round(s * STEPS);

export const FUFU_RULES = {
  /** Balls in one bowl, and the most you can hold (S2.15 "The food"). */
  give: 8,
  max: 16,
  /** A ball is 12 u across. */
  r: 6,
  /** Starts 12 u ahead of the hero's centre, its bottom at hand height (feet - 26). */
  ahead: 12,
  hand: 26,
  /** On the ground (standing, walking, running, on a roof): across and up, u/s. */
  groundVx: 240,
  groundVy: -180,
  /** In the air (Tp: "aims down"): across and down, u/s. */
  airVx: 150,
  airVy: 260,
  gravity: 1400,
  maxFall: 720,
  /** Each hop keeps this share of the landing speed; a hop under minHop (or the third touch) rolls. */
  hopKeep: 0.45,
  minHop: 40,
  hops: 2,
  /** Rolls for up to 1.5 s after its first landing, then settles into a puff of steam (0.3 s). */
  rollSteps: secs(1.5),
  settleSteps: secs(0.3),
  /** Squash frames after a landing. */
  squashSteps: 6,
  /** At most one throw every 0.25 s, and at most 3 balls out at once. */
  coolSteps: secs(0.25),
  maxOut: 3,
  /** Gone this far past the edge of the screen. */
  offScreen: 200,
  /** Potholes a ball plugs (tap, hold and wide); big pits are too deep. */
  plugMin: 30,
  plugMax: 110,
  /** A ball never touches a goat: it stops on the road this far in front of it. */
  goatGap: 16,
  /** The goat chews this long, then says "meeh" and trots off (art GOAT_EAT_TIME). */
  eatSteps: secs(0.6),
  /** A tyre or drum tips off the road in this long (art FUFU.knockTime). */
  knockSteps: secs(0.4),
  /** +1 kobo for a tyre or drum knocked off (amala's smash gives +2). */
  knockKobo: 1,
} as const;

export type BallMode = 'fly' | 'roll' | 'settle' | 'drop' | 'fed' | 'gone';

export interface FufuBall {
  x: number;
  /** Bottom of the ball. */
  y: number;
  /** y last step (landings are from above only). */
  prevY: number;
  vx: number;
  vy: number;
  mode: BallMode;
  /** Landings so far (plop, hop, then roll). */
  touches: number;
  /** Steps since the first landing (-1 before it), or since settling or being fed. */
  t: number;
  /** Roll angle, for the pepper dot. */
  spin: number;
  /** Steps of landing squash left. */
  squash: number;
}

/** What a ball can see of the hero. */
export interface Thrower {
  x: number;
  y: number;
  dir: 1 | -1;
  /** Speed across, u/s (negative = left). */
  vx: number;
  grounded: boolean;
}

/** A new ball thrown the way the hero faces (S2.15 "How a ball flies"). */
export function tossBall(h: Thrower): FufuBall {
  const R = FUFU_RULES;
  const own = Math.max(0, h.vx * h.dir); // the hero's own speed, only if moving that way
  const vx = h.dir * ((h.grounded ? R.groundVx : R.airVx) + own);
  const vy = h.grounded ? R.groundVy : R.airVy;
  const y = h.y - R.hand;
  return { x: h.x + h.dir * R.ahead, y, prevY: y, vx, vy, mode: 'fly', touches: 0, t: -1, spin: 0, squash: 0 };
}

/** A box: left, right, top, bottom. */
export interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

export const ballBox = (b: FufuBall): Box => ({ l: b.x - FUFU_RULES.r, r: b.x + FUFU_RULES.r, t: b.y - 2 * FUFU_RULES.r, b: b.y });
const overlap = (a: Box, b: Box): boolean => a.r >= b.l && a.l <= b.r && a.b >= b.t && a.t <= b.b;

/** A hazard as a ball sees it (streets). */
export interface BallTarget {
  readonly kind: HazardKind;
  x: number;
  /** Feet (or bottom) y. */
  y: number;
  mode: string;
}

/** Everything a ball can meet this step. */
export interface BallWorld {
  terrain: Terrain;
  groundY: number;
  /** Gaps still open (plugged ones are road now). */
  pits: readonly Pit[];
  /** Street hazards with their boxes (half width, height). */
  hazards: readonly BallTarget[];
  hazardBox: Readonly<Record<HazardKind, { halfW: number; h: number }>>;
  /** Hanging crate boxes. */
  crates: readonly Box[];
  /** Hall throws and their boxes (empty on a street). */
  throws: readonly { box: Box }[];
  /** The jam's front (hall), or null. */
  jamX: number | null;
  /** A ball is gone left of `left` or right of `right` (screen edges, fence, bus, walls). */
  left: number;
  right: number;
  /** The hero's x: the side a goat is fed from. */
  heroX: number;
}

export type BallEvent =
  /** First landing ("plop") or a later hop. */
  | { type: 'fufuPlop'; hop: boolean; x: number; y: number }
  | { type: 'fufuRoll'; x: number }
  /** Fell into pothole `pit`: it is plugged. */
  | { type: 'fufuPlug'; pit: Pit; x: number }
  /** Fell into a big pit: too deep, nothing changes. */
  | { type: 'fufuFarPlop'; x: number }
  | { type: 'fufuKnock'; target: BallTarget }
  | { type: 'fufuGoat'; target: BallTarget; x: number }
  | { type: 'fufuPop'; index: number }
  | { type: 'fufuJam' }
  | { type: 'fufuSettle'; x: number; y: number };

/** Where a ball at x could land or roll: the road (not over an open gap) or a roof top. */
function surfaceUnder(w: BallWorld, x: number, prevY: number, y: number): number | null {
  if (prevY <= w.groundY && y >= w.groundY && groundAt(w.terrain, x)) return w.groundY;
  for (const p of w.terrain.platforms) {
    if (x >= p.x && x <= p.x + p.w && prevY <= p.y && y >= p.y) return p.y;
  }
  return null;
}

/** Still on its surface while rolling. */
function supported(w: BallWorld, x: number, y: number): boolean {
  if (y === w.groundY) return groundAt(w.terrain, x);
  return w.terrain.platforms.some((p: Platform) => y === p.y && x >= p.x && x <= p.x + p.w);
}

/** One fixed step of one ball. */
export function stepBall(b: FufuBall, w: BallWorld, dt: number): BallEvent[] {
  const R = FUFU_RULES;
  const ev: BallEvent[] = [];
  if (b.mode === 'gone') return ev;
  if (b.squash > 0) b.squash--;
  if (b.t >= 0) b.t++;
  if (b.mode === 'settle') {
    if (b.t >= R.settleSteps) b.mode = 'gone';
    return ev;
  }
  if (b.mode === 'fed') {
    if (b.t >= R.eatSteps) b.mode = 'gone';
    return ev;
  }
  b.prevY = b.y;
  if (b.mode === 'roll') {
    b.x += b.vx * dt;
    b.spin += (b.vx * dt) / R.r;
    if (!supported(w, b.x, b.y)) {
      b.mode = 'fly'; // rolled off an edge: falls
      b.vy = 0;
    } else if (b.t >= R.rollSteps) {
      b.mode = 'settle';
      b.t = 0;
      ev.push({ type: 'fufuSettle', x: b.x, y: b.y });
      return ev;
    }
  }
  if (b.mode === 'fly' || b.mode === 'drop') {
    b.vy = Math.min(b.vy + R.gravity * dt, R.maxFall);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.spin += (b.vx * dt) / R.r;
  }
  if (b.mode === 'drop') {
    if (b.y > w.groundY + 120) b.mode = 'gone';
    return ev;
  }
  if (b.x < w.left || b.x > w.right) {
    b.mode = 'gone';
    return ev;
  }
  if (b.mode === 'fly') {
    const s = b.vy > 0 ? surfaceUnder(w, b.x, b.prevY, b.y) : null;
    if (s !== null) {
      b.y = s;
      b.touches++;
      if (b.t < 0) b.t = 0;
      b.squash = R.squashSteps;
      const hop = b.vy * R.hopKeep;
      if (b.touches > R.hops || hop < R.minHop) {
        b.vy = 0;
        b.mode = 'roll';
        ev.push(b.touches === 1 ? { type: 'fufuPlop', hop: false, x: b.x, y: s } : { type: 'fufuRoll', x: b.x });
      } else {
        b.vy = -hop;
        ev.push({ type: 'fufuPlop', hop: b.touches > 1, x: b.x, y: s });
      }
    } else if (b.y > w.groundY && b.prevY <= w.groundY && !groundAt(w.terrain, b.x)) {
      // Into a gap in the road.
      const pit = w.pits.find((p) => b.x >= p.a && b.x <= p.b);
      if (pit && pit.w >= R.plugMin && pit.w <= R.plugMax) {
        b.mode = 'gone';
        ev.push({ type: 'fufuPlug', pit, x: b.x });
        return ev;
      }
      b.mode = 'drop';
      ev.push({ type: 'fufuFarPlop', x: b.x });
      return ev;
    }
  }
  meet(b, w, ev);
  return ev;
}

/** What the ball meets now (S2.15 "What a ball does"). */
function meet(b: FufuBall, w: BallWorld, ev: BallEvent[]): void {
  const R = FUFU_RULES;
  const box = ballBox(b);
  for (const z of w.hazards) {
    if (z.mode !== 'wait' && z.mode !== 'move') continue;
    const size = w.hazardBox[z.kind];
    const hb: Box = { l: z.x - size.halfW, r: z.x + size.halfW, t: z.y - size.h, b: z.y };
    if (z.kind === 'goat') {
      // Never touched: a ball near enough to touch it soon stops on the road in front of it.
      const near: Box = { l: hb.l - R.goatGap, r: hb.r + R.goatGap, t: hb.t - R.goatGap, b: hb.b };
      if (!overlap(box, near)) continue;
      const side = w.heroX <= z.x ? -1 : 1;
      b.x = z.x + side * (size.halfW + R.goatGap + R.r);
      b.y = b.prevY = w.groundY;
      b.vx = b.vy = 0;
      b.mode = 'fed';
      b.t = 0;
      ev.push({ type: 'fufuGoat', target: z, x: b.x });
      return;
    }
    if (overlap(box, hb)) {
      b.mode = 'gone';
      ev.push({ type: 'fufuKnock', target: z });
      return;
    }
  }
  for (let i = 0; i < w.throws.length; i++) {
    if (overlap(box, w.throws[i]!.box)) {
      b.mode = 'gone';
      ev.push({ type: 'fufuPop', index: i });
      return;
    }
  }
  if (w.jamX !== null && b.x + R.r >= w.jamX) {
    b.mode = 'gone';
    ev.push({ type: 'fufuJam' });
    return;
  }
  // Crates are never opened by a ball: touching one, it drops straight down.
  if (b.vx !== 0 && w.crates.some((c) => overlap(box, c))) {
    b.vx = 0;
    if (b.mode === 'roll') {
      b.mode = 'fly';
      b.vy = 0;
    }
  }
}

/** The balls still in play (flying, hopping or rolling): the "at most 3 out" count. */
export const ballsOut = (balls: readonly FufuBall[]): number => balls.filter((b) => b.mode === 'fly' || b.mode === 'roll').length;
