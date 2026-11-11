/**
 * P17 (docs/design.md S2.16 B1, B5; Tp 11 Nov 2026): birds by the rubbish on street 3 and open
 * gutters with still thorny weeds on streets 2 and 3. The rules in play, fufu meeting them,
 * and the level rules (visible 1.5 s ahead, spacing, placements).
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { parseLevel, type Level } from '../../src/game/level';
import { pitKind, pitsOf } from '../../src/game/pits';
import { CROW_ABOVE, HAZARD_BOX, RULES, Run, STEPS_PER_SECOND, type HazardState, type RunEvent } from '../../src/game/run';
import { hintWords, WORDS } from '../../src/screens/words';
import { stepBall, type BallWorld, type FufuBall } from '../../src/game/fufu';

const DT = 1 / 60;
const L1 = parseLevel(structuredClone(lagos1));
const L2 = parseLevel(structuredClone(lagos2));
const L3 = parseLevel(structuredClone(lagos3));
const GY = 300;

function steps(run: Run, n: number): RunEvent[] {
  const out: RunEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...run.step(DT));
  return out;
}

/** Street 3 cut down to a flat road with only what a test puts on it. */
function lab(over: Partial<Level> = {}): Level {
  return {
    ...L3,
    ground: [[-400, 30000]],
    terrain: { ...L3.terrain, ground: [{ x0: -400, x1: 30000 }] },
    hazards: [],
    gutters: [],
    crates: [],
    foods: [],
    coins: [],
    hints: [],
    end: { x: 29000, wall: 29200 },
    ...over,
  };
}

function runOn(level: Level, x: number): Run {
  const run = new Run(level);
  run.viewLeft = -Infinity;
  run.viewRight = Infinity;
  Object.assign(run.hero, { x, y: GY, prevY: GY });
  return run;
}

const bird = (run: Run): HazardState => run.hazards[0]!;

