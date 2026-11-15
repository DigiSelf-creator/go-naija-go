/**
 * Ota, Ogun street 1 (art O2a; docs/ogun.md 2.2, 2.3, 2.4, 3.3, 3.4, 4.1 and 7; decisions 72 to
 * 74 and 76 to 82). Drawn in code, our own. Lives in the lazy Ogun part: import it only from
 * src/worlds/ogun/ (gamedev wires it in O2b).
 *
 * Ota's own colour note, so it never feels like Lagos: a lilac-to-apricot morning sky (Lagos is
 * blue to cream), pale indigo factory sheds far off, laterite red-brown pavement and verges,
 * granite grey, indigo awnings with white stripes and dots. Every sign is made up or everyday;
 * no brand, company, crest, party colour, uniform or logo anywhere; nothing religious.
 *
 * Screen space (no camera translate): drawOtaBackdrop. World space: drawOtaStall (a platform),
 * drawMud and its prints and splash, drawIkokore, drawIjebuGarriCrate, drawOtaTraderStall.
 * Every moving thing takes `time`; pass `still` (reduced motion) and nothing moves.
 */
import { CRATE, drawCrate, type CrateLook } from '../../art/crate';
import { folkLook } from '../../art/folkCasts';
import type { FolkLook } from '../../art/folk';
import { INK, WHITE } from '../../art/palette';
import { blitLayer, GROUND_Y, type PixelLayer } from '../../art/street';
import type { Recipe } from '../../engine/sound';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** Ota's colours (2.4: indigo, laterite, granite, with cream and danfo yellow). */
export const OTA = {
  skyTop: '#a9a6dc',
  skyLow: '#ffdcb0',
  sun: '#ffc75a',
  haze: '#fff1dc',
  far: '#a3a9cf',
  farDark: '#8b92bd',
  farLight: '#c4c8e4',
  steam: '#fbf7ef',
  pave: '#c9794a',
  paveTop: '#a65a33',
  paveDot: '#b5683e',
  indigo: '#2f3f8f',
  indigoPale: '#8e9ad6',
  laterite: '#b5562e',
  granite: '#a9a69e',
  cream: '#f6e9cc',
  palm: '#3f8f4a',
  palmDark: '#2d6b37',
  trunk: '#7b5a3a',
  mud: '#2e1c10',
  mudWet: '#4a2e1a',
  mudRim: '#8a5a36',
  shine: '#f3e6cf',
  sign: '#fff8e6',
} as const;

/** Made-up, everyday signs on Ota's row (3.4). No brands. */
export const OTA_SIGNS = ['OFADA RICE', 'VULCANIZER', 'POS HERE', 'PROVISIONS', 'BUKA'] as const;

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function box(g: G, x: number, y: number, w: number, h: number, fill: string, line = 0, r = 2): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  if (line) {
    g.strokeStyle = INK;
    g.lineWidth = line;
    g.stroke();
  }
}

function text(g: G, s: string, x: number, y: number, px: number, max?: number, fill = INK): void {
  g.fillStyle = fill;
  g.font = `bold ${px}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(s, x, y, max);
}

/** A sign board with words (and room for a small picture on the left). */
function board(g: G, x: number, y: number, w: number, words: string, pic?: (cx: number, cy: number) => void): void {
  box(g, x, y, w, 18, OTA.sign, 1.3);
  if (pic) pic(x + 10, y + 9);
  text(g, words, x + w / 2 + (pic ? 7 : 0), y + 9.5, 9, w - (pic ? 22 : 6));
}

/** Indigo awning with white stripes and a dotted edge (our own, in the style of adire). */
function awning(g: G, x: number, y: number, w: number): void {
  const n = Math.max(3, Math.round(w / 14));
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? OTA.cream : OTA.indigo;
    g.fillRect(x + (i * w) / n, y, w / n + 0.5, 8);
  }
  g.fillStyle = OTA.indigo;
  for (let i = 0; i < n * 2; i++) {
    g.beginPath();
    g.arc(x + ((i + 0.5) * w) / (n * 2), y + 8, w / (n * 4), 0, Math.PI);
    g.fill();
  }
}

function palm(g: G, x: number, base: number, h: number): void {
  g.strokeStyle = OTA.trunk;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x, base);
  g.quadraticCurveTo(x + 6, base - h / 2, x + 3, base - h);
  g.stroke();
  g.fillStyle = OTA.palmDark;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    const tx = x + 3 + Math.cos(a) * 24;
    const ty = base - h + Math.sin(a) * 14 + 8;
    g.beginPath();
    g.moveTo(x + 3, base - h);
    g.quadraticCurveTo((x + 3 + tx) / 2, base - h - 8, tx, ty);
    g.quadraticCurveTo((x + 3 + tx) / 2, base - h - 2, x + 3, base - h + 2);
    g.fill();
  }
  g.fillStyle = OTA.trunk;
  g.beginPath();
  g.arc(x + 3, base - h + 2, 3, 0, TAU);
  g.fill();
}

// ---------------------------------------------------------------- sky

const skyLayer = { layer: null as PixelLayer | null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, OTA.skyTop);
  grad.addColorStop(1, OTA.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // A low morning sun on the left (east, the way in), with a soft haze ring
  g.fillStyle = OTA.haze;
  g.beginPath();
  g.arc(90, 118, 40, 0, TAU);
  g.fill();
  g.fillStyle = OTA.sun;
  g.beginPath();
  g.arc(90, 118, 27, 0, TAU);
  g.fill();
}

/** The morning sky, sun and long thin clouds. Screen space; the gradient is painted once. */
export function drawOtaSky(g: G, camX: number, viewW: number, time: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (blitLayer(g, skyLayer, `${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = OTA.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
  // Long, thin morning clouds drifting slowly
  g.fillStyle = OTA.haze;
  const span = viewW + 400;
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 260 - camX * 0.04 - time * 3) % span) + span) % span) - 200;
    const y = 34 + i * 22;
    box(g, x, y, 110 - i * 14, 7, OTA.haze, 0, 3.5);
    box(g, x + 26, y - 5, 54, 7, OTA.haze, 0, 3.5);
  }
}

