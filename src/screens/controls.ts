/**
 * The phone buttons (docs/design.md S2.2, Phone buttons): Back and Forward under the left thumb,
 * Jump under the right, all in the bottom strip. Art's drawings (src/art/controls.ts, H5): each
 * button holds its plain and pressed SVG, and CSS shows one by the `down` class. The buttons
 * only show; the touch areas (src/engine/input.ts) are much bigger than the drawings.
 */
import { CONTROL_WORDS, controlSvg, throwLabel, type ControlKind } from '../art/controls';
import type { Insets } from '../engine/view';
import { MIN_WORLD_W, WORLD_H } from '../engine/view';
import { h } from './dom';

/** The bottom strip is this much of the 420 u view: road front (300 to 360) and pavement (360 to 420). */
const STRIP_U = 120;
/** Smallest button, CSS px: the touch minimum, never shrunk. */
export const MIN_D = 56;
/** Space between the road line and the tops of the buttons, CSS px (as on a normal screen). */
const ROAD_GAP = 4;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ButtonLayout {
  /** Button size, CSS px. */
  d: number;
  strip: number;
  back: Box;
  forward: Box;
  jump: Box;
  /**
   * S2.15 Throw (shown only while fufu balls are held): a circle max(64, D) across, its right
   * edge 10 px left of Jump's left edge, same bottom as Jump. `throwTouch` is its touch area:
   * the drawn circle plus 5 px all round.
   */
  throw: Box;
  throwTouch: Box;
  /** Midpoint between the Back and Forward centres: left of it is Back. */
  midX: number;
  /**
   * World units the camera raises the road line (0 on almost every screen). On a very short
   * screen (under about 238 px tall) the 56 px buttons would reach above the road line, so the
   * whole picture moves up just enough to keep the road 4 px clear of them.
   */
  lift: number;
}

/** Sizes and places for a screen (CSS px), per the S2.2 table. */
export function buttonLayout(cssW: number, cssH: number, safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): ButtonLayout {
  const strip = (cssH * STRIP_U) / WORLD_H;
  const bottom = Math.max(8, safe.bottom);
  const d = Math.floor(Math.min(80, Math.max(MIN_D, strip - bottom - ROAD_GAP)));
  const left = Math.max(12, safe.left);
  const right = Math.max(12, safe.right);
  const y = cssH - bottom - d;
  const back = { x: left, y, w: d, h: d };
  const forward = { x: left + d + 10, y, w: d, h: d };
  const jw = Math.round(1.5 * d);
  const jump = { x: cssW - right - jw, y, w: jw, h: d };
  const t = Math.max(THROW_MIN, d);
  const thr = { x: jump.x - THROW_GAP - t, y: y + d - t, w: t, h: t };
  const throwTouch = { x: thr.x - THROW_PAD, y: thr.y - THROW_PAD, w: t + 2 * THROW_PAD, h: t + 2 * THROW_PAD };
  // World units per CSS px, as fitView picks them (420 u tall, or 480 u across when upright).
  const perPx = Math.max(WORLD_H / cssH, MIN_WORLD_W / cssW);
  const lift = Math.max(0, WORLD_H - STRIP_U - (y - ROAD_GAP) * perPx);
  return { d, strip, back, forward, jump, throw: thr, throwTouch, midX: left + d + 5, lift };
}

/** S2.15 Throw button: smallest size, gap to Jump, touch area margin (CSS px). */
export const THROW_MIN = 64;
const THROW_GAP = 10;
const THROW_PAD = 5;
/** S2.15: a bar left narrower than this beside Throw keeps its usual place, over the button. */
export const BAR_MIN_BESIDE_THROW = 96;

/** The world y the hint bar's top never goes above (S2.2 hint bar): 12 u of road front stay in sight. */
export const BAR_TOP_Y = 312;
/** The hint bar is never wider than this, CSS px. */
export const BAR_MAX_W = 480;
/** Gap between the bar and the buttons beside it, CSS px. */
const BAR_GAP = 6;

/** Which phone buttons are on screen: all three, Jump only (the slice 1 boss fight), or none (keys). */
export type ButtonsShown = 'all' | 'jump' | 'none';

export interface HintBarBox {
  /** Left edge and width, CSS px. */
  x: number;
  w: number;
  /** Highest the bar's top may go (screen y of world y 312), and its bottom edge, CSS px. */
  top: number;
  bottom: number;
  /** Word size row of the S2.2 table: under 280 px tall, 280 to 419, 420 and up. */
  size: 'small' | 'mid' | 'big';
  /** S2.15 narrowest screens: the bar sits over the Throw button (it takes no taps). */
  overThrow: boolean;
}

