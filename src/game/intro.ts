/**
 * The intro story's rules, with no DOM (docs/city.md part 5 "The intro" and build step (a)).
 *
 * - Six frames. No frame moves on by itself; a tap (or Space, Enter, →) goes on. Frame 6 ends
 *   with "Let's go". Skip (or Escape) ends it from any frame.
 * - It plays once by itself: before the hero builder on a first visit, or on the next "Play" for
 *   a player who already has a hero. After it ends or is skipped it is saved as seen
 *   (`gidi-intro`: "seen") and plays again only from Settings, "Watch the story".
 * - A hidden page or a phone turned upright pauses it; that frame starts again.
 *
 * From step (a2) the six frames (IntroFlow) are the reduced-motion version; the usual intro is
 * one moving scene, timed by the IntroScene clock below (beats, jumps, pause, the hold).
 */
import type { Store } from '../storage';

export const KEY_INTRO = 'intro';
export const INTRO_SEEN = 'seen';
export const INTRO_FRAMES = 6;
/** "Tap to go on" shows after this long on a frame (seconds). */
export const HINT_AFTER = 1.5;
/** Cross-fade between frames (seconds); a plain cut with reduced motion. */
export const FADE = 0.3;

/** How the intro was reached: the title's "Make your hero", the title's "Play", or Settings. */
export type IntroFrom = 'makeHero' | 'play' | 'replay';

export function introSeen(store: Store): boolean {
  return store.load(KEY_INTRO, (v): v is string => v === INTRO_SEEN) === INTRO_SEEN;
}

export function markIntroSeen(store: Store): void {
  store.save(KEY_INTRO, INTRO_SEEN);
}

/** True when the intro plays now: always from Settings, else only until it has been seen. */
export function introDue(seen: boolean, from: IntroFrom): boolean {
  return from === 'replay' || !seen;
}

export class IntroFlow {
  /** The frame showing, 1 to 6. */
  frame = 1;
  /** The frame before (for the cross-fade), or 0. */
  from = 0;
  /** Seconds on this frame (not counted while paused). */
  time = 0;
  paused = false;
  done = false;

  /** Goes on to the next frame; after frame 6 the story is done. Returns true when done. */
  next(): boolean {
    if (this.done) return true;
    if (this.frame >= INTRO_FRAMES) {
      this.done = true;
      return true;
    }
    this.from = this.frame;
    this.frame++;
    this.time = 0;
    return false;
  }

  skip(): void {
    this.done = true;
  }

  tick(dt: number): void {
    if (this.paused || this.done || !(dt > 0)) return;
    this.time += dt;
  }

  /** A call, an app switch or a turned phone. */
  pause(): void {
    this.paused = true;
  }

  /** Back again: that frame starts again (no fade, the hint waits again). */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.time = 0;
    this.from = 0;
  }

  /** "Tap to go on" shows (never on frame 6, which has "Let's go"). */
  get hintShown(): boolean {
    return !this.done && this.frame < INTRO_FRAMES && this.time >= HINT_AFTER;
  }

  /** How far the new frame has faded in, 0 to 1 (always 1 with reduced motion or on frame 1). */
  fade(still: boolean): number {
    if (still || this.from === 0) return 1;
    return Math.min(1, this.time / FADE);
  }

  get last(): boolean {
    return this.frame === INTRO_FRAMES;
  }
}

// ---------------------------------------------------------------- (a2) the intro that moves

/**
 * Tp's open choices for step (a2) (docs/city.md a2.3 to a2.5), built with the team's
 * recommendations. Each is one switch here, in case Tp picks otherwise. (The fourth, "the
 * Stoppers flinch but stay", is in art's drawing, src/art/intro-scene.ts.)
 */
export const INTRO_CHOICES = {
  /** a2.3: a tap anywhere but a button (and Space, Enter, →) jumps to the next beat. false: they do nothing; Skip, Escape and "Let's go" still work. */
  tapJumps: true,
  /** a2.12: each beat's caption shows as a subtitle in a strip at the bottom. false: no words on screen but Skip and "Let's go" (the log still says them). */
  subtitles: true,
  /** a2.5: with reduce motion on, the six still frames with captions play (step (a)). false: the moving scene plays anyway. */
  stillFramesForReducedMotion: true,
} as const;

