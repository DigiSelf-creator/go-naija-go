/**
 * The lane run's level file (`type: "lane"`, docs/design.md S3f0 part 13): the loader, the speed
 * curve (part 4), the sizes things are hit by, and the fairness rules (part 7) as plain checks the
 * unit test runs on src/data/levels/lagos-lane.json. Pure: no DOM, so it runs in node too.
 */

export type DodgeKind = 'danfo' | 'cones' | 'pothole' | 'barrier';
export type BurstKind = 'crate:power' | 'crate:tech' | 'crate:coins' | 'junk' | 'sign';
export type ThingKind = DodgeKind | BurstKind | 'goat';
export type PickupKind = 'bulb' | 'chip' | 'garri' | 'corn';
export type CoinShape = 'line' | 'low' | 'arc';

export const DODGE: readonly ThingKind[] = ['danfo', 'cones', 'pothole', 'barrier'];
export const BURST: readonly ThingKind[] = ['crate:power', 'crate:tech', 'crate:coins', 'junk', 'sign'];
const THINGS: readonly string[] = [...DODGE, ...BURST, 'goat'];
const PICKUPS: readonly string[] = ['bulb', 'chip', 'garri', 'corn'];
const SHAPES: readonly string[] = ['line', 'low', 'arc'];

export const isDodge = (k: ThingKind): k is DodgeKind => DODGE.includes(k);
export const isBurst = (k: ThingKind): k is BurstKind => BURST.includes(k);
/** Things you jump over (cones, pothole) and slide under (barrier arm). */
export const isJumpThing = (k: ThingKind): boolean => k === 'cones' || k === 'pothole';

/**
 * How big each thing is for hits, in metres: `len` along the road (centred on its distance), `w`
 * across, `h` its top. The barrier arm's bar runs from `low` to `h` (chest height). Part 4: the
 * hero's body is 0.5 m deep and 1.2 m wide for hits.
 */
export const SIZE: Readonly<Record<ThingKind, { len: number; w: number; h: number; low?: number }>> = {
  danfo: { len: 6, w: 2.1, h: 2.6 },
  cones: { len: 0.6, w: 2.0, h: 0.7 },
  pothole: { len: 1.6, w: 1.9, h: 0 },
  barrier: { len: 0.3, w: 2.2, h: 1.25, low: 0.95 },
  'crate:power': { len: 0.9, w: 1.0, h: 0.9 },
  'crate:tech': { len: 0.9, w: 1.0, h: 0.9 },
  'crate:coins': { len: 0.9, w: 1.0, h: 0.9 },
  junk: { len: 1.0, w: 1.3, h: 1.0 },
  sign: { len: 0.4, w: 1.6, h: 1.5 },
  goat: { len: 1.1, w: 0.7, h: 0.9 },
};
export const HERO_DEPTH = 0.5;
export const HERO_WIDTH = 1.2;
export const HERO_HEIGHT = 1.7;

export interface SpeedCurve {
  start: number;
  atGoal: number;
  afterGoalPer100: number;
  max: number;
}
export interface LaneMoves {
  laneChange: number;
  jumpTime: number;
  jumpHeight: number;
  clearFeet: number;
  slideTime: number;
  dropTime: number;
  stumbleSlow: number;
  stumbleTime: number;
  safeAfterStumble: number;
}
export interface BlackoutRules {
  start: number;
  max: number;
  creep: number;
  stumble: number;
  powerPush: number;
  warnUnder: number;
  afterGoalCreepPer100: number;
  afterGoalCreepMax: number;
}
export interface Pop {
  coins: number;
  power: number;
  tech: number;
}
export interface LaneThing {
  d: number;
  lane: number;
  kind: ThingKind;
}
export interface LanePickup {
  d: number;
  lane: number;
  kind: PickupKind;
}
export interface LaneCoins {
  d: number;
  lane: number;
  count: number;
  shape: CoinShape;
}
export interface LaneChunk {
  id: string;
  beats: readonly (readonly (ThingKind | null)[])[];
  pickups: readonly { beat: number; lane: number; kind: PickupKind }[];
  coins: readonly { beat: number; lane: number; count: number; shape: CoinShape }[];
}
export interface LaneLevel {
  id: string;
  name: string;
  theme: string;
  goal: number;
  lanes: number;
  laneWidth: number;
  speed: SpeedCurve;
  gentleSpeed: SpeedCurve;
  move: LaneMoves;
  blackout: BlackoutRules;
  gentleBlackout: BlackoutRules;
  prize: { kobo: number; power: number; tech: number };
  pops: Readonly<Record<string, Pop>>;
  spawnAhead: number;
  things: readonly LaneThing[];
  pickups: readonly LanePickup[];
  coins: readonly LaneCoins[];
  hints: readonly { d: number; key: string }[];
  endless: {
    beat: number;
    foodEvery: number;
    foods: readonly PickupKind[];
    noRepeat: number;
    mirror: boolean;
    fewerBulbsAfter: number;
    clearAfterCard: number;
  };
  chunks: readonly LaneChunk[];
}

