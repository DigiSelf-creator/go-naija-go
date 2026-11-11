/**
 * Looking around Lagos from above (docs/city.md part 5 (b) "Size", "Look around"), with no DOM.
 *
 * The map is CITY_MAP (1600 x 1000 map units). Two zoom steps: far (the whole area's height fits
 * the screen) and near (2 times as big); it starts at far. The camera is the screen place (CSS px)
 * of the map's top left corner. A map smaller than the screen sits in the middle; a bigger one
 * never leaves the screen by more than EDGE px.
 */
import { CITY_BLOCKS, CITY_MAP, CITY_SPOTS, PIN, pinHitBox, SPOT_WORDS, type CityBlock } from '../art/city';

export type Zoom = 'far' | 'near';

/** How far past its edge the map may be dragged (CSS px). */
export const EDGE = 40;
/** Near is this many times as big as far. */
export const NEAR_TIMES = 2;
/** Keys: arrows move the map this far a press (CSS px). */
export const KEY_STEP = 120;
/** Pinch: fingers this much further apart snap to near, this much closer snap to far. */
export const PINCH_IN = 1.2;
export const PINCH_OUT = 1 / 1.2;

export interface CityView {
  /** The screen area (CSS px). */
  w: number;
  h: number;
  /**
   * How much of the screen's top is covered by the top row (heading, counter chips, buttons), in
   * CSS px from the top. Pins on the first look sit fully below it, and the map is kept in the
   * space under it (qa round 2, F1 + F2: the chips hid the Potholes and Slow internet signs).
   */
  top?: number;
}

/** The covered space at the top, kept to at most half the screen (0 when there is none). */
export function coveredTop(v: CityView): number {
  const t = v.top ?? 0;
  return Number.isFinite(t) ? Math.min(Math.max(0, t), v.h / 2) : 0;
}

export interface CityCam {
  zoom: Zoom;
  /** Screen place of the map's top left corner (CSS px). */
  x: number;
  y: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pins stay at least this far inside the screen's sides on the first look (CSS px). */
export const PIN_MARGIN = 8;

/** The pins' map y range (their feet). */
function pinRows(): { lo: number; hi: number } {
  const ys = Object.values(CITY_SPOTS).map((s) => s.pin.y);
  return { lo: Math.min(...ys), hi: Math.max(...ys) };
}

/** A pin's tap area reaches this far above its foot and this far below it (CSS px). */
function pinReach(): { up: number; down: number } {
  const b = pinTapBox(0, 0, '');
  return { up: -b.y, down: b.y + b.h };
}

/** The pins' map x range and the half widths of their tap areas (word tags) at each end (CSS px). */
function pinSpan(): { lo: number; hi: number; padLo: number; padHi: number } {
  const spots = Object.values(CITY_SPOTS).sort((a, b) => a.pin.x - b.pin.x);
  const first = spots[0]!;
  const last = spots[spots.length - 1]!;
  const half = (id: keyof typeof SPOT_WORDS): number => pinTapBox(0, 0, SPOT_WORDS[id]).w / 2;
  return { lo: first.pin.x, hi: last.pin.x, padLo: half(first.id), padHi: half(last.id) };
}

/**
 * CSS px per map unit at a zoom step. Far: the map's height fits the screen; on a narrow screen
 * (320 x 240, a phone held upright) it goes further out, so all three pins with their words fit
 * across the first look even when the map sits in the middle (qa F2). On a short screen it also
 * goes out far enough that all three pins fit up and down in the space under the top row (qa
 * round 2). It never goes below MIN_SCALE. Near is 2 times far.
 */
export function camScale(zoom: Zoom, v: CityView): number {
  const p = pinSpan();
  const mid = CITY_MAP.w / 2;
  const half = v.w / 2;
  const fits = Math.min(
    (v.w - p.padLo - p.padHi - 2 * PIN_MARGIN) / (p.hi - p.lo),
    (half - p.padLo - PIN_MARGIN) / (mid - p.lo),
    (half - p.padHi - PIN_MARGIN) / (p.hi - mid),
  );
  const r = pinRows();
  const reach = pinReach();
  const tall = (v.h - coveredTop(v) - reach.up - reach.down - 2 * PIN_MARGIN) / (r.hi - r.lo);
  // Never so far out that one pin's tap area lies over another's (a very short screen, 640 x 200:
  // the Lights out pin covered the Potholes pin). Apart wins over `tall`: on such a screen a sign
  // may then start partly under the chips, which ignore taps, but every pin can still be tapped.
  const far = Math.max(MIN_SCALE, pinsApartScale(), Math.min(v.h / CITY_MAP.h, fits, tall));
  return zoom === 'near' ? far * NEAR_TIMES : far;
}

/** Space kept between two pins' tap areas (CSS px). */
export const PIN_GAP = 4;

/**
 * The smallest scale at which no two pins' tap areas overlap: each pair is apart either side by
 * side or one above the other, whichever needs less.
 */
export function pinsApartScale(): number {
  const spots = Object.values(CITY_SPOTS);
  const reach = pinReach();
  let need = 0;
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const a = spots[i]!;
      const b = spots[j]!;
      const halves = (pinTapBox(0, 0, SPOT_WORDS[a.id]).w + pinTapBox(0, 0, SPOT_WORDS[b.id]).w) / 2;
      const dx = Math.abs(a.pin.x - b.pin.x);
      const dy = Math.abs(a.pin.y - b.pin.y);
      const side = dx > 0 ? (halves + PIN_GAP) / dx : Infinity;
      const stack = dy > 0 ? (reach.up + reach.down + PIN_GAP) / dy : Infinity;
      need = Math.max(need, Math.min(side, stack));
    }
  }
  return need;
}

