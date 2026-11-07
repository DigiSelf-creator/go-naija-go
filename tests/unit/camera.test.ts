/**
 * H1: the taller view and the street camera (docs/design.md S2.1, S2.2 Camera).
 */
import { describe, expect, it } from 'vitest';
import { CAMERA, Camera, heroScreenX } from '../../src/game/camera';
import { MIN_WORLD_W, WORLD_H, fitView } from '../../src/engine/view';

const DT = 1 / 60;

describe('S2.1 the view is 420 u tall', () => {
  it('shows the widths in the S2.1 table', () => {
    expect(WORLD_H).toBe(420);
    expect(fitView(320, 240, 1).width).toBeCloseTo(560, 5);
    expect(fitView(1600, 900, 1).width).toBeCloseTo(746.7, 1);
    expect(fitView(851, 393, 1).width).toBeCloseTo(909.5, 1);
    expect(fitView(1024, 768, 1).width).toBeCloseTo(560, 5);
    for (const [w, h] of [[320, 240], [851, 393], [1024, 768]] as const) expect(fitView(w, h, 2).height).toBe(420);
  });
  it('keeps the 480 u safety net on an upright screen', () => {
    const v = fitView(393, 851, 1);
    expect(v.width).toBeCloseTo(MIN_WORLD_W, 5);
    expect(v.height).toBeGreaterThan(420);
  });
  it('hero places: 20 percent forward on a 560 u view, 30 on wide ones', () => {
    expect(heroScreenX(560)).toBeCloseTo(0.2, 5);
    expect(heroScreenX(909)).toBeCloseTo(0.3, 5);
  });
});

describe('S2.2 the camera', () => {
  const W = 747;
  const f = heroScreenX(W);

  function walk(cam: Camera, from: number, to: number, speed = 156): number {
    let x = from;
    const dir = Math.sign(to - from);
    while ((to - x) * dir > 0) {
      x += dir * Math.min(speed * DT, Math.abs(to - x));
      cam.step(x, W, DT);
    }
    return x;
  }

  it('starts with the hero at the forward place, looking right', () => {
    const cam = new Camera(20, 10800);
    cam.snap(1000, W);
    expect(cam.look).toBe(1);
    expect((1000 - cam.x) / W).toBeCloseTo(f, 5);
  });

  it('a quick step back does not swing the camera; 48 u back without stopping does', () => {
    const cam = new Camera(20, 10800);
    cam.snap(2000, W);
    walk(cam, 2000, 1960); // 40 u back
    expect(cam.look).toBe(1);
    cam.step(1960, W, DT); // a stop
    walk(cam, 1960, 1920); // another 40 u: the count started again
    expect(cam.look).toBe(1);
    walk(cam, 1920, 1870); // 50 u without stopping
    expect(cam.look).toBe(-1);
    for (let i = 0; i < 400; i++) cam.step(1870, W, DT);
    expect((1870 - cam.x) / W).toBeCloseTo(1 - f, 2); // the back place, 70 percent
    walk(cam, 1870, 1930); // and back to looking right after 48 u right
    expect(cam.look).toBe(1);
  });

  it('moves 10 percent of the way each step, never faster than 480 u/s', () => {
    const cam = new Camera(-10000, 100000);
    cam.snap(5000, W);
    const before = cam.x;
    cam.step(5030, W, DT); // a small move: 10 percent of 30
    expect(cam.x - before).toBeCloseTo(3, 5);
    const cam2 = new Camera(-10000, 100000);
    cam2.snap(5000, W);
    cam2.look = -1; // a big swing wants to move 0.4 * W at once
    const b2 = cam2.x;
    cam2.step(5000, W, DT);
    expect(Math.abs(cam2.x - b2)).toBeCloseTo((CAMERA.maxSpeed * DT), 5);
  });

  it('the hero always stays between 8 and 92 percent of the screen', () => {
    const cam = new Camera(-10000, 100000);
    cam.snap(5000, W);
    // Corn run at 228 straight after a swing: the camera lags, the hard rule holds.
    let x = 5000;
    for (let i = 0; i < 600; i++) {
      x += (i < 120 ? -228 : 228) * DT;
      cam.step(x, W, DT);
      const at = (x - cam.x) / W;
      expect(at).toBeGreaterThanOrEqual(0.08 - 1e-9);
      expect(at).toBeLessThanOrEqual(0.92 + 1e-9);
    }
  });

  it('never shows more than 40 u past the start fence or the end wall', () => {
    const cam = new Camera(20, 3000);
    cam.snap(27, W); // hero against the fence
    expect(cam.x).toBe(-20);
    walk(cam, 27, 2993);
    for (let i = 0; i < 300; i++) cam.step(2993, W, DT);
    expect(cam.x + W).toBeCloseTo(3040, 5);
  });

  it('back-tracking to the start fence works, and the camera follows', () => {
    const cam = new Camera(20, 10800);
    cam.snap(2000, W);
    walk(cam, 2000, 27);
    for (let i = 0; i < 300; i++) cam.step(27, W, DT);
    expect(cam.look).toBe(-1);
    expect(cam.x).toBe(-20);
  });
});
