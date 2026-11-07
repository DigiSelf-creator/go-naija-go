/**
 * qa E5 / F3: General Go-Slow on the real level data, played by sloppy "first-timer" bots,
 * plus break-it cases forced on the rules (amala in the arena, last life to a honk cloud).
 *
 * The sloppy bot is the e2e boss bot (tests/e2e/bot.ts) with human timing error: it sees
 * the jump it wants, but every press and every release lands up to jitter ms early or late
 * (uniform), and it aims for the middle of that window. Thresholds were set before the
 * first run, from the designer rule "a first-timer finishes in 3 tries or fewer":
 * at +/-80 ms a try wins at least 70% of the time; at +/-150 ms at least 50% (so 3 tries
 * finish about 87% of the time or better).
 */
import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { createBody, press, release, step, type Body, type Platform, type Terrain } from '../../src/engine/physics';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;

function atArena(gentle = false): Run {
  const lvl = parseLevel({ ...structuredClone(w1l1), spawnX: 10980, hazards: [], foods: [], kobo: [], hints: [] });
  const run = new Run(lvl, { gentle });
  while (run.phase === 'run') run.step(DT);
  expect(run.phase).toBe('arena');
  return run;
}

type Plan = 'tap' | 'hold' | 'holdAir';

/** Where a jump pressed after `delay` steps lands, with the arena turn-around. */
function landing(run: Run, plan: Plan, delay: number): Platform | null {
  const h = run.hero;
  const { turnLeftX, turnRightX } = run.level.arena;
  const terrain: Terrain = run.terrain;
  const b: Body = createBody(h.x, terrain);
  Object.assign(b, { y: h.y, prevY: h.y, vy: h.vy, dir: h.dir, speed: h.speed, grounded: h.grounded, airJump: h.airJump, coyote: h.grounded ? 5 : 0 });
  const tick = (): void => {
    if (b.dir === 1 && b.x >= turnRightX) b.dir = -1;
    else if (b.dir === -1 && b.x <= turnLeftX) b.dir = 1;
    step(b, terrain, DT);
  };
  for (let i = 0; i < delay; i++) tick();
  if (!b.grounded) return null;
  press(b);
  let stage = 0;
  for (let i = 0; i < 240; i++) {
    if (plan === 'tap' && stage === 0) {
      release(b);
      stage = 2;
    }
    if (stage < 2 && b.vy >= 0) {
      release(b);
      if (stage === 0 && plan === 'holdAir') {
        press(b);
        stage = 1;
      } else stage = 2;
    }
    tick();
    if (b.grounded) return b.on;
  }
  return null;
}

interface FightResult {
  won: boolean;
  livesLost: number;
  /** Seconds from the arena line to the third hit (the Win screen is 4.5 s later). */
  fightSecs: number;
  presses: number;
}

