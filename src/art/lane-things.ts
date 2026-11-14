/**
 * What is on the road in the lane run (design.md S3f0 parts 6 and 9, task S3f1), seen from
 * behind. All our own; nothing from any lane runner or Nintendo game.
 *
 * Three kinds, told apart by shape and outline, never colour alone:
 * - Dodge things (stuck danfo, cone row, pothole, barrier arm): thick ink outline, sharp corners.
 * - Burst things (crate, junk pile, old broken sign): wood or loose things, a softer outline,
 *   and a small four-point sparkle above.
 * - The goat: round shapes, seen from behind, chewing.
 * Pickups (coin, Power bulb, Tech chip, garri, roasted corn) have their own shapes too.
 *
 * Lane units (LANE_U = 32 u to a metre). Road things are anchored at their ground centre;
 * pickups are anchored at their own centre (place them at their height above the road).
 * Nothing has a face, a word or a brand on it; the danfo's back windows are dark, no one shown.
 */
import { CRATE_COLOURS } from './crate';
import { drawGoat } from './hazards';
import { drawFoodIcon } from './items';
import { INK, WHITE } from './palette';
import { LANE_U, TAU, bake, capsule, clamp01, dot, line, oval, poly, rand, shape, sparkle4, type Baked, type UBox } from './lane-shade';

export type LaneDodge = 'danfo' | 'cones' | 'pothole' | 'barrier';
export type LaneBurst = 'crate:power' | 'crate:tech' | 'crate:coins' | 'junk' | 'sign';
/** The level file's thing kinds (part 13), plus the after-touch looks. */
export type LaneThing = LaneDodge | LaneBurst | 'goat' | 'conesDown' | 'potholePlugged' | 'barrierUp' | 'goatOffLeft' | 'goatOffRight';
export type LanePickup = 'coin' | 'bulb' | 'chip' | 'garri' | 'corn';

/** Every thing kind (for baking and the gallery). */
export const LANE_THINGS: readonly LaneThing[] = [
  'danfo', 'cones', 'pothole', 'barrier', 'crate:power', 'crate:tech', 'crate:coins', 'junk', 'sign', 'goat',
  'conesDown', 'potholePlugged', 'barrierUp', 'goatOffLeft', 'goatOffRight',
];
export const LANE_PICKUPS: readonly LanePickup[] = ['coin', 'bulb', 'chip', 'garri', 'corn'];

/** Which family a thing is in (part 6). */
export function laneFamily(k: LaneThing): 'dodge' | 'burst' | 'goat' {
  if (k.startsWith('goat')) return 'goat';
  if (k.startsWith('crate') || k === 'junk' || k === 'sign') return 'burst';
  return 'dodge';
}

/** How many frames a thing or pickup has: hazard lights blink, the goat chews, the coin tilts, the bulb glows. */
export const LANE_FRAMES: Readonly<Partial<Record<LaneThing | LanePickup, number>>> = { danfo: 2, goat: 2, goatOffLeft: 2, goatOffRight: 2, coin: 5, bulb: 2 };

/** Boxes (u) round the anchor, for baking. */
export const LANE_BOXES: Readonly<Record<LaneThing | LanePickup, UBox>> = {
  danfo: { l: -36, r: 36, t: -86, b: 3 },
  cones: { l: -38, r: 38, t: -26, b: 3 },
  conesDown: { l: -47, r: 44, t: -16, b: 10 },
  pothole: { l: -42, r: 42, t: -26, b: 26 },
  potholePlugged: { l: -42, r: 42, t: -26, b: 26 },
  barrier: { l: -51, r: 48, t: -46, b: 3 },
  barrierUp: { l: -51, r: -22, t: -124, b: 3 },
  'crate:power': { l: -20, r: 20, t: -46, b: 3 },
  'crate:tech': { l: -20, r: 20, t: -46, b: 3 },
  'crate:coins': { l: -20, r: 20, t: -46, b: 3 },
  junk: { l: -26, r: 26, t: -56, b: 3 },
  sign: { l: -28, r: 30, t: -66, b: 3 },
  goat: { l: -21, r: 21, t: -46, b: 4 },
  goatOffLeft: { l: -43, r: 20, t: -45, b: 4 },
  goatOffRight: { l: -20, r: 43, t: -45, b: 4 },
  coin: { l: -9, r: 9, t: -9, b: 9 },
  bulb: { l: -15, r: 15, t: -18, b: 13 },
  chip: { l: -11, r: 11, t: -14, b: 11 },
  garri: { l: -14, r: 14, t: -14, b: 14 },
  corn: { l: -15, r: 15, t: -15, b: 20 },
};

