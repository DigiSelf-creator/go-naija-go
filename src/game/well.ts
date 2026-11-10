/**
 * The well and its room (docs/design.md S2.5): the rules only, no drawing, sound or DOM, so they
 * can be unit tested. Run (run.ts) owns the moves between the street and the room; this file
 * reads room files (src/data/levels/lagos-well.json) and keeps what one room holds in one play.
 *
 * - Going down: on the ground, centre within the well's x plus or minus 20, press Go down.
 *   The street freezes exactly as it was; corn and amala timers pause while below.
 * - The room: a floor wall to wall, plank shelves (one-way), kobo, a kobo crate, the garri parcel.
 *   No hazards, no pits, no timer.
 * - Going up: on the floor, centre within the rope's x plus or minus 20, press Go up. The hero
 *   comes out at the exit well + 30, facing right, with 1.0 s of blinking safety; woken hazards
 *   within 300 u of the exit are gone.
 * - The room remembers what was taken during this play (a lost life does not refill it).
 */
import { FALL_Y, type Platform, type Terrain } from '../engine/physics';
import { freshCrates, type CrateState } from './crates';
import type { CrateContents, CrateData } from './level';

/** Steps per second (same as run.ts STEPS_PER_SECOND; kept here so the two files do not import each other). */
const SPS = 60;
const secs = (s: number): number => Math.round(s * SPS);

export const WELL_RULES = {
  /** Go down or Go up: the hero's centre within this of the well (or the rope). */
  reach: 20,
  /** Going down (art's wellDownAt: 1.2 s, the fade in the last 0.4 s). */
  downSteps: secs(1.2),
  /** Arriving in the room: the bucket lowers the last 60 u to the floor while the dark fades. */
  arriveSteps: secs(0.5),
  arriveDrop: 60,
  arriveFadeSteps: secs(0.4),
  /** The arriving bucket is pulled back up after the hero steps off. */
  bucketBackSteps: secs(0.5),
  /** Going up the rope (art's wellUpAt: 1.0 s, the fade in the last 0.4 s). */
  upSteps: secs(1.0),
  /** Back on the street: the dark fades out over this. */
  surfaceFadeSteps: secs(0.4),
  /** Back on the street: blinking safety. */
  surfaceSafeSteps: secs(1.0),
  /** The hero appears this far right of the exit well. */
  exitStep: 30,
  /** Woken hazards this close to the exit well are gone when the hero comes up. */
  clearRadius: 300,
  /** The hero's centre stays this far inside the room's walls (as the street's wallGap). */
  wallGap: 7,
} as const;

export type GiftKind = 'parcel';

/** A room file (S2.6 Level data format, `type: "room"`). */
export interface RoomData {
  id: string;
  name: string;
  width: number;
  /** The room's walls (the hero's centre stays wallGap inside them). */
  leftLimit: number;
  rightLimit: number;
  /** Where the bucket lowers the hero. */
  entryX: number;
  /** The rope back up. */
  exitX: number;
  groundY: number;
  koboSpacing: number;
  terrain: Terrain;
  /** Every coin, one by one (rows expanded). */
  coins: readonly { x: number; y: number }[];
  crates: readonly CrateData[];
  /** The gift: centre x and y. */
  gift: { x: number; y: number; kind: GiftKind };
  /** Shown instead of the gift when the state already has a saved parcel (S2.5 gift rule 6). */
  giftIfCarried: { x: number; y: number; count: number };
}

export class RoomError extends Error {
  constructor(id: string, path: string, problem: string) {
    super(`Room ${id}: ${path} ${problem}`);
    this.name = 'RoomError';
  }
}

const CRATE_CONTENTS: readonly CrateContents[] = ['kobo', 'corn', 'garri', 'amala'];

