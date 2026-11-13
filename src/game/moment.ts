/**
 * The "watch it change" moment and the boom (docs/city.md part 5 step (d), d6), with no DOM: the
 * times, the parts of the map a ring brightens, the danfo's drive and the walkers' ways.
 * The city screen (src/screens/city.ts) plays them.
 */
import { BUS_PARK, CITY_BLOCKS, CITY_MAP } from '../art/city';
import { ALAUSA_ROAD, type BuildId } from '../art/payspot';
import { FIX_SET } from './boom';
import { findPath, nearestOpen, type Pt } from './walkGrid';

/** d6: seconds from the board saying "Done ✓". */
export const MOMENT = {
  /** The camera eases (or, with reduced motion, cuts) by then. */
  camera: 0.5,
  /** The meter's notches fill from here, one each 0.1 s. */
  notches: 0.3,
  notch: 0.1,
  ring: [0.5, 2.0],
  /** Sting and the built line; the step ring then lasts 0.8 s. */
  sting: 2.0,
  stepRing: 0.8,
  walk: [1.5, 3.5],
  drive: [1.5, 3.6],
  end: 3.6,
  /** Reduced motion: the tired picture holds this long, then cuts to the bright one. */
  hold: 0.5,
} as const;

/** d6: seconds from the start of the boom. */
export const BOOM = {
  camera: 0.6,
  tune: 0.6,
  ring: [0.6, 2.4],
  flats: [1.0, 2.2],
  ferry: [1.0, 2.4],
  walk: [1.6, 3.0],
  card: 3.0,
  /** The big ring starts at the bus park. */
  from: { x: 820, y: 700 },
} as const;

/** W10: at most this many small people and danfos moving at once. */
export const MOVING_PEOPLE = 8;
export const MOVING_DANFOS = 2;
/** W1: a danfo stops this far short of the hero and waits. */
export const DANFO_GAP = 40;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slow, fast, slow. */
export const ease = (k: number): number => {
  const t = Math.max(0, Math.min(1, k));
  return t * t * (3 - 2 * t);
};

/** 0 to 1 over [a, b]. */
export const span = (t: number, [a, b]: readonly [number, number]): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** Where an area is drawn on the map, roofs, masts and shadows included (map units). */
export function areaRect(id: string): Rect {
  if (id === 'busPark') return { x: BUS_PARK.x - 4, y: BUS_PARK.y - 14, w: BUS_PARK.w + 8, h: BUS_PARK.h + 20 };
  if (id === 'shore') return { x: 0, y: 800, w: CITY_MAP.w, h: 80 };
  if (id === 'alausa') return { x: ALAUSA_ROAD.x0 - 8, y: ALAUSA_ROAD.y0 - 40, w: ALAUSA_ROAD.x1 - ALAUSA_ROAD.x0 + 16, h: ALAUSA_ROAD.y1 - ALAUSA_ROAD.y0 + 50 };
  const b = CITY_BLOCKS.find((q) => q.id === id);
  if (!b) return { x: 0, y: 0, w: 0, h: 0 };
  const top = Math.min(b.y, ...b.boxes.map((q) => q.y - q.h)) - 72;
  return { x: b.x - 4, y: top, w: b.w + 34, h: b.y + b.d + 6 - top };
}

/** The parts a board's ring brightens: its set, and the Alausa road for the New road. */
export function fixRects(b: BuildId): Rect[] {
  return [...FIX_SET[b], ...(b === 'road' ? ['alausa'] : [])].map(areaRect);
}

export const middle = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** How far a ring from `p` must grow to cover every corner of the rects. */
export function ringReach(p: Pt, rects: readonly Rect[]): number {
  let r = 0;
  for (const q of rects) for (const [x, y] of [[q.x, q.y], [q.x + q.w, q.y], [q.x, q.y + q.h], [q.x + q.w, q.y + q.h]] as const) r = Math.max(r, Math.hypot(x - p.x, y - p.y));
  return r;
}

