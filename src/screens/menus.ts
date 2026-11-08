/**
 * Menu screens (docs/design.md: Screens, Hero builder): title, hero builder, credits,
 * and in the run: pause, game over, and a "boss next" placeholder until piece E.
 * An HTML layer over the canvas; one screen shows at a time.
 */
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, drawHero, type HeroLook } from '../art/hero';
import {
  changeBody,
  fixLook,
  hasSavedLook,
  isOldSave,
  loadSettings,
  saveLook,
  saveSettings,
  wearsFirstLook,
  type FullLook,
  type Settings,
} from '../game/save';
import type { Store } from '../storage';
import { button, h } from './dom';
import { GAME_NAME, WORDS } from './words';

export type MenuScreen = 'title' | 'builder' | 'credits' | 'pause' | 'gameover' | 'cleared' | 'win' | null;

/** Screens that open during play (design.md: Pause, Game over, Street cleared, Win): their buttons ignore taps for 0.4 s. */
const EVENT_SCREENS: readonly MenuScreen[] = ['pause', 'gameover', 'cleared', 'win'];
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
  /** Street cleared: "Next street", or "Go to Go-Slow Hall" after the last street. */
  next(at: TapPoint | null): void;
}

/** What the game over and win screens show. */
export interface RunSummary {
  kobo: number;
  lives: number;
}

/** What the Street cleared screen shows (S2.10). */
export interface ClearedSummary {
  /** The street's name, e.g. "Market road". */
  name: string;
  kobo: number;
  /** The last street of the state: the big button goes to Go-Slow Hall. */
  last: boolean;
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
  private cleared: ClearedSummary = { name: '', kobo: 0, last: false };
  private look: FullLook;
  /** Builder: the player tapped a Hair or Outfit chip, so body and age no longer change them (S2.3). */
  private styled = false;
  /** Builder: watches the right column, to show the fade while more is below. */
  private sideWatch: ResizeObserver | null = null;
  /** S2.2: the title shows the touch words when the phone buttons are shown, else the key words. */
  touchWords: () => boolean = () => true;