/**
 * Each beat's opening camera move (s), by beat 0 to 5 (a2.2, times a2.12): the slide right at 11,
 * the pull back to the map at 19.6, the drop to the road at 25.4, the hub-to-bus zoom at 39.
 * Beats 1 and 5 open with no camera move.
 */
export const INTRO_MOVES: readonly number[] = [0, 0.8, 0.8, 0.6, 0, 0.8];
/** After a jump the new beat's opening camera move plays in this long (s), so the picture never pops (a2.3). */
export const JUMP_MOVE = 0.3;

// ---------------------------------------------------------------- a2.12 the subtitles

/** Each subtitle line fades in and out over this long (s). */
export const LINE_FADE = 0.3;

/** The words in a line (runs of letters and marks between spaces). */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * a2.12 point 5: a caption that does not fit the strip (3 lines) shows in two pieces, split at
 * a full stop, one after the other. `fits` says whether a piece fits. The whole caption when it
 * fits; else the first full-stop split where both pieces fit, else the split whose longer piece
 * is shortest (it is never cut or shrunk; the strip is sized so that does not happen at 320 px).
 */
export function splitCaption(text: string, fits: (piece: string) => boolean): string[] {
  if (fits(text)) return [text];
  const cuts: number[] = [];
  const re = /\.\s+/g;
  for (let m = re.exec(text); m; m = re.exec(text)) cuts.push(m.index + 1);
  if (cuts.length === 0) return [text];
  const pieces = cuts.map((c) => [text.slice(0, c).trim(), text.slice(c).trim()] as [string, string]);
  const good = pieces.find(([a, b]) => fits(a) && fits(b));
  if (good) return good;
  let best = pieces[0]!;
  for (const p of pieces) if (Math.max(p[0].length, p[1].length) < Math.max(best[0].length, best[1].length)) best = p;
  return best;
}

/** Which piece of a beat's line shows at story time t, and how far it has faded in (0 to 1). */
export interface SubtitleState {
  piece: number;
  alpha: number;
}

/**
 * The subtitle at story time t in a beat from `start` to `end` (s), its line in `pieces`: the
 * beat's time is shared by word count. Each piece fades in over LINE_FADE at its start (not when
 * `fadeIn` is false: a jump shows the line at once) and out over LINE_FADE at its end (not the
 * last piece when `fadeOut` is false: caption 6 stays through the hold).
 */
