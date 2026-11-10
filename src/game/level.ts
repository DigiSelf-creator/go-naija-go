/**
 * Level loader. Levels are JSON data files in src/data/levels/. This turns one into the shapes
 * the game uses, with a light check of its shape, so a typo in a data file gives a clear
 * message instead of a strange game.
 *
 * Formats: slice 1 streets (no `schema`: the hero runs by itself; kept for the engine's unit
 * tests, no slice 1 file ships since piece M retired w1-l1), schema 2 streets (S2.6 Level data
 * format: the player moves the hero, a start fence and a bus at the end) and schema 2 halls
 * (S2.7: one room where the state's boss is fought; the boss block lives only here).
 * Room files are read by parseRoom (well.ts).
 */
import { FALL_Y, GAIT, PHYSICS, type GroundSpan, type Platform, type Terrain } from '../engine/physics';
import { FEATURE_NAMES, type Feature } from './features';

export type HazardKind = 'goat' | 'tyre' | 'drum';
export type ThrowKind = 'tyre' | 'honk' | 'highHonk';
export const THROW_KINDS: readonly ThrowKind[] = ['tyre', 'honk', 'highHonk'];

/** One phase of the fight (one per hit taken so far): throw gap (s), tyre speed (u/s), repeating pattern, hall music tempo. */
export interface BossPhase {
  every: number;
  speed: number;
  pattern: readonly ThrowKind[];
  bpm: number;
}

/** Boss rules from the hall file (design.md S2.7). */
export interface BossData {
  kind: string;
  /** Bottom centre of the heap on the floor. */
  x: number;
  /** Throws come out of the gap at the heap's foot here. */
  throwX: number;
  /** Throws are gone (into the drain grate, or faded at the left wall) at this x. */
  drainX: number;
  /** Seconds from the fight's start to the first throw. */
  startDelay: number;
  /** Light platforms in the order they light up. */
  lights: readonly Platform[];
  /** Seconds with no throws after a hit. */
  breakAfterHit: number;
  phases: readonly BossPhase[];
  /** Low honk centre y, high honk centre y, and their speed. */
  honkY: number;
  highHonkY: number;
  honkSpeed: number;
}

/** A hall (S2.7): the hero moves between these limits; the whole hall is `width` wide. */
export interface HallData {
  width: number;
  leftLimit: number;
  rightLimit: number;
}
export type FoodKind = 'corn' | 'garri' | 'amala';
export type CrateContents = 'kobo' | FoodKind;

/** A crate hung over the road or a roof (S2.4): centre x, bottom edge y. */
export interface CrateData {
  x: number;
  bottomY: number;
  contents: CrateContents;
}

/** A well (S2.5): entrance x, exit x, room file id. */
export interface WellData {
  x: number;
  exitX: number;
  room: string;
}

export interface Level {
  id: string;
  name: string;
  /** 1: slice 1 format. 2: S2.6 format. */
  schema: 1 | 2;
  /** The player moves the hero (schema 2). Slice 1 levels run by themselves. */
  manual: boolean;
  /** Which backdrop art draws (schema 2), e.g. "morning". */
  theme: string;
  groundY: number;
  /** Walk speed (schema 2; slice 1 levels never walk). */
  walkSpeed: number;
  runSpeed: number;
  /** Walk speed with roasted corn. */
  cornWalkSpeed: number;
  /** Run speed with roasted corn. */
  cornSpeed: number;
  /** The start fence x; the hero stays right of startWall + 7. -Infinity on slice 1 levels. */
  startWall: number;
  /** Bus door x and bus park wall x (schema 2), or null. */
  end: { x: number; wall: number } | null;
  crates: readonly CrateData[];
  wells: readonly WellData[];
  spawnX: number;
  koboSpacing: number;
  /** A hazard starts moving when it is this far ahead of the hero. */
  wakeDistance: number;
  hazardSpeeds: Record<HazardKind, number>;
  /** Road spans as [startX, endX], for drawing. */
  ground: readonly (readonly [number, number])[];
  terrain: Terrain;
  /** Every coin, one by one (rows expanded). */
  coins: readonly { x: number; y: number }[];
  foods: readonly { x: number; y: number; kind: FoodKind }[];
  hazards: readonly { kind: HazardKind; x: number }[];
  /** Words shown when the hero reaches x. `needs`: a piece (features.ts) that must be on. */
  hints: readonly { x: number; words: string; needs?: Feature }[];
  checkpoint: number;
  /** A hall (S2.7), or null for a street. */
  hall: HallData | null;
  /** Boss rules (halls only), or null. */
  boss: BossData | null;
}

