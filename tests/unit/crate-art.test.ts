/**
 * J1: hanging market crates (S2.4, R5, R8). Our own look: never yellow or gold,
 * no "?" or "!", always hung on a rope; the motion follows the S2.4 numbers.
 */
import { describe, expect, it } from 'vitest';
import { CRATE, CRATE_COLOURS, CRATE_STAMPS, crateAngle, crateLineY, drawCrate, drawCrateLine, foodPopAt, koboFanAt, koboFlyAt } from '../../src/art/crate';
import { hsl, recorder } from './recorder';

const DEG = Math.PI / 180;

/** Yellow or gold: a hue between 40 and 65 degrees with real colour in it. */
const yellowish = (c: string): boolean => {
  const v = hsl(c);
  return v !== null && v.h >= 40 && v.h <= 65 && v.s > 0.35;
};

describe('crate look', () => {
  it('has the S2.4 size and rope', () => {
    expect(CRATE).toMatchObject({ w: 32, h: 28, rope: 60, heightAboveSurface: 96 });
    expect(crateLineY(204)).toBe(204 - 28 - 60);
    expect(CRATE_STAMPS).toEqual(['kobo', 'corn', 'cup', 'bowl']);
  });

  it('no crate colour is yellow or gold', () => {
    for (const [name, c] of Object.entries(CRATE_COLOURS)) expect(yellowish(c), `${name} ${c}`).toBe(false);
  });

  it('every stamp, full and open, at any swing, draws with no text, no yellow and no broken numbers', () => {
    for (const stamp of CRATE_STAMPS) {
      for (const open of [false, true]) {
        for (const angle of [0, 12 * DEG, -8 * DEG, Number.NaN]) {
          const r = recorder();
          drawCrate(r.g, 100, 204, { stamp, open, angle });
          expect(r.bad).toEqual([]);
          expect(r.depth()).toBe(0);
          expect(r.texts, 'no "?", "!" or any words on a crate').toEqual([]);
          for (const c of r.colours) expect(yellowish(c), `${stamp} uses ${c}`).toBe(false);
          // Always hung: a rope is drawn up to the line
          expect(r.calls.some((c) => c.name === 'lineTo')).toBe(true);
        }
      }
    }
    const r = recorder();
    drawCrateLine(r.g, 0, 400, crateLineY(204), 300);
    expect(r.bad).toEqual([]);
  });
});

describe('crate motion', () => {
  it('a knock from below swings up to 12 degrees and settles by 1.2 s', () => {
    let max = 0;
    for (let t = 0; t < 1.2; t += 0.01) max = Math.max(max, Math.abs(crateAngle({ time: 0, sinceKnock: t, knock: 'hit' })));
    expect(max / DEG).toBeGreaterThan(10);
    expect(max / DEG).toBeLessThanOrEqual(12.01);
    // After 1.2 s only the gentle 1 degree sway is left
    for (let t = 1.2; t < 5; t += 0.1) expect(Math.abs(crateAngle({ time: t, sinceKnock: t, knock: 'hit' })) / DEG).toBeLessThanOrEqual(1.0001);
  });

  it('a brush from the side swings at most 8 degrees', () => {
    let max = 0;
    for (let t = 0; t < 1.2; t += 0.01) max = Math.max(max, Math.abs(crateAngle({ time: 0, sinceKnock: t, knock: 'brush' })));
    expect(max / DEG).toBeLessThanOrEqual(8.01);
    expect(max / DEG).toBeGreaterThan(6);
  });

  it('idle sway is 1 degree over a 3 s period, and reduced motion keeps crates still', () => {
    expect(crateAngle({ time: 0.75 }) / DEG).toBeCloseTo(1, 6);
    expect(crateAngle({ time: 3.75 }) / DEG).toBeCloseTo(1, 6);
    expect(crateAngle({ time: 0.75, sinceKnock: 0.1, still: true })).toBe(0);
    expect(Number.isFinite(crateAngle({ time: Number.NaN, sinceKnock: Number.NaN }))).toBe(true);
  });

  it('kobo fan: three coins, up and 30 degrees either side, rising 30 u in 0.35 s', () => {
    expect(koboFanAt(-0.1)).toEqual([]);
    expect(koboFanAt(0.4)).toEqual([]);
    const end = koboFanAt(0.35);
    expect(end).toHaveLength(3);
    const [l, m, r] = end as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
    expect(m.x).toBeCloseTo(0, 6);
    expect(l.x).toBeCloseTo(-r.x, 6);
    expect(Math.hypot(r.x, r.y + 6)).toBeCloseTo(30, 6);
    expect(Math.atan2(r.x, -(r.y + 6)) / DEG).toBeCloseTo(30, 6);
    const fly = koboFlyAt(0.4, { x: 0, y: 0 }, { x: 100, y: -50 });
    expect(fly).toEqual({ x: 100, y: -50, done: true });
    expect(koboFlyAt(0.2, { x: 0, y: 0 }, { x: 100, y: 0 }).x).toBeCloseTo(50, 6);
  });

  it('food pop: 24 u above the crate in 0.25 s, then straight down at 90 u/s to the road', () => {
    const top = 204 - 28;
    expect(foodPopAt(0, 204, 272).y).toBeCloseTo(top, 6);
    expect(foodPopAt(0.25, 204, 272).y).toBeCloseTo(top - 24, 6);
    expect(foodPopAt(0.75, 204, 272).y).toBeCloseTo(top - 24 + 45, 6);
    expect(foodPopAt(5, 204, 272)).toEqual({ y: 272, landed: true });
  });
});
