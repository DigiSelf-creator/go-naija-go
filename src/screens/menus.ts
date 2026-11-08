/**
 * Menu screens (docs/design.md S2.10): title, hero builder, credits, Streets, Nigeria's wheel,
 * and in a run: pause, game over, Street cleared and Win. An HTML layer over the canvas; one
 * screen shows at a time.
 */
import { AGES, BODIES, HAIRS, OUTFITS, SKINS, drawHero, type HeroLook } from '../art/hero';
import { cardBadgeSvg, cardSceneSvg, MUSIC_SVG } from '../art/cards';
import { WHEEL_STATES, wheelSvg } from '../art/wheel';
import { readSafeArea } from '../engine/view';
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
import type { StateProgress } from '../game/progress';
import type { Store } from '../storage';
import { button, h } from './dom';
import { streetCards, wheelFit, type Where } from './streets';
import { GAME_NAME, WORDS } from './words';

export type MenuScreen = 'title' | 'builder' | 'credits' | 'streets' | 'wheel' | 'pause' | 'gameover' | 'cleared' | 'win' | null;

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

/** Where the "Play" tap landed (CSS px), so the game can ignore a double tap's second half. */
export interface TapPoint {
  x: number;
  y: number;
}

/** Sounds the menus play (S2.12 sounds 13 and 14). */
export type MenuSound = 'lockedTuk' | 'cogRatchet' | 'cogBell';

/** What the Streets screen and the wheel read (S2.8). */
export interface ProgressView {
  /** Lagos (the one state in version 1). */
  lagos: StateProgress;
  /** Street names in order (from the level files). */
  names: readonly string[];
  /** Street themes in order (the card pictures). */
  themes: readonly string[];
  /** Ids of the states whose cogs turn. */
  working: readonly string[];
}

/** Where a screen in a run sends the player when the run ends. */
export type LeaveTo = 'title' | 'streets' | 'wheel';

export interface MenuHooks {
  /** "Play" on the title, or "Start running" in the builder. */
  start(at: TapPoint | null): void;
  /** A Streets card: that street, or the hall. */
  play(where: Where, at: TapPoint | null): void;
  /** The look changed in the builder (already saved). */
  lookChanged(look: HeroLook): void;
  /** Pause: "Keep playing". */
  resume(): void;
  /** "Start again" or "Play again": the level from the start, full lives, 0 kobo. */
  restart(at: TapPoint | null): void;
  /** Street cleared: "Next street", or "Go to Go-Slow Hall" after the last street. */
  next(at: TapPoint | null): void;
  /** Leave the run (saving nothing from it) for the title, Streets, or the wheel. */
  leave(to: LeaveTo): void;
  /** The Sound switch changed (title or pause). */
  soundChanged(on: boolean): void;
  progress(): ProgressView;
  playSound(name: MenuSound): void;
  /** The player asked for less motion: the wheel's cogs stand still (S2.11). */
  stillWanted(): boolean;
}

/** What the game over and win screens show. */
export interface RunSummary {
  kobo: number;
  lives: number;
  /** Lost in Go-Slow Hall: the hall's game over words (S2.10). */
  hall?: boolean;
}

