/**
 * P2 art (docs/design.md S2.13): the pothole warning sign and the Gentle mode "dust off".
 */
import { describe, expect, it } from 'vitest';
import { AGES, BODIES, DUST_OFF_TIME, HAIRS, OUTFITS, SKINS, drawHero, dustOffFrame, type HeroPose } from '../../src/art/hero';
import { POTHOLE_SIGN, SIGN_YELLOW, drawPotholeSign } from '../../src/art/sign';
import { recorder } from './recorder';

describe('pothole warning sign', () => {
  it('measures follow S2.13: board 34 x 24, 56 tall, post 4, about 3 degrees of lean', () => {
    expect(POTHOLE_SIGN.boardW).toBe(34);
    expect(POTHOLE_SIGN.boardH).toBe(24);
    expect(POTHOLE_SIGN.height).toBe(56);
    expect(POTHOLE_SIGN.postW).toBe(4);
    expect((POTHOLE_SIGN.lean * 180) / Math.PI).toBeCloseTo(3, 5);
    expect(SIGN_YELLOW).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('draws with no words, no broken numbers, worn and fresh, and leaves the context as it found it', () => {
    for (const fresh of [false, true]) {
      const r = recorder();
      drawPotholeSign(r.g, 3880, 300, fresh);
      expect(r.texts).toEqual([]);
      expect(r.bad).toEqual([]);
      expect(r.depth()).toBe(0);
      // A dotted path is drawn, and the dash is put back after
      const dashes = r.calls.filter((c) => c.name === 'setLineDash');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
      expect(dashes.at(-1)!.args[0]).toEqual([]);
    }
  });

  it('stands on the ground: drawn from (x, groundY), nothing more than 56 u above it', () => {
    const r = recorder();
    drawPotholeSign(r.g, 100, 300);
    const t = r.calls.find((c) => c.name === 'translate');
    expect(t?.args).toEqual([100, 300]);
    const ys = r.calls.filter((c) => ['moveTo', 'lineTo', 'rect'].includes(c.name)).map((c) => c.args[1] as number);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-56.01);
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.01);
  });
});

describe('dust off pose', () => {
  it('lasts 0.4 s with two frames: up, pat, up, pat', () => {
    expect(DUST_OFF_TIME).toBe(0.4);
    expect([0, 0.3, 0.6, 0.9].map(dustOffFrame)).toEqual([0, 1, 0, 1]);
    expect(dustOffFrame(Number.NaN)).toBe(0);
    expect(dustOffFrame(5)).toBe(1);
  });

  it('every skin, hair, outfit, body and age draws both frames without throwing', () => {
    for (let body = 0; body < BODIES.length; body++)
      for (let age = 0; age < AGES.length; age++)
        for (let skin = 0; skin < SKINS.length; skin++)
          for (let hair = 0; hair < HAIRS.length; hair++)
            for (let outfit = 0; outfit < OUTFITS.length; outfit++)
              for (const p of [0.1, 0.35, 0.6, 0.85]) {
                const r = recorder();
                const pose: HeroPose = { phase: 0, inAir: false, facing: 1, glow: false, dustOff: p, time: p * DUST_OFF_TIME };
                expect(() => drawHero(r.g, { skin, hair, outfit, body, age }, pose)).not.toThrow();
                expect(r.bad).toEqual([]);
                expect(r.depth()).toBe(0);
              }
  });

  it('the pat frame draws a dust puff and the up frame does not; out of range draws the normal pose', () => {
    const look = { skin: 2, hair: 1, outfit: 0, body: 0, age: 1 };
    const arcs = (p: number | undefined): number => {
      const r = recorder();
      const pose: HeroPose = p === undefined ? { phase: 0, inAir: false, facing: 1, glow: false, standing: true } : { phase: 0, inAir: false, facing: 1, glow: false, standing: true, dustOff: p };
      drawHero(r.g, look, pose);
      return r.calls.filter((c) => c.name === 'arc').length;
    };
    expect(arcs(0.35)).toBeGreaterThan(arcs(0.1));
    expect(arcs(1)).toBe(arcs(undefined));
    expect(arcs(Number.NaN)).toBe(arcs(undefined));
  });
});