/** A sloppy player fights the boss from the arena line until win or game over. */
function sloppyFight(jitterMs: number, seed: number): FightResult {
  let s = seed;
  const rand = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const J = Math.round(jitterMs / (1000 / 60)); // steps
  const err = (): number => Math.round((rand() * 2 - 1) * J); // -J..+J
  const run = atArena();
  const boss = run.boss!;
  const lives0 = run.lives;
  const sameLight = (p: Platform | null): boolean => !!p && !!boss.litLight && p.x === boss.litLight.x && p.y === boss.litLight.y;

  // Pending finger actions (step number -> down/up).
  let pressAt = -1;
  let plan: Plan = 'tap';
  let stage = -1; // -1 idle; 0 rising on first press; 1 rising on second press
  let releaseAt = -1;
  let rePressAt = -1;
  let presses = 0;
  let defeatStep = -1;

  for (let n = 0; n < 60 * 240 && run.phase === 'arena'; n++) {
    const h = run.hero;
    if (boss.defeated && defeatStep < 0) defeatStep = boss.steps;
    if (!boss.defeated) {
      // Finger actions that come due this step.
      if (pressAt === n) {
        run.press();
        presses++;
        pressAt = -1;
        stage = 0;
        if (plan === 'tap') releaseAt = n + 1 + Math.max(0, err());
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
        if (stage === 0 && plan === 'holdAir') rePressAt = n + 1 + Math.max(0, err());
        else stage = -1;
      }
      // Holding: meant to let go at the top; lands up to J steps early or late.
      if (stage >= 0 && plan !== 'tap' && releaseAt < 0 && rePressAt < 0 && h.vy >= -1152 * (J / 60)) {
        releaseAt = n + J + err();
        if (releaseAt <= n) releaseAt = n + 1;
      }
      if (h.grounded && stage >= 0 && releaseAt < 0 && rePressAt < 0 && pressAt < 0) stage = -1;

      // Decide a new jump: only when idle and on the ground.
      if (stage < 0 && pressAt < 0 && releaseAt < 0 && h.grounded) {
        const ahead = J; // aims J steps ahead, then the press arrives 0..2J steps later
        const tyre = boss.throws.find((t) => {
          if (t.kind !== 'tyre') return false;
          const rel = (t.x + t.vx * (ahead / 60) - (h.x + h.dir * h.speed * (ahead / 60))) * h.dir;
          return (rel > 0 && rel < 75) || (rel <= 0 && rel > -34);
        });
        const honkNear = boss.throws.some((t) => t.kind === 'honk' && Math.abs(t.x - h.x) < 110);
        if (tyre && !honkNear) {
          plan = 'hold';
          pressAt = n + 1 + J + err();
          if (pressAt <= n) pressAt = n + 1;
        } else if (boss.litLight && !honkNear) {
          for (const p of ['tap', 'hold', 'holdAir'] as const) {
            if (sameLight(landing(run, p, ahead))) {
              plan = p;
              pressAt = n + 1 + J + err();
              if (pressAt <= n) pressAt = n + 1;
              break;
            }
          }
        }
      }
    }
    run.step(DT);
  }
  return {
    won: run.phase === 'won',
    livesLost: lives0 - run.lives,
    fightSecs: defeatStep >= 0 ? defeatStep / 60 : NaN,
    presses,
  };
}

function trials(jitterMs: number, n: number) {
  const res = Array.from({ length: n }, (_, i) => sloppyFight(jitterMs, 1000 + i * 7919));
  const wins = res.filter((r) => r.won);
  const secs = wins.map((r) => r.fightSecs).sort((a, b) => a - b);
  const pct = (q: number): number => secs[Math.min(secs.length - 1, Math.floor(q * secs.length))] ?? NaN;
  const lost = wins.reduce((a, r) => a + r.livesLost, 0) / Math.max(1, wins.length);
  const summary = {
    jitterMs,
    trials: n,
    winRate: wins.length / n,
    fightSecsMedian: pct(0.5),
    fightSecsP90: pct(0.9),
    fightSecsMax: secs.at(-1) ?? NaN,
    livesLostPerWin: Math.round(lost * 100) / 100,
  };
  console.log(`sloppy boss bot ${JSON.stringify(summary)}`);
  return summary;
}

describe('qa: a first-timer can beat General Go-Slow (sloppy boss bot, 3 lives, from the arena line)', () => {
  it('a bot with no timing error always wins without losing a life (sanity check of the bot)', () => {
    const r = sloppyFight(0, 1);
    expect(r.won).toBe(true);
    expect(r.livesLost).toBe(0);
  });

  it('+/-80 ms: wins at least 70% of tries', () => {
    const t = trials(80, 120);
    expect(t.winRate).toBeGreaterThanOrEqual(0.7);
  }, 120_000);

  it('+/-150 ms: wins at least 50% of tries (3 tries then finish about 87% of the time)', () => {
    const t = trials(150, 120);
    expect(t.winRate).toBeGreaterThanOrEqual(0.5);
  }, 120_000);
});