describe('S2.16 B1 birds', () => {
  it('boxes: egret 16 x 28 on the road; crow 22 x 14 with its bottom 20 u above the road', () => {
    expect(HAZARD_BOX.egret).toEqual({ halfW: 8, h: 28 });
    expect(HAZARD_BOX.crow).toEqual({ halfW: 11, h: 14 });
    const run = runOn(lab({ hazards: [{ kind: 'crow', x: 600 }, { kind: 'egret', x: 900 }] }), 100);
    expect(run.hazards[0]!.y).toBe(GY - CROW_ABOVE);
    expect(run.hazards[1]!.y).toBe(GY);
  });

  it('the egret pecks, then hops inside its 40 u patch at 30 u/s; the crow never moves; neither ever comes lower', () => {
    const run = runOn(lab({ hazards: [{ kind: 'egret', x: 1000 }, { kind: 'crow', x: 1400 }] }), 100);
    run.viewAhead = 2000;
    const [e, c] = run.hazards as [HazardState, HazardState];
    let minX = Infinity;
    let maxX = -Infinity;
    let fastest = 0;
    let px = e.x;
    for (let i = 0; i < 60 * 20; i++) {
      run.step(DT);
      expect(e.mode).toBe('move');
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x);
      fastest = Math.max(fastest, Math.abs(e.x - px) / DT);
      px = e.x;
      expect(e.y).toBe(GY);
      expect(c.x).toBe(1400);
      expect(c.y).toBe(GY - CROW_ABOVE);
    }
    expect(minX).toBeGreaterThanOrEqual(980);
    expect(maxX).toBeLessThanOrEqual(1020);
    expect(maxX - minX).toBeGreaterThan(30);
    expect(fastest).toBeCloseTo(30, 5);
  });

  it('an egret near a pit lip turns back 30 u from it', () => {
    const level = lab({ ground: [[-400, 1010], [1050, 30000]], terrain: { ...L3.terrain, ground: [{ x0: -400, x1: 1010 }, { x0: 1050, x1: 30000 }] }, hazards: [{ kind: 'egret', x: 970 }] });
    const run = runOn(level, 100);
    run.viewAhead = 2000;
    let maxX = -Infinity;
    for (let i = 0; i < 60 * 20; i++) {
      run.step(DT);
      maxX = Math.max(maxX, bird(run).x);
    }
    expect(maxX + HAZARD_BOX.egret.halfW).toBeLessThanOrEqual(1010 - 30 + 0.6);
  });

  /** A hero dropping onto, or walking into, a bird at x 600. */
  function meet(kind: 'egret' | 'crow', how: 'stomp' | 'side', set: (run: Run) => void = () => {}): { run: Run; ev: RunEvent[] } {
    const run = runOn(lab({ hazards: [{ kind, x: 600 }], piles: [600] }), 560);
    bird(run).mode = 'move';
    set(run);
    const top = bird(run).y - HAZARD_BOX[kind].h;
    if (how === 'stomp') Object.assign(run.hero, { x: 600, y: top - 1, prevY: top - 2, vy: 200, grounded: false });
    else Object.assign(run.hero, { x: 600 - HAZARD_BOX[kind].halfW - 6, y: GY, prevY: GY });
    const ev = steps(run, 1);
    return { run, ev };
  }

  it('landed on: a small bounce (vy -360, the second jump still there), 2 kobo from the pile, and it flies off', () => {
    for (const kind of ['egret', 'crow'] as const) {
      const { run, ev } = meet(kind, 'stomp');
      expect(run.hero.vy).toBe(-360); // set this step
      expect(run.hero.airJump).toBe(true);
      expect(run.kobo).toBe(2);
      expect(run.lives).toBe(3);
      expect(bird(run).mode).toBe('flyOff');
      expect(ev).toContainEqual({ type: 'birdOff', kind, why: 'stomp', x: 600, y: kind === 'crow' ? GY - 20 : GY });
      expect(ev).toContainEqual({ type: 'pileKobo', x: 600, y: GY });
    }
  });

  it('touched from the side with nothing on: a life is lost, like a goat (Tp, 11 Nov); the bird still flies off fine', () => {
    for (const kind of ['egret', 'crow'] as const) {
      // The crow's box is 266 to 280: a 44 u tall hero walking into it touches it too.
      const { run, ev } = meet(kind, 'side');
      expect(run.lives).toBe(2);
      expect(ev.some((e) => e.type === 'hit')).toBe(true);
      expect(bird(run).mode).toBe('flyOff');
    }
  });

  it('with the tech suit: a fright, no hit, and the suit stays on (birds never break the suit)', () => {
    const { run, ev } = meet('egret', 'side', (r) => (r.power.shield = true));
    expect(run.power.shield).toBe(true);
    expect(run.lives).toBe(3);
    expect(run.safe).toBe(0);
    expect(ev.some((e) => e.type === 'shieldPop' || e.type === 'hit')).toBe(false);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'birdOff', why: 'suit' }));
  });

  it('with amala: a fright, no kobo, amala goes on', () => {
    const { run, ev } = meet('crow', 'side', (r) => (r.power.amala = 300));
    expect(run.lives).toBe(3);
    expect(run.kobo).toBe(0);
    expect(run.power.amala).toBeGreaterThan(290);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'birdOff', why: 'amala' }));
  });

  it('flying off: up and right at 45 degrees, 200 u/s, gone after 1.2 s, with no box (it hurts no one)', () => {
    const { run } = meet('egret', 'stomp');
    const z = bird(run);
    const [x0, y0] = [z.x, z.y];
    Object.assign(run.hero, { x: z.x, y: GY, prevY: GY, vy: 0, grounded: true });
    run.safe = 0;
    steps(run, 30);
    expect(z.x - x0).toBeCloseTo(100 / Math.SQRT2, 0);
    expect(y0 - z.y).toBeCloseTo(100 / Math.SQRT2, 0);
    expect(run.lives).toBe(3);
    steps(run, RULES.birdFlySteps - 30);
    expect(z.mode).toBe('gone');
  });

  it('a fufu ball within 12 u: the bird catches it and flies off with it; the ball is used up, no kobo', () => {
    for (const kind of ['egret', 'crow'] as const) {
      const run = runOn(lab({ hazards: [{ kind, x: 700 }] }), 560);
      run.viewAhead = 2000;
      run.fufu = 8;
      run.steer(0);
      expect(run.throwFufu()).toBe(true);
      let ev: RunEvent[] = [];
      for (let i = 0; i < 120 && bird(run).mode !== 'flyOff'; i++) ev = ev.concat(run.step(DT));
      expect(bird(run).mode, kind).toBe('flyOff');
      expect(bird(run).fufu).toBe(true);
      expect(ev).toContainEqual(expect.objectContaining({ type: 'birdOff', kind, why: 'fufu' }));
      expect(run.balls.filter((b) => b.mode !== 'gone')).toEqual([]);
      expect(run.kobo).toBe(0);
    }
  });

  it('a bird that flew off comes back after a lost life only if it is at or past the restart point', () => {
    const run = runOn(lab({ hazards: [{ kind: 'egret', x: 600 }, { kind: 'egret', x: 1200 }], checkpoint: 900 }), 560);
    run.hazards.forEach((z) => (z.mode = 'flyOff'));
    run.checkpointReached = true;
    run.spawnX = 900;
    Object.assign(run.hero, { y: 500, grounded: false });
    steps(run, 1);
    expect(run.hazards[0]!.mode).toBe('flyOff');
    expect(run.hazards[1]!.mode).toBe('wait');
  });

  it('street 3 only, after the bus stop, never in a corn fast stretch, 200 u from pits; with piles; the lesson egret first with its hint', () => {
    for (const L of [L1, L2]) expect(L.hazards.filter((z) => z.kind === 'egret' || z.kind === 'crow')).toEqual([]);
    const birds = L3.hazards.filter((z) => z.kind === 'egret' || z.kind === 'crow');
    expect(birds).toEqual([
      { kind: 'egret', x: 7400 },
      { kind: 'crow', x: 8970 },
      { kind: 'egret', x: 10050 },
    ]);
    expect(L3.hazardSpeeds.egret).toBe(30);
    expect(L3.piles).toEqual([7420, 8970, 10070]);
    const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L3.cornSpeed;
    const corns = [...L3.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L3.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
    const pits = pitsOf(L3.ground);
    for (const b of birds) {
      expect(b.x).toBeGreaterThan(L3.checkpoint);
      for (const c of corns) expect(b.x - c >= 0 && b.x - c <= reach / 2, `${b.kind} at ${b.x} in the fast stretch of ${c}`).toBe(false);
      for (const p of pits) {
        const patch = b.kind === 'egret' ? RULES.egretPatch + HAZARD_BOX.egret.halfW : HAZARD_BOX.crow.halfW;
        const d = b.x < p.a ? p.a - (b.x + patch) : b.x - patch - p.b;
        expect(d, `${b.kind} at ${b.x}, pit at ${p.a}`).toBeGreaterThanOrEqual(b.kind === 'egret' ? 30 : 0);
        expect(b.x < p.a ? p.a - b.x : b.x - p.b).toBeGreaterThanOrEqual(200);
      }
      expect(L3.piles.some((x) => Math.abs(x - b.x) <= 30), `a pile by the ${b.kind} at ${b.x}`).toBe(true);
      for (const q of L3.gutters) expect(Math.abs(q.x - b.x)).toBeGreaterThan(200); // never placed at a gutter
    }
    const hint = L3.hints.filter((h) => h.x < 7400).at(-1)!;
    expect(hint).toEqual({ x: 7240, words: 'Birds! Hop over, or bounce on one.' });
    for (const kind of ['touch', 'keys'] as const) expect(hintWords(hint.words, kind).length).toBeLessThanOrEqual(35);
  });
});

