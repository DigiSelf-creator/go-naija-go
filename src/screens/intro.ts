/**
 * The intro story screen (docs/city.md part 5 "The intro", build step (a)). The six pictures are
 * drawn in code (src/art/intro.ts); each caption is real text, so screen readers read it.
 *
 * Skip (top right) from frame 1, and Escape. A tap anywhere else, or Space, Enter or →, goes on.
 * After 1.5 s on a frame "Tap to go on" shows ("Press Space to go on" with keys). Frame 6 has the
 * big "Let's go". A 0.3 s cross-fade between frames; a plain cut with reduced motion. A hidden
 * page or a phone turned upright pauses it, and that frame starts again.
 */
import { INTRO_FRAMES, drawIntroFrame } from '../art/intro';
import type { HeroLook } from '../art/hero';
import { IntroFlow } from '../game/intro';
import { button, h } from './dom';
import { WORDS } from './words';

export interface IntroOptions {
  /** The player's hero for frame 5, or null for the plain outline hero. */
  look: HeroLook | null;
  /** Reduced motion: still pictures and plain cuts. */
  still: () => boolean;
  /** Touch words ("Tap to go on") or key words ("Press Space to go on"). */
  touch: () => boolean;
  /** True for a tap that must not count (the second half of the double tap that opened it). */
  ignoreTap: (e: MouseEvent) => boolean;
  /** The story ended (Let's go, the last tap) or was skipped. */
  end: (skipped: boolean) => void;
}

export class IntroScreen {
  readonly el: HTMLElement;
  readonly flow = new IntroFlow();
  private readonly pic: HTMLCanvasElement;
  private readonly caption: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly go: HTMLButtonElement;
  private frameId = 0;
  private last = 0;
  private closed = false;
  /** The frame last drawn and its fade (a still picture is drawn again only when these change). */
  private drawnKey = '';
  private readonly portrait = window.matchMedia('(orientation: portrait)');

  constructor(private readonly opts: IntroOptions) {
    const w = WORDS.intro;
    this.pic = h('canvas', { class: 'intro-pic', 'aria-hidden': 'true' });
    this.caption = h('p', { class: 'intro-caption', 'aria-live': 'polite' });
    this.hint = h('p', { class: 'intro-hint', 'aria-hidden': 'true' });
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
      h('div', { class: 'intro-stage' }, this.pic),
      h('div', { class: 'intro-words' }, this.caption, this.go, this.hint),
    );
    // A tap anywhere but on a button goes on.
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
    this.show();
    this.onHold();
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
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
      // A focused Skip keeps its own Enter and Space.
      if (e.target instanceof Element && e.target.closest('.intro-skip') && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      this.next();
    }
  };

  private next(): void {
    if (this.closed || this.flow.paused) return;
    if (this.flow.next()) this.finish(false);
    else this.show();
  }

  private finish(skipped: boolean): void {
    if (this.closed) return;
    this.flow.skip();
    this.close();
    this.opts.end(skipped);
  }

  /** Stops drawing and listening (the menus call it when another screen opens). */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('visibilitychange', this.onHold);
    this.portrait.removeEventListener('change', this.onHold);
    window.removeEventListener('resize', this.onHold);
    document.body.classList.remove('story');
  }

  /** Paused while the page is hidden or the phone is upright; that frame starts again after. */
  private readonly onHold = (): void => {
    if (this.closed) return;
    const hold = document.hidden || this.portrait.matches;
    if (hold) this.flow.pause();
    else if (this.flow.paused) {
      this.flow.resume();
      this.show();
    }
    this.drawnKey = '';
  };

  /** The caption, button and hint for the frame now. */
  private show(): void {
    const n = this.flow.frame;
    this.caption.textContent = WORDS.intro.captions[n - 1] ?? '';
    this.go.hidden = !this.flow.last;
    this.hint.textContent = '';
    this.el.dataset['frame'] = String(n);
    if (this.flow.last) this.go.focus({ preventScroll: true });
    this.drawnKey = '';
  }

  private readonly tick = (now: number): void => {
    if (this.closed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.flow.tick(dt);
    const want = this.flow.hintShown ? (this.opts.touch() ? WORDS.intro.tapOn : WORDS.intro.keysOn) : '';
    if (this.hint.textContent !== want) this.hint.textContent = want;
    this.draw();
    this.frameId = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const c = this.pic;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const still = this.opts.still();
    const fade = this.flow.fade(still);
    // Moving: the Wheel turns, so draw every frame; still: only when something changed.
    const key = `${this.flow.frame}|${fade}|${cw}x${ch}|${this.flow.paused}`;
    if (still && key === this.drawnKey) return;
    if (!still && this.flow.paused && key === this.drawnKey) return;
    this.drawnKey = key;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(cw * dpr);
    const ph = Math.round(ch * dpr);
    if (c.width !== pw) c.width = pw;
    if (c.height !== ph) c.height = ph;
    const g = c.getContext('2d');
    if (!g) return;
    const t = still ? 0 : this.flow.time + this.flow.frame * 2;
    const look = this.opts.look;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    if (fade < 1 && this.flow.from > 0) {
      drawIntroFrame(g, this.flow.from, pw, ph, { look, time: t });
      g.globalAlpha = fade;
    }
    drawIntroFrame(g, Math.min(INTRO_FRAMES, this.flow.frame), pw, ph, { look, time: t });
    g.globalAlpha = 1;
  }
}
