import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { GROUND_Y, PHYSICS } from '../../src/engine/physics';
import { parseLevel, type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;

/** A small level in the same data shape as the real one. */
function level(patch: Record<string, unknown> = {}): Level {
  return parseLevel({
    id: 'test',
    name: 'Test road',
    groundY: 300,
    runSpeed: 156,
    spawnX: 0,
    koboSpacing: 24,
    wakeDistance: 520,
    hazardSpeeds: { goat: 36, tyre: 60 },
    ground: [[-400, 20000]],
    platforms: [],
    kobo: [],
    foods: [],
    hazards: [],
    hints: [],
    checkpoint: 5000,
    arena: { x: 19000, width: 560, turnLeftX: 19015, turnRightX: 19440 },
    boss: {},
    ...patch,
  });
}

/** Steps until a test is true (or a limit); returns every event seen. */
function runUntil(run: Run, done: (r: Run) => boolean, maxSteps = 60 * 60): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < maxSteps && !done(run); i++) all.push(...run.step(DT));
  return all;
}

const types = (ev: RunEvent[]) => ev.map((e) => e.type);

describe('kobo', () => {
  it('running through a row picks up every coin once and counts it', () => {
    const run = new Run(level({ kobo: [[200, 276, 5]] }));
    const ev = runUntil(run, (r) => r.hero.x > 400);
    expect(run.kobo).toBe(5);
    expect(types(ev).filter((t) => t === 'kobo')).toHaveLength(5);
    expect(run.coins.every((c) => c.taken)).toBe(true);
  });

  it('coins up high need a jump', () => {
    const run = new Run(level({ kobo: [[200, 180, 3]] }));
    runUntil(run, (r) => r.hero.x > 400);
    expect(run.kobo).toBe(0);
  });
});

