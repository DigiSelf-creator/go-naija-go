/**
 * K3a: Kofar Mata, Kano street 2 (docs/kano.md 2.2, 2.3, 3.5 and 7). Midday at the dye pits:
 * behind a low earth wall, round dye pits in a yard, long poles, deep blue cloth drying on lines
 * and frames; a cloth shop, a tailor, a fura da nono stand, provisions. Made-up everyday signs
 * only. The pits are always scenery behind the walking line (KN-R4), never a hazard. No palace,
 * no title-holder, no script, nothing religious, no real building, cloth brand or pattern.
 *
 * - The backdrop: the bright midday sky, the far rooftops under a light gold haze (far strip only,
 *   KN-R6), then the near row with the dye yards (no haze) and the pavement. Baked once, copied.
 * - The roof platform (a dyer's drying shade), the three traders' stalls, and the world-space dye
 *   pit, beating log and tailor's table the cast's dyers, beaters and tailor stand or sit at.
 * - Kofar Mata's cast (part 7; drawn by the people kit, style.md 1.8) and its street tune.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { FolkLook } from '../../art/folk';
import type { Tune } from '../../art/tunes';
import { CLOTH_LOOKS } from './cloth';
import { KANO, KANO_INK as INK } from './gate';
import { kanoBlit, kanoStrip, type KanoSlot } from './layer';
import { board, box, disc, house, look, neem, roundHouse, type KurmiWindNow } from './kurmi';
import { drawDustStreaks } from './wind';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
const GROUND = 300;

/** Kofar Mata's colours: a warm, bright midday (kano.md 2.5); the haze is light gold. */
export const KOFAR = {
  skyTop: '#7fbde6',
  skyLow: '#f3e2b0',
  sun: '#fffbe6',
  haze: 'rgba(242,214,150,0.45)',
  far: ['#c28a68', '#d2a27c', '#b5785a'] as readonly string[],
  yard: '#c9a374',
  pit: '#1b2556',
  pave: '#d8bc88',
  paveTop: '#bf9f68',
  sand: '#e8d2a0',
} as const;

/** Every word painted on Kofar Mata's row (made-up everyday shop words, KN-R3). */
export const KOFAR_SIGNS = ['INDIGO CLOTH', 'TAILOR', 'FURA DA NONO', 'FINE CLOTH', 'PROVISIONS'] as const;

/* ------------------------------------------------------------------ sky and far rooftops */

const skyLayer: KanoSlot = { layer: null };
const farLayer: KanoSlot = { layer: null };
const rowLayer: KanoSlot = { layer: null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, KOFAR.skyTop);
  grad.addColorStop(1, KOFAR.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // The high midday sun, small and bright
  disc(g, w * 0.72, 40, 24, 'rgba(255,246,210,0.6)');
  disc(g, w * 0.72, 40, 15, KOFAR.sun);
}

