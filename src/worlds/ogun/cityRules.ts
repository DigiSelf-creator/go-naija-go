/**
 * O6b: Ogun's city rules, with no DOM (docs/ogun.md 6.2 to 6.4; decisions 71, 80; city.md W2 to
 * W7 as Lagos's src/game/city.ts). The same rules as Lagos with Ogun's places:
 *
 * - The money is the one wallet every state shares (decision 80): Naira as whole kobo, Power and
 *   Tech as units. It lives only in Lagos's top-level `city` part and in memory once (main's
 *   CityLife); these rules take it in and give it back, never keep a copy.
 * - Ogun's own part (`states.ogun.city`) holds its fixes, part payments, places, trays, Booming
 *   meter, hints and where the hero stood:
 *     { "fixed": ["potholes"], "fixes": 1, "paid": {"dryTaps": 4}, "built": ["adire"],
 *       "trays": {"adire": 40}, "boom": 8, "boomCollect": 0, "boomSeen": 0, "hints": [], "at": {...} }
 * - "Bad road" (pin 7) is fixed by winning Pothole Hall (OG-R37): the city opens from the first
 *   visit (OG-R35), so its pin shows the problem until that win (`hallWon`, from states.ogun.hall,
 *   never saved here). It earns no Booming points (6.4 counts 24 points from 6 places).
 * - A board shows once what it needs is there: the road, the adire market, the pump, the lamps
 *   and the mast at once; the garri mill once the road is built (6.2 "needs pin 1"); the kola
 *   market from the first boom (6.4). (City.md W7's "one new board at a time" is Lagos's teaching
 *   order; an Ogun player already knows the boards. Listed for designer.)
 * Pure: every function returns new values.
 */
import { BOOM_BUILD, BOOM_COLLECT, COLLECT_MAX, FIRST_BOOM, TRAY_MIN, nextBoom, type MapPt } from '../../game/city';
import { markReached, meterOf } from '../../game/boom';
import { cleanKobo } from '../../game/money';
import type { SpotLook } from '../../art/city';
import type { OgunPlaceId, OgunSpotId, OgunSpotLooks } from './city';

type Obj = { [k: string]: unknown };
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export type Bucket = 'naira' | 'power' | 'tech';
/** The spots a board fixes (Bad road is the hall's). */
export type OgunFixId = Exclude<OgunSpotId, 'badRoad'>;
export const OGUN_FIX_IDS: readonly OgunFixId[] = ['potholes', 'dryTaps', 'lightsOut', 'slowInternet'];
/** Every board: a fix by its spot, or a place by its id. */
export type OgunBoard = OgunFixId | OgunPlaceId;
export const OGUN_BOARDS: readonly OgunBoard[] = ['potholes', 'adire', 'dryTaps', 'lightsOut', 'slowInternet', 'mill', 'kola'];

/** ogun.md 6.2: each board's bucket and price (whole kobo for Naira, else units). */
export const OGUN_PRICES: Readonly<Record<OgunBoard, { bucket: Bucket; price: number }>> = {
  potholes: { bucket: 'naira', price: 1200 },
  adire: { bucket: 'naira', price: 600 },
  dryTaps: { bucket: 'power', price: 10 },
  lightsOut: { bucket: 'power', price: 8 },
  slowInternet: { bucket: 'tech', price: 6 },
  mill: { bucket: 'naira', price: 800 },
  kola: { bucket: 'naira', price: 1000 },
};

/**
 * ogun.md 6.3: the tax places: seconds of play a sale, kobo a sale, cap, and the fix it needs.
 * A copy of src/game/states.ts OGUN_TRAYS (the first load fills the trays); a test pins them equal.
 */
export const OGUN_TAX: Readonly<Record<OgunPlaceId, { every: number; each: number; cap: number; needs: OgunFixId | null }>> = {
  adire: { every: 8, each: 10, cap: 120, needs: null },
  mill: { every: 15, each: 30, cap: 240, needs: 'potholes' },
  kola: { every: 12, each: 20, cap: 120, needs: null },
};
export const OGUN_PLACE_LIST: readonly OgunPlaceId[] = ['adire', 'mill', 'kola'];

export interface Wallet {
  kobo: number;
  power: number;
  tech: number;
}

export interface OgunCityState {
  fixed: OgunFixId[];
  fixes: number;
  paid: Partial<Record<OgunBoard, number>>;
  built: OgunPlaceId[];
  trays: Partial<Record<OgunPlaceId, number>>;
  boom: number;
  boomCollect: number;
  boomSeen: number;
  hints: string[];
  at: MapPt | null;
}

export function emptyOgunCity(): OgunCityState {
  return { fixed: [], fixes: 0, paid: {}, built: [], trays: {}, boom: 0, boomCollect: 0, boomSeen: 0, hints: [], at: null };
}

