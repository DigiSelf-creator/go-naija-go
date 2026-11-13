/**
 * The intro story screen (docs/city.md part 5 "The intro", build steps (a) and (a2)).
 *
 * Moving (a2, the usual way): one scene of about 28 s drawn in code (src/art/intro-scene.ts),
 * loaded as its own chunk while the screen opens; until it is there the first still frame shows.
 * On screen only "Skip", "That hero is you." (beat 5), "Build up Lagos. Get Nigeria working."
 * (beat 6) and, at 27.8 s, "Let's go". The six captions go, one per beat, into a hidden log that
 * screen readers hear. A tap anywhere but a button, or Space, Enter or →, jumps to the next beat;
 * in the hold Space or Enter presses "Let's go". 3 s into the hold the picture stops being drawn.
 *
 * Still (a, with reduce motion on, or when the moving scene cannot load): the six pictures
 * (src/art/intro.ts), each with its caption as real text. A tap, Space, Enter or → goes on; after
 * 1.5 s on a frame "Tap to go on" shows. Frame 6 has the big "Let's go". A 0.3 s cross-fade.
 *
 * Both: Skip (top right) and Escape from the start. A hidden page or a phone turned upright
 * pauses it; that frame (still) or that beat (moving) starts again.
 */
import { INTRO_FRAMES, drawIntroFrame } from '../art/intro';
import type { HeroLook } from '../art/hero';
import type { IntroCue } from '../art/intro-scene';
import type { SoundName } from '../engine/sound';
import { INTRO_CHOICES, IntroFlow, IntroScene, endLineShown, heroLineShown, musicLevelAt } from '../game/intro';
import { button, h } from './dom';
import { WORDS } from './words';

type SceneModule = typeof import('../art/intro-scene');

/** a2.9: the pixel ratio cap on a phone that draws the moving scene slowly. */
export const SLOW_RATIO = 1.5;
/** Frames skipped after a beat starts (layers warming), then frames timed in each group, to tell a slow phone. */
const TRIAL_SKIP = 6;
const TRIAL_FRAMES = 30;

let sceneLoad: Promise<SceneModule> | null = null;

/**
 * Loads the moving scene's chunk (once; a failed load may be tried again later). The title calls
 * it early for a player who has not seen the story, so it is usually there when the story opens.
 */
export function loadIntroScene(): Promise<SceneModule> {
  sceneLoad ??= import('../art/intro-scene').catch((err: unknown) => {
    sceneLoad = null;
    throw err;
  });
  return sceneLoad;
}

/** What the moving intro asks of the music (the `menu` tune, a2.6). */
export type IntroMusic =
  | { kind: 'level'; level: number; ramp: number }
  | { kind: 'restart'; level: number }
  /** Paused (a turned phone): silence, remembering the bar. */
  | { kind: 'hold' }
  /** Back from a pause. */
  | { kind: 'free' };

export interface IntroOptions {
  /** The player's hero for beat 5, or null for the plain outline hero. */
  look: HeroLook | null;
  /** Reduced motion: the six still pictures and plain cuts. */
  still: () => boolean;
  /** Touch words ("Tap to go on") or key words ("Press Space to go on"). */
  touch: () => boolean;
  /** True for a tap that must not count (the second half of the double tap that opened it). */
  ignoreTap: (e: MouseEvent) => boolean;
  /** The story ended (Let's go, the last tap) or was skipped. */
  end: (skipped: boolean) => void;
  /** Plays a cue's sound (the moving intro, a2.6). Follows the Sound switch. */
  sound?: (name: SoundName) => void;
  /** The moving intro's music: levels, the restart at 22.3 s, pause. Follows the Music switch. */
  music?: (m: IntroMusic) => void;
  /** Loads the moving scene (tests and the default: loadIntroScene). */
  load?: () => Promise<SceneModule>;
}

/** 'still': the six frames (a). 'loading': the moving scene's chunk is on its way. 'moving': (a2). */
export type IntroMode = 'still' | 'loading' | 'moving';

