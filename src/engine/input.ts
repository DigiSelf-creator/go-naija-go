/**
 * One-button input. A tap anywhere (or Space / up arrow on a computer) is a "press";
 * lifting the finger or key is a "release". Holding = time between the two.
 */
export interface InputHandlers {
  /** at: where a finger or mouse pressed (CSS px); null for a key. */
  onPress(at: { x: number; y: number } | null): void;
  onRelease(): void;
}

const JUMP_KEYS = new Set(['Space', 'ArrowUp']);
/** Real controls handle their own taps and keys. */
const UI = 'button, a, input, select, textarea, [data-ui]';

export function attachInput(target: Window, handlers: InputHandlers): () => void {
  let down = false;
  const press = (at: { x: number; y: number } | null): void => {
    if (down) return;
    down = true;
    handlers.onPress(at);
  };
  const onUi = (t: EventTarget | null): boolean => t instanceof Element && t.closest(UI) !== null;
  const release = (): void => {
    if (!down) return;
    down = false;
    handlers.onRelease();
  };

  const onPointerDown = (e: PointerEvent): void => {
    // Real buttons (pause, sound) handle their own taps.
    if (onUi(e.target)) return;
    e.preventDefault();
    press({ x: e.clientX, y: e.clientY });
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    // Space on a focused menu button presses that button, not a jump.
    if (!JUMP_KEYS.has(e.code) || onUi(e.target)) return;
    e.preventDefault();
    if (!e.repeat) press(null);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (JUMP_KEYS.has(e.code)) release();
  };
  // A blocked context menu stops long-press menus on phones.
  const onContext = (e: Event): void => e.preventDefault();

  target.addEventListener('pointerdown', onPointerDown, { passive: false });
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);
  target.addEventListener('blur', release);
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('contextmenu', onContext);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointerup', release);
    target.removeEventListener('pointercancel', release);
    target.removeEventListener('blur', release);
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('contextmenu', onContext);
  };
}