// ---------------------------------------------------------------- far factories

const FAR_W = 640;
const FAR_H = 150;
const farLayer = { layer: null as PixelLayer | null };

/** A long shed with a saw-tooth roof (skylights on the steep side). (x, base) is its bottom left. */
function sawShed(g: G, x: number, base: number, w: number, h: number, teeth: number, wall: string, roof: string, glass: string): void {
  g.fillStyle = wall;
  g.fillRect(x, base - h, w, h);
  const tw = w / teeth;
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x, base - h);
  for (let i = 0; i < teeth; i++) {
    g.lineTo(x + i * tw, base - h - 14);
    g.lineTo(x + (i + 1) * tw, base - h);
  }
  g.closePath();
  g.fill();
  g.fillStyle = glass;
  for (let i = 0; i < teeth; i++) g.fillRect(x + i * tw, base - h - 13, 2.5, 12);
  // A row of high windows
  for (let wx = x + 8; wx < x + w - 14; wx += 18) g.fillRect(wx, base - h + 8, 10, 5);
}

function paintFar(g: G): void {
  const b = FAR_H;
  sawShed(g, 10, b, 230, 72, 6, OTA.far, OTA.farDark, OTA.farLight);
  // A plain water tower on legs (no name, no logo)
  g.fillStyle = OTA.farDark;
  g.fillRect(262, b - 96, 3, 96);
  g.fillRect(292, b - 96, 3, 96);
  box(g, 254, b - 126, 48, 32, OTA.far, 0, 6);
  g.fillStyle = OTA.farLight;
  g.fillRect(258, b - 118, 40, 3);
  // A short chimney (white steam only, never black smoke)
  g.fillStyle = OTA.farDark;
  g.fillRect(352, b - 136, 12, 136);
  g.fillStyle = OTA.farLight;
  g.fillRect(352, b - 128, 12, 4);
  sawShed(g, 330, b, 290, 62, 8, OTA.farLight, OTA.far, OTA.skyLow);
  // Low palms and bush between the sheds
  g.fillStyle = OTA.farDark;
  for (const px of [248, 312, 628]) {
    g.beginPath();
    g.arc(px, b - 6, 12, Math.PI, TAU);
    g.fill();
  }
}

