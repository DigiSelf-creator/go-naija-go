/**
 * General Go-Slow in Go-Slow Hall (docs/design.md S2.7), on the real hall file
 * (src/data/levels/lagos-hall.json). Moved here from the slice 1 road fight when piece M2
 * retired w1-l1: the same rules (lights, hits, throws, dust, hurts), now with a hero the
 * player moves, the high honk, the attack warning before each throw and the kind finish.
 */
import { describe, expect, it } from 'vitest';
import hallData from '../../src/data/levels/lagos-hall.json';
import { hallLampTimes } from '../../src/art/hall';
import { PHYSICS } from '../../src/engine/physics';
import { BOSS_RULES } from '../../src/game/boss';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;
const types = (ev: RunEvent[]) => ev.map((e) => e.type);
const HALL = parseLevel(hallData);
const L = HALL.boss!.lights;

function hall(opts: { gentle?: boolean; parcel?: boolean } = {}): Run {
  const run = new Run(HALL, opts);
  expect(run.phase).toBe('arena');
  return run;
}

function steps(run: Run, n: number): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...run.step(DT));
  return all;
}

/** Drops the hero from just above a platform's middle, so the next steps land on it. */
function dropOnto(run: Run, p: { x: number; y: number; w: number }): RunEvent[] {
  const h = run.hero;
  h.x = p.x + p.w / 2;
  h.y = h.prevY = p.y - 20;
  h.vy = 60;
  h.vx = 0;
  h.grounded = false;
  h.on = null;
  const all: RunEvent[] = [];
  for (let i = 0; i < 30 && !h.grounded && !all.some((e) => e.type === 'bossHit'); i++) all.push(...run.step(DT));
  return all;
}

/** Keeps the hero safe from throws while time passes. */
function wait(run: Run, seconds: number): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    all.push(...run.step(DT));
    run.safe = 10;
  }
  return all;
}

/** Into phase `n` (0, 1 or 2): the hits before it landed, the break waited out, the light lit. */
function toPhase(run: Run, n: number): void {
  const boss = run.boss!;
  for (let i = 0; i < n; i++) {
    dropOnto(run, L[i]!);
    wait(run, 1.6);
  }
  expect(boss.hits).toBe(n);
  expect(boss.lit).toBe(n);
}

/** Puts the hero standing on a light (or the floor, null) at x. */
function standOn(run: Run, p: { x: number; y: number; w: number } | null, x?: number): void {
  const h = run.hero;
  h.x = x ?? (p ? p.x + p.w / 2 : 200);
  h.y = h.prevY = p ? p.y : HALL.groundY;
  Object.assign(h, { vy: 0, vx: 0, grounded: true, on: p, move: 0 });
}

describe('the hall file (S2.7 layout and phase table)', () => {
  it('is a hall: 560 wide, floor 300, start at 50, the hero between 30 and 400, the heap at 500, throws from 470', () => {
    expect(HALL.hall).toEqual({ width: 560, leftLimit: 30, rightLimit: 400 });
    expect(HALL.groundY).toBe(300);
    expect(HALL.spawnX).toBe(50);
    expect(HALL.manual).toBe(true);
    expect(HALL.boss).toMatchObject({ x: 500, throwX: 470, drainX: 20, startDelay: 2.0, breakAfterHit: 1.5, honkY: 236, highHonkY: 170, honkSpeed: 120 });
    // Left (a tap), right (a hold), middle (a full hold), in that order.
    expect(L).toEqual([
      { x: 60, y: 240, w: 90 },
      { x: 310, y: 210, w: 90 },
      { x: 190, y: 180, w: 90 },
    ]);
  });

  it('the phase table: every, tyre speed, pattern, hall music tempo', () => {
    expect(HALL.boss!.phases).toEqual([
      { every: 2.2, speed: 156, pattern: ['tyre'], bpm: 128 },
      { every: 1.8, speed: 192, pattern: ['tyre', 'tyre', 'honk'], bpm: 134 },
      { every: 1.4, speed: 228, pattern: ['tyre', 'honk', 'tyre', 'highHonk'], bpm: 140 },
    ]);
  });

  it('every light is reachable from a walk: tap 60, hold 90, full hold 120 above the floor', () => {
    const tapTop = PHYSICS.jumpVy ** 2 / (2 * PHYSICS.gravity);
    const holdTop = PHYSICS.jumpVy ** 2 / (2 * PHYSICS.holdGravity);
    expect(HALL.groundY - L[0]!.y).toBeLessThan(tapTop);
    expect(HALL.groundY - L[1]!.y).toBeLessThan(holdTop);
    expect(HALL.groundY - L[2]!.y).toBeLessThan(holdTop);
    // ...and each one is inside the hero's limits.
    for (const l of L) {
      expect(l.x + l.w / 2).toBeGreaterThan(HALL.hall!.leftLimit);
      expect(l.x + l.w / 2).toBeLessThan(HALL.hall!.rightLimit);
    }
  });
});

