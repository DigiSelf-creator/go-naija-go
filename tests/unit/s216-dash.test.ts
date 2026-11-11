/**
 * P16 (docs/design.md S2.16 B4): the dash. Double tap and hold (fingers and keys), the physics
 * (210 u/s, 2.5 s, 2 s rest, the longer jump), where it works, the dash gap pit kind and its
 * level rules, and Gentle mode's cement blocks.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import lagosHall from '../../src/data/levels/lagos-hall.json';
import lagosWell from '../../src/data/levels/lagos-well.json';
import { Controls, DOUBLE_TAP_MS, type Dir, type TouchAreas } from '../../src/engine/input';
import { createWalker, endDash, PHYSICS, press, release, resting, startDash, steer, step, type Body, type Terrain } from '../../src/engine/physics';
import { parseLevel, type Level } from '../../src/game/level';
import { DASH_GAP, gentleBlocks, pitKind, pitsOf, roadSigns, withBlocks } from '../../src/game/pits';
import { climbOutX, RULES, Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { parseRoom } from '../../src/game/well';
import { GENTLE_HINTS, hintWords, WORDS } from '../../src/screens/words';

const DT = 1 / 60;
const FLAT: Terrain = { groundY: 300, ground: [{ x0: -10000, x1: 20000 }], platforms: [], fallY: 420 };
const L1 = parseLevel(structuredClone(lagos1));
const L2 = parseLevel(structuredClone(lagos2));
const L3 = parseLevel(structuredClone(lagos3));
const HALL = parseLevel(structuredClone(lagosHall));
const ROOM = parseRoom(structuredClone(lagosWell));
/** Street 3 with one long flat road and nothing on it. */
const OPEN: Level = {
  ...L3,
  ground: [[-400, 30000]],
  terrain: { ...L3.terrain, ground: [{ x0: -400, x1: 30000 }] },
  hazards: [],
  gutters: [],
  crates: [],
  foods: [],
  end: { x: 29000, wall: 29200 },
};

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Standing walker on flat road, forward held, then a dash. */
function dasher(x = 0, terrain: Terrain = FLAT): Body {
  const b = createWalker(x, terrain);
  steer(b, 1);
  expect(startDash(b, 1)).toBe(true);
  return b;
}

/** Full hold, then a held second jump at the top; forward held. Returns ground covered from take-off. */
function doubleJump(b: Body, terrain: Terrain = FLAT): number {
  const x0 = b.x;
  press(b);
  let second = true;
  for (let i = 0; i < 600 && !b.fallen; i++) {
    step(b, terrain, DT);
    if (b.vy >= 0 && b.down) {
      release(b);
      if (second) {
        press(b);
        second = false;
      }
    }
    if (b.grounded) break;
  }
  release(b);
  return b.x - x0;
}

