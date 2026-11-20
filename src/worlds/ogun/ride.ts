/**
 * O1b2: the bus ride through the gateway (docs/ogun.md 1.3) and the still picture behind Ogun's
 * place screen. Lives in the Ogun part with art O1a's arch and ride (src/art/ogunGate.ts), so none
 * of it is in the first load.
 *
 * The ride is a short picture, not play: it runs on the screen's own frames, with each frame's
 * step capped at 0.1 s so a hidden page or a slow phone never jumps it to the end.
 * - Tap, Enter or Space: jump to the end picture (the bus under the arch); again ends it.
 * - "Skip" (44 x 44, top right) or Escape: ends it at once.
 * - Reduced motion: the end picture only, still, for 1.5 s.
 * - The welcome tune starts as the bus reaches the arch (or with the end picture).
 */
import { BUS_RIDE, busRideAt, drawBusRide, GATEWAY_TUNE } from '../../art/ogunGate';
import { button, h } from '../../screens/dom';
import type { RideOptions, WorldUi } from '../ui';

/** The end picture stays this long after the ride (the arch's words in view, 1.3). */
export const RIDE_HOLD_S = 1;
/** ...and this long when it is shown at once (a tap, Skip to the end, or reduced motion). */
export const RIDE_HOLD_JUMP_S = 1.5;
/** Taps this soon after the ride opens are the second half of the tap that opened it. */
const OPEN_GUARD_MS = 400;
/** The tune starts when the bus is this far along (it slows to a stop under the arch). */
const TUNE_AT = 0.85;

/** Where a ride is, from seconds since it began (pure, for the tests). */
export function rideAt(t: number, seconds: number, jumped: boolean, still: boolean): { p: number; over: boolean } {
  if (still || jumped) return { p: 1, over: t >= RIDE_HOLD_JUMP_S };
  const p = Math.min(1, t / seconds);
  return { p, over: t >= seconds + RIDE_HOLD_S };
}

export function busRide(o: RideOptions): { el: HTMLElement; close(): void } {
  const seconds = o.first ? BUS_RIDE.first : BUS_RIDE.again;
  const pic = h('canvas', { class: 'ride-pic', role: 'img', 'aria-label': o.spoken });
  let ended = false;
  let frame = 0;
  let last = 0;
  /** Seconds of ride shown (from the start, or from the jump to the end picture). */
  let t = 0;
  let jumped = false;
  let tuned = false;
  const opened = performance.now();
  const end = (): void => {
    if (ended) return;
    ended = true;
    stop();
    o.done();
  };
  const skip = button(o.skip, 'minor ride-skip', (e) => {
    e.stopPropagation();
    end();
  }, {}, 'skip');
  const el = h('div', { class: 'ride-screen', 'data-ride': o.toLagos ? 'out' : 'in' }, pic, skip);
  const tune = (): void => {
    if (tuned) return;
    tuned = true;
    o.tune();
  };
  const jump = (): void => {
    if (ended) return;
    if (rideAt(t, seconds, jumped, o.still).p >= 1) end();
    else {
      jumped = true;
      t = 0;
      draw();
    }
  };
  el.addEventListener('click', (e) => {
    if (performance.now() - opened < OPEN_GUARD_MS) return;
    if (e.target === skip) return;
    jump();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      end();
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target !== skip) {
      e.preventDefault();
      jump();
    }
  });
  el.tabIndex = -1;

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
    const { p } = rideAt(t, seconds, jumped, o.still);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBusRide(g, w, hh, p, { look: o.look, toLagos: o.toLagos, lit: o.lit, still: o.still, time: jumped ? seconds + t : t });
    if (p >= 1 || busRideAt(p) >= BUS_RIDE.archX * TUNE_AT) tune();
  };
  const step = (now: number): void => {
    if (ended) return;
    t += Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    draw();
    if (rideAt(t, seconds, jumped, o.still).over) end();
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

export const ui: WorldUi = { busRide, tune: GATEWAY_TUNE };
