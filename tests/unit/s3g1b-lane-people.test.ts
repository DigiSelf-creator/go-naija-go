/**
 * S3g1b, the lane run's people (docs/design.md "People everywhere" part 7): never in a lane, on a
 * kerb or on the divider; the jogger's rules; a scripted lane run gives the same result with the
 * people on and off.
 */
import { describe, expect, it } from 'vitest';
import laneData from '../../src/data/levels/lagos-lane.json';
import { ROAD } from '../../src/art/lane';
import { LANE_FOLK, LaneJogger, PAVE_EDGE, onPavement, sceneryPeople, slotPerson, type LaneFolkNow } from '../../src/lane/folk';
import { parseLane } from '../../src/lane/level';
import { LaneSim, seeded, type LaneMove } from '../../src/lane/sim';

const L = parseLane(laneData);
const now = (dist: number, t: number, extra: Partial<LaneFolkNow> = {}): LaneFolkNow => ({ dist, gap: 100, offTo: -100, goal: L.goal, atGoal: false, t, still: false, ...extra });

describe('lane people never in a lane (part 7, rule 1)', () => {
  it('the pavements start past the kerb on the right and past the divider on the left', () => {
    expect(PAVE_EDGE.right).toBeCloseTo(ROAD.half + ROAD.kerb);
    expect(PAVE_EDGE.left).toBeCloseTo(-(ROAD.half + ROAD.kerb + ROAD.divider));
    expect(onPavement(0)).toBe(false);
    expect(onPavement(ROAD.half)).toBe(false);
    expect(onPavement(-ROAD.half - ROAD.kerb - 0.5)).toBe(false);
  });
  it('every pavement person, scenery buyer, runner and goal person stands on a pavement', () => {
    for (const side of [-1, 1] as const)
      for (let j = -10; j < 400; j++) {
        const q = slotPerson(side, j);
        if (q) expect(onPavement(q.x), `slot ${side} ${j}`).toBe(true);
      }
    for (let i = 0; i < 200; i++) for (const q of sceneryPeople(i, i * 15, i % 2 ? -1 : 1)) expect(onPavement(q.x)).toBe(true);
    const jog = new LaneJogger();
    for (let k = 0; k < 6000; k++) {
      const n = now(k * 0.2, k / 30);
      jog.step(n, 1 / 30, 0);
      for (const p of jog.people(n)) expect(onPavement(p.x)).toBe(true);
    }
  });
  it('about 2 people per 10 m of pavement a side', () => {
    let n = 0;
    for (let j = 0; j < 200; j++) if (slotPerson(1, j)) n++;
    const per10 = (n / (200 * LANE_FOLK.slot)) * 10;
    expect(per10).toBeGreaterThan(0.8);
    expect(per10).toBeLessThan(1.6);
  });
});

describe('the jogger (part 7)', () => {
  it('never in the first 100 m, at most one at a time, never with the Blackout under 30 m, none with reduced motion', () => {
    const jog = new LaneJogger();
    let seen = 0;
    let was = false;
    for (let k = 0; k < 60 * 120; k++) {
      const dist = k * 0.15;
      const n = now(dist, k / 60);
      jog.step(n, 1 / 60, 0);
      const ps = jog.people(n);
      if (dist < LANE_FOLK.jogFrom) expect(ps).toHaveLength(0);
      if (ps.length && !was) seen++;
      was = ps.length > 0;
      expect(ps.length).toBeLessThanOrEqual(2);
      for (const p of ps) expect(p.d - dist).toBeLessThanOrEqual(LANE_FOLK.jogAhead[1]);
    }
    expect(seen).toBeGreaterThan(3);
    const dark = new LaneJogger();
    for (let k = 0; k < 60 * 60; k++) {
      const n = now(k * 0.15, k / 60, { gap: 20 });
      dark.step(n, 1 / 60, 0);
      expect(dark.people(n)).toHaveLength(0);
    }
    const still = new LaneJogger();
    for (let k = 0; k < 60 * 60; k++) {
      const n = now(k * 0.15, k / 60, { still: true });
      still.step(n, 1 / 60, 0);
      expect(still.people(n)).toHaveLength(0);
    }
  });
});

describe('no change to the lane run (part 11)', () => {
  const run = (people: boolean): string => {
    const sim = new LaneSim(L, { rng: seeded(11) });
    const jog = new LaneJogger();
    const moves: LaneMove[] = ['left', 'jump', 'right', 'slide', 'right', 'left'];
    const out: string[] = [];
    for (let k = 0; k < 60 * 60; k++) {
      if (k % 45 === 0) sim.press(moves[(k / 45) % moves.length]!);
      sim.step(1 / 60);
      if (people) {
        const n = now(sim.dist, k / 60, { gap: sim.gap, goal: sim.level.goal, atGoal: sim.phase === 'goal' });
        jog.step(n, 1 / 60, 0);
        jog.people(n);
        for (let j = 0; j < 20; j++) slotPerson(1, Math.floor(sim.dist / 5) + j);
      }
      if (k % 30 === 0) out.push(`${sim.dist.toFixed(3)},${sim.x.toFixed(3)},${sim.gap.toFixed(3)},${sim.phase}`);
    }
    return JSON.stringify({ out, kobo: sim.kobo, power: sim.power, tech: sim.tech });
  };
  it('the same distance, lane, Blackout, pickups and result with people on and off', () => {
    expect(run(true)).toBe(run(false));
  });
});
