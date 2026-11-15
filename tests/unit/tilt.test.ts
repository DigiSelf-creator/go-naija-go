/**
 * S3f0 part 25 (decision 70): the tilt filter, with no browser (25.10 check 1k covers a to g).
 * Readings come every 16 ms; each one is held 0.2 s unless said, as in the Playwright check.
 */
import { describe, expect, it } from 'vitest';
import { TILT_DEAD_DEG, TILT_FIRE_DEG, TILT_MAX_DEG, TILT_REARM_DEG, TiltReader, steerAngle } from '../../src/lane/input';
import type { LaneMove } from '../../src/lane/sim';

const STEP = 16;

/** A reader and a clock: `hold(angle, s)` feeds that angle for s seconds and returns the moves. */
function rig() {
  const r = new TiltReader();
  let t = 1000;
  const hold = (angle: number, s = 0.2): LaneMove[] => {
    const out: LaneMove[] = [];
    for (let left = s * 1000; left > 0; left -= STEP) {
      t += STEP;
      const m = r.read(angle, t);
      if (m) out.push(m);
    }
    return out;
  };
  /** "3, 2, 1" (1.8 s) at `angle`, the last 0.5 s collected, then "Go!". */
  const countAt = (angle: number, during = angle): LaneMove[] => {
    r.count();
    const a = hold(during, 1.3);
    r.collect();
    const b = hold(angle, 0.5);
    r.calibrate();
    return [...a, ...b];
  };
  return { r, hold, countAt, now: () => t };
}

describe('the numbers (part 25.2, TS-R3)', () => {
  it("are the note's", () => {
    expect([TILT_FIRE_DEG, TILT_REARM_DEG, TILT_DEAD_DEG, TILT_MAX_DEG]).toEqual([15, 8, 5, 60]);
  });
});