describe('General Go-Slow in the hall', () => {
  it('starts at once: the hero inside at 50, standing, facing right; the left light lit; the boss words', () => {
    const run = hall();
    expect(run.hero).toMatchObject({ x: 50, y: 300, grounded: true, dir: 1, vx: 0, manual: true });
    expect(run.boss!.litLight).toEqual(L[0]);
    expect(run.power.shield).toBe(false);
    const ev = steps(run, 1);
    expect(types(ev)).toEqual(['hallStart']);
    expect(types(steps(run, 60))).not.toContain('hallStart');
  });

  it('the player moves the hero anywhere from 30 to 400 (no running by itself, no turn points); standing still is allowed', () => {
    const run = hall();
    wait(run, 1);
    expect(run.hero.x).toBe(50); // stands still with no direction held
    run.steer(-1);
    wait(run, 2);
    expect(run.hero.x).toBe(30);
    run.steer(1);
    wait(run, 5);
    expect(run.hero.x).toBe(400); // the cone line
    expect(run.hero.vx).toBe(0);
    run.steer(0);
    wait(run, 1);
    expect(run.hero.x).toBe(400);
  });

  it('the first throw comes at 2.0 s from x 470, shown first by the 0.4 s attack pose', () => {
    const run = hall();
    const boss = run.boss!;
    const ev = wait(run, 1.6 - 1 / 60);
    expect(types(ev)).not.toContain('bossThrow');
    expect(boss.mode).toBe('idle');
    wait(run, 1 / 60);
    expect(boss.mode).toBe('attack');
    expect(boss.aim).toBe('low');
    expect(boss.throws).toEqual([]);
    const more = wait(run, 0.4);
    expect(more.filter((e) => e.type === 'bossThrow')).toEqual([{ type: 'bossThrow', kind: 'tyre' }]);
    expect(boss.mode).toBe('idle');
    const t = boss.throws[0]!;
    expect(t.x).toBeCloseTo(470 - 156 / 60, 6);
    expect(t.vx).toBe(-156);
    expect(t.y).toBe(300);
  });

  it('a hero at the cone line has at least 53 u and the 0.4 s warning before a new tyre touches', () => {
    const run = hall();
    standOn(run, null, 400);
    const boss = run.boss!;
    let warnAt = -1;
    let hitAt = -1;
    for (let i = 0; i < 60 * 3 && hitAt < 0; i++) {
      const ev = run.step(DT);
      if (boss.mode === 'attack' && warnAt < 0) warnAt = run.steps;
      if (ev.some((e) => e.type === 'hit')) hitAt = run.steps;
    }
    expect(470 - 10 - (400 + 7)).toBeGreaterThanOrEqual(53);
    expect((hitAt - warnAt) / 60).toBeGreaterThanOrEqual(0.4 + 53 / 156 - 0.02);
  });

  it('three lit-light hits win: toasts, the finish timeline, the hero stands, taps and directions do nothing', () => {
    const run = hall();
    const boss = run.boss!;
    const hit1 = dropOnto(run, L[0]!);
    expect(hit1.find((e) => e.type === 'bossHit')).toEqual({ type: 'bossHit', hits: 1, left: 2 });
    expect(run.hero.vy).toBe(PHYSICS.bounceVy); // bounces off the light
    expect(run.hero.airJump).toBe(true); // second jump still there
    expect(boss.lit).toBe(-1); // dark during the break
    expect(boss.mode).toBe('hit');
    const light2 = wait(run, 1.5);
    expect(boss.lit).toBe(1);
    expect(light2.find((e) => e.type === 'bossLight')).toEqual({ type: 'bossLight', lit: 1, highHonks: false });
    const hit2 = dropOnto(run, L[1]!);
    expect(hit2.find((e) => e.type === 'bossHit')).toEqual({ type: 'bossHit', hits: 2, left: 1 });
    // Before the third phase: the high honk warning comes with the light.
    const light3 = wait(run, 1.5);
    expect(light3.find((e) => e.type === 'bossLight')).toEqual({ type: 'bossLight', lit: 2, highHonks: true });
    const hit3 = dropOnto(run, L[2]!);
    expect(types(hit3)).toContain('bossDefeat');
    expect(boss.defeated).toBe(true);
    expect(boss.mode).toBe('defeat');

    // The kind finish, seconds from the third hit.
    const at: Record<string, number[]> = {};
    for (let i = 1; i <= 6 * 60 + 5 && run.phase === 'arena'; i++) {
      if (i === 60) {
        run.steer(1);
        expect(run.press()).toBe(null);
      }
      for (const e of run.step(DT)) (at[e.type] ??= []).push(i / 60);
    }
    expect(at['hallClear']).toEqual([BOSS_RULES.clearAt]);
    expect(at['lamp']!.map((t) => Math.round(t * 100) / 100)).toEqual(hallLampTimes().map((t) => Math.round(t * 100) / 100));
    expect(at['lamp']).toHaveLength(8);
    expect(at['switchedOn']).toEqual([4.5]);
    expect(at['win']).toEqual([6.0]);
    expect(at['hit']).toBeUndefined();
    expect(run.phase).toBe('won');
    expect(run.hero.grounded).toBe(true);
    expect(run.hero.vx).toBe(0);
    expect(run.hero.x).toBeCloseTo(L[2]!.x + L[2]!.w / 2, 6); // stood still through the finish
    expect(run.lives).toBe(3);
    expect(run.step(DT)).toEqual([]);
  });

  it('gets harder after each hit: faster throws, faster tyres, low honks, then high honks', () => {
    const run = hall();
    const boss = run.boss!;
    const watch = (seconds: number) => {
      const out: { t: number; kind: string; speed: number; y: number }[] = [];
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        const ev = run.step(DT);
        run.safe = 10;
        for (const e of ev) if (e.type === 'bossThrow') out.push({ t: boss.steps / 60, kind: e.kind, speed: -boss.throws.at(-1)!.vx, y: boss.throws.at(-1)!.y });
      }
      return out;
    };
    const gaps = (xs: { t: number }[]) => xs.slice(1).map((x, i) => Math.round((x.t - xs[i]!.t) * 10) / 10);

    const p0 = watch(9);
    expect(p0.map((x) => x.kind)).toEqual(['tyre', 'tyre', 'tyre', 'tyre']);
    expect(new Set(gaps(p0))).toEqual(new Set([2.2]));
    expect(p0[0]!.speed).toBe(156);

    dropOnto(run, L[0]!);
    const hitAt = boss.steps;
    const p1 = watch(7);
    // No throw during the 1.5 s break, then the first one a full 1.8 s later.
    expect(Math.round((p1[0]!.t - hitAt / 60) * 10) / 10).toBe(3.3);
    expect(p1.map((x) => x.kind).slice(0, 3)).toEqual(['tyre', 'tyre', 'honk']);
    expect(new Set(gaps(p1))).toEqual(new Set([1.8]));
    expect(p1[0]!.speed).toBe(192);
    expect(p1.find((x) => x.kind === 'honk')).toMatchObject({ y: 236, speed: 120 });

    dropOnto(run, L[1]!);
    const p2 = watch(8);
    expect(p2.map((x) => x.kind).slice(0, 4)).toEqual(['tyre', 'honk', 'tyre', 'highHonk']);
    expect(new Set(gaps(p2))).toEqual(new Set([1.4]));
    expect(p2[0]!.speed).toBe(228);
    expect(p2.find((x) => x.kind === 'highHonk')).toMatchObject({ y: 170, speed: 120 });
  });

  it('the attack pose aims high before a high honk and low before anything else', () => {
    const run = hall();
    const boss = run.boss!;
    toPhase(run, 2);
    const aims: string[] = [];
    let last = boss.mode;
    for (let i = 0; i < 60 * 6; i++) {
      run.step(DT);
      run.safe = 10;
      if (boss.mode === 'attack' && last !== 'attack') aims.push(boss.aim);
      last = boss.mode;
    }
    expect(aims.slice(0, 4)).toEqual(['low', 'low', 'low', 'high']);
  });

  it('tyres drop into the drain grate and honks fade out at the left wall (x 20)', () => {
    const run = hall();
    const boss = run.boss!;
    standOn(run, L[1]!); // safe from tyres up here
    let seenLow = Infinity;
    for (let i = 0; i < 60 * 6; i++) {
      run.step(DT);
      for (const t of boss.throws) seenLow = Math.min(seenLow, t.x);
    }
    expect(seenLow).toBeGreaterThan(20);
    expect(seenLow).toBeLessThan(24);
  });

  it('a hit pops every throw into dust, and no throws come during the 1.5 s break', () => {
    const run = hall();
    wait(run, 4.5);
    const n = run.boss!.throws.length;
    expect(n).toBeGreaterThan(0);
    const ev = dropOnto(run, L[0]!);
    expect(ev.filter((e) => e.type === 'dust')).toHaveLength(n);
    expect(run.boss!.throws).toEqual([]);
    expect(types(wait(run, 1.5))).not.toContain('bossThrow');
  });

  it('landing on a dark light does nothing', () => {
    const run = hall();
    const ev = dropOnto(run, L[1]!); // right light, not lit yet
    expect(run.hero.on).toEqual(L[1]);
    expect(types(ev)).not.toContain('bossHit');
    expect(run.boss!.hits).toBe(0);
    expect(run.boss!.lit).toBe(0);
  });

  it('landing on the lit light while blinking after a hurt still counts', () => {
    const run = hall();
    run.safe = RULES.hurtSafeSteps;
    expect(types(dropOnto(run, L[0]!))).toContain('bossHit');
  });
});