type Obj = Record<string, unknown>;
const obj = (v: unknown, what: string): Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`lane level: ${what} must be an object`);
  return v as Obj;
};
const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`lane level: ${what} must be a number`);
  return v;
};
const arr = (v: unknown, what: string): unknown[] => {
  if (!Array.isArray(v)) throw new Error(`lane level: ${what} must be a list`);
  return v;
};
const oneOf = <T extends string>(v: unknown, list: readonly string[], what: string): T => {
  if (typeof v !== 'string' || !list.includes(v)) throw new Error(`lane level: ${what} "${String(v)}" is not one of ${list.join(', ')}`);
  return v as T;
};
const laneNum = (v: unknown, what: string): number => {
  const n = num(v, what);
  if (n !== 0 && n !== 1 && n !== 2) throw new Error(`lane level: ${what} must be lane 0, 1 or 2`);
  return n;
};
const numbers = <T extends string>(v: unknown, keys: readonly T[], what: string): Record<T, number> => {
  const o = obj(v, what);
  const out = {} as Record<T, number>;
  for (const k of keys) out[k] = num(o[k], `${what}.${k}`);
  return out;
};
const SPEED_KEYS = ['start', 'atGoal', 'afterGoalPer100', 'max'] as const;
const MOVE_KEYS = ['laneChange', 'jumpTime', 'jumpHeight', 'clearFeet', 'slideTime', 'dropTime', 'stumbleSlow', 'stumbleTime', 'safeAfterStumble'] as const;
const BLACKOUT_KEYS = ['start', 'max', 'creep', 'stumble', 'powerPush', 'warnUnder', 'afterGoalCreepPer100', 'afterGoalCreepMax'] as const;

