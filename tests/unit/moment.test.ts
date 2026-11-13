/**
 * S3d1b, the "watch it change" moment and the boom (docs/city.md d6, d10): the times, the parts a
 * ring brightens, the danfo that stops for the hero (W1) and the people walking in.
 */
import { describe, expect, it } from 'vitest';
import { BUS_PARK, CITY_BLOCKS } from '../../src/art/city';
import { FIX_SET } from '../../src/game/boom';
import {
  BOOM,
  DANFO_GAP,
  DANFO_ROUTE,
  MOMENT,
  MOVING_DANFOS,
  MOVING_PEOPLE,
  areaRect,
  around,
  driveOn,
  ease,
  fixRects,
  planWalkers,
  ringReach,
  routeAt,
  routeLength,
  span,
  walkTargets,
  walkerAt,
} from '../../src/game/moment';
import { walkable } from '../../src/game/walkGrid';

describe('d6: the times', () => {
  it('the moment: camera 0.5, notches from 0.3, ring 0.5 to 2.0, sting at 2.0, people and the danfo 1.5 to 3.6, the end at 3.6', () => {
    expect(MOMENT.camera).toBe(0.5);
    expect(MOMENT.notches).toBe(0.3);
    expect(MOMENT.notches + 4 * MOMENT.notch).toBeCloseTo(0.7);
    expect(MOMENT.ring).toEqual([0.5, 2.0]);
    expect(MOMENT.sting).toBe(2.0);
    expect(MOMENT.sting + MOMENT.stepRing).toBeCloseTo(2.8);
    expect(MOMENT.walk).toEqual([1.5, 3.5]);
    expect(MOMENT.drive).toEqual([1.5, 3.6]);
    expect(MOMENT.end).toBe(3.6);
    expect(MOMENT.hold).toBe(0.5);
  });

  it('the boom: camera 0.6, tune 0.6, ring 0.6 to 2.4, flats 1.0 to 2.2, ferry 1.0 to 2.4, people 1.6 to 3.0, the card at 3.0, from the bus park', () => {
    expect(BOOM).toMatchObject({ camera: 0.6, tune: 0.6, ring: [0.6, 2.4], flats: [1.0, 2.2], ferry: [1.0, 2.4], walk: [1.6, 3.0], card: 3.0, from: { x: 820, y: 700 } });
  });

  it('W10: at most 8 people and 2 danfos moving', () => {
    expect(MOVING_PEOPLE).toBe(8);
    expect(MOVING_DANFOS).toBe(2);
  });

  it('ease is slow, fast, slow and span runs 0 to 1', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(2)).toBe(1);
    expect(span(0.5, [0.5, 2])).toBe(0);
    expect(span(1.25, [0.5, 2])).toBeCloseTo(0.5);
    expect(span(9, [0.5, 2])).toBe(1);
  });
});

describe('d6, d10: the rings', () => {
  it("a fix's ring covers its own set (and the Alausa road for the New road), every corner", () => {
    for (const b of Object.keys(FIX_SET) as (keyof typeof FIX_SET)[]) {
      const rects = fixRects(b);
      expect(rects.length).toBe(FIX_SET[b].length + (b === 'road' ? 1 : 0));
      for (const r of rects) expect(r.w * r.h, `${b}: an empty part`).toBeGreaterThan(0);
      const from = { x: 101, y: 480 };
      const reach = ringReach(from, rects);
      for (const r of rects) for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y + r.h]] as const) expect(Math.hypot(x - from.x, y - from.y)).toBeLessThanOrEqual(reach + 1e-9);
    }
  });

  it('a block part takes in its roofs (drawn above its lot) and the bus park its shelter', () => {
    const b = CITY_BLOCKS.find((q) => q.id === 'r1c1')!;
    const r = areaRect('r1c1');
    expect(r.y).toBeLessThan(Math.min(...b.boxes.map((q) => q.y - q.h)));
    expect(r.y + r.h).toBeGreaterThanOrEqual(b.y + b.d);
    const p = areaRect('busPark');
    expect(p.y + p.h).toBeGreaterThanOrEqual(BUS_PARK.y + BUS_PARK.h);
    expect(around([r, p]).w).toBeGreaterThan(r.w);
  });
});