describe('S2.7 safe places: where the hero stands against each throw', () => {
  /** Phase n, the hero standing at `where`, everything but throws of `kind` cleared each step: hurt or not? */
  function hurtBy(kind: 'tyre' | 'honk' | 'highHonk', where: 'floor' | 0 | 1 | 2): boolean {
    const run = hall();
    const boss = run.boss!;
    toPhase(run, kind === 'tyre' ? 0 : kind === 'honk' ? 1 : 2);
    // Stand at the light's middle (the floor: under the middle light).
    const p = where === 'floor' ? null : L[where]!;
    standOn(run, p, where === 'floor' ? 235 : undefined);
    run.safe = 0;
    let seen = false;
    for (let i = 0; i < 60 * 12; i++) {
      boss.throws = boss.throws.filter((t) => t.kind === kind);
      const ev = run.step(DT);
      if (boss.throws.some((t) => Math.abs(t.x - run.hero.x) < 5)) seen = true;
      if (ev.some((e) => e.type === 'hit')) return true;
      if (boss.hits > (kind === 'tyre' ? 0 : kind === 'honk' ? 1 : 2)) throw new Error('landed on the lit light');
    }
    expect(seen, `a ${kind} passed the hero`).toBe(true);
    return false;
  }

  it('floor: a tyre hurts (jump it), both honks pass safely over the head', () => {
    expect(hurtBy('tyre', 'floor')).toBe(true);
    expect(hurtBy('honk', 'floor')).toBe(false);
    expect(hurtBy('highHonk', 'floor')).toBe(false);
  });

  it('left light: safe from tyres and high honks, the low honk hurts', () => {
    // The left light is dark in phases 1 and 2; the tyre under it is the test after these.
    expect(hurtBy('honk', 0)).toBe(true);
    expect(hurtBy('highHonk', 0)).toBe(false);
  });

  it('right light: safe from tyres and low honks, the high honk hurts', () => {
    expect(hurtBy('tyre', 1)).toBe(false);
    expect(hurtBy('honk', 1)).toBe(false);
    expect(hurtBy('highHonk', 1)).toBe(true);
  });

  it('middle light: safe from tyres and low honks, the high honk hurts', () => {
    expect(hurtBy('tyre', 2)).toBe(false);
    expect(hurtBy('honk', 2)).toBe(false);
  });

  it('middle light and the high honk: hurts (checked with the middle light dark, in phase 2 standing on it would be a hit)', () => {
    const run = hall();
    const boss = run.boss!;
    toPhase(run, 2);
    // Force a high honk on its way while the hero stands on the (lit) middle light without landing on it.
    standOn(run, L[2]!);
    boss.lit = -1; // dark for this check only
    run.safe = 0;
    boss.throws = [{ kind: 'highHonk', x: 300, y: 170, vx: -120, rot: 0 }];
    const ev = steps(run, 60);
    expect(types(ev)).toContain('hit');
  });

  it('a tyre under the left light passes a hero standing on it', () => {
    const run = hall();
    const boss = run.boss!;
    toPhase(run, 1);
    standOn(run, L[0]!);
    run.safe = 0;
    boss.throws = [{ kind: 'tyre', x: 300, y: 300, vx: -192, rot: 0 }];
    expect(types(steps(run, 90))).not.toContain('hit');
  });
});

