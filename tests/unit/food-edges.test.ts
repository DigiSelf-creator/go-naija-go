/**
 * qa C7 and D4 edge cases on the rules (Run), no drawing: dying exactly as a food is picked up,
 * and a fall on the last life. Moved from level1-qa.test.ts when piece M2 retired the slice 1
 * level w1-l1 (its level-layout checks went with it); these now run on a small test street.
 */
import { describe, expect, it } from 'vitest';
import { type Level } from '../../src/game/level';
import { HAZARD_BOX, RULES, Run, type RunEvent } from '../../src/game/run';
import { autoLevel } from './auto-level';

const DT = 1 / 60;

function withLevel(patch: Record<string, unknown>): Level {
  return autoLevel({ platforms: [], ...patch });
}

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
    expect(ev.map((e) => e.type)).toEqual(['food', 'goatBump', 'shieldPop']);
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
    expect(ev.map((e) => e.type)).toEqual(['food', 'goatBump', 'hit', 'gameOver']);
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