export function subtitleAt(pieces: readonly string[], start: number, end: number, t: number, fadeIn = true, fadeOut = true): SubtitleState {
  const n = Math.max(1, pieces.length);
  const words = pieces.map(wordCount);
  const total = words.reduce((a, b) => a + b, 0) || 1;
  const len = Math.max(0, end - start);
  let from = start;
  for (let i = 0; i < n; i++) {
    const to = i === n - 1 ? end : from + (len * (words[i] ?? 0)) / total;
    if (t < to || i === n - 1) {
      const fin = fadeIn || i > 0 ? clamp01((t - from) / LINE_FADE) : 1;
      const fout = fadeOut || i < n - 1 ? clamp01((to - t) / LINE_FADE) : 1;
      return { piece: i, alpha: Math.min(fin, fout) };
    }
    from = to;
  }
  return { piece: n - 1, alpha: 1 };
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A timed cue (src/art/intro-scene.ts INTRO_CUES): only its time matters to the clock. */
export interface TimedCue {
  readonly t: number;
}

export interface IntroTiming<C extends TimedCue> {
  /** The six beat starts, then the hold (INTRO_BEATS). */
  readonly beats: readonly number[];
  /** Seconds into the hold after which the picture no longer changes (INTRO_STILL_AFTER). */
  readonly stillAfter: number;
  /** The cues in time order (INTRO_CUES). */
  readonly cues: readonly C[];
  /** Each beat's opening camera move (s); INTRO_MOVES by default. */
  readonly moves?: readonly number[];
}

/** The level of the last music cue before time t, or null when no music cue comes before it. */
export function musicLevelAt(cues: readonly TimedCue[], t: number): number | null {
  let level: number | null = null;
  for (const c of cues) {
    if (c.t >= t) break;
    const l = (c as { level?: unknown }).level;
    if (typeof l === 'number') level = l;
  }
  return level;
}


/**
 * The moving intro's clock (a2.2, a2.3, a2.7, a2.9), with no DOM. Story time `t` runs from 0;
 * in the hold ("Let's go") it runs on for `stillAfter` seconds (the bus idles), then stops:
 * nothing changes after that, so the screen stops drawing.
 *
 * - `jump()` goes to the next beat's start; its opening camera move plays in JUMP_MOVE s. No
 *   jump in the hold.
 * - `pause()` holds the time; `resume()` starts the current beat again from its start (in the
 *   hold, the hold from its start).
 * - `tick(dt)` returns the cues now due: each once, in order. A jump skips the jumped-over cues
 *   and plays only the new beat's own cues from its start.
 */
export class IntroScene<C extends TimedCue = TimedCue> {
  /** Story time (s). */
  t = 0;
  paused = false;
  done = false;
  /** Jumps made. */
  jumps = 0;
  private readonly beats: readonly number[];
  private readonly stillAfter: number;
  private readonly cues: readonly C[];
  private readonly moves: readonly number[];
  /** Cues at or after this time and before t are due. */
  private cueFrom = 0;
  /** After a jump, story time runs `rushRate` times faster until `rushUntil`. */
  private rushUntil = 0;
  private rushRate = 1;

  constructor(timing: IntroTiming<C>) {
    this.beats = timing.beats;
    this.stillAfter = Math.max(0, timing.stillAfter);
    this.cues = timing.cues;
    this.moves = timing.moves ?? INTRO_MOVES;
  }

  /** When the hold starts ("Let's go" shows). */
  get holdAt(): number {
    return this.beats[this.beats.length - 1] ?? 0;
  }

  /** The time the clock stops at: `stillAfter` s into the hold. */
  get end(): number {
    return this.holdAt + this.stillAfter;
  }

  /** The beat now: 0 to 5, or 6 (the last index of beats) in the hold. */
  get beat(): number {
    let b = 0;
    for (let i = 1; i < this.beats.length; i++) if (this.t >= this.beats[i]!) b = i;
    return b;
  }

  /** "Let's go" shows. */
  get inHold(): boolean {
    return this.t >= this.holdAt;
  }

  /** Nothing in the picture changes any more (stillAfter s into the hold): no need to draw. */
  get still(): boolean {
    return this.t >= this.end;
  }

  /** True while a jump's fast camera move plays. */
  get rushing(): boolean {
    return this.t < this.rushUntil;
  }

  /** Moves the time on by dt real seconds; returns the cues now due, in order. */
  tick(dt: number): C[] {
    if (this.paused || this.done || !(dt > 0)) return [];
    let t = this.t;
    let left = dt;
    if (t < this.rushUntil) {
      const fast = left * this.rushRate;
      if (t + fast < this.rushUntil - 1e-9) {
        t += fast;
        left = 0;
      } else {
        left = Math.max(0, left - (this.rushUntil - t) / this.rushRate);
        t = this.rushUntil;
        this.rushUntil = 0;
      }
    }
    this.t = Math.min(t + left, this.end);
    const out: C[] = [];
    for (const c of this.cues) if (c.t >= this.cueFrom && c.t < this.t) out.push(c);
    this.cueFrom = this.t;
    return out;
  }

  /** Jumps to the next beat's start (a2.3). False (nothing changes) in the hold, paused or done. */
  jump(): boolean {
    if (this.done || this.paused || this.inHold) return false;
    const b = this.beat + 1;
    this.t = this.beats[b] ?? this.holdAt;
    this.cueFrom = this.t;
    this.jumps++;
    const move = this.moves[b] ?? 0;
    if (move > JUMP_MOVE) {
      this.rushUntil = this.t + move;
      this.rushRate = move / JUMP_MOVE;
    } else {
      this.rushUntil = 0;
      this.rushRate = 1;
    }
    return true;
  }

  /** A call, an app switch or a turned phone. */
  pause(): void {
    if (this.done) return;
    this.paused = true;
  }

  /** Back again: the current beat starts again from its start (a2.7), at normal speed. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.t = this.beats[this.beat] ?? 0;
    this.cueFrom = this.t;
    this.rushUntil = 0;
    this.rushRate = 1;
  }

  /** Skip or "Let's go". */
  finish(): void {
    this.done = true;
  }
}