describe('S2.16 B5 gutters with thorny weeds', () => {
  const GUT = (w: 30 | 44) => lab({ gutters: [{ x: 800, w }] });

  /** From standing at x, walk (or run) forward and jump `plan` with the weeds ahead; returns the run. */
  function overGutter(w: 30 | 44, plan: 'walkTap' | 'walkHold' | 'runTap' | 'runHold'): Run {
    const run = runOn(GUT(w), plan.startsWith('run') ? 400 : 760);
    run.steer(1);
    if (plan.startsWith('run')) steps(run, 60); // running by now
    // Take off so the box's front just reaches the weeds at the top of the jump... simply: as late as can clear.
    const best = { run, lives: -1 };
    for (let lead = 0; lead <= 60; lead += 2) {
      const r = runOn(GUT(w), run.hero.x);
      Object.assign(r.hero, { vx: run.hero.vx, speed: run.hero.speed, runTime: run.hero.runTime });
      r.steer(1);
      while (r.hero.x + RULES.heroHalfW < 800 - lead) steps(r, 1);
      r.press();
      if (plan.endsWith('Tap')) r.release();
      for (let i = 0; i < 120; i++) {
        steps(r, 1);
        if (r.hero.vy >= 0) r.release();
        if (r.hero.grounded) break;
      }
      steps(r, 5);
      if (r.lives > best.lives) {
        best.run = r;
        best.lives = r.lives;
      }
    }
    return best.run;
  }

  it('widths 30 (short) or 44 (long), from the level file; any other width is a clear error', () => {
    expect(L2.gutters).toEqual([
      { x: 800, w: 30 },
      { x: 9050, w: 44 },
    ]);
    expect(L3.gutters).toEqual([
      { x: 6306, w: 44 }, // qa round 2: moved from 6150 so a drum jump never lands in it
      { x: 9300, w: 30 },
    ]);
    expect(L1.gutters).toEqual([]);
    expect(() => parseLevel({ ...structuredClone(lagos2), gutters: [[800, 36]] })).toThrow('gutters[0][1] should be one of 30, 44');
  });

  it('a walking tap clears neither; a walking hold clears both; a running tap clears the short one', () => {
    expect(overGutter(30, 'walkTap').lives).toBe(2);
    expect(overGutter(44, 'walkTap').lives).toBe(2);
    expect(overGutter(30, 'walkHold').lives).toBe(3);
    expect(overGutter(44, 'walkHold').lives).toBe(3);
    expect(overGutter(30, 'runTap').lives).toBe(3);
    expect(overGutter(44, 'runHold').lives).toBe(3);
  });

  it('the feet stay at road height across it: never a hole, never a fall', () => {
    const run = runOn(GUT(44), 700);
    run.power.amala = 600; // walk through without a hit
    run.steer(1);
    for (let i = 0; i < 120; i++) {
      run.step(DT);
      expect(run.hero.y).toBe(GY);
      expect(run.hero.grounded).toBe(true);
    }
    expect(run.hero.x).toBeGreaterThan(850);
  });

  it('a touch costs a life (never a bounce); from above too', () => {
    const run = runOn(GUT(30), 780);
    run.steer(1);
    const ev = steps(run, 20);
    expect(run.lives).toBe(2);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(ev.some((e) => e.type === 'bounce')).toBe(false);
    const top = runOn(GUT(30), 815);
    Object.assign(top.hero, { y: 270, prevY: 268, vy: 300, grounded: false });
    steps(top, 4);
    expect(top.lives).toBe(2);
    expect(top.hero.vy).toBeGreaterThanOrEqual(0);
  });

  it('with the tech suit on, the suit breaks instead (S2.16 B3)', () => {
    const run = runOn(GUT(30), 780);
    run.power.shield = true;
    run.steer(1);
    const ev = steps(run, 20);
    expect(run.lives).toBe(3);
    expect(run.power.shield).toBe(false);
    expect(ev.some((e) => e.type === 'shieldPop')).toBe(true);
  });

  it('amala tramples them flat: safe for the rest of the play, also after a lost life', () => {
    const run = runOn(GUT(44), 780);
    run.power.amala = 300;
    run.steer(1);
    const ev = steps(run, 20);
    expect(run.lives).toBe(3);
    expect(run.gutters[0]!.state).toBe('trampled');
    expect(ev).toContainEqual({ type: 'weedsTrample', x: 822 });
    run.power.amala = 0;
    Object.assign(run.hero, { y: 500, grounded: false });
    steps(run, 1);
    expect(run.gutters[0]!.state).toBe('trampled');
  });

  it('one fufu ball dries them in 0.5 s (straw brown, flat), "The weeds dried up! Safe to cross."; safe after a lost life', () => {
    const run = runOn(lab({ gutters: [{ x: 800, w: 30 }, { x: 1400, w: 44 }] }), 740);
    run.fufu = 8;
    expect(run.throwFufu()).toBe(true);
    let ev: RunEvent[] = [];
    for (let i = 0; i < 90 && run.gutters[0]!.state === 'weeds'; i++) ev = ev.concat(run.step(DT));
    expect(run.gutters[0]!.state).toBe('drying');
    expect(ev).toContainEqual(expect.objectContaining({ type: 'weedsDry', first: true }));
    expect(run.gutters[1]!.state).toBe('weeds'); // one ball clears one gutter
    expect(run.fufu).toBe(7);
    steps(run, RULES.weedDrySteps);
    expect(run.gutters[0]!.state).toBe('dry');
    expect(WORDS.toast.weedsDried).toBe('The weeds dried up! Safe to cross.');
    expect(WORDS.toast.weedsDried.length).toBeLessThanOrEqual(35);
    // A lost life (a fall) keeps them dry; walking across costs nothing.
    Object.assign(run.hero, { y: 500, grounded: false });
    steps(run, 1);
    expect(run.lives).toBe(2);
    expect(run.gutters[0]!.state).toBe('dry');
    const across = runOn(run.level, 780);
    (across.gutters as { state: string }[])[0]!.state = 'dry';
    across.steer(1);
    steps(across, 40);
    expect(across.lives).toBe(3);
    // The second gutter: a second ball, no second toast.
    Object.assign(run.hero, { x: 1340 });
    run.fufu = 8;
    run.throwFufu();
    let ev2: RunEvent[] = [];
    for (let i = 0; i < 90 && run.gutters[1]!.state === 'weeds'; i++) ev2 = ev2.concat(run.step(DT));
    expect(ev2).toContainEqual(expect.objectContaining({ type: 'weedsDry', first: false }));
  });

  it('a ball flying over higher than the weeds does not touch them; one that comes down into them does', () => {
    const world = (): BallWorld => ({
      terrain: lab().terrain,
      groundY: GY,
      pits: [],
      hazards: [],
      hazardBox: HAZARD_BOX,
      crates: [],
      throws: [],
      jamX: null,
      left: -Infinity,
      right: Infinity,
      heroX: 700,
      weeds: [{ i: 0, x: 800, w: 44 }],
    });
    // Over the 44 u of weeds plus the ball's 12 u at 240 u/s it drops about 37 u: from 230 to 267, above 282.
    const high: FufuBall = { x: 794, y: 230, prevY: 230, vx: 240, vy: 0, mode: 'fly', touches: 0, t: -1, spin: 0, squash: 0 };
    const w = world();
    const ev: unknown[] = [];
    while (high.x < 851 && high.mode === 'fly') ev.push(...stepBall(high, w, DT));
    expect(high.y).toBeLessThan(GY - 18);
    expect(ev).toEqual([]);
    const low: FufuBall = { x: 780, y: GY, prevY: GY, vx: 120, vy: 0, mode: 'roll', touches: 3, t: 10, spin: 0, squash: 0 };
    const ev2: unknown[] = [];
    for (let i = 0; i < 60 && low.mode === 'roll'; i++) ev2.push(...stepBall(low, w, DT));
    expect(ev2).toContainEqual(expect.objectContaining({ type: 'fufuWeeds', i: 0 }));
    expect(low.mode).toBe('settle');
  });

  it('goats turn back at a gutter edge; tyres roll across', () => {
    const run = runOn(lab({ gutters: [{ x: 800, w: 30 }], hazards: [{ kind: 'goat', x: 900 }, { kind: 'tyre', x: 1000 }] }), 100);
    run.viewAhead = 2000;
    let goatMin = Infinity;
    let tyreMin = Infinity;
    for (let i = 0; i < 60 * 8; i++) {
      run.step(DT);
      goatMin = Math.min(goatMin, run.hazards[0]!.x);
      tyreMin = Math.min(tyreMin, run.hazards[1]!.x);
    }
    expect(goatMin - HAZARD_BOX.goat.halfW).toBeGreaterThanOrEqual(830 - 1);
    expect(tyreMin).toBeLessThan(800);
  });

  it.each([L2, L3])('$id: spacing rules (S2.16 B5): pits 200 u, foods 300 u, not in a fast stretch, run-up or landing road; not on spawn, stop, well or bus; 2 kobo over each', (L) => {
    const pits = pitsOf(L.ground);
    const reach = (RULES.cornSteps / STEPS_PER_SECOND) * L.cornSpeed;
    const corns = [...L.foods.filter((f) => f.kind === 'corn').map((f) => f.x), ...L.crates.filter((c) => c.contents === 'corn').map((c) => c.x)];
    for (const q of L.gutters) {
      const [a, b] = [q.x, q.x + q.w];
      const dist = (x0: number, x1: number): number => (x1 < a ? a - x1 : x0 > b ? x0 - b : 0);
      for (const p of pits) expect(dist(p.a, p.b), `gutter ${a}, pit ${p.a}`).toBeGreaterThanOrEqual(200);
      for (const f of L.foods) expect(dist(f.x, f.x), `gutter ${a}, ${f.kind} ${f.x}`).toBeGreaterThanOrEqual(300);
      for (const c of L.crates.filter((k) => k.contents !== 'kobo')) expect(dist(c.x, c.x)).toBeGreaterThanOrEqual(300);
      for (const c of corns) expect(a >= c && a <= c + reach / 2, `gutter ${a} in the fast stretch of ${c}`).toBe(false);
      for (const p of pits.filter((k) => pitKind(k) === 'big')) expect(dist(p.a - 160, p.a)).toBeGreaterThan(0);
      for (const p of pits.filter((k) => pitKind(k) === 'dash')) expect(dist(p.a - 320, p.b + 300)).toBeGreaterThan(0);
      for (const x of [L.spawnX, L.checkpoint, L.end!.x, ...L.wells.flatMap((w) => [w.x, w.exitX])]) expect(dist(x - 60, x + 60), `gutter ${a} by ${x}`).toBeGreaterThan(0);
      expect(L.coins.filter((k) => k.y === 236 && k.x >= a && k.x <= b)).toHaveLength(2);
    }
  });

  it('the first gutter of the game is short, alone, before street 2\'s bus stop, with its hint (35 characters)', () => {
    const first = L2.gutters[0]!;
    expect(first).toEqual({ x: 800, w: 30 });
    expect(first.x).toBeLessThan(L2.checkpoint);
    for (const z of L2.hazards) expect(Math.abs(z.x - first.x)).toBeGreaterThan(600);
    const hint = L2.hints.filter((h) => h.x < first.x).at(-1)!;
    expect(hint).toEqual({ x: 650, words: 'Thorny weeds! Jump right over them.' });
    expect(hint.words.length).toBeLessThanOrEqual(35);
  });
});

