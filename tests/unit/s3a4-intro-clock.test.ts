/**
 * Slice 3 step (a2), task S3a4 (docs/city.md a2.2, a2.3, a2.6, a2.7, a2.9, with the a2.12 times):
 * the moving intro's clock. Beats, a jump to the next beat (with a fast camera move), a pause that
 * starts the beat again, the hold, the stop 3 s into the hold, done, and the cues each played
 * once. Then the a2.12 subtitles: the split at a full stop, the time shared by word count, the
 * fades, and the words test (caption 5 and 6 end with the old hero and end lines).
 */
import { describe, expect, it } from 'vitest';
import {
  INTRO_CHOICES,
  INTRO_MOVES,
  IntroScene,
  JUMP_MOVE,
  LINE_FADE,
  musicLevelAt,
  splitCaption,
  subtitleAt,
  wordCount,
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
  it('runs through the six beats at the a2.12 times, then the hold', () => {
    const c = clock();
    expect(c.beat).toBe(0);
    expect(c.holdAt).toBe(INTRO_HOLD);
    const starts: number[] = [];
    let last = -1;
    for (let i = 0; i < 45 * 60; i++) {
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
    for (const t of [0, 10.9, 11, 19.59, 19.6, 25.4, 31.5, 31.6, 39, 43.99, 44, 46]) {
      d.t = t;
      expect(d.beat, `t ${t}`).toBe(introBeatAt(t));
    }
  });

  it('stops 3 s into the hold: still, and the time no longer moves', () => {
    const c = clock();
    run(c, 46.7);
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
    for (let i = 0; i < 48 * 60; i++) for (const cue of c.tick(STEP)) played.push({ at: c.t, cue });
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
    expect(c.t).toBe(11);
    expect(c.beat).toBe(1);
    // The 6.5 s cues were jumped over; 12.2 and 14.6 still come.
    const next = run(c, 4);
    expect(next.map((x) => x.t)).toEqual([12.2, 14.6]);
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
    expect(d.t).toBeCloseTo(11 + 0.8 + (1 - JUMP_MOVE), 5);
    // With no rush in progress a normal run is not sped up.
    const e = clock();
    e.tick(1);
    expect(e.t).toBeCloseTo(1, 9);
  });

  it('a pause holds the time; coming back starts that beat again and its cues again', () => {
    const c = clock();
    run(c, 27);
    expect(c.beat).toBe(3);
    c.pause();
    expect(c.tick(1)).toEqual([]);
    expect(c.t).toBeCloseTo(27, 5);
    expect(c.jump()).toBe(false);
    c.resume();
    expect(c.paused).toBe(false);
    expect(c.t).toBe(25.4);
    const again = run(c, 1.6);
    expect(again.map((x) => x.t)).toEqual([26, 26, 26.9]);
    // A second resume without a pause changes nothing.
    const t = c.t;
    c.resume();
    expect(c.t).toBe(t);
    // Paused in the hold: the hold starts again (and draws again for 3 s).
    run(c, 25);
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
    expect(musicLevelAt(INTRO_CUES, 11)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 19.6)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 25.4)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, 31.6)).toBe(0);
    expect(musicLevelAt(INTRO_CUES, 39)).toBe(1);
    // The sting comes with "Let's go"; the level drops once it has played.
    expect(musicLevelAt(INTRO_CUES, INTRO_HOLD)).toBe(1);
    expect(musicLevelAt(INTRO_CUES, INTRO_HOLD + 0.01)).toBe(0.5);
  });

  it('the choices are the recommended ones (subtitles on, a2.12)', () => {
    expect(INTRO_CHOICES).toEqual({ tapJumps: true, subtitles: true, stillFramesForReducedMotion: true });
  });

  it('a2.12 point 4: each beat is as long as its line, (words / 2.5) + 1 s', () => {
    const want = [11, 8.6, 5.8, 6.2, 7.4, 5];
    WORDS.intro.captions.forEach((c, i) => {
      expect(wordCount(c) / 2.5 + 1, `caption ${i + 1}`).toBeCloseTo(want[i]!, 5);
      expect(INTRO_BEATS[i + 1]! - INTRO_BEATS[i]!, `beat ${i + 1}`).toBeCloseTo(want[i]!, 5);
    });
    expect(INTRO_HOLD).toBe(44);
  });
});

