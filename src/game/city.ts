/**
 * The Lagos city's rules, with no DOM (docs/city.md part 1 "Three buckets", part 5 (b), part 5W).
 *
 * Saved on the phone as the `city` part of `gidi-progress` (src/game/progress.ts):
 *   { "kobo": 0, "power": 0, "tech": 0, "fixed": [], "fixes": 0,
 *     "at": {"x":820,"y":700}, "paid": {"potholes": 600}, "built": ["buka"],
 *     "trays": {"buka": 120, "market": 240}, "boom": 9, "boomCollect": 0, "hints": ["walk"] }
 * Money is kept as whole kobo (a board's Naira paid so far too); Power and Tech as whole units.
 * A broken or missing field starts empty. An older city part (no walking yet) reads with the
 * hero at the bus park, nothing part paid, nothing built, and 4 Booming points for each fix it
 * already has. Nothing here ever goes down by itself: no timers, and a fixed spot stays fixed.
 */
import type { SpotId, SpotLook, SpotLooks } from '../art/city';
import { CITY_MAP, SPOT_IDS } from '../art/city';
import { BUILDS, type BuildId } from '../art/payspot';
import { cleanKobo } from './money';
import { isObj } from './progress';

export const KEY_CITY = 'city';

/** The working places (W3), saved by these names: the Mama Put is "buka". */
export type PlaceId = 'buka' | 'market';
export const PLACE_IDS: readonly PlaceId[] = ['buka', 'market'];

/** What a board's money is saved under: a fix by its spot, a build by its place. */
export type PayKey = SpotId | PlaceId;

export interface MapPt {
  x: number;
  y: number;
}

export interface CityState {
  /** The Naira bucket, in whole kobo. */
  kobo: number;
  power: number;
  tech: number;
  /** Spots fixed so far, in the order they were fixed. */
  fixed: SpotId[];
  /** Fixes made. */
  fixes: number;
  /** Where the hero stands (map units), or null for the bus park (a first visit). */
  at: MapPt | null;
  /** Money in a board so far, until it is built (whole kobo, or Power or Tech units). */
  paid: Partial<Record<PayKey, number>>;
  /** Builds that are not problem fixes, in the order they were built. */
  built: PlaceId[];
  /** Money waiting in each working place's tray (whole kobo). */
  trays: Partial<Record<PlaceId, number>>;
  /** Booming meter points (W6): never goes down. */
  boom: number;
  /** Points from full collects since the last boom mark (at most COLLECT_MAX). */
  boomCollect: number;
  /** Hints already shown (once each). */
  hints: string[];
}

export type Bucket = 'naira' | 'power' | 'tech';

/** Where a first-timer stands, and where a bus from a challenge with no pin brings them (W1, W5). */
export const HERO_START: Readonly<MapPt> = { x: 820, y: 700 };

/** Each board's spot (for a fix) or place (for a build). */
export const BUILD_KEY: Readonly<Record<BuildId, PayKey>> = { road: 'potholes', mamaPut: 'buka', market: 'market', lamps: 'lightsOut', mast: 'slowInternet' };
/** The board that fixes each spot. */
export const SPOT_BUILD: Readonly<Record<SpotId, BuildId>> = { potholes: 'road', lightsOut: 'lamps', slowInternet: 'mast' };
export const PLACE_BUILD: Readonly<Record<PlaceId, BuildId>> = { buka: 'mamaPut', market: 'market' };

/** A board's price in its own units: Naira as whole kobo (₦10 is 1000), Power or Tech as units. */
export function priceOf(b: BuildId): number {
  const d = BUILDS[b];
  return d.bucket === 'naira' ? d.price * 100 : d.price;
}

export function bucketOf(b: BuildId): Bucket {
  return BUILDS[b].bucket;
}

/** What each slice 3 fix costs (city.md part 5): Potholes ₦10, Lights out Power 10, Slow internet Tech 6. */
export const FIX_COST: Readonly<Record<SpotId, { bucket: Bucket; amount: number }>> = {
  potholes: { bucket: 'naira', amount: priceOf('road') },
  lightsOut: { bucket: 'power', amount: priceOf('lamps') },
  slowInternet: { bucket: 'tech', amount: priceOf('mast') },
};

