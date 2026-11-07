/**
 * H4: the schema 2 street loader and the street rules for a player-moved hero
 * (docs/design.md S2.2, S2.6), with lagos-1 checked against the S2.6 level rules.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import { LevelError, parseLevel, type Level } from '../../src/game/level';
import { RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { hintWords } from '../../src/screens/words';
import { BUS_END, busEndAt } from '../../src/art/roadside';

const DT = 1 / 60;
const L1 = parseLevel(structuredClone(lagos1));

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** A run placed at x on the road, standing. */
function at(level: Level, x: number): Run {
  const run = new Run(level);
  Object.assign(run.hero, { x });
  return run;
}

describe('schema 2 loader', () => {
  it('reads lagos-1 with every new field', () => {
    expect(L1).toMatchObject({ id: 'lagos-1', schema: 2, manual: true, theme: 'morning', walkSpeed: 90, runSpeed: 156, cornWalkSpeed: 120, cornSpeed: 228, startWall: 20 });
    expect(L1.end).toEqual({ x: 10600, wall: 10800 });
    expect(L1.arena).toBeNull();
    expect(L1.boss).toBeNull();
    expect(L1.crates).toHaveLength(4);
    expect(L1.crates[2]).toEqual({ x: 6500, bottomY: 204, contents: 'garri' });
    expect(L1.wells).toEqual([]);
    expect(L1.hazardSpeeds).toEqual({ goat: 36, tyre: 60, drum: 84 });
  });

  it('accepts streets 2 and 3: wells, drums and roof crates', () => {
    const l2 = parseLevel(structuredClone(lagos2));
    const l3 = parseLevel(structuredClone(lagos3));
    expect(l2.wells.length).toBeGreaterThan(0);
    expect(l3.hazards.some((z) => z.kind === 'drum')).toBe(true);
  });

  it('says clearly that rooms and halls are not played yet', () => {
    expect(() => parseLevel(structuredClone(lagosWell))).toThrow(LevelError);
    expect(() => parseLevel(structuredClone(lagosHall))).toThrow(/not played yet/);
  });

  it('gives a clear message for a broken street', () => {
    const bad = structuredClone(lagos1) as Record<string, unknown>;
    bad['crates'] = [[2000, 204, 'chocolate']];
    expect(() => parseLevel(bad)).toThrow('Level lagos-1: crates[0][2] should be one of kobo, corn, garri, amala');
    const noEnd = structuredClone(lagos1) as Record<string, unknown>;
    delete noEnd['end'];
    expect(() => parseLevel(noEnd)).toThrow('end should be an object');
  });
});