/** Danfo hazard lights: on, off, twice a second; steady on with reduced motion. */
export function hazardFrame(t: number, still = false): 0 | 1 {
  return still || !Number.isFinite(t) ? 1 : Math.floor(t * 4) % 2 === 0 ? 1 : 0;
}
/** The goat's chew: two frames, about three chews a second. */
export function goatChewFrame(t: number): 0 | 1 {
  return Number.isFinite(t) && Math.floor(t * 6) % 2 === 1 ? 1 : 0;
}
/** The coin's gentle tilt side to side (never a full spin), as a frame 0 to 4; the middle (2) with reduced motion. */
export function coinFrame(t: number, still = false): number {
  if (still || !Number.isFinite(t)) return 2;
  return Math.round(2 + 2 * Math.sin(t * 3.2));
}
/** The bulb's soft glow ring breathes: two frames. */
export function bulbFrame(t: number, still = false): 0 | 1 {
  return still || !Number.isFinite(t) ? 0 : Math.floor(t * 2.5) % 2 === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------ dodge */

const DANFO = '#f6c90e';
const DANFO_DARK = '#1d1a14';
const GLASS = '#26313d';
const AMBER = '#ffb21c';

function danfo(g: CanvasRenderingContext2D, lit: boolean): void {
  const S = { sharp: true, line: 2.6 };
  // Shadow
  g.fillStyle = 'rgba(20,14,30,0.35)';
  g.beginPath();
  oval(g, 0, 0, 36, 3);
  g.fill();
  // Tyres under the bumper
  for (const x of [-22, 22]) shape(g, () => g.rect(x - 6, -12, 12, 12), '#2a2a2a', { ...S, line: 2, rim: 0.6 });
  // Roof rack with a tied bundle of sacks
  shape(g, () => poly(g, [-28, -78, 28, -78, 30, -74, -30, -74]), '#5d6670', S);
  shape(g, () => g.roundRect(-20, -86, 22, 9, 3), '#c9a46a', { line: 1.8 });
  shape(g, () => g.roundRect(2, -84, 16, 7, 3), '#7aa35a', { line: 1.8 });
  line(g, [-14, -86, -14, -77, 9, -84, 9, -77], '#7a5232', 1);
  // Body: a boxy back, slightly narrower at the roof
  shape(g, () => poly(g, [-30, -74, 30, -74, 32, -16, -32, -16]), DANFO, { ...S, line: 3, shade: 3, rim: 1.4 });
  // Black stripes along the body (the plain danfo look; no writing, no brand)
  g.fillStyle = DANFO_DARK;
  g.fillRect(-31.6, -36, 63.2, 4.4);
  g.fillRect(-31.8, -26, 63.6, 3);
  // Back windows: dark glass, two panes, a soft streak of sky; no one shown
  for (const x of [-27, 1.5]) {
    shape(g, () => poly(g, [x, -70, x + 25.5, -70, x + 25.5, -44, x, -44]), GLASS, { ...S, line: 2, shade: 0, rim: 1 });
    line(g, [x + 5, -46, x + 13, -68], 'rgba(255,190,150,0.35)', 2.4);
  }
  // Rear door line and handle
  line(g, [0, -42, 0, -18], DANFO_DARK, 1.2);
  g.fillStyle = '#5d6670';
  g.fillRect(-5, -40, 4, 2);
  // Tail lights and the hazard lights
  for (const x of [-29, 25]) {
    shape(g, () => g.rect(x, -42, 4, 12), '#c0392b', { ...S, line: 1.4, shade: 0 });
    if (lit) dot(g, x + 2, -22, 5.5, 'rgba(255,190,60,0.45)');
    shape(g, () => g.rect(x, -24.5, 4, 5), lit ? AMBER : '#8a5a14', { ...S, line: 1.4, shade: 0, rim: lit ? 1 : 0 });
  }
  // Plain number plate, no writing
  shape(g, () => g.rect(-9, -22, 18, 6), '#efe9d8', { ...S, line: 1.4, shade: 0, rim: 0 });
  // Bumper
  shape(g, () => poly(g, [-33, -16, 33, -16, 33, -10, -33, -10]), '#3a3d42', S);
}

const CONE = '#f26b1d';

function cone(g: CanvasRenderingContext2D, x: number): void {
  shape(g, () => g.rect(x - 8.5, -3.5, 17, 3.5), '#2a2a2a', { sharp: true, line: 2 });
  shape(g, () => poly(g, [x - 2.2, -23, x + 2.2, -23, x + 6.6, -3.5, x - 6.6, -3.5]), CONE, { sharp: true, line: 2.4, shade: 1.6, rim: 1 });
  // Two white bands across it
  g.fillStyle = WHITE;
  poly4(g, x, -16.5, -13.5, 1);
  poly4(g, x, -10, -7, 1);
}

function poly4(g: CanvasRenderingContext2D, x: number, y0: number, y1: number, k: number): void {
  const w = (y: number): number => (2.2 + ((y + 23) / 19.5) * 4.4) * k;
  g.beginPath();
  poly(g, [x - w(y0), y0, x + w(y0), y0, x + w(y1), y1, x - w(y1), y1]);
  g.fill();
}

function conesDown(g: CanvasRenderingContext2D): void {
  // Tipped over toward the kerb: cones lying on their sides, the road ahead open
  for (const [x, y, a] of [[-30, -4, -1.3], [-6, -3, 1.5], [26, -4, 1.2]] as const) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.translate(0, 9);
    cone(g, 0);
    g.restore();
  }
}

