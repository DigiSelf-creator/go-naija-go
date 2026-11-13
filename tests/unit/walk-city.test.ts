/**
 * Walk the city (docs/city.md part 5W): the walk grid and its paths (W1), pay spots and part pay
 * (W2), working places filling in play time with caps (W3), collecting (W4), the win top-up (W5),
 * Booming points (W6), the save shape and its safe move (W10), and when the live city writes.
 */
import { describe, expect, it } from 'vitest';
import { CITY_BLOCKS } from '../../src/art/city';
import {
  BOOM_BUILD,
  COLLECT_MAX,
  FIRST_BOOM,
  HERO_START,
  PLACES,
  addBoom,
  boardsShown,
  canFix,
  collectTray,
  emptyCity,
  fillTrays,
  leftOf,
  newClock,
  nextBoom,
  payBoard,
  priceOf,
  readCity,
  spotLook,
  winPrize,
  writeCity,
  type CityState,
} from '../../src/game/city';
import { CityLife, SAVE_EVERY } from '../../src/game/cityLife';
import { CELL, COLS, GRID, ROWS, doorAt, findPath, lineClear, nearestOpen, tapTarget, walkable } from '../../src/game/walkGrid';
import { MATS, DOORS } from '../../src/screens/city';

const city = (o: Partial<CityState> = {}): CityState => ({ ...emptyCity(), ...o });

describe('the walk grid (W1 "The path")', () => {
  it('is 64 x 40 cells of 25 map units', () => {
    expect([CELL, COLS, ROWS, GRID.length]).toEqual([25, 64, 40, 64 * 40]);
  });

  it('roads, pavements, the bus park and the jetty are walkable; buildings and the lagoon are not', () => {
    for (const p of [HERO_START, { x: 101, y: 480 }, { x: 1000, y: 560 }, { x: 820, y: 818 }, { x: 428, y: 900 }]) expect(walkable(p), JSON.stringify(p)).toBe(true);
    const box = CITY_BLOCKS[0]!.boxes[0]!;
    expect(walkable({ x: box.x + box.w / 2, y: box.y + box.d / 2 })).toBe(false);
    expect(walkable({ x: 820, y: 950 })).toBe(false);
    expect(walkable({ x: -5, y: 100 })).toBe(false);
  });

  it('every mat and door can be reached from the bus park', () => {
    for (const to of [...Object.values(MATS), ...Object.values(DOORS)]) {
      const path = findPath(HERO_START, to);
      expect(path.length, JSON.stringify(to)).toBeGreaterThan(0);
      const end = path[path.length - 1]!;
      expect(Math.hypot(end.x - to.x, end.y - to.y), JSON.stringify(to)).toBeLessThan(40);
    }
  });

  it('a path never crosses a building: each leg is clear', () => {
    const path = findPath(HERO_START, { x: 101, y: 140 });
    let at = HERO_START as { x: number; y: number };
    for (const p of path) {
      expect(lineClear(at, p)).toBe(true);
      at = p;
    }
    // Corners cut: far fewer points than grid cells walked.
    expect(path.length).toBeLessThan(8);
  });

  it('a tap on the lagoon walks to the nearest walkable spot; a tap on a roof walks to its front door', () => {
    const shore = tapTarget({ x: 820, y: 960 });
    expect(walkable(shore)).toBe(true);
    expect(shore.y).toBeLessThan(870);
    const box = CITY_BLOCKS[4]!.boxes[0]!;
    const roof = { x: box.x + box.w / 2, y: box.y - box.h / 2 };
    const door = doorAt(roof)!;
    expect(door).not.toBeNull();
    expect(walkable(door)).toBe(true);
    expect(door.y).toBeGreaterThan(box.y + box.d - 1);
    expect(Math.abs(door.x - (box.x + box.w))).toBeLessThan(40);
    expect(nearestOpen(HERO_START)).toEqual(HERO_START);
  });

  it('finds a path well under 2 ms (map corner to corner)', () => {
    findPath({ x: 20, y: 20 }, { x: 1580, y: 840 });
    const t0 = performance.now();
    const n = 40;
    for (let i = 0; i < n; i++) findPath({ x: 20 + i, y: 20 }, { x: 1580 - i, y: 840 });
    expect((performance.now() - t0) / n).toBeLessThan(2);
  });
});

