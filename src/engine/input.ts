/**
 * Controls (docs/design.md S2.2: Phone buttons, Fingers, Keys). Back and forward under the
 * left thumb, jump under the right; arrows or A/D and Space/Up/W on a computer.
 *
 * `Controls` is the rules with no DOM, so every finger and key rule is unit tested.
 * `attachControls` feeds it real pointer and key events.
 */

export type Dir = -1 | 0 | 1;
/** Who pressed jump: a finger (pointer id) or a key code. */
export type Source = number | string;
export type InputKind = 'touch' | 'keys';

/** Where the touch areas are, in CSS px (from the button layout). */
export interface TouchAreas {
  width: number;
  height: number;
  /** Midpoint between the Back and Forward button centres. */
  midX: number;
  /** The buttons are shown. Without them, any press anywhere is a jump (slice 1 way). */
  buttons: boolean;
}

export interface ControlHandlers {
  /** at: where a finger or mouse pressed (CSS px); null for a key. */
  onJumpPress(by: Source, at: { x: number; y: number } | null): void;
  onJumpRelease(by: Source): void;
  /** The direction held changed. */
  onMove(dir: Dir): void;
  /**
   * A well key went down (S2.2 Keys: Down, S, Enter, E). The game decides what it does: at a
   * well Down, S, Enter and E go down; under the room's rope only Enter and E go up.
   */
  onWellKey?(code: string): void;
  /** S2.15: X throws a fufu ball (one press, one ball; key repeat is ignored). */
  onThrow?(): void;
  /**
   * S2.16 B4: a double tap of a direction, still held (tap it, lift, press it again within
   * 0.25 s). The game decides whether a dash starts.
   */
  onDash?(dir: -1 | 1): void;
}

/** S2.16 B4: the first tap of a double tap is this short or shorter, and the second press comes this soon after it, ms. */
export const DOUBLE_TAP_MS = 250;

/** The left share of the screen that is the direction area; the rest is the jump area. */
export const DIR_SHARE = 0.45;
/** Touches in the top strip (HUD) are neither. */
export const TOP_BAR = 56;

