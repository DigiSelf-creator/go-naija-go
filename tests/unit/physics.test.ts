import { describe, expect, it } from 'vitest';
import { accumulate } from '../../src/engine/loop';
import {
  FALL_Y,
  GROUND_Y,
  PHYSICS,
  bounce,
  createBody,
  press,
  release,
  step,
  type Body,
  type Terrain,
} from '../../src/engine/physics';

const DT = 1 / 60;

const flat = (platforms: Terrain['platforms'] = []): Terrain => ({
  groundY: GROUND_Y,
  fallY: FALL_Y,
  ground: [{ x0: -1000, x1: 100000 }],
  platforms,
});

/** Steps until the hero is grounded again (or a limit). Returns the peak height above the start. */
function flight(b: Body, t: Terrain, opts: { releaseAfter?: number } = {}): { peak: number; steps: number } {
  const startY = b.y;
  let minY = b.y;
  let n = 0;
  do {
    if (opts.releaseAfter !== undefined && n === opts.releaseAfter) release(b);
    step(b, t, DT);
    minY = Math.min(minY, b.y);
    n++;
  } while (!b.grounded && !b.fallen && n < 1000);
  return { peak: startY - minY, steps: n };
}

describe('jump', () => {
  it('a tap jumps off the ground and lands back on the road', () => {
    const t = flat();
    const b = createBody(0, t);
    expect(press(b)).toBe('ground');
    release(b);
    expect(b.vy).toBe(PHYSICS.jumpVy);
    const { peak, steps } = flight(b, t);
    // Design: 74 u and 0.52 s by formula; about 5 u lower with dt = 1/60.
    expect(peak).toBeGreaterThan(66);
    expect(peak).toBeLessThan(75);
    expect(steps).toBeGreaterThanOrEqual(30);
    expect(steps).toBeLessThanOrEqual(33);
    expect(b.grounded).toBe(true);
    expect(b.y).toBe(GROUND_Y);
    expect(b.vy).toBe(0);
  });

  it('holding jumps higher than a tap, and letting go returns to normal gravity', () => {
    const t = flat();
    const tap = createBody(0, t);
    press(tap);
    release(tap);
    const tapPeak = flight(tap, t).peak;

    const held = createBody(0, t);
    press(held);
    const holdPeak = flight(held, t).peak;
    expect(holdPeak).toBeGreaterThan(tapPeak + 60);
    expect(holdPeak).toBeGreaterThan(135);
    expect(holdPeak).toBeLessThan(145);

    const half = createBody(0, t);
    press(half);
    const halfPeak = flight(half, t, { releaseAfter: 10 }).peak;
    expect(halfPeak).toBeGreaterThan(tapPeak);
    expect(halfPeak).toBeLessThan(holdPeak);
  });

  it('lighter gravity needs the press that started the jump (a bounce is not held)', () => {
    const t = flat();
    const b = createBody(0, t);
    b.down = true; // finger already down from before
    bounce(b);
    step(b, t, DT);
    expect(b.holding).toBe(false);
    expect(b.vy).toBeCloseTo(PHYSICS.bounceVy + PHYSICS.gravity * DT, 6);
  });
});

