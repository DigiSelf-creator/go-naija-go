/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.2, a2.3, a2.6, a2.7, a2.9): the moving intro's
 * clock. Beats, a jump to the next beat (with a fast camera move), a pause that starts the beat
 * again, the hold, the stop 3 s into the hold, done, and the cues each played once.
 */
import { describe, expect, it } from 'vitest';
import {
  END_LINE_AT,
  HERO_LINE,
  INTRO_CHOICES,
  INTRO_MOVES,
  IntroScene,
  JUMP_MOVE,
  endLineShown,
  heroLineShown,
  musicLevelAt,
} from '../../src/game/intro';
import { WORDS } from '../../src/screens/words';
import { INTRO_BEATS, INTRO_CUES, INTRO_HOLD, INTRO_STILL_AFTER, introBeatAt, type IntroCue } from '../../src/art/intro-scene';

const clock = () => new IntroScene<IntroCue>({ beats: INTRO_BEATS, stillAfter: INTRO_STILL_AFTER, cues: INTRO_CUES });
const STEP = 1 / 60;

/** Runs the clock for `secs` real seconds in 60 Hz steps; returns every cue played. */
function run(c: IntroScene<IntroCue>, secs: number): IntroCue[] {
  const out: IntroCue[] = [];
  for (let i = 0; i < Math.round(secs * 60); i++) out.push(...c.tick(STEP));
  return out;
}

