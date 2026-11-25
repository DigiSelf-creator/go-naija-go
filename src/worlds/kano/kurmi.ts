/**
 * K2a: Kurmi, Kano street 1 (docs/kano.md 2.2, 2.3, 3.4, 4.1 and 7). A bright, hazy morning just
 * inside the old wall: round earth buildings and flat-roofed houses with small raised corners,
 * leather stalls with bags and sandals, a kosai seller, a POS kiosk, provisions and a vulcanizer.
 * Made-up everyday signs only. No palace, no title-holder, no script, nothing religious, no domes
 * or towers, no real building or brand.
 *
 * - The backdrop: the gold morning sky, the far rooftops and trees under a soft gold Harmattan
 *   haze (baked into the far strip only, KN-R6), then the near row (no haze) and the sandy
 *   pavement with sand drifted along the road edge. Every layer is baked once and copied.
 * - The roof platform (a leather seller's mat shade), the three traders' stalls and a child's
 *   rolling hoop (scenery behind the walking line).
 * - Kilishi on the road and its HUD icon (4.1): thin dark spiced strips folded in paper.
 * - Kurmi's cast (part 7; drawn by the people kit to the style.md 1.8 recipe) and its street tune.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { FolkAge, FolkDress, FolkHair, FolkHeadwear, FolkHold, FolkLook } from '../../art/folk';
import type { Tune } from '../../art/tunes';
import { KANO, KANO_INK as INK } from './gate';
import { kanoBlit, kanoStrip, type KanoSlot } from './layer';
import { drawDustStreaks, type WindDir } from './wind';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
const GROUND = 300;

/** Kurmi's colours: a warm, a little dusty morning (kano.md 2.5); the haze is gold, never grey. */
export const KURMI = {
  skyTop: '#9ccbe2',
  skyLow: '#f6dca4',
  sun: '#fff1c4',
  sunRing: '#fbe4a6',
  haze: 'rgba(240,204,130,0.5)',
  far: ['#c99070', '#b97c5e', '#d4a57e'] as readonly string[],
  tree: '#6f8f45',
  pave: '#dcc08a',
  paveTop: '#c4a46c',
  sand: '#ead4a2',
} as const;

/** Every word painted on Kurmi's row (made-up everyday shop words, KN-R3). */
export const KURMI_SIGNS = ['FINE LEATHER', 'SANDALS', 'POS HERE', 'PROVISIONS', 'VULCANIZER'] as const;

export function box(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 1.2): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.strokeRect(x, y, w, h);
  }
}

