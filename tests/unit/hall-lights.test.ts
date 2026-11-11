/**
 * S2.14 part 1 (Tp: "it needs to be harder"): each hall light comes on later and stays green only
 * for a while. Light timeline, blink and ticks, the light words' events, landings on a dark or
 * blinking-out light, and the hall bot's clean win taking 18 s or more.
 */
import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import { goLightTickTimes } from '../../src/art/boss';
import { parseLevel } from '../../src/game/level';
import { Run, type RunEvent } from '../../src/game/run';
import { fightHall } from './hall-bot';

const DT = 1 / 60;
const HALL = parseLevel(hallData);
const L = HALL.boss!.lights;

/** Runs n steps, kept safe from throws; each event with the boss's step it came on. */
function timeline(run: Run, seconds: number): { t: number; e: RunEvent }[] {
  const out: { t: number; e: RunEvent }[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    for (const e of run.step(DT)) out.push({ t: run.boss!.steps / 60, e });
    run.safe = 10;
  }
  return out;
}
const at = (tl: { t: number; e: RunEvent }[], type: string) => tl.filter((x) => x.e.type === type).map((x) => Math.round(x.t * 100) / 100);

function dropOnto(run: Run, p: { x: number; y: number; w: number }): RunEvent[] {
  Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y - 20, prevY: p.y - 20, vy: 60, vx: 0, grounded: false, on: null });
  const all: RunEvent[] = [];
  for (let i = 0; i < 30 && !run.hero.grounded && !all.some((e) => e.type === 'bossHit'); i++) all.push(...run.step(DT));
  return all;
}

describe('the light timeline (S2.14 part 1)', () => {
  it('phase 1: dark at the start, on at 6.0 s, green 4.0 s, dark 4.4 s, on again at 14.4 s', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    expect(boss.lit).toBe(-1);
    const tl = timeline(run, 20);
    expect(at(tl, 'bossLight')).toEqual([6, 14.4]);
    expect(at(tl, 'bossLightOff')).toEqual([10, 18.4]);
    expect(tl.filter((x) => x.e.type === 'bossLight').map((x) => x.e)).toEqual([
      { type: 'bossLight', lit: 0, first: true },
      { type: 'bossLight', lit: 0, first: false },
    ]);
    expect(tl.filter((x) => x.e.type === 'bossLightOff').map((x) => x.e)).toEqual([
      { type: 'bossLightOff', lit: 0, first: true },
      { type: 'bossLightOff', lit: 0, first: false },
    ]);
    // Two throws are out before the light comes on (2.0 and 4.2 s), and the throw clock never waits for it.
    const throws = at(tl, 'bossThrow');
    expect(throws.filter((t) => t < 6)).toEqual([2, 4.2]);
    expect(throws.slice(0, 6)).toEqual([2, 4.2, 6.4, 8.6, 10.8, 13]);
  });

  it('the last 1.0 s blinks, with a tick at 1.0 and 0.5 s left', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    const tl = timeline(run, 6);
    expect(boss.lit).toBe(0);
    expect(boss.greenLeft).toBeCloseTo(4.0, 6);
    expect(boss.blinking).toBe(false);
    const more = timeline(run, 3);
    expect(boss.greenLeft).toBeCloseTo(1.0, 6);
    expect(boss.blinking).toBe(true);
    const end = timeline(run, 1);
    expect(at([...tl, ...more, ...end], 'bossLightTick')).toEqual(goLightTickTimes().map((left) => Math.round((10 - left) * 100) / 100));
    expect(boss.lit).toBe(-1);
    expect(boss.blinking).toBe(false);
    expect(boss.greenLeft).toBe(Infinity);
  });

  it('phases 2 and 3: on 4.0 s and 4.5 s after the break, green 3.5 s and 3.0 s, dark 3.6 s and 2.8 s', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    timeline(run, 6);
    dropOnto(run, L[0]!);
    const hit1 = (boss.steps - 1) / 60; // the hit lands before the boss steps on
    const p2 = timeline(run, 1.5 + 4.0 + 3.5 + 3.6 + 0.1).map((x) => ({ ...x, t: x.t - hit1 }));
    expect(at(p2, 'bossPhase')).toEqual([1.5]);
    expect(at(p2, 'bossLight')).toEqual([5.5, 12.6]);
    expect(at(p2, 'bossLightOff')).toEqual([9]);
    expect(boss.lit).toBe(1);
    dropOnto(run, L[1]!);
    const hit2 = (boss.steps - 1) / 60;
    const p3 = timeline(run, 1.5 + 4.5 + 3.0 + 2.8 + 0.1).map((x) => ({ ...x, t: x.t - hit2 }));
    expect(p3.find((x) => x.e.type === 'bossPhase')!.e).toEqual({ type: 'bossPhase', phase: 2, highHonks: true });
    expect(at(p3, 'bossLight')).toEqual([6, 11.8]);
    expect(at(p3, 'bossLightOff')).toEqual([9]);
    // The high honk is out at 2.8 s into phase 3, before the middle light comes on.
    const highHonk = p3.find((x) => x.e.type === 'bossThrow' && x.e.kind === 'highHonk')!;
    expect(Math.round((highHonk.t - 1.5) * 100) / 100).toBe(2.8);
  });
});

