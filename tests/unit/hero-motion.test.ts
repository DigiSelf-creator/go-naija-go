/**
 * The hero's run cycle follows ground covered (feet don't slide), speeds up on corn, and a
 * hard landing gives a short squash. Hitboxes do not depend on the drawing.
 */
import { describe, expect, it } from 'vitest';
import w1l1 from '../../src/data/levels/w1-l1.json';
import { HERO_HEIGHT } from '../../src/art/hero';
import { Game, LAND_TIME, STRIDE } from '../../src/game/game';
import { parseLevel } from '../../src/game/level';
import { RULES } from '../../src/game/run';

const DT = 1 / 60;
const fresh = (): Game => {
  const g = new Game(parseLevel(structuredClone(w1l1)));
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

  it('the cycle moves on when running left too (boss arena)', () => {
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