describe('hurts in the hall', () => {
  it('a tyre from the side costs a life with 1.7 s of safety', () => {
    const run = hall();
    standOn(run, null, 300);
    const ev = steps(run, 60 * 6);
    const hits = ev.filter((e) => e.type === 'hit').length;
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(run.lives).toBe(3 - hits);
    expect(run.safe).toBeLessThanOrEqual(RULES.hurtSafeSteps);
  });

  it('landing on a tyre bounces off it', () => {
    const run = hall();
    const boss = run.boss!;
    boss.throws = [{ kind: 'tyre', x: 200, y: 300, vx: -156, rot: 0 }];
    Object.assign(run.hero, { x: 196, y: 270, prevY: 270, vy: 200, grounded: false, on: null });
    const ev = steps(run, 6);
    expect(types(ev)).toContain('bounce');
    expect(types(ev)).not.toContain('hit');
    expect(boss.throws).toEqual([]);
  });

  it('jumping into a low honk hurts', () => {
    const run = hall();
    const boss = run.boss!;
    toPhase(run, 1);
    standOn(run, null, 200);
    run.safe = 0;
    boss.throws = [{ kind: 'honk', x: 215, y: 236, vx: -120, rot: 0 }];
    run.press();
    expect(types(steps(run, 20))).toContain('hit');
  });

  it('out of lives in the hall: game over, the fight stops', () => {
    const run = hall();
    run.lives = 1;
    standOn(run, null, 300);
    const ev = steps(run, 60 * 8);
    expect(types(ev)).toContain('gameOver');
    expect(run.phase).toBe('over');
    const frozen = JSON.stringify(run.boss!.throws);
    expect(run.step(DT)).toEqual([]);
    expect(JSON.stringify(run.boss!.throws)).toBe(frozen);
    expect(run.press()).toBe(null);
  });

  it('gentle mode gives 5 lives in the hall too', () => {
    expect(hall({ gentle: true }).lives).toBe(5);
  });
});

