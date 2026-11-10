/**
 * The hero's run cycle follows ground covered (feet don't slide), speeds up on corn, and a
 * hard landing gives a short squash. Hitboxes do not depend on the drawing.
 */
import { describe, expect, it } from 'vitest';
import lagos1 from '../../src/data/levels/lagos-1.json';
import { HERO_HEIGHT, WALK_STRIDE } from '../../src/art/hero';
import { DUST_TIME, Game, LAND_TIME, SKID_TIME, STRIDE, type GameEvent } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { RULES } from '../../src/game/run';
import { autoLevel } from './auto-level';

const DT = 1 / 60;
const fresh = (): Game => {
  const g = new Game(autoLevel());
  g.begin(false);
  return g;
};

describe('hero motion', () => {
  it('one run cycle per STRIDE of ground', () => {
    const g = fresh();
    const x0 = g.hero.x;
    for (let i = 0; i < 20; i++) g.update(DT);
    expect(g.hero.grounded).toBe(true);
    const ran = g.hero.x - x0;
    expect(ran).toBeGreaterThan(0);
    expect(g.stridePhase).toBeCloseTo((ran / STRIDE) % 1, 6);
  });

  it('the cycle turns faster on corn, because the hero covers more ground', () => {
    const plain = fresh();
    const corn = fresh();
    corn.run.power.corn = 600;
    corn.update(DT); // speed picks up corn on the next step
    plain.update(DT);
    const p0 = plain.stridePhase;
    const c0 = corn.stridePhase;
    plain.update(DT);
    corn.update(DT);
    expect(corn.stridePhase - c0).toBeGreaterThan(plain.stridePhase - p0);
  });

  it('the cycle moves on when running left too', () => {
    const g = fresh();
    g.update(DT);
    g.hero.dir = -1;
    const p0 = g.stridePhase;
    const before = g.hero.x;
    g.update(DT);
    expect(g.hero.x).toBeLessThan(before);
    // Ground covered going left moves the cycle forward, the same as going right.
    expect(g.stridePhase - p0).toBeCloseTo((before - g.hero.x) / STRIDE, 6);
  });

  it('squashes on landing from a real fall, for LAND_TIME, then stops', () => {
    const g = fresh();
    g.press();
    g.release();
    let peakVy = 0;
    let n = 0;
    while (n++ < 600) {
      g.update(DT);
      peakVy = Math.max(peakVy, g.hero.vy);
      if (g.hero.grounded) break;
    }
    expect(peakVy).toBeGreaterThan(200);
    expect(g.landLeft).toBeCloseTo(LAND_TIME, 6);
    const steps = Math.ceil(LAND_TIME / DT);
    for (let i = 0; i < steps; i++) g.update(DT);
    expect(g.landLeft).toBeCloseTo(0, 6);
  });

  it('no squash after a small drop', () => {
    const g = fresh();
    g.update(DT);
    g.hero.grounded = false;
    g.hero.vy = 120;
    g.hero.y -= 1;
    for (let i = 0; i < 10 && !g.hero.grounded; i++) g.update(DT);
    expect(g.hero.grounded).toBe(true);
    expect(g.landLeft).toBe(0);
  });

  it('the hitbox is the design size, not the drawing size', () => {
    expect(RULES.heroHalfW * 2).toBe(14);
    expect(RULES.heroH).toBe(44);
    expect(HERO_HEIGHT).toBe(50);
  });
});

