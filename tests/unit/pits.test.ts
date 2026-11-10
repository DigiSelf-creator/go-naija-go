/**
 * P2 polish (docs/design.md S2.13 part 4): pothole warning signs, placed from the road spans.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import { parseLevel } from '../../src/game/level';
import { pitKind, pitsOf, potholeSigns, SIGN_BEFORE } from '../../src/game/pits';
import { parseRoom } from '../../src/game/well';

const STREETS = [lagos1, lagos2, lagos3].map((raw) => parseLevel(structuredClone(raw)));

describe('S2.13 part 4: pothole warning signs', () => {
  it('stand at the nine places S2.13 lists', () => {
    expect(STREETS.map((L) => potholeSigns(L))).toEqual([
      [3880, 4930],
      [3480, 5680, 10180],
      [2580, 5180, 6880, 10780],
    ]);
  });

  it.each(STREETS)('$id: every gap 90 u or wider has exactly one sign 120 u before its left lip; no narrower gap has one', (L) => {
    const signs = potholeSigns(L);
    const pits = pitsOf(L.ground);
    for (const p of pits) {
      const here = signs.filter((x) => x === p.a - SIGN_BEFORE);
      expect(here, `gap at ${p.a}, ${p.w} wide`).toHaveLength(p.w >= 90 ? 1 : 0);
    }
    expect(signs).toHaveLength(pits.filter((p) => p.w >= 90).length);
  });

  it('every sign stands on solid road (scenery on the road edge, never over a hole)', () => {
    for (const L of STREETS) {
      for (const x of potholeSigns(L)) expect(L.ground.some(([a, b]) => x - 2 >= a && x + 2 <= b), `${L.id} sign at ${x}`).toBe(true);
    }
  });

  it('no sign stands in the hall or the well room', () => {
    expect(potholeSigns(parseLevel(structuredClone(lagosHall)))).toEqual([]);
    const room = parseRoom(structuredClone(lagosWell));
    expect(potholeSigns({ ground: room.terrain.ground.map((s) => [s.x0, s.x1] as const), hall: null })).toEqual([]);
  });

  it('pit kinds: tap and hold potholes small, 90 to 110 u wide, 160 u and up big', () => {
    expect(pitKind({ a: 0, b: 40, w: 40 })).toBe('small');
    expect(pitKind({ a: 0, b: 64, w: 64 })).toBe('small');
    expect(pitKind({ a: 0, b: 90, w: 90 })).toBe('wide');
    expect(pitKind({ a: 0, b: 110, w: 110 })).toBe('wide');
    expect(pitKind({ a: 0, b: 170, w: 170 })).toBe('big');
  });
});