/** W3: what each working place earns, how often (seconds of play), its cap, and what it needs first. */
export const PLACES: Readonly<Record<PlaceId, { every: number; each: number; cap: number; needs: SpotId | null; name: string }>> = {
  buka: { every: 6, each: 10, cap: 150, needs: null, name: 'Mama Put' },
  market: { every: 15, each: 30, cap: 240, needs: 'potholes', name: 'the market' },
};

/** A tray under this shows no bubble and is not collected (W4). */
export const TRAY_MIN = 10;

/** W6: a fix or a build fills 4; a full collect fills 1, at most 4 from collecting for each boom. */
export const BOOM_BUILD = 4;
export const BOOM_COLLECT = 1;
export const COLLECT_MAX = 4;
/** The first boom is at 20 (W6). Later marks come further apart: 50, 90, 140, ... (designer to confirm). */
export const FIRST_BOOM = 20;

/** W5, (c): a street win's prize, the first street 1 win from the Potholes card, and a hall win. */
export const WIN_PRIZE = 500;
export const FIRST_WIN = 1400;
export const HALL_PRIZE = 1500;

export function emptyCity(): CityState {
  return { kobo: 0, power: 0, tech: 0, fixed: [], fixes: 0, at: null, paid: {}, built: [], trays: {}, boom: 0, boomCollect: 0, hints: [] };
}

const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

const PAY_KEYS: readonly PayKey[] = [...SPOT_IDS, ...PLACE_IDS];

/** The `city` part read leniently: anything odd counts as zero, empty or "not fixed". */
export function readCity(v: unknown): CityState {
  if (!isObj(v)) return emptyCity();
  const fixed: SpotId[] = [];
  const raw = v['fixed'];
  if (Array.isArray(raw)) for (const id of raw) if ((SPOT_IDS as readonly unknown[]).includes(id) && !fixed.includes(id as SpotId)) fixed.push(id as SpotId);
  const built: PlaceId[] = [];
  const rawB = v['built'];
  if (Array.isArray(rawB)) for (const id of rawB) if ((PLACE_IDS as readonly unknown[]).includes(id) && !built.includes(id as PlaceId)) built.push(id as PlaceId);
  const paid: CityState['paid'] = {};
  const rawP = v['paid'];
  if (isObj(rawP)) {
    for (const k of PAY_KEYS) {
      const n = count(rawP[k]);
      const done = (SPOT_IDS as readonly string[]).includes(k) ? fixed.includes(k as SpotId) : built.includes(k as PlaceId);
      const b = (Object.keys(BUILD_KEY) as BuildId[]).find((id) => BUILD_KEY[id] === k)!;
      if (n > 0 && !done) paid[k] = Math.min(n, priceOf(b) - 1);
    }
  }
  const trays: CityState['trays'] = {};
  const rawT = v['trays'];
  if (isObj(rawT)) for (const k of PLACE_IDS) if (built.includes(k) && count(rawT[k]) > 0) trays[k] = Math.min(count(rawT[k]), PLACES[k].cap);
  let at: MapPt | null = null;
  const rawA = v['at'];
  if (isObj(rawA)) {
    const x = rawA['x'];
    const y = rawA['y'];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= CITY_MAP.w && y <= CITY_MAP.h) at = { x, y };
  }
  const hints: string[] = [];
  const rawH = v['hints'];
  if (Array.isArray(rawH)) for (const h of rawH) if (typeof h === 'string' && h.length <= 20 && !hints.includes(h)) hints.push(h);
  // An older city part has no Booming points: each fix it already has counts 4 (safe move).
  const least = BOOM_BUILD * (fixed.length + built.length);
  const boom = v['boom'] === undefined ? least : Math.max(count(v['boom']), least);
  return {
    kobo: cleanKobo(v['kobo']),
    power: count(v['power']),
    tech: count(v['tech']),
    fixed,
    fixes: Math.max(count(v['fixes']), fixed.length),
    at,
    paid,
    built,
    trays,
    boom,
    boomCollect: Math.min(COLLECT_MAX, count(v['boomCollect'])),
    hints,
  };
}