/** A pothole; `flat` squashes it to sit on the road (about camera height / distance; 0.5 by default). */
function pothole(g: CanvasRenderingContext2D, flat: number, plugged: boolean): void {
  const f = Math.max(0.12, Math.min(1, flat));
  const rx = 26;
  const ry = 26 * f;
  // Cracked lip: a jagged ring a little bigger than the hole
  const n = 14;
  const lip = (): void => {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const r = 1.22 + (i % 2 ? 0.08 : -0.02) + rand(i) * 0.06;
      const px = Math.cos(a) * rx * r;
      const py = Math.sin(a) * ry * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
  };
  shape(g, lip, '#6a5844', { sharp: true, line: 2.4, shade: 0, rim: 1.2, rimC: '#9c8a70' });
  // Cracks running out
  for (const [a, l] of [[0.3, 10], [2.4, 8], [3.6, 11], [5.4, 7]] as const) {
    const x0 = Math.cos(a) * rx * 1.2;
    const y0 = Math.sin(a) * ry * 1.2;
    line(g, [x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l * f + 1.5], INK, 1.2);
  }
  if (plugged) {
    // Plugged with corn mash: a flat yellow patch with a few kernels
    shape(g, () => oval(g, 0, 0, rx, ry), '#f1c84b', { sharp: true, line: 2, shade: 2, rim: 1 });
    for (let i = 0; i < 9; i++) dot(g, (rand(i + 3) - 0.5) * rx * 1.4, (rand(i + 9) - 0.5) * ry * 1.4, 1.6, '#fff0a0');
  } else {
    // The dark hole, deeper at the far side, with a little water
    shape(g, () => oval(g, 0, 0, rx, ry), '#24190f', { sharp: true, line: 2.6, shade: 0, rim: 0 });
    shape(g, () => oval(g, 0, ry * 0.35, rx * 0.62, ry * 0.42), '#3c5a60', { line: 0, shade: 0, rim: 0.8, rimC: '#7fa9ad' });
  }
  // A few stones round it
  for (let i = 0; i < 6; i++) {
    const a = 0.4 + i * 1.07;
    shape(g, () => oval(g, Math.cos(a) * rx * 1.45, Math.sin(a) * ry * 1.5 - 1, 2.6, 2), '#9a948a', { line: 1.2, shade: 0.6, rim: 0.4 });
  }
}

const ARM_RED = '#d6372b';

