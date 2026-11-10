import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import { LevelError, parseLevel } from '../../src/game/level';
import { AUTO_LEVEL } from './auto-level';

describe('level loader', () => {
  it('loads a slice 1 shape street (the hero runs by itself) from data', () => {
    const l = parseLevel(AUTO_LEVEL);
    expect(l.id).toBe('auto-test');
    expect(l.schema).toBe(1);
    expect(l.manual).toBe(false);
    expect(l.terrain.groundY).toBe(300);
    expect(l.terrain.platforms[0]).toEqual({ x: 1150, y: 250, w: 140 });
    // Kobo rows are expanded into single coins, koboSpacing apart.
    expect(l.coins.length).toBe(5);
    expect(l.coins.slice(0, 2)).toEqual([
      { x: 300, y: 276 },
      { x: 324, y: 276 },
    ]);
    expect(l.checkpoint).toBe(5600);
    expect(l.hall).toBeNull();
    expect(l.boss).toBeNull();
    expect(l.terrain.fallY).toBe(420);
  });

  it('a street file never has a boss (piece M2: the boss lives in its hall); slice 1 arena and boss blocks are ignored', () => {
    const l = parseLevel({ ...structuredClone(AUTO_LEVEL), arena: { x: 1000 }, boss: { kind: 'x' } });
    expect(l.boss).toBeNull();
    expect(l.hall).toBeNull();
  });

  it('reads any level shaped the same way (no code change for new data)', () => {
    const raw = structuredClone(AUTO_LEVEL) as Record<string, unknown>;
    raw['id'] = 'test';
    raw['ground'] = [[-100, 500], [600, 2000]];
    raw['hazards'] = [['tyre', 900], ['goat', 700]];
    const l = parseLevel(raw);
    expect(l.ground).toEqual([[-100, 500], [600, 2000]]);
    expect(l.hazards).toEqual([{ kind: 'goat', x: 700 }, { kind: 'tyre', x: 900 }]); // sorted by x
  });

  it('gives a clear message for broken data', () => {
    const broken = (patch: Record<string, unknown>): unknown => ({ ...structuredClone(AUTO_LEVEL), ...patch });
    expect(() => parseLevel(null)).toThrow(LevelError);
    expect(() => parseLevel(broken({ groundY: '300' }))).toThrow('Level auto-test: groundY should be a number');
    expect(() => parseLevel(broken({ ground: [[0, 100], [50, 200]] }))).toThrow('ground[1] should start after');
    expect(() => parseLevel(broken({ ground: [[100, 0]] }))).toThrow('ground[0] should end after it starts');
    expect(() => parseLevel(broken({ foods: [[1, 2, 'jollof']] }))).toThrow('foods[0][2] should be one of corn, garri, amala');
    expect(() => parseLevel(broken({ hazards: [['cow', 5]] }))).toThrow('hazards[0][0] should be one of goat, tyre');
    expect(() => parseLevel(broken({ kobo: [[1, 2]] }))).toThrow('kobo[0] should have 3 items');
  });
});

describe('hall loader (S2.6 Level data format, S2.7)', () => {
  it('reads lagos-hall: a player-moved level with the whole floor solid and no road pieces', () => {
    const l = parseLevel(hallData);
    expect(l).toMatchObject({ id: 'lagos-hall', name: 'Go-Slow Hall', schema: 2, manual: true, theme: 'hall', groundY: 300, spawnX: 50 });
    expect(l.hall).toEqual({ width: 560, leftLimit: 30, rightLimit: 400 });
    expect(l.end).toBeNull();
    expect(l.coins).toEqual([]);
    expect(l.hazards).toEqual([]);
    expect(l.hints).toEqual([]);
    expect(l.terrain.ground[0]!.x0).toBeLessThan(0);
    expect(l.terrain.ground[0]!.x1).toBeGreaterThan(560);
    // Street speeds (S2.2): walk 90, run 156; corn 120 and 228.
    expect(l).toMatchObject({ walkSpeed: 90, runSpeed: 156, cornWalkSpeed: 120, cornSpeed: 228 });
    expect(l.boss!.phases.map((p) => p.pattern)).toEqual([['tyre'], ['tyre', 'tyre', 'honk'], ['tyre', 'honk', 'tyre', 'highHonk']]);
  });

  it('a designer can add a hall with no code change (a new boss pattern is just data)', () => {
    const raw = structuredClone(hallData) as Record<string, unknown> & { boss: Record<string, unknown> };
    raw['id'] = 'test-hall';
    raw.boss['phases'] = [
      { every: 2.4, speed: 150, pattern: ['tyre'], bpm: 120 },
      { every: 2.0, speed: 180, pattern: ['tyre', 'honk'], bpm: 126 },
      { every: 1.6, speed: 200, pattern: ['tyre', 'honk', 'tyre'], bpm: 132 },
    ];
    const l = parseLevel(raw);
    expect(l.id).toBe('test-hall');
    expect(l.boss!.phases[2]!.pattern).toEqual(['tyre', 'honk', 'tyre']);
  });

  it('gives a clear message for a broken hall', () => {
    const broken = (patch: Record<string, unknown>, boss: Record<string, unknown> = {}): unknown => {
      const raw = structuredClone(hallData) as Record<string, unknown> & { boss: Record<string, unknown> };
      return { ...raw, ...patch, boss: { ...raw.boss, ...boss } };
    };
    expect(() => parseLevel(broken({ width: '560' }))).toThrow('Level lagos-hall: width should be a number');
    expect(() => parseLevel(broken({ spawnX: 500 }))).toThrow('spawnX should be between leftLimit and rightLimit');
    expect(() => parseLevel(broken({ rightLimit: 600 }))).toThrow('rightLimit should be past leftLimit, both inside the hall');
    expect(() => parseLevel(broken({}, { throwX: 380 }))).toThrow('boss.throwX should be right of the cone line');
    expect(() => parseLevel(broken({}, { phases: [] }))).toThrow('boss.phases should have one phase per light');
    expect(() => parseLevel(broken({}, { phases: [{ every: 2, speed: 1, pattern: ['cow'], bpm: 1 }] }))).toThrow(
      'boss.phases[0].pattern[0] should be one of tyre, honk, highHonk',
    );
    expect(() => parseLevel(broken({}, { highHonkY: undefined }))).toThrow('boss.highHonkY should be a number');
    expect(() => parseLevel(broken({ type: 'room' }))).toThrow('"room" files are read as well rooms, not levels');
  });
});