/** Reads a `type: "lane"` level file. Throws with a plain message when something is wrong. */
export function parseLane(raw: unknown): LaneLevel {
  const o = obj(raw, 'the file');
  if (o['type'] !== 'lane') throw new Error('lane level: type must be "lane"');
  if (o['schema'] !== 1) throw new Error('lane level: schema must be 1');
  const speed = obj(o['speed'], 'speed');
  const blackout = obj(o['blackout'], 'blackout');
  const endless = obj(o['endless'], 'endless');
  const popsRaw = obj(o['pops'], 'pops');
  const pops: Record<string, Pop> = {};
  for (const [k, v] of Object.entries(popsRaw)) {
    oneOf(k, [...BURST, 'goat'], 'pops kind');
    const p = obj(v, `pops.${k}`);
    pops[k] = { coins: p['coins'] === undefined ? 0 : num(p['coins'], `pops.${k}.coins`), power: p['power'] === undefined ? 0 : num(p['power'], `pops.${k}.power`), tech: p['tech'] === undefined ? 0 : num(p['tech'], `pops.${k}.tech`) };
  }
  const row = (v: unknown, what: string, n: number): unknown[] => {
    const r = arr(v, what);
    if (r.length !== n) throw new Error(`lane level: ${what} must have ${n} parts`);
    return r;
  };
  const byD = <T extends { d: number }>(list: T[]): T[] => list.sort((a, b) => a.d - b.d);
  const prize = numbers(o['prize'], ['kobo', 'power', 'tech'] as const, 'prize');
  const level: LaneLevel = {
    id: String(o['id']),
    name: String(o['name']),
    theme: String(o['theme']),
    goal: num(o['goal'], 'goal'),
    lanes: num(o['lanes'], 'lanes'),
    laneWidth: num(o['laneWidth'], 'laneWidth'),
    speed: numbers(speed, SPEED_KEYS, 'speed'),
    gentleSpeed: numbers(speed['gentle'], SPEED_KEYS, 'speed.gentle'),
    move: numbers(o['move'], MOVE_KEYS, 'move'),
    blackout: numbers(blackout, BLACKOUT_KEYS, 'blackout'),
    gentleBlackout: numbers(blackout['gentle'], BLACKOUT_KEYS, 'blackout.gentle'),
    prize,
    pops,
    spawnAhead: num(o['spawnAhead'], 'spawnAhead'),
    things: byD(arr(o['things'], 'things').map((t, i) => {
      const r = row(t, `things[${i}]`, 3);
      return { d: num(r[0], `things[${i}] d`), lane: laneNum(r[1], `things[${i}] lane`), kind: oneOf<ThingKind>(r[2], THINGS, `things[${i}] kind`) };
    })),
    pickups: byD(arr(o['pickups'], 'pickups').map((t, i) => {
      const r = row(t, `pickups[${i}]`, 3);
      return { d: num(r[0], `pickups[${i}] d`), lane: laneNum(r[1], `pickups[${i}] lane`), kind: oneOf<PickupKind>(r[2], PICKUPS, `pickups[${i}] kind`) };
    })),
    coins: byD(arr(o['coins'], 'coins').map((t, i) => {
      const r = row(t, `coins[${i}]`, 4);
      return { d: num(r[0], `coins[${i}] d`), lane: laneNum(r[1], `coins[${i}] lane`), count: num(r[2], `coins[${i}] count`), shape: oneOf<CoinShape>(r[3], SHAPES, `coins[${i}] shape`) };
    })),
    hints: arr(o['hints'], 'hints').map((t, i) => {
      const r = row(t, `hints[${i}]`, 2);
      return { d: num(r[0], `hints[${i}] d`), key: String(r[1]) };
    }),
    endless: {
      beat: num(endless['beat'], 'endless.beat'),
      foodEvery: num(endless['foodEvery'], 'endless.foodEvery'),
      foods: arr(endless['foods'], 'endless.foods').map((f, i) => oneOf<PickupKind>(f, ['garri', 'corn'], `endless.foods[${i}]`)),
      noRepeat: num(endless['noRepeat'], 'endless.noRepeat'),
      mirror: endless['mirror'] === true,
      fewerBulbsAfter: num(endless['fewerBulbsAfter'], 'endless.fewerBulbsAfter'),
      clearAfterCard: num(endless['clearAfterCard'], 'endless.clearAfterCard'),
    },
    chunks: arr(o['chunks'], 'chunks').map((c, i) => {
      const co = obj(c, `chunks[${i}]`);
      const beats = arr(co['beats'], `chunks[${i}].beats`).map((b, j) => row(b, `chunks[${i}].beats[${j}]`, 3).map((k) => (k === null ? null : oneOf<ThingKind>(k, THINGS, `chunks[${i}] kind`))));
      const n = beats.length;
      const beatOf = (v: unknown, what: string): number => {
        const b = num(v, what);
        if (b < 0 || b >= n || !Number.isInteger(b)) throw new Error(`lane level: ${what} must be a beat from 0 to ${n - 1}`);
        return b;
      };
      return {
        id: String(co['id']),
        beats,
        pickups: arr(co['pickups'], `chunks[${i}].pickups`).map((p, j) => {
          const r = row(p, `chunks[${i}].pickups[${j}]`, 3);
          return { beat: beatOf(r[0], `chunks[${i}].pickups[${j}] beat`), lane: laneNum(r[1], 'lane'), kind: oneOf<PickupKind>(r[2], PICKUPS, 'pickup kind') };
        }),
        coins: arr(co['coins'], `chunks[${i}].coins`).map((p, j) => {
          const r = row(p, `chunks[${i}].coins[${j}]`, 4);
          return { beat: beatOf(r[0], `chunks[${i}].coins[${j}] beat`), lane: laneNum(r[1], 'lane'), count: num(r[2], 'count'), shape: oneOf<CoinShape>(r[3], SHAPES, 'coin shape') };
        }),
      };
    }),
  };
  if (level.chunks.length <= level.endless.noRepeat) throw new Error('lane level: needs more chunks than endless.noRepeat');
  return level;
}