describe('pay spots (W2)', () => {
  it('boards show one new one at a time: road, then Mama Put, then the market; Lamps and Mast wait for the lane run', () => {
    expect(boardsShown(city())).toEqual(['road']);
    expect(boardsShown(city({ fixed: ['potholes'] }))).toEqual(['mamaPut']);
    expect(boardsShown(city({ fixed: ['potholes'], built: ['buka'] }))).toEqual(['market']);
    expect(boardsShown(city({ fixed: ['potholes'], built: ['buka', 'market'] }))).toEqual([]);
    expect(boardsShown(city(), true)).toEqual(['road', 'lamps', 'mast']);
    expect(boardsShown(city({ power: 2 }))).toEqual(['road', 'lamps']);
  });

  it('prices: ₦10 road, ₦4 Mama Put, ₦8 market (in kobo), Power 10, Tech 6', () => {
    expect(['road', 'mamaPut', 'market', 'lamps', 'mast'].map((b) => priceOf(b as never))).toEqual([1000, 400, 800, 10, 6]);
  });

  it('full pay builds it: the bucket goes down, the spot is fixed, 4 Booming points', () => {
    const r = payBoard(city({ kobo: 1400 }), 'road')!;
    expect(r).toMatchObject({ amount: 1000, left: 0, done: true });
    expect(r.next).toMatchObject({ kobo: 400, fixed: ['potholes'], fixes: 1, boom: 4, paid: {} });
    const m = payBoard(r.next, 'mamaPut')!;
    expect(m.next).toMatchObject({ kobo: 0, built: ['buka'], trays: { buka: 0 }, boom: 8 });
  });

  it('part pay: ₦6 into ₦10 leaves ₦4 on the board, saved; the next pay finishes it', () => {
    const a = payBoard(city({ kobo: 600, power: 9 }), 'road')!;
    expect(a).toMatchObject({ amount: 600, left: 400, done: false });
    expect(a.next).toMatchObject({ kobo: 0, power: 9, paid: { potholes: 600 }, fixed: [], boom: 0 });
    expect(leftOf(a.next, 'road')).toBe(400);
    expect(payBoard(a.next, 'road')).toBeNull(); // nothing in the bucket: the "not enough" card
    expect(spotLook(a.next, 'potholes')).toBe('problem');
    const withMore = { ...a.next, kobo: 450 };
    expect(canFix(withMore, 'potholes')).toBe(true); // only what is left counts
    const b = payBoard(withMore, 'road')!;
    expect(b).toMatchObject({ amount: 400, left: 0, done: true });
    expect(b.next).toMatchObject({ kobo: 50, paid: {}, fixed: ['potholes'] });
  });

  it('never from the wrong bucket', () => {
    expect(payBoard(city({ kobo: 5000, tech: 20 }), 'lamps')).toBeNull();
    expect(payBoard(city({ power: 50 }), 'road')).toBeNull();
  });
});

describe('working places fill in play time only, in steps, up to a cap (W3)', () => {
  const open = city({ fixed: ['potholes'], built: ['buka', 'market'], trays: { buka: 0, market: 0 } });

  it('Mama Put: 10 kobo a plate every 6 s; market: 30 kobo a danfo every 15 s', () => {
    const clock = newClock();
    let r = fillTrays(open, clock, 5.9);
    expect(r.changed).toEqual([]);
    r = fillTrays(r.next, clock, 0.2);
    expect(r.changed).toEqual(['buka']);
    expect(r.next.trays).toEqual({ buka: 10, market: 0 });
    r = fillTrays(r.next, clock, 9);
    expect(r.next.trays).toEqual({ buka: 20, market: 30 });
  });

  it('stops at the cap (₦1.50 and ₦2.40) and waits; both full hold less than half a street win', () => {
    const clock = newClock();
    const r = fillTrays(open, clock, 10_000);
    expect(r.next.trays).toEqual({ buka: PLACES.buka.cap, market: PLACES.market.cap });
    expect(PLACES.buka.cap + PLACES.market.cap).toBe(390);
    expect(fillTrays(r.next, clock, 600).changed).toEqual([]);
  });

  it('the market needs the New road; a place not built earns nothing', () => {
    const noRoad = fillTrays(city({ built: ['buka', 'market'] }), newClock(), 100).next;
    expect(noRoad.trays.market ?? 0).toBe(0);
    expect(noRoad.trays.buka).toBe(150);
    expect(fillTrays(city(), newClock(), 100).changed).toEqual([]);
  });

  it('nothing fills while the game is closed: only played seconds count (no clock is read)', () => {
    const life = new CityLife({ load: () => writeCity(open), save: () => true });
    expect(life.state.trays.buka ?? 0).toBe(0);
    // A new visit an hour later: the same, until played.
    const later = new CityLife({ load: () => writeCity(life.state), save: () => true });
    expect(later.state.trays.buka ?? 0).toBe(0);
    later.tick(6);
    expect(later.state.trays.buka).toBe(10);
  });
});

