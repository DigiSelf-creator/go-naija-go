/**
 * Level loader. Levels are JSON data files in src/data/levels/ (docs/design.md, Level 1:
 * schema). This turns one into the shapes the game uses, with a light check of its shape,
 * so a typo in a data file gives a clear message instead of a strange game.
 */
import { FALL_Y, type GroundSpan, type Platform, type Terrain } from '../engine/physics';

export type HazardKind = 'goat' | 'tyre';
export type FoodKind = 'corn' | 'garri' | 'amala';

export interface Level {
  id: string;
  name: string;
  groundY: number;
  runSpeed: number;
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
  hints: readonly { x: number; words: string }[];
  checkpoint: number;
  arena: { x: number; width: number; turnLeftX: number; turnRightX: number };
  /** Boss rules, kept as data for piece E. */
  boss: unknown;
}

export class LevelError extends Error {
  constructor(id: string, path: string, problem: string) {
    super(`Level ${id}: ${path} ${problem}`);
    this.name = 'LevelError';
  }
}

const FOOD_KINDS: readonly FoodKind[] = ['corn', 'garri', 'amala'];
const HAZARD_KINDS: readonly HazardKind[] = ['goat', 'tyre'];

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

  const hints = list(r['hints'], 'hints').map((h, i) => {
    const [x, words] = tuple(h, `hints[${i}]`, 2);
    return { x: num(x, `hints[${i}][0]`), words: str(words, `hints[${i}][1]`) };
  });

  const speeds = obj(r['hazardSpeeds'], 'hazardSpeeds');
  const a = obj(r['arena'], 'arena');
  const arena = {
    x: num(a['x'], 'arena.x'),
    width: num(a['width'], 'arena.width'),
    turnLeftX: num(a['turnLeftX'], 'arena.turnLeftX'),
    turnRightX: num(a['turnRightX'], 'arena.turnRightX'),
  };

  const spans: GroundSpan[] = ground.map(([x0, x1]) => ({ x0, x1 }));
  return {
    id: str(r['id'], 'id'),
    name: str(r['name'], 'name'),
    groundY,
    runSpeed: num(r['runSpeed'], 'runSpeed'),
    spawnX: num(r['spawnX'], 'spawnX'),
    koboSpacing,
    wakeDistance: num(r['wakeDistance'], 'wakeDistance'),
    hazardSpeeds: { goat: num(speeds['goat'], 'hazardSpeeds.goat'), tyre: num(speeds['tyre'], 'hazardSpeeds.tyre') },
    ground,
    terrain: { groundY, ground: spans, platforms, fallY: Math.max(FALL_Y, groundY + 120) },
    coins,
    foods,
    hazards: hazards.sort((p, q) => p.x - q.x),
    hints: hints.sort((p, q) => p.x - q.x),
    checkpoint: num(r['checkpoint'], 'checkpoint'),
    arena,
    boss: r['boss'],
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