const FORWARD_KEYS = new Set(['ArrowRight', 'KeyD']);
const BACK_KEYS = new Set(['ArrowLeft', 'KeyA']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
/** S2.2 Keys: at a well, go down; under the room's rope, Enter and E go up. */
export const WELL_KEYS: ReadonlySet<string> = new Set(['ArrowDown', 'KeyS', 'Enter', 'KeyE']);
/** The well keys that also go up the room's rope (Down and S do nothing there). */
export const WELL_UP_KEYS: ReadonlySet<string> = new Set(['Enter', 'KeyE']);

/** S2.15 Keys: X throws a fufu ball. */
export const THROW_KEYS: ReadonlySet<string> = new Set(['KeyX']);

/** S2.2 Keys: P and Escape pause (M, music, comes with O2). */
export const PAUSE_KEYS: ReadonlySet<string> = new Set(['KeyP', 'Escape']);

/**
 * What a P or Escape press does (po M4 bug 3): pause while playing (the street, the well room,
 * the hall fight), resume from the Pause screen, and nothing anywhere else (the street end, the
 * hall's finish, any other card). Key repeat does nothing.
 */
export function pauseKeyAction(code: string, repeat: boolean, screen: string | null, playing: boolean): 'pause' | 'resume' | null {
  if (repeat || !PAUSE_KEYS.has(code)) return null;
  if (screen === 'pause') return 'resume';
  if (screen === null && playing) return 'pause';
  return null;
}

interface Finger {
  area: 'dir' | 'jump' | 'none';
  x: number;
  /** Which side of the direction buttons it went down on, and when (ms). */
  downDir: Dir;
  downAt: number;
  /** Let go by a rule (slid off, pause, focus lost): does nothing until lifted. */
  dead: boolean;
  /** Press order: the newest direction wins. */
  order: number;
}

export class Controls {
  private readonly fingers = new Map<number, Finger>();
  /** Direction keys held: code -> press order. */
  private readonly dirKeys = new Map<string, { dir: Dir; order: number }>();
  /** Jump keys held. */
  private readonly jumpKeys = new Set<string>();
  /** Keys held through a let-go: ignored until lifted. */
  private readonly deadKeys = new Set<string>();
  private order = 0;
  private current: Dir = 0;
  /** The last thing used: picks the words in hints. */
  lastKind: InputKind;
  /** Direction keys down: when each went down (ms), for the double tap. */
  private readonly keyDownAt = new Map<string, number>();
  /** The last short tap of a direction (finger or key) and when it was lifted (ms). */
  private lastTap: { dir: Dir; at: number } | null = null;

  constructor(
    private readonly handlers: ControlHandlers,
    private readonly areas: () => TouchAreas,
    firstKind: InputKind = 'touch',
    private readonly now: () => number = () => performance.now(),
  ) {
    this.lastKind = firstKind;
  }

  /** A short tap of `dir` was lifted now. */
  private tapped(dir: Dir, downAt: number): void {
    const t = this.now();
    this.lastTap = dir !== 0 && t - downAt <= DOUBLE_TAP_MS ? { dir, at: t } : null;
  }

  /** A new press of `dir`: the second half of a double tap? */
  private pressed(dir: Dir): void {
    const last = this.lastTap;
    this.lastTap = null;
    if (dir === 0 || !last || last.dir !== dir || this.now() - last.at > DOUBLE_TAP_MS) return;
    this.handlers.onDash?.(dir);
  }

  /** The direction held now. */
  get dir(): Dir {
    return this.current;
  }

  /** How many live jump presses are held (fingers and keys). */
  get jumpHeld(): number {
    let n = this.jumpKeys.size;
    for (const f of this.fingers.values()) if (f.area === 'jump' && !f.dead) n++;
    return n;
  }

  /** Live fingers by area, for tests. */
  get fingerCount(): { dir: number; jump: number } {
    let dir = 0;
    let jump = 0;
    for (const f of this.fingers.values()) {
      if (f.dead) continue;
      if (f.area === 'dir') dir++;
      else if (f.area === 'jump') jump++;
    }
    return { dir, jump };
  }

  pointerDown(id: number, x: number, y: number, touch: boolean): void {
    if (touch) this.lastKind = 'touch';
    const a = this.areas();
    let area: Finger['area'];
    if (!a.buttons) area = 'jump'; // no buttons on screen: a press anywhere jumps
    else if (y < TOP_BAR) area = 'none';
    else area = x < a.width * DIR_SHARE ? 'dir' : 'jump';
    const downDir: Dir = area === 'dir' ? (x < a.midX ? -1 : 1) : 0;
    this.fingers.set(id, { area, x, downDir, downAt: this.now(), dead: false, order: ++this.order });
    if (area === 'jump') this.handlers.onJumpPress(id, { x, y });
    else if (area === 'dir') {
      this.resolve();
      this.pressed(downDir);
    }
  }

  pointerMove(id: number, x: number, y: number): void {
    const f = this.fingers.get(id);
    if (!f || f.dead) return;
    const a = this.areas();
    if (x < 0 || y < 0 || x > a.width || y > a.height) {
      this.releaseAll(); // slid off the screen edge
      return;
    }
    f.x = x;
    if (f.area !== 'dir') return;
    // Sliding into the jump area lets go of the direction; sliding up keeps it.
    if (x >= a.width * DIR_SHARE) {
      f.dead = true;
    }
    this.resolve(); // rocking across the midpoint turns round
  }

  pointerUp(id: number): void {
    const f = this.fingers.get(id);
    if (!f) return;
    this.fingers.delete(id);
    if (f.dead) return;
    if (f.area === 'jump') this.handlers.onJumpRelease(id);
    else if (f.area === 'dir') {
      // A tap counts only if it stayed on the side it went down on (rocking does not count).
      const upDir: Dir = f.x < this.areas().midX ? -1 : 1;
      this.tapped(upDir === f.downDir ? f.downDir : 0, f.downAt);
      this.resolve();
    }
  }

  /** Returns true when the key is a game key (so the page should not scroll or click). */
  keyDown(code: string, repeat: boolean): boolean {
    if (THROW_KEYS.has(code)) {
      this.lastKind = 'keys';
      if (!repeat) this.handlers.onThrow?.();
      return true;
    }
    if (WELL_KEYS.has(code)) {
      this.lastKind = 'keys';
      if (!repeat) this.handlers.onWellKey?.(code); // key repeat is ignored
      return true;
    }
    const dir: Dir = FORWARD_KEYS.has(code) ? 1 : BACK_KEYS.has(code) ? -1 : 0;
    const jump = JUMP_KEYS.has(code);
    if (!dir && !jump) return false;
    this.lastKind = 'keys';
    if (repeat || this.deadKeys.has(code)) return true; // key repeat is ignored
    if (dir) {
      if (!this.dirKeys.has(code)) {
        this.dirKeys.set(code, { dir, order: ++this.order });
        this.keyDownAt.set(code, this.now());
        this.resolve();
        this.pressed(dir);
      } else this.resolve();
    } else if (!this.jumpKeys.has(code)) {
      this.jumpKeys.add(code);
      this.handlers.onJumpPress(code, null);
    }
    return true;
  }

  keyUp(code: string): void {
    if (this.deadKeys.delete(code)) return;
    const k = this.dirKeys.get(code);
    if (k && this.dirKeys.delete(code)) {
      this.tapped(k.dir, this.keyDownAt.get(code) ?? -Infinity);
      this.resolve();
    }
    else if (this.jumpKeys.delete(code)) this.handlers.onJumpRelease(code);
  }

  /**
   * Let go of everything at once: pause, focus lost, tab hidden, phone upright, a screen
   * opened, a finger cancelled. Fingers and keys still down do nothing until lifted.
   */
  releaseAll(): void {
    for (const [id, f] of this.fingers) {
      if (f.dead) continue;
      f.dead = true;
      if (f.area === 'jump') this.handlers.onJumpRelease(id);
    }
    for (const code of this.jumpKeys) {
      this.deadKeys.add(code);
      this.handlers.onJumpRelease(code);
    }
    this.jumpKeys.clear();
    for (const code of this.dirKeys.keys()) this.deadKeys.add(code);
    this.dirKeys.clear();
    this.lastTap = null;
    this.resolve();
  }

  /** The newest live direction (finger or key) wins; a finger's way follows its place. */
  private resolve(): void {
    const midX = this.areas().midX;
    let best: { dir: Dir; order: number } | null = null;
    for (const f of this.fingers.values()) {
      if (f.area !== 'dir' || f.dead) continue;
      if (!best || f.order > best.order) best = { dir: f.x < midX ? -1 : 1, order: f.order };
    }
    for (const k of this.dirKeys.values()) if (!best || k.order > best.order) best = k;
    const dir = best ? best.dir : 0;
    if (dir !== this.current) {
      this.current = dir;
      this.handlers.onMove(dir);
    }
  }
}

/** Real controls (Pause, Sound, menu buttons) handle their own taps and keys. */
const UI = 'button, a, input, select, textarea, [data-ui]';

export function attachControls(target: Window, controls: Controls, onTouchSeen: () => void = () => {}): () => void {
  const onUi = (t: EventTarget | null): boolean => t instanceof Element && t.closest(UI) !== null;
  const onPointerDown = (e: PointerEvent): void => {
    if (onUi(e.target)) return;
    e.preventDefault();
    if (e.pointerType === 'touch') onTouchSeen();
    controls.pointerDown(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch' || e.pointerType === 'pen');
  };
  const onPointerMove = (e: PointerEvent): void => controls.pointerMove(e.pointerId, e.clientX, e.clientY);
  const onPointerUp = (e: PointerEvent): void => controls.pointerUp(e.pointerId);
  const onCancel = (): void => controls.releaseAll();
  const onKeyDown = (e: KeyboardEvent): void => {
    // Space on a focused menu button presses that button, not a jump.
    if (onUi(e.target)) return;
    if (controls.keyDown(e.code, e.repeat)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent): void => controls.keyUp(e.code);
  // A blocked context menu stops long-press menus on phones.
  const onContext = (e: Event): void => e.preventDefault();

  target.addEventListener('pointerdown', onPointerDown, { passive: false });
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onCancel);
  target.addEventListener('blur', onCancel);
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('contextmenu', onContext);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onCancel);
    target.removeEventListener('blur', onCancel);
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('contextmenu', onContext);
  };
}