/** The city as saved: plain JSON, the hero's place in whole map units. */
export function writeCity(c: CityState): Record<string, unknown> {
  const out: Record<string, unknown> = { kobo: c.kobo, power: c.power, tech: c.tech, fixed: [...c.fixed], fixes: c.fixes };
  if (c.at) out['at'] = { x: Math.round(c.at.x), y: Math.round(c.at.y) };
  out['paid'] = { ...c.paid };
  out['built'] = [...c.built];
  out['trays'] = { ...c.trays };
  out['boom'] = c.boom;
  out['boomCollect'] = c.boomCollect;
  out['hints'] = [...c.hints];
  return out;
}

/** How much is in one bucket. */
export function inBucket(c: CityState, b: Bucket): number {
  return b === 'naira' ? c.kobo : b === 'power' ? c.power : c.tech;
}

function withBucket(c: CityState, b: Bucket, n: number): CityState {
  const v = Math.max(0, Math.floor(n));
  return b === 'naira' ? { ...c, kobo: v } : b === 'power' ? { ...c, power: v } : { ...c, tech: v };
}

/** Adds money from a run (whole kobo). */
export function addKobo(c: CityState, kobo: number): CityState {
  return { ...c, kobo: c.kobo + cleanKobo(kobo) };
}

/** True once a board's fix or build is done. */
export function isBuilt(c: CityState, b: BuildId): boolean {
  const k = BUILD_KEY[b];
  return (SPOT_IDS as readonly string[]).includes(k) ? c.fixed.includes(k as SpotId) : c.built.includes(k as PlaceId);
}

/** What is still to pay on a board (its own units; 0 once built). */
export function leftOf(c: CityState, b: BuildId): number {
  if (isBuilt(c, b)) return 0;
  return Math.max(0, priceOf(b) - (c.paid[BUILD_KEY[b]] ?? 0));
}

/**
 * The boards on the ground now (W7: one new board at a time). The road first; the Mama Put once
 * the road is built; the market once the Mama Put is built. The Lamps and Mast boards wait for the
 * lane run (step (f)), unless there is already Power or Tech to pay them with.
 */
export function boardsShown(c: CityState, laneRun = false): BuildId[] {
  const out: BuildId[] = [];
  if (!isBuilt(c, 'road')) out.push('road');
  else if (!isBuilt(c, 'mamaPut')) out.push('mamaPut');
  else if (!isBuilt(c, 'market')) out.push('market');
  if (!isBuilt(c, 'lamps') && (laneRun || c.power > 0 || (c.paid.lightsOut ?? 0) > 0)) out.push('lamps');
  if (!isBuilt(c, 'mast') && (laneRun || c.tech > 0 || (c.paid.slowInternet ?? 0) > 0)) out.push('mast');
  return out;
}

/** True when the right bucket holds enough for what is left of the spot's fix. */
export function canFix(c: CityState, spot: SpotId): boolean {
  const b = SPOT_BUILD[spot];
  return !c.fixed.includes(spot) && inBucket(c, bucketOf(b)) >= leftOf(c, b);
}

/** The look a spot shows: fixed, ready (enough in the bucket: a tick and "Ready"), or the problem. */
export function spotLook(c: CityState, spot: SpotId): SpotLook {
  if (c.fixed.includes(spot)) return 'fixed';
  return canFix(c, spot) ? 'ready' : 'problem';
}

export function spotLooks(c: CityState): SpotLooks {
  return { potholes: spotLook(c, 'potholes'), lightsOut: spotLook(c, 'lightsOut'), slowInternet: spotLook(c, 'slowInternet') };
}

/** The Booming mark after `points`: 20, then 50, 90, 140, ... */
export function nextBoom(points: number): number {
  let mark = FIRST_BOOM;
  let gap = 30;
  while (mark <= points) {
    mark += gap;
    gap += 10;
  }
  return mark;
}

/** Adds Booming points (W6). A collect adds nothing once 4 have come from collecting since the last mark. */
export function addBoom(c: CityState, pts: number, fromCollect = false): CityState {
  if (fromCollect && c.boomCollect >= COLLECT_MAX) return c;
  const boom = c.boom + pts;
  const crossed = boom >= nextBoom(c.boom);
  return { ...c, boom, boomCollect: crossed ? 0 : c.boomCollect + (fromCollect ? pts : 0) };
}

export interface PayResult {
  next: CityState;
  /** Paid now (own units). */
  amount: number;
  /** Still to pay after this. */
  left: number;
  /** Paid in full: built. */
  done: boolean;
}

