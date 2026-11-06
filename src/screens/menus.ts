/**
 * Title, hero builder and credits screens (docs/design.md: Screens, Hero builder).
 * An HTML layer over the canvas; one screen shows at a time.
 */
import { HAIRS, OUTFITS, SKINS, drawHero, type HeroLook } from '../art/hero';
import { hasSavedLook, loadSettings, saveLook, saveSettings, type Settings } from '../game/save';
import type { Store } from '../storage';
import { button, h } from './dom';
import { GAME_NAME, WORDS } from './words';

export type MenuScreen = 'title' | 'builder' | 'credits' | null;

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
}

export class Menus {
  private readonly layer: HTMLElement;
  private screen: MenuScreen = null;
  private settings: Settings;
  private previewFrame = 0;
  /** The tap that opened the current screen, if it was a tap. */
  private opener: (TapPoint & { t: number }) | null = null;

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

  show(screen: MenuScreen, by?: MouseEvent): void {
    cancelAnimationFrame(this.previewFrame);
    this.screen = screen;
    const at = by ? tapPoint(by) : null;
    this.opener = at ? { ...at, t: performance.now() } : null;
    this.layer.replaceChildren();
    this.layer.hidden = screen === null;
    if (screen === 'title') this.layer.append(this.title());
    if (screen === 'builder') this.layer.append(this.builder());
    if (screen === 'credits') this.layer.append(this.credits());
  }

  private title(): HTMLElement {
    const saved = hasSavedLook(this.store);
    const w = WORDS.title;
    const sound = button(this.settings.sound ? w.soundOn : w.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sound.textContent = this.settings.sound ? w.soundOn : w.soundOff;
    });
    const gentle = button(w.gentle, 'minor', () => {
      this.settings.gentle = !this.settings.gentle;
      saveSettings(this.store, this.settings);
      gentle.setAttribute('aria-checked', String(this.settings.gentle));
    }, { role: 'switch', 'aria-checked': String(this.settings.gentle) });

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
      if (this.secondHalfOfDoubleTap(e)) return; // the builder opened under the finger
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
        if (this.secondHalfOfDoubleTap(e)) return;
        // Starting keeps the look shown, even if nothing was tapped.
        this.look = saveLook(this.store, this.look);
        this.hooks.start(tapPoint(e));
      }),
      h('p', { class: 'small' }, w.savedNote),
    );
    this.animatePreview(preview);
    return card;
  }

  private secondHalfOfDoubleTap(e: MouseEvent): boolean {
    return isSecondTap(this.opener, tapPoint(e));
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
      h('p', { class: 'small' }, WORDS.closingLine),
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