/**
 * Where the hint bar goes (docs/design.md S2.2, "The hint bar"): in the pavement strip, between
 * Forward and Jump, its top no higher than world y 312, its bottom in line with the buttons.
 */
export function hintBarBox(cssW: number, cssH: number, safe: Insets, layout: ButtonLayout, shown: ButtonsShown, throwShown = false): HintBarBox {
  const perPx = Math.max(WORLD_H / cssH, MIN_WORLD_W / cssW);
  const top = (BAR_TOP_Y - layout.lift) / perPx;
  const bottom = cssH - Math.max(cssH >= 280 ? 8 : 4, safe.bottom);
  let x: number;
  let w: number;
  let overThrow = false;
  if (shown === 'none') {
    w = Math.min(BAR_MAX_W, cssW - 2 * Math.max(24, safe.left, safe.right));
    x = (cssW - w) / 2;
  } else {
    let right = layout.jump.x - BAR_GAP;
    // Jump only: the same gap mirrored on the left, so the bar stays centred under the play.
    const left = shown === 'all' ? layout.forward.x + layout.forward.w + BAR_GAP : cssW - right;
    if (throwShown) {
      // S2.15: while Throw shows, the bar ends 6 px left of it; if that leaves under 96 px the
      // bar keeps its usual place and is drawn over Throw.
      const beside = layout.throw.x - BAR_GAP;
      if (beside - left >= BAR_MIN_BESIDE_THROW) right = beside;
      else overThrow = true;
    }
    x = left;
    w = right - left;
    if (w > BAR_MAX_W) {
      x = (left + right - BAR_MAX_W) / 2;
      w = BAR_MAX_W;
    }
  }
  const size = cssH < 280 ? 'small' : cssH < 420 ? 'mid' : 'big';
  return { x, w, top, bottom, size, overThrow };
}

/** Both looks of one button: plain, then pressed (CSS shows one). */
export function padInner(kind: ControlKind): string {
  return `<span class="pad-up">${controlSvg(kind, false)}</span><span class="pad-down">${controlSvg(kind, true)}</span>`;
}

export class TouchButtons {
  readonly root: HTMLElement;
  private readonly back: HTMLElement;
  private readonly forward: HTMLElement;
  private readonly jump: HTMLElement;
  /** Shown once there is touch; then they stay for the visit. */
  private touchSeen: boolean;
  private playing = false;
  private directions = true;
  layout: ButtonLayout = buttonLayout(1, 1);
  /** Called when the buttons show, hide, or move (the hint bar sits between them). */
  onChange: () => void = () => {};

  constructor(parent: HTMLElement, coarse: boolean) {
    this.touchSeen = coarse;
    // Not real <button>s: the touch areas take the presses; these are what the thumb aims at.
    const make = (kind: ControlKind): HTMLElement => {
      const el = h('div', { class: `pad pad-${kind}`, role: 'button', 'aria-label': CONTROL_WORDS[kind] });
      el.innerHTML = padInner(kind);
      return el;
    };
    this.back = make('back');
    this.forward = make('forward');
    this.jump = make('jump');
    this.root = h('div', { class: 'pads', hidden: true }, this.back, this.forward, this.jump);
    parent.append(this.root);
  }

  /** The buttons are on screen (touch seen this visit, and in a run). */
  get shown(): boolean {
    return this.touchSeen && this.playing;
  }

  /** Which buttons are on screen now. */
  get which(): ButtonsShown {
    return !this.shown ? 'none' : this.directions ? 'all' : 'jump';
  }

  /** Touch exists on this phone (buttons show in a run). */
  get touch(): boolean {
    return this.touchSeen;
  }

  sawTouch(): void {
    if (this.touchSeen) return;
    this.touchSeen = true;
    this.sync();
  }

  /** In a run or not; and whether Back and Forward are used (not in the slice 1 boss fight). */
  show(playing: boolean, directions = true): void {
    this.playing = playing;
    this.directions = directions;
    this.sync();
  }

  place(cssW: number, cssH: number, safe: Insets): void {
    this.layout = buttonLayout(cssW, cssH, safe);
    const put = (el: HTMLElement, b: Box): void => {
      el.style.left = `${b.x}px`;
      el.style.top = `${b.y}px`;
      el.style.width = `${b.w}px`;
      el.style.height = `${b.h}px`;
    };
    put(this.back, this.layout.back);
    put(this.forward, this.layout.forward);
    put(this.jump, this.layout.jump);
    this.onChange();
  }

