/**
 * Lagos from above, with people walking about (task S3g1b; design.md "People everywhere" part
 * 9): ambient walkers on the walk grid (3, plus 1 per fix or build, plus 2 per Booming step, at
 * most 12), choosing bright blocks 3 times as often as tired ones; the Mama Put queue and cook;
 * the Market's shoppers; the bus park's waiting people; the cheering crowd at Mission complete.
 * No drawing here and no DOM: the city screen (src/screens/city.ts) draws them.
 */
import { CITY_BLOCKS } from '../art/city';
import { MAMA_PUT_QUEUE, MARKET_SHOPPER_SPOTS, mamaPutQueueSpot } from '../art/folkCasts';
import type { FolkFrame } from '../art/folk';
import { FIRST_BOOM } from './city';
import { seeded } from './crowd';
import { frontSpots } from './moment';
import { findPath, type Pt } from './walkGrid';

/** Part 9 numbers (map units, seconds). */
export const CITY_FOLK = {
  base: 3,
  max: 12,
  speed: [50, 80] as const,
  /** Walkers never stop within this of a pay spot, a tray (a place's door) or a pin. */
  clear: 16,
  /** A walker the hero comes this close to stops, steps aside and waves. */
  heroNear: 14,
  stepAside: 4,
  waveTime: 1,
  brightWeight: 3,
  queue: 3,
  queueEvery: 6,
  shopperEvery: 4,
  /** A person shorter than this on screen (px) is not drawn. */
  minPx: 6,
  missionCheer: 2,
} as const;

/** The Booming steps reached for these points: 5 a mark, each mark's gap in fifths (boom.ts meterOf). */
export function boomSteps(points: number): number {
  const p = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0));
  let prev = 0;
  let next = FIRST_BOOM;
  let steps = 0;
  for (let gap = 30; p >= next; gap += 10) {
    steps += 5;
    prev = next;
    next += gap;
  }
  return steps + Math.floor((p - prev) / ((next - prev) / 5));
}

/** Part 9's count rule: 3, plus 1 for each fix or build, plus 2 for each Booming step, at most 12. */
export function ambientCount(c: { fixed: readonly string[]; built: readonly string[]; boom: number }): number {
  return Math.min(CITY_FOLK.max, CITY_FOLK.base + c.fixed.length + c.built.length + 2 * boomSteps(c.boom));
}

/** Picks a block for a walker: bright ones 3 times as often as tired ones (part 9). */
export function pickBlock(bright: ReadonlySet<string>, r: () => number): string {
  const ids = CITY_BLOCKS.map((b) => b.id);
  const w = ids.map((id) => (bright.has(id) ? CITY_FOLK.brightWeight : 1));
  let u = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) {
    u -= w[i]!;
    if (u < 0) return ids[i]!;
  }
  return ids[ids.length - 1]!;
}

export interface CityWalker {
  pts: Pt[];
  /** Distance walked along pts. */
  d: number;
  len: number;
  speed: number;
  look: number;
  /** Seconds left of a stop (the hero came close: step aside and wave). */
  stop: number;
  /** Seconds since it last moved (stands when the map stops drawing every frame). */
  idle: number;
  t: number;
}

const near = (a: Pt, b: Pt, r: number): boolean => Math.hypot(a.x - b.x, a.y - b.y) < r;

function pathLen(pts: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return n;
}

/** Where a walker is now, and which way it is heading. */
export function cityWalkerAt(w: CityWalker): Pt & { dx: number; dy: number } {
  let d = Math.max(0, Math.min(w.d, w.len));
  for (let i = 1; i < w.pts.length; i++) {
    const a = w.pts[i - 1]!;
    const b = w.pts[i]!;
    const s = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= s || i === w.pts.length - 1) {
      const k = s > 0 ? Math.min(1, d / s) : 1;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: (b.x - a.x) / (s || 1), dy: (b.y - a.y) / (s || 1) };
    }
    d -= s;
  }
  const p = w.pts[w.pts.length - 1] ?? { x: 0, y: 0 };
  return { ...p, dx: 1, dy: 0 };
}

