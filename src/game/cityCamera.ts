/**
 * Looking around Lagos from above (docs/city.md part 5 (b) "Size", "Look around"), with no DOM.
 *
 * The map is CITY_MAP (1600 x 1000 map units). Two zoom steps: far (the whole area's height fits
 * the screen) and near (2 times as big); it starts at far. The camera is the screen place (CSS px)
 * of the map's top left corner. A map smaller than the screen sits in the middle; a bigger one
 * never leaves the screen by more than EDGE px.
 */
import { CITY_BLOCKS, CITY_MAP, PIN, pinHitBox, type CityBlock } from '../art/city';

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

/** CSS px per map unit at a zoom step. Far: the map's height fits the screen. */
export function camScale(zoom: Zoom, v: CityView): number {
  const far = Math.max(0.05, v.h / CITY_MAP.h);
  return zoom === 'near' ? far * NEAR_TIMES : far;
}

function clampAxis(o: number, mapLen: number, viewLen: number): number {
  if (mapLen <= viewLen) return (viewLen - mapLen) / 2;
  return Math.min(EDGE, Math.max(viewLen - mapLen - EDGE, o));
}

/** Keeps the map on screen (no more than EDGE px past an edge; centred when smaller). */
export function clampCam(c: CityCam, v: CityView): CityCam {
  const s = camScale(c.zoom, v);
  return { zoom: c.zoom, x: clampAxis(c.x, CITY_MAP.w * s, v.w), y: clampAxis(c.y, CITY_MAP.h * s, v.h) };
}

/** Where the first look is centred: the middle of the three pins across, the map's middle up and down. */
export const START_AT = { x: 700, y: CITY_MAP.h / 2 } as const;

/** The first look: far, centred on START_AT. */
export function startCam(v: CityView): CityCam {
  return centreOn(START_AT, 'far', v);
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