/** Far factory estate: saw-tooth sheds, a water tower, a chimney with white steam. Parallax 0.15. */
export function drawOtaFar(g: G, camX: number, viewW: number, time: number, groundY = GROUND_Y): void {
  const base = groundY - 40;
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) {
    const x = t * FAR_W - par;
    if (!blitLayer(g, farLayer, 'far', x, base - FAR_H, FAR_W, FAR_H, paintFar, true)) {
      g.save();
      g.translate(x, base - FAR_H);
      paintFar(g);
      g.restore();
    }
    // Steam: three soft white puffs rising from the chimney
    g.fillStyle = OTA.steam;
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.25 + i / 3) % 1;
      g.globalAlpha = 0.85 * (1 - k);
      g.beginPath();
      g.arc(x + 358 + k * 18, base - 144 - k * 34, 6 + k * 8, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- the row

const ROW_TOP = 128;
/** Where Ota's row meets the pavement (as Lagos: 36 u above the road edge). */
const ROW_BASE = 264;
/** Each part of the row: its width in the tile. */
const UNITS = [150, 128, 120, 176, 112, 132] as const;
export const OTA_TILE_W = UNITS.reduce((a, b) => a + b, 0);

/** A leaf-wrapped pack of ofada rice (the buka's picture, the trader's goods). */
function leafPack(g: G, x: number, y: number, s = 1): void {
  g.fillStyle = '#4f9a3c';
  g.beginPath();
  g.ellipse(x, y, 6 * s, 4 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = '#2b5e22';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = '#d8b384';
  g.beginPath();
  g.moveTo(x - 6 * s, y);
  g.lineTo(x + 6 * s, y);
  g.stroke();
}

function tyre(g: G, x: number, y: number, r: number): void {
  g.fillStyle = '#26262a';
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.fillStyle = '#8f8f94';
  g.beginPath();
  g.arc(x, y, r * 0.42, 0, TAU);
  g.fill();
}

/** A plain lorry (no name, no company), front facing +x, wheels on y = 0. */
export function drawOtaLorry(g: G, x: number, y: number, s = 1, load = true): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  // Cargo bed with crates under a tied tarp
  box(g, -62, -18, 82, 8, '#6d6f78', 1.2, 1);
  if (load) {
    box(g, -60, -44, 78, 26, '#3f6f8f', 1.2, 4);
    g.strokeStyle = '#d8b384';
    g.lineWidth = 1.5;
    g.beginPath();
    for (const rx of [-44, -20, 4]) {
      g.moveTo(rx, -44);
      g.lineTo(rx, -18);
    }
    g.stroke();
  }
  // Cab: teal with a cream stripe, a big window
  box(g, 22, -46, 34, 36, '#1aa39a', 1.2, 5);
  g.fillStyle = OTA.cream;
  g.fillRect(22, -24, 34, 3);
  box(g, 38, -42, 15, 13, '#cfe9f5', 0, 2);
  g.fillStyle = '#fff3b0';
  g.fillRect(53, -18, 3, 4);
  tyre(g, -40, -8, 8);
  tyre(g, -18, -8, 8);
  tyre(g, 40, -8, 8);
  g.restore();
}

function paintRow(g: G): void {
  const B = ROW_TOP; // the row's base inside the tile
  let x = 0;
  const [w0, w1, w2, w3, w4, w5] = UNITS;

  // 0. A factory gate with no name: cream wall with an indigo dotted band, a saw-tooth shed behind
  sawShed(g, x + 4, B - 50, w0 - 8, 30, 4, '#d9d4c6', '#b8b3a5', '#cfe9f5');
  g.fillStyle = OTA.cream;
  g.fillRect(x, B - 50, w0, 50);
  g.fillStyle = OTA.indigo;
  g.fillRect(x, B - 40, w0, 7);
  g.fillStyle = OTA.cream;
  for (let d = x + 5; d < x + w0; d += 10) g.fillRect(d, B - 38, 3, 3);
  box(g, x + 40, B - 64, 12, 64, OTA.granite, 1.2, 1);
  box(g, x + 98, B - 64, 12, 64, OTA.granite, 1.2, 1);
  g.fillStyle = '#4a5468';
  for (let bx = x + 54; bx < x + 96; bx += 6) g.fillRect(bx, B - 52, 2, 52);
  g.fillRect(x + 52, B - 52, 46, 3);
  g.fillRect(x + 52, B - 28, 46, 2);
  x += w0;

  // 1. The buka: OFADA RICE on its board, BUKA painted on the wall, a bench and a steaming pot
  box(g, x + 6, B - 92, w1 - 12, 92, '#e2a26e', 1.2, 3);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(x + 6, B - 92, w1 - 12, 5);
  board(g, x + 12, B - 84, w1 - 24, OTA_SIGNS[0], (cx, cy) => leafPack(g, cx, cy, 0.9));
  awning(g, x + 8, B - 60, w1 - 16);
  box(g, x + 16, B - 44, 22, 44, '#5b4636');
  text(g, OTA_SIGNS[4], x + 80, B - 38, 11, 60, OTA.indigo);
  box(g, x + 56, B - 28, 52, 10, '#cfe9f5', 0, 2);
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 50, B - 12, 60, 4);
  g.fillRect(x + 54, B - 8, 3, 8);
  g.fillRect(x + 103, B - 8, 3, 8);
  x += w1;

  // 2. The vulcanizer: an open zinc shed, a stack of tyres, an air hose
  g.fillStyle = '#8a8f99';
  g.beginPath();
  g.moveTo(x + 2, B - 70);
  g.lineTo(x + w2 - 2, B - 80);
  g.lineTo(x + w2 - 2, B - 72);
  g.lineTo(x + 2, B - 62);
  g.fill();
  g.fillStyle = '#6b4a2b';
  g.fillRect(x + 8, B - 66, 4, 66);
  g.fillRect(x + w2 - 12, B - 76, 4, 76);
  board(g, x + 14, B - 100, w2 - 28, OTA_SIGNS[1], (cx, cy) => tyre(g, cx, cy, 6));
  for (let i = 0; i < 4; i++) tyre(g, x + 32, B - 6 - i * 10, 9);
  box(g, x + 64, B - 22, 26, 20, '#2f6fd6', 1.2, 4);
  tyre(g, x + 70, B - 2, 3);
  tyre(g, x + 84, B - 2, 3);
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x + 90, B - 14);
  g.quadraticCurveTo(x + 110, B - 2, x + 104, B - 30);
  g.stroke();
  x += w2;

  // 3. The truck park: a big shade tree and a parked lorry
  g.fillStyle = OTA.trunk;
  g.fillRect(x + 32, B - 60, 8, 60);
  g.fillStyle = OTA.palmDark;
  for (const [cx, cy, r] of [[22, -66, 20], [50, -70, 22], [36, -86, 20]] as const) {
    g.beginPath();
    g.arc(x + cx, B + cy, r, 0, TAU);
    g.fill();
  }
  g.fillStyle = OTA.palm;
  g.beginPath();
  g.arc(x + 44, B - 78, 13, 0, TAU);
  g.fill();
  drawOtaLorry(g, x + 104, B, 0.95);
  x += w3;

  // 4. The kiosk: POS HERE, and recharge cards on a small rack
  box(g, x + 14, B - 74, w4 - 28, 74, OTA.indigoPale, 1.2, 3);
  g.fillStyle = OTA.indigo;
  g.fillRect(x + 10, B - 80, w4 - 20, 8);
  board(g, x + 18, B - 66, w4 - 36, OTA_SIGNS[2], (cx, cy) => {
    box(g, cx - 4, cy - 6, 8, 12, '#444', 0, 1.5);
    g.fillStyle = '#9fe0a8';
    g.fillRect(cx - 2.5, cy - 4.5, 5, 3);
  });
  box(g, x + 24, B - 40, w4 - 48, 24, '#cfe9f5', 1, 2);
  for (let i = 0; i < 4; i++) box(g, x + 30 + i * 13, B - 35, 9, 13, ['#f2b300', '#1aa39a', '#d6336c', '#2b59c3'][i]!, 0, 1);
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 18, B - 16, w4 - 36, 16);
  x += w4;

  // 5. Provisions, with a clean doorstep (two steps) where children play
  box(g, x + 4, B - 104, w5 - 8, 104, '#b9c99a', 1.2, 3);
  board(g, x + 10, B - 96, w5 - 20, OTA_SIGNS[3], (cx, cy) => {
    box(g, cx - 6, cy - 5, 6, 10, '#f39c12', 0, 1);
    box(g, cx + 1, cy - 3, 6, 8, '#2fa36b', 0, 1);
  });
  awning(g, x + 6, B - 72, w5 - 12);
  box(g, x + 16, B - 54, 26, 46, '#5b4636');
  box(g, x + 54, B - 54, w5 - 66, 28, '#cfe9f5', 0, 2);
  g.fillStyle = '#e8e2d2';
  g.fillRect(x + 8, B - 8, 50, 4);
  g.fillRect(x + 4, B - 4, 58, 4);

  // Palms between the parts
  for (const px of [w0 - 4, w0 + w1 + w2 - 2, OTA_TILE_W - 6]) palm(g, px, B, 82);
}

