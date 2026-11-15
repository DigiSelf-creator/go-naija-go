/**
 * S3g1b, the city's people (docs/design.md "People everywhere" part 9): the count rule, bright
 * blocks 3 times as often, nobody stops near a pay spot, tray or pin, the Mama Put queue of 3,
 * the Market's 5 shoppers, Mission complete's crowd.
 */
import { describe, expect, it } from 'vitest';
import { CITY_BLOCKS } from '../../src/art/city';
import { CITY_FOLK, CityWalkers, ambientCount, boomSteps, cityWalkerAt, mamaPutQueue, marketShoppers, missionCrowd, pickBlock } from '../../src/game/cityFolk';
import { seeded } from '../../src/game/crowd';
import { FIRST_BOOM } from '../../src/game/city';

describe('the count rule (part 9)', () => {
  it('3, plus 1 per fix or build, plus 2 per Booming step, at most 12', () => {
    expect(ambientCount({ fixed: [], built: [], boom: 0 })).toBe(3);
    expect(ambientCount({ fixed: ['potholes'], built: ['buka'], boom: 0 })).toBe(5);
    expect(boomSteps(FIRST_BOOM / 5)).toBe(1);
    expect(ambientCount({ fixed: [], built: [], boom: FIRST_BOOM / 5 })).toBe(5);
    expect(boomSteps(FIRST_BOOM)).toBe(5);
    expect(ambientCount({ fixed: ['potholes', 'lightsOut'], built: ['buka', 'market'], boom: 200 })).toBe(12);
  });
  it('bright blocks are picked about 3 times as often as tired ones', () => {
    const bright = new Set(CITY_BLOCKS.slice(0, 6).map((b) => b.id));
    const r = seeded(3);
    let b = 0;
    let t = 0;
    for (let i = 0; i < 9000; i++) (bright.has(pickBlock(bright, r)) ? b++ : t++);
    expect(b / t).toBeGreaterThan(2.6);
    expect(b / t).toBeLessThan(3.4);
  });
});

describe('walkers (part 9)', () => {
  it('fill to the count, walk on, hold still when the map is not drawing every frame, stop to watch a moment', () => {
    const w = new CityWalkers([]);
    const bright = new Set(CITY_BLOCKS.map((b) => b.id));
    w.fill(8, bright, 16);
    expect(w.list.length).toBe(8);
    const d0 = w.list.map((q) => q.d);
    w.step(0.5, { x: -999, y: -999 }, bright, false, false);
    expect(w.list.map((q) => q.d)).toEqual(d0);
    w.step(0.5, { x: -999, y: -999 }, bright, true, true);
    expect(w.list.map((q) => q.d)).toEqual(d0);
    for (let i = 0; i < 60; i++) w.step(1 / 60, { x: -999, y: -999 }, bright, true, false);
    expect(w.list.some((q, i) => q.d !== d0[i])).toBe(true);
    w.fill(3, bright, 16);
    expect(w.list.length).toBe(3);
  });
  it('stops and waves when the hero comes within 14 u, but never near a pay spot, tray or pin', () => {
    const bright = new Set(CITY_BLOCKS.map((b) => b.id));
    const w = new CityWalkers([]);
    w.fill(1, bright, 16);
    const at = cityWalkerAt(w.list[0]!);
    w.step(1 / 60, at, bright, true, false);
    expect(w.list[0]!.stop).toBeGreaterThan(0);
    const clear = new CityWalkers([]);
    clear.fill(1, bright, 16);
    const at2 = cityWalkerAt(clear.list[0]!);
    clear.keepClear = [{ x: at2.x + 5, y: at2.y }];
    clear.step(1 / 60, at2, bright, true, false);
    expect(clear.list[0]!.stop).toBe(0);
    expect(CITY_FOLK.clear).toBe(16);
  });
});

describe('places (part 9 and 10)', () => {
  it('the Mama Put queue holds 3, the first leaving with a plate as the 6 s go round', () => {
    expect(mamaPutQueue(0.1, 0, false, false)).toHaveLength(3);
    const leaving = mamaPutQueue(0.5, 0, false, false);
    expect(leaving.some((p) => p.x > 40 + 10 && p.frame.startsWith('walk'))).toBe(true);
    expect(mamaPutQueue(0.8, 0, false, false).length).toBeGreaterThanOrEqual(3);
    expect(mamaPutQueue(0.8, 0, true, false)).toHaveLength(3);
  });
  it('the Market has 5 shoppers; the trader shows cloth', () => {
    for (let t = 0; t < 20; t += 0.7) {
      const s = marketShoppers(t, false);
      expect(s).toHaveLength(5);
      expect(s[3]!.frame).toBe('call');
    }
  });
  it('Mission complete: 5 people by the stop cheer for 2 s from the hero stepping off', () => {
    expect(missionCrowd({ x: 0, y: 0 }, 0.5, false).every((p) => p.frame.startsWith('cheer'))).toBe(true);
    expect(missionCrowd({ x: 0, y: 0 }, 2.5, false).every((p) => p.frame === 'stand')).toBe(true);
  });
});
