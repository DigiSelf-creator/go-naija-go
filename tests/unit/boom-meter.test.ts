/**
 * S3d1b, the Booming meter you can see (docs/city.md part 5 step (d)): the brightness rules of d3
 * (the d3 table exactly, every order only grows, 20 with the Mast unfixed, a reload), the meter's
 * stretch and steps (d1, d5), the boom that waits for its card (d9) and the step block (d6).
 */
import { describe, expect, it } from 'vitest';
import { CITY_AREAS, CITY_BLOCKS } from '../../src/art/city';
import { TIRED_MIX } from '../../src/art/bright';
import type { BuildId } from '../../src/art/payspot';
import { FIX_SET, STEP_ORDER, boomDue, brightAreas, fixSet, markReached, meterOf, shownBoom, stepBlock } from '../../src/game/boom';
import { addBoom, collectTray, emptyCity, payBoard, readCity, writeCity, type CityState, PLACES, COLLECT_MAX } from '../../src/game/city';

const BLOCKS = CITY_BLOCKS.map((b) => b.id);
const blocks = (c: CityState): string[] => brightAreas(c).filter((a) => BLOCKS.includes(a));
const rich = (c: CityState): CityState => ({ ...c, kobo: 99_900, power: 99, tech: 99 });
const build = (c: CityState, b: BuildId): CityState => {
  const r = payBoard(rich(c), b);
  if (!r || !r.done) throw new Error(`could not build ${b}`);
  return { ...r.next, kobo: 0, power: 0, tech: 0 };
};
/** A full collect from the Mama Put (1 point, at most 4 a boom). */
const fullCollect = (c: CityState): CityState => collectTray({ ...c, trays: { ...c.trays, buka: PLACES.buka.cap } }, 'buka')!.next;

describe('d3: what brightens, and when', () => {
  it('a new save is all tired', () => {
    expect(brightAreas(emptyCity())).toEqual([]);
  });

  it("the first-timer's usual path comes out exactly as the d3 table", () => {
    let c = build(emptyCity(), 'road');
    expect(c.boom).toBe(4);
    expect(blocks(c).sort()).toEqual(['r0c0', 'r1c0', 'r2c0', 'r1c1'].sort());
    c = build(c, 'mamaPut');
    expect(c.boom).toBe(8);
    expect(blocks(c)).toHaveLength(6);
    expect(brightAreas(c)).toEqual(expect.arrayContaining(['r2c2', 'busPark', 'r1c2']));
    c = build(c, 'market');
    expect(c.boom).toBe(12);
    expect(blocks(c)).toHaveLength(8);
    expect(brightAreas(c)).toEqual(expect.arrayContaining(['r2c3', 'shore', 'r0c1']));
    c = fullCollect(fullCollect(c));
    expect(c.boom).toBe(14);
    expect(blocks(c)).toHaveLength(8);
    c = fullCollect(fullCollect(c));
    expect(c.boom).toBe(16);
    expect(blocks(c)).toHaveLength(9);
    expect(brightAreas(c)).toContain('r0c2');
    c = build(c, 'lamps');
    expect(c.boom).toBe(20);
    expect(blocks(c)).toHaveLength(11);
    expect(BLOCKS.filter((b) => !blocks(c).includes(b))).toEqual(['r1c3']);
    c = build(c, 'mast');
    expect(c.boom).toBe(24);
    expect(blocks(c)).toHaveLength(12);
    expect(brightAreas(c)).toEqual([...CITY_AREAS]);
  });

  it('each board brightens its own set at once', () => {
    for (const b of Object.keys(FIX_SET) as BuildId[]) {
      const c = { ...build(emptyCity(), b), boom: 0 };
      expect(brightAreas(c), b).toEqual(CITY_AREAS.filter((a) => FIX_SET[b].includes(a)));
    }
  });

  it('a meter step brightens the first block of the step order that is not bright, never a spot block', () => {
    expect(STEP_ORDER).not.toContain('r1c3');
    expect(STEP_ORDER).not.toContain('r2c1');
    const c = (boom: number, extra: Partial<CityState> = {}): CityState => ({ ...emptyCity(), boom, ...extra });
    expect(brightAreas(c(3))).toEqual([]);
    expect(brightAreas(c(4))).toEqual(['r1c1']);
    expect(brightAreas(c(8))).toEqual(['r1c1', 'r1c2']);
    expect(brightAreas(c(19)).sort()).toEqual(['r1c1', 'r1c2', 'r0c1', 'r0c2'].sort());
    // r1c1 already bright from the Lamps: the step goes on to the next.
    const lit = { ...emptyCity(), fixed: ['lightsOut' as const], boom: 4 };
    expect(brightAreas(lit).sort()).toEqual(['r1c1', 'r1c2', 'r2c1'].sort());
  });

  it('20 points with the Mast unfixed leaves only r1c3 tired; with neither spot fixed both stay tired', () => {
    const c = { ...emptyCity(), fixed: ['potholes' as const, 'lightsOut' as const], boom: 20 };
    expect(CITY_AREAS.filter((a) => !brightAreas(c).includes(a))).toEqual(['r1c3']);
    const d = { ...emptyCity(), boom: 20 };
    expect(CITY_AREAS.filter((a) => !brightAreas(d).includes(a)).sort()).toEqual(['r1c3', 'r2c1']);
  });

  it('every order of the five boards and the collects gives a bright set that only grows', () => {
    const boards: BuildId[] = ['road', 'mamaPut', 'market', 'lamps', 'mast'];
    let seed = 7;
    const rand = (n: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let run = 0; run < 400; run++) {
      const left = [...boards];
      let c = emptyCity();
      let was = new Set<string>();
      let collects = 0;
      while (left.length || collects < 8) {
        if (left.length && (collects >= 8 || rand(3) > 0)) c = build(c, left.splice(rand(left.length), 1)[0]!);
        else {
          c = fullCollect(c);
          collects++;
        }
        const now = new Set(brightAreas(c));
        for (const a of was) expect(now.has(a), `${a} went dark (run ${run})`).toBe(true);
        expect(c.boomCollect).toBeLessThanOrEqual(COLLECT_MAX);
        was = now;
      }
      expect(brightAreas(c)).toEqual([...CITY_AREAS]);
    }
  });

  it('a reload gives the same bright set (nothing is saved for it)', () => {
    let c = build(build(emptyCity(), 'road'), 'mamaPut');
    c = fullCollect(c);
    const saved = writeCity(c);
    expect(Object.keys(saved)).not.toContain('bright');
    expect(brightAreas(readCity(JSON.parse(JSON.stringify(saved))))).toEqual(brightAreas(c));
  });

  it('the tired look strength is one constant (30% toward the sand)', () => {
    expect(TIRED_MIX).toBe(0.3);
  });
});

