/**
 * One-button input. A tap anywhere (or Space / up arrow on a computer) is a "press";
 * lifting the finger or key is a "release". Holding = time between the two.
 */
export interface InputHandlers {
  onPress(): void;
  onRelease(): void;
}

const JUMP_KEYS = new Set(['Space', 'ArrowUp']);

export function attachInput(target: Window, handlers: InputHandlers): () => void {
  let down = false;
  const press = (): void => {
    if (down) return;
    down = true;
    handlers.onPress();
  };
  const release = (): void => {
    if (!down) return;
    down = false;
    handlers.onRelease();
  };

  const onPointerDown = (e: PointerEvent): void => {
    // Real buttons (pause, sound) handle their own taps.
    if (e.target instanceof Element && e.target.closest('button, a, input, select, [data-ui]')) return;
    e.preventDefault();
    press();
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!JUMP_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat) press();
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
