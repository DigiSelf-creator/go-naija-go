/**
 * Lane run controls (docs/design.md S3f0 part 3): swipes (24 px in one direction within 0.3 s,
 * firing at that moment, one per finger), keys (no repeat), and the "Buttons instead of swipes"
 * buttons, 56 x 56 px, 8 px apart, 8 px inside the safe edges, firing on touch down.
 */
import type { LaneMove } from './sim';

export const SWIPE_PX = 24;
export const SWIPE_MS = 300;
export const BUTTON_PX = 56;
export const BUTTON_GAP = 8;

/** Reads swipes from one finger at a time. Pure, so the rules can be unit tested. */
export class SwipeReader {
  private id = -1;
  private x0 = 0;
  private y0 = 0;
  private t0 = 0;
  private fired = false;

  down(id: number, x: number, y: number, t: number): void {
    if (this.id !== -1) return;
    this.id = id;
    this.x0 = x;
    this.y0 = y;
    this.t0 = t;
    this.fired = false;
  }

  /** The move a swipe makes, at the moment it counts; null otherwise. */
  move(id: number, x: number, y: number, t: number): LaneMove | null {
    if (id !== this.id || this.fired) return null;
    // A slow drag does not count: measure from where the finger was at most 0.3 s ago.
    if (t - this.t0 > SWIPE_MS) {
      this.x0 = x;
      this.y0 = y;
      this.t0 = t;
      return null;
    }
    const dx = x - this.x0;
    const dy = y - this.y0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return null;
    // One swipe, one move: the finger must lift before the next one counts.
    this.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'jump' : 'slide';
  }

  up(id: number): void {
    if (id === this.id) this.id = -1;
  }

  cancel(): void {
    this.id = -1;
  }
}

/** Keys: arrows, WASD and Space. Holding a key does not repeat. */
export function keyMove(code: string, repeat: boolean): LaneMove | null {
  if (repeat) return null;
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return 'left';
    case 'ArrowRight':
    case 'KeyD':
      return 'right';
    case 'ArrowUp':
    case 'KeyW':
    case 'Space':
      return 'jump';
    case 'ArrowDown':
    case 'KeyS':
      return 'slide';
    default:
      return null;
  }
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Part 3 and 15: ◀ ▶ bottom left, ▲ ▼ bottom right (swapped when "Swap sides" comes). */
export function buttonBoxes(w: number, h: number, safe: { left: number; right: number; bottom: number }, swap = false): Record<LaneMove, Box> {
  const y = h - Math.max(safe.bottom, 0) - BUTTON_GAP - BUTTON_PX;
  const left = Math.max(safe.left, 0) + BUTTON_GAP;
  const right = w - Math.max(safe.right, 0) - BUTTON_GAP - BUTTON_PX;
  const pair = (x0: number): [Box, Box] => [
    { x: x0, y, w: BUTTON_PX, h: BUTTON_PX },
    { x: x0 + BUTTON_PX + BUTTON_GAP, y, w: BUTTON_PX, h: BUTTON_PX },
  ];
  const lr = pair(swap ? right - BUTTON_PX - BUTTON_GAP : left);
  const ud = pair(swap ? left : right - BUTTON_PX - BUTTON_GAP);
  return { left: lr[0], right: lr[1], jump: ud[0], slide: ud[1] };
}

const ARROWS: Record<LaneMove, string> = {
  left: 'M 34 16 L 18 28 L 34 40 Z',
  right: 'M 22 16 L 38 28 L 22 40 Z',
  jump: 'M 16 34 L 28 18 L 40 34 Z',
  slide: 'M 16 22 L 28 38 L 40 22 Z',
};

/** The four on-screen buttons. Each fires once on touch down; holding does not repeat. */
export class LaneButtons {
  readonly el: HTMLDivElement;
  private readonly buttons: Record<LaneMove, HTMLButtonElement>;
  shown = false;

  constructor(parent: HTMLElement, names: Record<LaneMove, string>, onPress: (m: LaneMove) => void) {
    this.el = document.createElement('div');
    this.el.className = 'lane-buttons';
    this.el.hidden = true;
    const make = (m: LaneMove): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lane-button';
      b.setAttribute('aria-label', names[m]);
      b.dataset['move'] = m;
      b.innerHTML = `<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><path d="${ARROWS[m]}"/></svg>`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress(m);
      });
      // Keys and screen readers: a click with no pointer down before it (Enter, Space, a reader's tap).
      b.addEventListener('click', (e) => {
        if (e.detail === 0) onPress(m);
      });
      this.el.append(b);
      return b;
    };
    this.buttons = { left: make('left'), right: make('right'), jump: make('jump'), slide: make('slide') };
    parent.append(this.el);
  }

  place(boxes: Record<LaneMove, Box>): void {
    for (const m of Object.keys(boxes) as LaneMove[]) {
      const b = this.buttons[m];
      const r = boxes[m];
      b.style.left = `${r.x}px`;
      b.style.top = `${r.y}px`;
    }
  }

  show(on: boolean): void {
    this.shown = on;
    this.el.hidden = !on;
  }

  remove(): void {
    this.el.remove();
  }
}
