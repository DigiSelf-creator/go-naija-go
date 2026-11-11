/**
 * The intro story's rules, with no DOM (docs/city.md part 5 "The intro" and build step (a)).
 *
 * - Six frames. No frame moves on by itself; a tap (or Space, Enter, →) goes on. Frame 6 ends
 *   with "Let's go". Skip (or Escape) ends it from any frame.
 * - It plays once by itself: before the hero builder on a first visit, or on the next "Play" for
 *   a player who already has a hero. After it ends or is skipped it is saved as seen
 *   (`gidi-intro`: "seen") and plays again only from Settings, "Watch the story".
 * - A hidden page or a phone turned upright pauses it; that frame starts again.
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