describe('TiltReader (25.10 check 1, a to g)', () => {
  it('a. the centre is taken over the last 0.5 s of "3, 2, 1"; no move during the count, even at 40', () => {
    const { r, hold } = rig();
    r.count();
    expect(hold(40, 1)).toEqual([]);
    expect(hold(20, 0.3)).toEqual([]);
    r.collect();
    expect(hold(20, 0.5)).toEqual([]);
    r.calibrate();
    expect(r.centre).toBeCloseTo(20, 1);
  });

  it('b. 24 and 33 do nothing; 36 moves one lane right; holding 36 for 1.9 s makes no second move', () => {
    const { hold, countAt } = rig();
    countAt(20);
    expect(hold(24)).toEqual([]);
    expect(hold(33)).toEqual([]);
    expect(hold(36)).toEqual(['right']);
    expect(hold(36, 1.7)).toEqual([]);
  });

  it('c. back to 27 re-arms (within 8); back to 29 does not', () => {
    const { hold, countAt } = rig();
    countAt(20);
    expect(hold(36)).toEqual(['right']);
    expect(hold(27)).toEqual([]);
    expect(hold(36)).toEqual(['right']);
    expect(hold(29)).toEqual([]);
    expect(hold(36)).toEqual([]);
  });

  it('d. back to 20, then 4 moves one lane left', () => {
    const { hold, countAt } = rig();
    countAt(20);
    expect(hold(36)).toEqual(['right']);
    expect(hold(20)).toEqual([]);
    expect(hold(4)).toEqual(['left']);
  });

  it('e. a tilt held 2 s becomes the new centre with no move; then 52 moves right', () => {
    const { r, hold, countAt } = rig();
    countAt(20);
    expect(hold(36)).toEqual(['right']);
    expect(hold(36, 2.2)).toEqual([]);
    expect(r.centre).toBeCloseTo(36, 0);
    expect(hold(52)).toEqual(['right']);
  });

  it('the dead zone: a slow slump never steers, and the centre follows the hand', () => {
    const { r, hold, countAt } = rig();
    countAt(20);
    // 4 degrees off for 10 s: the centre creeps after it, then a slow drift on to 30 never fires.
    expect(hold(24, 10)).toEqual([]);
    expect(r.centre).toBeGreaterThan(23);
    for (let a = 24; a <= 30; a += 0.5) expect(hold(a, 1)).toEqual([]);
  });

  it('a very big tilt is still one lane, and counts as 60', () => {
    const { r, hold, countAt } = rig();
    countAt(0);
    expect(hold(90, 1)).toEqual(['right']);
    expect(r.offset).toBe(TILT_MAX_DEG);
    expect(hold(-90, 0.2)).toEqual([]);
    expect(r.offset).toBe(-TILT_MAX_DEG);
  });

  it('re-arms only within 8: 9 back keeps it out (the hysteresis)', () => {
    const { hold, countAt } = rig();
    countAt(0);
    expect(hold(16)).toEqual(['right']);
    // A wobble around 15 never fires twice.
    for (let i = 0; i < 6; i++) expect(hold(i % 2 ? 14 : 16, 0.1)).toEqual([]);
    expect(hold(9)).toEqual([]);
    expect(hold(16)).toEqual([]);
    expect(hold(7.5)).toEqual([]);
    expect(hold(16)).toEqual(['right']);
  });

  it('f. the screen turned to 270 flips the sign: the same readings move the other way', () => {
    const at90 = rig();
    const at270 = rig();
    const feed = (k: ReturnType<typeof rig>, angle: number) => (beta: number, s = 0.2) => k.hold(steerAngle(beta, angle)!, s);
    at90.countAt(steerAngle(20, 90)!);
    at270.countAt(steerAngle(20, 270)!);
    expect(feed(at90, 90)(36)).toEqual(['right']);
    expect(feed(at270, 270)(36)).toEqual(['left']);
    feed(at90, 90)(20);
    feed(at270, 270)(20);
    expect(feed(at90, 90)(4)).toEqual(['left']);
    expect(feed(at270, 270)(4)).toEqual(['right']);
  });

  it('steerAngle: 90 is beta, 270 (and -90) is -beta, upright is null', () => {
    expect(steerAngle(12, 90)).toBe(12);
    expect(steerAngle(12, 270)).toBe(-12);
    expect(steerAngle(12, -90)).toBe(-12);
    expect(steerAngle(12, 0)).toBeNull();
    expect(steerAngle(12, 180)).toBeNull();
  });

  it('g. a flip during play makes no move; readings are ignored 0.3 s, then the centre is taken afresh', () => {
    const { r, hold, countAt, now } = rig();
    countAt(steerAngle(20, 90)!);
    // The phone turns round: the same hold now reads -20.
    r.flip(now());
    expect(hold(steerAngle(20, 270)!, 0.25)).toEqual([]);
    expect(Number.isNaN(r.centre)).toBe(true);
    expect(hold(steerAngle(20, 270)!, 0.3)).toEqual([]);
    expect(r.centre).toBeCloseTo(-20, 0);
    // Lowering the right side (beta down at 270, so the angle goes up) goes right.
    expect(hold(steerAngle(4, 270)!)).toEqual(['right']);
  });

  it('paused: readings make no move, and resuming takes a fresh centre', () => {
    const { r, hold, countAt } = rig();
    countAt(20);
    r.pause();
    expect(hold(60)).toEqual([]);
    expect(countAt(40)).toEqual([]);
    expect(r.centre).toBeCloseTo(40, 0);
    expect(hold(56)).toEqual(['right']);
  });

  it('with no readings in the count, the first reading in play is the centre (no move)', () => {
    const { r, hold } = rig();
    r.count();
    r.collect();
    r.calibrate();
    expect(hold(40, 0.5)).toEqual([]);
    expect(r.centre).toBeCloseTo(40, 0);
    expect(hold(24)).toEqual(['left']);
  });

  it('a jump or a slide never comes from tilt', () => {
    const { hold, countAt } = rig();
    countAt(0);
    const moves = [...hold(30), ...hold(0), ...hold(-30), ...hold(0), ...hold(59)];
    expect(moves.every((m) => m === 'left' || m === 'right')).toBe(true);
  });
});