/** Part 4: the speed at a distance. Rises evenly with distance to the goal, then by steps of 100 m to the top speed. */
export function speedAt(c: SpeedCurve, goal: number, d: number): number {
  if (d <= goal) return c.start + ((c.atGoal - c.start) * Math.max(d, 0)) / goal;
  return Math.min(c.max, c.atGoal + (c.afterGoalPer100 * (d - goal)) / 100);
}

/** Seconds to run from the start to distance d with no stumbles (speed from speedAt). */
export function timeTo(c: SpeedCurve, goal: number, d: number): number {
  const a = Math.min(d, goal);
  const k1 = (c.atGoal - c.start) / goal;
  let t = k1 === 0 ? a / c.start : Math.log((c.start + k1 * a) / c.start) / k1;
  if (d <= goal) return t;
  const k2 = c.afterGoalPer100 / 100;
  const toMax = k2 > 0 ? (c.max - c.atGoal) / k2 : Infinity;
  const b = Math.min(d - goal, toMax);
  t += k2 === 0 ? b / c.atGoal : Math.log((c.atGoal + k2 * b) / c.atGoal) / k2;
  if (d - goal > toMax) t += (d - goal - toMax) / c.max;
  return t;
}

/** A row: everything at one distance across the three lanes (part 7). */
export interface Row {
  d: number;
  lanes: (ThingKind | null)[];
}

/** The rows of the fixed part, in order. */
export function rowsOf(things: readonly LaneThing[]): Row[] {
  const rows: Row[] = [];
  for (const t of things) {
    let r = rows.find((x) => x.d === t.d);
    if (!r) rows.push((r = { d: t.d, lanes: [null, null, null] }));
    if (r.lanes[t.lane] !== null) throw new Error(`two things in lane ${t.lane} at ${t.d} m`);
    r.lanes[t.lane] = t.kind;
  }
  return rows.sort((a, b) => a.d - b.d);
}

/** Lanes with no dodge thing in them. */
export const freeLanes = (lanes: readonly (ThingKind | null)[]): number[] => lanes.flatMap((k, i) => (k !== null && isDodge(k) ? [] : [i]));
const hasDodge = (r: Row): boolean => r.lanes.some((k) => k !== null && isDodge(k));
/** Fewest lanes between a free lane of one row and a free lane of the next. */
const laneGap = (a: Row, b: Row): number => Math.min(...freeLanes(a.lanes).flatMap((x) => freeLanes(b.lanes).map((y) => Math.abs(x - y))));

/**
 * Part 7, rules 1 to 5 and 8, for rows placed at distances `d` with a known time `at(d)` to each.
 * Returns plain words for every broken rule (an empty list is a fair road).
 */