describe('hero motion on a player-moved street (S2.2, art H5)', () => {
  const street = (): Game => {
    const g = new Game(parseLevel(structuredClone(lagos1)));
    g.begin(false);
    return g;
  };
  const go = (g: Game, n: number): GameEvent[] => {
    const out: GameEvent[] = [];
    g.onEvent = (e) => out.push(e);
    for (let i = 0; i < n; i++) g.update(DT);
    return out;
  };

  it('a walk turns one cycle per STRIDE x WALK_STRIDE of ground, so the feet do not slide', () => {
    const g = street();
    g.steer(1);
    go(g, 6); // up to walk speed
    expect(g.gait).toBe('walk');
    const p0 = g.stridePhase;
    const x0 = g.hero.x;
    go(g, 10);
    expect(g.gait).toBe('walk');
    const moved = g.hero.x - x0;
    expect(moved).toBeGreaterThan(10);
    expect((g.stridePhase - p0 + 1) % 1).toBeCloseTo((moved / (STRIDE * WALK_STRIDE)) % 1, 6);
  });

  it('breaking into a run: one runStart, a dust puff that lasts DUST_TIME, then a run stride', () => {
    const g = street();
    g.steer(1);
    const ev = go(g, 60);
    expect(ev.filter((e) => e.type === 'runStart')).toHaveLength(1);
    expect(g.gait).toBe('run');
    const start = ev.findIndex((e) => e.type === 'runStart');
    expect(start).toBeGreaterThanOrEqual(0);
    // Holding on: no more run starts, the puff fades out.
    expect(go(g, Math.ceil(DUST_TIME / DT) + 2).some((e) => e.type === 'runStart')).toBe(false);
    expect(g.dustAge).toBe(DUST_TIME);
    const p0 = g.stridePhase;
    const x0 = g.hero.x;
    go(g, 5);
    expect((g.stridePhase - p0 + 1) % 1).toBeCloseTo(((g.hero.x - x0) / STRIDE) % 1, 6);
  });

  it('turning round from a run: a skid sound, the old facing, braced feet, then the new way', () => {
    const g = street();
    g.steer(1);
    go(g, 70);
    expect(g.gait).toBe('run');
    g.steer(-1);
    const ev = go(g, 1);
    expect(ev).toContainEqual({ type: 'skid' });
    expect(g.skid).toBe(1);
    expect(g.skidFacing).toBe(1);
    const p0 = g.stridePhase;
    go(g, 3);
    expect(g.stridePhase).toBe(p0); // the braced foot does not cycle
    go(g, Math.ceil(SKID_TIME / DT));
    expect(g.skid).toBe(0);
    expect(g.hero.vx).toBeLessThan(0);
    expect(g.hero.dir).toBe(-1);
  });

  it('turning round from a walk: a smaller skid and no skid sound', () => {
    const g = street();
    g.steer(1);
    go(g, 10);
    expect(g.gait).toBe('walk');
    g.steer(-1);
    const ev = go(g, 1);
    expect(ev.some((e) => e.type === 'skid')).toBe(false);
    expect(g.skid).toBeGreaterThan(0);
    expect(g.skid).toBeLessThan(1);
  });

  it('a jump ends a skid at once', () => {
    const g = street();
    g.steer(1);
    go(g, 70);
    g.steer(-1);
    go(g, 1);
    g.press();
    go(g, 2);
    expect(g.skid).toBe(0);
  });
});

describe('every body and age plays the same (design.md S2.3)', () => {
  it('Male, Female, Teen, Adult and Elder: the same steps, jumps and 14 x 44 hitbox, step for step', () => {
    // Street 1 by hand: walk, run, a held jump and a second jump, the same inputs for every look.
    const trace = (look: { skin: number; hair: number; outfit: number; body: number; age: number }): string => {
      const g = new Game(parseLevel(structuredClone(lagos1)));
      g.look = look;
      g.begin(false);
      const out: string[] = [];
      for (let i = 0; i < 360; i++) {
        if (i === 10) g.steer(1);
        if (i === 90 || i === 200) g.press();
        if (i === 110 || i === 215) g.release();
        if (i === 120) g.press();
        if (i === 126) g.release();
        g.update(DT);
        out.push(`${g.hero.x.toFixed(4)},${g.hero.y.toFixed(4)},${g.hero.vy.toFixed(4)}`);
      }
      return out.join(';');
    };
    const base = trace({ skin: 2, hair: 0, outfit: 0, body: 0, age: 1 });
    for (let body = 0; body < 2; body++) {
      for (let age = 0; age < 3; age++) {
        expect(trace({ skin: 4, hair: 3, outfit: 3, body, age }), `body ${body} age ${age}`).toBe(base);
      }
    }
    expect(RULES.heroHalfW * 2).toBe(14);
    expect(RULES.heroH).toBe(44);
  });
});
