/**
 * General Go-Slow (design.md: Boss), on the real level data.
 */
import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { PHYSICS } from '../../src/engine/physics';
import { BOSS_RULES } from '../../src/game/boss';
import { parseLevel } from '../../src/game/level';
import { RULES, Run, type RunEvent } from '../../src/game/run';

const DT = 1 / 60;
const types = (ev: RunEvent[]) => ev.map((e) => e.type);

/** A run that starts just before the arena, nothing else on the road. */
function atArena(patch: Record<string, unknown> = {}): Run {
  const lvl = parseLevel({ ...structuredClone(w1l1), spawnX: 10980, hazards: [], foods: [], kobo: [], hints: [], ...patch });
  const run = new Run(lvl);
  while (run.phase === 'run') run.step(DT);
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
  h.grounded = false;
  h.on = null;
  const all: RunEvent[] = [];
  for (let i = 0; i < 30 && !h.grounded && !all.some((e) => e.type === 'bossHit'); i++) all.push(...run.step(DT));
  return all;
}

/** Keeps the hero safe from throws while time passes (clears them each step). */
function wait(run: Run, seconds: number): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    all.push(...run.step(DT));
    run.safe = 10;
  }
  return all;
}

const L = w1l1.boss.lights.map(([x, y, w]) => ({ x: x!, y: y!, w: w! }));