/** The midday sky. Screen space, painted once and copied. */
export function drawKofarMataSky(g: G, viewW: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (kanoBlit(g, skyLayer, `kofarSky${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = KOFAR.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
}

const FAR_W = 720;
const FAR_H = 150;

function paintFar(g: G): void {
  const h0 = FAR_H - 60;
  g.fillStyle = '#d8b383';
  g.fillRect(0, h0, FAR_W, FAR_H - h0);
  for (const [x, s] of [[60, 1.3], [330, 1.5], [610, 1.2]] as const) neem(g, x, h0 + 4, s, '#6f8f45');
  for (let i = 0, x = 20; x < FAR_W - 40; i++) {
    const w = 40 + ((i * 37) % 40);
    const h = 34 + ((i * 23) % 36);
    g.fillStyle = KOFAR.far[i % 3]!;
    if (i % 3 === 1) {
      g.beginPath();
      g.ellipse(x + w / 2, h0 - h + 6, w / 2, 6, 0, Math.PI, TAU);
      g.rect(x, h0 - h + 6, w, h - 6);
      g.fill();
    } else {
      g.fillRect(x, h0 - h, w, h);
      g.fillRect(x, h0 - h - 6, 4, 6);
      g.fillRect(x + w - 4, h0 - h - 6, 4, 6);
    }
    g.fillStyle = 'rgba(70,40,25,0.35)';
    g.fillRect(x + w * 0.4, h0 - h * 0.55, 4, 5);
    x += w + 18 + ((i * 11) % 20);
  }
  // Far cloth lines over the yards, deep blue strips (look only)
  g.fillStyle = KANO.indigo;
  for (let x = 140; x < FAR_W; x += 230) for (let k = 0; k < 4; k++) g.fillRect(x + k * 9, h0 - 22, 6, 12);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = KOFAR.haze;
  g.fillRect(0, 0, FAR_W, FAR_H);
  g.globalCompositeOperation = 'source-over';
}

/** The far rooftops under the light haze, at parallax 0.15; painted once and copied. */
export function drawKofarMataFar(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = groundY - 36;
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) kanoStrip(g, farLayer, 'kofarFar', t * FAR_W - par, base - FAR_H, FAR_W, FAR_H, paintFar);
}

/* ------------------------------------------------------------------ the near row */

const ROW_TOP = 150;
const ROW_BASE = 264;
const UNITS = [130, 180, 110, 120, 150, 120, 120] as const;
export const KOFAR_TILE_W = UNITS.reduce((a, b) => a + b, 0);

/** A hanging cloth of our own pattern, top-left at (x, y). */
function cloth(g: G, x: number, y: number, w: number, h: number, k: number): void {
  const c = CLOTH_LOOKS[k % 3]!;
  box(g, x, y, w, h, c.base, 1);
  g.fillStyle = c.mark;
  for (let py = y + 4; py < y + h - 2; py += 6) for (let px = x + 2 + ((py / 6) % 2) * 2; px < x + w - 2; px += 5) g.fillRect(px, py, 1.6, 1.6);
}

/** A bolt of cloth on a shelf, end on: a roll with its rings. */
function bolt(g: G, x: number, y: number, col: string): void {
  disc(g, x, y, 5, col, 1);
  disc(g, x, y, 2, 'rgba(255,255,255,0.45)');
}

/**
 * A dye yard behind its low earth wall (x0, w wide, base b): the yard ground beyond, round pits
 * set in it with dark blue dye, long poles resting across them, cloth drying on a line. No one
 * stands in the pits; the dyers are the cast's, on the pavement in front.
 */
function dyeYard(g: G, x: number, b: number, w: number, line: boolean): void {
  // The drying line on two posts, with cloth of our own patterns
  if (line) {
    box(g, x + 8, b - 78, 3, 60, '#7b5a3a', 0);
    box(g, x + w - 11, b - 78, 3, 60, '#7b5a3a', 0);
    g.strokeStyle = '#5a3a22';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + 9, b - 76);
    g.quadraticCurveTo(x + w / 2, b - 70, x + w - 9, b - 76);
    g.stroke();
    for (let i = 0, cx = x + 16; cx < x + w - 30; cx += 30, i++) cloth(g, cx, b - 74 + (i % 2), 22, 30 + (i % 2) * 6, i);
  }
  // The yard ground seen over the wall, and the round pits with their raised rims
  g.fillStyle = KOFAR.yard;
  g.fillRect(x, b - 34, w, 14);
  for (let px = x + 24; px < x + w - 10; px += 40) {
    g.fillStyle = '#a77a52';
    g.beginPath();
    g.ellipse(px, b - 27, 15, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = KOFAR.pit;
    g.beginPath();
    g.ellipse(px, b - 27, 11, 3.2, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(160,190,255,0.5)';
    g.fillRect(px - 5, b - 28.5, 4, 1);
  }
  // A long pole resting across a pit, a dark blue cloth over its end, dripping
  g.strokeStyle = '#7b5a3a';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(x + 14, b - 22);
  g.lineTo(x + 70, b - 58);
  g.stroke();
  box(g, x + 60, b - 60, 12, 16, KANO.indigo, 1);
  // The low earth wall in front, smooth with a rounded top
  g.fillStyle = '#c77c52';
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.roundRect(x, b - 22, w, 22, [6, 6, 0, 0]);
  g.fill();
  g.stroke();
  g.fillStyle = '#dc956a';
  g.fillRect(x + 3, b - 19, w - 6, 3);
}

function paintRow(g: G): void {
  const b = ROW_TOP;
  let x = 0;
  // 1. INDIGO CLOTH: earth house, bolts of cloth on shelves, cloth hanging by the door
  house(g, x + 6, b, 118, 90, '#c8683f', '#e08a5c', '#984a2a');
  board(g, x + 65, b - 84, 72, KOFAR_SIGNS[0]);
  box(g, x + 14, b - 64, 50, 42, '#6a4a30');
  const bolts = [KANO.indigo, KANO.yellow, '#1aa39a', '#e0572b', '#35509e', KANO.cream, '#7d3c98', KANO.indigo];
  bolts.forEach((c, i) => bolt(g, x + 22 + (i % 4) * 11, b - 54 + Math.floor(i / 4) * 16, c));
  box(g, x + 76, b - 52, 30, 52, '#5a3826');
  cloth(g, x + 108, b - 58, 12, 34, 1);
  x += UNITS[0];
  // 2. A dye yard behind its low wall, with a drying line
  dyeYard(g, x + 4, b, UNITS[1] - 8, true);
  x += UNITS[1];
  // 3. TAILOR: a round earth building, a sewing machine in the window, a kaftan on a hanger
  roundHouse(g, x + 55, b, 50, 76, '#d29a6a', '#e6b688', '#a8704a');
  board(g, x + 55, b - 92, 46, KOFAR_SIGNS[1]);
  box(g, x + 18, b - 54, 30, 22, '#f2e2bf');
  box(g, x + 24, b - 44, 16, 6, '#2a2a33', 0.8);
  box(g, x + 36, b - 50, 4, 10, '#2a2a33', 0);
  g.fillStyle = '#f6f4ee';
  g.beginPath();
  g.moveTo(x + 64, b - 56);
  g.lineTo(x + 86, b - 56);
  g.lineTo(x + 90, b - 22);
  g.lineTo(x + 60, b - 22);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = KANO.indigo;
  g.beginPath();
  g.moveTo(x + 71, b - 56);
  g.lineTo(x + 75, b - 46);
  g.lineTo(x + 79, b - 56);
  g.stroke();
  x += UNITS[2];
  // 4. FURA DA NONO: a mat shade on poles over a table of calabashes
  neem(g, x + 104, b, 1, '#5e8a3c');
  box(g, x + 10, b - 62, 4, 62, '#6b4a2b', 0);
  box(g, x + 92, b - 62, 4, 62, '#6b4a2b', 0);
  box(g, x + 4, b - 66, 98, 7, '#d8b07a');
  board(g, x + 53, b - 84, 78, KOFAR_SIGNS[2], KANO.yellow);
  box(g, x + 18, b - 24, 70, 4, '#8a6a4a');
  for (const cx of [30, 48, 66, 80]) {
    g.fillStyle = '#c98a3e';
    g.beginPath();
    g.ellipse(x + cx, b - 25, 7, 7, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#fbf8ef';
    g.fillRect(x + cx - 6, b - 26, 12, 1.6);
  }
  x += UNITS[3];
  // 5. A dye yard with cloth drying on low frames in front of its wall
  dyeYard(g, x + 4, b, UNITS[4] - 8, false);
  for (let i = 0; i < 3; i++) cloth(g, x + 14 + i * 44, b - 50, 34, 10, i + 1);
  x += UNITS[4];
  // 6. FINE CLOTH: cream house, folded piles of cloth in the window
  house(g, x + 6, b, 108, 86, '#e6cfa0', '#f6e4bc', '#b89a6a');
  board(g, x + 60, b - 80, 60, KOFAR_SIGNS[3]);
  box(g, x + 14, b - 60, 52, 36, '#7a5a3a');
  const folds = ['#1aa39a', KANO.indigo, KANO.yellow, '#d6336c', '#f6f4ee', '#3f8f4a'];
  for (let i = 0; i < 9; i++) box(g, x + 18 + (i % 3) * 16, b - 32 - Math.floor(i / 3) * 7, 14, 6, folds[i % 6]!, 0.8);
  box(g, x + 76, b - 48, 28, 48, '#5a3826');
  x += UNITS[5];
  // 7. PROVISIONS: tan house, a window of tins and packets
  house(g, x + 4, b, 110, 84, '#d2a86a', '#e8c48c', '#a8804a');
  board(g, x + 59, b - 78, 64, KOFAR_SIGNS[4]);
  box(g, x + 12, b - 58, 56, 34, '#7a5a3a');
  const goods = ['#e0572b', KANO.yellow, '#2b59c3', '#f6f4ee', '#1aa39a', '#f08a24'];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) box(g, x + 15 + c * 8.6, b - 54 + r * 15, 6, 11, goods[(c + r * 2) % 6]!, 0.8);
  box(g, x + 78, b - 46, 26, 46, '#6a4a30');
}

/** Kofar Mata's near row at half camera speed, with the pavement and a little drifted sand. */
export function drawKofarMataRow(g: G, camX: number, viewW: number, groundY = GROUND): void {
  const base = ROW_BASE - (GROUND - groundY);
  g.fillStyle = KOFAR.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = KOFAR.paveTop;
  g.fillRect(0, base, viewW, 3);
  g.fillStyle = KOFAR.sand;
  const off = camX % 160;
  g.beginPath();
  for (let px = -off - 80; px < viewW + 80; px += 160) g.ellipse(px, groundY - 1, 28, 3.5, 0, Math.PI, TAU);
  g.fill();
  const par = camX * 0.5;
  for (let t = Math.floor(par / KOFAR_TILE_W); t * KOFAR_TILE_W - par < viewW; t++) kanoStrip(g, rowLayer, 'kofarRow', t * KOFAR_TILE_W - par, base - ROW_TOP, KOFAR_TILE_W, ROW_TOP, paintRow);
}

/** Every screen-space layer behind Kofar Mata's road, back to front (the wind's streaks as on Kurmi). */
export function drawKofarMataBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND, still = false, wind?: KurmiWindNow): void {
  drawKofarMataSky(g, viewW, viewH);
  drawKofarMataFar(g, camX, viewW, groundY);
  if (wind?.dir && wind.k > 0) drawDustStreaks(g, viewW, wind.dir, wind.k, time, still, camX);
  drawKofarMataRow(g, camX, viewW, groundY);
}

/* ------------------------------------------------------------------ roofs, stalls, yard pieces */

/**
 * World space: Kofar Mata's roof platform, a dyer's drying shade. A flat woven-mat roof whose top
 * edge is exactly topY (the landing line), wooden posts, short dyed cloths hanging from its edge
 * (well above the hero's head).
 */
export function drawKofarMataStall(g: G, x: number, topY: number, w: number, groundY = GROUND): void {
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
  for (let i = 0, px = x + 14; px < x + w - 18; px += 24, i++) cloth(g, px, topY + 7, 14, 16 + (i % 2) * 4, i);
  g.restore();
}

/** Kofar Mata's three traders (part 7), in the order of KANO_WORDS.folk.traders.kofarMata. */
export const KOFAR_TRADERS = ['cloth', 'fura', 'gaFura'] as const;
export type KofarTrader = (typeof KOFAR_TRADERS)[number];
/** Each stall's board, matching its trader's call ("Blue cloth!", "Fresh fura!", "Ga fura!"). */
export const KOFAR_STALL_WORDS: Readonly<Record<KofarTrader, string>> = { cloth: 'BLUE CLOTH', fura: 'FRESH FURA', gaFura: 'GA FURA' };

function calabash(g: G, x: number, y: number, r: number, full = true): void {
  g.fillStyle = '#c98a3e';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  g.stroke();
  if (full) {
    g.fillStyle = '#fbf8ef';
    g.beginPath();
    g.ellipse(x, y, r, r * 0.28, 0, 0, TAU);
    g.fill();
    g.stroke();
  }
}

/**
 * World space, scenery behind the walking line. x is the stall's middle; the trader stands just
 * in front of it. About 56 u wide, 60 u tall. Fura da nono is always upright in its calabash.
 */
export function drawKofarMataTraderStall(g: G, kind: KofarTrader, x: number, groundY = GROUND): void {
  g.save();
  g.translate(x, groundY);
  g.lineJoin = 'round';
  box(g, -26, -20, 52, 4, '#7b5a3a');
  box(g, -22, -16, 3, 16, '#7b5a3a', 0);
  box(g, 19, -16, 3, 16, '#7b5a3a', 0);
  if (kind === 'cloth') {
    box(g, -24, -52, 48, 2.5, '#6b4a2b', 0);
    for (let i = 0; i < 3; i++) cloth(g, -21 + i * 15, -50, 12, 24, i);
    for (let i = 0; i < 3; i++) box(g, -14, -24 - i * 4, 26, 4, CLOTH_LOOKS[i]!.base, 0.8);
  } else if (kind === 'fura') {
    // A big calabash of nono, a tray of round fura balls, small bowls ready
    calabash(g, -10, -24, 11);
    box(g, 4, -24, 20, 3, '#8a6a4a', 0.8);
    for (const bx of [8, 14, 20]) disc(g, bx, -27, 3, '#e6d6b0', 0.8);
  } else {
    // A low stool with a lidded calabash, a ladle and a row of small calabash bowls
    calabash(g, -6, -24, 12, false);
    g.fillStyle = '#b5762e';
    g.beginPath();
    g.ellipse(-6, -24, 12, 4, 0, Math.PI, TAU);
    g.fill();
    g.stroke();
    disc(g, -6, -29, 2, '#7a4a22', 0.8);
    for (const bx of [10, 18]) calabash(g, bx, -24, 4.5);
    g.strokeStyle = '#7b5a3a';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(14, -36);
    g.lineTo(22, -26);
    g.stroke();
  }
  box(g, 28, -42, 3, 42, '#6b4a2b', 0);
  board(g, 6, -60, 54, KOFAR_STALL_WORDS[kind]);
  g.restore();
}

/** The dye pit's numbers: where its dyer stands (x offset, facing +x) and its width. */
export const DYE_PIT = { w: 64, dyerAt: -26, lift: 3.2 } as const;

/**
 * World space, scenery on the back pavement: a short low earth wall with a round dye pit set in
 * the yard behind it. A long pole rises from the pit, over the wall, to the dyer's hands (the
 * dyer stands at x + DYE_PIT.dyerAt, in front); a deep blue cloth on its end lifts slowly out of
 * the dye and dips back, dripping. Still: the cloth holds up.
 */
export function drawDyePit(g: G, x: number, groundY = GROUND, time = 0, still = false): void {
  const t = still || !Number.isFinite(time) ? 0.25 : (time / DYE_PIT.lift) % 1;
  const up = Math.sin(t * Math.PI);
  g.save();
  g.translate(x, groundY);
  g.lineJoin = 'round';
  // The yard behind, the pit and its rim
  g.fillStyle = KOFAR.yard;
  g.fillRect(-30, -34, 60, 12);
  g.fillStyle = '#a77a52';
  g.beginPath();
  g.ellipse(4, -28, 18, 5.5, 0, 0, TAU);
  g.fill();
  g.fillStyle = KOFAR.pit;
  g.beginPath();
  g.ellipse(4, -28, 13, 3.6, 0, 0, TAU);
  g.fill();
  // The pole from the dyer's hands into the pit, and the cloth on its end
  const ex = 8;
  const ey = -28 - up * 18;
  g.strokeStyle = '#7b5a3a';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(DYE_PIT.dyerAt + 6, -18);
  g.lineTo(ex, ey);
  g.stroke();
  // The wet cloth hangs over the pole's end in two folds, longer as it comes up out of the dye
  const len = 6 + up * 16;
  g.fillStyle = KANO.indigo;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(ex - 2, ey - 1.5);
  g.quadraticCurveTo(ex - 9, ey + len * 0.5, ex - 7, ey + len);
  g.lineTo(ex - 3, ey + len - 2);
  g.lineTo(ex + 1, ey + len + 1);
  g.lineTo(ex + 5, ey + len - 3);
  g.quadraticCurveTo(ex + 6, ey + len * 0.4, ex + 2, ey - 1.5);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(200,220,255,0.55)';
  g.fillRect(ex - 5, ey + 2, 1.2, len * 0.6);
  if (up > 0.3) for (const d of [-5, 3]) disc(g, ex + d, ey + len + 3 + ((t * 30 + d + 5) % 4), 0.9, KANO.indigo);
  // The low wall in front
  g.fillStyle = '#c77c52';
  g.beginPath();
  g.roundRect(-30, -22, 60, 22, [6, 6, 0, 0]);
  g.fill();
  g.stroke();
  g.fillStyle = '#dc956a';
  g.fillRect(-27, -19, 54, 3);
  g.restore();
}

/** The beating log's numbers: where its two beaters sit (x offsets; the second faces -x). */
export const BEATING_LOG = { beaters: [-22, 22], beat: 0.34 } as const;

/**
 * World space, scenery on the back pavement: a smooth wooden log with a folded indigo cloth on
 * it, beaten until it shines. Two wooden mallets, their handles running back to the beaters'
 * hands (two cast people sitting at x + BEATING_LOG.beaters), lift and fall in turn: "tok-tok".
 * Still: both mallets rest on the cloth.
 */
export function drawBeatingLog(g: G, x: number, groundY = GROUND, time = 0, still = false): void {
  const t = still || !Number.isFinite(time) ? 0 : time;
  g.save();
  g.translate(x, groundY);
  g.lineJoin = 'round';
  box(g, -12, -12, 24, 12, '#8a5f37');
  g.fillStyle = '#a0723f';
  g.fillRect(-10, -10, 20, 2);
  // The folded cloth, with a shine where it is beaten
  box(g, -11, -16, 22, 4, KANO.indigo, 1);
  g.fillStyle = 'rgba(200,220,255,0.7)';
  g.fillRect(-6, -15.5, 8, 1);
  BEATING_LOG.beaters.forEach((bx, i) => {
    const p = ((t / BEATING_LOG.beat + i * 0.5) % 1 + 1) % 1;
    const lift = still ? 0 : Math.max(0, Math.sin(p * Math.PI)) * 9;
    const s = Math.sign(bx);
    const hx = s * 5;
    const hy = -19 - lift;
    g.strokeStyle = '#7b5a3a';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx - s * 3.5, -16);
    g.lineTo(hx, hy + 2);
    g.stroke();
    g.fillStyle = '#9a6a3a';
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(hx - 4, hy - 1, 8, 4, 1.5);
    g.fill();
    g.stroke();
  });
  g.restore();
}

/** World space: the tailor's table with a sewing machine and folded cloth; the tailor sits at x - 22. About 34 u wide. */
export function drawKanoTailorTable(g: G, x: number, groundY = GROUND): void {
  g.save();
  g.translate(x, groundY);
  box(g, -17, -22, 34, 4, '#7b5a3a');
  box(g, -15, -18, 3, 18, '#7b5a3a', 0);
  box(g, 12, -18, 3, 18, '#7b5a3a', 0);
  // The machine: a body, an arm, a wheel
  box(g, -2, -28, 14, 6, '#2a2a33', 1);
  box(g, 8, -34, 4, 8, '#2a2a33', 1);
  box(g, -2, -34, 12, 3, '#2a2a33', 1);
  disc(g, 13, -27, 2.4, '#8a8a8e', 1);
  box(g, -14, -26, 10, 4, CLOTH_LOOKS[2]!.base, 0.8);
  g.restore();
}

/* ------------------------------------------------------------------ people (part 7) */

/**
 * Kofar Mata's cast (part 7, clothes as 2.4): 16 looks, every skin tone at least twice, every
 * age, a wheelchair user, glasses, dress from across Nigeria. The cloth and fura sellers; three
 * dyers (one an elder, standing tall); two cloth beaters (they sit at the beating log); a buyer
 * holding cloth up to the light; a fura seller with a basket on her head; the tailor (on a low
 * stool at the machine); a student; a child with a parent close by; a wheelchair user; a man in
 * babban riga; a woman in a head shawl with glasses. Dyers wear plain work clothes in deep blue.
 * Caps never red; no uniform, helmet, held broom, walking stick or dress used as a sign of faith.
 */
export const KOFAR_MATA_CAST: readonly FolkLook[] = [
  look(3, 'a', 'm', 'medium', 'lowcut', 'kaftanCap', 'kaftan', '#2c3f8a', '#f6f4ee', { h: '#f6f4ee', hold: 'ankaraRoll' }),
  look(6, 'a', 'f', 'round', 'braids', 'headscarf', 'wrapperBlouse', '#f2b300', '#1aa39a', { h: '#1aa39a', hold: 'plate' }),
  look(1, 'a', 'f', 'slim', 'cornrows', 'headscarf', 'wrapperBlouse', '#d6336c', '#f4ead2', { h: '#f4ead2', hold: 'plate' }),
  look(5, 'a', 'm', 'slim', 'lowcut', 'none', 'shirtTrousers', '#35509e', '#22306c'),
  look(2, 'e', 'm', 'medium', 'grey', 'kaftanCap', 'kaftan', '#2c3f8a', '#22306c', { h: '#f4ead2', beard: true }),
  look(4, 'a', 'f', 'medium', 'bun', 'headscarf', 'wrapperBlouse', '#35509e', '#cfdcf5', { h: '#22306c' }),
  look(0, 'a', 'm', 'round', 'lowcut', 'none', 'shirtTrousers', '#f6f4ee', '#2c3f8a', { stool: true }),
  look(6, 'a', 'm', 'slim', 'afro', 'none', 'jeansTee', '#e0572b', '#3b5a8a', { stool: true }),
  look(3, 'a', 'f', 'medium', 'cornrows', 'gele', 'iroBuba', '#7d3c98', '#f2b300', { h: '#f2b300', hold: 'ankaraRoll' }),
  look(2, 'a', 'f', 'slim', 'braids', 'headscarf', 'wrapperBlouse', '#3f8f4a', '#f6f4ee', { h: '#f6f4ee', hold: 'headBasket' }),
  look(4, 'a', 'm', 'medium', 'lowcut', 'kaftanCap', 'babbanRiga', '#efe6d2', '#2c3f8a', { h: '#2b59c3', stool: true, glasses: true }),
  look(1, 't', 'm', 'slim', 'lowcut', 'none', 'school', '#3f8f4a', '#f6f4ee', { hold: 'backpack' }),
  look(5, 'c', 'f', 'slim', 'puffs', 'none', 'jeansTee', '#f2b300', '#2b59c3'),
  look(5, 'a', 'm', 'medium', 'lowcut', 'none', 'isiagu', '#2a2a33', '#f2b300'),
  look(0, 'a', 'f', 'slim', 'braids', 'none', 'jeansTee', '#1aa39a', '#2a2a33', { chair: true, hold: 'phone' }),
  look(6, 'e', 'f', 'slim', 'grey', 'headscarf', 'wrapperBlouse', '#f08a24', '#f4ead2', { h: '#f4ead2', glasses: true, hold: 'marketBag' }),
];

/** The traders in KOFAR_MATA_CAST, by stall: they hold up their goods and call their own line. */
export const KOFAR_TRADER_LOOKS: Readonly<Record<KofarTrader, FolkLook>> = { cloth: KOFAR_MATA_CAST[0]!, fura: KOFAR_MATA_CAST[1]!, gaFura: KOFAR_MATA_CAST[2]! };
/** The three dyers, one at each dye pit (they stand at x + DYE_PIT.dyerAt, facing +x). */
export const KOFAR_DYERS: readonly [FolkLook, FolkLook, FolkLook] = [KOFAR_MATA_CAST[3]!, KOFAR_MATA_CAST[4]!, KOFAR_MATA_CAST[5]!];
/** The two cloth beaters (on low stools at the beating log; the second faces -x). */
export const KOFAR_BEATERS: readonly [FolkLook, FolkLook] = [KOFAR_MATA_CAST[6]!, KOFAR_MATA_CAST[7]!];
/** The buyer holding cloth up to the light. */
export const KOFAR_BUYER: FolkLook = KOFAR_MATA_CAST[8]!;
/** The tailor at the machine (on a low stool at the tailor's table). */
export const KOFAR_TAILOR: FolkLook = KOFAR_MATA_CAST[10]!;
/** The child and the parent close by (never a child alone). */
export const KOFAR_CHILD: readonly [FolkLook, FolkLook] = [KOFAR_MATA_CAST[12]!, KOFAR_MATA_CAST[13]!];
/** Three people waiting at the bus stop. */
export const KOFAR_BUS_STOP: readonly FolkLook[] = [KOFAR_MATA_CAST[15]!, KOFAR_MATA_CAST[11]!, KOFAR_MATA_CAST[9]!];

/* ------------------------------------------------------------------ the street tune (2.6) */

const CHORDS = ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'] as const;
const LUTE: Record<string, string> = {
  D: '. A3 . D4 . F#4 . . . A3 . D4 . F#4 . .',
  G: '. B3 . D4 . G3 . . . B3 . D4 . G3 . .',
  A: '. C#4 . E4 . A3 . . . C#4 . E4 . A3 . .',
  Bm: '. B3 . D4 . F#4 . . . B3 . D4 . F#4 . .',
};
const ROOT: Record<string, string> = { D: 'D2', G: 'G2', A: 'A2', Bm: 'B2' };

/**
 * Kofar Mata's street tune: our own midday walking tune in D major at 110 BPM, 8 bars, looping.
 * The kalangu-style talking drum plays the cloth beaters' "tok-tok" (two quick knocks on the
 * off-beat), with a shaker, a plucked lute line (the guitar voice) and a light high lead (the
 * kalimba voice for the flute). Never a known song, praise song, chant or court music.
 */
export const KOFAR_MATA_TUNE: Tune = {
  name: 'kano-kofar-mata',
  bpm: [110],
  bars: 8,
  loop: true,
  gain: 1,
  key: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  chords: CHORDS,
  tracks: [
    {
      inst: 'kalimba',
      lead: true,
      vol: 0.5,
      bars: [
        'F#5 . . A5 . F#5 . E5 - . D5 . A4 . . .',
        'D5 . B4 . . G4 - . A4 . B4 . D5 - . .',
        'C#5 . E5 . A5 . . G5 . E5 . . C#5 . A4 .',
        'D5 - - . . F#4 . A4 . D5 - - . . . .',
        'B4 . D5 . F#5 - . A5 . F#5 . D5 . . . .',
        'G5 . . E5 . D5 . B4 - . D5 . G5 . . .',
        'E5 . C#5 . A4 - . C#5 . E5 . A5 - . G5 .',
        'F#5 - - . E5 . C#5 . D5 - - - . . . .',
      ],
    },
    { inst: 'guitar', vol: 0.4, bars: CHORDS.map((c) => LUTE[c]!) },
    { inst: 'bass', vol: 0.6, bars: CHORDS.map((c) => `${ROOT[c]} - . . . . . . ${ROOT[c]} . . . ${ROOT[c]} . . .`) },
    { inst: 'drum', vol: 0.6, bars: CHORDS.map(() => 'D3 . . . A3 . A3 . D3 . . . A3 . A3 .') },
    { inst: 'shekere', vol: 0.3, bars: CHORDS.map(() => 'X . x . X . x x X . x . X . x x') },
  ],
};