const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const isFix = (k: string): k is OgunFixId => (OGUN_FIX_IDS as readonly string[]).includes(k);
const isPlace = (k: string): k is OgunPlaceId => (OGUN_PLACE_LIST as readonly string[]).includes(k);

/** Ogun's own city part read leniently: anything odd counts as zero, empty or "not fixed". Unknown wallet fields are ignored. */
export function readOgunCity(v: unknown): OgunCityState {
  const c = emptyOgunCity();
  if (!isObj(v)) return c;
  if (Array.isArray(v['fixed'])) for (const id of v['fixed']) if (typeof id === 'string' && isFix(id) && !c.fixed.includes(id)) c.fixed.push(id);
  if (Array.isArray(v['built'])) for (const id of v['built']) if (typeof id === 'string' && isPlace(id) && !c.built.includes(id)) c.built.push(id);
  if (isObj(v['paid']))
    for (const k of OGUN_BOARDS) {
      const n = count(v['paid'][k]);
      if (n > 0 && !isDone(c, k)) c.paid[k] = Math.min(n, OGUN_PRICES[k].price - 1);
    }
  if (isObj(v['trays'])) for (const k of OGUN_PLACE_LIST) if (c.built.includes(k) && count(v['trays'][k]) > 0) c.trays[k] = Math.min(count(v['trays'][k]), OGUN_TAX[k].cap);
  if (Array.isArray(v['hints'])) for (const h of v['hints']) if (typeof h === 'string' && h.length <= 20 && !c.hints.includes(h)) c.hints.push(h);
  const at = v['at'];
  if (isObj(at)) {
    const x = at['x'];
    const y = at['y'];
    if (typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0 && x <= 1600 && y <= 1000) c.at = { x, y };
  }
  c.fixes = Math.max(count(v['fixes']), c.fixed.length);
  c.boom = Math.max(count(v['boom']), BOOM_BUILD * (c.fixed.length + c.built.length));
  c.boomCollect = Math.min(COLLECT_MAX, count(v['boomCollect']));
  c.boomSeen = count(v['boomSeen']);
  return c;
}

/** The own part as saved: plain JSON, never a wallet field. */
export function writeOgunCity(c: OgunCityState): Obj {
  const out: Obj = { fixed: [...c.fixed], fixes: c.fixes, paid: { ...c.paid }, built: [...c.built], trays: { ...c.trays }, boom: c.boom, boomCollect: c.boomCollect, boomSeen: c.boomSeen, hints: [...c.hints] };
  if (c.at) out['at'] = { x: Math.round(c.at.x), y: Math.round(c.at.y) };
  return out;
}

/** The shared wallet read leniently (from the top-level `city` part or the live CityLife state). */
export function readWallet(v: unknown): Wallet {
  if (!isObj(v)) return { kobo: 0, power: 0, tech: 0 };
  return { kobo: cleanKobo(v['kobo']), power: count(v['power']), tech: count(v['tech']) };
}

export function inBucket(w: Wallet, b: Bucket): number {
  return b === 'naira' ? w.kobo : b === 'power' ? w.power : w.tech;
}

function withBucket(w: Wallet, b: Bucket, n: number): Wallet {
  const v = Math.max(0, Math.floor(n));
  return b === 'naira' ? { ...w, kobo: v } : b === 'power' ? { ...w, power: v } : { ...w, tech: v };
}

/** A board's fix or build is done. */
export function isDone(c: OgunCityState, b: OgunBoard): boolean {
  return isFix(b) ? c.fixed.includes(b) : c.built.includes(b);
}

/** What is still to pay on a board (its own units; 0 once done). */
export function leftOn(c: OgunCityState, b: OgunBoard): number {
  return isDone(c, b) ? 0 : Math.max(0, OGUN_PRICES[b].price - (c.paid[b] ?? 0));
}

/** The first boom has shown its card (the cog turns, the kola market's board comes). */
export const boomed = (c: OgunCityState): boolean => c.boomSeen >= FIRST_BOOM;

/** The boards on the ground now, in a fixed order (see the file note). */
export function ogunBoards(c: OgunCityState): OgunBoard[] {
  return OGUN_BOARDS.filter((b) => !isDone(c, b) && (b !== 'mill' || c.fixed.includes('potholes')) && (b !== 'kola' || boomed(c)));
}

/** Enough in the right bucket for what is left. */
export function canPay(c: OgunCityState, w: Wallet, b: OgunBoard): boolean {
  return !isDone(c, b) && inBucket(w, OGUN_PRICES[b].bucket) >= leftOn(c, b);
}

/** Each pin's look: Bad road is the problem until Pothole Hall is won (OG-R37), then fixed. */
export function ogunLooks(c: OgunCityState, w: Wallet, hallWon = false): OgunSpotLooks {
  const look = (s: OgunFixId): SpotLook => (c.fixed.includes(s) ? 'fixed' : canPay(c, w, s) ? 'ready' : 'problem');
  return { potholes: look('potholes'), dryTaps: look('dryTaps'), lightsOut: look('lightsOut'), slowInternet: look('slowInternet'), badRoad: hallWon ? 'fixed' : 'problem' };
}

