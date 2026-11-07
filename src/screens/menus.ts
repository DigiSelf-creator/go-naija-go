/**
 * Menu screens (docs/design.md: Screens, Hero builder): title, hero builder, credits,
 * and in the run: pause, game over, and a "boss next" placeholder until piece E.
 * An HTML layer over the canvas; one screen shows at a time.
 */
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroLook } from '../art/hero';
import { hasSavedLook, loadSettings, saveLook, saveSettings, type Settings } from '../game/save';
import type { Store } from '../storage';
import { button, h } from './dom';
import { GAME_NAME, WORDS } from './words';

export type MenuScreen = 'title' | 'builder' | 'credits' | 'pause' | 'gameover' | 'win' | null;

/** Screens that open during play (design.md: Pause, Game over, Win): their buttons ignore taps for 0.4 s. */
const EVENT_SCREENS: readonly MenuScreen[] = ['pause', 'gameover', 'win'];
export const EVENT_SCREEN_GUARD_MS = 400;

/**
 * The second tap of a double tap lands about where the first one did, very soon after.
 * A tap that soon and that close to the tap that opened a screen (or started the run)
 * is ignored; a deliberate tap anywhere else works at once.
 */
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 48;

/** Where the "Start running" tap landed (CSS px), so the game can ignore a double tap's second half. */
export interface TapPoint {
  x: number;
  y: number;
}

export interface MenuHooks {
  /** "Start running" was tapped. */
  start(at: TapPoint | null): void;
  /** The look changed in the builder (already saved). */
  lookChanged(look: HeroLook): void;
  /** Pause: "Keep running". */
  resume(): void;
  /** "Start the level again" or "Play again": the level from the start, full lives, 0 kobo. */
  restart(at: TapPoint | null): void;
  /** "Home": back to the title. */
  home(): void;
}

/** What the game over and win screens show. */
export interface RunSummary {
  kobo: number;
  lives: number;
}

export class Menus {
  private readonly layer: HTMLElement;
  private screen: MenuScreen = null;
  private settings: Settings;
  private previewFrame = 0;
  /** The tap that opened the current screen, if it was a tap. */
  private opener: (TapPoint & { t: number }) | null = null;
  private shownAt = 0;
  private summary: RunSummary = { kobo: 0, lives: 0 };

  constructor(
    parent: HTMLElement,
    private readonly store: Store,
    private look: HeroLook,
    private readonly hooks: MenuHooks,
  ) {
    this.settings = loadSettings(store);
    // data-ui: taps inside menus never count as jumps.
    this.layer = h('div', { class: 'screen', 'data-ui': true, hidden: true });
    parent.append(this.layer);
  }

  get current(): MenuScreen {
    return this.screen;
  }

  get sound(): boolean {
    return this.settings.sound;
  }

  get gentle(): boolean {
    return this.settings.gentle;
  }

  /** The HUD sound button. Remembered on the phone. */
  toggleSound(): boolean {
    this.settings.sound = !this.settings.sound;
    saveSettings(this.store, this.settings);
    return this.settings.sound;
  }

  showGameOver(summary: RunSummary): void {
    this.summary = summary;
    this.show('gameover');
  }

  showWin(summary: RunSummary): void {
    this.summary = summary;
    this.show('win');
  }

  show(screen: MenuScreen, by?: MouseEvent): void {
    cancelAnimationFrame(this.previewFrame);
    this.screen = screen;
    this.shownAt = performance.now();
    const at = by ? tapPoint(by) : null;
    this.opener = at ? { ...at, t: performance.now() } : null;
    this.layer.replaceChildren();
    this.layer.hidden = screen === null;
    if (screen === 'title') this.layer.append(this.title());
    if (screen === 'builder') this.layer.append(this.builder());
    if (screen === 'credits') this.layer.append(this.credits());
    if (screen === 'pause') this.layer.append(this.pause());
    if (screen === 'gameover') this.layer.append(this.gameOver());
    if (screen === 'win') this.layer.append(this.win());
  }

  /** A tap that should not count: the second half of a double tap, or too soon after the game opened a screen. */
  private ignoreTap(e: MouseEvent): boolean {
    if (isSecondTap(this.opener, tapPoint(e))) return true;
    return EVENT_SCREENS.includes(this.screen) && performance.now() - this.shownAt < EVENT_SCREEN_GUARD_MS;
  }

  /** A button whose taps go through ignoreTap first. */
  private guarded(label: string, cls: string, onTap: (e: MouseEvent) => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    return button(label, cls, (e) => {
      if (!this.ignoreTap(e)) onTap(e);
    }, attrs);
  }

  private gentleSwitch(): HTMLButtonElement {
    const sw = button(WORDS.title.gentle, 'minor', (e) => {
      if (this.ignoreTap(e)) return;
      this.settings.gentle = !this.settings.gentle;
      saveSettings(this.store, this.settings);
      sw.setAttribute('aria-checked', String(this.settings.gentle));
    }, { role: 'switch', 'aria-checked': String(this.settings.gentle) });
    return sw;
  }