export class LevelError extends Error {
  constructor(id: string, path: string, problem: string) {
    super(`Level ${id}: ${path} ${problem}`);
    this.name = 'LevelError';
  }
}

/** S2.2: the hero's centre stays this far inside a wall (RULES.wallGap in run.ts). */
const WALL_GAP = 7;
/** S2.6 street walk speed with roasted corn (the hall file has no speeds; it uses the streets'). */
const CORN_WALK = 120;

const FOOD_KINDS: readonly FoodKind[] = ['corn', 'garri', 'amala'];
const CRATE_CONTENTS: readonly CrateContents[] = ['kobo', ...FOOD_KINDS];
const HAZARD_KINDS: readonly HazardKind[] = ['goat', 'tyre', 'drum'];

export function parseLevel(raw: unknown): Level {
  const id = isObj(raw) && typeof raw['id'] === 'string' ? raw['id'] : '(no id)';
  const fail = (path: string, problem: string): never => {
    throw new LevelError(id, path, problem);
  };
  const obj = (v: unknown, path: string): Record<string, unknown> => (isObj(v) ? v : fail(path, 'should be an object'));
  const num = (v: unknown, path: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(path, 'should be a number'));
  const str = (v: unknown, path: string): string => (typeof v === 'string' && v.length > 0 ? v : fail(path, 'should be words'));
  const list = (v: unknown, path: string): unknown[] => (Array.isArray(v) ? v : fail(path, 'should be a list'));
  const tuple = (v: unknown, path: string, n: number): unknown[] => {
    const a = list(v, path);
    return a.length === n ? a : fail(path, `should have ${n} items`);
  };
  const oneOf = <T extends string>(v: unknown, path: string, options: readonly T[]): T =>
    options.includes(v as T) ? (v as T) : fail(path, `should be one of ${options.join(', ')}`);

  const r = obj(raw, 'level');
  const schema = r['schema'] === undefined ? 1 : r['schema'] === 2 ? 2 : fail('schema', 'should be 2 (or left out for slice 1)');
  if (schema === 2) {
    const type = oneOf(r['type'], 'type', ['street', 'room', 'hall'] as const);
    if (type === 'room') fail('type', '"room" files are read as well rooms, not levels');
    if (type === 'hall') return parseHall(r, { fail, obj, num, str, list, tuple, oneOf });
  }
  const groundY = num(r['groundY'], 'groundY');
  const koboSpacing = num(r['koboSpacing'], 'koboSpacing');

  const ground = list(r['ground'], 'ground').map((s, i) => {
    const [a, b] = tuple(s, `ground[${i}]`, 2);
    const x0 = num(a, `ground[${i}][0]`);
    const x1 = num(b, `ground[${i}][1]`);
    if (x1 <= x0) fail(`ground[${i}]`, 'should end after it starts');
    return [x0, x1] as const;
  });
  if (ground.length === 0) fail('ground', 'should have at least one stretch of road');
  for (let i = 1; i < ground.length; i++) {
    if (ground[i]![0] < ground[i - 1]![1]) fail(`ground[${i}]`, 'should start after the stretch before it ends');
  }

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

  const foods = list(r['foods'], 'foods').map((f, i) => {
    const [x, y, kind] = tuple(f, `foods[${i}]`, 3);
    return { x: num(x, `foods[${i}][0]`), y: num(y, `foods[${i}][1]`), kind: oneOf(kind, `foods[${i}][2]`, FOOD_KINDS) };
  });

  const hazards = list(r['hazards'], 'hazards').map((h, i) => {
    const [kind, x] = tuple(h, `hazards[${i}]`, 2);
    return { kind: oneOf(kind, `hazards[${i}][0]`, HAZARD_KINDS), x: num(x, `hazards[${i}][1]`) };
  });

  // [x, words], or [x, words, piece] for a hint that only shows once that piece is on.
  const hints = list(r['hints'], 'hints').map((h, i) => {
    const a = list(h, `hints[${i}]`);
    const [x, words, needs] = a.length === 3 ? a : tuple(h, `hints[${i}]`, 2);
    const hint: { x: number; words: string; needs?: Feature } = { x: num(x, `hints[${i}][0]`), words: str(words, `hints[${i}][1]`) };
    if (a.length === 3) hint.needs = oneOf(needs, `hints[${i}][2]`, FEATURE_NAMES);
    return hint;
  });

  const speeds = obj(r['hazardSpeeds'], 'hazardSpeeds');

  const crates: CrateData[] =
    r['crates'] === undefined && schema === 1
      ? []
      : list(r['crates'], 'crates').map((c, i) => {
          const [x, y, contents] = tuple(c, `crates[${i}]`, 3);
          return { x: num(x, `crates[${i}][0]`), bottomY: num(y, `crates[${i}][1]`), contents: oneOf(contents, `crates[${i}][2]`, CRATE_CONTENTS) };
        });
  const wells: WellData[] =
    r['wells'] === undefined && schema === 1
      ? []
      : list(r['wells'], 'wells').map((w, i) => {
          const o = obj(w, `wells[${i}]`);
          return { x: num(o['x'], `wells[${i}].x`), exitX: num(o['exitX'], `wells[${i}].exitX`), room: str(o['room'], `wells[${i}].room`) };
        });
  let end: Level['end'] = null;
  if (schema === 2) {
    const e = obj(r['end'], 'end');
    end = { x: num(e['x'], 'end.x'), wall: num(e['wall'], 'end.wall') };
    if (end.wall <= end.x) fail('end.wall', 'should be past the bus door (end.x)');
  }
  const runSpeed = num(r['runSpeed'], 'runSpeed');
  // design.md: the level carries cornSpeed; 228 is only the fallback when it is missing.
  const cornSpeed = r['cornSpeed'] === undefined ? PHYSICS.fastRunSpeed : num(r['cornSpeed'], 'cornSpeed');
  const tyreSpeed = num(speeds['tyre'], 'hazardSpeeds.tyre');

  const spans: GroundSpan[] = ground.map(([x0, x1]) => ({ x0, x1 }));
  return {
    id: str(r['id'], 'id'),
    name: str(r['name'], 'name'),
    schema,
    manual: schema === 2,
    theme: schema === 2 ? str(r['theme'], 'theme') : 'morning',
    groundY,
    walkSpeed: schema === 2 ? num(r['walkSpeed'], 'walkSpeed') : runSpeed,
    runSpeed,
    cornWalkSpeed: schema === 2 ? num(r['cornWalkSpeed'], 'cornWalkSpeed') : cornSpeed,
    cornSpeed,
    startWall: schema === 2 ? num(r['startWall'], 'startWall') : -Infinity,
    end,
    crates: crates.sort((p, q) => p.x - q.x),
    wells,
    spawnX: num(r['spawnX'], 'spawnX'),
    koboSpacing,
    wakeDistance: num(r['wakeDistance'], 'wakeDistance'),
    hazardSpeeds: {
      goat: num(speeds['goat'], 'hazardSpeeds.goat'),
      tyre: tyreSpeed,
      drum: speeds['drum'] === undefined ? tyreSpeed : num(speeds['drum'], 'hazardSpeeds.drum'),
    },
    ground,
    terrain: { groundY, ground: spans, platforms, fallY: Math.max(FALL_Y, groundY + 120) },
    coins,
    foods,
    hazards: hazards.sort((p, q) => p.x - q.x),
    hints: hints.sort((p, q) => p.x - q.x),
    checkpoint: num(r['checkpoint'], 'checkpoint'),
    hall: null,
    boss: null,
  };
}

