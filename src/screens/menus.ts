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

export interface MenuHooks {
  /** "Start running" was tapped. */
  start(): void;
  /** The look changed in the builder (already saved). */
  lookChanged(look: HeroLook): void;
}

export class Menus {
  private readonly layer: HTMLElement;
  private screen: MenuScreen = null;
  private settings: Settings;
  private previewFrame = 0;

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

  show(screen: MenuScreen): void {
    cancelAnimationFrame(this.previewFrame);
    this.screen = screen;
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
      saved ? button(w.start, 'go', () => this.hooks.start()) : button(w.makeHero, 'go', () => this.show('builder')),
      h(
        'div',
        { class: 'minor-row' },
        saved && button(w.changeHero, 'minor', () => this.show('builder')),
        button(w.credits, 'minor', () => this.show('credits')),
        sound,
        gentle,
      ),
    );
  }

  private builder(): HTMLElement {
    const w = WORDS.builder;
    const preview = h('canvas', { class: 'preview', role: 'img', 'aria-label': 'Your hero' });

    const pick = (part: keyof HeroLook, i: number): void => {
      this.look = saveLook(this.store, { ...this.look, [part]: i });
      this.hooks.lookChanged(this.look);
      for (const b of this.layer.querySelectorAll<HTMLButtonElement>(`[data-part="${part}"]`)) {
        b.setAttribute('aria-pressed', String(Number(b.dataset['index']) === this.look[part]));
      }
    };
    const opt = (part: keyof HeroLook, i: number, label: string, cls: string, style?: string): HTMLButtonElement => {
      return button(cls === 'swatch' ? '' : label, cls, () => pick(part, i), {
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
      button(w.start, 'go', () => {
        // Starting keeps the look shown, even if nothing was tapped.
        this.look = saveLook(this.store, this.look);
        this.hooks.start();
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
      h('p', { class: 'small' }, WORDS.closingLine),
      button(w.back, 'go', () => this.show('title')),
    );
  }
}
