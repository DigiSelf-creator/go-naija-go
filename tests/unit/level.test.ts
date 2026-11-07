import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { LevelError, parseLevel } from '../../src/game/level';

describe('level loader', () => {
  it('loads world 1 level 1 from its data file', () => {
    const l = parseLevel(w1l1);
    expect(l.id).toBe('w1-l1');
    expect(l.terrain.groundY).toBe(300);
    expect(l.terrain.ground.length).toBe(w1l1.ground.length);
    expect(l.terrain.platforms[0]).toEqual({ x: 1150, y: 250, w: 140 });
    // Kobo rows are expanded into single coins, koboSpacing apart.
    const total = w1l1.kobo.reduce((n, row) => n + (row[2] as number), 0);
    expect(l.coins.length).toBe(total);
    expect(l.coins.slice(0, 2)).toEqual([
      { x: 300, y: 276 },
      { x: 324, y: 276 },
    ]);
    expect(l.foods.map((f) => f.kind)).toEqual(['garri', 'corn', 'amala']);
    expect(l.hazards.filter((h) => h.kind === 'goat').length).toBe(4);
    expect(l.hints[0]).toEqual({ x: 400, words: 'Tap to jump.' });
    expect(l.checkpoint).toBe(5600);
    expect(l.arena.x).toBe(11000);
    expect(l.terrain.fallY).toBe(420);
  });

  it('reads any level shaped the same way (no code change for new data)', () => {
    const raw = structuredClone(w1l1) as Record<string, unknown>;
    raw['id'] = 'test';
    raw['ground'] = [[-100, 500], [600, 2000]];
    raw['hazards'] = [['tyre', 900], ['goat', 700]];
    const l = parseLevel(raw);
    expect(l.ground).toEqual([[-100, 500], [600, 2000]]);
    expect(l.hazards).toEqual([{ kind: 'goat', x: 700 }, { kind: 'tyre', x: 900 }]); // sorted by x
  });

  it('gives a clear message for broken data', () => {
    const broken = (patch: Record<string, unknown>): unknown => ({ ...structuredClone(w1l1), ...patch });
    expect(() => parseLevel(null)).toThrow(LevelError);
    expect(() => parseLevel(broken({ groundY: '300' }))).toThrow('Level w1-l1: groundY should be a number');
    expect(() => parseLevel(broken({ ground: [[0, 100], [50, 200]] }))).toThrow('ground[1] should start after');
    expect(() => parseLevel(broken({ ground: [[100, 0]] }))).toThrow('ground[0] should end after it starts');
    expect(() => parseLevel(broken({ foods: [[1, 2, 'jollof']] }))).toThrow('foods[0][2] should be one of corn, garri, amala');
    expect(() => parseLevel(broken({ hazards: [['cow', 5]] }))).toThrow('hazards[0][0] should be one of goat, tyre');
    expect(() => parseLevel(broken({ kobo: [[1, 2]] }))).toThrow('kobo[0] should have 3 items');
    expect(() => parseLevel(broken({ arena: undefined }))).toThrow('arena should be an object');
  });
});
