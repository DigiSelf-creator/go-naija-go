/**
 * qa C7 and D4: world 1 level 1 against the design limits (docs/design.md, Level 1 and
 * Power-ups), with the real level data and the real rules (Run). No drawing.
 *
 * 1. Every hazard is on screen at least 1.5 s before it touches the hero, on every
 *    landscape screen shape from 4:3 to 21:9.
 * 2. A sloppy first-timer bot (every press up to 80 ms early or late, tap lengths that wander)
 *    finishes the level in 3 tries or fewer (designer rule, plan C7).
 * 3. Edge cases: dying exactly as a food is picked up; foods ending on time in the real level.
 */
import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { PHYSICS } from '../../src/engine/physics';
import { parseLevel, type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;
const L1 = parseLevel(w1l1);

/** Small seeded random numbers, so a failure can be replayed. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function withLevel(patch: Record<string, unknown>): Level {
  return parseLevel({ ...structuredClone(w1l1), ...patch });
}

/** How far (u) a jump carries the hero from leaving the road to landing, on flat road. */
function airDistance(speed: number, holdSteps: number, secondAtTop: boolean, secondHold = 0): number {
  const flat = withLevel({ ground: [[-400, 20000]], hazards: [], foods: [], kobo: [], platforms: [], hints: [] });
  const run = new Run(flat);
  run.press();
  const x0 = run.hero.x;
  let held = holdSteps;
  let second = secondAtTop;
  let secondLeft = 0;
  for (let i = 0; i < 600; i++) {
    if (held > 0 && --held === 0) run.release();
    if (second && run.hero.vy >= 0 && held === 0) {
      run.press();
      second = false;
      secondLeft = secondHold;
    } else if (secondLeft > 0 && --secondLeft === 0) run.release();
    run.step(DT); // always at the level's 156 u/s
    if (i > 2 && run.hero.grounded) break;
  }
  // Time in the air does not depend on speed, so distance scales with it.
  return ((run.hero.x - x0) / PHYSICS.runSpeed) * speed;
}

type Plan = 'tap' | 'hold' | 'double';

interface Bot {
  /** Seconds, uniform +/- this, added to every press and every second-jump press. */
  jitter: number;
  /** Tap length range, s. */
  tap: [number, number];
  /** Hold length range, s. */
  hold: [number, number];
  /** Chance of picking a move one size too small (hold instead of hold + second jump, tap instead of hold). */
  slip?: number;
}

const SLOPPY: Bot = { jitter: 0.08, tap: [0.06, 0.2], hold: [0.3, 0.6] };

interface TryResult {
  finished: boolean;
  livesLost: number;
  /** Where each life was lost (x) and how. */
  losses: string[];
  foods: string[];
  time: number;
}

/**
 * A first-timer who reads what is coming and means to do the right thing, but whose
 * timing is off by up to `jitter` each press. Potholes up to 60 wide: a tap; up to 110:
 * a hold; wider: a hold and a second tap near the top. Hazards: a tap timed to be at the
 * top over them. Never uses the second jump as a rescue (a real first-timer may, so this
 * is the harder case).
 */
function playTry(level: Level, bot: Bot, rand: () => number, gentle = false): TryResult {
  const run = new Run(level, { gentle });
  const gaps = level.ground.slice(1).map((s, i) => ({ a: level.ground[i]![1], b: s[0] }));
  const r = (lo: number, hi: number): number => lo + (hi - lo) * rand();
  const sec = (s: number): number => Math.max(1, Math.round(s * 60));
  const D: Record<Plan, number> = {
    tap: airDistance(156, sec((bot.tap[0] + bot.tap[1]) / 2), false),
    hold: airDistance(156, sec((bot.hold[0] + bot.hold[1]) / 2), false),
    double: airDistance(156, 33, true, 18),
  };
  const losses: string[] = [];
  const foods: string[] = [];
  let releaseIn = 0;
  let secondPlanned = false;
  let secondAt = 0; // steps after the top
  let secondHoldSteps = 0;
  let pastTop = -1;
  // The obstacle the bot has already planned for, and when it will press.
  let planned: { key: string; pressX?: number; pressT?: number; plan: Plan } | null = null;
  const done = new Set<string>();

  for (let i = 0; i < 60 * 200 && run.phase === 'run'; i++) {
    const h = run.hero;
    const speed = h.speed;
    if (releaseIn > 0 && --releaseIn === 0) run.release();
    if (secondPlanned && !h.grounded) {
      if (h.vy >= 0 && pastTop < 0) pastTop = 0;
      if (pastTop >= 0 && pastTop++ >= secondAt) {
        if (releaseIn > 0) run.release();
        run.press();
        releaseIn = secondHoldSteps;
        secondPlanned = false;
      }
    }
    if (h.grounded && releaseIn === 0) {
      secondPlanned = false;
      if (!planned) {
        const gap = gaps.find((g) => !done.has(`g${g.a}`) && g.a - h.x > -2 && g.a - h.x < 200);
        const z = run.hazards.find((q, k) => !done.has(`z${k}`) && (q.mode === 'move' || q.mode === 'wait') && q.x - h.x > 0 && q.x - h.x < 200);
        const zi = z ? run.hazards.indexOf(z) : -1;
        if (gap && (!z || gap.a < z.x)) {
          const w = gap.b - gap.a;
          let plan: Plan = w <= 60 ? 'tap' : w <= 110 ? 'hold' : 'double';
          if (bot.slip && rand() < bot.slip) plan = plan === 'double' ? 'hold' : 'tap';
          const dist = (D[plan] / 156) * speed;
          // Middle of the window [b - dist, a]: leave from there and land past b.
          const ideal = (gap.b - dist + gap.a) / 2;
          planned = { key: `g${gap.a}`, pressX: ideal + r(-bot.jitter, bot.jitter) * speed, plan };
        } else if (z) {
          // Time the tap so the top of the jump is over the hazard: about 0.25 s.
          planned = { key: `z${zi}`, pressT: 0.25 + r(-bot.jitter, bot.jitter), plan: 'tap' };
        }
      }
      if (planned) {
        let go = false;
        if (planned.pressX !== undefined) go = h.x >= planned.pressX;
        else {
          const k = Number(planned.key.slice(1));
          const z = run.hazards[k]!;
          const closing = speed + (z.mode === 'move' ? -z.vx : 0);
          go = z.mode !== 'move' && z.mode !== 'wait' ? false : (z.x - h.x) / closing <= planned.pressT!;
          if (z.mode !== 'move' && z.mode !== 'wait') {
            done.add(planned.key);
            planned = null;
          }
        }
        if (go && planned) {
          run.press();
          const p = planned.plan;
          releaseIn = p === 'tap' ? sec(r(...bot.tap)) : p === 'hold' ? sec(r(...bot.hold)) : sec(0.55);
          if (p === 'double') {
            secondPlanned = true;
            pastTop = -1;
            secondAt = Math.max(0, Math.round(r(-bot.jitter, bot.jitter) * 60) + 3);
            secondHoldSteps = sec(r(0.15, 0.4));
          }
          done.add(planned.key);
          planned = null;
        }
      }
    }
    const livesBefore = run.lives;
    const ev = run.step(DT);
    for (const e of ev) if (e.type === 'food') foods.push(e.kind);
    if (run.lives < livesBefore) {
      losses.push(`${ev.some((e) => e.type === 'fall') ? 'fall' : 'hit'}@${Math.round(h.x)}`);
      // After a fall the road behind comes back: forget what was done past the restart point.
      if (ev.some((e) => e.type === 'fall')) {
        for (const k of [...done]) {
          const x = k.startsWith('g') ? Number(k.slice(1)) : run.hazards[Number(k.slice(1))]!.x0;
          if (x >= run.spawnX) done.delete(k);
        }
        planned = null;
        releaseIn = 0;
        secondPlanned = false;
        run.release();
      }
    }
  }
  return { finished: run.phase === 'arena', livesLost: run.maxLives - run.lives, losses, foods, time: run.time };
}

describe('C7: hazards are on screen at least 1.5 s before they touch the hero', () => {
  // Landscape screens from 4:3 to 21:9. World is 420 tall (S2.1), so width = 420 * aspect.
  const aspects = { '4:3': 4 / 3, '16:9': 16 / 9, 'Pixel 5 sideways, test profile (727x393)': 727 / 393, 'phone screen 851x393': 851 / 393, '21:9': 21 / 9 };
  for (const [name, aspect] of Object.entries(aspects)) {
    it(`on a ${name} screen`, () => {
      const W = 420 * aspect;
      const ahead = W * 0.7; // the hero stands at 30 percent
      const report: string[] = [];
      L1.hazards.forEach((_, k) => {
        // One hazard at a time, real road, foods and power-ups as in the level; a perfect
        // pothole-jumper who never jumps hazards, so the hazard reaches the hero.
        const lvl = withLevel({ hazards: [w1l1.hazards[k]] });
        const run = new Run(lvl);
        const gaps = lvl.ground.slice(1).map((s, i) => ({ a: lvl.ground[i]![1], b: s[0] }));
        let seenAt = -1;
        let touchAt = -1;
        let holding = false;
        let second = false;
        for (let i = 0; i < 60 * 120 && run.phase === 'run' && touchAt < 0; i++) {
          const h = run.hero;
          const z = run.hazards[0]!;
          if (h.grounded && !holding) {
            const gap = gaps.find((g) => g.a - h.x > 0 && g.a - h.x < 30);
            if (gap) {
              run.press();
              holding = true;
              second = gap.b - gap.a > 110;
            }
          } else if (holding && h.vy >= 0) {
            run.release();
            holding = false;
            if (second) {
              run.press();
              holding = true;
              second = false;
            }
          }
          const ev = run.step(DT);
          // On screen once its near edge is inside the right edge of the screen.
          if (seenAt < 0 && z.x - HAZARD_BOX[z.kind].halfW - run.hero.x <= ahead) seenAt = run.steps;
          if (ev.some((e) => e.type === 'hit' || e.type === 'shieldPop' || e.type === 'smash' || e.type === 'bounce')) touchAt = run.steps;
        }
        expect(touchAt, `hazard ${k} never reached the hero`).toBeGreaterThan(0);
        const warn = (touchAt - seenAt) / 60;
        report.push(`${w1l1.hazards[k]![0]}@${w1l1.hazards[k]![1]}: ${warn.toFixed(2)} s`);
        expect(warn, `${w1l1.hazards[k]} on ${name}`).toBeGreaterThanOrEqual(1.5);
      });
      console.log(`warning time on ${name} (${W.toFixed(0)} u wide): ${report.join(', ')}`);
    });
  }
});

describe('C7: a sloppy first-timer finishes level 1 in 3 tries or fewer', () => {
  it('sloppy bot (presses +/- 80 ms, wandering tap length): most tries finish, 3 tries almost always enough', () => {
    const N = 400;
    const rand = rng(20261106);
    const results = Array.from({ length: N }, () => playTry(L1, SLOPPY, rand));
    const finished = results.filter((t) => t.finished).length;
    const p = finished / N;
    const lost = results.reduce((n, t) => n + t.livesLost, 0) / N;
    const where = new Map<string, number>();
    for (const t of results) for (const l of t.losses) {
      const k = l.replace(/@(\d+)/, (_, x: string) => `@${Math.round(Number(x) / 50) * 50}`);
      where.set(k, (where.get(k) ?? 0) + 1);
    }
    const top = [...where.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} x${n}`);
    // Chance a first-timer needs more than 3 tries, if each try is independent.
    const over3 = (1 - p) ** 3;
    console.log(
      `sloppy bot, ${N} tries: ${(p * 100).toFixed(1)}% reach the arena, ${lost.toFixed(2)} lives lost per try, ` +
        `P(more than 3 tries) ${(over3 * 100).toFixed(2)}%. Lives lost at: ${top.join(', ')}`,
    );
    const allFoods = results.filter((t) => t.finished).every((t) => ['garri', 'corn', 'amala'].every((f) => t.foods.includes(f)));
    expect(allFoods, 'a normal run picks up all three foods').toBe(true);
    expect(p).toBeGreaterThanOrEqual(0.75);
    expect(over3).toBeLessThanOrEqual(0.02);
  });

  it('a rougher first-timer (+/- 150 ms, 1 in 5 moves too small) is reported, and 3 tries are still usually enough', () => {
    const N = 400;
    const rand = rng(31);
    const rough: Bot = { jitter: 0.15, tap: [0.05, 0.25], hold: [0.25, 0.6], slip: 0.2 };
    const results = Array.from({ length: N }, () => playTry(L1, rough, rand));
    const p = results.filter((t) => t.finished).length / N;
    const where = new Map<string, number>();
    for (const t of results) for (const l of t.losses) {
      const k = l.replace(/@(\d+)/, (_, x: string) => `@${Math.round(Number(x) / 50) * 50}`);
      where.set(k, (where.get(k) ?? 0) + 1);
    }
    const top = [...where.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} x${n}`);
    const lost = results.reduce((n, t) => n + t.livesLost, 0) / N;
    console.log(
      `rough bot, ${N} tries: ${(p * 100).toFixed(1)}% reach the arena, ${lost.toFixed(2)} lives lost per try, ` +
        `P(more than 3 tries) ${(((1 - p) ** 3) * 100).toFixed(2)}%. Lives lost at: ${top.join(', ')}`,
    );
    expect((1 - p) ** 3).toBeLessThanOrEqual(0.1);
  });

  it('the same bot on time (no jitter) never loses a life', () => {
    const rand = rng(7);
    for (let i = 0; i < 20; i++) {
      const t = playTry(L1, { jitter: 0, tap: [0.12, 0.12], hold: [0.45, 0.45] }, rand);
      expect(t.losses).toEqual([]);
      expect(t.finished).toBe(true);
    }
  });
});