/**
 * The ambient walkers (part 9): each walks from one block's front to another's and, there, goes
 * in at a door while a new one comes out somewhere else. The same every visit (a fixed seed).
 * They are never solid: if the hero comes within 14 u a walker stops, steps aside and waves,
 * unless it is within 16 u of a pay spot, tray or pin (then it walks on and never stops there).
 */
export class CityWalkers {
  list: CityWalker[] = [];
  private r = seeded(4242);
  private cast = 16;
  constructor(
    /** Spots nobody stops near: pay mats, doors with trays, pins. */
    public keepClear: readonly Pt[] = [],
  ) {}

  private make(bright: ReadonlySet<string>, from?: Pt): CityWalker | null {
    const r = this.r;
    const a = from ?? frontSpots(pickBlock(bright, r), 3)[Math.floor(r() * 3)]!;
    const b = frontSpots(pickBlock(bright, r), 3)[Math.floor(r() * 3)]!;
    const path = findPath(a, b);
    if (!path.length) return null;
    const pts = [a, ...path];
    const len = pathLen(pts);
    if (len < 40) return null;
    return { pts, d: from ? 0 : r() * len * 0.8, len, speed: CITY_FOLK.speed[0] + r() * (CITY_FOLK.speed[1] - CITY_FOLK.speed[0]), look: Math.floor(r() * this.cast), stop: 0, idle: 0, t: 0 };
  }

  /** Keeps `want` walkers (fewer if a way cannot be found). */
  fill(want: number, bright: ReadonlySet<string>, cast: number): void {
    this.cast = Math.max(1, cast);
    if (this.list.length > want) this.list.length = want;
    for (let guard = 0; this.list.length < want && guard < want * 4; guard++) {
      const w = this.make(bright);
      if (w) this.list.push(w);
    }
  }

  /**
   * A step. `walking`: the map draws every frame now (else everyone holds still: a still city
   * draws nothing, W10). `watch`: a moment is playing (everyone stops to watch it).
   */
  step(dt: number, hero: Pt, bright: ReadonlySet<string>, walking: boolean, watch: boolean): void {
    for (let i = 0; i < this.list.length; i++) {
      const w = this.list[i]!;
      w.t += dt;
      if (!walking || watch) {
        w.idle += dt;
        continue;
      }
      if (w.stop > 0) {
        w.stop -= dt;
        w.idle = 0;
        continue;
      }
      const at = cityWalkerAt(w);
      if (near(at, hero, CITY_FOLK.heroNear) && !this.keepClear.some((p) => near(at, p, CITY_FOLK.clear)) && w.idle >= 0) {
        w.stop = CITY_FOLK.waveTime;
        w.idle = -2; // walks on for a while before it may stop again
        continue;
      }
      w.d += w.speed * dt;
      w.idle = Math.min(0, w.idle + dt);
      if (w.d >= w.len) {
        // In at a door; a new one comes out of another.
        const nw = this.make(bright);
        if (nw) this.list[i] = { ...nw, d: 0 };
        else w.d = 0;
      }
    }
  }
}

/** One person to draw in the city (map units, feet). */
export interface CityPerson {
  look: number;
  frame: FolkFrame;
  x: number;
  y: number;
  flip: boolean;
  /** 0 to 1 see-through (walking off). */
  alpha?: number;
}

/**
 * The Mama Put queue (part 9): 3 at the counter; every 6 s the first leaves with a wrapped plate
 * or a pack and a new one joins the back. `p`: 0 to 1 through the 6 s (MAMA_PUT.plateTime),
 * `served`: plates so far (picks who is in the queue). Relative to drawMamaPut's (x, y).
 */