describe('S2.2 street rules', () => {
  it('no auto-run: the hero waits at the spawn until moved', () => {
    const run = new Run(L1);
    steps(run, 300);
    expect(run.hero.x).toBe(80);
    expect(run.hero.manual).toBe(true);
  });

  it('the start fence and the end wall stop the hero (7 u inside) and reset the run timer', () => {
    const run = new Run(L1);
    run.steer(-1);
    steps(run, 120);
    expect(run.hero.x).toBe(27);
    expect(run.hero.vx).toBe(0);
    expect(run.hero.runTime).toBe(0);
  });

  it('the first hint (at the spawn) shows 0.5 s after the start, with words for touch or keys', () => {
    const run = new Run(L1);
    const before = steps(run, RULES.firstHintSteps - 1);
    expect(before.filter((e) => e.type === 'hint')).toEqual([]);
    const ev = steps(run, 1).filter((e) => e.type === 'hint');
    expect(ev).toEqual([{ type: 'hint', words: 'Hold {forward} to walk. Keep holding to run.' }]);
    expect(hintWords('Hold {forward} to walk. Keep holding to run.', 'touch')).toBe('Hold the forward arrow to walk. Keep holding to run.');
    expect(hintWords('Press {jump} again, {back}, {down}', 'keys')).toBe('Press Space again, the left arrow, the down arrow');
  });

  it('hazards wake at the larger of wakeDistance and the road shown ahead + 40', () => {
    const run = at(L1, 5000);
    run.viewLeft = 4800;
    run.viewRight = 5000 + 650; // 650 u shown ahead: wakes at 690, not 520
    steps(run, 1);
    const goat = run.hazards.find((z) => z.x0 === 5700)!;
    expect(goat.mode).toBe('wait'); // 700 ahead, wakes at 690
    run.viewRight = 5000 + 665; // now wakes at 705
    steps(run, 1);
    expect(goat.mode).toBe('move');
  });

  it('a woken hazard more than 200 u off either edge of the screen is gone for good this play', () => {
    const run = at(L1, 5600);
    run.viewLeft = 5400;
    run.viewRight = 6100;
    steps(run, 1);
    const goat = run.hazards.find((z) => z.x0 === 5700)!;
    expect(goat.mode).toBe('move');
    // The hero walks back a long way: the goat is left far off the right edge.
    run.viewLeft = 4000;
    run.viewRight = 4700;
    run.hero.x = 4200;
    steps(run, 1);
    expect(goat.mode).toBe('gone');
    run.viewLeft = 5400;
    run.viewRight = 6100;
    run.hero.x = 5600;
    steps(run, 30);
    expect(goat.mode).toBe('gone');
  });

  it('after a lost life: at the bus stop, facing right, standing still, run timer at 0', () => {
    const run = at(L1, 5000);
    run.checkpointReached = true;
    run.spawnX = L1.checkpoint;
    run.steer(1);
    let ev: RunEvent[] = [];
    for (let i = 0; i < 600 && !ev.some((e) => e.type === 'fall'); i++) ev = run.step(DT);
    expect(ev.map((e) => e.type)).toContain('fall');
    expect(run.hero).toMatchObject({ x: 4400, vx: 0, dir: 1, runTime: 0, grounded: true });
    expect(run.lives).toBe(2);
  });

  it('the street end: reaching the bus door on the ground locks the controls, fades hazards, hides the hero, clears at 2.2 s', () => {
    const run = at(L1, 10580);
    run.steer(1);
    let ev: RunEvent[] = [];
    for (let i = 0; i < 60 && run.phase === 'run'; i++) ev = run.step(DT);
    expect(ev).toContainEqual({ type: 'busBoard' });
    expect(run.phase).toBe('bus');
    expect(run.press()).toBeNull();
    run.steer(-1);
    expect(run.hero.move).toBe(0);
    steps(run, RULES.fadeSteps);
    expect(run.hazardFade).toBe(1);
    const inAt = RULES.doorSteps + RULES.hopSteps;
    const hop = steps(run, inAt - 1 - RULES.fadeSteps);
    expect(run.boarded).toBe(false);
    expect(hop.map((e) => e.type)).not.toContain('busGo');
    expect(steps(run, 1)).toContainEqual({ type: 'busGo' });
    expect(run.boarded).toBe(true);
    const rest = steps(run, RULES.clearedSteps - inAt);
    expect(rest).toContainEqual({ type: 'streetCleared' });
    expect(run.phase).toBe('cleared');
    expect(run.busGone).toBeGreaterThan(200);
  });

  it('the street end keeps art\'s bus timing: door, hop, pull-away, cleared (busEndAt)', () => {
    expect(RULES.doorSteps / STEPS_PER_SECOND).toBeCloseTo(BUS_END.doorOpen, 6);
    expect((RULES.doorSteps + RULES.hopSteps) / STEPS_PER_SECOND).toBeCloseTo(BUS_END.hopEnd, 6);
    expect(RULES.clearedSteps / STEPS_PER_SECOND).toBeCloseTo(BUS_END.pullAway, 6);
    const run = at(L1, 10590);
    run.steer(1);
    for (let i = 0; i < 60 && run.phase === 'run'; i++) run.step(DT);
    expect(run.phase).toBe('bus');
    const end = L1.end!;
    let hopTop = 0;
    for (let n = 1; n <= RULES.clearedSteps; n++) {
      run.step(DT);
      const f = busEndAt(run.endSteps / STEPS_PER_SECOND);
      // The bus the player sees and the bus the rules move are the same bus.
      expect(run.busGone).toBeCloseTo(f.dx ?? 0, 6);
      expect(run.boarded).toBe(!f.heroShown);
      // The hero waits while the door opens, then hops in through it.
      if (run.endSteps <= RULES.doorSteps) expect(run.hero.grounded).toBe(true);
      hopTop = Math.max(hopTop, L1.groundY - run.hero.y);
    }
    expect(hopTop).toBeGreaterThan(10);
    expect(run.hero.x).toBeCloseTo(end.x + 10, 6);
  });

  it('a jump that lands past the bus door also ends the street', () => {
    const run = at(L1, 10520);
    run.steer(1);
    steps(run, 30);
    run.press();
    for (let i = 0; i < 120 && run.phase === 'run'; i++) run.step(DT);
    expect(run.phase).toBe('bus');
  });

  it('the hold for higher belongs to the press that started the jump', () => {
    const run = at(L1, 600);
    run.press('a');
    run.release('b'); // another finger lifting: the hold goes on
    expect(run.hero.down).toBe(true);
    run.release('a');
    expect(run.hero.down).toBe(false);
  });
});

describe('S2.2 the big pit in street 1 (5050 to 5220), from the bus stop', () => {
  function tryIt(runUpFrom: number, holdForward: boolean): Run {
    const run = at(L1, runUpFrom);
    run.checkpointReached = true;
    run.spawnX = L1.checkpoint;
    if (holdForward) run.steer(1);
    // Hold forward until the lip, then a full-hold jump and a held second jump at the top.
    if (!holdForward) {
      run.steer(1);
    }
    while (run.hero.x + run.hero.vx * DT <= 5050) run.step(DT);
    run.press();
    let second = true;
    const lives = run.lives;
    for (let i = 0; i < 200 && run.lives === lives; i++) {
      run.step(DT);
      if (run.hero.vy >= 0 && run.hero.down) {
        run.release();
        if (second) {
          run.press();
          second = false;
        }
      }
      if (run.hero.grounded) break;
    }
    return run;
  }
  it('a running double jump clears it', () => {
    const run = tryIt(4400, true);
    expect(run.lives).toBe(3);
    expect(run.hero.x).toBeGreaterThan(5220);
  });
  it('a walking double jump does not', () => {
    const run = tryIt(5010, true); // 40 u of walk: never reaches the run
    expect(run.lives).toBe(2);
  });
});

