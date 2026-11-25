/**
 * K6b: Kano's city rules, with no DOM (docs/kano.md 6.2 to 6.4; decisions 71, 80; city.md W2 to
 * W7), the same rules as Ogun's (src/worlds/ogun/cityRules.ts) with Kano's places:
 *
 * - The money is the one wallet every state shares (decision 80): Naira as whole kobo, Power and
 *   Tech as units. These rules take it in and give it back, never keep a copy.
 * - Kano's own part (`states.kano.city`) holds its fixes, part payments, places, trays, Booming
 *   meter, hints and where the hero stood.
 * - "Dry taps" (pin 7) is fixed by winning Borehole Hall (`hallWon`, from states.kano.hall, never
 *   saved here). It earns no Booming points: 6 places before the first boom, 24 points (6.2).
 * - A board shows once what it needs is there: the road, the leather stalls, the lamps, the mast
 *   and the dye pits at once; the grain market once the road is clean ("needs pin 1"); the
 *   groundnut pyramid from the first boom (6.4).
 * Kano imports no value from outside its folder (KN-R10), so the few Lagos numbers the rules use
 * are copied here; tests/unit/k6b-kano-city.test.ts pins them equal to src/game/city.ts.
 * Pure: every function returns new values.
 */
import type { SpotLook } from '../../art/city';
import { KANO_CITY_AREAS, type KanoPlaceId, type KanoSpotId, type KanoSpotLooks } from './city';

type Obj = { [k: string]: unknown };
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lagos's W4 and W6 numbers (src/game/city.ts), copied (see the file note). */
export const TRAY_MIN = 10;
export const BOOM_BUILD = 4;
export const BOOM_COLLECT = 1;
export const COLLECT_MAX = 4;
export const FIRST_BOOM = 20;

/** The next Booming mark after `points`: 20, then 50, 90, 140, ... (src/game/city.ts nextBoom). */
export function nextBoom(points: number): number {
  let mark = FIRST_BOOM;
  for (let gap = 30; mark <= points; gap += 10) mark += gap;
  return mark;
}
/** The last mark reached, or 0 (src/game/boom.ts markReached). */
export function markReached(points: number): number {
  let last = 0;
  for (let m = FIRST_BOOM, gap = 30; m <= points; m += gap, gap += 10) last = m;
  return last;
}
/** The meter between the marks (src/game/boom.ts meterOf). */
export function meterOf(points: number, seen = Infinity): { points: number; next: number; per: number; filled: number } {
  const p = Math.max(0, Math.floor(Number.isFinite(points) ? points : 0));
  let prev = 0;
  let next = FIRST_BOOM;
  for (let gap = 30; p >= next && next <= seen; gap += 10) {
    prev = next;
    next += gap;
  }
  const shown = Math.min(p, next);
  return { points: shown, next, per: (next - prev) / 5, filled: shown - prev };
}

export type Bucket = 'naira' | 'power' | 'tech';
/** The spots a board fixes (Dry taps is the hall's). */
export type KanoFixId = Exclude<KanoSpotId, 'dryTaps'>;
export const KANO_FIX_IDS: readonly KanoFixId[] = ['sandyRoad', 'lightsOut', 'slowInternet'];
/** Every board: a fix by its spot, or a place by its id, in 6.2's pin order. */
export type KanoBoard = KanoFixId | KanoPlaceId;
export const KANO_BOARDS: readonly KanoBoard[] = ['sandyRoad', 'leather', 'lightsOut', 'slowInternet', 'dye', 'grain', 'pyramid'];

/** kano.md 6.2: each board's bucket and price (whole kobo for Naira, else units). */
export const KANO_PRICES: Readonly<Record<KanoBoard, { bucket: Bucket; price: number }>> = {
  sandyRoad: { bucket: 'naira', price: 1200 },
  leather: { bucket: 'naira', price: 600 },
  lightsOut: { bucket: 'power', price: 8 },
  slowInternet: { bucket: 'tech', price: 6 },
  dye: { bucket: 'naira', price: 800 },
  grain: { bucket: 'naira', price: 800 },
  pyramid: { bucket: 'naira', price: 1000 },
};