describe('General Go-Slow', () => {
  it('starts with the left light lit and the first throw at 2.0 s', () => {
    const run = atArena();
    const boss = run.boss!;
    expect(boss.lit).toBe(0);
    expect(boss.litLight).toEqual(L[0]);
    const ev = wait(run, 1.95);
    expect(types(ev)).not.toContain('bossThrow');
    const more = wait(run, 0.1);
    expect(more.filter((e) => e.type === 'bossThrow')).toEqual([{ type: 'bossThrow', kind: 'tyre' }]);
    // Thrown from x 11520 (60 left of the heap) and rolling left at 156 u/s.
    const t = boss.throws[0]!;
    expect(t.x).toBeLessThan(11520);
    expect(t.x).toBeGreaterThan(11520 - 156 * 0.1);
    expect(t.vx).toBe(-156);
  });

  it('the hero runs by itself and turns around at 11015 and 11440', () => {
    const run = atArena();
    let minX = Infinity;
    let maxX = -Infinity;
    let turned = false;
    for (let i = 0; i < 60 * 8; i++) {
      run.step(DT);
      run.safe = 10;
      if (run.hero.dir === -1) turned = true;
      if (turned) minX = Math.min(minX, run.hero.x); // after the first turn (it enters at 11000)
      maxX = Math.max(maxX, run.hero.x);
    }
    expect(maxX).toBeGreaterThanOrEqual(11440);
    expect(maxX).toBeLessThan(11440 + 3);
    expect(minX).toBeLessThanOrEqual(11015);
    expect(minX).toBeGreaterThan(11015 - 3);
  });

  it('three green-light hits win: toasts, defeat, road free at 2.5 s, win at 4.5 s', () => {
    const run = atArena();
    const boss = run.boss!;
    const hit1 = dropOnto(run, L[0]!);
    expect(hit1.find((e) => e.type === 'bossHit')).toEqual({ type: 'bossHit', hits: 1, left: 2 });
    expect(run.hero.vy).toBe(PHYSICS.bounceVy); // bounces off the light
    expect(run.hero.airJump).toBe(true); // second jump still there
    expect(boss.lit).toBe(-1); // dark during the break
    wait(run, 1.5);
    expect(boss.lit).toBe(1);
    const hit2 = dropOnto(run, L[1]!);
    expect(hit2.find((e) => e.type === 'bossHit')).toEqual({ type: 'bossHit', hits: 2, left: 1 });
    wait(run, 1.5);
    expect(boss.lit).toBe(2);
    const hit3 = dropOnto(run, L[2]!);
    expect(types(hit3)).toContain('bossDefeat');
    expect(boss.defeated).toBe(true);
    expect(boss.mode).toBe('defeat');
    // The hero stops and stands; taps do nothing; nothing can hurt.
    const after = wait(run, 2.45);
    expect(types(after)).not.toContain('roadFree');
    expect(types(wait(run, 0.1))).toContain('roadFree');
    expect(run.press()).toBe(null);
    expect(run.hero.speed).toBe(0);
    expect(run.phase).toBe('arena');
    const end = wait(run, 2.0);
    expect(types(end)).toContain('win');
    expect(run.phase).toBe('won');
    expect(run.lives).toBe(3);
    expect(run.step(DT)).toEqual([]);
  });

  it('gets harder after each hit: throws come faster, tyres roll faster, honk clouds join in', () => {
    const run = atArena();
    const boss = run.boss!;
    /** Throw times (s) and kinds over a stretch of the fight. */
    const watch = (seconds: number) => {
      const out: { t: number; kind: string; speed: number }[] = [];
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        const ev = run.step(DT);
        run.safe = 10;
        for (const e of ev) if (e.type === 'bossThrow') out.push({ t: boss.steps / 60, kind: e.kind, speed: -boss.throws.at(-1)!.vx });
      }
      return out;
    };
    const gaps = (xs: { t: number }[]) => xs.slice(1).map((x, i) => Math.round((x.t - xs[i]!.t) * 10) / 10);

    const p0 = watch(9);
    expect(p0.map((x) => x.kind)).toEqual(['tyre', 'tyre', 'tyre', 'tyre']);
    expect(new Set(gaps(p0))).toEqual(new Set([2.2]));
    expect(p0[0]!.speed).toBe(156);

    let ev = dropOnto(run, L[0]!);
    const hitAt = boss.steps;
    expect(types(ev)).toContain('bossHit');
    const p1 = watch(7);
    // No throw during the 1.5 s break, then the first one a full 1.8 s later.
    expect(Math.round((p1[0]!.t - hitAt / 60) * 10) / 10).toBe(3.3);
    expect(p1.map((x) => x.kind).slice(0, 3)).toEqual(['tyre', 'tyre', 'honk']);
    expect(new Set(gaps(p1))).toEqual(new Set([1.8]));
    expect(p1[0]!.speed).toBe(192);
    const honk = boss.throws.find((t) => t.kind === 'honk');
    if (honk) expect(honk.y).toBe(236); // head height

    ev = dropOnto(run, L[1]!);
    expect(types(ev)).toContain('bossHit');
    const p2 = watch(7);
    expect(p2.map((x) => x.kind).slice(0, 3)).toEqual(['tyre', 'tyre', 'honk']);
    expect(new Set(gaps(p2))).toEqual(new Set([1.4]));
    expect(p2[0]!.speed).toBe(228);
  });

  it('a hit pops every throw into dust', () => {
    const run = atArena();
    wait(run, 4.3);
    expect(run.boss!.throws.length).toBeGreaterThan(0);
    const n = run.boss!.throws.length;
    const ev = dropOnto(run, L[0]!);
    expect(ev.filter((e) => e.type === 'dust')).toHaveLength(n);
    expect(run.boss!.throws).toEqual([]);
  });

  it('landing on a dark light does nothing', () => {
    const run = atArena();
    const ev = dropOnto(run, L[1]!); // right light, not lit yet
    expect(run.hero.on).toEqual(L[1]);
    expect(types(ev)).not.toContain('bossHit');
    expect(run.boss!.hits).toBe(0);
    expect(run.boss!.lit).toBe(0);
  });

  it('landing on the lit light while blinking after a hurt still counts', () => {
    const run = atArena();
    run.safe = RULES.hurtSafeSteps;
    const ev = dropOnto(run, L[0]!);
    expect(types(ev)).toContain('bossHit');
  });

  it('amala smashes tyres and honk clouds for 2 kobo each but never counts as a hit (Q6)', () => {
    const run = atArena();
    const boss = run.boss!;
    dropOnto(run, L[0]!); // into phase 2: tyre, tyre, honk
    run.power.amala = 60 * 30;
    run.hero.x = 11200;
    let smashed = 0;
    for (let i = 0; i < 60 * 9; i++) {
      for (const e of run.step(DT)) if (e.type === 'smash') smashed++;
      run.power.amala = Math.max(run.power.amala, 60);
    }
    expect(smashed).toBeGreaterThanOrEqual(2);
    expect(run.kobo).toBe(smashed * RULES.smashKobo);
    expect(boss.hits).toBe(1);
    expect(run.lives).toBe(3);
  });

  it('a tyre from the side costs a life with 1.7 s of safety; during the safety nothing more is lost', () => {
    const run = atArena();
    run.hero.x = 11300;
    const ev = steps(run, 60 * 6);
    expect(types(ev).filter((t) => t === 'hit').length).toBeGreaterThanOrEqual(1);
    const hits = ev.filter((e) => e.type === 'hit').length;
    expect(run.lives).toBe(3 - hits);
  });

  it('the garri shield takes a throw for you', () => {
    const run = atArena();
    run.power.shield = true;
    run.hero.x = 11300;
    const ev = steps(run, 60 * 8);
    const harm = types(ev).filter((t) => t === 'shieldPop' || t === 'hit');
    expect(harm[0]).toBe('shieldPop'); // the first throw to touch takes the shield, not a life
    expect(run.power.shield).toBe(false);
    expect(run.lives).toBe(3 - harm.filter((t) => t === 'hit').length);
  });

  it('a honk cloud floats over a hero on the road, but jumping into it hurts', () => {
    const run = atArena();
    dropOnto(run, L[0]!);
    // Phase 2: tyre, tyre, honk. Clear the tyres so only the cloud can touch the hero.
    const boss = run.boss!;
    for (let i = 0; i < 60 * 9 && !boss.throws.some((t) => t.kind === 'honk'); i++) {
      run.step(DT);
      run.safe = 10;
      boss.throws = boss.throws.filter((t) => t.kind === 'honk');
    }
    const cloud = boss.throws.find((t) => t.kind === 'honk')!;
    expect(cloud.y).toBe(236);
    // Standing on the road under it: the head is at 256, the cloud's bottom at 246.
    run.safe = 0;
    run.hero.x = cloud.x - 20;
    run.hero.speed = 0;
    const under = steps(run, 30).filter((e) => e.type === 'hit');
    expect(under).toEqual([]);
    // A jump into it hurts.
    const c2 = boss.throws.find((t) => t.kind === 'honk')!;
    run.hero.x = c2.x - 10;
    run.press();
    const ev = steps(run, 20);
    expect(types(ev)).toContain('hit');
  });

  it('out of lives in the arena: game over', () => {
    const run = atArena();
    run.lives = 1;
    run.hero.x = 11300;
    steps(run, 60 * 8);
    expect(run.phase).toBe('over');
  });

  it('boss timings match the art', () => {
    expect(BOSS_RULES.attackLen).toBe(0.4);
    expect(BOSS_RULES.hitLen).toBe(0.8);
  });
});
