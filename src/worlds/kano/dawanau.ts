/**
 * K4a: Dawanau, Kano street 3 (docs/kano.md 2.2, 2.3, 3.6 and 7). Evening at the grain market,
 * gold light through the haze: a grain store, a yard with a mountain of sacks, groundnut heaps,
 * a lorry being loaded, kuli-kuli and groundnut oil, beans, a vulcanizer. Far off, under the haze,
 * our own small groundnut pyramid (KN-R5). Made-up everyday signs only. No palace, no title-holder,
 * no script, nothing religious, no real building, lorry or brand.
 *
 * - The backdrop: the evening sky with a low sun, the far rooftops, sack heaps and pyramid under a
 *   gold haze (far strip only, KN-R6), the near row (no haze) and the pavement. Baked once, copied.
 * - The roof platform (a grain seller's mat shade), the three traders' stalls, the open grain sacks
 *   with their measuring bowls, the oil table, the driver's tea box, a sack on a porter's head pad.
 * - Dawanau's cast (part 7; drawn by the people kit, style.md 1.8) and its street tune.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { FolkLook } from '../../art/folk';
import type { Tune } from '../../art/tunes';
import { KANO, KANO_INK as INK } from './gate';
import { kanoBlit, kanoStrip, type KanoSlot } from './layer';
import { board, box, disc, house, look, neem, roundHouse, type KurmiWindNow } from './kurmi';
import { SACK, drawGroundnutPyramid, sack } from './sacks';
import { drawDustStreaks } from './wind';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
const GROUND = 300;

/** Dawanau's colours: a warm gold evening (kano.md 2.5); the haze is gold, never grey. */
export const DAWANAU = {
  skyTop: '#86a9d6',
  skyMid: '#f1bf86',
  skyLow: '#f8d9a2',
  sun: '#ffe7a8',
  sunRing: 'rgba(255,214,140,0.55)',
  haze: 'rgba(244,196,120,0.5)',
  far: ['#bd8a6a', '#a8765a', '#c99c78'] as readonly string[],
  pave: '#d4b07a',
  paveTop: '#b8925a',
  sand: '#e6c992',
} as const;

/** Every word painted on Dawanau's row (made-up everyday shop words, KN-R3). */
export const DAWANAU_SIGNS = ['GRAIN', 'GROUNDNUT', 'KULI-KULI', 'BEANS', 'VULCANIZER'] as const;

/** What an open sack holds: its heap colour and its grain spots. */
export const GRAIN = {
  millet: ['#e8d08a', '#c9ae5e'],
  sorghum: ['#b5582e', '#8a3e20'],
  maize: ['#f2c032', '#d49a1a'],
  beans: ['#f1e8d6', '#a8916a'],
  groundnut: ['#c98d4e', '#9a6332'],
} as const;
export type GrainKind = keyof typeof GRAIN;

/* ------------------------------------------------------------------ sky and far strip */

const skyLayer: KanoSlot = { layer: null };
const farLayer: KanoSlot = { layer: null };
const rowLayer: KanoSlot = { layer: null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, DAWANAU.skyTop);
  grad.addColorStop(0.55, DAWANAU.skyMid);
  grad.addColorStop(1, DAWANAU.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // The low evening sun, big and soft, going down behind the market
  disc(g, w * 0.78, h * 0.62, 34, DAWANAU.sunRing);
  disc(g, w * 0.78, h * 0.62, 22, DAWANAU.sun);
}

