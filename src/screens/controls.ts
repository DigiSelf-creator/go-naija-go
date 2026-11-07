/**
 * The phone buttons (docs/design.md S2.2, Phone buttons): Back and Forward under the left thumb,
 * Jump under the right, all in the bottom strip. Placeholder drawings (see-through circles and a
 * pill, plain CSS); art draws the real ones in H5. The buttons only show; the touch areas
 * (src/engine/input.ts) are much bigger than the drawings.
 */
import type { Insets } from '../engine/view';
import { WORLD_H } from '../engine/view';
import { h } from './dom';

/** The bottom strip is this much of the 420 u view: road front (300 to 360) and pavement (360 to 420). */
const STRIP_U = 120;

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
  /** Midpoint between the Back and Forward centres: left of it is Back. */
  midX: number;
}

/** Sizes and places for a screen (CSS px), per the S2.2 table. */
export function buttonLayout(cssW: number, cssH: number, safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): ButtonLayout {
  const strip = (cssH * STRIP_U) / WORLD_H;
  const bottom = Math.max(8, safe.bottom);
  const d = Math.floor(Math.min(80, Math.max(56, strip - bottom - 4)));
  const left = Math.max(12, safe.left);
  const right = Math.max(12, safe.right);
  const y = cssH - bottom - d;
  const back = { x: left, y, w: d, h: d };
  const forward = { x: left + d + 10, y, w: d, h: d };
  const jw = Math.round(1.5 * d);
  const jump = { x: cssW - right - jw, y, w: jw, h: d };
  return { d, strip, back, forward, jump, midX: left + d + 5 };
}

const ARROW_L = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5 L7 12 L16 19 Z"/></svg>`;
const ARROW_R = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 L17 12 L8 19 Z"/></svg>`;
const CHEVRON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15 L12 8 L19 15" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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

  constructor(parent: HTMLElement, coarse: boolean) {
    this.touchSeen = coarse;
    // Not real <button>s: the touch areas take the presses; these are what the thumb aims at.
    const make = (cls: string, label: string, inner: string): HTMLElement => {
      const el = h('div', { class: `pad ${cls}`, role: 'button', 'aria-label': label });
      el.innerHTML = inner;
      return el;
    };
    this.back = make('pad-back', 'Back', ARROW_L);
    this.forward = make('pad-forward', 'Forward', ARROW_R);
    this.jump = make('pad-jump', 'Jump', `${CHEVRON}<span>Jump</span>`);
    this.root = h('div', { class: 'pads', hidden: true }, this.back, this.forward, this.jump);
    parent.append(this.root);
  }

  /** The buttons are on screen (touch seen this visit, and in a run). */
  get shown(): boolean {
    return this.touchSeen && this.playing;
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
  }
}