const rowLayer = { layer: null as PixelLayer | null };

/** Ota's near row at half camera speed, with the laterite pavement down to the road. */
export function drawOtaRow(g: G, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = ROW_BASE - (GROUND_Y - groundY);
  g.fillStyle = OTA.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = OTA.paveTop;
  g.fillRect(0, base, viewW, 3);
  // A little grit on the red earth, scrolling with the road
  g.fillStyle = OTA.paveDot;
  const off = camX % 40;
  for (let px = -off; px < viewW; px += 40) {
    g.fillRect(px + 6, base + 10, 4, 2);
    g.fillRect(px + 26, base + 22, 3, 2);
  }
  const par = camX * 0.5;
  for (let t = Math.floor(par / OTA_TILE_W); t * OTA_TILE_W - par < viewW; t++) {
    const x = t * OTA_TILE_W - par;
    if (blitLayer(g, rowLayer, 'ota', x, base - ROW_TOP, OTA_TILE_W, ROW_TOP, paintRow, true)) continue;
    g.save();
    g.translate(x, base - ROW_TOP);
    paintRow(g);
    g.restore();
  }
}

/** A small lorry passing now and then on the back lane (far away: nobody tries to jump it). */
export function drawOtaPassingLorry(g: G, camX: number, viewW: number, time: number, groundY = GROUND_Y): void {
  const span = viewW + 700;
  const x = ((((time * 70 - camX * 0.7) % span) + span) % span) - 250;
  drawOtaLorry(g, x, groundY - 26, 0.5);
}