/** The furthest out the city ever goes (CSS px per map unit). */
export const MIN_SCALE = 0.05;

function clampAxis(o: number, mapLen: number, viewLen: number): number {
  if (mapLen <= viewLen) return (viewLen - mapLen) / 2;
  return Math.min(EDGE, Math.max(viewLen - mapLen - EDGE, o));
}

/**
 * Keeps the map on screen (no more than EDGE px past an edge; centred when smaller). Up and down
 * this works in the space under the top row. With a top row, a map shorter than that space may
 * also slide down from the middle until its bottom is EDGE px past the screen's bottom, so the
 * pins (whose signs stand above their feet) can all sit under the row on a short screen.
 */
export function clampCam(c: CityCam, v: CityView): CityCam {
  const s = camScale(c.zoom, v);
  const top = coveredTop(v);
  const mh = CITY_MAP.h * s;
  const room = v.h - top;
  const y =
    top > 0 && mh <= room
      ? Math.min(v.h - mh + EDGE, Math.max(top + (room - mh) / 2, c.y))
      : top + clampAxis(c.y - top, mh, room);
  return { zoom: c.zoom, x: clampAxis(c.x, CITY_MAP.w * s, v.w), y };
}

/** Where the first look is centred: the middle of the three pins across, the map's middle up and down. */
export const START_AT = { x: 700, y: CITY_MAP.h / 2 } as const;

/**
 * The first look: far, centred on START_AT; on a screen too small for that, centred on the
 * pins with their words in the space under the top row, so all three are fully on screen and
 * none sits under the chips (qa F2, qa round 2).
 */
export function startCam(v: CityView): CityCam {
  const cam = centreOn(START_AT, 'far', v);
  if (pinsOnScreen(cam, v)) return cam;
  const s = camScale('far', v);
  const p = pinSpan();
  const left = p.lo * s - p.padLo;
  const right = p.hi * s + p.padHi;
  const r = pinRows();
  const reach = pinReach();
  const above = r.lo * s - reach.up;
  const below = r.hi * s + reach.down;
  const top = coveredTop(v);
  const y = top + (v.h - top) / 2 - (above + below) / 2;
  return clampCam({ zoom: 'far', x: v.w / 2 - (left + right) / 2, y }, v);
}

/** Every pin's tap area (pin and word) is inside the screen and below the top row. */
export function pinsOnScreen(c: CityCam, v: CityView): boolean {
  const s = camScale(c.zoom, v);
  const top = coveredTop(v);
  return Object.values(CITY_SPOTS).every((spot) => {
    const b = pinTapBox(c.x + spot.pin.x * s, c.y + spot.pin.y * s, SPOT_WORDS[spot.id]);
    return b.x >= 0 && b.y >= top && b.x + b.w <= v.w && b.y + b.h <= v.h;
  });
}

export function toScreen(c: CityCam, v: CityView, m: Pt): Pt {
  const s = camScale(c.zoom, v);
  return { x: c.x + m.x * s, y: c.y + m.y * s };
}

export function toMap(c: CityCam, v: CityView, p: Pt): Pt {
  const s = camScale(c.zoom, v);
  return { x: (p.x - c.x) / s, y: (p.y - c.y) / s };
}

/** A drag by (dx, dy) screen px. */
export function panCam(c: CityCam, v: CityView, dx: number, dy: number): CityCam {
  return clampCam({ zoom: c.zoom, x: c.x + dx, y: c.y + dy }, v);
}

/** A zoom step that keeps the map point under `at` (screen px) where it is. */
export function zoomCam(c: CityCam, v: CityView, zoom: Zoom, at: Pt = { x: v.w / 2, y: v.h / 2 }): CityCam {
  if (zoom === c.zoom) return clampCam(c, v);
  const m = toMap(c, v, at);
  const s = camScale(zoom, v);
  return clampCam({ zoom, x: at.x - m.x * s, y: at.y - m.y * s }, v);
}

/** The map point `m` in the middle of the screen at a zoom step (double tap, a pin's focus). */
export function centreOn(m: Pt, zoom: Zoom, v: CityView): CityCam {
  const s = camScale(zoom, v);
  return clampCam({ zoom, x: v.w / 2 - m.x * s, y: v.h / 2 - m.y * s }, v);
}

/** Pinch: the zoom step for fingers now `ratio` times as far apart as when it began (or the same step). */
export function pinchStep(zoom: Zoom, ratio: number): Zoom {
  if (!Number.isFinite(ratio)) return zoom;
  if (zoom === 'far' && ratio >= PINCH_IN) return 'near';
  if (zoom === 'near' && ratio <= PINCH_OUT) return 'far';
  return zoom;
}

/** The block whose lot holds the map point, if any (double tap). */
export function blockAt(m: Pt): CityBlock | null {
  for (const b of CITY_BLOCKS) if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.d) return b;
  return null;
}

/** About how wide a pin's word tag is (bold 12 px), for the tap area. */
export function pinWordWidth(word: string): number {
  return Math.max(40, word.length * 7.2 + 12);
}

/**
 * The tap area of a pin standing at screen (x, y): art's pinHitBox (at least 48 x 56), widened to
 * take in the whole word tag, so the word is part of the tap area too.
 */
export function pinTapBox(x: number, y: number, word: string): Box {
  const b = pinHitBox(x, y);
  const w = Math.max(b.w, pinWordWidth(word) + 8);
  return { x: x - w / 2, y: b.y, w, h: b.h };
}

/** Height of a pin from its foot to the top of its round sign (CSS px), with room for the bob. */
export const PIN_TALL = PIN.stem + PIN.tagH + PIN.r * 2 + 6;
