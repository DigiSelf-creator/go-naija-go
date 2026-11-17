/**
 * O6b2 (OG-R43 a): people walking about Ogun from above. Lagos's walkers (the people's kit) on
 * Ogun's ground with Ogun's cast: the same count rule, every walk on Ogun's open ground, nobody
 * stopping by a mat, a door or a pin, no child walking alone, and holding still while the map is
 * not drawing every frame.
 */
import { describe, expect, it } from 'vitest';
import * as kit from '../../src/game/peopleKit';
import { CITY_FOLK, CityWalkers, LAGOS_GROUND, ambientCount, cityWalkerAt } from '../../src/game/cityFolk';
import { OGUN_BLOCKS } from '../../src/worlds/ogun/city';
import { OGUN_CITY_CAST, OGUN_GROUND, OgunCityFolk } from '../../src/worlds/ogun/cityFolk';
import { OGUN_DOORS, OGUN_MATS } from '../../src/worlds/ogun/cityScreen';
import { ogunWalkable } from '../../src/worlds/ogun/walk';
import { seeded } from '../../src/game/crowd';

describe('OG-R43 a: Ogun\'s city walkers', () => {
  it('the kit gives a later state what it needs (no new chunk: Ogun takes them at run time)', () => {
    for (const k of ['CityWalkers', 'cityWalkerAt', 'ambientCount', 'CITY_FOLK', 'CastSheet', 'CityPeople', 'GamePeople'] as const) expect(kit[k], k).toBeDefined();
  });

  it('Ogun\'s cast: 16 looks from its streets, no child walking alone, nobody seated', () => {
    expect(OGUN_CITY_CAST).toHaveLength(16);
    for (const l of OGUN_CITY_CAST) {
      expect(l.age).not.toBe('child');
      expect(l.chair).not.toBe(true);
      expect(l.stool).not.toBe(true);
    }
  });

  it('every door they pick is open ground, bright blocks 3 times as often', () => {
    const r = seeded(7);
    const bright = new Set(['r0c1']);
    let hits = 0;
    const n = 4000;
    const fronts = new Map(OGUN_BLOCKS.map((b) => [b.id, b]));
    for (let i = 0; i < n; i++) {
      const p = OGUN_GROUND.pick(bright, r);
      expect(ogunWalkable(p)).toBe(true);
      const b = fronts.get('r0c1')!;
      if (p.x >= b.x - 30 && p.x <= b.x + b.w + 30 && Math.abs(p.y - (b.y + b.d)) < 40) hits++;
    }
    // 11 blocks, one bright (weight 3 of 13): about 23 %.
    expect(hits / n).toBeGreaterThan(0.17);
    expect(hits / n).toBeLessThan(0.3);
  });

  it('the count rule is Lagos\'s; they walk on Ogun\'s ground and never stop by a mat or a door', () => {
    const keep = [...Object.values(OGUN_MATS), ...Object.values(OGUN_DOORS)];
    const w = new CityWalkers(keep, OGUN_GROUND);
    const st = { fixed: ['potholes'], built: ['adire'], boom: 8 };
    const want = ambientCount(st);
    expect(want).toBe(3 + 1 + 1 + 2 * 2);
    const bright = new Set<string>();
    w.fill(want, bright, OGUN_CITY_CAST.length);
    expect(w.list.length).toBe(want);
    for (let t = 0; t < 600; t++) {
      w.step(1 / 30, { x: 933, y: 700 }, bright, true, false);
      for (const p of w.list) {
        const at = cityWalkerAt(p);
        expect(ogunWalkable(at) || p.pts.some((q) => Math.hypot(q.x - at.x, q.y - at.y) < 1), `walker at ${at.x.toFixed(0)},${at.y.toFixed(0)}`).toBe(true);
        if (p.stop > 0) for (const k of keep) expect(Math.hypot(at.x - k.x, at.y - k.y)).toBeGreaterThanOrEqual(CITY_FOLK.clear - 0.01);
        expect(p.look).toBeLessThan(OGUN_CITY_CAST.length);
      }
    }
  });

  it('they hold still while the map is not drawing every frame (a still city draws nothing)', () => {
    const w = new CityWalkers([], OGUN_GROUND);
    w.fill(6, new Set(), 16);
    const before = w.list.map((p) => p.d);
    for (let t = 0; t < 100; t++) w.step(0.1, { x: 0, y: 0 }, new Set(), false, false);
    expect(w.list.map((p) => p.d)).toEqual(before);
  });

  it('Lagos keeps its own ground (its walkers are as before)', () => {
    const a = new CityWalkers([]);
    const b = new CityWalkers([], LAGOS_GROUND);
    a.fill(8, new Set(['r1c1']), 16);
    b.fill(8, new Set(['r1c1']), 16);
    expect(a.list).toEqual(b.list);
  });

  it('OgunCityFolk draws nobody with no page (the kit\'s sheet needs one), and never throws', () => {
    const f = new OgunCityFolk(kit, []);
    f.step(0.05, { fixed: [], built: [], boom: 0 }, new Set(), { x: 933, y: 700 }, true);
    expect(f.count).toBe(3);
    f.ready({ skin: 0, hair: 0, outfit: 0, body: 0, age: 1 } as never, 1);
    const items: number[] = [];
    f.items((y) => items.push(y), {} as CanvasRenderingContext2D, 1, false);
    expect(items).toHaveLength(3);
  });
});