/** The evening sky. Screen space, painted once and copied. */
export function drawDawanauSky(g: G, viewW: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (kanoBlit(g, skyLayer, `dawanauSky${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = DAWANAU.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
}

const FAR_W = 760;
const FAR_H = 160;

function paintFar(g: G): void {
  const h0 = FAR_H - 60;
  g.fillStyle = '#d3a874';
  g.fillRect(0, h0, FAR_W, FAR_H - h0);
  for (const [x, s] of [[30, 1.3], [250, 1.1], [690, 1.4]] as const) neem(g, x, h0 + 4, s, '#6f8f45');
  // Far rooftops with small raised corners
  for (let i = 0, x = 70; x < FAR_W - 30; i++) {
    const w = 38 + ((i * 29) % 34);
    const h = 30 + ((i * 17) % 28);
    if (x > 360 && x < 500) {
      x = 500;
      continue;
    }
    g.fillStyle = DAWANAU.far[i % 3]!;
    g.fillRect(x, h0 - h, w, h);
    g.fillRect(x, h0 - h - 6, 4, 6);
    g.fillRect(x + w - 4, h0 - h - 6, 4, 6);
    g.fillStyle = 'rgba(70,40,25,0.35)';
    g.fillRect(x + w * 0.4, h0 - h * 0.55, 4, 5);
    x += w + 26 + ((i * 13) % 22);
  }
  // The groundnut pyramid far off, with low heaps of sacks round it under tarps
  drawGroundnutPyramid(g, 430, h0, 0.8);
  for (const [x, w] of [[372, 30], [492, 36], [180, 40]] as const) {
    g.fillStyle = SACK.dark;
    g.beginPath();
    g.ellipse(x, h0, w / 2, 14, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#5f7a8e';
    g.beginPath();
    g.ellipse(x, h0 - 4, w / 2 - 3, 9, 0, Math.PI, TAU);
    g.fill();
  }
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = DAWANAU.haze;
  g.fillRect(0, 0, FAR_W, FAR_H);
  g.globalCompositeOperation = 'source-over';
}

/** The far rooftops, sack heaps and pyramid under the haze, at parallax 0.15; painted once and copied. */
export function drawDawanauFar(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = groundY - 36;
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) kanoStrip(g, farLayer, 'dawanauFar', t * FAR_W - par, base - FAR_H, FAR_W, FAR_H, paintFar);
}

/* ------------------------------------------------------------------ the near row */

const ROW_TOP = 150;
const ROW_BASE = 264;
const UNITS = [130, 120, 110, 170, 120, 120, 110] as const;
export const DAWANAU_TILE_W = UNITS.reduce((a, b) => a + b, 0);

/**
 * World or row units: an open sack standing up, its rim rolled down, a heap of grain on top and a
 * small enamel measuring bowl in the heap. Its bottom middle at (x, base), about 22 wide.
 */
export function grainSack(g: G, x: number, base: number, kind: GrainKind, bowl = true, s = 1): void {
  const [heap, spot] = GRAIN[kind];
  g.save();
  g.translate(x, base);
  g.scale(s, s);
  g.fillStyle = SACK.body;
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(-10, 0);
  g.quadraticCurveTo(-12, -9, -9, -17);
  g.lineTo(9, -17);
  g.quadraticCurveTo(12, -9, 10, 0);
  g.closePath();
  g.fill();
  g.stroke();
  // The heap of grain, then the rolled rim in front of it
  g.fillStyle = heap;
  g.beginPath();
  g.ellipse(0, -18, 9, 5, 0, Math.PI, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = spot;
  for (const [dx, dy] of [[-4, -19], [1, -21], [4, -18.5], [-1, -18]] as const) g.fillRect(dx, dy, 1.4, 1.4);
  box(g, -10, -18.5, 20, 3.5, SACK.light, 1);
  if (bowl) {
    g.fillStyle = '#f4f1e6';
    g.beginPath();
    g.ellipse(5, -21.5, 4, 2.6, 0, 0, Math.PI);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = KANO.indigo;
    g.fillRect(1.4, -21.6, 7.2, 0.9);
  }
  g.restore();
}

/** A plain bottle of golden groundnut oil (no label), bottom middle at (x, base). */
function bottle(g: G, x: number, base: number): void {
  g.fillStyle = '#e8b830';
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.beginPath();
  g.roundRect(x - 3, base - 11, 6, 11, 1.5);
  g.rect(x - 1.2, base - 14, 2.4, 3);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff3c4';
  g.fillRect(x - 2, base - 9, 1, 6);
  g.fillStyle = '#3f8f4a';
  g.fillRect(x - 1.4, base - 15.5, 2.8, 1.6);
}

/** A row of kuli-kuli rings on a tray (our own drawing). */
function kuli(g: G, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    disc(g, x + i * 7, y, 3, '#9a5a2a', 0.8);
    disc(g, x + i * 7, y, 1, '#e8c58c');
  }
}

/** The lorry being loaded: our own flat-bed lorry (no maker's look, no words), sacks on its bed. */
function lorry(g: G, x: number, b: number): void {
  // The bed and its load
  box(g, x + 6, b - 30, 104, 8, '#7b5a3a');
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) sack(g, x + 10 + i * 25 + (r % 2) * 12, b - 46 - r * 15, 24, 15, SACK.bands[(r + i) % 3]!, i % 2 === 0);
  // The cab: rounded front, a window, a lamp, a bumper
  g.fillStyle = '#2f6fd6';
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 112, b - 14);
  g.lineTo(x + 112, b - 60);
  g.lineTo(x + 146, b - 60);
  g.quadraticCurveTo(x + 160, b - 56, x + 162, b - 34);
  g.lineTo(x + 162, b - 14);
  g.closePath();
  g.fill();
  g.stroke();
  box(g, x + 128, b - 55, 24, 17, '#cfe6f5', 1);
  box(g, x + 116, b - 34, 10, 2, '#1d4f9a', 0);
  box(g, x + 156, b - 26, 6, 5, '#fff3c4', 0.8);
  box(g, x + 108, b - 16, 56, 4, '#9aa2a8', 1);
  // Wheels and a plank ramp to the ground
  for (const wx of [30, 86, 142]) {
    disc(g, x + wx, b - 8, 9, '#2a2a33', 1.2);
    disc(g, x + wx, b - 8, 3.5, '#b8bec4');
  }
  g.strokeStyle = '#8a6440';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x + 8, b - 28);
  g.lineTo(x - 8, b - 1);
  g.stroke();
}

function paintRow(g: G): void {
  const b = ROW_TOP;
  let x = 0;
  // 1. GRAIN: an earth store, its doorway full of sacks, open sacks of four grains in front
  house(g, x + 6, b, 120, 92, '#c8683f', '#e08a5c', '#984a2a');
  board(g, x + 66, b - 86, 50, DAWANAU_SIGNS[0]);
  box(g, x + 16, b - 66, 56, 52, '#5a3826');
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) sack(g, x + 18 + i * 26 + (r % 2) * 4, b - 30 - r * 16, 24, 15, SACK.bands[(r + i) % 3]!);
  (['millet', 'sorghum', 'maize'] as const).forEach((k, i) => grainSack(g, x + 86 + i * 14, b, k, i === 1, 0.7));
  x += UNITS[0];
  // 2. An open yard: a mountain of sacks under a tarp, a measuring bowl on a stool
  for (let r = 0; r < 4; r++) {
    const n = 4 - r;
    for (let i = 0; i < n; i++) sack(g, x + 10 + r * 13 + i * 26, b - (r + 1) * 17, 25, 17, SACK.bands[(r + i) % 3]!, i % 2 === 0);
  }
  g.fillStyle = '#5f7a8e';
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 46, b - 72);
  g.quadraticCurveTo(x + 64, b - 80, x + 86, b - 70);
  g.lineTo(x + 96, b - 52);
  g.lineTo(x + 38, b - 52);
  g.closePath();
  g.fill();
  g.stroke();
  neem(g, x + 112, b, 1, '#5e8a3c');
  x += UNITS[1];
  // 3. GROUNDNUT: a round earth building, basins piled with groundnuts by the door
  roundHouse(g, x + 55, b, 48, 76, '#d29a6a', '#e6b688', '#a8704a');
  board(g, x + 55, b - 92, 62, DAWANAU_SIGNS[1]);
  box(g, x + 44, b - 46, 22, 46, '#5a3826');
  for (const bx of [22, 88]) grainSack(g, x + bx, b, 'groundnut', bx === 22, 0.8);
  x += UNITS[2];
  // 4. The lorry, loaded by the porters (the porters are the cast's, on the pavement)
  lorry(g, x + 4, b);
  x += UNITS[3];
  // 5. KULI-KULI: a tan house, a table of kuli-kuli rings and plain bottles of groundnut oil
  house(g, x + 4, b, 112, 84, '#d2a86a', '#e8c48c', '#a8804a');
  board(g, x + 60, b - 78, 56, DAWANAU_SIGNS[2]);
  box(g, x + 80, b - 46, 26, 46, '#6a4a30');
  box(g, x + 10, b - 26, 64, 4, '#8a6a4a');
  box(g, x + 14, b - 22, 3, 22, '#7b5a3a', 0);
  box(g, x + 67, b - 22, 3, 22, '#7b5a3a', 0);
  kuli(g, x + 16, b - 29, 4);
  for (let i = 0; i < 3; i++) bottle(g, x + 50 + i * 8, b - 26);
  x += UNITS[4];
  // 6. BEANS: a mat shade on poles over open sacks of white and brown beans
  box(g, x + 10, b - 62, 4, 62, '#6b4a2b', 0);
  box(g, x + 104, b - 62, 4, 62, '#6b4a2b', 0);
  box(g, x + 4, b - 66, 110, 7, '#d8b07a');
  board(g, x + 59, b - 84, 44, DAWANAU_SIGNS[3], KANO.yellow);
  (['beans', 'sorghum', 'beans', 'millet'] as const).forEach((k, i) => grainSack(g, x + 26 + i * 22, b, k, i === 2, 0.85));
  x += UNITS[5];
  // 7. VULCANIZER: a small shed, tyres stacked, a pump on its wheels
  house(g, x + 6, b, 96, 70, '#e6cfa0', '#f6e4bc', '#b89a6a');
  board(g, x + 54, b - 64, 64, DAWANAU_SIGNS[4]);
  box(g, x + 14, b - 48, 40, 48, '#4a3424');
  for (let i = 0; i < 3; i++) {
    g.fillStyle = '#2a2a33';
    g.beginPath();
    g.ellipse(x + 76, b - 5 - i * 9, 13, 4.5, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#8a8a8a';
    g.lineWidth = 1;
    g.stroke();
  }
  box(g, x + 22, b - 14, 16, 10, '#d23b2a', 1);
}

/** Dawanau's near row at half camera speed, with the pavement and a little drifted sand. */
export function drawDawanauRow(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = ROW_BASE - (GROUND - groundY);
  g.fillStyle = DAWANAU.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = DAWANAU.paveTop;
  g.fillRect(0, base, viewW, 3);
  g.fillStyle = DAWANAU.sand;
  const off = camX % 160;
  g.beginPath();
  for (let px = -off - 80; px < viewW + 80; px += 160) g.ellipse(px, groundY - 1, 28, 3.5, 0, Math.PI, TAU);
  g.fill();
  const par = camX * 0.5;
  for (let t = Math.floor(par / DAWANAU_TILE_W); t * DAWANAU_TILE_W - par < viewW; t++) kanoStrip(g, rowLayer, 'dawanauRow', t * DAWANAU_TILE_W - par, base - ROW_TOP, DAWANAU_TILE_W, ROW_TOP, paintRow);
}

/** Every screen-space layer behind Dawanau's road, back to front (the wind's streaks as on Kurmi). */
export function drawDawanauBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND, still = false, wind?: KurmiWindNow): void {
  drawDawanauSky(g, viewW, viewH);
  drawDawanauFar(g, camX, viewW, groundY);
  if (wind?.dir && wind.k > 0) drawDustStreaks(g, viewW, wind.dir, wind.k, time, still, camX);
  drawDawanauRow(g, camX, viewW, groundY);
}

/* ------------------------------------------------------------------ roofs, stalls, pieces */

/**
 * World space: Dawanau's roof platform, a grain seller's mat shade. A flat woven-mat roof whose
 * top edge is exactly topY (the landing line), wooden posts, small cloth bags of grain hanging
 * from its edge (well above the hero's head).
 */
export function drawDawanauStall(g: G, x: number, topY: number, w: number, groundY = GROUND): void {
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
  for (let i = 0, px = x + 16; px < x + w - 16; px += 22, i++) {
    g.strokeStyle = '#6b4a2b';
    g.beginPath();
    g.moveTo(px + 5, topY + 7);
    g.lineTo(px + 5, topY + 11);
    g.stroke();
    box(g, px, topY + 11, 10, 11, i % 2 ? SACK.body : KANO.cream, 1);
    g.fillStyle = SACK.bands[i % 3]!;
    g.fillRect(px + 1, topY + 15, 8, 2);
  }
  g.restore();
}

/** Dawanau's three traders (part 7), in the order of KANO_WORDS.folk.traders.dawanau. */
export const DAWANAU_TRADERS = ['groundnut', 'gyada', 'beans'] as const;
export type DawanauTrader = (typeof DAWANAU_TRADERS)[number];
/** Each stall's board, matching its trader's call ("Groundnut dey!", "Ga gyada!", "Good beans!"). */
export const DAWANAU_STALL_WORDS: Readonly<Record<DawanauTrader, string>> = { groundnut: 'GROUNDNUT DEY', gyada: 'GA GYADA', beans: 'GOOD BEANS' };

/**
 * World space, scenery behind the walking line. x is the stall's middle; the trader stands just
 * in front of it. About 56 u wide, 62 u tall.
 */
export function drawDawanauTraderStall(g: G, kind: DawanauTrader, x: number, groundY = GROUND): void {
  g.save();
  g.translate(x, groundY);
  g.lineJoin = 'round';
  if (kind === 'groundnut') {
    grainSack(g, -12, 0, 'groundnut', true);
    grainSack(g, 12, 0, 'groundnut', false, 0.85);
  } else if (kind === 'gyada') {
    // A low table with small paper twists of roasted groundnuts in rows
    box(g, -24, -20, 48, 4, '#7b5a3a');
    box(g, -21, -16, 3, 16, '#7b5a3a', 0);
    box(g, 18, -16, 3, 16, '#7b5a3a', 0);
    for (let i = 0; i < 6; i++) {
      const px = -19 + i * 7.4;
      g.fillStyle = i % 2 ? KANO.cream : '#f3e2bb';
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(px - 3, -20);
      g.lineTo(px, -28);
      g.lineTo(px + 3, -20);
      g.closePath();
      g.fill();
      g.stroke();
      disc(g, px, -27.5, 1.3, GRAIN.groundnut[0]);
    }
  } else {
    grainSack(g, -14, 0, 'beans', true);
    grainSack(g, 9, 0, 'beans', false, 0.8);
    disc(g, 9, -15.5, 1.2, GRAIN.beans[1]);
  }
  box(g, 28, -44, 3, 44, '#6b4a2b', 0);
  board(g, 6, -62, 62, DAWANAU_STALL_WORDS[kind]);
  g.restore();
}

/** The grain traders' spot: an open sack, its trader standing at x + GRAIN_SPOT.trader, facing it. */
export const GRAIN_SPOT = { trader: -20, w: 24 } as const;

/**
 * World space, scenery on the back pavement: an open sack of grain with a measuring bowl. With
 * `time`, the bowl in the heap tips a little now and then, as if being filled (still: at rest).
 */
export function drawGrainSack(g: G, x: number, groundY: number, kind: GrainKind, time = 0, still = false): void {
  const t = still || !Number.isFinite(time) ? 0 : time;
  g.save();
  g.translate(x, groundY);
  g.rotate(Math.max(0, Math.sin(t * 1.3)) * 0.03);
  grainSack(g, 0, 0, kind, true);
  g.restore();
}

/** World space: the groundnut oil seller's table (plain bottles, a jerry can, kuli-kuli); she stands at x - 24. */
export function drawOilTable(g: G, x: number, groundY = GROUND): void {
  g.save();
  g.translate(x, groundY);
  box(g, -18, -20, 36, 4, '#8a6a4a');
  box(g, -16, -16, 3, 16, '#7b5a3a', 0);
  box(g, 13, -16, 3, 16, '#7b5a3a', 0);
  for (let i = 0; i < 4; i++) bottle(g, -12 + i * 7, -20);
  box(g, 20, -16, 11, 16, '#e8b830', 1);
  box(g, 23, -19, 4, 3, '#3f8f4a', 0.8);
  kuli(g, -12, -1.5, 2);
  g.restore();
}

/**
 * World space: the lorry driver's rest, a low wooden box with a flask and a small glass of tea
 * (steam rising, still: none). He sits on his stool at x - 18 and waves. A flask, never a kettle.
 */
export function drawTeaBox(g: G, x: number, groundY = GROUND, time = 0, still = false): void {
  g.save();
  g.translate(x, groundY);
  box(g, -9, -14, 18, 14, '#a0723f');
  box(g, -6, -27, 6, 13, '#d23b2a', 1);
  box(g, -6.5, -29, 7, 2.4, '#f4f1e6', 0.8);
  g.fillStyle = 'rgba(220,240,255,0.75)';
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.beginPath();
  g.rect(2, -20, 4, 6);
  g.fill();
  g.stroke();
  g.fillStyle = '#b5582e';
  g.fillRect(2.4, -17, 3.2, 2.6);
  if (!still && Number.isFinite(time)) {
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 0.9;
    const p = (time * 0.7) % 1;
    g.globalAlpha = 1 - p;
    g.beginPath();
    g.moveTo(4, -22 - p * 6);
    g.quadraticCurveTo(6, -25 - p * 6, 4, -28 - p * 6);
    g.stroke();
  }
  g.restore();
}

/** Where a porter's head top is (u above the feet) by age; the sack sits on a pad there. */
const HEAD_TOP = { adult: 37.4, teen: 33.4, elder: 36.4, child: 26.4 } as const;

/**
 * World space: a sack on a porter's head pad, drawn over a person whose look holds 'box' (the arm
 * steadies the load). x, feetY: the person's feet; bob: the frame's bob (u, down is +).
 */
export function drawHeadSack(g: G, x: number, feetY: number, age: keyof typeof HEAD_TOP = 'adult', bob = 0): void {
  const y = feetY - HEAD_TOP[age] + (Number.isFinite(bob) ? bob : 0);
  g.save();
  g.lineJoin = 'round';
  g.fillStyle = '#7a4a22';
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.beginPath();
  g.ellipse(x + 0.4, y - 0.6, 5.5, 1.6, 0, 0, TAU);
  g.fill();
  g.stroke();
  sack(g, x - 8, y - 11, 17, 10, SACK.bands[0]!, true, 1);
  g.restore();
}

/* ------------------------------------------------------------------ people (part 7) */

/**
 * Dawanau's cast (part 7, clothes as 2.4): 16 looks, every skin tone at least twice, every age, a
 * wheelchair user, glasses, dress from across Nigeria. The groundnut, gyada and beans sellers; two
 * grain traders measuring with bowls (one an elder on his stool, standing tall when he stands);
 * two porters with sacks on head pads (the 'box' hold, with drawHeadSack over it); the lorry
 * driver resting with tea, waving; the groundnut oil seller; a family buying beans (two parents and
 * a child); a student; a wheelchair user; an elder woman with glasses; a young man on his phone.
 * Caps never red; no uniform, helmet, held broom, walking stick or dress used as a sign of faith.
 */
export const DAWANAU_CAST: readonly FolkLook[] = [
  look(4, 'a', 'm', 'medium', 'lowcut', 'kaftanCap', 'kaftan', '#efe6d2', '#6b4a2b', { h: '#3f8f4a', hold: 'plate' }),
  look(2, 'a', 'f', 'slim', 'braids', 'headscarf', 'wrapperBlouse', '#f08a24', '#2c3f8a', { h: '#2c3f8a', hold: 'plate' }),
  look(6, 'a', 'f', 'round', 'cornrows', 'gele', 'iroBuba', '#1aa39a', '#f2b300', { h: '#f2b300', hold: 'plate' }),
  look(3, 'a', 'm', 'slim', 'lowcut', 'kaftanCap', 'babbanRiga', '#cfdcf5', '#2c3f8a', { h: '#2c3f8a', hold: 'plate' }),
  look(1, 'e', 'm', 'medium', 'grey', 'kaftanCap', 'kaftan', '#f6f4ee', '#a8804a', { h: '#7d3c98', beard: true, stool: true }),
  look(5, 'a', 'm', 'slim', 'lowcut', 'none', 'shirtTrousers', '#e0b34a', '#3b5a8a', { hold: 'box' }),
  look(0, 'a', 'm', 'medium', 'afro', 'none', 'jeansTee', '#3f8f4a', '#2a2a33', { hold: 'box' }),
  look(3, 'a', 'm', 'round', 'lowcut', 'kaftanCap', 'kaftan', '#5aa9e6', '#f6f4ee', { h: '#f6f4ee', stool: true }),
  look(6, 'a', 'f', 'medium', 'bun', 'headscarf', 'wrapperBlouse', '#7d3c98', '#f4ead2', { h: '#f2b300' }),
  look(2, 'a', 'f', 'medium', 'braids', 'none', 'bubaSokoto', '#d6336c', '#f6f4ee', { hold: 'marketBag' }),
  look(5, 'a', 'm', 'medium', 'lowcut', 'none', 'isiagu', '#2a2a33', '#f2b300'),
  look(2, 'c', 'f', 'slim', 'puffs', 'none', 'jeansTee', '#f2b300', '#2b59c3'),
  look(0, 't', 'f', 'slim', 'cornrows', 'none', 'school', '#2f6fd6', '#f6f4ee', { hold: 'backpack' }),
  look(4, 'a', 'm', 'slim', 'lowcut', 'none', 'jeansTee', '#e0572b', '#3b5a8a', { chair: true, hold: 'phone' }),
  look(1, 'e', 'f', 'slim', 'grey', 'headscarf', 'wrapperBlouse', '#3f8f4a', '#f4ead2', { h: '#f4ead2', glasses: true, hold: 'basket' }),
  look(5, 'a', 'm', 'slim', 'lowcut', 'kaftanCap', 'kaftan', '#2c3f8a', '#f6f4ee', { h: '#efe6d2', hold: 'phone' }),
];

/** The traders in DAWANAU_CAST, by stall: they hold up their goods and call their own line. */
export const DAWANAU_TRADER_LOOKS: Readonly<Record<DawanauTrader, FolkLook>> = { groundnut: DAWANAU_CAST[0]!, gyada: DAWANAU_CAST[1]!, beans: DAWANAU_CAST[2]! };
/** The two grain traders, each at an open sack (standing at x + GRAIN_SPOT.trader; the elder sits). */
export const DAWANAU_MEASURERS: readonly [FolkLook, FolkLook] = [DAWANAU_CAST[3]!, DAWANAU_CAST[4]!];
/** The two porters: draw drawHeadSack over each. */
export const DAWANAU_PORTERS: readonly [FolkLook, FolkLook] = [DAWANAU_CAST[5]!, DAWANAU_CAST[6]!];
/** The lorry driver on his stool by the tea box, waving. */
export const DAWANAU_DRIVER: FolkLook = DAWANAU_CAST[7]!;
/** The groundnut oil seller at her table. */
export const DAWANAU_OIL_SELLER: FolkLook = DAWANAU_CAST[8]!;
/** The family buying beans: two parents and their child (never a child alone). */
export const DAWANAU_FAMILY: readonly [FolkLook, FolkLook, FolkLook] = [DAWANAU_CAST[9]!, DAWANAU_CAST[10]!, DAWANAU_CAST[11]!];
/** Three people waiting at the bus stop. */
export const DAWANAU_BUS_STOP: readonly FolkLook[] = [DAWANAU_CAST[14]!, DAWANAU_CAST[12]!, DAWANAU_CAST[15]!];

/* ------------------------------------------------------------------ the street tune (2.6) */

const CHORDS = ['G', 'Em', 'C', 'D', 'G', 'C', 'D', 'G'] as const;
const LUTE: Record<string, string> = {
  G: '. . G3 . D4 . B3 . . . G3 . . D4 . .',
  Em: '. . E3 . B3 . G3 . . . E3 . . B3 . .',
  C: '. . C4 . G3 . E4 . . . C4 . . G3 . .',
  D: '. . D4 . A3 . F#4 . . . D4 . . A3 . .',
};
const ROOT: Record<string, string> = { G: 'G2', Em: 'E2', C: 'C2', D: 'D2' };

/**
 * Dawanau's street tune: our own warm evening walking tune in G major at 104 BPM, 8 bars, looping.
 * A kalangu-style talking drum walks "pom . pa-pom", with a soft shaker, a plucked lute line (the
 * guitar voice) and a light high lead (the kalimba voice for the flute). Calmer than Kurmi's and
 * Kofar Mata's. Never a known song, praise song, chant or court music.
 */
export const DAWANAU_TUNE: Tune = {
  name: 'kano-dawanau',
  bpm: [104],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  chords: CHORDS,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.5,
      bars: [
        'B4 . D5 . G5 - . . F#5 . D5 . E5 - . .',
        'G5 . . E5 . B4 . . D5 - . E5 . . . .',
        'C5 . E5 . G5 . A5 - . B5 . G5 . E5 . .',
        'D5 - - . A4 . . C5 . B4 . A4 . . . .',
        'G4 . B4 . D5 . . G5 . . F#5 . D5 - . .',
        'E5 . G5 . . E5 . C5 . . D5 . E5 - . .',
        'F#5 . E5 . D5 . A4 - . C5 . D5 . F#5 . .',
        'G5 - - . D5 . B4 . G4 - - - . . . .',
      ],
    },
    { inst: 'guitar', vol: 0.38, bars: CHORDS.map((c) => LUTE[c]!) },
    { inst: 'bass', vol: 0.6, bars: CHORDS.map((c) => `${ROOT[c]} - . . . . . . ${ROOT[c]} - . . . . ${ROOT[c]} .`) },
    { inst: 'drum', vol: 0.6, bars: CHORDS.map(() => 'G2 . . . . . D3 . G2 . . . D3 . . .') },
    { inst: 'shekere', vol: 0.26, bars: CHORDS.map(() => 'X . . x X . . x X . . x X . x x') },
  ],
};