describe('d1, d5: the meter', () => {
  it('reads "9 of 20" in steps of 4; after the boom "24 of 50" in steps of 6; then 8 and 10 a step', () => {
    expect(meterOf(9)).toEqual({ points: 9, prev: 0, next: 20, per: 4, filled: 9, step: 2 });
    expect(meterOf(24)).toEqual({ points: 24, prev: 20, next: 50, per: 6, filled: 4, step: 0 });
    expect(meterOf(50)).toMatchObject({ prev: 50, next: 90, per: 8, filled: 0 });
    expect(meterOf(100)).toMatchObject({ prev: 90, next: 140, per: 10, filled: 10, step: 1 });
    expect(meterOf(0)).toMatchObject({ points: 0, next: 20, filled: 0 });
    expect(meterOf(-3)).toMatchObject({ points: 0, filled: 0 });
  });

  it('a boom whose card has not shown keeps the bar full at its mark: "20 of 20"', () => {
    expect(meterOf(20, 0)).toEqual({ points: 20, prev: 0, next: 20, per: 4, filled: 20, step: 5 });
    expect(meterOf(24, 0)).toMatchObject({ points: 20, next: 20, step: 5 });
    expect(meterOf(24, 20)).toMatchObject({ points: 24, next: 50 });
  });

  it('fills 4 for a fix or build, 1 for a full collect (at most 4 a boom), and never goes down', () => {
    let c = build(emptyCity(), 'road');
    expect(c.boom).toBe(4);
    for (let i = 0; i < 6; i++) c = fullCollect(c);
    expect(c.boom).toBe(8);
    c = addBoom(c, -0);
    expect(c.boom).toBe(8);
  });
});

describe('d6, d9: booms and steps', () => {
  it('a boom is due once the meter passes a mark above boomSeen; it stays due over a reload until its card shows', () => {
    expect(markReached(19)).toBe(0);
    expect(markReached(20)).toBe(20);
    expect(markReached(55)).toBe(50);
    const c = { ...emptyCity(), boom: 20 };
    expect(boomDue(c)).toBe(20);
    expect(boomDue(readCity(writeCity(c)))).toBe(20);
    const seen = { ...c, boomSeen: 20 };
    expect(boomDue(seen)).toBe(0);
    expect(readCity(writeCity(seen)).boomSeen).toBe(20);
    expect(boomDue({ ...seen, boom: 50 })).toBe(50);
  });

  it('boomSeen reads leniently and is left out of the save until a card has shown', () => {
    expect(readCity({}).boomSeen).toBe(0);
    expect(readCity({ boomSeen: 'x' }).boomSeen).toBe(0);
    expect(readCity({ boomSeen: -4 }).boomSeen).toBe(0);
    expect(writeCity(emptyCity())).not.toHaveProperty('boomSeen');
  });

  it('until its boom plays, the city is drawn as just before the mark (no flats, two spots still tired)', () => {
    const c = { ...build(build(build(emptyCity(), 'road'), 'mamaPut'), 'market'), boom: 20 };
    expect(shownBoom(c)).toEqual({ bright: brightAreas({ ...c, boom: 19 }), boom: false });
    expect(shownBoom({ ...c, boomSeen: 20 })).toEqual({ bright: brightAreas(c), boom: true });
  });

  it('the step block: the block a step brightened, not a fix block', () => {
    const a = emptyCity();
    const b = build(a, 'road');
    expect(stepBlock(a, b)).toBe('r1c1');
    const c = build(b, 'mamaPut');
    expect(stepBlock(b, c)).toBe('r1c2');
    expect(stepBlock(c, fullCollect(c))).toBeNull();
    // The lamps at 16 reach the boom: no step (20 is the mark).
    const d = { ...emptyCity(), fixed: ['potholes' as const], built: ['buka' as const, 'market' as const], boom: 16 };
    expect(stepBlock(d, build(d, 'lamps'))).toBeNull();
    expect(fixSet(build(d, 'lamps'))).toContain('r2c1');
  });
});
