/**
 * The HUD during a run (docs/design.md, Screens: HUD): lives as a heart and a number,
 * kobo, the food slot (icon, word, seconds left), and the sound and pause buttons.
 * HTML over the canvas; the DOM is only touched when something changes.
 */
import { drawFoodIcon, drawKobo } from '../art/items';
import { drawParcelIcon } from '../art/wellRoom';
import { drawFufuIcon } from '../art/fufu';
import type { Run } from '../game/run';
import { STEPS_PER_SECOND, RULES } from '../game/run';
import { h } from './dom';
import { pressOnDown, type HintBarBox } from './controls';
import { WORDS, barWords } from './words';

type Slot = 'corn' | 'garri' | 'amala';

export interface HudHooks {
  pause(): void;
  toggleSound(): void;
}

const SPEAKER = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path class="off" d="M3 3l18 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

export class Hud {
  readonly root: HTMLElement;
  private readonly lives: HTMLElement;
  private readonly kobo: HTMLElement;
  private readonly koboWord: HTMLElement;
  private readonly koboCount: Text;
  private readonly slots: Record<Slot, { el: HTMLElement; text: HTMLElement }>;
  /** The garri parcel (S2.5): its icon and "Parcel" next to the kobo while carried. */
  private readonly parcel: HTMLElement;
  /** S2.15: the fufu chip ("Fufu 8"; tight: the icon and "8"), while balls are held. */
  private readonly fufu: HTMLElement;
  private readonly fufuText: HTMLElement;
  private readonly sound: HTMLButtonElement;
  private readonly left: HTMLElement;
  private last = '';
  /** What the last fit was for: the chips showing, the kobo digits and the screen width. */
  private fitFor = '';
  private level = 0;
  private lastKobo = 0;
  private digits = '';
  /** Go-Slow Hall: no Kobo chip (po M4 note), and the chips keep clear of the hit circles. */
  private hall = false;
  /**
   * The left chips' right edge must stay left of this (CSS px), or the HUD steps tighter. In the
   * hall it is the hit counter's left edge (po M4 bug 2); elsewhere there is no limit.
   */
  limit: () => number = () => Infinity;

  constructor(parent: HTMLElement, hooks: HudHooks) {
    this.lives = h('span', { class: 'hud-lives' });
    // The kobo count: "Kobo 12"; on the tightest HUD a coin stands for the word (still read out).
    const coin = h('canvas', { class: 'hud-icon hud-coin', width: '40', height: '40', 'aria-hidden': 'true' });
    const cg = coin.getContext('2d');
    if (cg) {
      cg.scale(40 / 24, 40 / 24);
      cg.translate(12, 12);
      drawKobo(cg, 0, 0, 0); // facing you, the "k" showing
    }
    this.koboWord = h('span', { class: 'hud-word' });
    this.koboCount = document.createTextNode('');
    this.kobo = h('span', { class: 'hud-kobo' }, coin, h('span', { class: 'hud-text' }, this.koboWord, this.koboCount));
    const slot = (kind: Slot): { el: HTMLElement; text: HTMLElement } => {
      const icon = h('canvas', { class: 'hud-icon', width: '56', height: '56', 'aria-hidden': 'true' });
      const g = icon.getContext('2d');
      if (g) {
        g.scale(56 / 32, 56 / 32);
        drawFoodIcon(g, kind, 16, 16, 0.85);
      }
      const text = h('span', { class: 'hud-text' });
      const el = h('span', { class: 'hud-food', hidden: true }, icon, text);
      return { el, text };
    };
    this.slots = { garri: slot('garri'), corn: slot('corn'), amala: slot('amala') };
    const parcelIcon = h('canvas', { class: 'hud-icon', width: '56', height: '56', 'aria-hidden': 'true' });
    const pg = parcelIcon.getContext('2d');
    if (pg) {
      pg.scale(56 / 32, 56 / 32);
      drawParcelIcon(pg, 16, 16, 26);
    }
    this.parcel = h('span', { class: 'hud-food hud-parcel', hidden: true }, parcelIcon, h('span', { class: 'hud-word' }, WORDS.hud.parcel));
    const fufuIcon = h('canvas', { class: 'hud-icon', width: '56', height: '56', 'aria-hidden': 'true' });
    const fg = fufuIcon.getContext('2d');
    if (fg) {
      fg.scale(56 / 32, 56 / 32);
      drawFufuIcon(fg, 16, 16, 26);
    }
    this.fufuText = h('span', { class: 'hud-text' });
    this.fufu = h('span', { class: 'hud-food hud-fufu', hidden: true }, fufuIcon, this.fufuText);
    // Both act on the press, so a second finger works while a thumb holds Forward or Jump.
    this.sound = h('button', { type: 'button', class: 'hud-btn hud-sound', 'data-ui': true });
    this.sound.innerHTML = SPEAKER;
    pressOnDown(this.sound, () => hooks.toggleSound());
    const pause = h('button', { type: 'button', class: 'hud-btn hud-pause', 'aria-label': WORDS.hud.pause, 'data-ui': true }, 'II');
    pressOnDown(pause, () => hooks.pause());
    this.left = h('div', { class: 'hud-left' }, this.lives, this.kobo, this.parcel, this.slots.garri.el, this.slots.corn.el, this.slots.amala.el, this.fufu);
    this.root = h('div', { class: 'hud', hidden: true }, this.left, h('div', { class: 'hud-right' }, this.sound, pause));
    parent.append(this.root);
    window.addEventListener('resize', () => this.fit(true));
  }