describe('qa break it in the arena', () => {
  it('amala forced on at the arena line: smashes throws for 2 kobo, never hurts the boss, ends on time with its warning', () => {
    const lvl = parseLevel({ ...structuredClone(w1l1), spawnX: 10900, hazards: [], foods: [], kobo: [], hints: [] });
    const run = new Run(lvl);
    // Amala picked up 1 s before the line: 6 s left at the arena.
    run.power.amala = RULES.amalaSteps;
    const ev: { e: RunEvent; step: number }[] = [];
    let stepAtArena = -1;
    for (let i = 0; i < 60 * 12; i++) {
      for (const e of run.step(DT)) {
        ev.push({ e, step: run.steps });
        if (e.type === 'arena') stepAtArena = run.steps;
      }
    }
    expect(stepAtArena).toBeGreaterThan(0);
    const boss = run.boss!;
    // The hero just runs on the road: the first tyre at 2.0 s reaches it while amala is on.
    const smashes = ev.filter((x) => x.e.type === 'smash');
    expect(smashes.length).toBeGreaterThanOrEqual(1);
    expect(boss.hits).toBe(0);
    expect(boss.lit).toBe(0);
    // Ends exactly 7 s after it started, with the warning 2 s before.
    const warn = ev.find((x) => x.e.type === 'wearingOff');
    const end = ev.find((x) => x.e.type === 'powerEnd');
    expect(warn?.step).toBe(RULES.amalaSteps - RULES.warnSteps);
    expect(end?.step).toBe(RULES.amalaSteps);
    expect(run.power.amala).toBe(0);
    // Kobo: 2 per smash, nothing else.
    expect(run.kobo).toBe(smashes.length * RULES.smashKobo);
    // After amala ends, throws hurt again.
    expect(run.lives).toBeLessThan(3);
  });

  it('amala on the last hit: the boss is still beaten only by the green light, and the win comes on time', () => {
    const run = atArena();
    const boss = run.boss!;
    for (const i of [0, 1, 2]) {
      while (boss.lit !== i) {
        run.step(DT);
        run.safe = 10;
      }
      run.power.amala = RULES.amalaSteps;
      const p = boss.litLight!;
      const h = run.hero;
      h.x = p.x + p.w / 2;
      h.y = h.prevY = p.y - 20;
      h.vy = 60;
      h.grounded = false;
      for (let k = 0; k < 30 && boss.hits === i; k++) run.step(DT);
      expect(boss.hits).toBe(i + 1);
    }
    expect(boss.defeated).toBe(true);
    let won = -1;
    for (let k = 0; k < 60 * 6 && won < 0; k++) if (run.step(DT).some((e) => e.type === 'win')) won = k + 1;
    // 4.5 s after the third hit, to the step.
    expect(Math.abs(won - 4.5 * 60)).toBeLessThanOrEqual(1);
    expect(run.phase).toBe('won');
  });

  it('last life lost to a honk cloud: game over, food effects gone, the boss and its throws stop', () => {
    const run = atArena();
    const boss = run.boss!;
    run.lives = 1;
    // Get to phase 3 (tyre, tyre, honk) and wait for a honk cloud.
    for (const i of [0, 1]) {
      while (boss.lit !== i) {
        run.step(DT);
        run.safe = 10;
      }
      const p = boss.litLight!;
      Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y - 20, prevY: p.y - 20, vy: 60, grounded: false });
      for (let k = 0; k < 30 && boss.hits === i; k++) run.step(DT);
    }
    let cloud = boss.throws.find((t) => t.kind === 'honk');
    for (let k = 0; k < 60 * 10 && !cloud; k++) {
      run.step(DT);
      run.safe = 10;
      boss.throws = boss.throws.filter((t) => t.kind === 'honk');
      cloud = boss.throws.find((t) => t.kind === 'honk');
    }
    expect(cloud).toBeTruthy();
    run.safe = 0;
    // On the road just in front of it, then a jump straight into it.
    Object.assign(run.hero, { x: cloud!.x - 10, y: 300, prevY: 300, vy: 0, grounded: true, on: null, dir: 1 });
    run.press();
    const ev: RunEvent[] = [];
    for (let k = 0; k < 30 && run.phase === 'arena'; k++) ev.push(...run.step(DT));
    expect(ev.map((e) => e.type)).toEqual(expect.arrayContaining(['hit', 'gameOver']));
    expect(run.phase).toBe('over');
    expect(run.lives).toBe(0);
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
    const frozen = JSON.stringify(boss.throws);
    const steps = boss.steps;
    expect(run.step(DT)).toEqual([]);
    expect(boss.steps).toBe(steps);
    expect(JSON.stringify(boss.throws)).toBe(frozen);
    expect(run.press()).toBe(null);
  });
});