describe('second jump', () => {
  it('gives exactly one jump in the air, and it comes back on landing', () => {
    const t = flat();
    const b = createBody(0, t);
    press(b);
    release(b);
    for (let i = 0; i < 10; i++) step(b, t, DT);
    expect(press(b)).toBe('air');
    expect(b.vy).toBe(PHYSICS.airJumpVy); // set, not added
    release(b);
    for (let i = 0; i < 5; i++) step(b, t, DT);
    const vy = b.vy;
    expect(press(b)).toBe('buffered'); // no third jump
    expect(b.vy).toBe(vy);
    release(b);
    while (!b.grounded) step(b, t, DT);
    expect(b.airJump).toBe(true);
    // Run a few steps, then the full set works again.
    for (let i = 0; i < 10; i++) step(b, t, DT);
    expect(press(b)).toBe('ground');
    release(b);
    step(b, t, DT);
    expect(press(b)).toBe('air');
  });

  it('works after walking off an edge, once coyote time is over', () => {
    const t: Terrain = { ...flat(), ground: [{ x0: -1000, x1: 10 }] };
    const b = createBody(0, t);
    while (b.grounded) step(b, t, DT);
    for (let i = 0; i < PHYSICS.coyoteSteps; i++) step(b, t, DT);
    expect(press(b)).toBe('air');
    expect(b.vy).toBe(PHYSICS.airJumpVy);
  });

  it('is still there after a bounce', () => {
    const t = flat();
    const b = createBody(0, t);
    bounce(b);
    expect(b.vy).toBe(PHYSICS.bounceVy);
    step(b, t, DT);
    expect(press(b)).toBe('air');
    release(b);
    expect(press(b)).toBe('buffered');
  });
});

describe('coyote time and jump buffer', () => {
  it('a tap just after running off an edge is still a full ground jump', () => {
    const t: Terrain = { ...flat(), ground: [{ x0: -1000, x1: 10 }] };
    const b = createBody(0, t);
    while (b.grounded) step(b, t, DT);
    for (let i = 1; i < PHYSICS.coyoteSteps; i++) step(b, t, DT);
    expect(press(b)).toBe('ground');
    expect(b.vy).toBe(PHYSICS.jumpVy);
    expect(b.airJump).toBe(true);
  });

  it('a tap just before landing jumps the moment the feet touch', () => {
    const t = flat();
    const b = createBody(0, t);
    press(b);
    release(b);
    step(b, t, DT);
    press(b); // air jump
    release(b);
    // Fall until a few steps before touching down.
    while (b.y + b.vy * DT * 4 < GROUND_Y) step(b, t, DT);
    expect(press(b)).toBe('buffered');
    release(b);
    let jumped = false;
    for (let i = 0; i < PHYSICS.bufferSteps; i++) {
      step(b, t, DT);
      if (b.vy === PHYSICS.jumpVy) jumped = true;
    }
    expect(jumped).toBe(true);
    expect(b.grounded).toBe(false);
  });

  it('a tap too early before landing is forgotten', () => {
    const t = flat();
    const b = createBody(0, t);
    press(b);
    release(b);
    step(b, t, DT);
    press(b);
    release(b);
    for (let i = 0; i < 5; i++) step(b, t, DT); // still rising, far from the road
    press(b);
    release(b);
    while (!b.grounded) step(b, t, DT);
    step(b, t, DT);
    expect(b.grounded).toBe(true);
  });
});

describe('landing', () => {
  it('lands on a platform only while falling; jumps up through it from below', () => {
    const roof = { x: 0, y: 240, w: 400 };
    const t = flat([roof]);
    const b = createBody(20, t);
    press(b); // hold: peak about 140 u, well above the roof at 60 u
    let passedUp = false;
    let n = 0;
    while (!b.grounded || n === 0) {
      step(b, t, DT);
      if (b.vy < 0 && b.y < roof.y) passedUp = true;
      n++;
    }
    expect(passedUp).toBe(true);
    expect(b.on).toBe(roof);
    expect(b.y).toBe(roof.y);
    expect(b.airJump).toBe(true);
    // Keeps standing on it while running along.
    for (let i = 0; i < 30; i++) step(b, t, DT);
    expect(b.grounded).toBe(true);
    expect(b.y).toBe(roof.y);
  });

  it('runs off the end of a platform and drops to the road', () => {
    const roof = { x: 0, y: 240, w: 40 };
    const t = flat([roof]);
    const b = createBody(10, t);
    b.y = roof.y;
    b.prevY = roof.y;
    step(b, t, DT);
    expect(b.on).toBe(roof);
    while (b.on === roof) step(b, t, DT);
    expect(b.x).toBeGreaterThan(roof.x + roof.w + PHYSICS.platformGrace);
    while (!b.grounded) step(b, t, DT);
    expect(b.y).toBe(GROUND_Y);
    expect(b.on).toBe(null);
  });

  it('platform edges have 6 u of grace', () => {
    const roof = { x: 100, y: 290, w: 50 };
    const t: Terrain = { ...flat([roof]), ground: [] };
    const near = createBody(roof.x - 5, t);
    near.speed = 0;
    near.y = near.prevY = 280;
    near.grounded = false;
    near.coyote = 0;
    while (!near.grounded && !near.fallen) step(near, t, DT);
    expect(near.on).toBe(roof);

    const far = createBody(roof.x - 7, t);
    far.speed = 0;
    far.y = far.prevY = 280;
    far.grounded = false;
    far.coyote = 0;
    while (!far.grounded && !far.fallen) step(far, t, DT);
    expect(far.fallen).toBe(true);
  });
});

