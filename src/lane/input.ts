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

  /** Part 25.1: ◀ ▶ hide while tilt changes lane (▲ ▼ stay where they are). */
  sidesShown = true;
  sides(on: boolean): void {
    if (on === this.sidesShown) return;
    this.sidesShown = on;
    this.buttons.left.hidden = !on;
    this.buttons.right.hidden = !on;
  }

  remove(): void {
    this.el.remove();
  }
}

/*
 * S3f0 part 25 (decision 70): tilt to steer. Lowering the right side of the phone goes right,
 * like a steering wheel. One tilt makes one lane change; it only moves again once the phone has
 * come back near the held angle. Angles live in memory for this run only: never saved or sent.
 */
/** Move one lane when the steering angle is this far (degrees) past the centre. */
export const TILT_FIRE_DEG = 15;
/** The next tilt counts once the angle is back within this many degrees of the centre. */
export const TILT_REARM_DEG = 8;
/** Within this many degrees of the centre nothing happens, and the centre slowly follows the hand. */
export const TILT_DEAD_DEG = 5;
/** In the dead zone the centre moves this part of the way to the reading each second. */
export const TILT_FOLLOW_PER_S = 0.25;
/** The reading settles (95 percent) in this many seconds, so a shaky hand does not twitch. */
export const TILT_SMOOTH_S = 0.08;
/** A tilt held past TILT_FIRE_DEG this long becomes the new centre, with no move. */
export const TILT_RECENTRE_S = 2;
/** Angles past this from the centre count as this. */
export const TILT_MAX_DEG = 60;
/** No reading for this long during play: "Tilt is not working". */
export const TILT_LOST_S = 1;
/** The centre is the mean angle over the last this-many seconds of "3, 2, 1". */
export const TILT_CALIBRATE_S = 0.5;
/** After the phone flips round (90 to 270), readings are ignored this long. */
export const TILT_FLIP_S = 0.3;

/**
 * The steering angle from `beta` and the screen's turn (part 25.2): at 90 it is beta, at 270 it
 * is -beta (bigger is right either way). Upright (0 or 180) gives null: the sideways card shows.
 */
export function steerAngle(beta: number, screenAngle: number): number | null {
  const a = ((Math.round(screenAngle) % 360) + 360) % 360;
  if (a === 90) return beta;
  if (a === 270) return -beta;
  return null;
}

/**
 * Turns steering angles into lane moves (part 25.2). Pure, so the rules are unit tested: feed it
 * angles with their times through `read`; `count()` at each "3, 2, 1", `collect()` for its last
 * 0.5 s, `calibrate()` at "Go!", `pause()` when the run stops. Nothing is made per reading.
 */
export class TiltReader {
  /** The eased angle, or NaN before the first reading. */
  private smooth = Number.NaN;
  private lastT = 0;
  /** The held angle; NaN until calibrated (then the first reading in play sets it). */
  centre = Number.NaN;
  private armed = true;
  /** When the angle went past TILT_FIRE_DEG and stayed there (ms), or NaN. */
  private outSince = Number.NaN;
  private phase: 'off' | 'count' | 'play' = 'off';
  private collecting = false;
  private sum = 0;
  private n = 0;
  /** Readings before this time (ms) are ignored (after a flip). */
  private ignoreUntil = -Infinity;
  private side = 0;

  /** "3, 2, 1" begins: readings ease but make no move. */
  count(): void {
    this.phase = 'count';
    this.collecting = false;
    this.sum = 0;
    this.n = 0;
  }

  /** The last 0.5 s of the count: readings from now make the centre. */
  collect(): void {
    this.collecting = true;
  }

  /** "Go!": the centre is the mean of the collected readings (or the next reading, if none came). */
  calibrate(): void {
    this.centre = this.n > 0 ? this.sum / this.n : Number.NaN;
    this.armed = true;
    this.outSince = Number.NaN;
    this.phase = 'play';
  }

  /** Paused, a card, the background: everything is forgotten; the next start calibrates again. */
  pause(): void {
    this.phase = 'off';
    this.smooth = Number.NaN;
    this.centre = Number.NaN;
    this.collecting = false;
    this.sum = 0;
    this.n = 0;
    this.armed = true;
    this.outSince = Number.NaN;
  }

  /** The phone flipped round (90 to 270 or back): ignore 0.3 s, then take the centre afresh. No move. */
  flip(tMs: number): void {
    this.ignoreUntil = tMs + TILT_FLIP_S * 1000;
    this.smooth = Number.NaN;
    this.centre = Number.NaN;
    this.armed = true;
    this.outSince = Number.NaN;
  }

  /** How far past the centre the eased angle is now (clamped), 0 before a centre. */
  get offset(): number {
    const d = this.smooth - this.centre;
    return Number.isNaN(d) ? 0 : Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, d));
  }

  /** One steering angle (degrees) at time `tMs`: the lane move it makes, or null. */
  read(angleDeg: number, tMs: number): LaneMove | null {
    if (this.phase === 'off' || !Number.isFinite(angleDeg) || tMs < this.ignoreUntil) return null;
    const dt = Math.min(0.1, Math.max(0, (tMs - this.lastT) / 1000));
    this.lastT = tMs;
    // A simple low-pass that settles (95 percent) in TILT_SMOOTH_S.
    if (Number.isNaN(this.smooth)) this.smooth = angleDeg;
    else this.smooth += (angleDeg - this.smooth) * (1 - Math.exp((-3 * dt) / TILT_SMOOTH_S));
    if (this.phase === 'count') {
      if (this.collecting) {
        this.sum += this.smooth;
        this.n++;
      }
      return null;
    }
    if (Number.isNaN(this.centre)) {
      this.centre = this.smooth;
      return null;
    }
    const d = this.offset;
    const size = Math.abs(d);
    // A slow slump in the seat never steers: the centre follows the hand in the dead zone.
    if (size <= TILT_DEAD_DEG) this.centre += (this.smooth - this.centre) * Math.min(1, TILT_FOLLOW_PER_S * dt);
    if (this.armed) {
      if (size < TILT_FIRE_DEG) return null;
      this.armed = false;
      this.outSince = tMs;
      this.side = Math.sign(d);
      return d > 0 ? 'right' : 'left';
    }
    if (size <= TILT_REARM_DEG) {
      this.armed = true;
      this.outSince = Number.NaN;
    } else if (size >= TILT_FIRE_DEG && Math.sign(d) === this.side) {
      if (Number.isNaN(this.outSince)) this.outSince = tMs;
      else if (tMs - this.outSince >= TILT_RECENTRE_S * 1000) {
        // The player has changed how they sit: that angle is the new centre, with no move.
        this.centre = this.smooth;
        this.armed = true;
        this.outSince = Number.NaN;
      }
    } else this.outSince = Number.NaN;
    return null;
  }
}