/** The checkers parseLevel uses, shared with parseHall. */
interface Check {
  fail: (path: string, problem: string) => never;
  obj: (v: unknown, path: string) => Record<string, unknown>;
  num: (v: unknown, path: string) => number;
  str: (v: unknown, path: string) => string;
  list: (v: unknown, path: string) => unknown[];
  tuple: (v: unknown, path: string, n: number) => unknown[];
  oneOf: <T extends string>(v: unknown, path: string, options: readonly T[]) => T;
}

/**
 * A hall file (S2.6 Level data format, S2.7): the floor, the hero's limits and the boss.
 * Played as a level with no road pieces: the whole floor is solid, and the hero walks and runs
 * at the street speeds (S2.2) between leftLimit and rightLimit.
 */
function parseHall(r: Record<string, unknown>, c: Check): Level {
  const { fail, obj, num, str, list, tuple, oneOf } = c;
  const groundY = num(r['groundY'], 'groundY');
  const width = num(r['width'], 'width');
  const hall: HallData = { width, leftLimit: num(r['leftLimit'], 'leftLimit'), rightLimit: num(r['rightLimit'], 'rightLimit') };
  if (hall.leftLimit < 0 || hall.rightLimit > width || hall.rightLimit <= hall.leftLimit) fail('rightLimit', 'should be past leftLimit, both inside the hall');
  const spawnX = num(r['spawnX'], 'spawnX');
  if (spawnX < hall.leftLimit || spawnX > hall.rightLimit) fail('spawnX', 'should be between leftLimit and rightLimit');

  const b = obj(r['boss'], 'boss');
  const lights = list(b['lights'], 'boss.lights').map((l, i) => {
    const [x, y, w] = tuple(l, `boss.lights[${i}]`, 3);
    return { x: num(x, `boss.lights[${i}][0]`), y: num(y, `boss.lights[${i}][1]`), w: num(w, `boss.lights[${i}][2]`) };
  });
  const phases = list(b['phases'], 'boss.phases').map((ph, i) => {
    const p = obj(ph, `boss.phases[${i}]`);
    const pattern = list(p['pattern'], `boss.phases[${i}].pattern`).map((k, j) => oneOf(k, `boss.phases[${i}].pattern[${j}]`, THROW_KINDS));
    if (pattern.length === 0) fail(`boss.phases[${i}].pattern`, 'should have at least one throw');
    const every = num(p['every'], `boss.phases[${i}].every`);
    if (every <= 0) fail(`boss.phases[${i}].every`, 'should be above 0');
    return { every, speed: num(p['speed'], `boss.phases[${i}].speed`), pattern, bpm: num(p['bpm'], `boss.phases[${i}].bpm`) };
  });
  if (lights.length === 0) fail('boss.lights', 'should have at least one light');
  if (phases.length !== lights.length) fail('boss.phases', 'should have one phase per light');
  const boss: BossData = {
    kind: str(b['kind'], 'boss.kind'),
    x: num(b['x'], 'boss.x'),
    throwX: num(b['throwX'], 'boss.throwX'),
    drainX: num(b['drainX'], 'boss.drainX'),
    startDelay: num(b['startDelay'], 'boss.startDelay'),
    lights,
    breakAfterHit: num(b['breakAfterHit'], 'boss.breakAfterHit'),
    phases,
    honkY: num(b['honkY'], 'boss.honkY'),
    highHonkY: num(b['highHonkY'], 'boss.highHonkY'),
    honkSpeed: num(b['honkSpeed'], 'boss.honkSpeed'),
  };
  if (boss.throwX <= hall.rightLimit) fail('boss.throwX', 'should be right of the cone line (rightLimit)');

  // The floor runs past both walls: there are no pits in a hall.
  const floor: readonly [number, number] = [-200, width + 200];
  return {
    id: str(r['id'], 'id'),
    name: str(r['name'], 'name'),
    schema: 2,
    manual: true,
    theme: 'hall',
    groundY,
    walkSpeed: GAIT.walk,
    runSpeed: PHYSICS.runSpeed,
    cornWalkSpeed: CORN_WALK,
    cornSpeed: PHYSICS.fastRunSpeed,
    startWall: hall.leftLimit - WALL_GAP,
    end: null,
    crates: [],
    wells: [],
    spawnX,
    koboSpacing: 24,
    wakeDistance: 0,
    hazardSpeeds: { goat: 0, tyre: 0, drum: 0 },
    ground: [floor],
    terrain: { groundY, ground: [{ x0: floor[0], x1: floor[1] }], platforms: [], fallY: Math.max(FALL_Y, groundY + 120) },
    coins: [],
    foods: [],
    hazards: [],
    hints: [],
    checkpoint: Infinity,
    hall,
    boss,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