describe('potholes', () => {
  it('running into a gap falls through and is lost below y = 420', () => {
    const t: Terrain = { ...flat(), ground: [{ x0: -1000, x1: 50 }, { x0: 150, x1: 1000 }] };
    const b = createBody(0, t);
    let n = 0;
    while (!b.fallen && n < 600) {
      step(b, t, DT);
      n++;
    }
    expect(b.fallen).toBe(true);
    expect(b.y).toBeGreaterThan(FALL_Y);
    expect(b.x).toBeLessThan(150);
    // A fallen hero ignores taps.
    expect(press(b)).toBe(null);
  });

  it('a tap jump clears a 60 u gap', () => {
    const t: Terrain = { ...flat(), ground: [{ x0: -1000, x1: 100 }, { x0: 160, x1: 1000 }] };
    const b = createBody(0, t);
    while (b.x < 95) step(b, t, DT);
    press(b);
    release(b);
    flight(b, t);
    expect(b.fallen).toBe(false);
    expect(b.x).toBeGreaterThan(160);
  });
});

describe('same jump at any frame rate', () => {
  /** Draws frames at fps; presses at frame 0 and releases after releaseMs. */
  function run(fps: number, releaseMs: number, airJumpAtMs?: number): { peak: number; landX: number } {
    const t = flat();
    const b = createBody(0, t);
    let acc = 0;
    let time = 0;
    let minY = b.y;
    let left = false;
    let landX = NaN;
    let airDone = airJumpAtMs === undefined;
    press(b);
    for (let frame = 0; frame < fps * 5; frame++) {
      // Whole ms, so float drift never moves an input by a frame.
      const now = Math.round(time);
      if (now >= releaseMs && b.down) release(b);
      if (!airDone && now >= airJumpAtMs!) {
        press(b);
        airDone = true;
      }
      const r = accumulate(acc, 1000 / fps);
      acc = r.acc;
      for (let i = 0; i < r.steps; i++) {
        step(b, t, DT);
        if (!b.grounded) left = true;
        minY = Math.min(minY, b.y);
        if (left && b.grounded && Number.isNaN(landX)) landX = b.x;
      }
      time += 1000 / fps;
      if (!Number.isNaN(landX)) break;
    }
    return { peak: GROUND_Y - minY, landX };
  }

  it.each([
    ['tap', 0, undefined],
    ['short hold', 200, undefined],
    ['full hold', 1000, undefined],
    ['hold then second jump', 1000, 500],
  ] as const)('%s: 30 fps and 60 fps match within 1 u', (_name, releaseMs, airMs) => {
    const a = run(60, releaseMs, airMs);
    const c = run(30, releaseMs, airMs);
    expect(Math.abs(a.peak - c.peak)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.landX - c.landX)).toBeLessThanOrEqual(1);
  });

  it('is still the same jump on a slow 20 fps phone', () => {
    const a = run(60, 1000);
    const c = run(20, 1000);
    expect(Math.abs(a.peak - c.peak)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.landX - c.landX)).toBeLessThanOrEqual(1);
  });
});