describe('S2.6 level rules: lagos-1', () => {
  const pits = L1.ground.slice(1).map((s, i) => ({ a: L1.ground[i]![1], b: s[0], w: s[0] - L1.ground[i]![1] }));
  const onRoad = (x: number): boolean => L1.ground.some(([a, b]) => x >= a && x <= b);
  const nearestPit = (x: number): number => Math.min(...pits.map((p) => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0)));
  const corns = [...L1.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L1.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];

  it('every pit is one of the four kinds', () => {
    for (const p of pits) {
      const ok = (p.w >= 30 && p.w <= 40) || (p.w >= 50 && p.w <= 64) || (p.w >= 90 && p.w <= 110) || (p.w >= 160 && p.w <= 180);
      expect(ok, `pit at ${p.a} is ${p.w} wide`).toBe(true);
    }
    expect(pits.filter((p) => p.w >= 160)).toHaveLength(1); // street 1: one big pit
  });

  it('at least 160 u of clear road before every big pit, and none within 1400 u after a corn', () => {
    for (const p of pits.filter((q) => q.w >= 160)) {
      const from = p.a - 160;
      expect(pits.some((q) => q.b > from && q.a < p.a), 'no pit in the run-up').toBe(false);
      expect(L1.hazards.some((z) => z.x > from && z.x <= p.a)).toBe(false);
      expect(L1.crates.some((c) => c.x > from && c.x <= p.a)).toBe(false);
      expect(L1.foods.some((f) => f.x > from && f.x <= p.a)).toBe(false);
      for (const c of corns) expect(p.a - c < 0 || p.a - c > 1400).toBe(true);
      // The first big pit comes right after the bus stop.
      expect(p.a).toBeGreaterThan(L1.checkpoint);
    }
  });

  it('no tyre or drum within 1370 u after a corn', () => {
    for (const c of corns) {
      for (const z of L1.hazards.filter((q) => q.kind !== 'goat')) expect(z.x - c < 0 || z.x - c > 1370, `${z.kind} at ${z.x}`).toBe(true);
    }
  });

  it('hazards start at least 200 u from a pit', () => {
    for (const z of L1.hazards) expect(nearestPit(z.x), `${z.kind} at ${z.x}`).toBeGreaterThanOrEqual(200);
  });

  it('foods on the road and food crates: at least 300 u from a pit; food crates 200 u from a hazard start', () => {
    for (const f of L1.foods) expect(nearestPit(f.x), `${f.kind} at ${f.x}`).toBeGreaterThanOrEqual(300);
    for (const c of L1.crates.filter((q) => q.contents !== 'kobo')) {
      expect(nearestPit(c.x)).toBeGreaterThanOrEqual(300);
      for (const z of L1.hazards) expect(Math.abs(z.x - c.x)).toBeGreaterThanOrEqual(200);
    }
  });

  it('crates: 96 u above the surface under them, 60 u from pit edges, no other roof near, 64 u apart, no coin inside', () => {
    const roofs = L1.terrain.platforms;
    for (const c of L1.crates) {
      const roof = roofs.find((p) => c.x >= p.x && c.x <= p.x + p.w);
      const surface = roof ? roof.y : L1.groundY;
      expect(surface - c.bottomY, `crate at ${c.x}`).toBe(96);
      expect(onRoad(c.x)).toBe(true);
      expect(nearestPit(c.x)).toBeGreaterThanOrEqual(60);
      for (const p of roofs) if (p !== roof) expect(p.x + p.w < c.x - 40 || p.x > c.x + 40).toBe(true);
      for (const k of L1.coins) expect(k.x >= c.x - 16 && k.x <= c.x + 16 && k.y >= c.bottomY - 28 && k.y <= c.bottomY).toBe(false);
    }
    const xs = L1.crates.map((c) => c.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(64);
  });

  it('hints at least 120 u apart; spawn, bus stop and bus door on solid road; walls in order', () => {
    const hx = L1.hints.map((h) => h.x);
    for (let i = 1; i < hx.length; i++) expect(hx[i]! - hx[i - 1]!).toBeGreaterThanOrEqual(120);
    expect(L1.hints).toHaveLength(15);
    for (const x of [L1.spawnX, L1.checkpoint, L1.end!.x]) expect(onRoad(x), `x ${x}`).toBe(true);
    expect(L1.startWall + 7).toBeLessThan(L1.spawnX);
    expect(L1.end!.wall).toBeGreaterThan(L1.end!.x);
    for (const h of L1.hints) expect(h.words).not.toMatch(/\{(?!forward|back|jump|down)\w*\}/);
  });
});