describe('collecting (W4) and the Booming meter (W6)', () => {
  it('collects 10 kobo or more; under 10 is left; a full tray gives 1 Booming point', () => {
    expect(collectTray(city({ built: ['buka'], trays: { buka: 0 } }), 'buka')).toBeNull();
    const part = collectTray(city({ built: ['buka'], trays: { buka: 120 }, kobo: 5 }), 'buka')!;
    expect(part).toMatchObject({ amount: 120, full: false });
    expect(part.next).toMatchObject({ kobo: 125, trays: { buka: 0 }, boom: 0 });
    const full = collectTray(city({ built: ['buka'], trays: { buka: 150 }, boom: 8 }), 'buka')!;
    expect(full.next).toMatchObject({ kobo: 150, boom: 9, boomCollect: 1 });
  });

  it('at most 4 points from collecting for each boom; a mark starts a new count', () => {
    let c = city({ boom: 8 });
    for (let i = 0; i < 6; i++) c = addBoom(c, 1, true);
    expect(c).toMatchObject({ boom: 12, boomCollect: COLLECT_MAX });
    c = addBoom(c, BOOM_BUILD);
    c = addBoom(c, BOOM_BUILD);
    expect(c.boom).toBe(FIRST_BOOM);
    expect(c.boomCollect).toBe(0);
    c = addBoom(c, 1, true);
    expect(c).toMatchObject({ boom: 21, boomCollect: 1 });
  });

  it('the first boom is at 20; later marks come further apart; the five slice 3 boards are 20 on their own', () => {
    expect(nextBoom(0)).toBe(20);
    expect(nextBoom(19)).toBe(20);
    expect(nextBoom(20)).toBe(50);
    expect(nextBoom(50)).toBe(90);
    expect(5 * BOOM_BUILD).toBe(FIRST_BOOM);
  });
});

describe('the win top-up (W5)', () => {
  it('a win adds ₦5, or enough to reach what is left of the fix it was for', () => {
    expect(winPrize(460)).toBe(500);
    expect(winPrize(300, { left: 1000 })).toBe(700);
    expect(winPrize(1200, { left: 1000 })).toBe(500);
  });

  it('the first street 1 win from the Potholes card brings ₦14 in all (₦10 road, ₦4 Mama Put)', () => {
    expect(460 + winPrize(460, { left: 1000, first: true })).toBe(1400);
    expect(300 + winPrize(300, { left: 1000, first: true })).toBe(1400); // 30 coins: ₦3 plus an ₦11 prize
    expect(1500 + winPrize(1500, { left: 1000, first: true })).toBe(2000);
  });
});

describe('the save (W10)', () => {
  it('writes every field; reads it back the same', () => {
    const c = city({ kobo: 250, fixed: ['potholes'], fixes: 1, at: { x: 905.4, y: 790.6 }, paid: { buka: 200 }, built: [], trays: {}, boom: 4, hints: ['walk', 'buka'] });
    const w = writeCity(c);
    expect(w).toEqual({ kobo: 250, power: 0, tech: 0, fixed: ['potholes'], fixes: 1, at: { x: 905, y: 791 }, paid: { buka: 200 }, built: [], trays: {}, boom: 4, boomCollect: 0, hints: ['walk', 'buka'] });
    expect(readCity(JSON.parse(JSON.stringify(w)))).toEqual({ ...c, at: { x: 905, y: 791 } });
  });

  it('an older city part (step (b)) moves safely: hero at the bus park, 4 points a fix, nothing part paid', () => {
    expect(readCity({ kobo: 250, power: 3, tech: 0, fixed: ['potholes'], fixes: 1 })).toEqual(city({ kobo: 250, power: 3, fixed: ['potholes'], fixes: 1, boom: 4 }));
  });

  it('broken fields start empty: a bad place, paid over the price, trays of places not built, odd hints', () => {
    const c = readCity({ at: { x: 'a' }, paid: { potholes: 99999, nope: 5, buka: -3 }, built: ['buka', 'castle', 'buka'], trays: { buka: 9999, market: 50 }, boom: -1, boomCollect: 99, hints: [7, 'walk', 'walk'] });
    expect(c.at).toBeNull();
    expect(c.paid).toEqual({ potholes: 999 });
    expect(c.built).toEqual(['buka']);
    expect(c.trays).toEqual({ buka: 150 });
    expect(c.boom).toBe(4);
    expect(c.boomCollect).toBe(COLLECT_MAX);
    expect(c.hints).toEqual(['walk']);
  });

  it('the live city writes at once on a pay or collect, else at most once every 10 s of play, keeping unknown fields', () => {
    let saved: Record<string, unknown> = { later: 'kept', ...writeCity(city({ fixed: ['potholes'], built: ['buka'] })) };
    const life = new CityLife({ load: () => saved, save: (p) => ((saved = p), true) });
    for (let i = 0; i < 9; i++) life.tick(1);
    expect(life.writes).toBe(0);
    expect(life.state.trays.buka).toBe(10);
    life.tick(1);
    expect(life.writes).toBe(1);
    expect(saved).toMatchObject({ later: 'kept', trays: { buka: 10 } });
    life.set(collectTray(life.state, 'buka')!.next, true);
    expect(life.writes).toBe(2);
    expect(saved).toMatchObject({ kobo: 10, trays: { buka: 0 } });
    // Nothing changed: no write.
    life.flush();
    expect(life.writes).toBe(2);
    expect(SAVE_EVERY).toBe(10);
  });
});