describe('S2.16 B4 dash physics', () => {
  it('gets up to 210 u/s from a stand in about 0.18 s (about 19 u), and never past 212', () => {
    const b = dasher();
    let n = 0;
    while (b.vx < PHYSICS.dashSpeed && n < 60) {
      step(b, FLAT, DT);
      n++;
    }
    expect(n / 60).toBeCloseTo(0.18, 1);
    expect(b.x).toBeGreaterThan(15);
    expect(b.x).toBeLessThan(23);
    let top = 0;
    for (let i = 0; i < 200; i++) {
      step(b, FLAT, DT);
      top = Math.max(top, b.speed);
    }
    expect(top).toBe(210);
    expect(top).toBeLessThanOrEqual(212);
  });

  it('lasts 2.5 s while held (about 525 u), then eases back to run speed at 300 u/s²; the run timer counts as full', () => {
    const b = dasher();
    let n = 0;
    while (b.dash > 0) {
      step(b, FLAT, DT);
      n++;
    }
    expect(n).toBe(150);
    expect(b.x).toBeGreaterThan(500);
    expect(b.x).toBeLessThan(530);
    expect(b.runTime).toBeGreaterThanOrEqual(PHYSICS.runAfter);
    // Eases: after 0.1 s about 30 u/s slower; after 0.25 s at run speed, and stays there (a run, not a walk).
    for (let i = 0; i < 6; i++) step(b, FLAT, DT);
    expect(b.speed).toBeGreaterThan(175);
    for (let i = 0; i < 20; i++) step(b, FLAT, DT);
    expect(b.speed).toBe(156);
    for (let i = 0; i < 60; i++) step(b, FLAT, DT);
    expect(b.speed).toBe(156);
  });

  it('ends when forward is let go (stops as normal), or the other way is pressed', () => {
    const b = dasher();
    for (let i = 0; i < 40; i++) step(b, FLAT, DT);
    steer(b, 0);
    step(b, FLAT, DT);
    expect(b.dash).toBe(0);
    const x = b.x;
    for (let i = 0; i < 60; i++) step(b, FLAT, DT);
    expect(b.speed).toBe(0);
    expect(b.x - x).toBeLessThan(25); // 1200 u/s²: about 18 u
    const c = dasher();
    for (let i = 0; i < 40; i++) step(c, FLAT, DT);
    steer(c, -1);
    step(c, FLAT, DT);
    expect(c.dash).toBe(0);
  });

  it('a dash jump plus a held second jump lands 308 u from take-off (within 3 u), 1.35 times a run jump', () => {
    const b = dasher();
    for (let i = 0; i < 30; i++) step(b, FLAT, DT);
    expect(b.speed).toBe(210);
    const d = doubleJump(b);
    expect(d).toBeGreaterThan(305);
    expect(d).toBeLessThan(311);
  });

  it('keeps dash speed in the air even when the 2.5 s run out mid-jump; the rest starts at the landing', () => {
    const b = dasher();
    while (b.dash > 20) step(b, FLAT, DT);
    press(b);
    let ended = false;
    while (!b.grounded || !ended) {
      step(b, FLAT, DT);
      if (b.dash === 0 && !b.grounded) {
        ended = true;
        expect(b.speed).toBe(210);
        expect(b.restAtLanding).toBe(true);
        expect(b.rest).toBe(0);
      }
    }
    expect(b.rest).toBe(PHYSICS.dashRestSteps);
  });

  it('the 2 s rest blocks a new dash; then it is ready', () => {
    const b = dasher();
    while (b.dash > 0) step(b, FLAT, DT);
    expect(resting(b)).toBe(true);
    for (let i = 0; i < 114; i++) step(b, FLAT, DT); // 1.9 s
    expect(startDash(b, 1)).toBe(false);
    for (let i = 0; i < 9; i++) step(b, FLAT, DT); // 2.05 s
    expect(resting(b)).toBe(false);
    expect(startDash(b, 1)).toBe(true);
  });

  it('starts only on the ground, a roof or within coyote time; not in the air', () => {
    const b = createWalker(0, FLAT);
    steer(b, 1);
    press(b);
    for (let i = 0; i < 10; i++) step(b, FLAT, DT);
    expect(startDash(b, 1)).toBe(false);
    // Walked off an edge: coyote time still allows it.
    const EDGE: Terrain = { groundY: 300, ground: [{ x0: -1000, x1: 10 }], platforms: [], fallY: 420 };
    const c = createWalker(0, EDGE);
    steer(c, 1);
    while (c.grounded) step(c, EDGE, DT);
    expect(c.coyote).toBeGreaterThan(0);
    expect(startDash(c, 1)).toBe(true);
    endDash(c);
  });
});