export function checkFair(
  rows: readonly Row[],
  pickups: readonly LanePickup[],
  coins: readonly LaneCoins[],
  at: (d: number) => number,
  opts: { minGap?: number; warmUp?: readonly number[]; foodLane?: number } = {},
): string[] {
  const bad: string[] = [];
  const dodgeRows = rows.filter(hasDodge);
  // Rule 1: always a free lane.
  for (const r of rows) if (freeLanes(r.lanes).length === 0) bad.push(`rule 1: no free lane at ${r.d} m`);
  // Rule 2: time to get there.
  for (let i = 1; i < dodgeRows.length; i++) {
    const a = dodgeRows[i - 1]!;
    const b = dodgeRows[i]!;
    const gap = at(b.d) - at(a.d);
    const need = Math.max(opts.minGap ?? 0, laneGap(a, b) >= 2 ? 1.6 : 1.2);
    if (gap + 1e-9 < need) bad.push(`rule 2: ${a.d} m to ${b.d} m is ${gap.toFixed(2)} s, needs ${need} s`);
  }
  // Rule 4: a jump thing and a slide thing in one lane are 1.0 s apart or more.
  for (const a of rows) {
    for (const b of rows) {
      if (b.d <= a.d) continue;
      for (let l = 0; l < 3; l++) {
        const ka = a.lanes[l];
        const kb = b.lanes[l];
        if (!ka || !kb) continue;
        const mixed = (isJumpThing(ka) && kb === 'barrier') || (ka === 'barrier' && isJumpThing(kb));
        if (mixed && at(b.d) - at(a.d) < 1.0) bad.push(`rule 4: jump and slide in lane ${l} at ${a.d} m and ${b.d} m`);
      }
    }
  }
  // Rule 5: pickups never inside a dodge thing; arcs over jump things, low lines under barrier arms.
  const dodgeAt = (d: number, lane: number, pad: number): ThingKind | null => {
    for (const r of rows) {
      const k = r.lanes[lane];
      if (k && isDodge(k) && Math.abs(r.d - d) < SIZE[k].len / 2 + pad) return k;
    }
    return null;
  };
  for (const p of pickups) if (dodgeAt(p.d, p.lane, 0.5)) bad.push(`rule 5: ${p.kind} inside a dodge thing at ${p.d} m lane ${p.lane}`);
  for (const c of coins) {
    if (c.shape === 'arc') {
      const k = rows.find((r) => r.d === c.d)?.lanes[c.lane];
      if (!k || !isJumpThing(k)) bad.push(`rule 5: coin arc at ${c.d} m lane ${c.lane} is not over a jump thing`);
      continue;
    }
    const end = c.d + 2 * (c.count - 1);
    const inside = rows.filter((r) => {
      const k = r.lanes[c.lane];
      return k && isDodge(k) && r.d + SIZE[k].len / 2 + 0.3 > c.d && r.d - SIZE[k].len / 2 - 0.3 < end;
    });
    if (c.shape === 'low') {
      if (inside.length === 0 || inside.some((r) => r.lanes[c.lane] !== 'barrier')) bad.push(`rule 5: low coins at ${c.d} m lane ${c.lane} are not only under a barrier arm`);
    } else if (inside.length > 0) bad.push(`rule 5: coin line at ${c.d} m lane ${c.lane} runs into a dodge thing`);
  }
  // Rule 8: warm-up bulbs in the only free lane; foods in the middle with nothing to dodge there in the 1.5 s before.
  for (const d of opts.warmUp ?? []) {
    const r = rows.find((x) => x.d === d);
    const bulb = pickups.find((p) => p.d === d && p.kind === 'bulb');
    const free = r ? freeLanes(r.lanes) : [];
    if (!r || !bulb || free.length !== 1 || free[0] !== bulb.lane) bad.push(`rule 8: the warm-up bulb at ${d} m is not in the only free lane`);
  }
  if (opts.foodLane !== undefined) {
    for (const p of pickups) {
      if (p.kind !== 'garri' && p.kind !== 'corn') continue;
      if (p.lane !== opts.foodLane) bad.push(`rule 8: ${p.kind} at ${p.d} m is not in the middle lane`);
      for (const r of rows) {
        const k = r.lanes[p.lane];
        if (k && isDodge(k) && r.d <= p.d && at(p.d) - at(r.d) < 1.5) bad.push(`rule 8: ${k} at ${r.d} m is too close before the ${p.kind}`);
      }
    }
  }
  return bad;
}

/** A chunk's rows laid out one beat apart from `d0`, mirrored or not (for the fairness check and the endless part). */
export function chunkRows(c: LaneChunk, mirror: boolean): (ThingKind | null)[][] {
  return c.beats.map((b) => (mirror ? [b[2]!, b[1]!, b[0]!] : [...b]));
}

/** Rule 3: one move at a time. Never two things in one lane of a row (the loader's rows already refuse it). */
export function checkChunk(c: LaneChunk, beat: number): string[] {
  const bad: string[] = [];
  // A beat is at least 16 m at the slowest speed (9 m/s, 1.8 s), so lay the rows 16 m apart.
  const step = 16;
  const rows: Row[] = c.beats.map((b, i) => ({ d: i * step, lanes: [...b] }));
  const at = (d: number): number => (d / step) * beat;
  const pickups = c.pickups.map((p) => ({ d: p.beat * step, lane: p.lane, kind: p.kind }));
  const coins = c.coins.map((p) => ({ d: p.beat * step, lane: p.lane, count: p.count, shape: p.shape }));
  for (const s of checkFair(rows, pickups, coins, at)) bad.push(`${c.id}: ${s}`);
  // Across chunks the next row may be any chunk's first: the last row and any first row both keep
  // a free lane, and they are one beat (over 1.6 s) apart, so rule 2 holds at the joins.
  if (beat < 1.6) bad.push(`${c.id}: the beat is under 1.6 s`);
  return bad;
}