describe('the garri parcel at the hall start (S2.5 gift rule 5, S2.7 t = 0)', () => {
  it('a held parcel turns on one shield at the start, with its words first and the boss words 1.5 s later', () => {
    const run = hall({ parcel: true });
    expect(run.power.shield).toBe(true);
    expect(run.parcelShield).toBe(true);
    expect(types(steps(run, 1))).toEqual(['parcelShield']);
    const ev = steps(run, 90);
    expect(types(ev).filter((t) => t === 'hallStart')).toHaveLength(1);
    expect(types(ev).filter((t) => t === 'parcelShield')).toHaveLength(0);
  });

  it('never stacks: the shield takes exactly one hit, the next hit costs a life', () => {
    const run = hall({ parcel: true });
    standOn(run, null, 300);
    const ev = steps(run, 60 * 8);
    const harm = types(ev).filter((t) => t === 'shieldPop' || t === 'hit');
    expect(harm[0]).toBe('shieldPop');
    expect(harm.filter((t) => t === 'shieldPop')).toHaveLength(1);
    expect(harm.slice(1).every((t) => t === 'hit')).toBe(true);
    expect(harm.length).toBeGreaterThanOrEqual(2);
    expect(run.power.shield).toBe(false);
    expect(run.lives).toBe(3 - (harm.length - 1));
  });

  it('a lost life does not bring it back; a new try (Play again) starts with it on again', () => {
    const run = hall({ parcel: true });
    standOn(run, null, 300);
    steps(run, 60 * 8);
    expect(run.power.shield).toBe(false);
    expect(run.lives).toBeLessThan(3);
    const again = hall({ parcel: true });
    expect(again.power).toEqual({ corn: 0, amala: 0, shield: true });
    expect(again.lives).toBe(3);
  });

  it('no parcel: no shield at the start', () => {
    const run = hall({ parcel: false });
    expect(run.power.shield).toBe(false);
    expect(run.parcelShield).toBe(false);
    expect(types(steps(run, 1))).toEqual(['hallStart']);
  });

  it('only a hall reads it: a street run with parcel set starts with no shield', async () => {
    const street = parseLevel((await import('../../src/data/levels/lagos-3.json')).default);
    const run = new Run(street, { parcel: true });
    expect(run.power.shield).toBe(false);
    expect(run.parcelShield).toBe(false);
    expect(run.phase).toBe('run');
  });
});