/**
 * kano.md 6.3: the tax places: seconds of play a sale, kobo a sale, cap, and the fix it needs.
 * A copy of src/game/states.ts KANO_TRAYS (the first load fills the trays); a test pins them equal.
 */
export const KANO_TAX: Readonly<Record<KanoPlaceId, { every: number; each: number; cap: number; needs: KanoFixId | null }>> = {
  leather: { every: 8, each: 10, cap: 120, needs: null },
  dye: { every: 12, each: 20, cap: 120, needs: null },
  grain: { every: 15, each: 30, cap: 240, needs: 'sandyRoad' },
  pyramid: { every: 12, each: 20, cap: 120, needs: null },
};
export const KANO_PLACE_LIST: readonly KanoPlaceId[] = ['leather', 'dye', 'grain', 'pyramid'];

export interface Wallet {
  kobo: number;
  power: number;
  tech: number;
}

export interface KanoCityState {
  fixed: KanoFixId[];
  fixes: number;
  paid: Partial<Record<KanoBoard, number>>;
  built: KanoPlaceId[];
  trays: Partial<Record<KanoPlaceId, number>>;
  boom: number;
  boomCollect: number;
  boomSeen: number;
  hints: string[];
  at: { x: number; y: number } | null;
}

const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const isFix = (k: string): k is KanoFixId => (KANO_FIX_IDS as readonly string[]).includes(k);
const isPlace = (k: string): k is KanoPlaceId => (KANO_PLACE_LIST as readonly string[]).includes(k);
const list = <T extends string>(v: unknown, ok: (k: string) => k is T, max = 99): T[] => {
  const out: T[] = [];
  if (Array.isArray(v)) for (const k of v) if (typeof k === 'string' && k.length <= max && ok(k) && !out.includes(k)) out.push(k);
  return out;
};

/** Kano's own city part read leniently: anything odd counts as zero, empty or "not fixed". Wallet fields are ignored. */
export function readKanoCity(v: unknown): KanoCityState {
  const o = isObj(v) ? v : {};
  const c: KanoCityState = { fixed: list(o['fixed'], isFix), fixes: 0, paid: {}, built: list(o['built'], isPlace), trays: {}, boom: 0, boomCollect: 0, boomSeen: count(o['boomSeen']), hints: list(o['hints'], (k): k is string => k !== '', 20), at: null };
  const paid = isObj(o['paid']) ? o['paid'] : {};
  for (const k of KANO_BOARDS) {
    const n = count(paid[k]);
    if (n > 0 && !isDone(c, k)) c.paid[k] = Math.min(n, KANO_PRICES[k].price - 1);
  }
  const trays = isObj(o['trays']) ? o['trays'] : {};
  for (const k of c.built) if (count(trays[k]) > 0) c.trays[k] = Math.min(count(trays[k]), KANO_TAX[k].cap);
  const at = o['at'];
  if (isObj(at) && typeof at['x'] === 'number' && typeof at['y'] === 'number' && at['x'] >= 0 && at['y'] >= 0 && at['x'] <= 1600 && at['y'] <= 1000) c.at = { x: at['x'], y: at['y'] };
  c.fixes = Math.max(count(o['fixes']), c.fixed.length);
  c.boom = Math.max(count(o['boom']), BOOM_BUILD * (c.fixed.length + c.built.length));
  c.boomCollect = Math.min(COLLECT_MAX, count(o['boomCollect']));
  return c;
}

/** The own part as saved: plain JSON, never a wallet field. */
export function writeKanoCity(c: KanoCityState): Obj {
  const out: Obj = { fixed: [...c.fixed], fixes: c.fixes, paid: { ...c.paid }, built: [...c.built], trays: { ...c.trays }, boom: c.boom, boomCollect: c.boomCollect, boomSeen: c.boomSeen, hints: [...c.hints] };
  if (c.at) out['at'] = { x: Math.round(c.at.x), y: Math.round(c.at.y) };
  return out;
}

