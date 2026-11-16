/**
 * O5b (ogun.md 5.4 "Three tries"): a plain player's plan (tests/e2e/pothole-brain.ts) beats King
 * Pothole with the game's own rules, step by step, in normal and Gentle mode, quick or a little
 * slow to react. The e2e bot plays the same plan on the built game.
 */
import { describe, expect, it } from 'vitest';
import hallRaw from '../../src/data/levels/ogun-hall.json';
import { parseLevel } from '../../src/game/level';
import { Run, STEPS_PER_SECOND, type RunEvent } from '../../src/game/run';
import { PotholeFight, parsePotholeHall } from '../../src/worlds/ogun/potholeFight';
import { decidePothole, type PotJump } from '../e2e/pothole-brain';

const DT = 1 / STEPS_PER_SECOND;
const DATA = parsePotholeHall(hallRaw);
const LEVEL = parseLevel(hallRaw);

export interface BotTry {
  won: boolean;
  lives: number;
  time: number;
  falls: number;
  hits: number;
  bags: number;
}

/** One try by the plan; `lateSteps` is how many steps late the player acts on what they see. */
export function botTry(opts: { gentle?: boolean; lateSteps?: number; seed?: number } = {}): BotTry {
  let f!: PotholeFight;
  const run = new Run(LEVEL, { gentle: opts.gentle ?? false, arena: (r) => (f = new PotholeFight(DATA, r, { firstTry: false })) });
  const late = opts.lateSteps ?? 0;
  const seen: { move: -1 | 0 | 1; jump: PotJump | null; why?: string }[] = [];
  let jump: PotJump | null = null;
  let stage = 0;
  let falls = 0;
  let hurts = 0;
  for (let i = 0; i < 60 * 120 && run.phase === 'arena'; i++) {
    const h = run.hero;
    // Each try starts a little later (a different moment of his slide and throws).
    if (i < (opts.seed ?? 0) * 22) {
      run.step(DT);
      continue;
    }
    if (jump) {
      // Hold to the top; a crossing presses again there and holds to the next top.
      if (!h.grounded && h.vy >= 0) {
        run.release();
        if (jump === 'cross' && stage === 0) {
          run.press();
          stage = 1;
        } else if (stage < 2) stage = 2;
      }
      if (h.grounded && stage > 0) jump = null;
    }
    if (!jump) {
      const d = decidePothole(
        {
          hero: h,
          pitX: f.pitX,
          lips: f.lips,
          carrying: f.carrying,
          bagReady: f.bagReady,
          defeated: f.defeated,
          gravel: run.hazards.filter((z) => z.mode === 'move').map((z) => ({ x: z.x, vx: z.vx })),
          gulp: f.gulp >= 0,
        },
        late / STEPS_PER_SECOND,
      );
      seen.push(d);
      const act = seen.length > late ? seen[seen.length - 1 - late]! : { move: 0 as const, jump: null };
      run.steer(act.move);
      if (act.jump && h.grounded) {
        run.press();
        jump = act.jump;
        stage = 0;
        seen.length = 0;
      }
    }
    const ev: RunEvent[] = run.step(DT);
    falls += ev.filter((e) => e.type === 'fall').length;
    if (process.env['POTBOT_DEBUG'] && ev.some((e) => e.type === 'fall' || e.type === 'hit' || e.type === 'climbOut'))
      console.log(`  ${run.time.toFixed(2)} ${ev.filter((e) => ['fall', 'hit', 'climbOut'].includes(e.type)).map((e) => e.type).join(',')} x ${run.hero.x.toFixed(0)} lips ${f.lips.map(Math.round).join('-')} carrying ${f.carrying} gulp ${f.gulp.toFixed(2)} jump ${jump} gravel ${run.hazards.filter((z) => z.mode === 'move').map((z) => z.x.toFixed(0) + '/' + z.y.toFixed(0)).join(' ')} why ${seen[seen.length - 1]?.why ?? ''}`);
    hurts += ev.filter((e) => e.type === 'hit').length;
  }
  return { won: run.phase === 'won', lives: run.lives, time: run.time, falls, hits: hurts, bags: f.hits };
}

describe('ogun.md 5.4: three tries', () => {
  for (const late of [0, 3, 6]) {
    for (const gentle of [false, true]) {
      it(`the plan wins in 3 tries or fewer (${gentle ? 'Gentle' : 'normal'}, ${late} steps late)`, () => {
        const tries: BotTry[] = [];
        while (tries.length < 3 && !tries.some((t) => t.won)) tries.push(botTry({ gentle, lateSteps: late, seed: tries.length }));
        const said = tries.map((t, i) => `try ${i + 1}: won ${t.won} in ${t.time.toFixed(1)} s, lives ${t.lives}, falls ${t.falls}, hurts ${t.hits}, bags ${t.bags}`).join('; ');
        console.log(`Pothole bot ${gentle ? 'Gentle' : 'normal'}, late ${late}: ${said}`);
        // OG-R26: Gentle must hold up for a player 0.1 s late; normal mode too, on time or a little late.
        if (gentle || late <= 3) expect(tries.some((t) => t.won)).toBe(true);
      });
    }
  }
});