export function disc(g: G, x: number, y: number, r: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  if (lw > 0) {
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
}

export function board(g: G, cx: number, y: number, w: number, words: string, fill: string = KANO.cream): void {
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.roundRect(cx - w / 2, y, w, 13, 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#3a2618';
  g.font = 'bold 8px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(words, cx, y + 7, w - 6);
}

/** Our own flat-roofed earth house: smooth walls, a parapet with small raised corners, a raised zigzag band. */
export function house(g: G, x: number, base: number, w: number, h: number, wall: string, light: string, dark: string): void {
  const top = base - h;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.fillStyle = wall;
  g.beginPath();
  g.moveTo(x, base);
  g.lineTo(x, top - 7);
  g.quadraticCurveTo(x + 1, top - 12, x + 4, top - 12);
  g.lineTo(x + 7, top - 3);
  g.lineTo(x + w - 7, top - 3);
  g.lineTo(x + w - 4, top - 12);
  g.quadraticCurveTo(x + w - 1, top - 12, x + w, top - 7);
  g.lineTo(x + w, base);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = light;
  g.fillRect(x + 2, top - 1, w - 4, 3);
  g.fillStyle = dark;
  g.fillRect(x + 1, base - 5, w - 2, 4);
  g.strokeStyle = light;
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0, px = x + 8; px <= x + w - 8; px += 6, i++) {
    if (i === 0) g.moveTo(px, top + 8);
    else g.lineTo(px, top + (i % 2 ? 4 : 8));
  }
  g.stroke();
}

/** Our own round earth building seen from the side: shaded sides, a flat roof with a lip. */
export function roundHouse(g: G, cx: number, base: number, rw: number, h: number, wall: string, light: string, dark: string): void {
  const top = base - h;
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.fillStyle = wall;
  g.beginPath();
  g.moveTo(cx - rw, top + 3);
  g.lineTo(cx - rw, base - 3);
  g.quadraticCurveTo(cx, base + 3, cx + rw, base - 3);
  g.lineTo(cx + rw, top + 3);
  g.quadraticCurveTo(cx, top + 8, cx - rw, top + 3);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = dark;
  g.fillRect(cx + rw * 0.55, top + 5, rw * 0.42, h - 9);
  g.fillStyle = light;
  g.fillRect(cx - rw * 0.8, top + 7, rw * 0.22, h - 14);
  // The roof lip
  g.fillStyle = light;
  g.beginPath();
  g.ellipse(cx, top + 3, rw + 2, 3.2, 0, 0, TAU);
  g.fill();
  g.stroke();
}

/** A neem-shaped shade tree of our own: a short trunk and a few round leaf clumps. */
export function neem(g: G, x: number, base: number, s: number, leaf: string): void {
  g.fillStyle = '#7a5a3a';
  g.fillRect(x - 2 * s, base - 26 * s, 4 * s, 26 * s);
  for (const [dx, dy, r] of [[-10, -30, 11], [8, -32, 12], [0, -42, 12], [-4, -26, 9], [12, -24, 8]] as const) disc(g, x + dx * s, base + dy * s, r * s, leaf);
}

/* ------------------------------------------------------------------ sky */

const skyLayer: KanoSlot = { layer: null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, KURMI.skyTop);
  grad.addColorStop(1, KURMI.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // A soft low morning sun (left of centre), pale in the haze
  disc(g, w * 0.22, 70, 30, KURMI.sunRing);
  disc(g, w * 0.22, 70, 19, KURMI.sun);
}

/** The morning sky and its pale sun. Screen space, painted once and copied. */
export function drawKurmiSky(g: G, viewW: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (kanoBlit(g, skyLayer, `kurmiSky${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = KURMI.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
}

/* ------------------------------------------------------------------ far rooftops (hazed) */

const FAR_W = 760;
const FAR_H = 170;
const farLayer: KanoSlot = { layer: null };

function paintFar(g: G): void {
  const b = FAR_H;
  const h0 = b - 70;
  const [c0, c1, c2] = KURMI.far as [string, string, string];
  // The flat land running out to the horizon
  g.fillStyle = '#d9b27e';
  g.fillRect(0, h0, FAR_W, b - h0);
  // Trees, then rooftops on the horizon: flat roofs with small raised corners, round buildings
  for (const [x, s] of [[40, 1.4], [300, 1.2], [520, 1.5], [700, 1.3]] as const) neem(g, x, h0 + 4, s, KURMI.tree);
  const roofs: [number, number, number, number][] = [
    [80, 70, 54, 0], [170, 46, 40, 1], [250, 60, 64, 2], [360, 80, 48, 0], [470, 40, 36, 1], [570, 64, 58, 2], [660, 52, 44, 0],
  ];
  for (const [x, w, h, k] of roofs) {
    const col = [c0, c1, c2][k]!;
    g.fillStyle = col;
    g.beginPath();
    if (k === 1) {
      g.moveTo(x, h0);
      g.lineTo(x, h0 - h);
      g.quadraticCurveTo(x + w / 2, h0 - h + 4, x + w, h0 - h);
      g.lineTo(x + w, h0);
    } else {
      g.rect(x, h0 - h, w, h);
      g.moveTo(x, h0 - h);
      g.lineTo(x + 2, h0 - h - 7);
      g.lineTo(x + 6, h0 - h);
      g.moveTo(x + w - 6, h0 - h);
      g.lineTo(x + w - 2, h0 - h - 7);
      g.lineTo(x + w, h0 - h);
    }
    g.fill();
    g.fillStyle = 'rgba(70,40,25,0.35)';
    g.fillRect(x + w * 0.3, h0 - h * 0.6, 4, 5);
    g.fillRect(x + w * 0.62, h0 - h * 0.6, 4, 5);
  }
  // A far baobab, our own
  g.fillStyle = '#9a7a62';
  g.fillRect(426, h0 - 56, 9, 56);
  disc(g, 418, h0 - 60, 9, '#7f9a4a');
  disc(g, 442, h0 - 62, 10, '#7f9a4a');
  // A far stretch of the old wall in front, low and long, with its small raised triangles
  g.fillStyle = c1;
  g.fillRect(0, h0 - 14, FAR_W, 16);
  g.beginPath();
  for (let x = 6; x < FAR_W; x += 14) {
    g.moveTo(x - 3, h0 - 13);
    g.lineTo(x, h0 - 19);
    g.lineTo(x + 3, h0 - 13);
  }
  g.fill();
  // The Harmattan haze, baked on the far shapes only (gold, never grey; KN-R6)
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = KURMI.haze;
  g.fillRect(0, 0, FAR_W, FAR_H);
  g.globalCompositeOperation = 'source-over';
}

/** The far rooftops, trees and wall under the haze, at parallax 0.15; painted once and copied. */
export function drawKurmiFar(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = groundY - 36;
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) kanoStrip(g, farLayer, 'kurmiFar', t * FAR_W - par, base - FAR_H, FAR_W, FAR_H, paintFar);
}

/* ------------------------------------------------------------------ the near row (no haze) */

const ROW_TOP = 150;
const ROW_BASE = 264;
const UNITS = [140, 110, 130, 110, 140, 130] as const;
export const KURMI_TILE_W = UNITS.reduce((a, b) => a + b, 0);
const rowLayer: KanoSlot = { layer: null };

export function bag(g: G, x: number, y: number, col: string): void {
  g.strokeStyle = '#5a3a22';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y + 2, 3.2, Math.PI, TAU);
  g.stroke();
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(x - 5, y + 2, 10, 9, 2);
  g.fill();
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = KANO.cream;
  g.fillRect(x - 3, y + 5, 6, 1.4);
}

function pouf(g: G, x: number, base: number, col: string, trim: string): void {
  g.fillStyle = col;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(x, base - 5, 9, 5.5, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = trim;
  for (const dx of [-5, 0, 5]) {
    g.beginPath();
    g.moveTo(dx + x - 2, base - 4);
    g.lineTo(dx + x, base - 8);
    g.lineTo(dx + x + 2, base - 4);
    g.fill();
  }
}

function sandal(g: G, x: number, y: number, col: string): void {
  g.fillStyle = '#7a4a2a';
  g.beginPath();
  g.ellipse(x, y, 2.6, 5, 0, 0, TAU);
  g.ellipse(x + 6, y, 2.6, 5, 0, 0, TAU);
  g.fill();
  g.fillStyle = col;
  g.fillRect(x - 2.6, y - 2, 5.2, 2);
  g.fillRect(x + 3.4, y - 2, 5.2, 2);
}

function tyre(g: G, x: number, y: number, r: number): void {
  disc(g, x, y, r, '#2e2e33', 1);
  disc(g, x, y, r * 0.45, '#8a8a8e');
}

function paintRow(g: G): void {
  const b = ROW_TOP;
  let x = 0;
  // 1. FINE LEATHER: earth-red house, a mat awning, bags on a rail, poufs at the door
  house(g, x + 6, b, 128, 92, '#c8683f', '#e08a5c', '#984a2a');
  box(g, x + 44, b - 50, 40, 50, '#5a3826');
  box(g, x + 14, b - 64, 24, 14, '#4a3a5a');
  box(g, x + 92, b - 64, 24, 14, '#4a3a5a');
  box(g, x + 26, b - 58, 76, 6, '#d8b07a', 1);
  board(g, x + 70, b - 84, 70, KURMI_SIGNS[0]);
  g.fillStyle = '#6b4a2b';
  g.fillRect(x + 10, b - 46, 30, 2);
  bag(g, x + 16, b - 46, '#a5683e');
  bag(g, x + 30, b - 46, KANO.indigo);
  pouf(g, x + 98, b, '#b86a38', KANO.cream);
  pouf(g, x + 118, b, '#2c6a7a', KANO.yellow);
  x += UNITS[0];
  // 2. A round earth building with a small window, a neem beside it
  neem(g, x + 92, b, 1, '#5e8a3c');
  roundHouse(g, x + 48, b, 36, 70, '#d29a6a', '#e6b688', '#a8704a');
  box(g, x + 38, b - 46, 14, 12, '#5a3826');
  box(g, x + 40, b - 26, 18, 26, '#7a4a2a');
  x += UNITS[1];
  // 3. SANDALS: tan house, a rack board of sandal pairs
  house(g, x + 4, b, 122, 84, '#d2a86a', '#e8c48c', '#a8804a');
  board(g, x + 64, b - 78, 56, KURMI_SIGNS[1]);
  box(g, x + 16, b - 58, 56, 40, '#8a6a4a');
  const cols = [KANO.yellow, '#e0572b', '#1aa39a', KANO.indigo];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) sandal(g, x + 22 + c * 13, b - 50 + r * 12, cols[(r + c) % 4]!);
  box(g, x + 84, b - 46, 28, 46, '#6a4a30');
  x += UNITS[2];
  // 4. POS HERE: a small kiosk with a counter window, a neem for shade
  neem(g, x + 18, b, 1.15, '#5e8a3c');
  box(g, x + 42, b - 62, 56, 62, '#f2e2bf');
  box(g, x + 42, b - 66, 56, 6, KANO.yellow);
  box(g, x + 50, b - 46, 40, 20, '#4a6a8a');
  box(g, x + 46, b - 26, 48, 4, '#8a6a4a');
  board(g, x + 70, b - 82, 50, KURMI_SIGNS[2], KANO.yellow);
  box(g, x + 64, b - 42, 9, 13, '#2a2a33', 1);
  box(g, x + 66, b - 40, 5, 6, '#9ad0f0', 0);
  x += UNITS[3];
  // 5. PROVISIONS: cream house, a window of tins, packets and bottles on shelves
  house(g, x + 6, b, 128, 90, '#e6cfa0', '#f6e4bc', '#b89a6a');
  board(g, x + 70, b - 84, 66, KURMI_SIGNS[3]);
  box(g, x + 14, b - 62, 62, 38, '#7a5a3a');
  const goods = ['#e0572b', KANO.yellow, '#2b59c3', '#f6f4ee', '#1aa39a', '#f08a24', '#7d3c98'];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) box(g, x + 17 + c * 8.4, b - 58 + r * 17, 6, 12, goods[(c + r * 3) % 7]!, 0.8);
  box(g, x + 90, b - 50, 32, 50, '#5a3826');
  x += UNITS[4];
  // 6. VULCANIZER: an open shed, a zinc roof, stacked tyres and the air pump
  box(g, x + 10, b - 66, 4, 66, '#6b4a2b');
  box(g, x + 116, b - 66, 4, 66, '#6b4a2b');
  g.fillStyle = '#a7a9a8';
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 2, b - 62);
  g.lineTo(x + 128, b - 70);
  g.lineTo(x + 128, b - 64);
  g.lineTo(x + 2, b - 56);
  g.closePath();
  g.fill();
  g.stroke();
  board(g, x + 65, b - 88, 66, KURMI_SIGNS[4], KANO.yellow);
  for (const [tx, ty] of [[30, -9], [30, -27], [30, -45], [52, -9], [52, -27]] as const) tyre(g, x + tx, b + ty, 9);
  box(g, x + 76, b - 22, 26, 18, '#2b59c3');
  disc(g, x + 82, b - 3, 3.5, '#2e2e33');
  disc(g, x + 96, b - 3, 3.5, '#2e2e33');
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x + 102, b - 16);
  g.quadraticCurveTo(x + 116, b - 4, x + 110, b - 2);
  g.stroke();
}

/** Kurmi's near row at half camera speed, with the sandy pavement and drifted sand down to the road. */
export function drawKurmiRow(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = ROW_BASE - (GROUND - groundY);
  g.fillStyle = KURMI.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = KURMI.paveTop;
  g.fillRect(0, base, viewW, 3);
  // Drifted sand along the road edge (look only), scrolling with the road
  g.fillStyle = KURMI.sand;
  const off = camX % 120;
  g.beginPath();
  for (let px = -off - 60; px < viewW + 60; px += 120) {
    g.ellipse(px, groundY - 1, 34, 4.5, 0, Math.PI, TAU);
    g.ellipse(px + 62, groundY - 1, 20, 3, 0, Math.PI, TAU);
  }
  g.fill();
  const par = camX * 0.5;
  for (let t = Math.floor(par / KURMI_TILE_W); t * KURMI_TILE_W - par < viewW; t++) kanoStrip(g, rowLayer, 'kurmiRow', t * KURMI_TILE_W - par, base - ROW_TOP, KURMI_TILE_W, ROW_TOP, paintRow);
}

/** How the wind shows on the backdrop now: windShow(level.wind, hero x). */
export interface KurmiWindNow {
  dir: WindDir | null;
  k: number;
}

/**
 * Every screen-space layer behind Kurmi's road, back to front: the sky, the hazed far rooftops,
 * the dust streaks while in (or near) a wind stretch, the near row and the pavement.
 */
export function drawKurmiBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND, still = false, wind?: KurmiWindNow): void {
  drawKurmiSky(g, viewW, viewH);
  drawKurmiFar(g, camX, viewW, groundY);
  if (wind?.dir && wind.k > 0) drawDustStreaks(g, viewW, wind.dir, wind.k, time, still, camX);
  drawKurmiRow(g, camX, viewW, groundY);
}

/* ------------------------------------------------------------------ platforms and stalls */

/**
 * World space: Kurmi's roof platform, a leather seller's shade. A flat woven-mat roof whose top
 * edge is exactly topY (the landing line), wooden posts, belts and bags hanging from its edge.
 */
export function drawKurmiStall(g: G, x: number, topY: number, w: number, groundY = GROUND): void {
  g.save();
  g.lineJoin = 'round';
  for (const px of [x + 4, x + w - 8]) box(g, px, topY + 6, 4, groundY - topY - 6, '#7b5a3a');
  box(g, x, topY, w, 7, '#d8b07a');
  g.strokeStyle = '#a8804a';
  g.lineWidth = 1;
  g.beginPath();
  for (let px = x + 6; px < x + w - 2; px += 8) {
    g.moveTo(px, topY + 1.5);
    g.lineTo(px - 3, topY + 5.5);
  }
  g.stroke();
  const hung = ['#a5683e', KANO.indigo, '#6e3a22', '#2c6a7a'];
  for (let i = 0, px = x + 18; px < x + w - 14; px += 22, i++) {
    if (i % 2) bag(g, px, topY + 7, hung[i % 4]!);
    else box(g, px - 1.5, topY + 7, 3, 16, hung[i % 4]!, 0.8);
  }
  g.restore();
}

/** Kurmi's three traders (part 7), in the order of KANO_WORDS.folk.traders.kurmi. */
export const KURMI_TRADERS = ['leather', 'sandals', 'kosai'] as const;
export type KurmiTrader = (typeof KURMI_TRADERS)[number];
/** Each stall's board, matching its trader's call ("Fine leather!", "New sandals!", "Hot kosai!"). */
export const KURMI_STALL_WORDS: Readonly<Record<KurmiTrader, string>> = { leather: 'FINE LEATHER', sandals: 'NEW SANDALS', kosai: 'HOT KOSAI' };

/**
 * World space, scenery behind the walking line. x is the stall's middle; the trader stands just
 * in front of it. About 56 u wide, 60 u tall. The kosai pan sits on a closed stove: steam only,
 * never a flame.
 */
export function drawKurmiTraderStall(g: G, kind: KurmiTrader, x: number, groundY = GROUND, time = 0): void {
  const t = Number.isFinite(time) ? time : 0;
  g.save();
  g.translate(x, groundY);
  g.lineJoin = 'round';
  if (kind !== 'kosai') {
    box(g, -26, -20, 52, 4, '#7b5a3a');
    box(g, -22, -16, 3, 16, '#7b5a3a', 0);
    box(g, 19, -16, 3, 16, '#7b5a3a', 0);
    box(g, -24, -52, 48, 2.5, '#6b4a2b', 0);
  }
  if (kind === 'leather') {
    bag(g, -16, -52, '#a5683e');
    bag(g, -3, -52, KANO.indigo);
    bag(g, 10, -52, '#6e3a22');
    pouf(g, -12, -20, '#b86a38', KANO.cream);
    pouf(g, 10, -20, '#2c6a7a', KANO.yellow);
  } else if (kind === 'sandals') {
    for (let i = 0; i < 3; i++) sandal(g, -18 + i * 14, -44, [KANO.yellow, '#e0572b', '#1aa39a'][i]!);
    box(g, -24, -24, 48, 4, '#d8b07a', 0.8);
    for (let i = 0; i < 4; i++) sandal(g, -21 + i * 11.5, -26, [KANO.indigo, KANO.yellow, '#6e3a22', '#e0572b'][i]!);
  } else {
    // A closed metal stove, a wide pan of golden kosai, a bowl of batter, a tray of kosai; steam only
    box(g, -22, -18, 26, 18, '#4a4a50');
    box(g, -20, -15, 22, 3, '#6a6a70', 0);
    g.fillStyle = '#2e2e33';
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(-9, -19, 17, 4.5, 0, 0, Math.PI);
    g.closePath();
    g.fill();
    g.stroke();
    for (const kx of [-18, -11, -4, 2]) disc(g, kx, -21, 3, '#d99a3a', 0.8);
    box(g, 8, -14, 18, 14, '#1aa39a');
    g.fillStyle = '#f2e2bf';
    g.beginPath();
    g.ellipse(17, -14, 8, 2.6, 0, 0, TAU);
    g.fill();
    box(g, 4, -28, 22, 3, '#8a6a4a', 0.8);
    for (const kx of [8, 14, 20]) disc(g, kx, -30.5, 2.6, '#d99a3a', 0.8);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.3;
    g.lineCap = 'round';
    for (const [sx, ph] of [[-14, 0], [-4, 1.7]] as const) {
      const sw = Math.sin(t * 3 + ph);
      g.beginPath();
      g.moveTo(sx, -26);
      g.quadraticCurveTo(sx - 3 + sw, -31, sx + sw, -37);
      g.stroke();
    }
  }
  box(g, 28, -42, 3, 42, '#6b4a2b', 0);
  board(g, 6, -60, 54, KURMI_STALL_WORDS[kind]);
  g.restore();
}

/**
 * World space: a child's rolling hoop, our own plain ring with one bright tape band that turns as
 * it rolls (part 7: two children rolling a hoop, a parent close by). x is where it touches the
 * ground; it rolls to +x as x grows. still: the band holds.
 */
export function drawHoop(g: G, x: number, groundY = GROUND, time = 0, still = false): void {
  const r = 8;
  const a = still || !Number.isFinite(time) ? 0 : time * 6;
  g.save();
  g.translate(x, groundY - r - 0.5);
  g.lineWidth = 2.2;
  g.strokeStyle = '#8a5a2a';
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.stroke();
  g.strokeStyle = KANO.yellow;
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(0, 0, r, a, a + 0.9);
  g.stroke();
  g.restore();
}

/* ------------------------------------------------------------------ kilishi (4.1) */

/** Thin dark spiced strips folded in paper, centred near (0, 0), about 28 u across. */
function kilishiPack(g: G): void {
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  // Three strips fanning out of the paper, thin and dark with a lighter edge and spice flecks
  const strips: [number, number, number][] = [[-7, -12, -0.35], [0, -14, 0], [7, -12, 0.35]];
  for (const [sx, sy, rot] of strips) {
    g.save();
    g.translate(sx * 0.6, 2);
    g.rotate(rot);
    g.fillStyle = '#6e2b18';
    g.beginPath();
    g.roundRect(-3, sy, 6, 14 - sy, 1.5);
    g.fill();
    g.stroke();
    g.fillStyle = '#a24e2a';
    g.fillRect(-2, sy + 1.5, 1.4, -sy - 2);
    g.fillStyle = '#e3b066';
    for (let k = 0; k < 3; k++) g.fillRect(0.4, sy + 2.5 + k * 3.4, 1.2, 1.2);
    g.restore();
  }
  // The paper, folded round the strips: a front flap with a fold line and a tucked corner
  g.fillStyle = '#f4e4c0';
  g.beginPath();
  g.moveTo(-11, -1);
  g.lineTo(11, -1);
  g.lineTo(8, 11);
  g.lineTo(-8, 11);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#e2cb9a';
  g.beginPath();
  g.moveTo(-11, -1);
  g.lineTo(0, 5);
  g.lineTo(11, -1);
  g.closePath();
  g.fill();
  g.stroke();
}

/** World space: kilishi on the road, gently bobbing on a soft halo. Pass time 0 to hold still. */
export function drawKilishi(g: G, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  const bob = Math.sin(t * 4) * 2;
  disc(g, x, y + bob, 18, 'rgba(255,248,220,0.7)');
  g.save();
  g.translate(x, y + bob);
  g.scale(1.15, 1.15);
  kilishiPack(g);
  g.restore();
}

/** The pack alone (HUD chip, toast): size 1 is about 32 u across, as drawFoodIcon. Still. */
export function drawKilishiIcon(g: G, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y + 0.5 * size);
  g.scale(size * 1.1, size * 1.1);
  kilishiPack(g);
  g.restore();
}

/* ------------------------------------------------------------------ people (part 7) */

const AGES: Record<string, FolkAge> = { c: 'child', t: 'teen', a: 'adult', e: 'elder' };
/** One look: skin, age letter, sex, body, hair, headwear, dress, cloth a, cloth b, then options. */
export function look(skin: number, age: string, sex: 'm' | 'f', body: 'slim' | 'medium' | 'round', hair: FolkHair, head: FolkHeadwear, dress: FolkDress, a: string, b: string, o: Partial<FolkLook> & { hold?: FolkHold } = {}): FolkLook {
  return { skin, age: AGES[age] ?? 'adult', sex, body, hair, head, dress, a, b, ...o };
}

/**
 * Kurmi's cast (part 7, clothes as 2.4): 16 looks, every skin tone at least twice, every age, a
 * wheelchair user, glasses, dress from across Nigeria. The leather, sandal and kosai sellers; a man
 * in a kaftan and hula cap reading a newspaper (no words you can read); a woman in a wrapper and
 * head shawl with shopping; two students; traders from other states side by side (isiagu, iro and
 * buba with gele); two children with a hoop and a parent close by; elders standing tall (no
 * walking stick, decision 21); a wheelchair user; a young man on his phone. Caps never red; no
 * uniform, helmet, held broom or dress used as a sign of faith.
 */
export const KURMI_CAST: readonly FolkLook[] = [
  look(4, 'a', 'm', 'medium', 'lowcut', 'kaftanCap', 'kaftan', '#efe6d2', '#6b4a2b', { h: '#2b59c3', hold: 'handbag' }),
  look(2, 'a', 'f', 'slim', 'braids', 'headscarf', 'wrapperBlouse', '#1aa39a', '#f2b300', { h: '#f2b300', hold: 'box' }),
  look(6, 'a', 'f', 'round', 'cornrows', 'headscarf', 'wrapperBlouse', '#f08a24', '#3b5a8a', { h: '#3b5a8a', hold: 'plate' }),
  look(3, 'a', 'm', 'slim', 'lowcut', 'kaftanCap', 'kaftan', '#f6f4ee', '#d8b384', { h: '#3f8f4a', hold: 'paper' }),
  look(5, 'a', 'f', 'medium', 'bun', 'headscarf', 'wrapperBlouse', '#7d3c98', '#f4ead2', { h: '#a98bd6', hold: 'marketBag' }),
  look(1, 't', 'f', 'slim', 'braids', 'none', 'school', '#2f6fd6', '#f6f4ee', { hold: 'schoolBag' }),
  look(4, 't', 'm', 'slim', 'lowcut', 'none', 'school', '#2f6fd6', '#f6f4ee', { hold: 'backpack' }),
  look(0, 'a', 'm', 'round', 'lowcut', 'none', 'isiagu', '#2a2a33', '#f2b300', { hold: 'box' }),
  look(3, 'a', 'f', 'medium', 'cornrows', 'gele', 'iroBuba', '#2b59c3', '#f2b300', { h: '#f2b300', hold: 'ankaraRoll' }),
  look(2, 'c', 'm', 'slim', 'afro', 'none', 'jeansTee', '#f2b300', '#3b5a8a'),
  look(6, 'c', 'f', 'slim', 'puffs', 'none', 'jeansTee', '#d6336c', '#f6f4ee'),
  look(6, 'a', 'm', 'medium', 'lowcut', 'none', 'shirtTrousers', '#5aa9e6', '#2a2a33'),
  look(1, 'e', 'm', 'slim', 'grey', 'kaftanCap', 'babbanRiga', '#f6f4ee', '#3b5a8a', { h: '#1aa39a', beard: true, glasses: true }),
  look(0, 'e', 'f', 'medium', 'grey', 'headscarf', 'wrapperBlouse', '#3f8f4a', '#f4ead2', { h: '#f4ead2', hold: 'basket' }),
  look(5, 'a', 'f', 'slim', 'braids', 'none', 'jeansTee', '#1aa39a', '#2a2a33', { chair: true, hold: 'phone' }),
  look(2, 'a', 'm', 'slim', 'lowcut', 'kaftanCap', 'kaftan', '#3b5a8a', '#f6f4ee', { h: '#f6f4ee', hold: 'phone' }),
];

/** The traders in KURMI_CAST, by stall: they hold up their goods and call their own line. */
export const KURMI_TRADER_LOOKS: Readonly<Record<KurmiTrader, FolkLook>> = { leather: KURMI_CAST[0]!, sandals: KURMI_CAST[1]!, kosai: KURMI_CAST[2]! };
/** The man reading the newspaper (no words you can read on it). */
export const KURMI_READER: FolkLook = KURMI_CAST[3]!;
/** The two children with the hoop, and the parent close by (never a child alone). */
export const KURMI_HOOP: readonly [FolkLook, FolkLook, FolkLook] = [KURMI_CAST[9]!, KURMI_CAST[10]!, KURMI_CAST[11]!];
/** Three people waiting at the bus stop. */
export const KURMI_BUS_STOP: readonly FolkLook[] = [KURMI_CAST[12]!, KURMI_CAST[4]!, KURMI_CAST[15]!];

/* ------------------------------------------------------------------ the street tune (2.6) */

const KURMI_CHORDS = ['A', 'D', 'A', 'E', 'F#m', 'D', 'E', 'A'] as const;
const LUTE: Record<string, string> = {
  A: '. . A3 . E3 . C#4 . . . A3 . E3 . C#4 .',
  D: '. . D4 . A3 . F#4 . . . D4 . A3 . F#4 .',
  E: '. . E4 . B3 . G#3 . . . E4 . B3 . G#3 .',
  'F#m': '. . F#3 . C#4 . A3 . . . F#3 . C#4 . A3 .',
};
const ROOT: Record<string, string> = { A: 'A2', D: 'D2', E: 'E2', 'F#m': 'F#2' };

/**
 * Kurmi's street tune: our own bright walking tune in A major at 114 BPM, 8 bars, looping. A
 * kalangu-style talking drum ("pom, pa-pom"), a shaker, a plucked lute line (the guitar voice) and a
 * light high lead (the kalimba voice stands in for the flute, as the welcome tune). Never a known
 * song, praise song, chant or court music.
 */
export const KURMI_TUNE: Tune = {
  name: 'kano-kurmi',
  bpm: [114],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  chords: KURMI_CHORDS,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.5,
      bars: [
        'E5 . C#5 . . F#5 - . E5 . . C#5 B4 - . .',
        'A4 . . D5 . F#5 - . E5 . B4 . . . . .',
        'C#5 . E5 . A5 - . . G#5 . E5 . C#5 - . .',
        'B4 - . . G#4 . B4 . E5 - - . . . . .',
        'A5 . E5 . C#5 . . A4 . . C#5 . F#5 - . .',
        'D5 - . F#5 . A5 . F#5 - . E5 . D5 . . .',
        'E5 . G#5 . B5 - . G#5 . E5 . . B4 . . .',
        'A4 - - . C#5 . E5 . A4 - - - . . . .',
      ],
    },
    { inst: 'guitar', vol: 0.4, bars: KURMI_CHORDS.map((c) => LUTE[c]!) },
    { inst: 'bass', vol: 0.6, bars: KURMI_CHORDS.map((c) => `${ROOT[c]} - . . . . ${ROOT[c]} . . . ${ROOT[c]} . . . . .`) },
    { inst: 'drum', vol: 0.65, bars: KURMI_CHORDS.map(() => 'A2 . . E3 . . . . A2 . . . E3 . . .') },
    { inst: 'shekere', vol: 0.32, bars: KURMI_CHORDS.map(() => 'X . x x X . x . X . x x X . x .') },
  ],
};