/** The box round some rects and points (map units). */
export function around(rects: readonly Rect[], pts: readonly Pt[] = []): Rect {
  const xs = [...rects.flatMap((r) => [r.x, r.x + r.w]), ...pts.map((p) => p.x)];
  const ys = [...rects.flatMap((r) => [r.y, r.y + r.h]), ...pts.map((p) => p.y)];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------- The danfo (d6: one drives the nearest road) ----------

export interface Route {
  from: Pt;
  to: Pt;
  dir: 'n' | 's' | 'e' | 'w';
}

/** New road: up the Alausa road and off the top. Mama Put: into the bus park, where it parks.
 * Market: along the shore road to the market. Lamps and Mast: along the main road past the block. */
export const DANFO_ROUTE: Readonly<Record<BuildId, Route>> = {
  road: { from: { x: 122, y: 620 }, to: { x: 122, y: -40 }, dir: 'n' },
  mamaPut: { from: { x: 798, y: 470 }, to: { x: 798, y: 688 }, dir: 's' },
  market: { from: { x: 880, y: 826 }, to: { x: 1340, y: 826 }, dir: 'e' },
  lamps: { from: { x: 1100, y: 576 }, to: { x: -40, y: 576 }, dir: 'w' },
  mast: { from: { x: 700, y: 548 }, to: { x: 1640, y: 548 }, dir: 'e' },
};

export const routeLength = (r: Route): number => Math.hypot(r.to.x - r.from.x, r.to.y - r.from.y);

export function routeAt(r: Route, d: number): Pt {
  const k = Math.max(0, Math.min(1, d / routeLength(r)));
  return { x: r.from.x + (r.to.x - r.from.x) * k, y: r.from.y + (r.to.y - r.from.y) * k };
}

/** Half a danfo's length and width on the ground, and half the hero's width (map units). */
const BUS_HALF = { long: 23, wide: 9 } as const;
const HERO_HALF = 11;

/**
 * The danfo `d` units along its route wants to go `step` more. W1: if the hero stands in its lane
 * ahead, it stops DANFO_GAP short of them and waits. Returns how far along it is now.
 */
export function driveOn(r: Route, d: number, step: number, hero: Pt): number {
  const len = routeLength(r);
  const ux = (r.to.x - r.from.x) / len;
  const uy = (r.to.y - r.from.y) / len;
  const hx = hero.x - r.from.x;
  const hy = hero.y - r.from.y;
  const along = hx * ux + hy * uy;
  const side = Math.abs(hx * uy - hy * ux);
  let want = Math.min(len, d + Math.max(0, step));
  // In its lane and not yet behind it (ahead, or already beside its nose): wait.
  if (side < BUS_HALF.wide + HERO_HALF && along > d - BUS_HALF.long - HERO_HALF) want = Math.min(want, along - HERO_HALF - BUS_HALF.long - DANFO_GAP);
  return Math.max(d, want);
}

// ---------- Walkers (d6: people walk in) ----------

export interface Walker {
  pts: Pt[];
  len: number;
  /** Seconds before it sets off, and its speed (map units a second). */
  wait: number;
  speed: number;
  /** Seconds since the plan began. */
  t: number;
  /** Picks the person's look. */
  look: number;
}

/** Road ends and the bus park, where walkers come from. */
const ROAD_ENDS: readonly Pt[] = [
  { x: 10, y: 560 },
  { x: 1590, y: 560 },
  { x: 101, y: 100 },
  { x: 820, y: 100 },
  { x: 10, y: 818 },
  { x: 1590, y: 818 },
];

function pathLength(pts: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return n;
}

/** Where people stand in front of a block (on its front pavement), `n` of them. */
export function frontSpots(id: string, n: number): Pt[] {
  if (id === 'busPark') return Array.from({ length: n }, (_, k) => nearestOpen({ x: BUS_PARK.x + 20 + k * 22, y: BUS_PARK.y + BUS_PARK.h - 30 }));
  const b = CITY_BLOCKS.find((q) => q.id === id);
  if (!b) return [];
  return Array.from({ length: n }, (_, k) => nearestOpen({ x: b.x + (b.w * (k + 1)) / (n + 1), y: b.y + b.d - 6 }));
}

/** Where `n` people end up: spread over the fronts of `areas` (the bus park when there are none). */
export function walkTargets(areas: readonly string[], n: number): Pt[] {
  const list = areas.length ? areas : ['busPark'];
  const per = Math.ceil(n / list.length);
  return list.flatMap((a) => frontSpots(a, per)).slice(0, n);
}

/**
 * `n` walkers to the fronts of `areas` (spread over them), each from the bus park or the nearest
 * road end (`from` when given), arriving about `dur` seconds after they set off (never faster
 * than 1.5 times the hero; a long way takes longer).
 */
export function planWalkers(areas: readonly string[], n: number, dur: number, from?: Pt): Walker[] {
  return walkTargets(areas, n).map((to, k) => {
    const starts = from ? [from] : [BOOM.from, ...ROAD_ENDS].sort((p, q) => Math.hypot(p.x - to.x, p.y - to.y) - Math.hypot(q.x - to.x, q.y - to.y));
    const start = starts[k % 2 && starts.length > 1 ? 1 : 0]!;
    const path = findPath(start, to);
    const pts = [start, ...path];
    const len = pathLength(pts);
    const wait = k * 0.08;
    return { pts, len, wait, speed: Math.min(360, Math.max(40, len / Math.max(0.2, dur - wait))), t: 0, look: k * 3 + 1 };
  });
}

/** Where a walker is now, and whether it has arrived. */
export function walkerAt(w: Walker): Pt & { done: boolean } {
  let d = Math.max(0, w.t - w.wait) * w.speed;
  if (d >= w.len) return { ...w.pts[w.pts.length - 1]!, done: true };
  for (let i = 1; i < w.pts.length; i++) {
    const a = w.pts[i - 1]!;
    const b = w.pts[i]!;
    const s = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= s) return { x: a.x + ((b.x - a.x) * d) / (s || 1), y: a.y + ((b.y - a.y) * d) / (s || 1), done: false };
    d -= s;
  }
  return { ...w.pts[w.pts.length - 1]!, done: true };
}

/** The bridge, where the boom's new people come from (on the map, near its bottom edge). */
export const BRIDGE_FOOT: Pt = { x: 1440, y: 930 };
