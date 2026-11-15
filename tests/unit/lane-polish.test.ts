import { describe, expect, it } from 'vitest';
import { FLY_GAP, FLY_MAX, FLY_TIME, INTRO_TIME, LAMP_DOTS, LINE_SWAP_AT, LOOK_BACK_UNTIL, PopFlights, STILL_LAMPS, TURN_TIME, introAt, laneCountBox, litDots } from '../../src/lane/polish';
import { HORIZON } from '../../src/lane/view';
import { WORDS } from '../../src/screens/words';

describe('S3f0 part 15: the lamp dots', () => {
  it('6 dots, each 10 m, going dark as the Blackout closes', () => {
    expect(LAMP_DOTS).toBe(6);
    expect(litDots(60)).toBe(6);
    expect(litDots(100)).toBe(6);
    expect(litDots(40)).toBe(4);
    expect(litDots(17)).toBe(2);
    expect(litDots(10)).toBe(1);
    expect(litDots(0.5)).toBe(1);
    expect(litDots(0)).toBe(0);
    expect(litDots(-3)).toBe(0);
    expect(litDots(Number.NaN)).toBe(0);
  });
});

describe('S3f0 part 9: pickups fly to their chips', () => {
  it('a flyer is in the air until it lands; the chip shows it only then', () => {
    const f = new PopFlights();
    f.send('power', 1, 1, 100, 200);
    expect(f.inFlight()).toEqual({ kobo: 0, power: 1, tech: 0 });
    f.step(FLY_TIME / 2);
    expect(f.list).toHaveLength(1);
    f.step(FLY_TIME / 2 + 0.001);
    expect(f.list).toHaveLength(0);
    expect(f.inFlight()).toEqual({ kobo: 0, power: 0, tech: 0 });
  });

  it('a burst sends several one after another; coins count in kobo', () => {
    const f = new PopFlights();
    f.send('naira', 10, 2, 0, 0);
    f.send('tech', 1, 1, 0, 0);
    expect(f.inFlight()).toEqual({ kobo: 20, power: 0, tech: 1 });
    expect(f.list.map((x) => x.t)).toEqual([0, -FLY_GAP, 0]);
    // The second coin waits before it leaves: no place yet.
    expect(PopFlights.at(f.list[1]!, 50, 10)).toBeNull();
    f.step(FLY_TIME + 0.001);
    expect(f.inFlight()).toEqual({ kobo: 10, power: 0, tech: 0 });
    f.step(FLY_GAP);
    expect(f.list).toHaveLength(0);
  });

  it('flies on art\'s path from where it popped to the chip', () => {
    const f = new PopFlights();
    f.send('naira', 10, 1, 300, 250);
    const start = PopFlights.at(f.list[0]!, 40, 20)!;
    expect(start).toEqual({ x: 300, y: 250 });
    f.step(FLY_TIME * 0.999);
    const end = PopFlights.at(f.list[0]!, 40, 20)!;
    expect(end.x).toBeCloseTo(40, 0);
    expect(end.y).toBeCloseTo(20, 0);
  });

  it('never more than FLY_MAX in the air', () => {
    const f = new PopFlights();
    f.send('naira', 10, FLY_MAX + 5, 0, 0);
    expect(f.list).toHaveLength(FLY_MAX);
    f.clear();
    expect(f.list).toHaveLength(0);
  });

  it('reduced motion words: a short "+1", and the money for Naira', () => {
    expect(WORDS.lane.plus('1')).toBe('+1');
    expect(WORDS.lane.plus('₦0.10')).toBe('+₦0.10');
  });
});

describe('S3f0 part 14: the first run\'s look back', () => {
  it('2 s: looking back as the far lamps go off, the turn, then behind the hero', () => {
    expect(INTRO_TIME).toBe(2);
    expect(introAt(0, false)).toMatchObject({ view: 'back', lamps: 0, line: 0 });
    const mid = introAt(0.6, false);
    expect(mid.view).toBe('back');
    expect(mid.lamps).toBeGreaterThan(0);
    expect(mid.lamps).toBeLessThan(1);
    expect(introAt(LINE_SWAP_AT + 0.01, false).line).toBe(1);
    const turn = introAt(LOOK_BACK_UNTIL + TURN_TIME / 2, false);
    expect(turn.view).toBe('turn');
    expect(turn.turn).toBeCloseTo(0.5);
    expect(introAt(LOOK_BACK_UNTIL + TURN_TIME + 0.01, false)).toMatchObject({ view: 'front', turn: 1, line: 1 });
    expect(LOOK_BACK_UNTIL + TURN_TIME).toBeLessThan(INTRO_TIME);
  });

  it('the lamps only ever go off, never back on, as it plays', () => {
    let last = -1;
    for (let t = 0; t < INTRO_TIME; t += 0.05) {
      const k = introAt(t, false).lamps;
      expect(k).toBeGreaterThanOrEqual(last);
      last = k;
    }
  });

  it('reduced motion: one still picture with both lines, the whole 2 s', () => {
    for (const t of [0, 0.5, 1.2, 1.9]) expect(introAt(t, true)).toEqual({ view: 'back', lamps: STILL_LAMPS, turn: 0, line: 2 });
  });

  it('the words are the note\'s', () => {
    expect(WORDS.lane.lookBack).toBe('The Blackout is switching off the lamps.');
    expect(WORDS.lane.runToStop).toBe('Run to the bus stop!');
  });
});

describe('S3f0 part 11: the corn count in the lane run\'s hint bar place', () => {
  it('under row 2, centred, S2.9 sizes, and above the horizon where it can be', () => {
    for (const [w, h] of [
      [320, 240],
      [568, 320],
      [640, 200],
      [851, 393],
      [1920, 1080],
    ] as const) {
      const b = laneCountBox(w, h, 0);
      expect(b.top).toBe((h >= 360 ? 48 : 44) + 24);
      expect(Math.abs(b.x + b.w / 2 - w / 2)).toBeLessThanOrEqual(1);
      expect(b.w).toBeLessThanOrEqual(300);
      expect(b.bottom - b.top).toBeGreaterThanOrEqual(22);
      const spec = h < 280 ? 40 : h < 420 ? 56 : 72;
      expect(b.bottom - b.top).toBeLessThanOrEqual(spec + 6);
      if (Math.round(HORIZON * h) - 2 - b.top >= 22) expect(b.bottom).toBeLessThanOrEqual(Math.round(HORIZON * h) - 2);
    }
    expect(laneCountBox(1920, 1080, 0).bottom - laneCountBox(1920, 1080, 0).top).toBe(78);
    expect(laneCountBox(851, 393, 0).size).toBe('mid');
    expect(laneCountBox(320, 240, 0).size).toBe('small');
  });

  it('starts below the safe top edge', () => {
    expect(laneCountBox(851, 393, 30).top).toBe(30 + 48 + 24);
  });
});