describe('S2.16 B4 double tap and hold (fingers and keys)', () => {
  const PHONE: TouchAreas = { width: 727, height: 393, midX: 97, buttons: true };
  const BACK = { x: 52, y: 345 };
  const FWD = { x: 142, y: 345 };
  function rig() {
    let t = 1000;
    const dashes: Dir[] = [];
    const c = new Controls(
      { onJumpPress: () => {}, onJumpRelease: () => {}, onMove: () => {}, onDash: (d) => dashes.push(d) },
      () => PHONE,
      'touch',
      () => t,
    );
    return { c, dashes, wait: (ms: number) => (t += ms) };
  }

  it('tap Forward, lift, press it again within 0.25 s with a new finger: a dash forward', () => {
    const { c, dashes, wait } = rig();
    c.pointerDown(1, FWD.x, FWD.y, true);
    wait(120);
    c.pointerUp(1);
    wait(150);
    c.pointerDown(2, FWD.x, FWD.y, true);
    expect(dashes).toEqual([1]);
    expect(c.dir).toBe(1);
  });

  it('Back the same way dashes back', () => {
    const { c, dashes, wait } = rig();
    c.pointerDown(1, BACK.x, BACK.y, true);
    wait(100);
    c.pointerUp(1);
    wait(100);
    c.pointerDown(2, BACK.x, BACK.y, true);
    expect(dashes).toEqual([-1]);
  });

  it('a single tap, a slow first tap, a late second press or a rock from Back to Forward never dashes', () => {
    const one = rig();
    one.c.pointerDown(1, FWD.x, FWD.y, true);
    one.wait(100);
    one.c.pointerUp(1);
    expect(one.dashes).toEqual([]);

    const slow = rig();
    slow.c.pointerDown(1, FWD.x, FWD.y, true);
    slow.wait(DOUBLE_TAP_MS + 50);
    slow.c.pointerUp(1);
    slow.wait(50);
    slow.c.pointerDown(2, FWD.x, FWD.y, true);
    expect(slow.dashes).toEqual([]);

    const late = rig();
    late.c.pointerDown(1, FWD.x, FWD.y, true);
    late.wait(100);
    late.c.pointerUp(1);
    late.wait(DOUBLE_TAP_MS + 50);
    late.c.pointerDown(2, FWD.x, FWD.y, true);
    expect(late.dashes).toEqual([]);

    const rock = rig();
    rock.c.pointerDown(1, BACK.x, BACK.y, true);
    rock.wait(60);
    rock.c.pointerMove(1, FWD.x, FWD.y);
    rock.wait(60);
    rock.c.pointerUp(1);
    rock.wait(60);
    rock.c.pointerDown(2, FWD.x, FWD.y, true);
    expect(rock.dashes).toEqual([]);

    const other = rig();
    other.c.pointerDown(1, BACK.x, BACK.y, true);
    other.wait(60);
    other.c.pointerUp(1);
    other.wait(60);
    other.c.pointerDown(2, FWD.x, FWD.y, true);
    expect(other.dashes).toEqual([]);
  });

  it('keys: double tap Right (or D) and hold; key repeat never counts; Left dashes back', () => {
    const { c, dashes, wait } = rig();
    c.keyDown('ArrowRight', false);
    wait(80);
    c.keyDown('ArrowRight', true); // repeat
    c.keyUp('ArrowRight');
    wait(100);
    c.keyDown('KeyD', false);
    expect(dashes).toEqual([1]);
    c.keyUp('KeyD');
    // Holding one key with repeats is never a double tap.
    const r = rig();
    r.c.keyDown('ArrowRight', false);
    for (let i = 0; i < 5; i++) {
      r.wait(40);
      r.c.keyDown('ArrowRight', true);
    }
    expect(r.dashes).toEqual([]);
    r.c.keyUp('ArrowRight');
    r.wait(600);
    r.c.keyDown('ArrowLeft', false);
    r.wait(50);
    r.c.keyUp('ArrowLeft');
    r.wait(50);
    r.c.keyDown('KeyA', false);
    expect(r.dashes).toEqual([-1]);
  });
});

/** A street run with the hero at x, standing, forward held. */
function runAt(level: Level, x: number, opts: ConstructorParameters<typeof Run>[1] = {}): Run {
  const run = new Run(level, opts);
  run.viewLeft = -Infinity;
  run.viewRight = Infinity;
  Object.assign(run.hero, { x, y: level.groundY, prevY: level.groundY });
  run.steer(1);
  return run;
}