describe('D4: the three foods in the real level', () => {
  /** A perfect run (jumps potholes only, lets hazards meet the foods), with every event. */
  function perfectRun(level: Level, jumpHazards: (x: number) => boolean): { run: Run; ev: { step: number; e: RunEvent }[] } {
    const run = new Run(level);
    const gaps = level.ground.slice(1).map((s, i) => ({ a: level.ground[i]![1], b: s[0] }));
    const ev: { step: number; e: RunEvent }[] = [];
    let holding = false;
    let second = false;
    for (let i = 0; i < 60 * 120 && run.phase === 'run'; i++) {
      const h = run.hero;
      if (h.grounded && !holding) {
        const gap = gaps.find((g) => g.a - h.x > 0 && g.a - h.x < 30);
        const z = run.hazards.find((q) => (q.mode === 'move' || q.mode === 'wait') && q.x - h.x > 0 && q.x - h.x < 70 && jumpHazards(q.x0));
        if (gap || z) {
          run.press();
          holding = true;
          second = !!gap && gap.b - gap.a > 110;
        }
      } else if (holding && h.vy >= 0) {
        run.release();
        holding = false;
        if (second) {
          run.press();
          holding = true;
          second = false;
        }
      }
      for (const e of run.step(DT)) ev.push({ step: run.steps, e });
    }
    return { run, ev };
  }

  it('garri at 5900 is spent on the goat at 6400: exactly one hit taken, no life lost, 1.2 s safe', () => {
    const { run, ev } = perfectRun(L1, (x) => x !== 6400);
    const pops = ev.filter((x) => x.e.type === 'shieldPop');
    expect(pops).toHaveLength(1);
    expect(ev.filter((x) => x.e.type === 'hit')).toHaveLength(0);
    expect(run.lives).toBe(3);
    expect(run.phase).toBe('arena');
  });

  it('corn lasts exactly 6 s and amala exactly 7 s; each warns 2 s before and ticks', () => {
    const { ev } = perfectRun(L1, () => true);
    for (const [kind, len] of [['corn', 6], ['amala', 7]] as const) {
      const start = ev.find((x) => x.e.type === 'food' && x.e.kind === kind)!.step;
      const end = ev.find((x) => x.e.type === 'powerEnd' && x.e.kind === kind)!.step;
      const warn = ev.find((x) => x.e.type === 'wearingOff' && x.e.kind === kind)!.step;
      expect(end - start).toBe(len * 60);
      expect(end - warn).toBe(2 * 60);
      const ticks = ev.filter((x) => x.e.type === 'tick' && x.step > warn - 1 && x.step < end).map((x) => end - x.step);
      expect(ticks).toEqual([120, 60]);
    }
  });

  it('amala smashes the goats and tyre at 10000, 10300 and 10550 for +2 kobo each, and is over before the arena', () => {
    const { run, ev } = perfectRun(L1, (x) => x < 9650);
    const smashes = ev.filter((x) => x.e.type === 'smash');
    expect(smashes.map((x) => (x.e as { kind: string }).kind)).toEqual(['goat', 'tyre', 'goat']);
    expect(ev.filter((x) => x.e.type === 'hit')).toHaveLength(0);
    // Goats are never hurt: they run off, then leave.
    for (const z of run.hazards.filter((q) => q.kind === 'goat' && q.x0 >= 10000)) expect(['runAway', 'gone']).toContain(z.mode);
    const end = ev.find((x) => x.e.type === 'powerEnd' && x.e.kind === 'amala')!.step;
    const arena = ev.find((x) => x.e.type === 'arena')!.step;
    expect((arena - end) / 60).toBeGreaterThan(1);
    expect(run.power.amala).toBe(0);
  });

  it('a second garri while shielded gives nothing extra: still exactly one hit', () => {
    const lvl = withLevel({
      ground: [[-400, 20000]],
      foods: [[300, 272, 'garri'], [400, 272, 'garri']],
      hazards: [['goat', 1000], ['goat', 1400]],
      hints: [],
    });
    const run = new Run(lvl);
    const ev: RunEvent[] = [];
    while (run.hero.x < 1600 && run.phase === 'run') ev.push(...run.step(DT));
    expect(ev.filter((e) => e.type === 'shieldPop')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(run.lives).toBe(2);
  });

  it('a second amala restarts its timer', () => {
    const lvl = withLevel({ ground: [[-400, 20000]], foods: [[300, 272, 'amala'], [600, 272, 'amala']], hazards: [], hints: [] });
    const run = new Run(lvl);
    while (!run.foods[1]!.taken) run.step(DT);
    expect(run.power.amala).toBe(RULES.amalaSteps);
  });
});

describe('break it: dying exactly as a food is picked up', () => {
  // The hazard stands still (wakeDistance 0) exactly where the hero's box first touches it on
  // the same step as the food: food at 600 is touched at hero x 579, the hazard at x - 7 - halfW.
  const sameSpot = (kind: string, hazard: 'goat' | 'tyre') =>
    withLevel({
      ground: [[-400, 20000]],
      wakeDistance: 0,
      foods: [[600, 272, kind]],
      hazards: [[hazard, 579 + RULES.heroHalfW + HAZARD_BOX[hazard].halfW]],
      hints: [],
      kobo: [],
    });
  /** Steps until the food is taken; that step's events. */
  const toFood = (run: Run): RunEvent[] => {
    for (;;) {
      const ev = run.step(DT);
      if (ev.some((e) => e.type === 'food')) return ev;
      if (run.phase !== 'run') throw new Error('stopped before the food');
    }
  };

  it('garri and a goat on the same step, on the last life: the new shield takes the hit', () => {
    const run = new Run(sameSpot('garri', 'goat'));
    run.lives = 1;
    const ev = toFood(run);
    expect(ev.map((e) => e.type)).toEqual(['food', 'shieldPop']);
    while (run.hero.x < 800 && run.phase === 'run') run.step(DT);
    expect(run.phase).toBe('run');
    expect(run.lives).toBe(1);
  });

  it('amala and a tyre together on the last life: smashed, not a life', () => {
    const run = new Run(sameSpot('amala', 'tyre'));
    run.lives = 1;
    expect(toFood(run).map((e) => e.type)).toEqual(['food', 'smash']);
    while (run.hero.x < 800 && run.phase === 'run') run.step(DT);
    expect(run.phase).toBe('run');
    expect(run.lives).toBe(1);
  });

  it('corn and a goat together on the last life: game over, the run stops cleanly, timers stop', () => {
    const run = new Run(sameSpot('corn', 'goat'));
    run.lives = 1;
    const ev = toFood(run);
    expect(ev.map((e) => e.type)).toEqual(['food', 'hit', 'gameOver']);
    expect(run.phase).toBe('over');
    const left = run.power.corn;
    expect(run.step(DT)).toEqual([]);
    expect(run.power.corn).toBe(left);
  });

  it('a food over the far edge of a pothole is not taken by a hero who falls; it is there after the restart', () => {
    const lvl = withLevel({ ground: [[-400, 700], [760, 20000]], foods: [[740, 290, 'corn']], hazards: [], hints: [], kobo: [], checkpoint: 300 });
    const run = new Run(lvl);
    const ev: RunEvent[] = [];
    while (run.lives === 3) ev.push(...run.step(DT));
    expect(run.hero.x).toBe(300);
    expect(run.power.corn).toBe(0);
    expect(run.foods[0]!.taken).toBe(false);
  });
});

describe('a fall on the last life', () => {
  it('ends food effects too (design: "After a fall, food effects end"), so the HUD does not show "Shield" with 0 lives', () => {
    const lvl = withLevel({ ground: [[-400, 700], [760, 20000]], foods: [[300, 272, 'garri']], hazards: [], hints: [], kobo: [] });
    const run = new Run(lvl);
    run.lives = 1;
    while (run.phase === 'run') run.step(DT);
    expect(run.phase).toBe('over');
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
  });
});

describe('Q14 in the real level: a fall after the bus stop', () => {
  it('back at the bus stop with one life fewer; garri and the 6400 goat come back; kobo stay counted and gone', () => {
    const run = new Run(L1);
    const gaps = L1.ground.slice(1).map((s, i) => ({ a: L1.ground[i]![1], b: s[0] }));
    let holding = false;
    let second = false;
    // Jump everything until x 6600, then stop: the 50 pothole at 6700 takes a life.
    while (run.lives === 3 && run.phase === 'run') {
      const h = run.hero;
      if (h.grounded && !holding && h.x < 6600) {
        const gap = gaps.find((g) => g.a - h.x > 0 && g.a - h.x < 30);
        const z = run.hazards.find((q) => (q.mode === 'move' || q.mode === 'wait') && q.x - h.x > 0 && q.x - h.x < 70);
        if (gap || z) {
          run.press();
          holding = true;
          second = !!gap && gap.b - gap.a > 110;
        }
      } else if (holding && h.vy >= 0) {
        run.release();
        holding = false;
        if (second) {
          run.press();
          holding = true;
          second = false;
        }
      }
      run.step(DT);
      if (run.hero.x > 6000 && run.hero.x < 6100) {
        expect(run.power.shield).toBe(true);
      }
    }
    const koboAtFall = run.kobo;
    expect(run.lives).toBe(2);
    expect(run.hero.x).toBe(5600);
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
    expect(run.foods.find((f) => f.kind === 'garri')!.taken).toBe(false);
    const goat = run.hazards.find((z) => z.x0 === 6400)!;
    expect(goat).toMatchObject({ x: 6400, mode: 'wait' });
    // The goat at 4950 (before the bus stop), jumped earlier, stays where it went.
    const coinsBefore = run.coins.filter((c) => c.taken).length;
    expect(coinsBefore).toBe(koboAtFall);
    // Run on to 6000: coins between 5600 and 6000 were taken, so the count does not rise there.
    while (run.hero.x < 5950) run.step(DT);
    expect(run.kobo).toBe(koboAtFall);
    expect(run.power.shield).toBe(true); // the garri came back and was picked up again
  });
});