/** The shared wallet read leniently (from the live CityLife state). */
export function readWallet(v: unknown): Wallet {
  const o = isObj(v) ? v : {};
  return { kobo: count(o['kobo']), power: count(o['power']), tech: count(o['tech']) };
}

export const inBucket = (w: Wallet, b: Bucket): number => (b === 'naira' ? w.kobo : b === 'power' ? w.power : w.tech);

/** A board's fix or build is done. */
export const isDone = (c: KanoCityState, b: KanoBoard): boolean => (isFix(b) ? c.fixed.includes(b) : c.built.includes(b));

/** What is still to pay on a board (its own units; 0 once done). */
export const leftOn = (c: KanoCityState, b: KanoBoard): number => (isDone(c, b) ? 0 : Math.max(0, KANO_PRICES[b].price - (c.paid[b] ?? 0)));

/** The first boom has shown its card (the cog turns, the groundnut pyramid's board comes). */
export const boomed = (c: KanoCityState): boolean => c.boomSeen >= FIRST_BOOM;

/** The boards on the ground now, in a fixed order (see the file note). */
export const kanoBoards = (c: KanoCityState): KanoBoard[] => KANO_BOARDS.filter((b) => !isDone(c, b) && (b !== 'grain' || c.fixed.includes('sandyRoad')) && (b !== 'pyramid' || boomed(c)));

/** Each pin's look: Dry taps is the problem until Borehole Hall is won, then fixed. */
export function kanoLooks(c: KanoCityState, w: Wallet, hallWon = false): KanoSpotLooks {
  const look = (s: KanoFixId): SpotLook => (c.fixed.includes(s) ? 'fixed' : inBucket(w, KANO_PRICES[s].bucket) >= leftOn(c, s) ? 'ready' : 'problem');
  return { sandyRoad: look('sandyRoad'), lightsOut: look('lightsOut'), slowInternet: look('slowInternet'), dryTaps: hallWon ? 'fixed' : 'problem' };
}

/** Adds Booming points (W6): a collect adds nothing once 4 have come from collecting since the last mark. */
function addBoom(c: KanoCityState, pts: number, fromCollect: boolean): KanoCityState {
  if (fromCollect && c.boomCollect >= COLLECT_MAX) return c;
  const boom = c.boom + pts;
  return { ...c, boom, boomCollect: boom >= nextBoom(c.boom) ? 0 : c.boomCollect + (fromCollect ? pts : 0) };
}

/** A boom whose card has not shown yet: its mark, or 0. */
export function kanoBoomDue(c: KanoCityState): number {
  const m = markReached(c.boom);
  return m > c.boomSeen ? m : 0;
}

/**
 * Stand to pay (W2): pays what the wallet holds, up to what is left; the board keeps a part
 * payment until it is done. Never from the wrong bucket. Null when nothing can be paid.
 */
export function payKanoBoard(c: KanoCityState, w: Wallet, b: KanoBoard): { city: KanoCityState; wallet: Wallet; amount: number; left: number; done: boolean } | null {
  if (isDone(c, b)) return null;
  const bucket = KANO_PRICES[b].bucket;
  const left = leftOn(c, b);
  const have = inBucket(w, bucket);
  const amount = Math.min(have, left);
  if (amount <= 0) return null;
  const wallet = { ...w, [bucket === 'naira' ? 'kobo' : bucket]: have - amount };
  const paid = { ...c.paid };
  const done = amount >= left;
  let city: KanoCityState;
  if (done) {
    delete paid[b];
    city = addBoom(isFix(b) ? { ...c, paid, fixed: [...c.fixed, b], fixes: c.fixes + 1 } : { ...c, paid, built: [...c.built, b], trays: { ...c.trays, [b]: 0 } }, BOOM_BUILD, false);
  } else city = { ...c, paid: { ...paid, [b]: (paid[b] ?? 0) + amount } };
  return { city, wallet, amount, left: left - amount, done };
}

