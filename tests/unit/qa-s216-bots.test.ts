/**
 * qa (S2.16 B4 done check 3, B1 and B5 check 4): sloppy two-thumb bots on the rules play streets
 * 2 and 3 from the start to the bus. Every press and release lands up to `jitter` steps late,
 * from a seeded random, and the bot reads pits from the run's own ground (so in Gentle mode it
 * sees the cement blocks' two 100 u halves, as a player does).
 * - Gentle mode: the dash is turned on (saved) but the bot never double taps, never dashes, and
 *   still reaches the bus with lives to spare.
 * - Normal mode: the bot dashes before a dash gap, as street 2's hint teaches.
 */
import { describe, expect, it } from 'vitest';
import lagos2 from '../../src/data/levels/lagos-2.json';
import lagos3 from '../../src/data/levels/lagos-3.json';
import { parseLevel, type Level } from '../../src/game/level';
import { Run } from '../../src/game/run';

const DT = 1 / 60;
const L2 = parseLevel(structuredClone(lagos2));
const L3 = parseLevel(structuredClone(lagos3));

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface Result {
  run: Run;
  lostAt: number[];
  dashed: boolean;
  secs: number;
}

function sloppyBot(level: Level, opts: { gentle: boolean; useDash: boolean; jitter: number; seed: number }): Result {
  const run = new Run(level, { dash: true, gentle: opts.gentle });
  const rand = rng(opts.seed);
  const late = (): number => Math.floor(rand() * (opts.jitter + 1));
  const lostAt: number[] = [];
  let dashed = false;
  run.steer(1);
  let holding = false;
  let second = false;
  /** Steps until the planned press or release lands. */
  let pressIn = -1;
  let releaseIn = -1;
  let i = 0;
  for (; i < 60 * 400 && run.phase === 'run'; i++) {
    const h = run.hero;
    run.viewLeft = h.x - 747 * 0.3;
    run.viewRight = run.viewLeft + 747;
    const g = run.terrain.ground;
    const gaps = g.slice(1).map((s, k) => [g[k]!.x1, s.x0] as const);
    if (pressIn === 0) {
      run.press();
      holding = true;
    }
    if (releaseIn === 0) {
      run.release();
      holding = false;
      if (second && !h.grounded) {
        pressIn = late();
        second = false;
        if (pressIn === 0) {
          run.press();
          holding = true;
        }
      }
    }
    if (pressIn >= 0) pressIn--;
    if (releaseIn >= 0) releaseIn--;
    if (holding && releaseIn < 0 && (h.vy >= 0 || h.grounded)) releaseIn = late();
    else if (!holding && pressIn < 0 && releaseIn < 0 && h.grounded) {
      if (opts.useDash && run.dashOn && !run.dashing && gaps.some(([a, b]) => b - a >= 250 && a - h.x > 0 && a - h.x < 300)) run.dash(1);
      const big = gaps.find(([a, b]) => b - a >= 160 && a - h.x > -4 && a - h.x < 10 + h.speed * 0.03);
      const gap = big ?? gaps.find(([a, b]) => b - a < 160 && a - h.x > -4 && a - h.x < 32);
      const hazard = run.hazards.find((z) => (z.mode === 'wait' || z.mode === 'move') && z.x - h.x > 0 && z.x - h.x < 80);
      const weeds = run.gutters.find((q) => q.state === 'weeds' && q.x - h.x > 0 && q.x - h.x < 30);
      if (gap || hazard || weeds) {
        pressIn = late();
        second = !!gap && gap[1] - gap[0] > 90;
      }
    }
    const lives = run.lives;
    run.step(DT);
    if (run.dashing) dashed = true;
    if (run.lives < lives) lostAt.push(Math.round(h.x));
    run.steer(1);
  }
  return { run, lostAt, dashed, secs: i * DT };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('qa: sloppy bots (up to 100 ms late) on streets 2 and 3 after S2.16', () => {
  it.each([L2, L3])('Gentle mode, $id: reaches the bus without ever dashing, over the cement blocks', (L) => {
    for (const seed of SEEDS) {
      const r = sloppyBot(L, { gentle: true, useDash: false, jitter: 6, seed });
      expect(r.dashed, `${L.id} seed ${seed}`).toBe(false);
      expect(r.run.phase, `${L.id} seed ${seed}: lost lives at ${r.lostAt.join(', ')}`).toBe('bus');
      expect(r.run.lives, `${L.id} seed ${seed}: lost lives at ${r.lostAt.join(', ')}`).toBeGreaterThanOrEqual(3);
    }
  });

  it.each([L2, L3])('Normal mode, $id: reaches the bus, dashing at the dash gap', (L) => {
    const lines: string[] = [];
    for (const seed of SEEDS) {
      const r = sloppyBot(L, { gentle: false, useDash: true, jitter: 6, seed });
      lines.push(`seed ${seed}: ${r.run.phase} in ${r.secs.toFixed(1)} s, lives ${r.run.lives}, lost at ${r.lostAt.join(', ') || 'none'}`);
      expect(r.dashed, `${L.id} seed ${seed}`).toBe(true);
      expect(r.run.phase, `${L.id} seed ${seed}: lost lives at ${r.lostAt.join(', ')}`).toBe('bus');
    }
    console.log(`${L.id} sloppy bots:\n${lines.join('\n')}`);
  });
});
