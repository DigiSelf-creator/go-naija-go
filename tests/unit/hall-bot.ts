/**
 * A first-timer in Go-Slow Hall, played on the rules (no screen): the shared hall plan
 * (tests/e2e/hall-brain.ts) with human timing error. It sees what it wants to do, but every
 * press, release and change of direction lands up to `jitterMs` early or late (uniform), aimed
 * at the middle of that window.
 */
import { decide, type Plan } from '../e2e/hall-brain';
import { Run } from '../../src/game/run';

const DT = 1 / 60;

export interface HallFight {
  won: boolean;
  livesLost: number;
  shieldsUsed: number;
  /** Seconds from the start to the third hit (the Win screen is 6 s later). */
  fightSecs: number;
  presses: number;
}

export function fightHall(run: Run, jitterMs: number, seed: number, maxSecs = 240): HallFight {
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const J = Math.round(jitterMs / (1000 / 60)); // steps
  const late = (): number => 1 + J + Math.round((rand() * 2 - 1) * J); // the aim is J steps ahead
  const boss = run.boss!;
  const lives0 = run.lives;
  let shieldsUsed = 0;
  let presses = 0;
  let defeatStep = -1;

  // What the fingers will do, by step.
  let pressAt = -1;
  let plan: Plan = 'tap';
  let stage = -1; // -1 idle, 0 first press held, 1 second press held
  let releaseAt = -1;
  let rePressAt = -1;
  let moveAt = -1;
  let moveTo: -1 | 0 | 1 = 0;
  let held: -1 | 0 | 1 = 0;

  for (let n = 0; n < 60 * maxSecs && run.phase === 'arena'; n++) {
    const h = run.hero;
    if (boss.defeated && defeatStep < 0) defeatStep = run.steps;
    if (moveAt === n) {
      held = moveTo;
      run.steer(held);
      moveAt = -1;
    }
    if (pressAt === n) {
      run.press();
      presses++;
      pressAt = -1;
      stage = 0;
      if (plan === 'tap') releaseAt = n + 1 + Math.max(0, late() - 1 - J);
    }
    if (rePressAt === n) {
      run.press();
      presses++;
      rePressAt = -1;
      stage = 1;
    }
    if (releaseAt === n) {
      run.release();
      releaseAt = -1;
      if (stage === 0 && plan === 'holdAir') rePressAt = n + late();
      else stage = -1;
    }
    // Holding: meant to let go at the top.
    if (stage >= 0 && plan !== 'tap' && releaseAt < 0 && rePressAt < 0 && h.vy >= -1152 * (J / 60)) releaseAt = n + late();
    if (h.grounded && stage >= 0 && releaseAt < 0 && rePressAt < 0 && pressAt < 0) stage = -1;

    if (!boss.defeated && stage < 0 && pressAt < 0 && releaseAt < 0) {
      const d = decide(
        {
          hero: h,
          hits: boss.hits,
          lit: boss.lit,
          defeated: boss.defeated,
          throws: boss.throws,
          lights: run.level.boss!.lights,
          groundY: run.level.groundY,
          leftLimit: run.level.hall!.leftLimit,
          rightLimit: run.level.hall!.rightLimit,
        },
        J / 60,
      );
      if (d.move !== (moveAt >= 0 ? moveTo : held)) {
        moveTo = d.move;
        moveAt = n + late();
      }
      if (d.jump) {
        plan = d.jump;
        pressAt = n + late();
      }
    }
    const before = run.power.shield;
    run.step(DT);
    if (before && !run.power.shield && run.lives > 0) shieldsUsed++;
  }
  return { won: run.phase === 'won', livesLost: lives0 - run.lives, shieldsUsed, fightSecs: defeatStep >= 0 ? defeatStep / 60 : NaN, presses };
}