export class IntroScreen {
  readonly el: HTMLElement;
  readonly flow = new IntroFlow();
  /** The moving scene's clock, once the scene has loaded. */
  scene: IntroScene<IntroCue> | null = null;
  mode: IntroMode;
  /** Pictures drawn by this screen (tests: nothing is drawn 3 s into the hold). */
  draws = 0;
  /** Pictures drawn by every intro screen so far (tests: nothing is drawn after the end). */
  static drawsTotal = 0;
  /** The cues played, as "t sound" or "t music level" (tests: each once, in order). */
  readonly played: string[] = [];
  private art: SceneModule | null = null;
  private readonly pic: HTMLCanvasElement;
  private readonly caption: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly go: HTMLButtonElement;
  private readonly log: HTMLElement;
  private readonly heroLine: HTMLElement;
  private readonly endLine: HTMLElement;
  private frameId = 0;
  private last = 0;
  private closed = false;
  /** The frame last drawn and its fade (a still picture is drawn again only when these change). */
  private drawnKey = '';
  /** The moving scene's beat whose caption was added to the log last (-1: none yet). */
  private logged = -1;
  /** We paused the music for a turned phone. */
  private musicHeld = false;
  /** The canvas's pixel ratio cap: 2, or SLOW_RATIO once the moving scene ran slow. */
  ratioCap = 2;
  /** Frame times (ms) of the moving scene, to see if this phone is slow (null once decided). */
  private trial: number[] | null = [];
  private readonly portrait = window.matchMedia('(orientation: portrait)');

