/**
 * Level loader. Levels are JSON data files in src/data/levels/. This turns one into the shapes
 * the game uses, with a light check of its shape, so a typo in a data file gives a clear
 * message instead of a strange game.
 *
 * Two formats: slice 1 (no `schema`, docs/design.md Level 1: the hero runs by itself and the
 * boss arena is at the end) and schema 2 streets (S2.6 Level data format: the player moves the
 * hero, a start fence and a bus at the end). Crates and wells are read and kept; wells draw as
 * plain placeholders until piece L, and crates draw only once their switch is on (features.ts, J2).
 */
import { FALL_Y, PHYSICS, type GroundSpan, type Platform, type Terrain } from '../engine/physics';
import { FEATURE_NAMES, type Feature } from './features';

export type HazardKind = 'goat' | 'tyre' | 'drum';
export type ThrowKind = 'tyre' | 'honk';

/** Boss rules from the level file (design.md: Boss). */
export interface BossData {
  kind: string;
  /** Bottom centre of the heap on the road. */
  x: number;
  /** Light platforms in the order they light up. */
  lights: readonly Platform[];
  /** Seconds with no throws after a hit. */
  breakAfterHit: number;
  /** One phase per hit taken so far: throw gap (s), tyre speed (u/s), repeating pattern. */
  phases: readonly { every: number; speed: number; pattern: readonly ThrowKind[] }[];
  /** Honk cloud centre y and speed. */
  honkY: number;
  honkSpeed: number;
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
  /** Slice 1 only: the boss arena at the end of the street. */
  arena: { x: number; width: number; turnLeftX: number; turnRightX: number } | null;
  /** Boss rules, or null for a level with no boss. */
  boss: BossData | null;
}

export class LevelError extends Error {
  constructor(id: string, path: string, problem: string) {
    super(`Level ${id}: ${path} ${problem}`);
    this.name = 'LevelError';
  }
}

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
    if (type !== 'street') fail('type', `"${type}" files are not played yet (only streets)`);
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
  const parseArena = (): Level['arena'] => {
    if (schema === 2 && r['arena'] === undefined) return null;
    const a = obj(r['arena'], 'arena');
    return {
      x: num(a['x'], 'arena.x'),
      width: num(a['width'], 'arena.width'),
      turnLeftX: num(a['turnLeftX'], 'arena.turnLeftX'),
      turnRightX: num(a['turnRightX'], 'arena.turnRightX'),
    };
  };
  const arena = parseArena();

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

  const parseBoss = (v: unknown): BossData | null => {
    if (v === undefined || (isObj(v) && Object.keys(v).length === 0)) return null;
    const b = obj(v, 'boss');
    const lights = list(b['lights'], 'boss.lights').map((l, i) => {
      const [x, y, w] = tuple(l, `boss.lights[${i}]`, 3);
      return { x: num(x, `boss.lights[${i}][0]`), y: num(y, `boss.lights[${i}][1]`), w: num(w, `boss.lights[${i}][2]`) };
    });
    const phases = list(b['phases'], 'boss.phases').map((ph, i) => {
      const p = obj(ph, `boss.phases[${i}]`);
      const pattern = list(p['pattern'], `boss.phases[${i}].pattern`).map((k, j) => oneOf(k, `boss.phases[${i}].pattern[${j}]`, ['tyre', 'honk'] as const));
      if (pattern.length === 0) fail(`boss.phases[${i}].pattern`, 'should have at least one throw');
      return { every: num(p['every'], `boss.phases[${i}].every`), speed: num(p['speed'], `boss.phases[${i}].speed`), pattern };
    });
    if (lights.length === 0) fail('boss.lights', 'should have at least one light');
    if (phases.length !== lights.length) fail('boss.phases', 'should have one phase per light');
    return {
      kind: str(b['kind'], 'boss.kind'),
      x: num(b['x'], 'boss.x'),
      lights,
      breakAfterHit: num(b['breakAfterHit'], 'boss.breakAfterHit'),
      phases,
      honkY: num(b['honkY'], 'boss.honkY'),
      honkSpeed: num(b['honkSpeed'], 'boss.honkSpeed'),
    };
  };

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
    crates,
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
    arena,
    boss: parseBoss(r['boss']),
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