describe('the subtitles (a2.12)', () => {
  /** A strip that holds `n` characters (a stand-in for "fits in 3 lines"). */
  const holds = (n: number) => (s: string) => s.length <= n;

  it('a caption that fits shows whole', () => {
    for (const c of WORDS.intro.captions) expect(splitCaption(c, holds(200))).toEqual([c]);
  });

  it('a caption too long splits at a full stop into two pieces, each whole', () => {
    const c1 = WORDS.intro.captions[0];
    expect(splitCaption(c1, holds(100))).toEqual([
      'Long ago, light shone on West Africa.',
      'Its people and its rich land made the Wheel, so everyone could share, stay safe and keep going.',
    ]);
    // Never a word lost or added
    for (const c of WORDS.intro.captions) expect(splitCaption(c, holds(40)).join(' ')).toBe(c);
    // The first split where both pieces fit (caption 6 has two full stops inside)
    expect(splitCaption(WORDS.intro.captions[5], holds(40))).toEqual(['Your journey starts now.', 'Build up Lagos. Get Nigeria working.']);
    // No full stop to split at: whole (never cut)
    expect(splitCaption('a b c', holds(1))).toEqual(['a b c']);
  });

  it("the beat's time is shared by word count: caption 1 at 320 px, 7 of 25 words, 3.1 s", () => {
    const pieces = splitCaption(WORDS.intro.captions[0], holds(100));
    expect(subtitleAt(pieces, 0, 11, 3).piece).toBe(0);
    expect(subtitleAt(pieces, 0, 11, 3.1).piece).toBe(1);
    expect(subtitleAt(pieces, 0, 11, 10.99).piece).toBe(1);
    expect((11 * wordCount(pieces[0]!)) / 25).toBeCloseTo(3.08, 2);
  });

  it(`each line fades in and out over ${LINE_FADE} s; a jump shows it at once; caption 6 stays`, () => {
    const one = ['A whole line.'];
    expect(subtitleAt(one, 11, 19.6, 11).alpha).toBe(0);
    expect(subtitleAt(one, 11, 19.6, 11.15).alpha).toBeCloseTo(0.5, 5);
    expect(subtitleAt(one, 11, 19.6, 11.3).alpha).toBe(1);
    expect(subtitleAt(one, 11, 19.6, 19.45).alpha).toBeCloseTo(0.5, 5);
    expect(subtitleAt(one, 11, 19.6, 19.6).alpha).toBe(0);
    // After a jump: all of it at once
    expect(subtitleAt(one, 11, 19.6, 11, false).alpha).toBe(1);
    // Two pieces: the second fades in after the first fades out
    const two = ['One two.', 'Three four.'];
    expect(subtitleAt(two, 0, 4, 1.95)).toEqual({ piece: 0, alpha: expect.closeTo(0.1667, 3) });
    expect(subtitleAt(two, 0, 4, 2.15)).toEqual({ piece: 1, alpha: expect.closeTo(0.5, 5) });
    // A jump shows the first piece at once, but the second still fades in
    expect(subtitleAt(two, 0, 4, 2.15, false).alpha).toBeCloseTo(0.5, 5);
    // Caption 6 does not fade out: it stays through the hold
    expect(subtitleAt(['Your journey starts now.'], 39, 44, 44, true, false).alpha).toBe(1);
  });

  it('the words test: caption 5 ends with "That hero is you.", caption 6 with the title line; the separate lines are gone', () => {
    const c = WORDS.intro.captions;
    expect(c).toHaveLength(6);
    expect(c[4].endsWith('That hero is you.')).toBe(true);
    expect(c[5].endsWith(WORDS.title.tagline)).toBe(true);
    expect(WORDS.title.tagline).toBe('Build up Lagos. Get Nigeria working.');
    // "Let's go" stays the button, never in a caption
    for (const line of c) expect(line).not.toContain("Let's go");
    expect('heroLine' in WORDS.intro).toBe(false);
    expect('endLine' in WORDS.intro).toBe(false);
    // The six captions stay word for word (T1 to T4)
    expect(c[4]).toBe('Nigeria called a hero to keep the Wheel turning: the Wheel Hero. That hero is you.');
  });
});
