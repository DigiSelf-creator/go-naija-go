/**
 * H2: the player moves the hero (docs/design.md S2.2). Walk, run timer, run, stop, turn,
 * air steering, and how far each kind of jump goes. All slice 1 jump numbers stay.
 */
import { describe, expect, it } from 'vitest';
import { accumulate } from '../../src/engine/loop';
import { createWalker, halt, press, release, steer, step, type Body, type Gait, type Terrain } from '../../src/engine/physics';

const DT = 1 / 60;
const FLAT: Terrain = { groundY: 300, ground: [{ x0: -10000, x1: 10000 }], platforms: [], fallY: 420 };
const WALK: Gait = { walk: 90, run: 156 };
const CORN: Gait = { walk: 120, run: 228 };

function hero(gait: Gait = WALK, terrain: Terrain = FLAT, x = 0): Body {
  return createWalker(x, terrain, gait);
}

/** Steps until the feet touch down again (or `max` steps). */
function untilLanded(b: Body, terrain: Terrain, onStep?: (b: Body) => void, max = 600): void {
  for (let i = 0; i < max && !b.fallen; i++) {
    step(b, terrain, DT);
    onStep?.(b);
    if (b.grounded) return;
  }
}

type Plan = 'tap' | 'hold' | 'holdAir';

/** One jump with forward held all the way; returns ground covered from take-off. */
function jumpDistance(b: Body, plan: Plan, terrain: Terrain = FLAT): number {
  const x0 = b.x;
  steer(b, 1);
  press(b);
  if (plan === 'tap') release(b);
  let second = plan === 'holdAir';
  untilLanded(b, terrain, (h) => {
    if (h.vy >= 0 && h.down && plan !== 'tap') {
      release(h);
      if (second) {
        press(h); // the second jump at the top, held
        second = false;
      }
    }
  });
  release(b);
  return b.x - x0;
}

/** Holds forward for `secs` from standing. */
function holdForward(b: Body, secs: number, terrain: Terrain = FLAT): void {
  steer(b, 1);
  for (let i = 0; i < Math.round(secs * 60); i++) step(b, terrain, DT);
}