describe('S2.16 B4 where the dash works', () => {
  it('only once turned on: street 2 turns it on at its dash hint (6300), with a dashOn event', () => {
    expect(L2.dashFrom).toBe(6300);
    expect(L2.hints.find((h) => h.x === L2.dashFrom)?.words).toBe('Double tap {forward} and hold to dash!');
    const run = runAt(L2, 6000);
    expect(run.dash(1)).toBe(false); // a double tap is a normal walk
    let on: RunEvent | undefined;
    for (let i = 0; i < 600 && !on; i++) on = run.step(DT).find((e) => e.type === 'dashOn');
    expect(on).toBeDefined();
    expect(run.hero.x).toBeGreaterThanOrEqual(6300);
    expect(run.dash(1)).toBe(true);
    // Street 1 never turns it on.
    expect(L1.dashFrom).toBeNull();
  });

  it('with the saved flag it works from the start; it needs the way held', () => {
    const run = runAt(OPEN, 5000, { dash: true });
    expect(run.dash(-1)).toBe(false);
    expect(run.dash(1)).toBe(true);
    const ev = steps(run, 1);
    expect(ev.some((e) => e.type === 'dashStart')).toBe(true);
    expect(run.dashing).toBe(true);
  });

  it('not on corn (a double tap keeps the corn run); a corn picked up ends a dash', () => {
    const run = runAt(OPEN, 5000, { dash: true });
    run.power.corn = 600;
    expect(run.dash(1)).toBe(false);
    run.power.corn = 0;
    expect(run.dash(1)).toBe(true);
    steps(run, 10);
    run.power.corn = 600;
    steps(run, 1);
    expect(run.dashing).toBe(false);
  });

  it('not in Go-Slow Hall, nor in a well room', () => {
    const hall = new Run(HALL, { dash: true });
    hall.steer(1);
    steps(hall, 5);
    expect(hall.dash(1)).toBe(false);
    const run = new Run(L2, { dash: true, rooms: new Map([[ROOM.id, ROOM]]) });
    Object.assign(run.hero, { x: L2.wells[0]!.x });
    expect(run.goDown()).toBe(true);
    for (let i = 0; i < 600 && run.phase !== 'room'; i++) run.step(DT);
    expect(run.phase).toBe('room');
    run.steer(1);
    expect(run.dash(1)).toBe(false);
  });

  it('while resting: no dash, and "Catch your breath! Dash again soon." once per play', () => {
    const run = runAt(OPEN, 5000, { dash: true });
    run.dash(1);
    steps(run, 160);
    expect(run.resting).toBe(true);
    expect(run.dash(1)).toBe(false);
    const ev = steps(run, 1);
    expect(ev).toContainEqual({ type: 'dashTired', first: true });
    run.dash(1);
    expect(steps(run, 1)).toContainEqual({ type: 'dashTired', first: false });
    const ready = steps(run, 130);
    expect(ready.some((e) => e.type === 'dashReady')).toBe(true);
    expect(WORDS.toast.dashTired).toBe('Catch your breath! Dash again soon.');
  });

  it('a lost life or the controls locking ends it', () => {
    const run = runAt(OPEN, 5000, { dash: true });
    run.dash(1);
    steps(run, 5);
    run.safe = 0;
    (run as unknown as { hurt(ev: RunEvent[]): void }).hurt([]);
    expect(run.dashing).toBe(false);
  });

  it('dash plus a drum coming the other way closes at 294 u/s: still 1.5 s or more on the 560 u view (448 u ahead)', () => {
    const closing = PHYSICS.dashSpeed + L3.hazardSpeeds.drum;
    expect(closing).toBe(294);
    expect(448 / closing).toBeGreaterThanOrEqual(1.5);
  });
});