describe('potholes', () => {
  it('falling in costs a life and starts again at the start', () => {
    const run = new Run(level({ ground: [[-400, 200], [300, 20000]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(types(ev)).toContain('fall');
    expect(run.lives).toBe(2);
    expect(run.phase).toBe('run');
    expect(run.hero.x).toBe(0);
    expect(run.hero.y).toBe(GROUND_Y);
  });

  it('after the bus stop, a fall starts again at the bus stop', () => {
    const run = new Run(level({ checkpoint: 300, ground: [[-400, 600], [700, 20000]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(types(ev)).toContain('checkpoint');
    expect(run.checkpointReached).toBe(true);
    expect(run.hero.x).toBe(300);
    // Lives do not refill at the bus stop.
    expect(run.lives).toBe(2);
  });

  it('no food saves you from a pothole', () => {
    const run = new Run(level({ foods: [[100, 272, 'garri'], [130, 272, 'amala']], ground: [[-400, 400], [500, 20000]] }));
    runUntil(run, (r) => r.power.shield && r.power.amala > 0);
    runUntil(run, (r) => r.lives < 3);
    expect(run.lives).toBe(2);
  });
});

describe('hazards', () => {
  it('stand still until 520 u ahead, then walk towards the hero', () => {
    const run = new Run(level({ hazards: [['goat', 1000], ['tyre', 3000]] }));
    const [goat, tyre] = run.hazards;
    runUntil(run, (r) => r.hero.x >= 1000 - 530);
    expect(goat!.mode).toBe('wait');
    runUntil(run, (r) => r.hero.x >= 1000 - 518);
    expect(goat!.mode).toBe('move');
    expect(goat!.x).toBeLessThan(1000);
    expect(goat!.vx).toBe(-36);
    expect(tyre!.mode).toBe('wait');
  });

  it('touching a goat from the side costs a life, then 1.7 s of safety', () => {
    const run = new Run(level({ hazards: [['goat', 600]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(types(ev)).toContain('hit');
    expect(run.safe).toBeGreaterThanOrEqual(RULES.hurtSafeSteps - 1);
    // Running on through the goat during the safe time costs nothing more.
    runUntil(run, () => false, 60);
    expect(run.lives).toBe(2);
  });

  it('a rolling tyre from the side costs a life', () => {
    const run = new Run(level({ hazards: [['tyre', 600]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(types(ev)).toContain('hit');
  });

  for (const kind of ['goat', 'tyre'] as const) {
    it(`landing on a ${kind} bounces you and costs nothing; the ${kind} is knocked away`, () => {
      const run = new Run(level({ hazards: [[kind, 600]] }));
      const z = run.hazards[0]!;
      // Tap so the feet come down on top of it. A tap is about 0.47 s up and back to its
      // height, while hero and hazard close in at 156 + its speed.
      const lead = kind === 'goat' ? 90 : 100;
      let jumped = false;
      const ev: RunEvent[] = [];
      for (let i = 0; i < 600 && !ev.some((e) => e.type === 'bounce'); i++) {
        if (!jumped && z.x - run.hero.x < lead) {
          run.press();
          run.release();
          jumped = true;
        }
        ev.push(...run.step(DT));
      }
      expect(types(ev)).toContain('bounce');
      expect(types(ev)).not.toContain('hit');
      expect(run.lives).toBe(3);
      expect(run.hero.vy).toBe(PHYSICS.bounceVy);
      expect(run.hero.airJump).toBe(true); // one air jump left after a bounce
      expect(z.mode).toBe(kind === 'goat' ? 'runAway' : 'gone');
      // The goat is never hurt: it trots away and then leaves.
      runUntil(run, () => false, RULES.goatRunAwaySteps + 5);
      expect(z.mode).toBe('gone');
      expect(run.lives).toBe(3);
    });
  }

  it('a goat turns back at a pothole edge and never falls in', () => {
    const run = new Run(level({ ground: [[-400, 900], [960, 20000]], hazards: [['goat', 1000]] }));
    const goat = run.hazards[0]!;
    runUntil(run, () => goat.vx > 0, 60 * 20);
    expect(goat.vx).toBe(36);
    expect(goat.x).toBeGreaterThanOrEqual(960 + HAZARD_BOX.goat.halfW - 1);
    expect(goat.mode).toBe('move');
  });

  it('a tyre drops into a pothole and is gone', () => {
    const run = new Run(level({ ground: [[-400, 1000], [1060, 20000]], hazards: [['tyre', 1100]] }));
    const tyre = run.hazards[0]!;
    runUntil(run, () => tyre.mode === 'gone', 60 * 20);
    expect(tyre.mode).toBe('gone');
  });
});

describe('lives and game over', () => {
  it('3 lives; at 0 the game is over and the run stops', () => {
    const run = new Run(level({ ground: [[-400, 200], [300, 20000]] }));
    expect(run.lives).toBe(3);
    const ev = runUntil(run, (r) => r.phase === 'over');
    expect(types(ev).filter((t) => t === 'fall')).toHaveLength(3);
    expect(types(ev).at(-1)).toBe('gameOver');
    expect(run.lives).toBe(0);
    const x = run.hero.x;
    expect(run.step(DT)).toEqual([]);
    expect(run.press()).toBe(null);
    expect(run.hero.x).toBe(x);
  });

  it('gentle mode gives 5 lives', () => {
    const run = new Run(level({ ground: [[-400, 200], [300, 20000]] }), { gentle: true });
    expect(run.lives).toBe(5);
    const ev = runUntil(run, (r) => r.phase === 'over');
    expect(types(ev).filter((t) => t === 'fall')).toHaveLength(5);
  });

  it('play again (a new run) resets lives, kobo, foods, hazards and the bus stop', () => {
    const data = { checkpoint: 400, kobo: [[100, 276, 3]], foods: [[200, 272, 'corn']], hazards: [['goat', 900]], ground: [[-400, 1200], [1300, 20000]] };
    const lvl = level(data);
    const first = new Run(lvl);
    runUntil(first, (r) => r.phase === 'over', 60 * 120);
    expect(first.phase).toBe('over');
    expect(first.kobo).toBeGreaterThan(0);
    expect(first.checkpointReached).toBe(true);
    const again = new Run(lvl);
    expect(again.lives).toBe(3);
    expect(again.kobo).toBe(0);
    expect(again.checkpointReached).toBe(false);
    expect(again.hero.x).toBe(0);
    expect(again.coins.some((c) => c.taken)).toBe(false);
    expect(again.foods.some((f) => f.taken)).toBe(false);
    expect(again.hazards.every((z) => z.mode === 'wait' && z.x === z.x0)).toBe(true);
    expect(again.power).toEqual({ corn: 0, amala: 0, shield: false });
  });
});

describe('after a fall (Q14)', () => {
  it('foods and hazards past the restart point come back, kobo taken do not', () => {
    const run = new Run(
      level({
        checkpoint: 100,
        kobo: [[300, 276, 4]],
        foods: [[500, 272, 'garri'], [50, 272, 'corn']],
        hazards: [['tyre', 1200]],
        ground: [[-400, 1300], [1400, 20000]],
      }),
    );
    // Take the coins and the garri, and let the tyre hit the shield.
    runUntil(run, (r) => r.hero.x > 1000);
    expect(run.kobo).toBe(4);
    expect(run.foods[1]!.taken).toBe(true);
    runUntil(run, (r) => r.lives < 3, 60 * 20);
    expect(run.hero.x).toBe(100); // back at the bus stop
    // Kobo stay counted and stay gone.
    expect(run.kobo).toBe(4);
    expect(run.coins.every((c) => c.taken)).toBe(true);
    // The garri (past the bus stop) is back; the corn (before it) is not.
    const garri = run.foods.find((f) => f.kind === 'garri')!;
    const corn = run.foods.find((f) => f.kind === 'corn')!;
    expect(garri.taken).toBe(false);
    expect(corn.taken).toBe(true);
    // The tyre is back where it started, waiting.
    expect(run.hazards[0]).toMatchObject({ x: 1200, mode: 'wait' });
    // Food effects ended, the shield too.
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
  });
});

describe('foods (piece D rules)', () => {
  it('corn: faster for 6 s, warns at 2 s, ticks, then ends', () => {
    const run = new Run(level({ foods: [[100, 272, 'corn']] }));
    const ev = runUntil(run, (r) => r.power.corn > 0);
    expect(ev.find((e) => e.type === 'food')).toMatchObject({ kind: 'corn' });
    run.step(DT);
    expect(run.hero.speed).toBe(PHYSICS.fastRunSpeed);
    const rest = runUntil(run, (r) => r.power.corn === 0);
    expect(types(rest).filter((t) => t !== 'kobo')).toEqual(['wearingOff', 'tick', 'tick', 'powerEnd']);
    expect(run.steps).toBeGreaterThanOrEqual(RULES.cornSteps);
    run.step(DT);
    expect(run.hero.speed).toBe(156);
  });

  it('garri: the shield takes one hit, then 1.2 s of safety; the next hit costs a life', () => {
    const run = new Run(level({ foods: [[100, 272, 'garri']], hazards: [['goat', 900], ['goat', 1700]] }));
    const ev = runUntil(run, (r) => r.hero.x > 1300);
    expect(types(ev)).toContain('shieldPop');
    expect(types(ev)).not.toContain('hit');
    expect(run.lives).toBe(3);
    expect(run.power.shield).toBe(false);
    runUntil(run, (r) => r.lives < 3, 60 * 20);
    expect(run.lives).toBe(2);
  });

  it('amala: smash through goats and tyres for 2 kobo each, no life lost', () => {
    const run = new Run(level({ foods: [[100, 272, 'amala']], hazards: [['goat', 500], ['tyre', 900]] }));
    const ev = runUntil(run, (r) => r.hero.x > 1000);
    expect(types(ev).filter((t) => t === 'smash')).toHaveLength(2);
    expect(run.kobo).toBe(4);
    expect(run.lives).toBe(3);
    expect(ev.filter((e) => e.type === 'smash').map((e) => (e as { kind: string }).kind)).toEqual(['goat', 'tyre']);
    expect(run.hazards[0]!.mode).not.toBe('move'); // the goat trotted off (never hurt)
  });

  it('a second corn restarts its timer', () => {
    const run = new Run(level({ foods: [[100, 272, 'corn'], [400, 272, 'corn']] }));
    runUntil(run, (r) => r.foods[1]!.taken);
    expect(run.power.corn).toBe(RULES.cornSteps);
  });
});

describe('hints, bus stop and arena', () => {
  it('each hint shows once per try, when the hero passes it', () => {
    const run = new Run(level({ hints: [[100, 'One.'], [300, 'Two.']], ground: [[-400, 500], [600, 20000]] }));
    const ev = runUntil(run, (r) => r.lives < 3);
    expect(ev.filter((e) => e.type === 'hint')).toEqual([
      { type: 'hint', words: 'One.' },
      { type: 'hint', words: 'Two.' },
    ]);
    const again = runUntil(run, (r) => r.lives < 2);
    expect(again.filter((e) => e.type === 'hint')).toEqual([]);
  });

  it('the run stops at the arena start', () => {
    const run = new Run(level({ arena: { x: 600, width: 560, turnLeftX: 615, turnRightX: 1040 } }));
    const ev = runUntil(run, (r) => r.phase === 'arena');
    expect(types(ev).at(-1)).toBe('arena');
    expect(run.hero.x).toBe(600);
    run.step(DT);
    expect(run.hero.x).toBe(600);
  });
});

describe('world 1 level 1 data', () => {
  it('can be run from start to arena by a simple player who jumps every hazard and pothole', () => {
    const lvl = parseLevel(w1l1);
    const run = new Run(lvl);
    const gaps = lvl.ground.slice(1).map((s, i) => ({ a: lvl.ground[i]![1], b: s[0] }));
    let holding = 0;
    let airPlanned = false;
    for (let i = 0; i < 60 * 120 && run.phase === 'run'; i++) {
      const h = run.hero;
      if (h.grounded && holding === 0) {
        const gap = gaps.find((g) => g.a - h.x > 0 && g.a - h.x < 30);
        const z = run.hazards.find((q) => (q.mode === 'move' || q.mode === 'wait') && q.x - h.x > 0 && q.x - h.x < 70);
        if (gap || z) {
          run.press();
          holding = 1;
          airPlanned = !!gap && gap.b - gap.a > 110;
        }
      } else if (holding > 0 && h.vy >= 0) {
        run.release();
        holding = 0;
        if (airPlanned) {
          run.press();
          holding = 1;
          airPlanned = false;
        }
      }
      run.step(DT);
    }
    expect(run.phase).toBe('arena');
    expect(run.lives).toBe(3);
    // Design: start x 80 to arena x 11000 is about 70 s (corn makes it a little shorter).
    expect(run.time).toBeGreaterThan(60);
    expect(run.time).toBeLessThan(75);
    expect(run.foods.every((f) => f.taken)).toBe(true);
  });
});