  /** Pressed look: by shape and size (it shrinks, the icon turns solid dark), not colour alone. */
  pressed(dir: -1 | 0 | 1, jump: boolean): void {
    this.back.classList.toggle('down', dir === -1);
    this.forward.classList.toggle('down', dir === 1);
    this.jump.classList.toggle('down', jump);
  }

  private sync(): void {
    this.root.hidden = !this.shown;
    this.back.hidden = !this.directions;
    this.forward.hidden = !this.directions;
    this.onChange();
  }
}

/** The Go down / Go up button's bottom sits this far above the crank top (or the room's bucket), CSS px. */
export const WELL_BUTTON_GAP = 8;
/** Kept this far inside the screen's sides, CSS px. */
const WELL_BUTTON_EDGE = 4;

/**
 * Where the Go down or Go up button goes (docs/design.md S2.2 Phone buttons, S2.5): a pill
 * max(56, D) tall and 2.2 D wide, its bottom 8 px above `anchor` (the crank top, or the room's
 * bucket), centred on it, kept inside the screen and below the top 56 px (the HUD row).
 * `anchor` is in CSS px.
 */
export function wellButtonBox(anchor: { x: number; y: number }, cssW: number, layout: ButtonLayout, safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): Box {
  const h = Math.max(MIN_D, layout.d);
  const w = Math.round(2.2 * layout.d);
  const lo = Math.max(WELL_BUTTON_EDGE, safe.left);
  const hi = cssW - Math.max(WELL_BUTTON_EDGE, safe.right) - w;
  const x = Math.min(Math.max(anchor.x - w / 2, lo), Math.max(lo, hi));
  const top = Math.max(WELL_TOP_BAR, safe.top);
  const y = Math.max(top, anchor.y - WELL_BUTTON_GAP - h);
  return { x: Math.round(x), y: Math.round(y), w, h };
}
/** The HUD row: the well button stays below it (same as the touch areas' top bar). */
const WELL_TOP_BAR = 56;

export type WellButtonKind = 'down' | 'up';

/** After a Go down or Go up press, clicks on other buttons are ignored this long, ms (qa L3). */
export const WELL_CLICK_GUARD_MS = 400;

/**
 * The well button acts on pointerdown and then hides, so the phone's follow-up click lands on
 * whatever is under it (on a narrow screen that was Pause). This remembers the press, so that
 * click, and any other within WELL_CLICK_GUARD_MS, is dropped. Times in ms.
 */
export class ClickGuard {
  private until = -Infinity;

  press(now: number): void {
    this.until = now + WELL_CLICK_GUARD_MS;
  }

  /** True when a click at `now` is the tail of a well press and must do nothing. */
  blocks(now: number): boolean {
    return now < this.until;
  }
}

/**
 * A HUD button that acts on the press itself (po L4 note 2): Chrome sends no click for a second
 * finger while a thumb holds Forward or Jump, so Pause and Sound act on pointerdown, as the
 * well button does. One press does one thing: the touch's own click (and any mouse click) is
 * dropped, and for WELL_CLICK_GUARD_MS after the press every other tap click is dropped too, so
 * the press that opens Pause never also presses what appears under the finger. A keyboard or
 * screen reader click (detail 0) still works.
 */
