/**
 * K1b: the long bus ride north to Kano (docs/kano.md 1.3), in the lazy Kano part. Art K1a draws
 * it (./rideArt); this runs it, the same way as Ogun's ride (src/worlds/ogun/ride.ts), and like
 * every file in this folder imports no value from outside it (KN-R10: Kano works without the
 * Ogun part, and nothing here lands in the first load). The game passes the hero at the window
 * and the Skip button in (RideOptions.rider, skipButton).
 *
 * - About 5 s the first time, 2 s after (KANO_RIDE); each frame's step is capped at 0.1 s, so a
 *   hidden page or a slow phone never jumps it to the end.
 * - Tap, Enter or Space: jump to the end picture (the bus at the gate); again ends it.
 * - "Skip" (44 x 44, top right) or Escape: ends it at once.
 * - Reduced motion: the end picture only, still, for 1.5 s.
 * - Going back (Kano to Ogun or Lagos) is the same road the other way, with no welcome tune.
 */
import type { RideOptions, WorldUi } from '../ui';
import { KANO_RIDE, KANO_WELCOME_TUNE, drawKanoRide, kanoRideAt } from './rideArt';

/** The end picture stays this long after the ride (the board's words in view). */
export const KANO_HOLD_S = 1;
/** ...and this long when it is shown at once (a tap, or reduced motion). */
export const KANO_HOLD_JUMP_S = 1.5;
/** Taps this soon after the ride opens are the second half of the tap that opened it. */
const OPEN_GUARD_MS = 400;
/** The tune starts when the bus is this far along the road (it slows to a stop at the gate). */
const TUNE_AT = 0.85;

/** Where a ride is, from seconds since it began (pure, for the tests). */
export function rideClock(t: number, seconds: number, jumped: boolean, still: boolean): { p: number; over: boolean } {
  if (still || jumped) return { p: 1, over: t >= KANO_HOLD_JUMP_S };
  return { p: Math.min(1, t / seconds), over: t >= seconds + KANO_HOLD_S };
}

/** A plain Skip button, when the game passes none (tests). */
function plainSkip(word: string, onTap: (e: MouseEvent) => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'minor';
  b.textContent = word;
  b.addEventListener('click', onTap);
  return b;
}

export function busRide(o: RideOptions): { el: HTMLElement; close(): void } {
  const seconds = o.first ? KANO_RIDE.first : KANO_RIDE.again;
  const back = o.toLagos;
  const pic = document.createElement('canvas');
  pic.className = 'ride-pic';
  pic.setAttribute('role', 'img');
  pic.setAttribute('aria-label', o.spoken);
  let ended = false;
  let frame = 0;
  let last = 0;
  /** Seconds of ride shown (from the start, or from the jump to the end picture). */
  let t = 0;
  let jumped = false;
  let tuned = back;
  const opened = performance.now();
  const end = (): void => {
    if (ended) return;
    ended = true;
    stop();
    o.done();
  };
  const onSkip = (e: MouseEvent): void => {
    e.stopPropagation();
    end();
  };
  const skip = o.skipButton ? o.skipButton(onSkip) : plainSkip(o.skip, onSkip);
  skip.classList.add('ride-skip');
  const el = document.createElement('div');
  el.className = 'ride-screen';
  el.dataset['ride'] = back ? 'out' : 'in';
  el.dataset['state'] = 'kano';
  el.append(pic, skip);
  el.tabIndex = -1;
  const tune = (): void => {
    if (tuned) return;
    tuned = true;
    o.tune();
  };
  const jump = (): void => {
    if (ended) return;
    if (rideClock(t, seconds, jumped, o.still).p >= 1) end();
    else {
      jumped = true;
      t = 0;
      draw();
    }
  };
  el.addEventListener('click', (e) => {
    if (performance.now() - opened < OPEN_GUARD_MS || skip.contains(e.target as Node)) return;
    jump();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      end();
    } else if ((e.key === 'Enter' || e.key === ' ') && !skip.contains(e.target as Node)) {
      e.preventDefault();
      jump();
    }
  });

  const draw = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = pic.clientWidth || window.innerWidth;
    const hh = pic.clientHeight || window.innerHeight;
    if (pic.width !== Math.round(w * dpr) || pic.height !== Math.round(hh * dpr)) {
      pic.width = Math.round(w * dpr);
      pic.height = Math.round(hh * dpr);
    }
    const g = pic.getContext('2d');
    if (!g) return;
    const { p } = rideClock(t, seconds, jumped, o.still);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawKanoRide(g, w, hh, p, { back, lit: o.lit, still: o.still, time: jumped ? seconds + t : t, ...(o.rider ? { rider: o.rider } : {}) });
    if (p >= 1 || kanoRideAt(p) >= KANO_RIDE.end * TUNE_AT) tune();
  };
  const step = (now: number): void => {
    if (ended) return;
    t += Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    draw();
    if (rideClock(t, seconds, jumped, o.still).over) end();
    else frame = requestAnimationFrame(step);
  };
  const stop = (): void => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', draw);
  };
  window.addEventListener('resize', draw);
  last = performance.now();
  // First frame once the element is in the page (sizes known).
  frame = requestAnimationFrame((now) => {
    last = now;
    draw();
    el.focus({ preventScroll: true });
    frame = requestAnimationFrame(step);
  });
  return {
    el,
    close: () => {
      ended = true;
      stop();
    },
  };
}

export const ui: WorldUi = { busRide, tune: KANO_WELCOME_TUNE };