  private pause(): HTMLElement {
    const w = WORDS.pause;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h(
        'div',
        { class: 'stack' },
        this.guarded(w.keepRunning, 'go', () => this.hooks.resume()),
        this.guarded(w.restart, 'go secondary', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.home, 'minor', () => this.hooks.home()),
      ),
    );
  }

  private gameOver(): HTMLElement {
    const w = WORDS.gameOver;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(this.summary.kobo)),
      this.guarded(w.playAgain, 'go', (e) => this.hooks.restart(tapPoint(e))),
      // Gentle mode is offered only while it is off; it counts from the next run (Q15).
      !this.settings.gentle && h('p', { class: 'small' }, w.gentleOffer),
      !this.settings.gentle && h('div', { class: 'minor-row' }, this.gentleSwitch()),
      h('div', { class: 'minor-row' }, this.guarded(w.home, 'minor', () => this.hooks.home())),
    );
  }

  private win(): HTMLElement {
    const w = WORDS.win;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(this.summary.kobo, this.summary.lives)),
      h('p', {}, w.more),
      this.guarded(w.playAgain, 'go', (e) => this.hooks.restart(tapPoint(e))),
      h('div', { class: 'minor-row' }, this.guarded(w.home, 'minor', () => this.hooks.home())),
    );
  }

  private title(): HTMLElement {
    const saved = hasSavedLook(this.store);
    const w = WORDS.title;
    const sound = button(this.settings.sound ? w.soundOn : w.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sound.textContent = this.settings.sound ? w.soundOn : w.soundOff;
    });
    const gentle = this.gentleSwitch();

    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': GAME_NAME },
      h('h1', {}, GAME_NAME),
      h('p', { class: 'tagline' }, w.tagline),
      h('p', {}, w.howTo),
      saved ? button(w.start, 'go', (e) => this.hooks.start(tapPoint(e))) : button(w.makeHero, 'go', (e) => this.show('builder', e)),
      h(
        'div',
        { class: 'minor-row' },
        saved && button(w.changeHero, 'minor', (e) => this.show('builder', e)),
        button(w.credits, 'minor', () => this.show('credits')),
        sound,
        gentle,
      ),
    );
  }

  private builder(): HTMLElement {
    const w = WORDS.builder;
    const preview = h('canvas', { class: 'preview', role: 'img', 'aria-label': 'Your hero' });

    const pick = (part: keyof HeroLook, i: number, e: MouseEvent): void => {
      if (this.ignoreTap(e)) return; // the builder opened under the finger
      this.look = saveLook(this.store, { ...this.look, [part]: i });
      this.hooks.lookChanged(this.look);
      for (const b of this.layer.querySelectorAll<HTMLButtonElement>(`[data-part="${part}"]`)) {
        b.setAttribute('aria-pressed', String(Number(b.dataset['index']) === this.look[part]));
      }
    };
    const opt = (part: keyof HeroLook, i: number, label: string, cls: string, style?: string): HTMLButtonElement => {
      return button(cls === 'swatch' ? '' : label, cls, (e) => pick(part, i, e), {
        'data-part': part,
        'data-index': String(i),
        'aria-pressed': String(this.look[part] === i),
        'aria-label': cls === 'swatch' ? label : undefined,
        style,
      });
    };
    const row = (label: string, ...items: HTMLElement[]): HTMLElement =>
      h('div', { class: 'choice-row', role: 'group', 'aria-label': label }, h('b', {}, label), h('div', { class: 'choices' }, ...items));

    const card = h(
      'div',
      { class: 'card', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h(
        'div',
        { class: 'builder' },
        preview,
        h(
          'div',
          {},
          row(w.skin, ...SKINS.map((s, i) => opt('skin', i, s.label, 'swatch', `background:${s.base}`))),
          row(w.hair, ...HAIRS.map((o, i) => opt('hair', i, o.label, 'chip'))),
          row(w.outfit, ...OUTFITS.map((o, i) => opt('outfit', i, o.label, 'chip'))),
        ),
      ),
      button(w.start, 'go', (e) => {
        if (this.ignoreTap(e)) return;
        // Starting keeps the look shown, even if nothing was tapped.
        this.look = saveLook(this.store, this.look);
        this.hooks.start(tapPoint(e));
      }),
      h('p', { class: 'small' }, w.savedNote),
    );
    this.animatePreview(preview);
    return card;
  }

  private animatePreview(c: HTMLCanvasElement): void {
    const start = performance.now();
    const frame = (now: number): void => {
      if (this.screen !== 'builder') return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = c.clientWidth;
      const ch = c.clientHeight;
      if (cw > 0 && ch > 0) {
        if (c.width !== Math.round(cw * dpr)) c.width = Math.round(cw * dpr);
        if (c.height !== Math.round(ch * dpr)) c.height = Math.round(ch * dpr);
        const g = c.getContext('2d');
        if (g) {
          const t = (now - start) / 1000;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, c.width, c.height);
          // Fit about 64 u (the gele is the tallest) into the box, feet near the bottom.
          const s = Math.min((ch * dpr * 0.82) / 64, (cw * dpr * 0.9) / 40);
          g.translate(c.width / 2, c.height - ch * dpr * 0.08);
          g.scale(s, s);
          // Ground shadow
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.beginPath();
          g.ellipse(0, 0, 13, 3, 0, 0, Math.PI * 2);
          g.fill();
          drawHero(g, this.look, { phase: 0, inAir: false, facing: 1, glow: false, standing: true, blink: t % 3.2 < 0.15, time: t });
        }
      }
      this.previewFrame = requestAnimationFrame(frame);
    };
    this.previewFrame = requestAnimationFrame(frame);
  }

  private credits(): HTMLElement {
    const w = WORDS.credits;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      ...w.lines.map((l) => h('p', {}, l)),
      button(w.back, 'go', () => this.show('title')),
    );
  }
}

function tapPoint(e: MouseEvent): TapPoint | null {
  // Keyboard "clicks" have no position (detail 0).
  return e.detail > 0 ? { x: e.clientX, y: e.clientY } : null;
}

/** True when `tap` is the second half of a double tap that began with `first`. */
export function isSecondTap(first: (TapPoint & { t: number }) | null, tap: TapPoint | null, now = performance.now()): boolean {
  if (!first || !tap) return false;
  return now - first.t < DOUBLE_TAP_MS && Math.hypot(tap.x - first.x, tap.y - first.y) < DOUBLE_TAP_PX;
}