describe('the intro clock (S3a4)', () => {
  it('runs through the six beats at the a2.2 times, then the hold', () => {
    const c = clock();
    expect(c.beat).toBe(0);
    expect(c.holdAt).toBe(INTRO_HOLD);
    const starts: number[] = [];
    let last = -1;
    for (let i = 0; i < 29 * 60; i++) {
      if (c.beat !== last) {
        starts.push(c.t);
        last = c.beat;
      }
      c.tick(STEP);
    }
    expect(starts).toHaveLength(7);
    starts.forEach((s, i) => expect(s).toBeCloseTo(INTRO_BEATS[i]!, 1));
    expect(c.inHold).toBe(true);
    expect(c.beat).toBe(6);
    // The clock's beat agrees with art's.
    const d = clock();
    for (const t of [0, 5.9, 6, 10.99, 11, 15.5, 19.9, 20, 24.5, 27.79, 27.8, 30]) {
      d.t = t;
      expect(d.beat, `t ${t}`).toBe(introBeatAt(t));
    }
  });

  it('stops 3 s into the hold: still, and the time no longer moves', () => {
    const c = clock();
    run(c, 30.5);
    expect(c.still).toBe(false);
    run(c, 0.4);
    expect(c.still).toBe(true);
    expect(c.t).toBe(INTRO_HOLD + INTRO_STILL_AFTER);
    run(c, 5);
    expect(c.t).toBe(INTRO_HOLD + INTRO_STILL_AFTER);
  });

  it('plays every cue once, in order, at its time', () => {
    const c = clock();
    const played: { at: number; cue: IntroCue }[] = [];
    for (let i = 0; i < 32 * 60; i++) for (const cue of c.tick(STEP)) played.push({ at: c.t, cue });
    expect(played.map((p) => p.cue)).toEqual([...INTRO_CUES]);
    for (const p of played) {
      expect(p.at).toBeGreaterThan(p.cue.t);
      expect(p.at - p.cue.t).toBeLessThanOrEqual(STEP + 1e-9);
    }
  });

  it('a jump goes to the next beat start, skips the jumped-over cues and plays the new beat own cues', () => {
    const c = clock();
    const first = run(c, 1);
    expect(first).toEqual([INTRO_CUES[0]]);
    expect(c.jump()).toBe(true);
    expect(c.t).toBe(6);
    expect(c.beat).toBe(1);
    // The 4 s cues were jumped over; 7 and 8.6 still come.
    const next = run(c, 3);
    expect(next.map((x) => x.t)).toEqual([7, 8.6]);
    // Six jumps from the start reach the hold.
    const d = clock();
    for (let i = 0; i < 6; i++) expect(d.jump()).toBe(true);
    expect(d.inHold).toBe(true);
    expect(d.t).toBe(INTRO_HOLD);
    expect(d.jump()).toBe(false);
    expect(d.t).toBe(INTRO_HOLD);
    expect(d.jumps).toBe(6);
  });

  it("after a jump the new beat's camera move plays in 0.3 s, then the time runs at normal speed", () => {
    for (const b of [1, 2, 3, 5]) {
      const c = clock();
      for (let i = 0; i < b; i++) c.jump();
      expect(c.t).toBe(INTRO_BEATS[b]);
      expect(c.rushing).toBe(true);
      run(c, JUMP_MOVE);
      expect(c.t).toBeCloseTo(INTRO_BEATS[b]! + INTRO_MOVES[b]!, 5);
      expect(c.rushing).toBe(false);
      run(c, 1);
      expect(c.t).toBeCloseTo(INTRO_BEATS[b]! + INTRO_MOVES[b]! + 1, 5);
    }
    // Beat 5 (index 4) opens with no camera move: normal speed at once.
    const c = clock();
    for (let i = 0; i < 4; i++) c.jump();
    expect(c.rushing).toBe(false);
    // A big step across the end of the rush splits the time fairly.
    const d = clock();
    d.jump();
    d.tick(1);
    expect(d.t).toBeCloseTo(6 + 0.8 + (1 - JUMP_MOVE), 5);
    // With no rush in progress a normal run is not sped up.
    const e = clock();
    e.tick(1);
    expect(e.t).toBeCloseTo(1, 9);
  });

  it('a pause holds the time; coming back starts that beat again and its cues again', () => {
    const c = clock();
    run(c, 17);
    expect(c.beat).toBe(3);
    c.pause();
    expect(c.tick(1)).toEqual([]);
    expect(c.t).toBeCloseTo(17, 5);
    expect(c.jump()).toBe(false);
    c.resume();
    expect(c.paused).toBe(false);
    expect(c.t).toBe(15.5);
    const again = run(c, 1.6);
    expect(again.map((x) => x.t)).toEqual([16, 16, 16.7]);
    // A second resume without a pause changes nothing.
    const t = c.t;
    c.resume();
    expect(c.t).toBe(t);
    // Paused in the hold: the hold starts again (and draws again for 3 s).
    run(c, 20);
    expect(c.still).toBe(true);
    c.pause();
    c.resume();
    expect(c.t).toBe(INTRO_HOLD);
    expect(c.still).toBe(false);
    expect(c.inHold).toBe(true);
  });

  it('done: nothing moves, nothing plays, no jumps', () => {
    const c = clock();
    run(c, 2);
    c.finish();
    expect(c.done).toBe(true);
    expect(c.tick(5)).toEqual([]);
    expect(c.jump()).toBe(false);
    c.pause();
    expect(c.paused).toBe(false);
  });

  it('ignores bad steps', () => {
    const c = clock();
    for (const dt of [0, -1, Number.NaN]) expect(c.tick(dt)).toEqual([]);
    expect(c.t).toBe(0);
  });

  it("the music level a beat should have (a jump sets it, a2.6)", () => {
    expect(musicLevelAt(INTRO_CUES, 0)).toBeNull();
    expect(musicLevelAt(INTRO_CUES, 6)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 11)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 15.5)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 20)).toBe(0);
    expect(musicLevelAt(INTRO_CUES, 24.5)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, INTRO_HOLD)).toBe(0.5);
  });

  it('the two lines show at their beats (a2.4), and the choices are the recommended ones', () => {
    expect(INTRO_CHOICES).toEqual({ tapJumps: true, lines: true, stillFramesForReducedMotion: true });
    expect(heroLineShown(22.9)).toBe(false);
    expect(heroLineShown(HERO_LINE[0])).toBe(true);
    expect(heroLineShown(24.4)).toBe(true);
    expect(heroLineShown(HERO_LINE[1])).toBe(false);
    expect(endLineShown(27.1)).toBe(false);
    expect(endLineShown(END_LINE_AT)).toBe(true);
    expect(endLineShown(40)).toBe(true);
    // Each line sits inside its beat.
    expect(introBeatAt(HERO_LINE[0])).toBe(4);
    expect(introBeatAt(END_LINE_AT)).toBe(5);
  });

  it('the two new words (a2.4): the end line is the title line itself', () => {
    expect(WORDS.intro.heroLine).toBe('That hero is you.');
    expect(WORDS.intro.endLine).toBe('Build up Lagos. Get Nigeria working.');
    expect(WORDS.intro.endLine).toBe(WORDS.title.tagline);
    // The six captions stay word for word (screen readers hear them).
    expect(WORDS.intro.captions[4]).toBe('Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you.');
  });
});