describe('landing on the light (S2.14 rules)', () => {
  it('a landing on a dark light (before it comes on, or after it went dark) is not a hit', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    expect(dropOnto(run, L[0]!).map((e) => e.type)).not.toContain('bossHit');
    timeline(run, 10.5); // on at 6.0, dark at 10.0
    expect(boss.lit).toBe(-1);
    expect(dropOnto(run, L[0]!).map((e) => e.type)).not.toContain('bossHit');
    expect(boss.hits).toBe(0);
  });

  it('a landing while it blinks out (last second) still counts', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    timeline(run, 9.5);
    expect(boss.blinking).toBe(true);
    expect(dropOnto(run, L[0]!).map((e) => e.type)).toContain('bossHit');
    expect(boss.hits).toBe(1);
  });

  it('standing on a light when it turns green is not a hit; hopping off and landing again is', () => {
    const run = new Run(HALL);
    const boss = run.boss!;
    const p = L[0]!;
    Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y, prevY: p.y, vy: 0, vx: 0, grounded: true, on: p });
    timeline(run, 6.5);
    expect(boss.lit).toBe(0);
    expect(run.hero.on).toEqual(p);
    expect(boss.hits).toBe(0);
    run.press();
    run.release();
    for (let i = 0; i < 60 && boss.hits === 0; i++) run.step(DT);
    expect(boss.hits).toBe(1);
  });

  it('a light going dark under the hero does nothing to the hero', () => {
    const run = new Run(HALL);
    const p = L[0]!;
    Object.assign(run.hero, { x: p.x + p.w / 2, y: p.y, prevY: p.y, vy: 0, vx: 0, grounded: true, on: p });
    timeline(run, 10.5);
    expect(run.boss!.lit).toBe(-1);
    expect(run.hero.on).toEqual(p);
    expect(run.hero.grounded).toBe(true);
    expect(run.lives).toBe(3);
  });

  it('a hurt never moves the light clock', () => {
    const run = new Run(HALL);
    const tl: number[] = [];
    Object.assign(run.hero, { x: 300 });
    for (let i = 0; i < 60 * 7; i++) for (const e of run.step(DT)) if (e.type === 'bossLight') tl.push(run.boss!.steps);
    expect(run.lives).toBeLessThan(3); // hurt by a tyre on the floor
    expect(tl).toEqual([360]);
  });
});

describe('the hall goal for bots (S2.14 part 3)', () => {
  it('a bot with 120 ms jitter takes 18 s or more for a clean win, meets 2 or more throws in each phase and a high honk before the third hit', () => {
    let clean = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = fightHall(new Run(HALL), 120, 1000 + seed * 7919);
      for (const n of r.throwsPerPhase.slice(0, r.won ? 3 : 0)) expect(n).toBeGreaterThanOrEqual(2);
      if (r.won) expect(r.highHonkBeforeThird).toBe(true);
      if (r.won && r.livesLost === 0) {
        clean++;
        expect(r.fightSecs).toBeGreaterThanOrEqual(18);
      }
    }
    expect(clean).toBeGreaterThan(0);
  }, 60_000);

  it('a perfect bot (no jitter) wins in about 20 s with no life lost', () => {
    const r = fightHall(new Run(HALL), 0, 1);
    expect(r.won).toBe(true);
    expect(r.livesLost).toBe(0);
    expect(r.fightSecs).toBeGreaterThanOrEqual(18);
    expect(r.fightSecs).toBeLessThan(30);
  });
});
