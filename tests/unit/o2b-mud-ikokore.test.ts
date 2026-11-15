/**
 * O2b: mud and ikokore on Ogun's streets (docs/ogun.md 3.3, 3.4, 3.8 and 4.1), the rules only (Run).
 * - Mud: top speed is walk speed (90; 120 with corn); the run timer goes back to 0 on leaving the
 *   mud, so a run builds again; jumps work as normal; mud never hurts.
 * - Ikokore: mud does not slow you for 12 s; it warns, ticks and ends as the Lagos foods do.
 * - The level parser reads `mud`, `arch` and the "ikokore" food; the arch's welcome shows once.
 */
import { describe, expect, it } from 'vitest';
import ogun1 from '../../src/data/levels/ogun-1.json';
import { GAIT, PHYSICS } from '../../src/engine/physics';
import { LevelError, parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;

/** A plain player-moved street: long road, one mud patch at 600 to 760, no hazards. */
function street(patch: Record<string, unknown> = {}): Level {
  const base = structuredClone(ogun1) as Record<string, unknown>;
  return parseLevel({
    ...base,
    id: 'mud-test',
    ground: [[-400, 20000]],
    platforms: [],
    mud: [[600, 160]],
    kobo: [],
    foods: [],
    crates: [],
    hazards: [],
    hints: [],
    checkpoint: 15000,
    end: { x: 19000, wall: 19200 },
    ...patch,
  });
}

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Holds forward until the hero reaches x (or `max` steps); returns the events. */
function walkTo(run: Run, x: number, max = 4000): RunEvent[] {
  run.steer(1);
  const out: RunEvent[] = [];
  for (let i = 0; i < max && run.hero.x < x && run.phase === 'run'; i++) out.push(...run.step(DT));
  return out;
}

/** Fastest speed seen while the hero's feet are in the mud (after `settle` steps in it). */
function speedInMud(run: Run, settle = 20): number {
  let n = 0;
  let top = 0;
  run.steer(1);
  for (let i = 0; i < 2000 && run.hero.x < 780; i++) {
    run.step(DT);
    if (run.inMud) {
      n++;
      if (n > settle) top = Math.max(top, run.hero.speed);
    }
  }
  return top;
}

describe('the level file reads mud, the arch and ikokore (ogun.md 3.8)', () => {
  it('Ota: six mud patches in order, the arch at 200, ikokore on the road at 5700', () => {
    const L = parseLevel(structuredClone(ogun1));
    expect(L.mud).toEqual([
      { x: 2100, w: 120 },
      { x: 2600, w: 160 },
      { x: 4700, w: 120 },
      { x: 5900, w: 200 },
      { x: 6550, w: 160 },
      { x: 8700, w: 120 },
    ]);
    expect(L.arch).toBe(200);
    expect(L.foods.find((f) => f.kind === 'ikokore')).toEqual({ x: 5700, y: 272, kind: 'ikokore' });
  });

  it('a street with no mud or arch reads as none', () => {
    const raw = structuredClone(ogun1) as Record<string, unknown>;
    delete raw['mud'];
    delete raw['arch'];
    const L = parseLevel({ ...raw, foods: [] });
    expect(L.mud).toEqual([]);
    expect(L.arch).toBeNull();
  });

  it('mud 80 to 200 wide only; a bad patch gives a clear message', () => {
    expect(() => street({ mud: [[600, 60]] })).toThrow(LevelError);
    expect(() => street({ mud: [[600, 220]] })).toThrow(/mud\[0\]\[1\] should be 80 to 200 wide/);
    expect(() => street({ mud: [[600]] })).toThrow(/mud\[0\] should have 2 items/);
    expect(() => street({ arch: 'x' })).toThrow(/arch should be a number/);
    expect(() => street({ foods: [[900, 272, 'ofada']] })).toThrow(/foods\[0\]\[2\] should be one of/);
    expect(street({ mud: [[900, 80], [600, 200]] }).mud.map((m) => m.x)).toEqual([600, 900]);
  });
});

describe('mud (ogun.md 3.3)', () => {
  it('running in: the top speed drops to walk speed (90) and the run timer stays at 0', () => {
    const run = new Run(street());
    walkTo(run, 590);
    expect(run.hero.speed).toBeCloseTo(PHYSICS.runSpeed, 5); // running at 156 before it
    const top = speedInMud(run);
    expect(top).toBeLessThanOrEqual(GAIT.walk + 1e-9);
    expect(top).toBeCloseTo(90, 5);
  });

  it('slows within a short way (never a wall): 156 to 90 at the stop deceleration', () => {
    const run = new Run(street());
    walkTo(run, 600);
    let at = -1;
    for (let i = 0; i < 200 && at < 0; i++) {
      run.step(DT);
      if (run.hero.speed <= GAIT.walk + 1e-9) at = run.hero.x;
    }
    // (156 - 90) / 1200 s at about 123 u/s: about 7 u into the mud.
    expect(at - 600).toBeGreaterThan(0);
    expect(at - 600).toBeLessThan(15);
  });

  it('with roasted corn the top in mud is the corn walk speed (120)', () => {
    const run = new Run(street({ foods: [[200, 272, 'corn']] }));
    walkTo(run, 590);
    expect(run.power.corn).toBeGreaterThan(0);
    expect(speedInMud(run)).toBeCloseTo(120, 5);
  });

  it('the run timer starts again on leaving the mud: walk speed for 0.5 s, then a run builds', () => {
    const run = new Run(street());
    walkTo(run, 761);
    expect(run.inMud).toBe(false);
    expect(run.hero.runTime).toBeLessThan(0.05);
    const x0 = run.hero.x;
    steps(run, Math.round(0.4 * STEPS_PER_SECOND));
    expect(run.hero.speed).toBeLessThanOrEqual(GAIT.walk + 1e-9); // still walking
    steps(run, Math.round(1.0 * STEPS_PER_SECOND));
    expect(run.hero.speed).toBeGreaterThan(GAIT.walk + 20); // running again
    expect(run.hero.x).toBeGreaterThan(x0);
  });

  it('a jump out of the mud: walk speed in the air, and the run timer starts at 0 on landing', () => {
    const run = new Run(street());
    walkTo(run, 735);
    expect(run.inMud).toBe(true);
    expect(run.press()).toBe('ground');
    run.release();
    let landed = false;
    let airTop = 0;
    for (let i = 0; i < 200 && !landed; i++) {
      run.step(DT);
      if (!run.hero.grounded) airTop = Math.max(airTop, run.hero.speed);
      landed = run.hero.grounded && i > 3;
    }
    expect(airTop).toBeCloseTo(GAIT.walk, 5);
    expect(run.hero.x).toBeGreaterThan(760); // out of the mud
    expect(run.hero.runTime).toBeLessThan(0.05);
  });

  it('jumps work as normal from mud: the same height as from the road', () => {
    const peak = (x: number): number => {
      const run = new Run(street());
      walkTo(run, x);
      run.steer(0);
      steps(run, 30);
      const y0 = run.hero.y;
      run.press();
      let top = y0;
      for (let i = 0; i < 120; i++) {
        run.step(DT);
        top = Math.min(top, run.hero.y);
      }
      return y0 - top;
    };
    expect(peak(680)).toBeCloseTo(peak(300), 5);
  });

  it('jumping over the mud keeps the run: nothing slows the hero in the air', () => {
    const run = new Run(street());
    walkTo(run, 560);
    run.press();
    let low = Infinity;
    for (let i = 0; i < 60 && !(run.hero.grounded && i > 3); i++) {
      run.step(DT);
      if (!run.hero.grounded) low = Math.min(low, run.hero.speed);
    }
    expect(low).toBeCloseTo(PHYSICS.runSpeed, 5);
  });

  it('mud never hurts: walking through every patch on Ota keeps all lives', () => {
    const L = parseLevel(structuredClone(ogun1));
    const run = new Run({ ...L, hazards: [] });
    for (const m of L.mud) {
      run.hero.x = m.x - 30;
      run.hero.vx = 0;
      walkTo(run, m.x + m.w + 5, 1000);
      expect(run.lives).toBe(RULES.lives);
    }
  });

  it('no dash in mud: a dash ends as the feet go in, and none starts there', () => {
    const run = new Run(street(), { dash: true });
    walkTo(run, 500);
    expect(run.dash(1)).toBe(true);
    walkTo(run, 640);
    expect(run.dashing).toBe(false);
    expect(run.hero.speed).toBeLessThanOrEqual(GAIT.walk + 1e-9);
    steps(run, Math.round(2.2 * STEPS_PER_SECOND)); // the rest after a dash passes
    expect(run.inMud || run.hero.x > 760).toBe(true);
    const fresh = new Run(street(), { dash: true });
    walkTo(fresh, 650);
    expect(fresh.inMud).toBe(true);
    expect(fresh.dash(1)).toBe(false);
  });

  it('a roof over the mud is firm: standing on it is not mud', () => {
    const run = new Run(street({ platforms: [[580, 260, 200]] }));
    run.hero.x = 620;
    run.hero.y = 200;
    run.hero.grounded = false;
    steps(run, 40);
    expect(run.hero.on).not.toBeNull();
    expect(run.mudAt(run.hero.x)).toBe(true);
    expect(run.inMud).toBe(false);
  });
});

describe('ikokore (ogun.md 4.1): mud does not slow you for 12 s', () => {
  const withIko = (patch: Record<string, unknown> = {}) => street({ foods: [[300, 272, 'ikokore']], ...patch });

  it('picked up: 12 s of firm feet, a food event, and the run goes through mud at full speed', () => {
    const run = new Run(withIko());
    const ev = walkTo(run, 590);
    expect(ev.filter((e) => e.type === 'food')).toEqual([{ type: 'food', kind: 'ikokore', x: 300, y: 272 }]);
    expect(run.power.ikokore).toBeGreaterThan(RULES.ikokoreSteps - 3 * STEPS_PER_SECOND);
    expect(RULES.ikokoreSteps).toBe(12 * STEPS_PER_SECOND);
    expect(run.inMud).toBe(false);
    const top = speedInMud(run, 0);
    expect(top).toBeCloseTo(PHYSICS.runSpeed, 5);
    expect(run.slowed).toBe(false);
  });

  it('it wears off: "wearing off" at 2 s left with a tick each second, then it ends, and mud slows again', () => {
    const run = new Run(withIko({ mud: [[4000, 160]] }));
    const ev = walkTo(run, 3990, 6000);
    const types = ev.map((e) => e.type);
    expect(types).toContain('food');
    const warn = ev.findIndex((e) => e.type === 'wearingOff' && e.kind === 'ikokore');
    const end = ev.findIndex((e) => e.type === 'powerEnd' && e.kind === 'ikokore');
    expect(warn).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(warn);
    // A tick at 2 s and at 1 s left, as corn and amala.
    expect(ev.slice(warn, end).filter((e) => e.type === 'tick')).toHaveLength(2);
    expect(run.power.ikokore).toBe(0);
    expect(speedInMudFrom(run, 4000)).toBeCloseTo(GAIT.walk, 5);
  });

  it('picked up in the mud: the run builds there and is not cut on leaving it', () => {
    const run = new Run(street({ mud: [[500, 200]], foods: [[620, 272, 'ikokore']] }));
    walkTo(run, 590);
    expect(run.slowed).toBe(true);
    walkTo(run, 698);
    expect(run.power.ikokore).toBeGreaterThan(0);
    walkTo(run, 760);
    expect(run.hero.speed).toBeGreaterThan(GAIT.walk + 20);
  });

  it('runs out while in the mud: slowed from that step on', () => {
    const run = new Run(withIko({ mud: [[500, 200]] }));
    walkTo(run, 560);
    expect(run.hero.speed).toBeCloseTo(PHYSICS.runSpeed, 5);
    run.power.ikokore = 1;
    steps(run, 30);
    expect(run.power.ikokore).toBe(0);
    expect(run.inMud).toBe(true);
    expect(run.hero.speed).toBeLessThanOrEqual(GAIT.walk + 1e-9);
  });

  it('the same food again restarts the timer; ikokore and corn work together', () => {
    const run = new Run(withIko({ foods: [[300, 272, 'ikokore'], [1300, 272, 'ikokore'], [1400, 272, 'corn']], mud: [[1600, 160]] }));
    walkTo(run, 1250);
    const before = run.power.ikokore;
    walkTo(run, 1410);
    expect(run.power.ikokore).toBeGreaterThan(before);
    expect(run.power.corn).toBeGreaterThan(0);
    walkTo(run, 1700);
    expect(run.inMud).toBe(true);
    expect(run.hero.speed).toBeGreaterThan(PHYSICS.runSpeed + 30); // corn's run, not slowed
  });

  it('a lost life ends it (as every food); game over too', () => {
    const run = new Run(withIko({ ground: [[-400, 1000], [1200, 20000]] }));
    walkTo(run, 500);
    expect(run.power.ikokore).toBeGreaterThan(0);
    run.steer(1);
    let fell = false;
    for (let i = 0; i < 2000 && !fell; i++) fell = run.step(DT).some((e) => e.type === 'fall');
    expect(fell).toBe(true);
    expect(run.power).toEqual({ corn: 0, amala: 0, ikokore: 0, shield: false });
    // Back at the start, it is there to pick up again.
    expect(run.foods[0]!.taken).toBe(false);
  });

  it('in Gentle mode it is the same food (Lagos foods have no Gentle rule either)', () => {
    const run = new Run(withIko(), { gentle: true });
    const ev = walkTo(run, 400);
    const at = ev.findIndex((e) => e.type === 'food');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(run.power.ikokore).toBeGreaterThan(RULES.ikokoreSteps - STEPS_PER_SECOND);
    expect(speedInMud(run, 0)).toBeCloseTo(PHYSICS.runSpeed, 5);
  });
});

describe('the gateway arch (ogun.md 1.4)', () => {
  it('passing under it says welcome, once a play (not again after a fall)', () => {
    const run = new Run(street({ arch: 200, ground: [[-400, 1000], [1200, 20000]] }));
    const first = walkTo(run, 300);
    expect(first.filter((e) => e.type === 'arch')).toHaveLength(1);
    const after = walkTo(run, 1300);
    expect(after.some((e) => e.type === 'fall')).toBe(true);
    expect(walkTo(run, 400).filter((e) => e.type === 'arch')).toHaveLength(0);
  });

  it('a street with no arch never says it', () => {
    const run = new Run(street({ arch: undefined }));
    expect(walkTo(run, 2000).some((e) => e.type === 'arch')).toBe(false);
  });
});

/** Top speed in the mud patch that starts at x0, walking in from where the hero is. */
function speedInMudFrom(run: Run, x0: number): number {
  run.steer(1);
  let top = 0;
  let n = 0;
  for (let i = 0; i < 3000 && run.hero.x < x0 + 150; i++) {
    run.step(DT);
    if (run.inMud && ++n > 20) top = Math.max(top, run.hero.speed);
  }
  return top;
}