  show(on: boolean): void {
    this.root.hidden = !on;
    if (on) this.fit(true);
  }

  /** How tight the HUD is now: 0 is the full words; see HUD_TIGHT. */
  get tight(): number {
    return this.level;
  }

  /** Cheap to call every frame. */
  update(run: Run, soundOn: boolean): void {
    const p = run.power;
    const secs = (steps: number): number => Math.ceil(steps / STEPS_PER_SECOND);
    const warn = (steps: number): boolean => steps > 0 && steps <= RULES.warnSteps;
    const key = [run.lives, run.kobo, run.parcel, p.shield, secs(p.corn), secs(p.amala), warn(p.corn), warn(p.amala), soundOn, run.inHall, run.fufu].join('|');
    if (key === this.last) return;
    this.last = key;
    this.hall = run.inHall;
    this.kobo.hidden = this.hall;

    this.lives.textContent = WORDS.hud.lives(run.lives);
    this.lives.setAttribute('aria-label', `Lives: ${run.lives}`);
    const kobo = WORDS.hud.kobo(run.kobo);
    const n = String(run.kobo);
    this.koboWord.textContent = kobo.endsWith(n) ? kobo.slice(0, kobo.length - n.length) : kobo;
    this.koboCount.data = kobo.endsWith(n) ? n : '';
    this.lastKobo = run.kobo;
    this.digits = `${String(secs(p.corn)).length}${String(secs(p.amala)).length}${String(run.fufu).length}`;
    this.parcel.hidden = !run.parcel;
    this.setSlot('garri', p.shield, WORDS.hud.shield, false);
    this.setSlot('corn', p.corn > 0, WORDS.hud.fast(secs(p.corn)), warn(p.corn));
    this.setSlot('amala', p.amala > 0, WORDS.hud.strong(secs(p.amala)), warn(p.amala));
    this.fufu.hidden = run.fufu <= 0;
    this.setText(this.fufuText, WORDS.hud.fufu(run.fufu));
    this.fufu.setAttribute('aria-label', WORDS.hud.fufuSpoken(run.fufu));
    this.sound.classList.toggle('is-off', !soundOn);
    this.sound.setAttribute('aria-label', soundOn ? WORDS.hud.soundOn : WORDS.hud.soundOff);
    this.fit(false);
  }

  /**
   * docs/design.md HUD: one row, inside the top 56 px, at every width. On a narrow screen the
   * chips step tighter (HUD_TIGHT) until the row fits: never a second row under Sound and Pause,
   * where it would sit under the Go up button (qa L3). Only measures when the row's make-up changes.
   */
  private fit(force: boolean): void {
    if (this.root.hidden) return;
    const shown = [...this.left.children].map((c) => ((c as HTMLElement).hidden ? 0 : 1)).join('');
    // The food seconds' digits too: a second corn takes 9 back to 12, one digit wider.
    const key = `${shown}|${String(this.lastKobo).length}|${this.digits}|${window.innerWidth}|${window.innerHeight}|${this.hall}`;
    if (!force && key === this.fitFor) return;
    this.fitFor = key;
    const limit = this.limit();
    for (let lvl = 0; lvl < HUD_TIGHT.length; lvl++) {
      this.setLevel(lvl);
      if (oneRow(this.left) && rightEdge(this.left) <= limit) return;
    }
  }

