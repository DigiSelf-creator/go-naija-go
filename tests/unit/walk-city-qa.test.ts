/**
 * qa, slice 3 step (c) "Walk the city" (docs/city.md part 5W): the walk grid has no islands the
 * hero can be stranded on, and money adds up whatever order things happen in (pay, part pay,
 * collect, fill, wins), never below 0, never paid twice, the meter never going down.
 */
import { describe, expect, it } from 'vitest';
import { COLS, GRID, ROWS, cellMid, findPath } from '../../src/game/walkGrid';
import {
  BUILD_KEY,
  COLLECT_MAX,
  HERO_START,
  PLACES,
  addKobo,
  collectTray,
  emptyCity,
  fillTrays,
  isBuilt,
  newClock,
  nextBoom,
  payBoard,
  priceOf,
  readCity,
  writeCity,
  type CityState,
} from '../../src/game/city';
import type { BuildId } from '../../src/art/payspot';

describe('the walk grid: nowhere to be stranded (W1)', () => {
  it('every walkable cell can walk back to the bus park', () => {
    const stranded: { x: number; y: number }[] = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      if (GRID[i] !== 1) continue;
      const m = cellMid(i);
      if (Math.hypot(m.x - HERO_START.x, m.y - HERO_START.y) < 1) continue;
      if (findPath(m, HERO_START).length === 0) stranded.push(m);
    }
    expect(stranded, 'cells with no way back to the bus park (the hero can stand there but never leave by a tap)').toEqual([]);
  });

  it('a tap anywhere never sends the hero somewhere with no way back', () => {
    const bad: string[] = [];
    for (let x = 1100; x <= 1600; x += 10)
      for (let y = 760; y <= 1000; y += 10) {
        const p = findPath({ x: 1280, y: 780 }, { x, y });
        const end = p[p.length - 1];
        if (end && findPath(end, HERO_START).length === 0) bad.push(`${x},${y}`);
      }
    expect(bad.slice(0, 5), `${bad.length} taps strand the hero`).toEqual([]);
  });
});

/** A small seeded random, so a failure can be replayed. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const BOARDS: BuildId[] = ['road', 'mamaPut', 'market', 'lamps', 'mast'];

/** All the Naira in the game: the bucket, the boards, the trays, and the price of what is built. */
function nairaTotal(c: CityState): number {
  let t = c.kobo;
  for (const b of ['road', 'mamaPut', 'market'] as BuildId[]) t += isBuilt(c, b) ? priceOf(b) : (c.paid[BUILD_KEY[b]] ?? 0);
  t += (c.trays.buka ?? 0) + (c.trays.market ?? 0);
  return t;
}

describe('money adds up in any order (W2, W3, W4, W5)', () => {
  it('10 000 random steps: never below 0, never over a price, nothing lost or made, the meter never goes down', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = rng(seed);
      let c = emptyCity();
      const clock = newClock();
      let made = 0;
      let boomCollectSinceMark = 0;
      let mark = nextBoom(c.boom);
      for (let step = 0; step < 500; step++) {
        const before = c;
        const k = r();
        if (k < 0.2) {
          const add = Math.floor(r() * 1500);
          made += add;
          c = addKobo(c, add);
        } else if (k < 0.55) {
          const b = BOARDS[Math.floor(r() * BOARDS.length)]!;
          const res = payBoard(c, b);
          if (res) {
            c = res.next;
            expect(res.amount).toBeGreaterThan(0);
            expect(res.left).toBeGreaterThanOrEqual(0);
          }
        } else if (k < 0.8) {
          const f = fillTrays(c, clock, r() * 30);
          made += nairaTotal(f.next) - nairaTotal(c);
          c = f.next;
        } else {
          const p = r() < 0.5 ? 'buka' : 'market';
          const res = collectTray(c, p);
          if (res) {
            c = res.next;
            if (res.full) boomCollectSinceMark++;
          }
        }
        // Save and load every step: the money survives a reload exactly.
        c = readCity(JSON.parse(JSON.stringify(writeCity(c))));
        expect(c.kobo, `seed ${seed} step ${step}`).toBeGreaterThanOrEqual(0);
        expect(c.power).toBeGreaterThanOrEqual(0);
        expect(c.tech).toBeGreaterThanOrEqual(0);
        for (const b of BOARDS) {
          const paid = c.paid[BUILD_KEY[b]] ?? 0;
          expect(paid).toBeGreaterThanOrEqual(0);
          expect(paid).toBeLessThan(priceOf(b));
          if (isBuilt(c, b)) expect(paid).toBe(0);
        }
        expect(c.trays.buka ?? 0).toBeLessThanOrEqual(PLACES.buka.cap);
        expect(c.trays.market ?? 0).toBeLessThanOrEqual(PLACES.market.cap);
        expect(c.boom).toBeGreaterThanOrEqual(before.boom);
        expect(c.boomCollect).toBeLessThanOrEqual(COLLECT_MAX);
        expect(nairaTotal(c), `seed ${seed} step ${step}: money made or lost`).toBe(made);
        if (c.boom >= mark) {
          mark = nextBoom(c.boom);
          boomCollectSinceMark = 0;
        }
      }
      expect(boomCollectSinceMark).toBeGreaterThanOrEqual(0);
    }
  });

  it('a board paid twice in a row (a double tap, a reload mid-pay) never takes more than its price', () => {
    let c = addKobo(emptyCity(), 5000);
    const first = payBoard(c, 'road')!;
    c = first.next;
    expect(payBoard(c, 'road')).toBeNull();
    expect(c.kobo).toBe(4000);
    // Read back from the save mid-way: the same.
    expect(payBoard(readCity(writeCity(c)), 'road')).toBeNull();
  });

  it('a tampered save cannot make money: negative, huge, NaN and string amounts start at 0 or are capped', () => {
    const c = readCity({ kobo: -500, power: 'lots', tech: NaN, fixed: [], paid: { potholes: 99999, buka: -3 }, built: ['buka'], trays: { buka: 1e9, market: 50 }, boom: -4, boomCollect: 99 });
    expect(c.kobo).toBe(0);
    expect(c.power).toBe(0);
    expect(c.tech).toBe(0);
    expect(c.paid.potholes).toBe(999);
    expect(c.paid.buka).toBeUndefined();
    expect(c.trays.buka).toBe(PLACES.buka.cap);
    expect(c.trays.market).toBeUndefined(); // the market is not built
    expect(c.boomCollect).toBeLessThanOrEqual(COLLECT_MAX);
    expect(c.boom).toBeGreaterThanOrEqual(0);
  });
});