/**
 * Every screen-space layer behind Ota's road, back to front: sky, far factories, the row, a
 * passing lorry. still (reduced motion): clouds, steam and the lorry hold still.
 */
export function drawOtaBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND_Y, still = false): void {
  const t = still ? 0 : time;
  drawOtaSky(g, camX, viewW, t, viewH);
  drawOtaFar(g, camX, viewW, t, groundY);
  drawOtaRow(g, camX, viewW, groundY);
  if (!still) drawOtaPassingLorry(g, camX, viewW, time, groundY);
}

// ---------------------------------------------------------------- platform

/**
 * World space. Ota's platform: a truck-park shade roof of laterite zinc with an indigo edge.
 * Its top edge is exactly topY (the landing line). Sacks and crates wait under it.
 */
export function drawOtaStall(g: G, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  g.fillStyle = '#5d6670';
  g.fillRect(x + 6, topY + 10, 4, groundY - topY - 10);
  g.fillRect(x + w - 10, topY + 10, 4, groundY - topY - 10);
  if (groundY - topY > 40) {
    for (let i = 0; x + 16 + i * 26 < x + w - 20; i++) {
      if (i % 2) box(g, x + 16 + i * 26, groundY - 16, 20, 16, '#d2a77c', 1, 1);
      else box(g, x + 16 + i * 26, groundY - 18, 20, 18, '#efe6d2', 1, 6);
    }
  }
  // Indigo edge with white dots under the roof
  g.fillStyle = OTA.indigo;
  g.fillRect(x + 2, topY + 9, w - 4, 5);
  g.fillStyle = OTA.cream;
  for (let d = x + 7; d < x + w - 4; d += 9) g.fillRect(d, topY + 10.5, 2, 2);
  // Roof: corrugated laterite zinc, outlined so the landing line reads
  box(g, x, topY, w, 10, OTA.laterite, 1.5, 3);
  g.fillStyle = '#e08a5c';
  g.fillRect(x + 2, topY + 1, w - 4, 2.5);
  g.fillStyle = 'rgba(0,0,0,0.2)';
  for (let i = x + 8; i < x + w - 4; i += 8) g.fillRect(i, topY + 3.5, 1.5, 6);
}

// ---------------------------------------------------------------- mud

/** Mud's numbers: how far its wet top lifts over the road line, how deep it shows. */
export const MUD = { lip: 3, depth: 34 } as const;

/**
 * World space. A mud patch on the road from x to x + w (3.3). Not colour alone: shiny ripple
 * lines, puddle rings and old footprints. It reads in greyscale: much darker than the tar,
 * with light ripples and a pale splashed rim. still: the rings hold still.
 */
export function drawMud(g: G, x: number, w: number, groundY = GROUND_Y, time = 0, still = false): void {
  const y = groundY;
  const n = Math.max(3, Math.round(w / 20));
  // Body: a soft, bumpy top just over the road line, a wavy bottom edge
  g.fillStyle = OTA.mudRim;
  g.beginPath();
  g.moveTo(x - 6, y + 2);
  for (let i = 0; i <= n; i++) g.lineTo(x + (i * w) / n, y - MUD.lip - (i % 2) * 1.5);
  g.lineTo(x + w + 6, y + 2);
  g.lineTo(x + w - 4, y + MUD.depth + 3);
  g.lineTo(x + 4, y + MUD.depth + 3);
  g.closePath();
  g.fill();
  g.fillStyle = OTA.mud;
  g.beginPath();
  g.moveTo(x - 2, y + 1);
  for (let i = 0; i <= n; i++) g.lineTo(x + (i * w) / n, y - MUD.lip + 1.5 - (i % 2) * 1.5);
  g.lineTo(x + w + 2, y + 1);
  for (let i = n; i >= 0; i--) g.lineTo(x + (i * w) / n, y + MUD.depth - (i % 2) * 4);
  g.closePath();
  g.fill();
  // A wetter band on top
  g.fillStyle = OTA.mudWet;
  g.fillRect(x + 2, y + 1, w - 4, 6);
  // Shiny ripple lines
  g.strokeStyle = OTA.shine;
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const rx = x + 8 + (i * (w - 16)) / n + hash(x + i) * 6;
    const ry = y + 10 + (i % 3) * 7;
    g.moveTo(rx, ry);
    g.quadraticCurveTo(rx + 5, ry - 3, rx + 10, ry);
  }
  g.stroke();
  // Puddle rings that slowly spread (two at a time)
  for (let i = 0; i < 2; i++) {
    const k = still ? 0.5 : (time * 0.5 + i * 0.5 + hash(x) ) % 1;
    const cx = x + w * (0.3 + i * 0.4);
    g.globalAlpha = 0.9 - k * 0.7;
    g.beginPath();
    g.ellipse(cx, y + 18 + i * 6, 3 + k * 9, 1 + k * 2.6, 0, 0, TAU);
    g.stroke();
  }
  g.globalAlpha = 1;
  // Old footprints across it
  for (let px = x + 14; px < x + w - 12; px += 26) drawMudPrint(g, px, groundY, 0.55, (px - x) % 52 < 26);
}

