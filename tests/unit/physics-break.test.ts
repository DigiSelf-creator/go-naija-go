/**
 * qa (A6): try to break the jump with the inputs real players make.
 * Very fast taps, a finger held forever, and long stalls (switching apps).
 */
import { describe, expect, it } from 'vitest';
import { MAX_STEPS, accumulate } from '../../src/engine/loop';
import { FALL_Y, GROUND_Y, PHYSICS, createBody, press, release, step, type Terrain } from '../../src/engine/physics';

const DT = 1 / 60;
const flat: Terrain = { groundY: GROUND_Y, fallY: FALL_Y, ground: [{ x0: -1000, x1: 100000 }], platforms: [] };

describe('very fast taps', () => {
  it('20 taps in 1 s never give more than one jump in the air per airtime', () => {
    for (const gap of [1, 2, 3, 4, 5]) {
      const b = createBody(0, flat);
      let airJumpsThisAirtime = 0;
      let airJumps = 0;
      let ignored = 0;
      for (let s = 0; s < 120; s++) {
        // One tap (down then up in the same frame) every `gap` steps for the first second.
        if (s < 60 && s % gap === 0) {
          const r = press(b);
          release(b);
          if (r === 'ground') airJumpsThisAirtime = 0;
          if (r === 'air') {
            airJumpsThisAirtime++;
            airJumps++;
            expect(b.vy).toBe(PHYSICS.airJumpVy);
          }
          if (r === 'buffered') ignored++;
          expect(airJumpsThisAirtime).toBeLessThanOrEqual(1);
        }
        step(b, flat, DT);
        // A buffered tap jumps the moment the feet touch: that is a new ground jump.
        if (b.grounded || b.vy === PHYSICS.jumpVy) airJumpsThisAirtime = 0;
        // Never higher than a full ground jump plus a full air jump (both tapped, not held).
        expect(GROUND_Y - b.y).toBeLessThan(160);
      }
      expect(airJumps).toBeGreaterThan(0);
      expect(ignored).toBeGreaterThan(0);
    }
  });

  it('three taps in a row from the ground: ground jump, air jump, then nothing', () => {
    const b = createBody(0, flat);
    expect(press(b)).toBe('ground');
    release(b);
    step(b, flat, DT);
    expect(press(b)).toBe('air');
    release(b);
    step(b, flat, DT);
    const vy = b.vy;
    expect(press(b)).toBe('buffered');
    expect(b.vy).toBe(vy);
  });
});

describe('finger held forever', () => {
  it('jumps once, lands, then keeps running on the road with normal gravity', () => {
    const b = createBody(0, flat);
    expect(press(b)).toBe('ground');
    let jumps = 0;
    let lastVy = b.vy;
    let landed = false;
    for (let s = 0; s < 600; s++) {
      step(b, flat, DT);
      // Gravity is decided from the speed at the start of the step: once falling, it is normal.
      if (lastVy >= 0) expect(b.holding).toBe(false);
      if (b.vy < 0 && lastVy >= 0) jumps++; // a new jump starts
      lastVy = b.vy;
      if (b.grounded) landed = true;
    }
    expect(landed).toBe(true);
    expect(jumps).toBe(0);
    expect(b.grounded).toBe(true);
    expect(b.y).toBe(GROUND_Y);
    expect(b.down).toBe(true);
    expect(b.x).toBeCloseTo(PHYSICS.runSpeed * 10, 0);
  });

  it('a held finger never gives lighter gravity on the way down', () => {
    const b = createBody(0, flat);
    press(b);
    while (b.vy < 0) step(b, flat, DT);
    const before = b.vy;
    step(b, flat, DT);
    expect(b.vy - before).toBeCloseTo(PHYSICS.gravity * DT, 6);
  });
});

describe('long stalls (switching apps, slow phone)', () => {
  it('a 10 s stall runs at most 4 steps, so the hero never teleports', () => {
    const b = createBody(0, flat);
    press(b);
    release(b);
    for (let i = 0; i < 5; i++) step(b, flat, DT);
    const x = b.x;
    const r = accumulate(0, 10_000);
    expect(r.steps).toBe(MAX_STEPS);
    for (let i = 0; i < r.steps; i++) step(b, flat, DT);
    expect(b.x - x).toBeCloseTo(PHYSICS.runSpeed * DT * MAX_STEPS, 6);
  });

  it('negative or zero frame times (clock jumps) run no steps', () => {
    expect(accumulate(0, -500).steps).toBe(0);
    expect(accumulate(0, 0).steps).toBe(0);
  });
});