  constructor(private readonly opts: IntroOptions) {
    const w = WORDS.intro;
    this.pic = h('canvas', { class: 'intro-pic', 'aria-hidden': 'true' });
    this.caption = h('p', { class: 'intro-caption', 'aria-live': 'polite' });
    this.hint = h('p', { class: 'intro-hint', 'aria-hidden': 'true' });
    // a2.5: the moving intro's captions, added one per beat, for screen readers only.
    this.log = h('div', { class: 'sr-only intro-log', role: 'log', 'aria-live': 'polite' });
    // a2.4: the two lines on screen; the log already says them.
    this.heroLine = h('p', { class: 'intro-line intro-hero-line', 'aria-hidden': 'true', hidden: '' }, w.heroLine);
    this.endLine = h('p', { class: 'intro-line intro-end-line', 'aria-hidden': 'true', hidden: '' }, w.endLine);
    const skip = button(w.skip, 'minor intro-skip', (e) => {
      if (this.opts.ignoreTap(e)) return;
      this.finish(true);
    });
    this.go = button(w.go, 'go intro-go', (e) => {
      if (this.opts.ignoreTap(e)) return;
      this.finish(false);
    });
    this.el = h(
      'div',
      { class: 'card intro-card', role: 'dialog', 'aria-label': w.label },
      skip,
      h('div', { class: 'intro-stage' }, this.pic, this.heroLine, this.endLine),
      h('div', { class: 'intro-words' }, this.caption, this.go, this.hint),
      this.log,
    );
    // A tap anywhere but on a button goes on (still) or jumps to the next beat (moving).
    this.el.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('button')) return;
      if (this.opts.ignoreTap(e)) return;
      this.next();
    });
    window.addEventListener('keydown', this.onKey, true);
    document.addEventListener('visibilitychange', this.onHold);
    this.portrait.addEventListener('change', this.onHold);
    window.addEventListener('resize', this.onHold);
    document.body.classList.add('story');
    this.mode = INTRO_CHOICES.stillFramesForReducedMotion && opts.still() ? 'still' : 'loading';
    if (this.mode === 'still') this.show();
    else this.startLoading();
    this.onHold();
    this.wake();
  }

  /** The moving scene: load it, showing the first still frame meanwhile; on failure, the six frames. */
  private startLoading(): void {
    this.el.classList.add('moving');
    this.go.hidden = true;
    (this.opts.load ?? loadIntroScene)().then(
      (art) => {
        if (this.closed) return;
        // Works out the map's sums now, before the clock starts (else a stall at 13 s).
        art.prepareIntroScene();
        this.art = art;
        const scene = new IntroScene<IntroCue>({ beats: art.INTRO_BEATS, stillAfter: art.INTRO_STILL_AFTER, cues: art.INTRO_CUES });
        this.scene = scene;
        this.mode = 'moving';
        this.el.dataset['mode'] = 'moving';
        this.last = performance.now();
        // Hidden or upright already: it waits (music too) and starts when the player is back.
        this.onHold();
        if (!scene.paused) this.atBeatStart();
      },
      () => {
        // Offline before the cache was filled: the six still frames instead.
        if (this.closed) return;
        this.mode = 'still';
        this.el.classList.remove('moving');
        this.flow.time = 0;
        this.show();
        this.wake();
      },
    );
  }

  /** Keys anywhere while the story shows. */
  readonly onKey = (e: KeyboardEvent): void => {
    if (this.closed || e.repeat) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.finish(true);
      return;
    }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
      // A focused Skip or "Let's go" keeps its own Enter and Space.
      if (e.target instanceof Element && e.target.closest('.intro-skip, .intro-go') && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      const scene = this.scene;
      // a2.3: in the hold, Space or Enter presses "Let's go"; → does nothing.
      if (scene && scene.inHold && !scene.paused) {
        if (e.key !== 'ArrowRight') this.finish(false);
        return;
      }
      this.next();
    }
  };

  private next(): void {
    if (this.closed) return;
    if (this.mode === 'loading') return;
    if (this.mode === 'moving') {
      const scene = this.scene!;
      if (!INTRO_CHOICES.tapJumps || !scene.jump()) return;
      // The level the new beat should have; then its own cues from its start.
      const level = musicLevelAt(this.art!.INTRO_CUES, scene.t);
      if (level !== null) this.opts.music?.({ kind: 'level', level, ramp: 0.2 });
      this.atBeatStart();
      this.wake();
      return;
    }
    if (this.flow.paused) return;
    if (this.flow.next()) this.finish(false);
    else this.show();
  }

  private finish(skipped: boolean): void {
    if (this.closed) return;
    this.flow.skip();
    this.scene?.finish();
    this.close();
    this.opts.end(skipped);
  }

  /** Stops drawing and listening (the menus call it when another screen opens). */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    window.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('visibilitychange', this.onHold);
    this.portrait.removeEventListener('change', this.onHold);
    window.removeEventListener('resize', this.onHold);
    document.body.classList.remove('story');
    if (this.scene) {
      // a2.6: the menu tune goes on into the next screen at its own level, no gap.
      if (this.musicHeld) this.opts.music?.({ kind: 'free' });
      this.opts.music?.({ kind: 'level', level: 1, ramp: 0.3 });
    }
  }

  /** Paused while the page is hidden or the phone is upright; that frame or beat starts again after. */
  private readonly onHold = (): void => {
    if (this.closed) return;
    const hold = document.hidden || this.portrait.matches;
    const scene = this.scene;
    if (scene) {
      if (hold && !scene.paused) {
        scene.pause();
        if (!this.musicHeld) {
          this.musicHeld = true;
          this.opts.music?.({ kind: 'hold' });
        }
      } else if (!hold && scene.paused) {
        scene.resume();
        if (this.musicHeld) {
          this.musicHeld = false;
          this.opts.music?.({ kind: 'free' });
        }
        const level = musicLevelAt(this.art!.INTRO_CUES, scene.t);
        if (level !== null) this.opts.music?.({ kind: 'level', level, ramp: 0.2 });
        this.last = performance.now();
        this.atBeatStart();
      }
    } else if (hold) this.flow.pause();
    else if (this.flow.paused) {
      this.flow.resume();
      if (this.mode === 'still') this.show();
    }
    // Draw again for a new size or a turn (also 3 s into the hold).
    this.drawnKey = '';
    this.wake();
  };

  /** The caption, button and hint for the still frame now. */
  private show(): void {
    const n = this.flow.frame;
    this.caption.textContent = WORDS.intro.captions[n - 1] ?? '';
    this.go.hidden = !this.flow.last;
    this.hint.textContent = '';
    this.el.dataset['frame'] = String(n);
    if (this.flow.last) this.go.focus({ preventScroll: true });
    this.drawnKey = '';
  }

  /** a2.5: a new beat's caption is added to the log (once per beat, never replacing a line). */
  private atBeatStart(): void {
    const scene = this.scene;
    if (!scene) return;
    const b = Math.min(scene.beat, INTRO_FRAMES - 1);
    this.el.dataset['frame'] = String(b + 1);
    // The speed watch starts again: a new beat's first frames warm its layers.
    if (this.trial) this.trial = [];
    if (b <= this.logged) return;
    this.logged = b;
    this.log.append(h('p', {}, WORDS.intro.captions[b] ?? ''));
  }

  /** Asks for a frame, unless one is coming. */
  private wake(): void {
    if (this.closed || this.frameId) return;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    this.frameId = 0;
    if (this.closed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.mode === 'moving') {
      this.watchSpeed(dt);
      if (this.tickMoving(dt)) this.frameId = requestAnimationFrame(this.tick);
      return;
    }
    this.flow.tick(dt);
    if (this.mode === 'still') {
      const want = this.flow.hintShown ? (this.opts.touch() ? WORDS.intro.tapOn : WORDS.intro.keysOn) : '';
      if (this.hint.textContent !== want) this.hint.textContent = want;
    }
    this.drawStill();
    this.frameId = requestAnimationFrame(this.tick);
  };

  /**
   * a2.9: a slow phone (under 45 fps over about half a second of the scene's frames, at any time
   * while it plays) draws the rest at a pixel ratio of at most 1.5: a little softer, far fewer
   * pixels to fill. Decided once. The first frames of each beat (layers warming) do not count.
   */
  private watchSpeed(dt: number): void {
    const trial = this.trial;
    if (!trial || this.scene?.paused || this.scene?.still || !(dt > 0)) return;
    trial.push(dt * 1000);
    if (trial.length < TRIAL_SKIP + TRIAL_FRAMES) return;
    const used = trial.slice(TRIAL_SKIP);
    const avg = used.reduce((a, b) => a + b, 0) / used.length;
    if (avg > 1000 / 45 && this.ratioCap > SLOW_RATIO) {
      this.ratioCap = SLOW_RATIO;
      this.drawnKey = '';
      this.trial = null;
    } else this.trial = trial.slice(0, TRIAL_SKIP);
  }

  /** One frame of the moving scene. Returns true while another frame is wanted. */
  private tickMoving(dt: number): boolean {
    const scene = this.scene!;
    const art = this.art!;
    const wasBeat = scene.beat;
    for (const cue of scene.tick(dt)) {
      this.played.push(`${cue.t} ${'sound' in cue ? cue.sound : `${cue.music} ${cue.level}`}`);
      if ('sound' in cue) this.opts.sound?.(cue.sound);
      else if (cue.music === 'restart') this.opts.music?.({ kind: 'restart', level: cue.level });
      else this.opts.music?.({ kind: 'level', level: cue.level, ramp: cue.ramp });
    }
    if (scene.beat !== wasBeat) this.atBeatStart();
    const t = scene.t;
    // Touch the page only when something changes (cheap frames on a slow phone).
    const hero = !heroLineShown(t);
    if (this.heroLine.hidden !== hero) this.heroLine.hidden = hero;
    const end = !endLineShown(t);
    if (this.endLine.hidden !== end) this.endLine.hidden = end;
    const go = !scene.inHold;
    if (this.go.hidden !== go) this.go.hidden = go;
    // Paused: the picture stays as it is, and nothing is drawn until the beat starts again.
    if (scene.paused) return false;
    const key = `${t}|${this.pic.clientWidth}x${this.pic.clientHeight}`;
    if (key !== this.drawnKey) {
      this.drawnKey = key;
      this.paint((g, pw, ph) => art.drawIntroScene(g, pw, ph, t, { look: this.opts.look }));
    }
    // 3 s into the hold the picture no longer changes: no more frames until a resize or a turn.
    return !scene.still;
  }

  /** The still frames (and the first frame while the moving scene loads). */
  private drawStill(): void {
    const c = this.pic;
    const loading = this.mode === 'loading';
    const still = loading || this.opts.still();
    const fade = loading ? 1 : this.flow.fade(still);
    // Moving: the Wheel turns, so draw every frame; still: only when something changed.
    const key = `${loading ? 1 : this.flow.frame}|${fade}|${c.clientWidth}x${c.clientHeight}|${this.flow.paused}`;
    if (still && key === this.drawnKey) return;
    if (!still && this.flow.paused && key === this.drawnKey) return;
    this.drawnKey = key;
    const t = still ? 0 : this.flow.time + this.flow.frame * 2;
    const look = this.opts.look;
    this.paint((g, pw, ph) => {
      if (loading) {
        drawIntroFrame(g, 1, pw, ph, { look, time: 0 });
        return;
      }
      if (fade < 1 && this.flow.from > 0) {
        drawIntroFrame(g, this.flow.from, pw, ph, { look, time: t });
        g.globalAlpha = fade;
      }
      drawIntroFrame(g, Math.min(INTRO_FRAMES, this.flow.frame), pw, ph, { look, time: t });
    });
  }

  /** Sizes the canvas to its box (pixel ratio capped at 2) and draws. */
  private paint(draw: (g: CanvasRenderingContext2D, pw: number, ph: number) => void): void {
    const c = this.pic;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    if (cw <= 0 || ch <= 0) {
      this.drawnKey = '';
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, this.ratioCap);
    const pw = Math.round(cw * dpr);
    const ph = Math.round(ch * dpr);
    if (c.width !== pw) c.width = pw;
    if (c.height !== ph) c.height = ph;
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    draw(g, pw, ph);
    g.globalAlpha = 1;
    this.draws++;
    IntroScreen.drawsTotal++;
  }
}