function barrier(g: CanvasRenderingContext2D, up: boolean): void {
  const px = -38;
  const py = -36;
  // The post, its foot and its counterweight box
  shape(g, () => g.rect(px - 9, -4, 14, 4), '#5d6670', { sharp: true, line: 2 });
  shape(g, () => g.rect(px - 3, -40, 6, 37), '#e9e1cf', { sharp: true, line: 2.4, shade: 1.4 });
  line(g, [px - 3, -30, px + 3, -30, px - 3, -20, px + 3, -20], '#1d1a14', 1.2);
  shape(g, () => g.rect(px - 10, -42, 8, 10), '#3a3d42', { sharp: true, line: 2 });
  // The arm: a striped pole on one post, at chest height
  g.save();
  g.translate(px, py);
  if (up) g.rotate(-1.45);
  const len = 80;
  const arm = (): void => g.rect(0, -3, len, 6);
  shape(g, arm, WHITE, { sharp: true, line: 2.6, shade: 0, rim: 0 });
  g.save();
  g.beginPath();
  arm();
  g.clip();
  g.fillStyle = ARM_RED;
  for (let x = 4; x < len; x += 16) {
    g.beginPath();
    poly(g, [x, 3, x + 8, -3, x + 16, -3, x + 8, 3]);
    g.fill();
  }
  g.restore();
  g.beginPath();
  arm();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.lineJoin = 'miter';
  g.stroke();
  // A small red tip disc
  shape(g, () => g.rect(len - 4, -4.5, 6, 9), ARM_RED, { sharp: true, line: 2 });
  g.restore();
  dot(g, px, py, 2.4, '#5d6670');
}

/* ------------------------------------------------------------------ burst */

const W = CRATE_COLOURS;

