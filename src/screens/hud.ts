/**
 * The HUD during a run (docs/design.md, Screens: HUD): lives as a heart and a number,
 * kobo, the food slot (icon, word, seconds left), and the sound and pause buttons.
 * HTML over the canvas; the DOM is only touched when something changes.
 */
import { drawFoodIcon } from '../art/items';
import type { Run } from '../game/run';
import { STEPS_PER_SECOND, RULES } from '../game/run';
import { button, h } from './dom';
import { WORDS } from './words';

type Slot = 'corn' | 'garri' | 'amala';

export interface HudHooks {
  pause(e: MouseEvent): void;
  toggleSound(): void;
}

const SPEAKER = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path class="off" d="M3 3l18 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

export class Hud {
  readonly root: HTMLElement;
  private readonly lives: HTMLElement;
  private readonly kobo: HTMLElement;
  private readonly slots: Record<Slot, { el: HTMLElement; text: HTMLElement }>;
  private readonly sound: HTMLButtonElement;
  private last = '';

  constructor(parent: HTMLElement, hooks: HudHooks) {
    this.lives = h('span', { class: 'hud-lives' });
    this.kobo = h('span', { class: 'hud-kobo' });
    const slot = (kind: Slot): { el: HTMLElement; text: HTMLElement } => {
      const icon = h('canvas', { class: 'hud-icon', width: '56', height: '56', 'aria-hidden': 'true' });
      const g = icon.getContext('2d');
      if (g) {
        g.scale(56 / 32, 56 / 32);
        drawFoodIcon(g, kind, 16, 16, 0.85);
      }
      const text = h('span', {});
      const el = h('span', { class: 'hud-food', hidden: true }, icon, text);
      return { el, text };
    };
    this.slots = { garri: slot('garri'), corn: slot('corn'), amala: slot('amala') };
    this.sound = button('', 'hud-btn hud-sound', () => hooks.toggleSound(), { 'data-ui': true });
    this.sound.innerHTML = SPEAKER;
    const pause = button('II', 'hud-btn hud-pause', (e) => hooks.pause(e), { 'aria-label': WORDS.hud.pause, 'data-ui': true });
    this.root = h(
      'div',
      { class: 'hud', hidden: true },
      h('div', { class: 'hud-left' }, this.lives, this.kobo, this.slots.garri.el, this.slots.corn.el, this.slots.amala.el),
      h('div', { class: 'hud-right' }, this.sound, pause),
    );
    parent.append(this.root);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  /** Cheap to call every frame. */
  update(run: Run, soundOn: boolean): void {
    const p = run.power;
    const secs = (steps: number): number => Math.ceil(steps / STEPS_PER_SECOND);
    const warn = (steps: number): boolean => steps > 0 && steps <= RULES.warnSteps;
    const key = [run.lives, run.kobo, p.shield, secs(p.corn), secs(p.amala), warn(p.corn), warn(p.amala), soundOn].join('|');
    if (key === this.last) return;
    this.last = key;

    this.lives.textContent = WORDS.hud.lives(run.lives);
    this.lives.setAttribute('aria-label', `Lives: ${run.lives}`);
    this.kobo.textContent = WORDS.hud.kobo(run.kobo);
    this.setSlot('garri', p.shield, WORDS.hud.shield, false);
    this.setSlot('corn', p.corn > 0, WORDS.hud.fast(secs(p.corn)), warn(p.corn));
    this.setSlot('amala', p.amala > 0, WORDS.hud.strong(secs(p.amala)), warn(p.amala));
    this.sound.classList.toggle('is-off', !soundOn);
    this.sound.setAttribute('aria-label', soundOn ? WORDS.hud.soundOn : WORDS.hud.soundOff);
  }

  private setSlot(kind: Slot, on: boolean, words: string, blink: boolean): void {
    const s = this.slots[kind];
    s.el.hidden = !on;
    s.text.textContent = words;
    s.el.classList.toggle('blink', blink);
  }
}

/** A short message in the middle of the screen. A new one replaces the old. */
export class Toast {
  private readonly el: HTMLElement;
  private timer = 0;

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    parent.append(this.el);
  }

  show(words: string, ms = 2200): void {
    this.el.textContent = words;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.el.classList.remove('show'), ms);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.el.classList.remove('show');
  }

  get text(): string {
    return this.el.classList.contains('show') ? (this.el.textContent ?? '') : '';
  }
}