describe('S2.2 speeds on the ground', () => {
  it('stands still until a direction is held (no auto-run)', () => {
    const b = hero();
    for (let i = 0; i < 120; i++) step(b, FLAT, DT);
    expect(b.x).toBe(0);
    expect(b.vx).toBe(0);
  });

  it('walks: 0 to 90 u/s in 0.1 s, and stays at walk speed before 0.5 s', () => {
    const b = hero();
    holdForward(b, 0.1);
    expect(b.vx).toBeCloseTo(90, 5);
    holdForward(b, 0.3);
    expect(b.vx).toBe(90);
  });

  it('runs after holding 0.5 s: 90 to 156 in about 0.22 s, full run about 0.72 s after the press, after about 70 u', () => {
    const b = hero();
    let fullAt = -1;
    steer(b, 1);
    for (let i = 1; i <= 120; i++) {
      step(b, FLAT, DT);
      if (fullAt < 0 && b.vx >= 156) fullAt = i;
    }
    expect(fullAt / 60).toBeGreaterThan(0.7);
    expect(fullAt / 60).toBeLessThan(0.76);
    const c = hero();
    steer(c, 1);
    for (let i = 0; i < fullAt; i++) step(c, FLAT, DT);
    expect(c.x).toBeGreaterThan(62);
    expect(c.x).toBeLessThan(76);
    expect(b.vx).toBe(156);
  });

  it('corn: walk 120, run 228', () => {
    const b = hero(CORN);
    holdForward(b, 0.3);
    expect(b.vx).toBe(120);
    holdForward(b, 1);
    expect(b.vx).toBe(228);
  });

  it('stops in 0.13 s from a run, sliding about 10 u; from a walk in 0.08 s, about 3 u', () => {
    const b = hero();
    holdForward(b, 1.2);
    expect(b.vx).toBe(156);
    steer(b, 0);
    const x0 = b.x;
    let n = 0;
    while (b.vx > 0) {
      step(b, FLAT, DT);
      n++;
    }
    expect(n / 60).toBeCloseTo(0.13, 1);
    expect(b.x - x0).toBeGreaterThan(8);
    expect(b.x - x0).toBeLessThan(12);

    const w = hero();
    holdForward(w, 0.3);
    steer(w, 0);
    const w0 = w.x;
    let m = 0;
    while (w.vx > 0) {
      step(w, FLAT, DT);
      m++;
    }
    expect(m / 60).toBeCloseTo(0.08, 1);
    expect(w.x - w0).toBeGreaterThan(2);
    expect(w.x - w0).toBeLessThan(4.5);
  });

  it('turns round through a stop: faces the new way on the first step, skids at 1800, then walks the other way', () => {
    const b = hero();
    holdForward(b, 1.2);
    steer(b, -1);
    step(b, FLAT, DT);
    expect(b.dir).toBe(-1); // facing flips at once
    expect(b.vx).toBeCloseTo(156 - 30, 5); // 1800 u/s² for one step
    let stoppedAt = -1;
    for (let i = 0; i < 20; i++) {
      step(b, FLAT, DT);
      if (stoppedAt < 0 && b.vx <= 0) stoppedAt = i;
    }
    expect(stoppedAt).toBeGreaterThan(0);
    // The run timer started again at the turn, so it is a walk now, not a run.
    expect(b.vx).toBe(-90);
  });

  it('the run timer starts again when the direction is let go or the other one pressed', () => {
    const b = hero();
    holdForward(b, 1);
    expect(b.runTime).toBeGreaterThan(0.9);
    steer(b, 0);
    expect(b.runTime).toBe(0);
    holdForward(b, 0.2);
    expect(b.vx).toBeLessThanOrEqual(90);
    steer(b, -1);
    expect(b.runTime).toBe(0);
  });

  it('a wall or lost life stops dead and starts the run timer again', () => {
    const b = hero();
    holdForward(b, 1);
    halt(b);
    expect(b.vx).toBe(0);
    expect(b.runTime).toBe(0);
  });

  it('landing does not reset the run timer: holding forward through a hop keeps running', () => {
    const b = hero();
    holdForward(b, 1.2);
    jumpDistance(b, 'tap');
    expect(b.runTime).toBeGreaterThan(1.5);
    steer(b, 1);
    step(b, FLAT, DT);
    expect(b.vx).toBe(156);
  });
});

describe('S2.2 in the air', () => {
  it('walking never becomes a run in mid-air; a running jump keeps its speed', () => {
    const w = hero();
    holdForward(w, 0.45);
    press(w);
    for (let i = 0; i < 25; i++) step(w, FLAT, DT); // run timer passes 0.5 s in the air
    expect(w.grounded).toBe(false);
    expect(w.vx).toBe(90);

    const r = hero();
    holdForward(r, 1);
    press(r);
    for (let i = 0; i < 25; i++) step(r, FLAT, DT);
    expect(r.vx).toBe(156);
  });

  it('holding nothing in the air keeps the speed (no air drag)', () => {
    const b = hero();
    holdForward(b, 1);
    press(b);
    steer(b, 0);
    for (let i = 0; i < 20; i++) step(b, FLAT, DT);
    expect(b.vx).toBe(156);
  });

  it('pulling back in the air slows at 600 and can turn round, up to walk speed', () => {
    const b = hero();
    holdForward(b, 1);
    press(b);
    steer(b, -1);
    step(b, FLAT, DT);
    expect(b.vx).toBeCloseTo(146, 5);
    expect(b.dir).toBe(-1);
    for (let i = 0; i < 40 && !b.grounded; i++) step(b, FLAT, DT);
    expect(b.vx).toBeGreaterThanOrEqual(-90);
  });

  it('a jump with no direction held goes straight up', () => {
    const b = hero();
    press(b);
    untilLanded(b, FLAT);
    expect(b.x).toBe(0);
  });

  it('every slice 1 jump number stays: tap 70 u high, full hold 139 u high', () => {
    const peak = (plan: Plan): number => {
      const b = hero();
      let top = 300;
      press(b);
      if (plan === 'tap') release(b);
      untilLanded(b, FLAT, (h) => (top = Math.min(top, h.y)));
      return 300 - top;
    };
    expect(peak('tap')).toBeGreaterThan(67);
    expect(peak('tap')).toBeLessThan(73);
    expect(peak('hold')).toBeGreaterThan(136);
    expect(peak('hold')).toBeLessThan(142);
  });
});