/**
 * Stand to pay (W2): the hero pays what they have, up to what is left; the board keeps the rest
 * (saved) until it is built. Never from the wrong bucket. Null when nothing can be paid (built, or
 * an empty bucket). Pure.
 */
export function payBoard(c: CityState, b: BuildId): PayResult | null {
  if (isBuilt(c, b)) return null;
  const bucket = bucketOf(b);
  const left = leftOf(c, b);
  const amount = Math.min(inBucket(c, bucket), left);
  if (amount <= 0) return null;
  let next = withBucket(c, bucket, inBucket(c, bucket) - amount);
  const key = BUILD_KEY[b];
  const paid = { ...next.paid };
  const done = amount >= left;
  if (done) {
    delete paid[key];
    next = { ...next, paid };
    if ((SPOT_IDS as readonly string[]).includes(key)) next = { ...next, fixed: [...next.fixed, key as SpotId], fixes: next.fixes + 1 };
    else {
      const place = key as PlaceId;
      next = { ...next, built: [...next.built, place], trays: { ...next.trays, [place]: 0 } };
    }
    next = addBoom(next, BOOM_BUILD);
  } else {
    paid[key] = (paid[key] ?? 0) + amount;
    next = { ...next, paid };
  }
  return { next, amount, left: left - amount, done };
}

/** A working place is earning: built, and what it needs is fixed (the market needs the New road). */
export function earning(c: CityState, p: PlaceId): boolean {
  const need = PLACES[p].needs;
  return c.built.includes(p) && (need === null || c.fixed.includes(need));
}

export function trayFull(c: CityState, p: PlaceId): boolean {
  return (c.trays[p] ?? 0) >= PLACES[p].cap;
}

/** Seconds of play toward each place's next plate or danfo (kept in memory only). */
export type TrayClock = Record<PlaceId, number>;

export function newClock(): TrayClock {
  return { buka: 0, market: 0 };
}

/**
 * W3: `dt` seconds of play. Each earning place adds its amount once per `every` seconds, in steps
 * (never a running number), and stops at its cap until collected. Returns the new state and the
 * places whose tray changed. `clock` is changed in place.
 */
export function fillTrays(c: CityState, clock: TrayClock, dt: number): { next: CityState; changed: PlaceId[] } {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
  let next = c;
  const changed: PlaceId[] = [];
  for (const p of PLACE_IDS) {
    if (!earning(c, p) || trayFull(next, p)) {
      clock[p] = 0;
      continue;
    }
    const spec = PLACES[p];
    clock[p] += d;
    let tray = next.trays[p] ?? 0;
    while (clock[p] >= spec.every && tray < spec.cap) {
      clock[p] -= spec.every;
      tray = Math.min(spec.cap, tray + spec.each);
    }
    if (tray >= spec.cap) clock[p] = 0;
    if (tray !== (next.trays[p] ?? 0)) {
      next = { ...next, trays: { ...next.trays, [p]: tray } };
      changed.push(p);
    }
  }
  return { next, changed };
}

/** W4: collect a tray (10 kobo or more). A full tray also fills the Booming meter by 1. Pure. */
export function collectTray(c: CityState, p: PlaceId): { next: CityState; amount: number; full: boolean } | null {
  const amount = c.trays[p] ?? 0;
  if (amount < TRAY_MIN) return null;
  const full = amount >= PLACES[p].cap;
  let next: CityState = { ...c, kobo: c.kobo + amount, trays: { ...c.trays, [p]: 0 } };
  if (full) next = addBoom(next, BOOM_COLLECT, true);
  return { next, amount, full };
}

/**
 * The prize a street win adds on top of its coins (whole kobo): ₦5, or more so the money brought
 * home reaches what is left on the board the challenge was for (W5); the first street 1 win from
 * the Potholes card brings ₦14 in all (₦10 for the road, ₦4 for the Mama Put).
 */
export function winPrize(coins: number, opts: { left?: number; first?: boolean } = {}): number {
  const k = cleanKobo(coins);
  let prize = WIN_PRIZE;
  if (opts.left && opts.left > 0) prize = Math.max(prize, opts.left - k);
  if (opts.first) prize = Math.max(prize, FIRST_WIN - k);
  return prize;
}

/** Marks a hint as shown (once each). */
export function withHint(c: CityState, id: string): CityState {
  return c.hints.includes(id) ? c : { ...c, hints: [...c.hints, id] };
}