describe('S2.16 B4 the dash gap', () => {
  const STREETS = [L1, L2, L3];
  const corns = (L: Level): number[] => [...L.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
  const reach = (L: Level): number => (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;
  const gapsOf = (L: Level) => pitsOf(L.ground).filter((p) => pitKind(p) === 'dash');

  it('a fifth pit kind, 250 to 270 u: street 2 at 6700 and street 3 at 10900, 260 u wide; none on street 1', () => {
    expect(DASH_GAP).toBe(250);
    expect(gapsOf(L1)).toEqual([]);
    expect(gapsOf(L2)).toEqual([{ a: 6700, b: 6960, w: 260 }]);
    expect(gapsOf(L3)).toEqual([{ a: 10900, b: 11160, w: 260 }]);
  });

  it.each(STREETS)('$id: after the bus stop; 320 u clear before, 300 u clear after; outside corn reach; foods 300 u away', (L) => {
    for (const p of gapsOf(L)) {
      expect(p.w).toBeGreaterThanOrEqual(250);
      expect(p.w).toBeLessThanOrEqual(270);
      expect(p.a).toBeGreaterThan(L.checkpoint);
      const from = p.a - 320;
      const pits = pitsOf(L.ground);
      expect(pits.some((q) => q !== p && q.b > from && q.a < p.a), 'no pit in the run-up').toBe(false);
      expect(L.hazards.filter((z) => z.x > from && z.x <= p.a), 'no hazard in the run-up').toEqual([]);
      expect(L.crates.filter((c) => c.x > from && c.x <= p.a)).toEqual([]);
      expect(L.foods.filter((f) => f.x > from && f.x <= p.a)).toEqual([]);
      expect(L.gutters.filter((q) => q.x + q.w > from && q.x < p.a)).toEqual([]);
      const to = p.b + 300;
      expect(L.hazards.filter((z) => z.x >= p.b && z.x < to), 'no hazard on the landing road').toEqual([]);
      expect(L.gutters.filter((q) => q.x + q.w > p.b && q.x < to)).toEqual([]);
      expect(pits.some((q) => q !== p && q.a < to && q.b > p.b), 'no pit on the landing road').toBe(false);
      for (const c of corns(L)) expect(p.a - c >= 0 && p.a - c <= reach(L), `corn at ${c}`).toBe(false);
      const near = (x: number): number => (x < p.a ? p.a - x : x > p.b ? x - p.b : 0);
      for (const f of L.foods) expect(near(f.x)).toBeGreaterThanOrEqual(300);
      for (const c of L.crates.filter((q) => q.contents !== 'kobo')) expect(near(c.x)).toBeGreaterThanOrEqual(300);
      // Its sign: the dash sign, 120 u before the left lip; cones on both lips (drawn for every gap 160 u or wider).
      expect(roadSigns(L)).toContainEqual({ x: p.a - 120, dash: true });
      // A kobo arc over it.
      expect(L.coins.filter((k) => k.x > p.a && k.x < p.b && k.y < 250).length).toBeGreaterThanOrEqual(6);
    }
  });

  /** From 300 u before the gap, run (or dash) up to it and double jump off the lip on the last coyote step. */
  function attempt(L: Level, gapA: number, opts: { dash: boolean; gentle?: boolean; walk?: boolean }): Run {
    const run = runAt(L, gapA - 300, { dash: true, gentle: opts.gentle ?? false });
    run.hazards.length = 0;
    if (opts.walk) {
      run.steer(0);
      Object.assign(run.hero, { x: gapA - 30 });
      run.steer(1);
    } else if (opts.dash) run.dash(1);
    // On to the lip, then off it: jump on the last coyote step (the longest a jump can go).
    while (run.hero.grounded && run.phase === 'run') steps(run, 1);
    while (run.hero.coyote > 1 && !run.hero.grounded) steps(run, 1);
    run.press();
    let second = true;
    for (let i = 0; i < 300 && run.phase === 'run'; i++) {
      const lives = run.lives;
      steps(run, 1);
      if (run.lives < lives) break;
      const h = run.hero;
      if (h.vy >= 0 && h.down) {
        run.release();
        if (second) {
          run.press();
          second = false;
        }
      }
      if (h.grounded) break;
    }
    run.release();
    return run;
  }

  it.each([
    ['street 2', L2, 6700],
    ['street 3', L3, 10900],
  ] as const)('%s: a dash jump plus second jump crosses; a running one cannot, coyote included', (_n, L, a) => {
    const dashed = attempt(L, a, { dash: true });
    expect(dashed.lives).toBe(3);
    expect(dashed.hero.grounded).toBe(true);
    expect(dashed.hero.x).toBeGreaterThan(a + 260);
    const ran = attempt(L, a, { dash: false });
    expect(ran.hero.speed).toBeLessThanOrEqual(156);
    expect(ran.lives).toBe(2);
  });

  it('Gentle mode: cement blocks (60 u, from lip + 100) make two 100 u gaps; a walking double jump crosses each', () => {
    expect(gentleBlocks(L2.ground)).toEqual([[6800, 6860]]);
    expect(gentleBlocks(L3.ground)).toEqual([[11000, 11060]]);
    expect(gentleBlocks(L1.ground)).toEqual([]);
    const halves = pitsOf(withBlocks(L2.ground)).filter((p) => p.a >= 6700 && p.b <= 6960);
    expect(halves).toEqual([
      { a: 6700, b: 6800, w: 100 },
      { a: 6860, b: 6960, w: 100 },
    ]);
    for (const [L, a] of [
      [L2, 6700],
      [L3, 10900],
    ] as const) {
      // Walk (never run, never dash) to each lip and double jump: on the blocks, then over.
      const run = runAt(L, a - 30, { gentle: true });
      run.hazards.length = 0;
      for (const lip of [a, a + 160]) {
        run.steer(0);
        steps(run, 30);
        Object.assign(run.hero, { x: lip - 20, vx: 0 });
        run.steer(1);
        while (run.hero.grounded) steps(run, 1);
        while (run.hero.coyote > 1 && !run.hero.grounded) steps(run, 1);
        run.press();
        let second = true;
        for (let i = 0; i < 300; i++) {
          steps(run, 1);
          const h = run.hero;
          if (h.vy >= 0 && h.down) {
            run.release();
            if (second) {
              run.press();
              second = false;
            }
          }
          if (h.grounded) break;
        }
        run.release();
        expect(run.lives, `${L.id} lip ${lip}`).toBe(5);
        expect(run.hero.x).toBeGreaterThan(lip + 100);
        expect(run.hero.speed).toBeLessThanOrEqual(120);
      }
    }
    // Normal mode has no blocks.
    expect(new Run(L2).terrain.ground.some((s) => s.x0 === 6800)).toBe(false);
    expect(new Run(L2, { gentle: true }).terrain.ground.some((s) => s.x0 === 6800 && s.x1 === 6860)).toBe(true);
  });

  it('Gentle climb-out: 100 u before the near half (6600), the middle of the blocks for the far half (6830); "Jump, then jump again."', () => {
    const ground = withBlocks(L2.ground);
    const [near, far] = pitsOf(ground).filter((p) => p.a >= 6700 && p.b <= 6960);
    expect(climbOutX(ground, near!, L2.checkpoint)).toBe(6600);
    expect(climbOutX(ground, far!, L2.checkpoint)).toBe(6830);
    const g3 = withBlocks(L3.ground);
    const [n3, f3] = pitsOf(g3).filter((p) => p.a >= 10900 && p.b <= 11160);
    expect(climbOutX(g3, n3!, L3.checkpoint)).toBe(10800);
    expect(climbOutX(g3, f3!, L3.checkpoint)).toBe(11030);
    // A fall in the far half in play climbs out on the blocks, with the wide pothole words.
    const run = runAt(L2, 6880, { gentle: true });
    run.hazards.length = 0;
    Object.assign(run.hero, { x: 6900, y: 340, grounded: false, vy: 300 });
    let out: RunEvent | undefined;
    for (let i = 0; i < 120 && !out; i++) out = run.step(DT).find((e) => e.type === 'climbOut');
    expect(out).toMatchObject({ type: 'climbOut', kind: 'wide', x: 6830 });
    expect(WORDS.climbOut.wide).toBe('Up you come! Jump, then jump again.');
  });

  it('the words: 35 characters or fewer with the markers filled; Gentle mode says to hop over the blocks', () => {
    const lines = [...L2.hints, ...L3.hints].map((h) => h.words).filter((w) => /dash/i.test(w));
    expect(lines).toEqual(['Double tap {forward} and hold to dash!', 'Dash, then jump twice!', 'Dash gap! Dash, then jump twice.']);
    for (const w of lines) {
      for (const kind of ['touch', 'keys'] as const) expect(hintWords(w, kind).length).toBeLessThanOrEqual(35);
    }
    expect(hintWords(lines[0]!, 'touch')).toBe('Double tap → and hold to dash!');
    expect(GENTLE_HINTS['Dash, then jump twice!']).toBe('Dash, or hop over the blocks.');
    expect(GENTLE_HINTS['Dash gap! Dash, then jump twice.']).toBe('Dash, or hop over the blocks.');
    expect(WORDS.toast.dashTired.length).toBeLessThanOrEqual(35);
    const g = new Run(L3, { gentle: true });
    Object.assign(g.hero, { x: 10601 });
    const ev = g.step(DT).filter((e) => e.type === 'hint');
    expect(ev).toContainEqual({ type: 'hint', words: 'Dash, or hop over the blocks.' });
  });
});