describe('S2.2 rule: birds and gutters show 1.5 s or more before you reach them (narrowest view, 448 u ahead)', () => {
  it.each([L2, L3])('$id at corn speed (228 u/s), from just off screen to the first touch', (L) => {
    const things = [
      ...L.hazards.filter((z) => z.kind === 'egret' || z.kind === 'crow').map((z) => ({ what: `${z.kind} ${z.x}`, left: z.x - HAZARD_BOX[z.kind].halfW - RULES.egretPatch })),
      ...L.gutters.map((q) => ({ what: `gutter ${q.x}`, left: q.x })),
    ];
    expect(things.length).toBeGreaterThan(0);
    for (const t of things) {
      // A corn-speed hero on a lab road with only this thing: seen when it is 448 u ahead of the hero's centre.
      const level = lab({
        hazards: L.hazards.filter((z) => t.what === `${z.kind} ${z.x}`),
        gutters: L.gutters.filter((q) => t.what === `gutter ${q.x}`),
      });
      const run = runOn(level, t.left - 1200);
      run.viewAhead = 448;
      run.power.corn = 60 * 60;
      Object.assign(run.hero, { vx: 228, speed: 228, runTime: 5 });
      run.steer(1);
      let seen = -1;
      let hit = -1;
      for (let i = 0; i < 60 * 12 && hit < 0; i++) {
        run.power.corn = 60 * 60;
        const ev = run.step(DT);
        const z = run.hazards[0];
        const near = z ? z.x - HAZARD_BOX[z.kind].halfW : run.gutters[0]!.x;
        if (seen < 0 && near - run.hero.x <= 448) seen = i;
        if (ev.some((e) => e.type === 'hit')) hit = i;
      }
      expect(hit, t.what).toBeGreaterThan(0);
      expect((hit - seen) / STEPS_PER_SECOND, t.what).toBeGreaterThanOrEqual(1.5);
    }
  });
});