export function mamaPutQueue(p: number, served: number, still: boolean, full: boolean): CityPerson[] {
  const q = still || full ? 0.2 : Math.max(0, Math.min(1, p));
  const who = (i: number): number => (served + i) % MAMA_PUT_QUEUE.length;
  const move = q < 0.6 ? 0 : (q - 0.6) / 0.4;
  const out: CityPerson[] = [];
  const walkF = (k: number): FolkFrame => `walk${Math.floor(k * 8) % 4}` as FolkFrame;
  for (let i = CITY_FOLK.queue; i >= 1; i--) {
    const a = mamaPutQueueSpot(i);
    const b = mamaPutQueueSpot(i - 1);
    const walking = move > 0 && move < 1;
    // The new one at the back joins as the queue moves up.
    if (i === CITY_FOLK.queue && move === 0) continue;
    const from = i === CITY_FOLK.queue ? { x: a.x + 12, y: a.y + 4 } : a;
    const to = i === CITY_FOLK.queue ? a : b;
    out.push({ look: who(i), frame: walking ? walkF(move) : 'stand', x: from.x + (to.x - from.x) * move, y: from.y + (to.y - from.y) * move, flip: true, ...(i === CITY_FOLK.queue ? { alpha: Math.min(1, move * 2) } : {}) });
  }
  const f = mamaPutQueueSpot(0);
  if (q < 0.3) out.push({ look: who(0), frame: 'stand', x: f.x, y: f.y, flip: true });
  else if (q < 0.75) {
    const k = (q - 0.3) / 0.45;
    out.push({ look: who(0), frame: walkF(k), x: f.x + k * 26, y: f.y + k * 22, flip: false, alpha: k > 0.75 ? (1 - k) / 0.25 : 1 });
  }
  return out;
}

/** The Market's 5 shoppers (part 9): they move a little between stalls every few seconds. */
export function marketShoppers(t: number, still: boolean): CityPerson[] {
  const n = MARKET_SHOPPER_SPOTS.length;
  const step = still ? 0 : Math.floor(t / CITY_FOLK.shopperEvery);
  const k = still ? 1 : Math.min(1, (t % CITY_FOLK.shopperEvery) / 0.6);
  return [0, 1, 2, 3, 4].map((i) => {
    // The trader showing cloth stays at her table; the others shift one spot along and back.
    const moves = i === 3 ? 0 : (i + step) % 2;
    const was = i === 3 ? 0 : (i + step + 1) % 2;
    const a = MARKET_SHOPPER_SPOTS[Math.min(n - 1, i + was)]!;
    const b = MARKET_SHOPPER_SPOTS[Math.min(n - 1, i + moves)]!;
    const walking = k < 1 && a !== b;
    return { look: i, frame: i === 3 ? 'call' : walking ? (`walk${Math.floor(t * 7) % 4}` as FolkFrame) : 'stand', x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, flip: b.x < a.x };
  });
}

/** The bus park's waiting people: 2, 4 after the first boom (part 9). */
export function busParkWaiting(boomed: boolean): Pt[] {
  return frontSpots('busPark', 4)
    .slice(0, boomed ? 4 : 2)
    .map((p) => ({ x: p.x + 9, y: p.y - 6 }));
}

/** Mission complete's crowd by the stop (part 10): 5 people, cheering for 2 s from the hero stepping off. */
export function missionCrowd(bus: Pt, sinceOff: number, still: boolean): CityPerson[] {
  const cheer = sinceOff >= 0 && sinceOff < CITY_FOLK.missionCheer;
  return [-30, -20, 22, 32, 42].map((dx, i) => ({
    look: (i * 3 + 2) % 16,
    frame: cheer ? (`cheer${still ? 0 : Math.floor(sinceOff / 0.25 + i) % 2}` as FolkFrame) : 'stand',
    x: bus.x + dx,
    y: bus.y + 14 + (i % 2) * 3,
    flip: dx > 0,
  }));
}