  constructor(
    parent: HTMLElement,
    private readonly store: Store,
    look: HeroLook,
    private readonly hooks: MenuHooks,
  ) {
    this.look = fixLook(look);
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

  showCleared(summary: ClearedSummary): void {
    this.cleared = summary;
    this.show('cleared');
  }

  showWin(summary: RunSummary): void {
    this.summary = summary;
    this.show('win');
  }

  show(screen: MenuScreen, by?: MouseEvent): void {
    cancelAnimationFrame(this.previewFrame);
    this.sideWatch?.disconnect();
    this.sideWatch = null;
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
    if (screen === 'cleared') this.layer.append(this.streetCleared());
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

  /**
   * S2.10 Street cleared. No saving yet (piece N2), and the Streets screen comes in N2 too, so
   * until then the small buttons are "Play again" and "Home".
   */
  private streetCleared(): HTMLElement {
    const w = WORDS.cleared;
    const c = this.cleared;
    return h(
      'div',
      { class: 'card narrow', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(c.name, c.kobo)),
      this.guarded(c.last ? w.toHall : w.next, 'go', (e) => this.hooks.next(tapPoint(e))),
      h(
        'div',
        { class: 'minor-row' },
        this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.home, 'minor', () => this.hooks.home()),
      ),
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
      h('p', {}, this.touchWords() ? w.howTo : w.howToKeys),
      saved
        ? button(w.start, 'go', (e) => {
            // S2.3: a slice 1 hero opens the builder once, with the "New!" line.
            if (isOldSave(this.store)) this.show('builder', e);
            else this.hooks.start(tapPoint(e));
          })
        : button(w.makeHero, 'go', (e) => this.show('builder', e)),
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
    const preview = h('canvas', { class: 'preview', role: 'img', 'aria-label': w.preview });
    // S2.3: a hero that already wears a picked hair or outfit (not the first look) keeps it.
    this.styled = hasSavedLook(this.store) && !wearsFirstLook(this.look);
    const showNew = isOldSave(this.store);

    type Part = keyof FullLook;
    const parts: readonly Part[] = ['body', 'age', 'skin', 'hair', 'outfit'];
    const mark = (): void => {
      for (const part of parts) {
        for (const b of this.layer.querySelectorAll<HTMLButtonElement>(`[data-part="${part}"]`)) {
          b.setAttribute('aria-pressed', String(Number(b.dataset['index']) === this.look[part]));
        }
      }
    };
    const pick = (part: Part, i: number, e: MouseEvent): void => {
      if (this.ignoreTap(e)) return; // the builder opened under the finger
      if (part === 'hair' || part === 'outfit') this.styled = true;
      const next = part === 'body' || part === 'age' ? changeBody(this.look, part, i, this.styled) : { ...this.look, [part]: i };
      this.look = saveLook(this.store, next);
      this.hooks.lookChanged(this.look);
      mark();
    };
    const opt = (part: Part, i: number, label: string, cls: string, style?: string): HTMLButtonElement => {
      return button(cls === 'swatch' ? '' : label, cls, (e) => pick(part, i, e), {
        'data-part': part,
        'data-index': String(i),
        'aria-pressed': String(this.look[part] === i),
        'aria-label': cls === 'swatch' ? label : undefined,
        style,
      });
    };
    const row = (part: Part, label: string, ...items: HTMLElement[]): HTMLElement =>
      h(
        'div',
        { class: `choice-row row-${part}`, role: 'group', 'aria-label': label },
        h('b', {}, label),
        h('div', { class: 'choices' }, ...items),
      );

    const side = h(
      'div',
      { class: 'builder-side' },
      h('h2', {}, w.heading),
      showNew && h('p', { class: 'new-note' }, w.newNote),
      row('body', w.body, ...BODIES.map((o, i) => opt('body', i, o.label, 'chip'))),
      row('age', w.age, ...AGES.map((o, i) => opt('age', i, o.label, 'chip'))),
      row('skin', w.skin, ...SKINS.map((s, i) => opt('skin', i, s.label, 'swatch', `background:${s.base}`))),
      row('hair', w.hair, ...HAIRS.map((o, i) => opt('hair', i, o.label, 'chip'))),
      row('outfit', w.outfit, ...OUTFITS.map((o, i) => opt('outfit', i, o.label, 'chip'))),
      h('p', { class: 'small' }, w.savedNote),
    );
    const bar = h('div', { class: 'side-bar', 'aria-hidden': 'true', hidden: true });
    const start = button(w.start, 'go', (e) => {
      if (this.ignoreTap(e)) return;
      // Starting keeps the look shown, even if nothing was tapped, and always saves body and age.
      this.look = saveLook(this.store, this.look);
      this.hooks.start(tapPoint(e));
    });

    const card = h(
      'div',
      { class: 'card hero-card', role: 'dialog', 'aria-label': w.heading },
      // Heading and rows come first for screen readers and Tab; the CSS puts them on the right.
      h('div', { class: 'builder' }, h('div', { class: 'builder-wrap' }, side, bar), h('div', { class: 'builder-main' }, preview, start)),
    );
    this.watchSide(side, bar);
    this.animatePreview(preview);
    return card;
  }

  /**
   * S2.3: while more of the right column is below, its bottom 24 px fades to the panel colour
   * and our own scroll bar shows whenever there is more to scroll.
   */
  private watchSide(side: HTMLElement, bar: HTMLElement): void {
    const update = (): void => {
      const { scrollHeight: total, clientHeight: seen, scrollTop: top } = side;
      side.classList.toggle('more-below', total - top - seen > 2);
      const scrolls = total > seen + 2 && seen > 0;
      bar.hidden = !scrolls;
      if (scrolls) {
        const h = Math.max(24, (seen * seen) / total);
        bar.style.setProperty('--bar-h', `${h}px`);
        bar.style.setProperty('--bar-top', `${(top / (total - seen)) * (seen - h)}px`);
      }
    };
    side.addEventListener('scroll', update, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.sideWatch = new ResizeObserver(update);
      this.sideWatch.observe(side);
    }
    requestAnimationFrame(update);
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