/** The stamp on a crate: a picture of what is inside (a bulb, a chip or a coin), never a word. */
function stamp(g: CanvasRenderingContext2D, what: 'power' | 'tech' | 'coins', x: number, y: number): void {
  g.strokeStyle = W.stamp;
  g.fillStyle = W.stamp;
  g.lineWidth = 1.3;
  if (what === 'power') {
    g.beginPath();
    g.arc(x, y - 1.5, 3.6, 0, TAU);
    g.stroke();
    g.fillRect(x - 1.8, y + 2.2, 3.6, 2.2);
    g.beginPath();
    poly(g, [x + 0.8, y - 4.4, x - 1.8, y - 0.6, x, y - 0.6, x - 0.8, y + 1.6, x + 1.8, y - 2, x, y - 2]);
    g.fill();
  } else if (what === 'tech') {
    g.strokeRect(x - 3.2, y - 1.6, 6.4, 5.2);
    for (let i = 0; i < 3; i++) g.fillRect(x - 3 + i * 2.4, y - 3.2 - i * 1.4, 1.6, 1.2 + i * 1.4);
  } else {
    g.beginPath();
    g.arc(x, y, 3.8, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(x, y, 1.6, 0, TAU);
    g.stroke();
  }
}

function crate(g: CanvasRenderingContext2D, what: 'power' | 'tech' | 'coins'): void {
  shadow(g, 17);
  const w = 28;
  const h = 26;
  shape(g, () => g.roundRect(-w / 2, -h, w, h, 2), W.inside, { line: 1.8, shade: 0, rim: 0 });
  // Slats across, with dark gaps between, and two upright corner posts
  for (let i = 0; i < 4; i++) shape(g, () => g.rect(-w / 2 + 1, -h + 1 + i * 6.4, w - 2, 4.6), i % 2 ? W.woodDark : W.wood, { line: 1, shade: 0.8, rim: 0.6 });
  for (const x of [-w / 2, w / 2 - 4]) shape(g, () => g.rect(x, -h, 4, h), W.woodShade, { line: 1.3, shade: 0.6, rim: 0.5 });
  shape(g, () => g.roundRect(-6.5, -h + 8.5, 13, 10.5, 1.5), '#e6c9a2', { line: 1, shade: 0, rim: 0 });
  stamp(g, what, 0, -h + 13.6);
  sparkle4(g, 0, -h - 10, 5.2);
}

function shadow(g: CanvasRenderingContext2D, rx: number): void {
  g.fillStyle = 'rgba(20,14,30,0.3)';
  g.beginPath();
  oval(g, 0, 0, rx, 3);
  g.fill();
}

function junk(g: CanvasRenderingContext2D): void {
  shadow(g, 22);
  // A cardboard box at the bottom, taped shut
  shape(g, () => g.roundRect(-18, -20, 26, 20, 1.5), '#c99a62', { line: 1.6 });
  line(g, [-18, -14, 8, -14], '#e8d3a6', 2.4);
  line(g, [-6, -20, -6, -14], '#e8d3a6', 2.4);
  // Two old tins beside it, one dented
  shape(g, () => g.roundRect(10, -15, 9, 15, 2), '#b9c2c9', { line: 1.4 });
  line(g, [10, -11, 19, -11], '#8a949c', 1);
  shape(g, () => g.roundRect(12, -27, 8, 12, 2), '#d3a24a', { line: 1.4 });
  line(g, [14, -22, 18, -20], '#8a5a14', 1);
  // A broken radio on top: a box with a round speaker, a knob, and a bent aerial
  line(g, [4, -38, 12, -50, 15, -48], INK, 1.4);
  shape(g, () => g.roundRect(-16, -38, 22, 18, 3), '#4f5a63', { line: 1.6 });
  shape(g, () => oval(g, -8.5, -29, 5.2, 5.2), '#2c3238', { line: 1.2, shade: 0, rim: 0.7 });
  for (let i = -2; i <= 2; i++) dot(g, -8.5 + i * 1.8, -29, 0.6, '#77828c');
  shape(g, () => oval(g, 1.5, -32, 2, 2), '#d9d3c6', { line: 1 });
  shape(g, () => g.rect(-1, -26.5, 5, 3), '#ffcf5a', { line: 0.9, shade: 0, rim: 0 });
  sparkle4(g, -2, -48, 5.2);
}

function sign(g: CanvasRenderingContext2D): void {
  shadow(g, 22);
  // An old blank board on two legs, leaning, paint peeling to the wood; no words on it
  g.save();
  g.rotate(0.13);
  for (const x of [-14, 12]) shape(g, () => g.rect(x, -40, 3.6, 40), '#8a5d36', { line: 1.4 });
  const board = (): void => g.roundRect(-22, -52, 46, 26, 2);
  shape(g, board, '#7fb0c9', { line: 1.8 });
  g.save();
  g.beginPath();
  board();
  g.clip();
  for (const [x, y, rx, ry] of [[-14, -46, 5, 2.6], [8, -36, 7, 3], [16, -48, 4, 2.2], [-4, -31, 4, 2]] as const) shape(g, () => oval(g, x, y, rx, ry), '#c49a6c', { line: 0.8, shade: 0, rim: 0 });
  g.restore();
  g.restore();
  sparkle4(g, 4, -60, 5.2);
}

/* ------------------------------------------------------------------- goat */

const COAT = '#f3eee3';
const PATCH = '#9a7b5a';

/** Our own goat from behind, standing in a lane and chewing (round shapes). */
function goatBack(g: CanvasRenderingContext2D, chew: 0 | 1): void {
  shadow(g, 15);
  g.scale(1.3, 1.3);
  const o = { line: 1.6 };
  // Back legs and hooves
  for (const x of [-5, 5]) {
    shape(g, () => capsule(g, x, -12, 2.4, x * 1.05, -2, 1.8), COAT, { ...o, shadeC: '#d8d0c0' });
    shape(g, () => g.roundRect(x * 1.05 - 2, -3, 4, 3, 1), '#4a3f35', { line: 1.2 });
  }
  // Head with horns and ears over the back, bobbing as it chews
  const hy = chew ? -25 : -26.4;
  const hx = 4;
  for (const e of [-1, 1]) shape(g, () => oval(g, hx + e * 6, hy + 1, 3.4, 1.6, e * 0.5), COAT, { ...o, shadeC: '#d8d0c0' });
  for (const e of [-1, 1]) line(g, [hx + e * 1.6, hy - 3, hx + e * 3.6, hy - 7, hx + e * 5.2, hy - 6.6], '#8a7f70', 1.8);
  shape(g, () => oval(g, hx, hy, 4.2, 4.6), COAT, { ...o, shadeC: '#d8d0c0' });
  dot(g, hx - 1, hy - 1.4, 1.2, PATCH);
  // Round rump and body
  shape(g, () => oval(g, 0, -17, 10.6, 8.6), COAT, { ...o, shadeC: '#d8d0c0', shade: 2 });
  shape(g, () => oval(g, -4, -20, 4.2, 3.4, -0.4), PATCH, { line: 0, shade: 0, rim: 0 });
  // A short tail, up
  shape(g, () => oval(g, 0, -25.4, 1.8, 3.4), COAT, { line: 1.3, shadeC: '#d8d0c0' });
}

/* ---------------------------------------------------------------- pickups */

const BRASS = '#ddb14a';
const BRASS_DARK = '#94681a';
const BRASS_SHINE = '#fff0b8';

/** A small brass 10 kobo coin standing up, raised rim, palm leaf mark; tilt -1..1 is a gentle sway. */
function coin(g: CanvasRenderingContext2D, tilt: number): void {
  const k = Math.cos(clamp01(Math.abs(tilt)) * 0.95);
  g.save();
  g.scale(Math.max(0.55, k), 1);
  const r = 7;
  shape(g, () => oval(g, 0, 0, r, r), BRASS_DARK, { line: 1.4, shade: 0, rim: 0 });
  shape(g, () => oval(g, 0, 0, r - 1.6, r - 1.6), BRASS, { line: 0.6, shade: 1, rim: 0.8, rimC: BRASS_SHINE });
  // Palm leaf mark: a stem with fronds
  line(g, [0, 3.6, 0, -3.4], BRASS_DARK, 0.8);
  for (const y of [-2.6, -0.8, 1]) {
    line(g, [0, y, -2.6, y - 1.4], BRASS_DARK, 0.7);
    line(g, [0, y, 2.6, y - 1.4], BRASS_DARK, 0.7);
  }
  g.restore();
}

const COIN_TILTS = [-1, -0.5, 0, 0.5, 1] as const;

function bulb(g: CanvasRenderingContext2D, glow: 0 | 1): void {
  dot(g, 0, -3, glow ? 13 : 11.5, 'rgba(255,226,122,0.42)');
  // Pear-shaped glass
  shape(
    g,
    () => {
      g.moveTo(-3.6, 4);
      g.bezierCurveTo(-4, 0.5, -9, -2, -8.6, -7);
      g.bezierCurveTo(-8.2, -15.4, 8.2, -15.4, 8.6, -7);
      g.bezierCurveTo(9, -2, 4, 0.5, 3.6, 4);
      g.closePath();
    },
    '#fff3a6',
    { line: 1.6, shade: 1.2, shadeC: '#f2d76a', rim: 1, rimC: WHITE },
  );
  // A small lightning bolt inside
  shape(g, () => poly(g, [1.6, -12.4, -3.6, -5, -0.4, -5, -1.8, 1, 3.8, -7, 0.4, -7]), '#f4a62a', { sharp: true, line: 1.1, shade: 0, rim: 0 });
  // Screw cap
  shape(g, () => g.rect(-3.8, 4, 7.6, 6.4), '#9aa3ad', { sharp: true, line: 1.3, shade: 0.8 });
  line(g, [-3.8, 6.2, 3.8, 6.2], INK, 0.8);
  line(g, [-3.8, 8.3, 3.8, 8.3], INK, 0.8);
}

function chip(g: CanvasRenderingContext2D): void {
  // Pins on both sides
  for (let i = -1; i <= 1; i++) {
    line(g, [-9, 3.2 + i * 2.8, 9, 3.2 + i * 2.8], INK, 1.5);
    line(g, [-9, 3.2 + i * 2.8, 9, 3.2 + i * 2.8], '#e0c15a', 0.7);
  }
  shape(g, () => g.rect(-6.4, -2.8, 12.8, 12), '#2f5d8a', { sharp: true, line: 1.6, shade: 1.2, rim: 0.8 });
  shape(g, () => g.rect(-3, 0.6, 6, 5), '#7fd6ff', { sharp: true, line: 0.8, shade: 0, rim: 0 });
  // Three signal bars over it
  for (let i = 0; i < 3; i++) {
    const h = 2.4 + i * 2.2;
    shape(g, () => g.rect(-5.6 + i * 4.2, -4.4 - h, 3, h), '#3ccf7a', { sharp: true, line: 0.9, shade: 0, rim: 0 });
  }
}

/* --------------------------------------------------------------- drawing */

export interface LaneDrawOpts {
  /** Frame for things that move (LANE_FRAMES); see hazardFrame, goatChewFrame, coinFrame, bulbFrame. */
  frame?: number;
  /** Potholes: how flat they lie (about camera height / distance); 0.5 if not given. */
  flat?: number;
  /** Seconds, for goats trotting off (their legs). */
  time?: number;
}

/** Draws a road thing at the origin in lane units (ground centre). */
export function drawLaneThing(g: CanvasRenderingContext2D, kind: LaneThing, o: LaneDrawOpts = {}): void {
  const f = o.frame ?? 0;
  g.save();
  g.lineCap = 'round';
  switch (kind) {
    case 'danfo':
      danfo(g, f % 2 === 1);
      break;
    case 'cones':
      for (const x of [-26, 0, 26]) cone(g, x);
      break;
    case 'conesDown':
      conesDown(g);
      break;
    case 'pothole':
    case 'potholePlugged':
      pothole(g, o.flat ?? 0.5, kind === 'potholePlugged');
      break;
    case 'barrier':
    case 'barrierUp':
      barrier(g, kind === 'barrierUp');
      break;
    case 'crate:power':
    case 'crate:tech':
    case 'crate:coins':
      crate(g, kind.slice(6) as 'power' | 'tech' | 'coins');
      break;
    case 'junk':
      junk(g);
      break;
    case 'sign':
      sign(g);
      break;
    case 'goat':
      goatBack(g, (f % 2) as 0 | 1);
      break;
    case 'goatOffLeft':
    case 'goatOffRight':
      // Trotting off to the pavement, unhurt, tail up (the streets' goat, side on)
      drawGoat(g, 0, 0, (o.time ?? f * 0.12) + 0.05, 'runAway', kind === 'goatOffLeft' ? -1 : 1);
      break;
  }
  g.restore();
}

/** Draws a pickup centred at the origin in lane units. */
export function drawLanePickup(g: CanvasRenderingContext2D, kind: LanePickup, o: LaneDrawOpts = {}): void {
  const f = o.frame ?? 0;
  g.save();
  g.lineCap = 'round';
  switch (kind) {
    case 'coin':
      coin(g, COIN_TILTS[Math.min(4, Math.max(0, Math.round(f)))] ?? 0);
      break;
    case 'bulb':
      bulb(g, (f % 2) as 0 | 1);
      break;
    case 'chip':
      chip(g);
      break;
    case 'garri':
    case 'corn':
      // As on the streets, with a soft halo disc so it reads on the dark road
      dot(g, 0, 0, 13.5, 'rgba(255,248,220,0.7)');
      drawFoodIcon(g, kind, 0, 0, 0.75);
      break;
  }
  g.restore();
}

/** Draws a thing or pickup at (x, y) on screen at ppm pixels per metre. */
export function drawLaneAt(g: CanvasRenderingContext2D, kind: LaneThing | LanePickup, x: number, y: number, ppm: number, o: LaneDrawOpts = {}): void {
  g.save();
  g.translate(x, y);
  const k = ppm / LANE_U;
  g.scale(k, k);
  if ((LANE_PICKUPS as readonly string[]).includes(kind)) drawLanePickup(g, kind as LanePickup, o);
  else drawLaneThing(g, kind as LaneThing, o);
  g.restore();
}

/**
 * Ready-made pictures of every thing and pickup, every frame, at `ppm` pixels per metre.
 * Bake two sizes (part 21: near and far) when the run loads, then blitBaked. Keys are
 * `${kind}` for one-frame kinds and `${kind}#${frame}` for the others (laneKey gives them).
 * Potholes are baked lying at flat 0.5; for a truer squash draw them live with drawLaneAt.
 */
export function bakeLaneThings(ppm: number): Map<string, Baked> {
  const out = new Map<string, Baked>();
  for (const kind of [...LANE_THINGS, ...LANE_PICKUPS]) {
    const n = LANE_FRAMES[kind] ?? 1;
    for (let f = 0; f < n; f++) {
      const b = bake(LANE_BOXES[kind], ppm, (g) => {
        if ((LANE_PICKUPS as readonly string[]).includes(kind)) drawLanePickup(g, kind as LanePickup, { frame: f });
        else drawLaneThing(g, kind as LaneThing, { frame: f, time: f * 0.12 });
      });
      if (b) out.set(laneKey(kind, f), b);
    }
  }
  return out;
}

/** The bake key for a kind and frame. */
export function laneKey(kind: LaneThing | LanePickup, frame = 0): string {
  const n = LANE_FRAMES[kind] ?? 1;
  return n > 1 ? `${kind}#${((Math.round(frame) % n) + n) % n}` : kind;
}

/* ---------------------------------------------------------------- bursts */

export type LaneBurstLook = 'crate' | 'junk' | 'sign';

/** Which burst look a thing kind uses. */
export function burstLookOf(kind: LaneThing): LaneBurstLook | null {
  if (kind.startsWith('crate')) return 'crate';
  if (kind === 'junk' || kind === 'sign') return kind;
  return null;
}

/** How long a burst shows (s). */
export const BURST_TIME = 0.45;

/**
 * A burst: our own wooden pop. The thing breaks into pieces that fly out and fall, a ring of
 * dust and a small flash. p 0 to 1 over BURST_TIME; nothing after 1. Lane units, ground centre.
 * Reduced motion (`still`): the pieces stay in place and fade.
 */
export function drawLaneBurst(g: CanvasRenderingContext2D, look: LaneBurstLook, p: number, still = false): void {
  const t = clamp01(p);
  if (!(p < 1)) return;
  g.save();
  g.globalAlpha = 1 - t * t;
  // Dust ring on the road
  g.fillStyle = 'rgba(214,200,176,0.8)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const r = still ? 14 : 10 + t * 18;
    g.beginPath();
    g.arc(Math.cos(a) * r, -3 + Math.sin(a) * r * 0.25, 3.4 * (1 - t * 0.5), 0, TAU);
    g.fill();
  }
  // A small flash where it broke
  if (t < 0.35) sparkle4(g, 0, -18, 12 * (1 - t * 2), '#fff6c2');
  const colours = look === 'crate' ? [W.wood, W.woodDark, W.wood, W.woodShade, W.wood, W.woodDark] : look === 'junk' ? ['#c99a62', '#b9c2c9', '#4f5a63', '#d3a24a', '#c99a62', '#e8d3a6'] : ['#7fb0c9', '#8a5d36', '#7fb0c9', '#c49a6c', '#8a5d36', '#7fb0c9'];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5;
    const sp = 34 + rand(i + 1) * 16;
    const x = still ? (i - 2.5) * 6 : Math.cos(a) * sp * t * 1.2;
    const y = still ? -10 - (i % 3) * 6 : -14 + Math.sin(a) * sp * t + 60 * t * t;
    g.save();
    g.translate(x, y);
    g.rotate(still ? i : t * (i % 2 ? 6 : -6));
    const c = colours[i]!;
    if (look === 'junk' && i % 3 === 1) shape(g, () => g.roundRect(-3, -4, 6, 8, 1.5), c, { line: 1.2 });
    else shape(g, () => g.rect(-6, -1.8, 12, 3.6), c, { line: 1.2, shade: 0.6, rim: 0.4 });
    g.restore();
  }
  g.restore();
}

/* ------------------------------------------------------ pop-out flight */

/**
 * Where a popped-out coin, bulb or chip is at k (0 to 1) on its way from where it popped
 * (x0, y0) to its HUD chip (x1, y1), in screen pixels: a quick hop up, then a curve to the
 * chip. Draw it with drawBucketIcon (src/art/city.ts) or drawFlyingMoney (src/art/payspot.ts).
 */
export function lanePopAt(x0: number, y0: number, x1: number, y1: number, k: number): { x: number; y: number } {
  const t = clamp01(k);
  const e = t * t * (3 - 2 * t);
  const hop = Math.sin(Math.min(1, t * 2.2) * Math.PI) * 18 * (1 - t);
  return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e - hop };
}