/** W4: collect a tray (10 kobo or more) into the wallet. A full tray also fills the meter by 1. */
export function collectKanoTray(c: KanoCityState, w: Wallet, p: KanoPlaceId): { city: KanoCityState; wallet: Wallet; amount: number; full: boolean } | null {
  const amount = c.trays[p] ?? 0;
  if (amount < TRAY_MIN) return null;
  const full = amount >= KANO_TAX[p].cap;
  const city: KanoCityState = { ...c, trays: { ...c.trays, [p]: 0 } };
  return { city: full ? addBoom(city, BOOM_COLLECT, true) : city, wallet: { ...w, kobo: w.kobo + amount }, amount, full };
}

/**
 * Decision 47 (as OG-R38): what each fix or place lights at once, its own area and one beside it;
 * Borehole Hall's win lights the water yard and the wall and gate (`lit`). The pyramid comes after
 * the first boom, when the rest is lit.
 */
export const KANO_FIX_AREAS: Readonly<Record<KanoBoard | 'dryTaps', readonly string[]>> = {
  dryTaps: ['r0c3', 'r0c2'],
  sandyRoad: ['gate', 'r2c1'],
  lightsOut: ['market', 'r1c2'],
  slowInternet: ['r2c3', 'r2c2'],
  leather: ['r2c0', 'r1c0'],
  dye: ['r0c1', 'r0c0'],
  grain: ['r1c3'],
  pyramid: ['r2c3'],
};
/** Each meter step (4 points, before the first boom) lights the first area here not yet bright, from the middle out. */
export const KANO_STEP_ORDER: readonly string[] = ['motorPark', 'r1c2', 'r2c1', 'r2c2', 'r0c1', 'r0c2', 'r1c0', 'r0c0', 'r2c0', 'r1c3'];
/** Each problem's own area, tired until it is fixed, even after the first boom. */
export const KANO_SPOT_AREA: Readonly<Record<KanoSpotId, string>> = { sandyRoad: 'gate', lightsOut: 'market', slowInternet: 'r2c3', dryTaps: 'r0c3' };

/**
 * The areas drawn bright now (in KANO_CITY_AREAS order). Before the first boom: the fixes' own
 * areas, then one area for each meter step reached (at most 4). From the first boom: everything
 * but a problem's own area while that problem is not fixed. Only grows as the save grows.
 */
export function kanoBright(c: KanoCityState, hallWon = false): string[] {
  const out = new Set<string>(hallWon ? KANO_FIX_AREAS.dryTaps : []);
  for (const f of [...c.fixed, ...c.built]) for (const a of KANO_FIX_AREAS[f]) out.add(a);
  if (boomed(c)) {
    const tired = new Set<string>();
    for (const f of KANO_FIX_IDS) if (!c.fixed.includes(f)) tired.add(KANO_SPOT_AREA[f]);
    if (!hallWon) tired.add(KANO_SPOT_AREA.dryTaps);
    for (const a of KANO_CITY_AREAS) if (!tired.has(a)) out.add(a);
  } else {
    const steps = Math.min(4, Math.floor(Math.min(c.boom, FIRST_BOOM - 1) / (FIRST_BOOM / 5)));
    for (const b of KANO_STEP_ORDER.filter((x) => !out.has(x)).slice(0, steps)) out.add(b);
  }
  return KANO_CITY_AREAS.filter((a) => out.has(a));
}

/** Marks a hint as shown (once each). */
export const withHint = (c: KanoCityState, id: string): KanoCityState => (c.hints.includes(id) ? c : { ...c, hints: [...c.hints, id] });

/** The fix a Harmattan Road win is for: the lamps, then the mast (6.2), or null. */
export const laneFix = (c: KanoCityState): 'lightsOut' | 'slowInternet' | null => (['lightsOut', 'slowInternet'] as const).find((f) => !c.fixed.includes(f)) ?? null;