/**
 * A footprint pressed in the mud at x (world), k 0 fresh to 1 filled in (it fades into the mud;
 * draw nothing at 1). up: the upper of the two foot rows, so a trail zigzags.
 */
export function drawMudPrint(g: G, x: number, groundY = GROUND_Y, k = 0, up = false): void {
  if (!(k < 1)) return;
  const y = groundY + (up ? 5 : 11);
  g.globalAlpha = 1 - k;
  g.fillStyle = '#140b05';
  g.beginPath();
  g.ellipse(x, y, 4.2, 1.8, 0, 0, TAU);
  g.fill();
  g.fillStyle = OTA.mudRim;
  g.fillRect(x - 4, y - 2.6, 8, 1);
  g.globalAlpha = 1;
}

/** World space. A little splash of mud drops at a step: k 0 to 1 over about 0.3 s. */
export function drawMudSplash(g: G, x: number, groundY = GROUND_Y, k = 0): void {
  if (!(k >= 0 && k < 1)) return;
  g.fillStyle = OTA.mudRim;
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * (4 + k * 8);
    const dy = -k * 12 * (1 - Math.abs(i - 2) * 0.25) + k * k * 10;
    g.beginPath();
    g.arc(x + dx, groundY + dy, 1.8 * (1 - k * 0.5), 0, TAU);
    g.fill();
  }
}

/** Ota's sounds (code-made, our own). Gamedev adds the names to SoundName and calls addSounds. */
export type OtaSoundName = 'mudStepA' | 'mudStepB';
/** The soft "splosh" step on mud (3.3): a low wet thud and a short band of hiss; play A, B, A, B. */
export const OTA_SOUNDS: Readonly<Record<OtaSoundName, Recipe>> = {
  mudStepA: {
    tones: [{ f: 120, len: 0.09, wave: 'sine', peak: 150, to: 70, vol: 0.06 }],
    hiss: [{ len: 0.12, bp: 700, vol: 0.03 }, { len: 0.05, at: 0.05, bp: 1600, vol: 0.012 }],
  },
  mudStepB: {
    tones: [{ f: 105, len: 0.09, wave: 'sine', peak: 135, to: 62, vol: 0.06 }],
    hiss: [{ len: 0.12, bp: 620, vol: 0.03 }, { len: 0.05, at: 0.05, bp: 1450, vol: 0.012 }],
  },
};

// ---------------------------------------------------------------- ikokore

function curl(g: G, x: number, y: number, sway: number): void {
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - 3 + sway, y - 4, x + sway, y - 8);
  g.stroke();
}