  private setLevel(lvl: number): void {
    this.level = lvl;
    for (let i = 1; i < HUD_TIGHT.length; i++) this.root.classList.toggle(HUD_TIGHT[i]!, i <= lvl);
  }

  private setSlot(kind: Slot, on: boolean, words: string, blink: boolean): void {
    const s = this.slots[kind];
    s.el.hidden = !on;
    this.setText(s.text, words);
    s.el.classList.toggle('blink', blink);
  }

  /** A chip's word and number apart, so a tight HUD can show the icon and number only. */
  private setText(text: HTMLElement, words: string): void {
    // The word and the seconds apart, so a tight HUD can show the icon and seconds only. The
    // word stays in the text (and is read out), only hidden from sight.
    const m = /^(.*?)(\d+)$/.exec(words);
    const word = m ? m[1]! : words;
    const secs = m ? m[2]! : '';
    if (text.textContent !== words) {
      text.replaceChildren(h('span', { class: 'hud-word' }, word), secs);
    }
  }
}

/**
 * The HUD's steps, from roomy to tight (classes on .hud, each adding to the one before;
 * src/screens/screens.css): 1 the parcel, shield and food chips show their icon (and seconds)
 * only, with less padding; 2 smaller words, icons and gaps; 3 (every chip on a 320 px screen)
 * no chip boxes, a coin for the word "Kobo", small icons; 4 smaller still, for two-digit food
 * seconds with every chip on a 320 px screen.
 */
export const HUD_TIGHT = ['', 'hud-tight', 'hud-tighter', 'hud-tightest', 'hud-tiniest'] as const;

/** The right edge of the last chip showing, CSS px from the screen's left. */
function rightEdge(left: HTMLElement): number {
  let right = 0;
  for (const c of left.children) {
    const el = c as HTMLElement;
    if (!el.hidden) right = Math.max(right, el.getBoundingClientRect().right);
  }
  return right;
}

/** True when every chip showing sits on one row (none wrapped under another). */
function oneRow(left: HTMLElement): boolean {
  let top: number | null = null;
  for (const c of left.children) {
    const el = c as HTMLElement;
    if (el.hidden) continue;
    if (top === null) top = el.offsetTop;
    else if (Math.abs(el.offsetTop - top) > 2) return false;
  }
  return true;
}

/** Biggest word size of each row of the S2.2 table, px; the bar steps down from it to MIN_FONT. */
const BAR_FONT: Record<HintBarBox['size'], number> = { small: 12, mid: 14, big: 16 };
/** The smallest the bar's words go before it is a designer bug (S2.2). */
export const MIN_FONT = 11;

/**
 * The hint bar (docs/design.md S2.2, "The hint bar"): every hint and toast shows here, in the
 * pavement strip between Forward and Jump, where nothing playable is ever drawn. A new one
 * replaces the old. It takes no taps.
 */
export class Toast {
  private readonly el: HTMLElement;
  private timer = 0;
  private box: HintBarBox | null = null;
  private cssH = 0;
  private full = '';

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    parent.append(this.el);
  }

  /** Where the bar goes now (from hintBarBox); called on resize and when the buttons change. */
  place(box: HintBarBox, cssH: number): void {
    this.box = box;
    this.cssH = cssH;
    const s = this.el.style;
    s.left = `${box.x}px`;
    s.width = `${box.w}px`;
    s.bottom = `${cssH - box.bottom}px`;
    s.maxHeight = `${Math.max(0, box.bottom - box.top)}px`;
    this.el.dataset['size'] = box.size;
    if (this.full) this.setWords(this.full);
  }

  show(words: string, ms = 2200): void {
    this.full = words;
    this.setWords(words);
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

  /** The words for this bar's width, at the biggest size (down to 11 px) that fits uncut. */
  private setWords(words: string): void {
    const box = this.box;
    this.el.textContent = box ? barWords(words, box.w) : words;
    if (!box || this.cssH <= 0) return;
    for (let px = BAR_FONT[box.size]; px >= MIN_FONT; px--) {
      this.el.style.fontSize = `${px}px`;
      if (this.el.scrollHeight <= this.el.clientHeight && this.el.scrollWidth <= this.el.clientWidth) break;
    }
  }
}