export function pressOnDown(el: HTMLElement, act: () => void, target: Window = window): ClickGuard {
  const guard = new ClickGuard();
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    guard.press(performance.now());
    act();
  });
  const noClick = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
  };
  el.addEventListener('touchstart', noClick, { passive: false });
  el.addEventListener('touchend', noClick, { passive: false });
  el.addEventListener('click', (e) => {
    if (e.detail === 0) act();
  });
  target.addEventListener(
    'click',
    (e) => {
      if (e.detail === 0 || !guard.blocks(performance.now())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  return guard;
}

/**
 * The Go down / Go up button (S2.5, S2.10 "Well button"): a real button, shown only while the
 * hero stands at an entrance well or under the room's rope. It takes its own taps (never a jump),
 * and Enter or Space on it while focused works too. Art's pill with a bucket and an arrow.
 */
export class WellButton {
  readonly el: HTMLButtonElement;
  private kind: WellButtonKind | null = null;
  private label = '';
  private placed = '';

  /** Drops the click that follows a press (it would land on what is under the hidden button). */
  readonly guard = new ClickGuard();

  constructor(parent: HTMLElement, onPress: (kind: WellButtonKind) => void, target: Window = window) {
    this.el = h('button', { type: 'button', class: 'well-btn', 'data-ui': true, hidden: true });
    const press = (): void => {
      if (this.kind) onPress(this.kind);
    };
    // A finger or mouse presses at once (no wait for the lift); the keyboard clicks it.
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.kind) return;
      this.guard.press(performance.now());
      press();
    });
    // No mouse events or click made from this touch: the button is gone by the lift.
    const noClick = (e: TouchEvent): void => {
      if (e.cancelable) e.preventDefault();
    };
    this.el.addEventListener('touchstart', noClick, { passive: false });
    this.el.addEventListener('touchend', noClick, { passive: false });
    this.el.addEventListener('click', (e) => {
      if (e.detail === 0) press();
    });
    // Before any button sees it: a tap's click right after a well press does nothing (a key's
    // click, detail 0, still works).
    target.addEventListener(
      'click',
      (e) => {
        if (e.detail === 0 || e.target === this.el || !this.guard.blocks(performance.now())) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true,
    );
    parent.append(this.el);
  }

  /** Which button shows now (null: none), its words, and its box (CSS px). Cheap every frame. */
  update(kind: WellButtonKind | null, label: string, box: Box | null): void {
    if (kind === null || box === null) {
      if (this.kind !== null) {
        this.kind = null;
        this.el.hidden = true;
      }
      return;
    }
    if (kind !== this.kind || label !== this.label) {
      this.kind = kind;
      this.label = label;
      this.el.setAttribute('aria-label', CONTROL_WORDS[kind]);
      this.el.innerHTML = `<span class="pad-up">${controlSvg(kind, false, label)}</span><span class="pad-down">${controlSvg(kind, true, label)}</span>`;
    }
    this.el.hidden = false;
    const at = `${box.x},${box.y},${box.w},${box.h}`;
    if (at !== this.placed) {
      this.placed = at;
      const s = this.el.style;
      s.left = `${box.x}px`;
      s.top = `${box.y}px`;
      s.width = `${box.w}px`;
      s.height = `${box.h}px`;
    }
  }

  /** The button on screen now: which and its words; null when hidden. */
  get shown(): { kind: WellButtonKind; label: string } | null {
    return this.kind ? { kind: this.kind, label: this.label } : null;
  }
}

/**
 * The Throw button (docs/design.md S2.15): a real button beside Jump, shown only while fufu
 * balls are held and the phone buttons show. It takes its own taps first (as Pause and Go down):
 * one press is one ball, holding does not repeat; a mouse click works too. Its box is the touch
 * area (the drawn circle plus 5 px all round). Spoken: "Throw fufu, 8 left".
 */
export class ThrowButton {
  readonly el: HTMLButtonElement;
  private count = -1;
  private placed = '';
  private visible = false;

  constructor(parent: HTMLElement, onPress: () => void) {
    this.el = h('button', { type: 'button', class: 'throw-btn', 'data-ui': true, hidden: true });
    this.el.innerHTML = `<span class="pad-up">${controlSvg('throw', false)}</span><span class="pad-down">${controlSvg('throw', true)}</span>`;
    pressOnDown(this.el, () => {
      this.el.classList.add('down');
      onPress();
    });
    const up = (): void => this.el.classList.remove('down');
    for (const t of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) this.el.addEventListener(t, up);
    // The pop-in plays once when the button appears. Left on, it would replay each time a press swaps the
    // up and down pictures (display none to block restarts a CSS animation; qa P11).
    this.el.addEventListener('animationend', () => this.el.classList.remove('pop'));
    parent.append(this.el);
  }

  /** Shown with n balls (n 0 hides it), at the layout's touch box. Cheap every frame. */
  update(show: boolean, n: number, box: Box): void {
    const on = show && n > 0;
    if (on !== this.visible) {
      this.visible = on;
      this.el.hidden = !on;
      // Pops in over 0.15 s when it appears (none with reduced motion: screens.css).
      if (on) {
        this.el.classList.remove('pop');
        void this.el.offsetWidth;
        this.el.classList.add('pop');
      } else this.el.classList.remove('down');
    }
    if (n !== this.count) {
      this.count = n;
      this.el.setAttribute('aria-label', throwLabel(n));
    }
    const at = `${box.x},${box.y},${box.w}`;
    if (at !== this.placed) {
      this.placed = at;
      const s = this.el.style;
      s.left = `${box.x}px`;
      s.top = `${box.y}px`;
      s.width = `${box.w}px`;
      s.height = `${box.h}px`;
    }
  }

  get shown(): boolean {
    return this.visible;
  }
}