describe('d6, W1: the danfo', () => {
  it('each route is a road, from the nearest end (New road up the Alausa road and off the top; Mama Put parks in the bus park)', () => {
    expect(DANFO_ROUTE.road.to.y).toBeLessThan(0);
    expect(DANFO_ROUTE.road.dir).toBe('n');
    const park = DANFO_ROUTE.mamaPut.to;
    expect(park.x > BUS_PARK.x && park.x < BUS_PARK.x + BUS_PARK.w && park.y > BUS_PARK.y && park.y < BUS_PARK.y + BUS_PARK.h).toBe(true);
    for (const r of Object.values(DANFO_ROUTE)) expect(routeLength(r)).toBeGreaterThan(100);
  });

  it('drives on when nobody is in its lane', () => {
    const r = DANFO_ROUTE.lamps;
    expect(driveOn(r, 0, 50, { x: 640, y: 818 })).toBe(50);
    expect(driveOn(r, routeLength(r) - 10, 50, { x: 0, y: 0 })).toBe(routeLength(r));
  });

  it('stops 40 map units short of a hero in its lane, waits, and goes on once the hero steps away', () => {
    const r = DANFO_ROUTE.market;
    const hero = { x: 1320, y: 818 };
    let d = 0;
    for (let i = 0; i < 200; i++) d = driveOn(r, d, 10, hero);
    const front = routeAt(r, d).x + 23;
    expect(hero.x - 11 - front).toBeCloseTo(DANFO_GAP, 5);
    expect(driveOn(r, d, 10, hero)).toBe(d);
    expect(driveOn(r, d, 10, { x: 1320, y: 760 })).toBe(d + 10);
  });

  it('a hero beside the lane is passed, not stopped for (the New road: the danfo goes past the hero on the mat)', () => {
    const r = DANFO_ROUTE.road;
    expect(driveOn(r, 0, 300, { x: 101, y: 480 })).toBe(300);
  });

  it('never goes back', () => {
    const r = DANFO_ROUTE.road;
    expect(driveOn(r, 200, 10, { x: 122, y: 420 })).toBe(200);
  });
});

describe('d6: people walking in', () => {
  it('walk from a road end or the bus park to the fronts of the bright blocks, on walkable ground, in about the time given', () => {
    const ws = planWalkers(['r0c0', 'r1c0', 'r2c0'], 6, 2);
    expect(ws).toHaveLength(6);
    for (const w of ws) {
      for (const p of w.pts) expect(walkable(p), JSON.stringify(p)).toBe(true);
      expect(w.speed).toBeGreaterThan(0);
      expect(w.speed).toBeLessThanOrEqual(360);
      w.t = 0;
      expect(walkerAt(w).done).toBe(false);
      w.t = w.wait + w.len / w.speed + 0.01;
      const end = walkerAt(w);
      expect(end.done).toBe(true);
      expect(end).toMatchObject(w.pts[w.pts.length - 1]!);
    }
  });

  it('the targets are spread over the areas, the bus park when there are none', () => {
    expect(walkTargets([], 3)).toHaveLength(3);
    for (const p of walkTargets(['busPark'], 6)) expect(p.x > BUS_PARK.x - 30 && p.x < BUS_PARK.x + BUS_PARK.w + 30).toBe(true);
  });

  it('a walker moves along its way at its speed', () => {
    const [w] = planWalkers(['r2c2'], 1, 2, { x: 820, y: 700 });
    w!.t = w!.wait + 0.5;
    const a = walkerAt(w!);
    expect(Math.hypot(a.x - 820, a.y - 700)).toBeLessThanOrEqual(w!.speed * 0.5 + 1);
  });
});