/** Adds Booming points (W6): a collect adds nothing once 4 have come from collecting since the last mark. */
export function addOgunBoom(c: OgunCityState, pts: number, fromCollect = false): OgunCityState {
  if (fromCollect && c.boomCollect >= COLLECT_MAX) return c;
  const boom = c.boom + pts;
  const crossed = boom >= nextBoom(c.boom);
  return { ...c, boom, boomCollect: crossed ? 0 : c.boomCollect + (fromCollect ? pts : 0) };
}

/** A boom whose card has not shown yet: its mark, or 0. */
export function ogunBoomDue(c: OgunCityState): number {
  const m = markReached(c.boom);
  return m > c.boomSeen ? m : 0;
}

export interface OgunPay {
  city: OgunCityState;
  wallet: Wallet;
  amount: number;
  left: number;
  done: boolean;
}

/**
 * Stand to pay (W2): pays what the wallet holds, up to what is left; the board keeps a part
 * payment until it is done. Never from the wrong bucket. Null when nothing can be paid.
 */
export function payOgunBoard(c: OgunCityState, w: Wallet, b: OgunBoard): OgunPay | null {
  if (isDone(c, b)) return null;
  const bucket = OGUN_PRICES[b].bucket;
  const left = leftOn(c, b);
  const amount = Math.min(inBucket(w, bucket), left);
  if (amount <= 0) return null;
  const wallet = withBucket(w, bucket, inBucket(w, bucket) - amount);
  const paid = { ...c.paid };
  const done = amount >= left;
  let city: OgunCityState;
  if (done) {
    delete paid[b];
    city = isFix(b) ? { ...c, paid, fixed: [...c.fixed, b], fixes: c.fixes + 1 } : { ...c, paid, built: [...c.built, b], trays: { ...c.trays, [b]: 0 } };
    city = addOgunBoom(city, BOOM_BUILD);
  } else {
    paid[b] = (paid[b] ?? 0) + amount;
    city = { ...c, paid };
  }
  return { city, wallet, amount, left: left - amount, done };
}

/** A tax place is earning: built, and what it needs is fixed (the garri mill needs the new road). */
export function ogunEarning(c: OgunCityState, p: OgunPlaceId): boolean {
  const need = OGUN_TAX[p].needs;
  return c.built.includes(p) && (need === null || c.fixed.includes(need));
}

/** W4: collect a tray (10 kobo or more) into the wallet. A full tray also fills the meter by 1. */
export function collectOgunTray(c: OgunCityState, w: Wallet, p: OgunPlaceId): { city: OgunCityState; wallet: Wallet; amount: number; full: boolean } | null {
  const amount = c.trays[p] ?? 0;
  if (amount < TRAY_MIN) return null;
  const full = amount >= OGUN_TAX[p].cap;
  let city: OgunCityState = { ...c, trays: { ...c.trays, [p]: 0 } };
  if (full) city = addOgunBoom(city, BOOM_COLLECT, true);
  return { city, wallet: { ...w, kobo: w.kobo + amount }, amount, full };
}

/** Which parts of the map each fix or place brightens (decision 47: tired, then bright). */
export const FIX_AREAS: Readonly<Record<OgunBoard | 'badRoad', readonly string[]>> = {
  badRoad: ['gate', 'verge'],
  potholes: ['r2c0'],
  dryTaps: ['water', 'motorPark'],
  lightsOut: ['interchange', 'r1c1'],
  slowInternet: ['r1c0'],
  adire: ['r0c1'],
  mill: ['r1c3'],
  kola: ['r2c3'],
};
/** The Booming meter's five steps light these, in order; the first boom lights everything. */
export const STEP_AREAS: readonly string[] = ['r0c0', 'r0c2', 'r1c2', 'r0c3', 'r2c1'];

/** The areas drawn bright now: the hall's gateway once won (OG-R37), each fix and place, the meter's steps; all after the first boom. */
export function ogunBright(c: OgunCityState, hallWon = false): string[] | undefined {
  if (boomed(c)) return undefined;
  const out = new Set<string>(hallWon ? FIX_AREAS.badRoad : []);
  for (const f of c.fixed) for (const a of FIX_AREAS[f]) out.add(a);
  for (const p of c.built) for (const a of FIX_AREAS[p]) out.add(a);
  const m = meterOf(c.boom, c.boomSeen);
  for (const a of STEP_AREAS.slice(0, m.prev === 0 ? m.step : 5)) out.add(a);
  return [...out];
}

/** Marks a hint as shown (once each). */
export function withOgunHint(c: OgunCityState, id: string): OgunCityState {
  return c.hints.includes(id) ? c : { ...c, hints: [...c.hints, id] };
}