export function parseRoom(raw: unknown): RoomData {
  const r = isObj(raw) ? raw : {};
  const id = typeof r['id'] === 'string' ? r['id'] : '(no id)';
  const fail = (path: string, problem: string): never => {
    throw new RoomError(id, path, problem);
  };
  const num = (v: unknown, path: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(path, 'should be a number'));
  const str = (v: unknown, path: string): string => (typeof v === 'string' && v.length > 0 ? v : fail(path, 'should be words'));
  const list = (v: unknown, path: string): unknown[] => (Array.isArray(v) ? v : fail(path, 'should be a list'));
  const tuple = (v: unknown, path: string, n: number): unknown[] => {
    const a = list(v, path);
    return a.length === n ? a : fail(path, `should have ${n} items`);
  };
  if (!isObj(raw)) fail('room', 'should be an object');
  if (r['schema'] !== 2) fail('schema', 'should be 2');
  if (r['type'] !== 'room') fail('type', 'should be "room"');

  const width = num(r['width'], 'width');
  const groundY = num(r['groundY'], 'groundY');
  const koboSpacing = num(r['koboSpacing'], 'koboSpacing');
  const leftLimit = num(r['leftLimit'], 'leftLimit');
  const rightLimit = num(r['rightLimit'], 'rightLimit');
  if (!(leftLimit >= 0 && rightLimit <= width && leftLimit < rightLimit)) fail('leftLimit', 'and rightLimit should sit inside the room, left before right');
  const inside = (x: number, path: string): number => (x >= leftLimit && x <= rightLimit ? x : fail(path, 'should be between leftLimit and rightLimit'));
  const entryX = inside(num(r['entryX'], 'entryX'), 'entryX');
  const exitX = inside(num(r['exitX'], 'exitX'), 'exitX');

  const platforms: Platform[] = list(r['platforms'], 'platforms').map((p, i) => {
    const [x, y, w] = tuple(p, `platforms[${i}]`, 3);
    const plat = { x: num(x, `platforms[${i}][0]`), y: num(y, `platforms[${i}][1]`), w: num(w, `platforms[${i}][2]`) };
    if (plat.w <= 0) fail(`platforms[${i}]`, 'should have a width above 0');
    return plat;
  });
  const coins: { x: number; y: number }[] = [];
  list(r['kobo'], 'kobo').forEach((row, i) => {
    const [x, y, n] = tuple(row, `kobo[${i}]`, 3);
    const count = num(n, `kobo[${i}][2]`);
    if (!Number.isInteger(count) || count < 1) fail(`kobo[${i}][2]`, 'should be a whole number of coins');
    for (let k = 0; k < count; k++) coins.push({ x: num(x, `kobo[${i}][0]`) + k * koboSpacing, y: num(y, `kobo[${i}][1]`) });
  });
  const crates: CrateData[] = list(r['crates'], 'crates').map((c, i) => {
    const [x, y, contents] = tuple(c, `crates[${i}]`, 3);
    if (!CRATE_CONTENTS.includes(contents as CrateContents)) fail(`crates[${i}][2]`, `should be one of ${CRATE_CONTENTS.join(', ')}`);
    return { x: num(x, `crates[${i}][0]`), bottomY: num(y, `crates[${i}][1]`), contents: contents as CrateContents };
  });
  const [gx, gy, gk] = tuple(r['gift'], 'gift', 3);
  if (gk !== 'parcel') fail('gift[2]', 'should be "parcel"');
  const [cx, cy, cn] = tuple(r['giftIfCarried'], 'giftIfCarried', 3);
  const count = num(cn, 'giftIfCarried[2]');
  if (!Number.isInteger(count) || count < 0) fail('giftIfCarried[2]', 'should be a whole number of coins');

  return {
    id: str(r['id'], 'id'),
    name: str(r['name'], 'name'),
    width,
    leftLimit,
    rightLimit,
    entryX,
    exitX,
    groundY,
    koboSpacing,
    // A floor from wall to wall: no pits, nothing to fall into.
    terrain: { groundY, ground: [{ x0: 0, x1: width }], platforms, fallY: Math.max(FALL_Y, groundY + 120) },
    coins,
    crates: crates.sort((p, q) => p.x - q.x),
    gift: { x: num(gx, 'gift[0]'), y: num(gy, 'gift[1]'), kind: 'parcel' },
    giftIfCarried: { x: num(cx, 'giftIfCarried[0]'), y: num(cy, 'giftIfCarried[1]'), count },
  };
}

/** What one room holds in one play of a street: taken stays taken (S2.5 Going up rule 6). */
export interface RoomPlay {
  readonly room: RoomData;
  readonly coins: { readonly x: number; readonly y: number; taken: boolean }[];
  readonly crates: CrateState[];
  /** The garri parcel, or null when the state already has a saved one (5 kobo show instead). */
  readonly gift: { readonly x: number; readonly y: number; readonly kind: GiftKind; taken: boolean } | null;
}

/**
 * A fresh room. `parcelSaved`: the state already has a saved parcel (from piece N2's save), so the
 * middle shelf shows giftIfCarried's kobo, in a row centred on its x, instead of the parcel.
 */
export function freshRoom(room: RoomData, parcelSaved = false): RoomPlay {
  const coins = room.coins.map((c) => ({ ...c, taken: false }));
  let gift: RoomPlay['gift'] = { ...room.gift, taken: false };
  if (parcelSaved) {
    gift = null;
    const { x, y, count } = room.giftIfCarried;
    for (let k = 0; k < count; k++) coins.push({ x: x + (k - (count - 1) / 2) * room.koboSpacing, y, taken: false });
  }
  return { room, coins, crates: freshCrates(room.crates), gift };
}

/** The hero's centre limits in a room. */
export function roomWalls(room: RoomData): { lo: number; hi: number } {
  return { lo: room.leftLimit + WELL_RULES.wallGap, hi: room.rightLimit - WELL_RULES.wallGap };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
