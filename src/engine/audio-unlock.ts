/**
 * Getting WebAudio to start, and to come back, on every phone (iOS Safari most of all).
 *
 * - iOS Safari only lets a "user gesture" start or resume an AudioContext, and a finger going
 *   down (touchstart, pointerdown) is not one there: touchend, pointerup, click and keydown are.
 *   So we listen to all of them, down and up, and try on each.
 * - Older iOS also wants a sound started inside that gesture, so the first unlock plays one
 *   silent sample.
 * - After an app switch, a call or the screen locking, iOS leaves the context 'interrupted'
 *   (or 'suspended'). We try to resume when the page shows again, and the listeners stay on
 *   for good, so the next tap wakes it if that did not.
 * - The silent switch on an iPhone mutes WebAudio. That is the player's choice; we leave it be.
 */

/** Window events whose handlers may start audio. Down and up both: iOS counts only the up ones. */
export const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'] as const;

type Ctor = typeof AudioContext;

/** The browser's AudioContext, or null where there is none (old browsers, tests). */
export function audioCtor(): Ctor | null {
  const w = (globalThis as unknown as { window?: { AudioContext?: Ctor; webkitAudioContext?: Ctor } }).window;
  return w?.AudioContext ?? w?.webkitAudioContext ?? null;
}

/** Plays one silent sample, the old iOS key that opens audio for the page. Never throws. */
export function playSilence(ac: AudioContext): void {
  try {
    const src = ac.createBufferSource();
    src.buffer = ac.createBuffer(1, 1, ac.sampleRate || 22050);
    src.connect(ac.destination);
    src.start(0);
  } catch {
    /* only a help, never needed */
  }
}

/** Asks a stopped context ('suspended', or 'interrupted' on iOS) to run again. Never throws. */
export function wake(ac: AudioContext): void {
  try {
    if (ac.state !== 'running' && ac.state !== 'closed') void ac.resume().catch(() => {});
  } catch {
    /* fine: the next tap tries again */
  }
}

interface Listenable {
  addEventListener(type: string, fn: () => void, opts?: AddEventListenerOptions | boolean): void;
}

/**
 * Calls unlock on every gesture, for as long as the page lives, and wakeOnShow when the page
 * shows again (tab back, app switched back, screen unlocked). Capture and passive: it runs
 * before any game handler and never blocks scrolling or stops a tap.
 */
export function listenForAudioGestures(win: Listenable, doc: Listenable & { hidden?: boolean }, unlock: () => void, wakeOnShow: () => void): void {
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  for (const type of GESTURE_EVENTS) win.addEventListener(type, unlock, opts);
  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden) wakeOnShow();
  });
  win.addEventListener('pageshow', wakeOnShow);
  win.addEventListener('focus', wakeOnShow);
}