/** The ikokore bowl, centred near (0, 0), about 26 u across: a clay bowl of thick pottage and a spoon. */
function ikokoreBowl(g: G, time: number): void {
  // Wooden spoon standing in the pottage
  g.save();
  g.rotate(0.45);
  box(g, 1, -16, 2.6, 13, '#a8743f', 0.8, 1.2);
  g.restore();
  // Pottage heaped over the rim: warm orange, lumps of water yam, bits of fish and leaf
  g.fillStyle = '#d9822b';
  g.beginPath();
  g.ellipse(0, -1.5, 10, 5, 0, Math.PI, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#f2b55c';
  for (const [lx, ly] of [[-5, -3], [1, -5], [5, -2.5]] as const) {
    g.beginPath();
    g.arc(lx, ly, 1.8, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#6b3b1f';
  g.fillRect(-1.5, -2.5, 2.2, 1.6);
  g.fillStyle = '#3f8f4a';
  g.fillRect(3, -5, 1.6, 1);
  // Clay bowl with a cream band of dots
  g.fillStyle = '#9a5532';
  g.beginPath();
  g.moveTo(-11, -1);
  g.lineTo(11, -1);
  g.quadraticCurveTo(10, 9, 0, 9);
  g.quadraticCurveTo(-10, 9, -11, -1);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = OTA.cream;
  for (let d = -7; d <= 7; d += 3.5) g.fillRect(d - 0.8, 2.2, 1.6, 1.6);
  // Steam only (never fire)
  g.strokeStyle = WHITE;
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  curl(g, -4, -8, Math.sin(time * 3));
  curl(g, 4, -9, Math.sin(time * 3 + 1.5));
}

/** World space. Ikokore on the road (4.1), gently bobbing on a soft halo. Pass time 0 to hold still. */
export function drawIkokore(g: G, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 4) * 2;
  g.fillStyle = 'rgba(255,248,220,0.7)';
  g.beginPath();
  g.arc(x, y + bob, 18, 0, TAU);
  g.fill();
  drawIkokoreIcon(g, x, y + bob, 1);
}

/** The bowl alone (HUD chip, toast). size 1 is about 32 u across, as drawFoodIcon. Still. */
export function drawIkokoreIcon(g: G, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y + 2 * size);
  g.scale(size * 1.15, size * 1.15);
  ikokoreBowl(g, 0);
  g.restore();
}

// ---------------------------------------------------------------- Ijebu garri

/** The Ijebu garri sack stamp: a small tied sack with fine grains spilling (finer, paler than Lagos garri). */
function ijebuStamp(g: G): void {
  g.fillStyle = '#7a2e1f';
  g.strokeStyle = '#7a2e1f';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-4, -6);
  g.quadraticCurveTo(-7, 2, -4, 6);
  g.lineTo(4, 6);
  g.quadraticCurveTo(7, 2, 4, -6);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(-3, -6);
  g.lineTo(0, -4);
  g.lineTo(3, -6);
  g.stroke();
  for (const [gx, gy] of [[-2, 0], [1, -1], [2, 2.5], [-1, 3], [6.5, 5.5], [8, 4], [7.5, 6.5]] as const) g.fillRect(gx, gy, 1, 1);
}

/** World space. A crate as drawCrate, with Ogun's Ijebu garri stamp in place of the cup (4.1). */
export function drawIjebuGarriCrate(g: G, x: number, bottomY: number, look: Omit<CrateLook, 'stamp'>): void {
  drawCrate(g, x, bottomY, { ...look, stamp: 'cup' });
  const a = Number.isFinite(look.angle) ? look.angle : 0;
  g.save();
  g.translate(x, bottomY - CRATE.h - CRATE.rope);
  g.rotate(-a);
  g.translate(0, CRATE.rope + CRATE.h / 2 + 0.5);
  g.fillStyle = '#e6c9a6';
  g.beginPath();
  g.ellipse(0, 0, 9, 9, 0, 0, TAU);
  g.fill();
  ijebuStamp(g);
  g.restore();
}

/**
 * Ijebu garri as a food (the crate's drop and the HUD chip in Ogun): a clear cup of fine, pale,
 * crisp grains with water and groundnuts. Same size as drawFoodIcon (size 1 about 32 u).
 */
