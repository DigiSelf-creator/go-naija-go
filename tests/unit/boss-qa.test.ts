/**
 * qa E5 / F3, moved to Go-Slow Hall by piece M2 (w1-l1 retired): General Go-Slow on the real
 * hall file, played by sloppy "first-timer" bots that move the hero (tests/unit/hall-bot.ts,
 * the shared plan in tests/e2e/hall-brain.ts), plus break-it cases forced on the rules.
 *
 * Every press, release and change of direction lands up to jitter ms early or late. Thresholds
 * from the designer rule "the hall alone should be beatable in three tries by a player who
 * finished street 3" (S2.7): at +/-80 ms a try wins at least 70% of the time; at +/-150 ms at
 * least 50% (3 tries then finish about 87% of the time or better). All without the parcel.
 */
import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';
import { fightHall } from './hall-bot';

const DT = 1 / 60;
const HALL = parseLevel(hallData);

function trials(jitterMs: number, n: number, parcel = false) {
  const res = Array.from({ length: n }, (_, i) => fightHall(new Run(HALL, { parcel }), jitterMs, 1000 + i * 7919));
  const wins = res.filter((r) => r.won);
  const secs = wins.map((r) => r.fightSecs).sort((a, b) => a - b);
  const pct = (q: number): number => secs[Math.min(secs.length - 1, Math.floor(q * secs.length))] ?? NaN;
  const summary = {
    jitterMs,
    parcel,
    trials: n,
    winRate: wins.length / n,
    fightSecsMedian: pct(0.5),
    fightSecsP90: pct(0.9),
    livesLostPerTry: Math.round((res.reduce((a, r) => a + r.livesLost, 0) / n) * 100) / 100,
    shieldsUsedPerTry: Math.round((res.reduce((a, r) => a + r.shieldsUsed, 0) / n) * 100) / 100,
  };
  console.log(`sloppy hall bot ${JSON.stringify(summary)}`);
  return summary;
}

describe('qa: the hall is beatable without the parcel (sloppy hall bot, 3 lives, from the door)', () => {
  it('a bot with no timing error always wins without losing a life (sanity check of the bot)', () => {
    const r = fightHall(new Run(HALL), 0, 1);
    expect(r.won).toBe(true);
    expect(r.livesLost).toBe(0);
  });

  it('+/-80 ms: wins at least 70% of tries', () => {
    expect(trials(80, 120).winRate).toBeGreaterThanOrEqual(0.7);
  }, 120_000);

  it('+/-150 ms: wins at least 50% of tries', () => {
    expect(trials(150, 120).winRate).toBeGreaterThanOrEqual(0.5);
  }, 120_000);

  it('the parcel helps but is not needed: +/-150 ms with the parcel wins at least as often', () => {
    const without = trials(150, 60);
    const withIt = trials(150, 60, true);
    expect(withIt.winRate).toBeGreaterThanOrEqual(without.winRate);
  }, 120_000);
});

/** Lands on the lit light by dropping the hero onto it. */
function hitLit(run: Run): void {
  const boss = run.boss!;
  const i = boss.hits;
  while (boss.lit !== i) {
    run.step(DT);
    run.safe = 10;
  }
  const p = boss.litLight!;
  Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y - 20, prevY: p.y - 20, vy: 60, vx: 0, grounded: false, on: null });
  for (let k = 0; k < 30 && boss.hits === i; k++) run.step(DT);
  expect(boss.hits).toBe(i + 1);
}

describe('qa break it in the hall', () => {
  it('amala forced on (none lies in the hall): smashes throws for 2 kobo, never hurts the boss, ends on time', () => {
    const run = new Run(HALL);
    run.power.amala = RULES.amalaSteps;
    Object.assign(run.hero, { x: 300 });
    const ev: { e: RunEvent; step: number }[] = [];
    for (let i = 0; i < 60 * 12; i++) for (const e of run.step(DT)) ev.push({ e, step: run.steps });
    const smashes = ev.filter((x) => x.e.type === 'smash');
    expect(smashes.length).toBeGreaterThanOrEqual(1);
    expect(run.boss!.hits).toBe(0);
    expect(ev.find((x) => x.e.type === 'wearingOff')?.step).toBe(RULES.amalaSteps - RULES.warnSteps);
    expect(ev.find((x) => x.e.type === 'powerEnd')?.step).toBe(RULES.amalaSteps);
    expect(run.kobo).toBe(smashes.length * RULES.smashKobo);
    // After amala ends, throws hurt again.
    expect(run.lives).toBeLessThan(3);
  });

  it('the Win screen comes 6.0 s after the third hit, to the step', () => {
    const run = new Run(HALL);
    for (let i = 0; i < 3; i++) hitLit(run);
    expect(run.boss!.defeated).toBe(true);
    let won = -1;
    for (let k = 0; k < 60 * 7 && won < 0; k++) if (run.step(DT).some((e) => e.type === 'win')) won = k + 1;
    expect(Math.abs(won - 6.0 * 60)).toBeLessThanOrEqual(1);
    expect(run.phase).toBe('won');
  });

  it('last life lost to a high honk on the right light: game over, the boss and its throws stop', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    run.lives = 1;
    hitLit(run);
    hitLit(run);
    let peep = boss.throws.find((t) => t.kind === 'highHonk');
    for (let k = 0; k < 60 * 10 && !peep; k++) {
      run.step(DT);
      run.safe = 10;
      boss.throws = boss.throws.filter((t) => t.kind === 'highHonk');
      peep = boss.throws.find((t) => t.kind === 'highHonk');
    }
    expect(peep).toBeTruthy();
    // Standing on the (dark) right light in its way.
    const p = run.level.boss!.lights[1]!;
    Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y, prevY: p.y, vy: 0, vx: 0, grounded: true, on: p });
    run.safe = 0;
    const ev: RunEvent[] = [];
    for (let k = 0; k < 120 && run.phase === 'arena'; k++) ev.push(...run.step(DT));
    expect(ev.map((e) => e.type)).toEqual(expect.arrayContaining(['hit', 'gameOver']));
    expect(run.phase).toBe('over');
    expect(run.power).toEqual({ corn: 0, amala: 0, shield: false });
    const frozen = JSON.stringify(boss.throws);
    const steps = boss.steps;
    expect(run.step(DT)).toEqual([]);
    expect(boss.steps).toBe(steps);
    expect(JSON.stringify(boss.throws)).toBe(frozen);
    expect(run.press()).toBe(null);
  });
});