/** What the Street cleared screen shows (S2.10). */
export interface ClearedSummary {
  /** The street's name, e.g. "Computer Village". */
  name: string;
  kobo: number;
  /** The last street of the state: the big button goes to Go-Slow Hall. */
  last: boolean;
  /** Got on the bus with the garri parcel: it is saved for the hall. */
  parcel: boolean;
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
  private cleared: ClearedSummary = { name: '', kobo: 0, last: false, parcel: false };
  private look: FullLook;
  /** Builder: the player tapped a Hair or Outfit chip, so body and age no longer change them (S2.3). */
  private styled = false;
  /** Builder and the wheel's list: watches a scrolling box, to show the fade while more is below. */
  private sideWatch: ResizeObserver | null = null;
  /** Where the wheel's "Back" goes: the title if it opened from there, else Streets (S2.10 flow). */
  private wheelBack: 'title' | 'streets' = 'streets';
  /** Lays out the wheel screen again (on resize while it shows). */
  private refit: (() => void) | null = null;
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
    // A held Enter or Space must not press a focused button again and again.
    this.layer.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
      },
      true,
    );
    parent.append(this.layer);
    window.addEventListener('resize', () => this.refit?.());
  }

  get current(): MenuScreen {
    return this.screen;
  }

  get sound(): boolean {
    return this.settings.sound;
  }

  /** The Music switch (S2.9 rule 5). The player itself comes with O2; this only remembers it. */
  get music(): boolean {
    return this.settings.music;
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

  /** Opens Nigeria's wheel; its "Back" goes to `back`. */
  showWheel(back: 'title' | 'streets'): void {
    this.wheelBack = back;
    this.show('wheel');
  }

  show(screen: MenuScreen, by?: MouseEvent): void {
    cancelAnimationFrame(this.previewFrame);
    this.sideWatch?.disconnect();
    this.sideWatch = null;
    this.refit = null;
    this.screen = screen;
    this.shownAt = performance.now();
    const at = by ? tapPoint(by) : null;
    this.opener = at ? { ...at, t: performance.now() } : null;
    this.layer.replaceChildren();
    this.layer.hidden = screen === null;
    this.layer.classList.toggle('full', screen === 'wheel');
    let card: HTMLElement | null = null;
    if (screen === 'title') card = this.title();
    if (screen === 'builder') card = this.builder();
    if (screen === 'credits') card = this.credits();
    if (screen === 'streets') card = this.streets();
    if (screen === 'wheel') card = this.wheel();
    if (screen === 'pause') card = this.pause();
    if (screen === 'gameover') card = this.gameOver();
    if (screen === 'cleared') card = this.streetCleared();
    if (screen === 'win') card = this.win();
    if (!card) return;
    this.layer.append(card);
    // Set by wheel() just now (TypeScript still thinks it is the null set above).
    (this.refit as (() => void) | null)?.();
    // po M4 bug 4: a card that opens in a run puts focus on its big button, so Space or Enter
    // presses it (after the 0.4 s guard).
    if (EVENT_SCREENS.includes(screen)) card.querySelector<HTMLElement>('.go')?.focus({ preventScroll: true });
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
    const sw = button(WORDS.title.gentle, 'minor gentle', (e) => {
      if (this.ignoreTap(e)) return;
      this.settings.gentle = !this.settings.gentle;
      saveSettings(this.store, this.settings);
      sw.setAttribute('aria-checked', String(this.settings.gentle));
    }, { role: 'switch', 'aria-checked': String(this.settings.gentle) });
    return sw;
  }

  /** "Sound: on" / "Sound: off" (title and pause). */
  private soundSwitch(): HTMLButtonElement {
    const w = WORDS.title;
    const sw = this.guarded(this.settings.sound ? w.soundOn : w.soundOff, 'minor', () => {
      this.settings.sound = !this.settings.sound;
      saveSettings(this.store, this.settings);
      sw.textContent = this.settings.sound ? w.soundOn : w.soundOff;
      this.hooks.soundChanged(this.settings.sound);
    });
    return sw;
  }

  /** "Music: on" / "Music: off" with the note icon (title and pause). Only remembered until O2. */
  private musicSwitch(): HTMLButtonElement {
    const w = WORDS.title;
    const label = h('span', {}, this.settings.music ? w.musicOn : w.musicOff);
    const sw = this.guarded('', 'minor music-switch', () => {
      this.settings.music = !this.settings.music;
      saveSettings(this.store, this.settings);
      label.textContent = this.settings.music ? w.musicOn : w.musicOff;
      sw.classList.toggle('is-off', !this.settings.music);
    });
    sw.innerHTML = MUSIC_SVG;
    sw.append(label);
    sw.classList.toggle('is-off', !this.settings.music);
    return sw;
  }

  /** S2.10 Pause: four buttons (2 x 2 on small screens), then the two switches in one row. */
  private pause(): HTMLElement {
    const w = WORDS.pause;
    return h(
      'div',
      { class: 'card narrow event pause-card', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h(
        'div',
        { class: 'pause-grid' },
        this.guarded(w.keepPlaying, 'go', () => this.hooks.resume()),
        this.guarded(w.restart, 'go secondary', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.streets, 'minor', () => this.hooks.leave('streets')),
        this.guarded(w.home, 'minor', () => this.hooks.leave('title')),
      ),
      h('div', { class: 'minor-row switches' }, this.soundSwitch(), this.musicSwitch()),
    );
  }

  /** The big button and the small ones: one row on short wide screens (po M4 bug 1). */
  private actions(big: HTMLButtonElement, ...small: HTMLButtonElement[]): HTMLElement {
    return h('div', { class: 'actions' }, big, h('div', { class: 'minor-row' }, ...small));
  }

  private gameOver(): HTMLElement {
    const w = WORDS.gameOver;
    return h(
      'div',
      { class: 'card narrow event', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, this.summary.hall ? w.hallText : w.text(this.summary.kobo)),
      // Gentle mode is offered only while it is off; it counts from the next run (Q15).
      !this.settings.gentle && h('div', { class: 'gentle-row' }, h('p', { class: 'small' }, w.gentleOffer), this.gentleSwitch()),
      this.actions(
        this.guarded(w.playAgain, 'go', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.streets, 'minor', () => this.hooks.leave('streets')),
        this.guarded(w.home, 'minor', () => this.hooks.leave('title')),
      ),
    );
  }

  /** S2.10 Street cleared, with Tp's line and the parcel line. */
  private streetCleared(): HTMLElement {
    const w = WORDS.cleared;
    const c = this.cleared;
    return h(
      'div',
      { class: 'card narrow event', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(c.name, c.kobo)),
      c.parcel && h('p', { class: 'parcel-line' }, w.parcel),
      this.actions(
        this.guarded(c.last ? w.toHall : w.next, 'go', (e) => this.hooks.next(tapPoint(e))),
        this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.streets, 'minor', () => this.hooks.leave('streets')),
      ),
    );
  }

  /** S2.10 Win: lives left (no kobo), the cog line, "See Nigeria's wheel". */
  private win(): HTMLElement {
    const w = WORDS.win;
    const n = this.hooks.progress().working.length;
    return h(
      'div',
      { class: 'card narrow event', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', {}, w.text(this.summary.lives)),
      h('p', {}, w.cog(n)),
      h('p', {}, w.more),
      this.actions(
        this.guarded(w.wheel, 'go', () => this.hooks.leave('wheel')),
        this.guarded(w.playAgain, 'minor', (e) => this.hooks.restart(tapPoint(e))),
        this.guarded(w.streets, 'minor', () => this.hooks.leave('streets')),
      ),
    );
  }

  /** S2.10 Streets: a card for each street and the hall, in a 2 x 2 grid on small screens. */
  private streets(): HTMLElement {
    const w = WORDS.streets;
    const p = this.hooks.progress();
    const cards = streetCards(p.lagos, p.names, p.themes).map((c) => {
      const badge = cardBadgeSvg(c.state);
      const el = button('', `street-card ${c.state}`, (e) => {
        if (this.ignoreTap(e)) return;
        if (c.state === 'locked') this.hooks.playSound('lockedTuk');
        else this.hooks.play(c.where, tapPoint(e));
      }, { 'aria-disabled': c.state === 'locked' ? 'true' : undefined, 'data-where': String(c.where) });
      el.innerHTML = `<span class="art">${cardSceneSvg(c.picture, c.state)}</span>${badge ? `<span class="badge">${badge}</span>` : ''}`;
      // No small line on the hall card: an empty one keeps the names in a row lined up. With the
      // parcel line the hall card drops it instead, so the card stays three lines tall and the
      // 2 x 2 grid still fits 320 x 240.
      if (c.num || c.extra === null) el.append(h('span', { class: 'num', 'aria-hidden': c.num ? undefined : 'true' }, c.num));
      el.append(h('span', { class: 'name' }, c.name), h('span', { class: 'status' }, c.status));
      if (c.extra !== null) {
        el.classList.add('with-extra');
        el.append(h('span', { class: 'status extra' }, c.extra));
      }
      return el;
    });
    return h(
      'div',
      { class: 'card narrow streets-card', role: 'dialog', 'aria-label': w.heading },
      h('h2', {}, w.heading),
      h('p', { class: 'small' }, w.line),
      h('div', { class: 'streets-grid' }, ...cards),
      h(
        'div',
        { class: 'minor-row' },
        button(w.wheel, 'minor', () => this.showWheel('streets')),
        button(w.home, 'minor', () => this.show('title')),
      ),
    );
  }

  /**
   * S2.8 Nigeria's wheel: the wheel as tall as the screen, the words in a rail beside it, and
   * "All names" opening the full list. One list in the page, used both ways (screen readers
   * hear it after the count line on the wheel view).
   */
  private wheel(): HTMLElement {
    const w = WORDS.wheel;
    const p = this.hooks.progress();
    const working = new Set(p.working);
    const n = WHEEL_STATES.filter((s) => working.has(s.id)).length;
    const moreLine = n === 0 ? w.none : w.more;

    const pic = h('div', { class: 'wheel-box', 'aria-hidden': 'true' });
    pic.innerHTML = wheelSvg(working, { turn: !this.hooks.stillWanted() });

    const list = h(
      'ul',
      { class: 'names' },
      ...WHEEL_STATES.map((s) => {
        const on = working.has(s.id);
        return h(
          'li',
          { class: on ? 'on' : undefined },
          h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'),
          s.name,
          h('span', { class: 'sr-only' }, on ? w.working : w.notWorking),
        );
      }),
    );
    const listSpot = h('div', { class: 'names-spot sr-only' }, list);
    const allNames = button(w.allNames, 'minor', () => openList());
    const rail = h(
      'div',
      { class: 'wheel-rail' },
      h('h2', {}, w.heading),
      h('p', { class: 'wide-only' }, w.about),
      h('p', { class: 'wide-only' }, h('b', {}, w.count(n)), ' ', moreLine),
      h('p', { class: 'narrow-only count', 'aria-hidden': 'true' }, h('b', {}, w.countShort(n)), h('span', {}, w.cogsTurning)),
      listSpot,
      h('div', { class: 'wheel-buttons' }, allNames, button(w.back, 'minor', () => this.show(this.wheelBack))),
    );

    const heading = h('h2', { tabindex: '-1' }, w.listHeading);
    const bar = h('div', { class: 'side-bar', 'aria-hidden': 'true', hidden: true });
    const box = h('div', { class: 'names-box' }, h('p', {}, w.about), h('p', {}, w.count(n), ' ', moreLine), h('p', {}, w.tickNote));
    const panel = h(
      'div',
      { class: 'names-panel' },
      h('div', { class: 'names-top' }, heading, button(w.close, 'minor', () => closeList())),
      h('div', { class: 'names-wrap' }, box, bar),
    );
    const card = h('div', { class: 'card wheel-card', role: 'dialog', 'aria-label': w.heading }, pic, rail, panel);

    const openList = (): void => {
      card.classList.add('list-open');
      box.append(list);
      this.watchSide(box, bar);
      heading.focus({ preventScroll: true });
    };
    const closeList = (): void => {
      card.classList.remove('list-open');
      this.sideWatch?.disconnect();
      this.sideWatch = null;
      listSpot.append(list);
      allNames.focus({ preventScroll: true });
    };
    // Tapping the wheel picture opens the list too.
    pic.addEventListener('click', () => openList());
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card.classList.contains('list-open')) {
        e.preventDefault();
        e.stopPropagation();
        closeList();
      }
    });

    this.refit = (): void => {
      const safe = readSafeArea();
      const sw = window.innerWidth - safe.left - safe.right;
      const sh = window.innerHeight - safe.top - safe.bottom;
      const f = wheelFit(sw, sh);
      card.classList.toggle('narrow-rail', f.narrow);
      card.classList.toggle('upright', f.portrait);
      const put = (el: HTMLElement, x: number, y: number, wd: number, ht: number): void => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${wd}px`;
        el.style.height = `${ht}px`;
      };
      put(pic, f.wheelX, f.wheelY, f.w, f.w);
      put(rail, f.railX, f.railY, f.r, f.railH);
    };
    return card;
  }

  private title(): HTMLElement {
    const saved = hasSavedLook(this.store);
    const w = WORDS.title;
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
        button(w.wheel, 'minor', () => this.showWheel('title')),
        button(w.credits, 'minor', () => this.show('credits')),
        this.soundSwitch(),
        this.musicSwitch(),
        this.gentleSwitch(),
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