describe('S2.2 how far a jump goes (within 3 u of the table)', () => {
  const table: { name: string; gait: Gait; before: number; want: Record<Plan, number> }[] = [
    { name: 'standing, forward pressed with the jump', gait: WALK, before: 0, want: { tap: 39, hold: 72, holdAir: 126 } },
    { name: 'walking (90)', gait: WALK, before: 0.3, want: { tap: 45, hold: 78, holdAir: 132 } },
    { name: 'running (156)', gait: WALK, before: 1.2, want: { tap: 78, hold: 135, holdAir: 229 } },
    { name: 'corn walk (120)', gait: CORN, before: 0.3, want: { tap: 60, hold: 104, holdAir: 176 } },
    { name: 'corn run (228)', gait: CORN, before: 1.5, want: { tap: 114, hold: 198, holdAir: 334 } },
  ];
  for (const row of table) {
    for (const plan of ['tap', 'hold', 'holdAir'] as const) {
      it(`${row.name}, ${plan}: ${row.want[plan]} u`, () => {
        const b = hero(row.gait);
        holdForward(b, row.before);
        expect(jumpDistance(b, plan)).toBeGreaterThan(row.want[plan] - 3);
        const c = hero(row.gait);
        holdForward(c, row.before);
        expect(jumpDistance(c, plan)).toBeLessThan(row.want[plan] + 3);
      });
    }
  }
});

describe('S2.2 the big pit (170 u)', () => {
  // Road ends at 1000, starts again at 1170: lagos-1's big pit is 5050 to 5220.
  const PIT: Terrain = { groundY: 300, ground: [{ x0: -1000, x1: 1000 }, { x0: 1170, x1: 4000 }], platforms: [], fallY: 420 };

  /** From x, hold forward for `runUp` s, then a full-hold double jump right at the lip. */
  function attempt(runUp: number, startX: number): Body {
    const b = hero(WALK, PIT, startX);
    steer(b, 1);
    for (let i = 0; i < Math.round(runUp * 60); i++) step(b, PIT, DT);
    // Walk on to the lip (still holding forward), then jump on the last step over the road.
    while (b.x + b.vx * DT <= 1000 && !b.fallen) step(b, PIT, DT);
    jumpDistance(b, 'holdAir', PIT);
    return b;
  }

  it('a running double jump clears it', () => {
    const b = attempt(1.2, 1000 - 400);
    expect(b.fallen).toBe(false);
    expect(b.grounded).toBe(true);
    expect(b.x).toBeGreaterThan(1170);
  });

  it('a walking double jump does not', () => {
    const b = attempt(0, 1000 - 30); // 30 u of walk-up: still under 0.5 s, so a walk
    expect(b.fallen).toBe(true);
  });

  it('a standing double jump (forward pressed with the jump) does not', () => {
    const b = hero(WALK, PIT, 999);
    jumpDistance(b, 'holdAir', PIT);
    expect(b.fallen).toBe(true);
  });
});

describe('S2.2 the same at 30 and 60 fps', () => {
  function play(frameMs: number): { x: number; y: number } {
    const b = hero();
    let acc = 0;
    let steps = 0;
    let pressed = false;
    steer(b, 1);
    while (steps < 120) {
      const r = accumulate(acc, frameMs);
      acc = r.acc;
      for (let i = 0; i < r.steps; i++) step(b, FLAT, DT);
      steps += r.steps;
      // Touches arrive between frames: at step 54 (0.9 s) and 72 (1.2 s) at both rates.
      if (!pressed && steps >= 54) {
        press(b);
        pressed = true;
      }
      if (pressed && b.down && steps >= 72) release(b);
    }
    return { x: b.x, y: b.y };
  }
  it('lands on the same spot within 1 u', () => {
    const a = play(1000 / 60);
    const b = play(1000 / 30);
    expect(Math.abs(a.x - b.x)).toBeLessThan(1);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  });
});