export function drawIjebuGarriIcon(g: G, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.fillStyle = '#c8894a';
  for (const [nx, ny] of [[13, 8], [16, 4], [11, 3]] as const) {
    g.beginPath();
    g.ellipse(nx, ny, 2.6, 1.8, 0.5, 0, TAU);
    g.fill();
  }
  const cup = (): void => {
    g.beginPath();
    g.moveTo(-11, -12);
    g.lineTo(11, -12);
    g.lineTo(8, 11);
    g.lineTo(-8, 11);
    g.closePath();
  };
  g.fillStyle = '#d7eefa';
  cup();
  g.fill();
  g.fillStyle = '#fbf3dc';
  g.beginPath();
  g.moveTo(-10.3, -6);
  g.lineTo(10.3, -6);
  g.lineTo(8, 11);
  g.lineTo(-8, 11);
  g.fill();
  // Many fine grains (Ijebu garri is fine and crisp)
  g.fillStyle = '#d9c79a';
  for (let i = 0; i < 18; i++) g.fillRect(-7 + (i % 6) * 2.6 + (i % 2), -3 + Math.floor(i / 6) * 4.4, 0.9, 0.9);
  cup();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- traders

/** Ota's three traders (part 7), in the order of OGUN_WORDS.folk.traders.ota. */
export const OTA_TRADERS = ['ofada', 'bread', 'recharge'] as const;
export type OtaTrader = (typeof OTA_TRADERS)[number];
/** Each stall's board; each matches its trader's call ("Ofada rice dey!", "Fresh bread!", "Recharge card dey!"). */
export const OTA_STALL_WORDS: Readonly<Record<OtaTrader, string>> = { ofada: 'OFADA RICE', bread: 'FRESH BREAD', recharge: 'RECHARGE CARD' };

/**
 * World space, scenery behind the walking line (never something to touch). x is the stall's
 * middle; the trader stands just in front of it. About 56 u wide, 50 u tall.
 */
export function drawOtaTraderStall(g: G, kind: OtaTrader, x: number, groundY = GROUND_Y, time = 0): void {
  const y = groundY;
  g.save();
  g.translate(x, y);
  // A table on two legs
  g.fillStyle = '#7b5a3a';
  g.fillRect(-26, -20, 52, 4);
  g.fillRect(-22, -16, 3, 16);
  g.fillRect(19, -16, 3, 16);
  if (kind === 'ofada') {
    // A cooler of warm rice, a pot of dark pepper sauce, a pile of leaf-wrapped packs
    box(g, -24, -36, 18, 16, '#2f6fd6', 1, 3);
    g.fillStyle = WHITE;
    g.fillRect(-24, -32, 18, 2);
    box(g, -3, -30, 13, 10, '#4a4a50', 1, 3);
    g.fillStyle = '#6b1f12';
    g.fillRect(-2, -31, 11, 2);
    for (const [px, py] of [[16, -23], [23, -23], [19.5, -28]] as const) leafPack(g, px, py, 0.7);
    g.strokeStyle = WHITE;
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    curl(g, 3, -33, Math.sin(time * 3));
  } else if (kind === 'bread') {
    // A glass bread box on the table, long loaves inside
    box(g, -22, -42, 44, 22, '#cfe9f5', 1.2, 2);
    for (let i = 0; i < 3; i++) box(g, -18 + i * 13, -36 + (i % 2) * 6, 11, 6, '#d99a4e', 0.8, 3);
    g.fillStyle = '#7b5a3a';
    g.fillRect(-22, -43, 44, 3);
  } else {
    // A small wooden kiosk with an indigo roof and a rack of plain recharge cards (no network names)
    box(g, -20, -46, 40, 26, '#e2a26e', 1.2, 2);
    g.fillStyle = OTA.indigo;
    g.fillRect(-24, -50, 48, 5);
    for (let i = 0; i < 4; i++) box(g, -16 + i * 8.5, -42, 6.5, 9, ['#f2b300', '#1aa39a', '#d6336c', '#2b59c3'][i]!, 0.6, 1);
    g.fillStyle = '#444';
    g.fillRect(-14, -30, 28, 6);
  }
  // The board on a short post, its words matching the trader's call
  g.fillStyle = '#6b4a2b';
  g.fillRect(28, -40, 3, 40);
  board(g, 6, -58, 52, OTA_STALL_WORDS[kind]);
  g.restore();
}

// ---------------------------------------------------------------- people (part 7)

/**
 * Ota's cast (part 7): 16 looks, every skin tone at least twice, every age, a wheelchair user,
 * glasses, dress from across Nigeria. Factory workers in plain shirts and trousers (one colour,
 * like overalls; no logos, badges, vests or uniforms) with lunch bags; a woman in iro and buba
 * with a gele going to market; a student; the three traders; a truck driver resting on a stool
 * in the shade; two children (ten-ten on the doorstep); three travellers with bags. Look codes as
 * folkLook (src/art/folkCasts.ts). Never a held broom.
 */
export const OTA_CAST: readonly FolkLook[] = (
  '0amsl-lLL.l 5afmcSlDDDl 3afrcGaJCCl 6tmsl-mNL.b 2afrcSgHCHn 4afmuSgPFPd 1amsa-kSN.p 3ammlFbKOK.s ' +
  '0cfsp-kGF.. 5cmsl-kDN.. 1afmuHfQLQa 6ammlReNBNl 2tfsc-kIM.c 1emsgKdFEF.g 4amsl-hMC..w 6afsb-jMN.a'
)
  .split(' ')
  .map(folkLook);

/** The traders in OTA_CAST, by stall: they hold their goods and call their own line. */
export const OTA_TRADER_LOOKS: Readonly<Record<OtaTrader, FolkLook>> = { ofada: OTA_CAST[4]!, bread: OTA_CAST[5]!, recharge: OTA_CAST[6]! };
/** The truck driver resting in the shade (sits on a low stool) and the two children on the doorstep. */
export const OTA_DRIVER: FolkLook = OTA_CAST[7]!;
export const OTA_CHILDREN: readonly [FolkLook, FolkLook] = [OTA_CAST[8]!, OTA_CAST[9]!];
/** The three travellers by the arch, just arrived, looking up and smiling. */
export const OTA_TRAVELLERS: readonly FolkLook[] = [OTA_CAST[10]!, OTA_CAST[11]!, OTA_CAST[12]!];
