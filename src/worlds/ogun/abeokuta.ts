/**
 * Abeokuta, Ogun street 2, and the Ogun well room (art O3a; docs/ogun.md 2.2, 2.3, 2.4, 3.3,
 * 3.5, 3.7, 4.1 and 7; decisions 75 and 77). Drawn in code, our own. Lives in the lazy Ogun
 * part: import it only from src/worlds/ogun/ (gamedev wires it in O3b).
 *
 * Abeokuta's own colour note, so it never feels like Lagos (blue to cream) or Ota (lilac to
 * apricot, laterite): a bright midday sky of turquoise down to pale lemon with a small white sun
 * high up; big smooth grey granite rocks behind the roofs (our own, unnamed: never Olumo Rock,
 * no shrine, carved steps, carvings or anything holy, decision 77); a brown-green river glinting
 * far off; rust-brown zinc roofs; ochre, pale teal and white walls; granite-grey paving slabs;
 * deep indigo adire cloth drying on high lines, in our own patterns only (rings, stripes, dots,
 * folds; never a named pattern, OG-R1). Every sign is made up or everyday. No brand, crest,
 * party colour or uniform; nothing religious; nobody holds a broom (decision 75).
 *
 * Screen space (no camera translate): drawAbeokutaBackdrop. World space: drawRock (the rock
 * steps), drawWaterPothole, drawCrack and drawCrackSign, drawOfada, drawAbeokutaStall (the roof
 * platform), drawAbeokutaTraderStall, and the well room (drawOgunWellRoom, drawSackStack,
 * drawOgunShelf, drawIjebuParcel). Every moving thing takes `time`; pass `still` (reduced
 * motion) and nothing moves.
 */
import { folkLook } from '../../art/folkCasts';
import type { FolkLook } from '../../art/folk';
import { INK, WHITE } from '../../art/palette';
import { POTHOLE_SIGN, SIGN_YELLOW } from '../../art/sign';
import { blitLayer, drawPothole, GROUND_Y, type PixelLayer } from '../../art/street';
import type { Recipe } from '../../engine/sound';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** Abeokuta's colours (2.4: indigo, granite, with laterite roofs, cream and danfo yellow). */
export const ABK = {
  skyTop: '#4fbfbc',
  skyLow: '#f3f6c9',
  sun: '#fffbe2',
  sunRing: '#fff2a6',
  cloud: '#fbfdf2',
  rock: '#a7a39a',
  rockLight: '#c8c4b9',
  rockDark: '#827e76',
  rockFar: '#b9bcb6',
  rockFarDark: '#9ea29c',
  lichen: '#9aa27a',
  bush: '#4c8a45',
  bushDark: '#356b33',
  river: '#7f9670',
  riverLight: '#d8e6c4',
  pave: '#b8b2a5',
  paveTop: '#948e82',
  paveLine: '#a39d90',
  roof: '#9a5634',
  roofLight: '#b9703f',
  ochre: '#e3b956',
  teal: '#9fd0cc',
  white: '#f3efe3',
  terra: '#cf7d50',
  indigo: '#24347a',
  indigoMid: '#3d55a6',
  indigoPale: '#c9d4ef',
  cream: '#f6e9cc',
  sign: '#fffaea',
  trunk: '#7b5a3a',
  water: '#7b6a42',
  waterDeep: '#4c4029',
  waterShine: '#e8dfc2',
  tar: '#3e3e42',
  crack: '#17120d',
  dust: '#d9cbb0',
} as const;

/** Made-up, everyday signs on Abeokuta's row (3.5). No brands. */
export const ABEOKUTA_SIGNS = ['ADIRE', 'FINE CLOTH', 'OFADA RICE', 'TAILOR', 'PROVISIONS'] as const;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

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

function board(g: G, x: number, y: number, w: number, words: string, pic?: (cx: number, cy: number) => void): void {
  box(g, x, y, w, 18, ABK.sign, 1.3);
  if (pic) pic(x + 10, y + 9);
  text(g, words, x + w / 2 + (pic ? 7 : 0), y + 9.5, 9, w - (pic ? 22 : 6));
}

function blob(g: G, cx: number, cy: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fill();
}

// ---------------------------------------------------------------- adire cloth

/**
 * One length of adire, our own patterns only (OG-R1): 0 rings, 1 stripes and dots, 2 folds
 * (fanned lines), 3 dotted squares. (x, y) is its top left on the line; the hem is a little wavy.
 */
export function drawAdireCloth(g: G, x: number, y: number, w: number, h: number, kind: number, light = false): void {
  const base = light ? ABK.indigoMid : ABK.indigo;
  g.fillStyle = base;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h);
  for (let i = 4; i >= 0; i--) g.lineTo(x + (i * w) / 4, y + h + (i % 2 ? 2 : -1));
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = ABK.indigoPale;
  g.strokeStyle = ABK.indigoPale;
  g.lineWidth = 1;
  const k = ((kind % 4) + 4) % 4;
  if (k === 0) {
    for (let cy = y + 6; cy < y + h; cy += 10) {
      for (let cx = x + 5 + ((cy - y) % 20 ? 5 : 0); cx < x + w; cx += 10) {
        g.beginPath();
        g.arc(cx, cy, 3, 0, TAU);
        g.stroke();
        g.fillRect(cx - 0.5, cy - 0.5, 1, 1);
      }
    }
  } else if (k === 1) {
    for (let sx = x + 4; sx < x + w; sx += 9) {
      g.fillRect(sx, y, 1.5, h + 3);
      for (let dy = y + 4; dy < y + h; dy += 6) g.fillRect(sx + 4, dy, 1.5, 1.5);
    }
  } else if (k === 2) {
    for (let fy = y + 10; fy < y + h + 10; fy += 14) {
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        g.moveTo(x + w / 2, fy);
        g.lineTo(x + (i * w) / 4, fy - 9);
      }
      g.stroke();
    }
  } else {
    for (let sy = y + 3; sy < y + h; sy += 11) {
      for (let sx = x + 3; sx < x + w - 2; sx += 11) {
        g.strokeRect(sx, sy, 7, 7);
        g.fillRect(sx + 3, sy + 3, 1.5, 1.5);
      }
    }
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.strokeRect(x, y, w, 0.1);
}

/** A high line on two poles from x0 to x1 at y, with pegs and cloths hanging from it. */
function clothLine(g: G, x0: number, x1: number, y: number, base: number, cloths: readonly (readonly [number, number, number, number])[]): void {
  g.fillStyle = ABK.trunk;
  g.fillRect(x0 - 2, y - 4, 3, base - y + 4);
  g.fillRect(x1 - 1, y - 4, 3, base - y + 4);
  g.strokeStyle = '#5b4636';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y);
  g.quadraticCurveTo((x0 + x1) / 2, y + 5, x1, y);
  g.stroke();
  for (const [cx, w, h, kind] of cloths) {
    const sag = 4 * (1 - (((cx + w / 2 - x0) / (x1 - x0)) * 2 - 1) ** 2);
    drawAdireCloth(g, cx, y + sag, w, h, kind, kind === 3);
    g.fillStyle = ABK.cream;
    g.fillRect(cx + 2, y + sag - 2, 2, 4);
    g.fillRect(cx + w - 4, y + sag - 2, 2, 4);
  }
}

/** A clay dye pot (indigo inside), a cloth draped over its rim. (x, base) is its foot. */
function dyePot(g: G, x: number, base: number, s = 1, cloth = false): void {
  g.save();
  g.translate(x, base);
  g.scale(s, s);
  g.fillStyle = '#9a5532';
  g.beginPath();
  g.moveTo(-12, -20);
  g.quadraticCurveTo(-16, -6, -8, 0);
  g.lineTo(8, 0);
  g.quadraticCurveTo(16, -6, 12, -20);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.stroke();
  g.fillStyle = ABK.indigo;
  g.beginPath();
  g.ellipse(0, -20, 12, 3, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = ABK.cream;
  for (let d = -8; d <= 8; d += 4) g.fillRect(d - 0.8, -11, 1.6, 1.6);
  if (cloth) {
    g.fillStyle = ABK.indigoMid;
    g.beginPath();
    g.moveTo(4, -21);
    g.quadraticCurveTo(14, -22, 15, -8);
    g.lineTo(11, -8);
    g.quadraticCurveTo(11, -17, 4, -18);
    g.fill();
  }
  g.restore();
}

/** A neat pile of folded cloth: alternating indigo and white folds. (x, base) bottom left. */
function foldedPile(g: G, x: number, base: number, w: number, n: number): void {
  for (let i = 0; i < n; i++) {
    box(g, x + (i % 2), base - (i + 1) * 4, w, 4, i % 2 ? ABK.indigoMid : ABK.indigo, 0.7, 1);
    g.fillStyle = ABK.indigoPale;
    for (let d = x + 3; d < x + w - 2; d += 5) g.fillRect(d + (i % 2), base - (i + 1) * 4 + 1.5, 1, 1);
  }
}

// ---------------------------------------------------------------- sky

const skyLayer = { layer: null as PixelLayer | null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, ABK.skyTop);
  grad.addColorStop(1, ABK.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // A small, high midday sun (centre left), with a pale ring
  blob(g, w * 0.32, 34, 30, ABK.sunRing);
  blob(g, w * 0.32, 34, 19, ABK.sun);
}

/** The midday sky, its high sun and a few round puffy clouds. Screen space. */
export function drawAbeokutaSky(g: G, camX: number, viewW: number, time: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (blitLayer(g, skyLayer, `${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = ABK.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
  g.fillStyle = ABK.cloud;
  const span = viewW + 300;
  for (let i = 0; i < 3; i++) {
    const x = ((((i * 330 + 120 - camX * 0.04 - time * 2.5) % span) + span) % span) - 150;
    const y = 26 + i * 30;
    g.beginPath();
    g.arc(x, y, 10, 0, TAU);
    g.arc(x + 14, y - 6, 13, 0, TAU);
    g.arc(x + 30, y - 2, 11, 0, TAU);
    g.arc(x + 44, y + 1, 8, 0, TAU);
    g.fill();
    g.fillRect(x, y, 44, 9);
  }
}

// ---------------------------------------------------------------- far rocks and river

const FAR_W = 720;
const FAR_H = 200;
const farLayer = { layer: null as PixelLayer | null };

/** One smooth granite dome, our own: a round hump with soft streaks, lichen and a bush on top. */
function dome(g: G, cx: number, base: number, rw: number, rh: number, seed: number, far: boolean): void {
  const body = far ? ABK.rockFar : ABK.rock;
  const dark = far ? ABK.rockFarDark : ABK.rockDark;
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(cx - rw, base);
  g.bezierCurveTo(cx - rw, base - rh * 0.7, cx - rw * 0.55, base - rh, cx + rw * 0.05, base - rh);
  g.bezierCurveTo(cx + rw * 0.6, base - rh, cx + rw, base - rh * 0.55, cx + rw, base);
  g.closePath();
  g.fill();
  // Shade on the right side, light on the top left (the sun is high and to the left)
  g.save();
  g.clip();
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(cx + rw * 0.75, base - rh * 0.25, rw * 0.5, rh * 0.95, -0.25, 0, TAU);
  g.fill();
  g.fillStyle = far ? '#cdd0c9' : ABK.rockLight;
  g.beginPath();
  g.ellipse(cx - rw * 0.3, base - rh * 0.82, rw * 0.38, rh * 0.16, -0.3, 0, TAU);
  g.fill();
  // Rain streaks down the face (soft, uneven) and lichen dots
  g.strokeStyle = dark;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const sx = cx - rw * 0.5 + hash(seed + i) * rw;
    const sy = base - rh * (0.55 + hash(seed + i + 9) * 0.3);
    g.moveTo(sx, sy);
    g.quadraticCurveTo(sx + 3, sy + rh * 0.25, sx + 1, sy + rh * (0.3 + hash(seed + i + 4) * 0.2));
  }
  g.stroke();
  g.fillStyle = ABK.lichen;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(cx - rw * 0.6 + hash(seed + i + 20) * rw * 1.2, base - rh * (0.2 + hash(seed + i + 30) * 0.5), 3, 2, 0, 0, TAU);
    g.fill();
  }
  g.restore();
  // A bush in a fold on top
  g.fillStyle = far ? ABK.rockFarDark : ABK.bushDark;
  g.beginPath();
  g.arc(cx + rw * 0.25, base - rh * 0.93, 7, Math.PI, TAU);
  g.arc(cx + rw * 0.25 + 9, base - rh * 0.9, 5, Math.PI, TAU);
  g.fill();
}

function paintFar(g: G): void {
  const b = FAR_H;
  // Back row of paler rocks
  dome(g, 120, b - 28, 110, 120, 1, true);
  dome(g, 470, b - 28, 140, 100, 2, true);
  // The river glinting far off: a brown-green band with light glints and two far canoes
  g.fillStyle = ABK.river;
  g.fillRect(0, b - 34, FAR_W, 12);
  g.fillStyle = ABK.riverLight;
  for (let i = 0; i < 14; i++) g.fillRect(hash(i + 50) * FAR_W, b - 31 + (i % 3) * 3, 10 + hash(i + 60) * 14, 1.5);
  g.fillStyle = '#5b4636';
  for (const cx of [300, 610]) {
    g.beginPath();
    g.moveTo(cx - 10, b - 30);
    g.lineTo(cx + 10, b - 30);
    g.lineTo(cx + 7, b - 27);
    g.lineTo(cx - 7, b - 27);
    g.fill();
  }
  // Front rocks, big and smooth, standing up behind the roofs
  dome(g, 250, b, 120, 170, 3, false);
  dome(g, 395, b, 70, 92, 4, false);
  dome(g, 620, b, 105, 140, 5, false);
  // Bush and trees round their feet
  g.fillStyle = ABK.bush;
  for (const [px, r] of [[130, 16], [160, 12], [345, 14], [520, 18], [548, 12], [705, 15]] as const) {
    g.beginPath();
    g.arc(px, b, r, Math.PI, TAU);
    g.fill();
  }
}

/** The rocks and the river far off, at parallax 0.15; painted once and copied. */
export function drawAbeokutaFar(g: G, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = groundY - 36;
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) {
    const x = t * FAR_W - par;
    if (blitLayer(g, farLayer, 'abkFar', x, base - FAR_H, FAR_W, FAR_H, paintFar, true)) continue;
    g.save();
    g.translate(x, base - FAR_H);
    paintFar(g);
    g.restore();
  }
}

// ---------------------------------------------------------------- the row

const ROW_TOP = 150;
const ROW_BASE = 264;
const UNITS = [150, 136, 128, 140, 120, 132] as const;
export const ABEOKUTA_TILE_W = UNITS.reduce((a, b) => a + b, 0);

/** A rust-brown zinc roof, sloping, with ridges. */
function zincRoof(g: G, x: number, y: number, w: number, rise: number): void {
  g.fillStyle = ABK.roof;
  g.beginPath();
  g.moveTo(x - 4, y + 8);
  g.lineTo(x + w / 2, y - rise);
  g.lineTo(x + w + 4, y + 8);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.save();
  g.clip();
  g.fillStyle = ABK.roofLight;
  for (let rx = x; rx < x + w; rx += 7) g.fillRect(rx, y - rise, 2, rise + 8);
  g.restore();
}

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

/** A small sewing machine (the tailor's board and window). */
function sewing(g: G, x: number, y: number, s = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = '#2a2a33';
  g.fillRect(-6, 1, 12, 3);
  g.fillRect(-6, -5, 3, 6);
  g.fillRect(-6, -6, 10, 3);
  g.fillRect(2, -6, 2, 5);
  g.fillStyle = '#d6b84a';
  g.fillRect(-5, -5, 1, 1);
  g.restore();
}

function paintRow(g: G): void {
  const B = ROW_TOP;
  let x = 0;
  const [w0, w1, w2, w3, w4, w5] = UNITS;

  // 0. An adire yard: a low white wall, ADIRE on its board, a high line of cloth, two dye pots
  clothLine(g, x + 8, x + w0 - 8, B - 108, B, [[x + 16, 26, 44, 0], [x + 50, 30, 52, 1], [x + 88, 24, 40, 2], [x + 116, 20, 34, 3]]);
  box(g, x + 4, B - 40, w0 - 8, 40, ABK.white, 1.2, 2);
  g.fillStyle = ABK.indigo;
  g.fillRect(x + 4, B - 34, w0 - 8, 4);
  board(g, x + 30, B - 58, 70, ABEOKUTA_SIGNS[0], (cx, cy) => drawAdireCloth(g, cx - 5, cy - 6, 10, 11, 0));
  dyePot(g, x + 30, B, 0.9, true);
  dyePot(g, x + 62, B, 0.8);
  foldedPile(g, x + 96, B - 2, 22, 4);
  x += w0;

  // 1. FINE CLOTH: an ochre shop with a rust roof, cloth on rails in the window
  zincRoof(g, x + 6, B - 104, w1 - 12, 16);
  box(g, x + 8, B - 98, w1 - 16, 98, ABK.ochre, 1.2, 2);
  board(g, x + 16, B - 90, w1 - 32, ABEOKUTA_SIGNS[1], (cx, cy) => drawAdireCloth(g, cx - 5, cy - 6, 10, 11, 1));
  box(g, x + 18, B - 64, 64, 44, '#d6eef0', 1, 2);
  for (let i = 0; i < 5; i++) {
    const cols = [ABK.indigo, '#e0572b', ABK.indigoMid, '#1aa39a', '#f2b300'];
    box(g, x + 22 + i * 12, B - 60, 10, 34, cols[i]!, 0.6, 1);
  }
  box(g, x + 92, B - 54, 26, 54, '#5b4636');
  x += w1;

  // 2. An open yard: a mango tree, a long cloth line, a bench (the gap shows the rocks and river)
  g.fillStyle = ABK.trunk;
  g.fillRect(x + 100, B - 64, 8, 64);
  for (const [cx, cy, r, c] of [[92, -78, 18, ABK.bushDark], [116, -82, 20, ABK.bushDark], [104, -98, 18, ABK.bush], [96, -86, 10, ABK.bush]] as const) blob(g, x + cx, B + cy, r, c);
  clothLine(g, x + 6, x + 80, B - 96, B, [[x + 12, 22, 46, 2], [x + 38, 18, 38, 0], [x + 58, 18, 42, 1]]);
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 20, B - 12, 50, 4);
  g.fillRect(x + 24, B - 8, 3, 8);
  g.fillRect(x + 63, B - 8, 3, 8);
  x += w2;

  // 3. The ofada buka: OFADA RICE on its board, a pale teal wall, a bench and a steaming pot
  zincRoof(g, x + 4, B - 94, w3 - 8, 14);
  box(g, x + 6, B - 88, w3 - 12, 88, ABK.teal, 1.2, 2);
  board(g, x + 12, B - 80, w3 - 24, ABEOKUTA_SIGNS[2], (cx, cy) => leafPack(g, cx, cy, 0.9));
  box(g, x + 14, B - 54, 24, 54, '#5b4636');
  box(g, x + 48, B - 54, 78, 26, '#fff7df', 1, 2);
  g.fillStyle = ABK.indigo;
  for (let d = x + 52; d < x + 124; d += 8) g.fillRect(d, B - 50, 4, 4);
  g.fillStyle = '#4a4a50';
  g.fillRect(x + 94, B - 22, 22, 12);
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 44, B - 12, 44, 4);
  g.fillRect(x + 48, B - 8, 3, 8);
  g.fillRect(x + 82, B - 8, 3, 8);
  x += w3;

  // 4. TAILOR: a white shop, a dress on a stand in the window
  zincRoof(g, x + 6, B - 92, w4 - 12, 12);
  box(g, x + 8, B - 86, w4 - 16, 86, ABK.white, 1.2, 2);
  board(g, x + 14, B - 78, w4 - 28, ABEOKUTA_SIGNS[3], (cx, cy) => sewing(g, cx, cy + 1, 1));
  box(g, x + 18, B - 54, 54, 36, '#d6eef0', 1, 2);
  g.fillStyle = ABK.indigoMid;
  g.beginPath();
  g.moveTo(x + 38, B - 48);
  g.lineTo(x + 52, B - 48);
  g.lineTo(x + 58, B - 22);
  g.lineTo(x + 32, B - 22);
  g.fill();
  g.fillStyle = ABK.indigoPale;
  for (let d = 0; d < 3; d++) g.fillRect(x + 38 + d * 6, B - 36, 2, 2);
  sewing(g, x + 64, B - 24, 0.9);
  box(g, x + 82, B - 52, 22, 52, '#5b4636');
  x += w4;

  // 5. PROVISIONS: a terracotta shop, shelves of plain tins and packets
  zincRoof(g, x + 4, B - 100, w5 - 8, 14);
  box(g, x + 6, B - 94, w5 - 12, 94, ABK.terra, 1.2, 2);
  board(g, x + 12, B - 86, w5 - 24, ABEOKUTA_SIGNS[4], (cx, cy) => {
    box(g, cx - 6, cy - 5, 6, 10, '#f39c12', 0, 1);
    box(g, cx + 1, cy - 3, 6, 8, '#2fa36b', 0, 1);
  });
  box(g, x + 16, B - 60, 70, 44, '#f6efd9', 1, 2);
  for (let r = 0; r < 3; r++) {
    g.fillStyle = '#8b6a48';
    g.fillRect(x + 18, B - 46 + r * 14, 66, 2);
    for (let i = 0; i < 6; i++) box(g, x + 20 + i * 11, B - 56 + r * 14, 8, 10, ['#f2b300', '#1aa39a', '#d6336c', '#2b59c3', '#e0572b', '#3f8f4a'][(i + r) % 6]!, 0, 1);
  }
  box(g, x + 96, B - 56, 26, 56, '#5b4636');
}

const rowLayer = { layer: null as PixelLayer | null };

/** Abeokuta's near row at half camera speed, with the granite-slab pavement down to the road. */
export function drawAbeokutaRow(g: G, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = ROW_BASE - (GROUND_Y - groundY);
  g.fillStyle = ABK.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = ABK.paveTop;
  g.fillRect(0, base, viewW, 3);
  // Paving slab joints, scrolling with the road
  g.fillStyle = ABK.paveLine;
  const off = camX % 36;
  for (let px = -off; px < viewW; px += 36) {
    g.fillRect(px, base + 3, 1.5, groundY - base - 3);
    g.fillRect(px + 18, base + 16, 1.5, groundY - base - 16);
  }
  g.fillRect(0, base + 15, viewW, 1.5);
  const par = camX * 0.5;
  for (let t = Math.floor(par / ABEOKUTA_TILE_W); t * ABEOKUTA_TILE_W - par < viewW; t++) {
    const x = t * ABEOKUTA_TILE_W - par;
    if (blitLayer(g, rowLayer, 'abeokuta', x, base - ROW_TOP, ABEOKUTA_TILE_W, ROW_TOP, paintRow, true)) continue;
    g.save();
    g.translate(x, base - ROW_TOP);
    paintRow(g);
    g.restore();
  }
}

/**
 * Every screen-space layer behind Abeokuta's road, back to front: sky, the rocks and river far
 * off, the row. still (reduced motion): the clouds hold still.
 */
export function drawAbeokutaBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND_Y, still = false): void {
  drawAbeokutaSky(g, camX, viewW, still || !Number.isFinite(time) ? 0 : time, viewH);
  drawAbeokutaFar(g, camX, viewW, groundY);
  drawAbeokutaRow(g, camX, viewW, groundY);
}

// ---------------------------------------------------------------- platforms

/**
 * World space. Abeokuta's roof platform (drawThemeStall): a dyer's drying shed, a rust zinc roof
 * with an indigo cloth edge of white rings, wooden posts, folded cloth piled under it. Its top
 * edge is exactly topY (the landing line).
 */
export function drawAbeokutaStall(g: G, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  g.fillStyle = '#6b4a2b';
  g.fillRect(x + 6, topY + 10, 4, groundY - topY - 10);
  g.fillRect(x + w - 10, topY + 10, 4, groundY - topY - 10);
  if (groundY - topY > 40) for (let px = x + 18; px < x + w - 40; px += 46) foldedPile(g, px, groundY, 26, 4 + (px % 3));
  // Indigo cloth edge with white rings under the roof
  g.fillStyle = ABK.indigo;
  g.fillRect(x + 2, topY + 9, w - 4, 7);
  g.strokeStyle = ABK.indigoPale;
  g.lineWidth = 1;
  for (let d = x + 8; d < x + w - 4; d += 10) {
    g.beginPath();
    g.arc(d, topY + 12.5, 2, 0, TAU);
    g.stroke();
  }
  box(g, x, topY, w, 10, ABK.roof, 1.5, 3);
  g.fillStyle = ABK.roofLight;
  g.fillRect(x + 2, topY + 1, w - 4, 2.5);
  g.fillStyle = 'rgba(0,0,0,0.2)';
  for (let i = x + 8; i < x + w - 4; i += 8) g.fillRect(i, topY + 3.5, 1.5, 6);
}

/**
 * World space. A rock step (3.3, decision 77): our own big smooth granite boulder, x to x + w,
 * its top exactly at groundY - h (the landing line, outlined). It stands on the road. If `gap`
 * [x0, x1] is given (a pothole under a long ledge), the body is open there and only the top
 * slab spans it. Never carved stairs, steps cut into rock, carvings or anything holy.
 */
export function drawRock(g: G, x: number, w: number, h: number, groundY = GROUND_Y, gap?: readonly [number, number]): void {
  const top = groundY - h;
  const r = Math.min(16, h / 2, w / 4);
  const bulge = Math.min(8, w * 0.08);
  const seed = Math.round(x);
  const outlineBody = (): void => {
    g.beginPath();
    g.moveTo(x - bulge, groundY + 2);
    g.quadraticCurveTo(x - bulge - 2, top + h * 0.45, x, top + r);
    g.quadraticCurveTo(x, top, x + r, top);
    g.lineTo(x + w - r, top);
    g.quadraticCurveTo(x + w, top, x + w, top + r);
    g.quadraticCurveTo(x + w + bulge + 2, top + h * 0.45, x + w + bulge, groundY + 2);
    g.closePath();
  };
  g.save();
  if (gap && gap[1] > gap[0]) {
    // Body only where there is road under it; the top slab spans the hole
    const slab = Math.min(30, h * 0.4);
    g.beginPath();
    g.rect(x - bulge - 4, top - 2, gap[0] - (x - bulge - 4), h + 10);
    g.rect(gap[1], top - 2, x + w + bulge + 4 - gap[1], h + 10);
    g.rect(gap[0] - 1, top - 2, gap[1] - gap[0] + 2, slab + 2);
    g.clip();
  }
  outlineBody();
  g.fillStyle = ABK.rock;
  g.fill();
  g.save();
  g.clip();
  // Shade low and right, light along the top
  g.fillStyle = ABK.rockDark;
  g.beginPath();
  g.ellipse(x + w * 0.8, groundY, w * 0.45, h * 0.75, 0, 0, TAU);
  g.fill();
  g.fillStyle = ABK.rockLight;
  g.fillRect(x, top, w, Math.min(6, h * 0.2));
  // Soft rain streaks and lichen spots (natural, never marks or signs)
  g.strokeStyle = ABK.rockDark;
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  g.beginPath();
  const n = Math.max(1, Math.floor(w / 45));
  for (let i = 0; i < n; i++) {
    const sx = x + 10 + hash(seed + i) * (w - 20);
    g.moveTo(sx, top + 7);
    g.quadraticCurveTo(sx + 3, top + h * 0.3, sx + 1, top + Math.min(h - 4, 10 + h * 0.4 * (0.5 + hash(seed + i + 3))));
  }
  g.stroke();
  g.fillStyle = ABK.lichen;
  for (let i = 0; i < n + 1; i++) {
    g.beginPath();
    g.ellipse(x + 8 + hash(seed + i + 7) * (w - 16), top + 8 + hash(seed + i + 11) * Math.max(1, h - 16), 3, 1.8, 0, 0, TAU);
    g.fill();
  }
  g.restore();
  outlineBody();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
  if (gap && gap[1] > gap[0]) {
    // The slab's rough underside over the hole
    const slab = Math.min(30, h * 0.4);
    g.fillStyle = ABK.rockDark;
    g.beginPath();
    g.moveTo(gap[0], top + slab);
    for (let i = 0; i <= 6; i++) g.lineTo(gap[0] + ((gap[1] - gap[0]) * i) / 6, top + slab + (i % 2 ? 3 : -1));
    g.lineTo(gap[1], top + slab - 6);
    g.lineTo(gap[0], top + slab - 6);
    g.closePath();
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(gap[0], top + slab);
    for (let i = 0; i <= 6; i++) g.lineTo(gap[0] + ((gap[1] - gap[0]) * i) / 6, top + slab + (i % 2 ? 3 : -1));
    g.stroke();
  }
  // The landing line: a crisp top edge
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(x + r * 0.6, top);
  g.lineTo(x + w - r * 0.6, top);
  g.stroke();
  // Grass tufts at the foot
  g.strokeStyle = ABK.bush;
  g.lineWidth = 1.4;
  g.beginPath();
  for (const fx of [x - bulge + 2, x + w + bulge - 2]) {
    if (gap && fx > gap[0] && fx < gap[1]) continue;
    g.moveTo(fx, groundY);
    g.lineTo(fx - 3, groundY - 6);
    g.moveTo(fx, groundY);
    g.lineTo(fx + 2, groundY - 7);
  }
  g.stroke();
}

// ---------------------------------------------------------------- water pothole

/**
 * World space. A pothole holding brown rain water (3.3, look only): the same hole as every
 * pothole, its water sitting 10 u below the road with a ripple ring and shine, so it still reads
 * as a hole to jump. still: the ring holds still.
 */
export function drawWaterPothole(g: G, x0: number, x1: number, groundY = GROUND_Y, viewH = 420, time = 0, still = false): void {
  drawPothole(g, x0, x1, groundY, viewH);
  const w = x1 - x0;
  if (!(w > 8)) return;
  const wy = groundY + 10;
  g.fillStyle = ABK.water;
  g.fillRect(x0 + 3, wy, w - 6, 24);
  g.fillStyle = ABK.waterDeep;
  g.fillRect(x0 + 3, wy + 12, w - 6, 12);
  g.fillStyle = ABK.waterShine;
  g.fillRect(x0 + 6, wy + 2, Math.min(12, w * 0.3), 1.6);
  g.fillRect(x0 + w * 0.55, wy + 5, Math.min(8, w * 0.2), 1.4);
  // A ripple ring that spreads and fades
  const k = still ? 0.45 : (((Number.isFinite(time) ? time : 0) * 0.6 + hash(x0)) % 1);
  g.strokeStyle = ABK.waterShine;
  g.lineWidth = 1.2;
  g.globalAlpha = 0.95 - k * 0.7;
  g.beginPath();
  g.ellipse(x0 + w / 2, wy + 4, 2 + k * Math.min(14, w / 2 - 6), 0.8 + k * 2, 0, 0, TAU);
  g.stroke();
  g.globalAlpha = 1;
  // The broken rims stand above the water, edged in ink so the lips read
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x0, groundY);
  g.lineTo(x0 + 5, wy);
  g.moveTo(x1, groundY);
  g.lineTo(x1 - 5, wy);
  g.stroke();
}

// ---------------------------------------------------------------- cracks

/** Crack timing: it rumbles and opens over `openTime` s (3.3). */
export const CRACK = { openTime: 0.4 } as const;

function zig(g: G, x: number, w: number, y0: number, y1: number, seed: number): void {
  const n = 6;
  g.beginPath();
  g.moveTo(x + w / 2, y0);
  for (let i = 1; i <= n; i++) g.lineTo(x + w / 2 + (i % 2 ? -1 : 1) * (w * 0.18 + hash(seed + i) * w * 0.12), y0 + ((y1 - y0) * i) / n);
}

/**
 * World space. A crack across the road from x to x + w (3.3; width 40 or 60). open: 0 shut (a
 * zigzag line through the tar and a notch in the edge, dust rising), 0 to 1 opening (it shakes,
 * widens and chunks fall: about 0.4 s, CRACK.openTime), 1 open (a pothole with cracked rims;
 * the game treats it as one). still: no shake, the dust holds still.
 */
export function drawCrack(g: G, x: number, w: number, groundY = GROUND_Y, viewH = 420, open = 0, time = 0, still = false): void {
  const k = Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 0;
  const t = still || !Number.isFinite(time) ? 0 : time;
  const y = groundY;
  const seed = Math.round(x);
  g.save();
  if (k > 0 && k < 1 && !still) g.translate(Math.sin(t * 70) * 1.5, Math.cos(t * 55) * 0.8);
  const gapK = k < 0.5 ? 0 : (k - 0.5) / 0.5;
  if (gapK > 0) {
    // The hole opens out from the middle
    const half = (w / 2) * gapK;
    drawPothole(g, x + w / 2 - half, x + w / 2 + half, y, viewH);
  }
  g.strokeStyle = ABK.crack;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (gapK <= 0) {
    // The zigzag through the tar, wider as it starts to open, and a notch in the road edge
    g.lineWidth = 2 + k * 4;
    zig(g, x, w, y, Math.min(viewH, y + 30 + k * 12), seed);
    g.stroke();
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x + w * 0.4, y + 9);
    g.lineTo(x + w * 0.12, y + 15);
    g.moveTo(x + w * 0.58, y + 20);
    g.lineTo(x + w * 0.88, y + 25);
    g.moveTo(x + w * 0.38, y);
    g.lineTo(x + w * 0.5, y + 4);
    g.lineTo(x + w * 0.62, y);
    g.stroke();
  } else {
    // Cracks running out from both lips of the hole
    const half = (w / 2) * gapK;
    g.lineWidth = 1.4;
    g.beginPath();
    for (const [lip, dir] of [[x + w / 2 - half, -1], [x + w / 2 + half, 1]] as const) {
      g.moveTo(lip, y + 6);
      g.lineTo(lip + dir * 7, y + 10);
      g.lineTo(lip + dir * 11, y + 7);
      g.moveTo(lip, y + 20);
      g.lineTo(lip + dir * 9, y + 26);
    }
    g.stroke();
  }
  // Chunks falling while it opens
  if (k > 0.2 && k < 1) {
    g.fillStyle = ABK.tar;
    for (let i = 0; i < 4; i++) {
      const dx = x + w * (0.25 + i * 0.17);
      const dy = y + 4 + (k - 0.2) * 40 * (0.6 + hash(seed + i) * 0.6);
      g.fillRect(dx, dy, 4, 3);
    }
  }
  g.restore();
  // Dust puffs rising from it: two small ones shut, a burst while it opens
  g.fillStyle = ABK.dust;
  const puffs = k > 0 && k < 1 ? 5 : 2;
  for (let i = 0; i < puffs; i++) {
    const p = (t * 0.7 + i / puffs + hash(seed + i)) % 1;
    const big = k > 0 && k < 1 ? 1.8 : 1;
    g.globalAlpha = 0.8 * (1 - p);
    g.beginPath();
    g.arc(x + w * (0.3 + 0.4 * (i / Math.max(1, puffs - 1))) + p * 4, y - 2 - p * 14 * big, (2 + p * 4) * big, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

/**
 * World space. The crack warning sign (3.3): the same yellow board and post as the pothole sign
 * (POTHOLE_SIGN), its own picture: a road bar split by a black zigzag, a dotted hop over it
 * ending in an arrow. It differs from the pothole sign by shape, not colour. No words.
 */
export function drawCrackSign(g: G, x: number, groundY = GROUND_Y): void {
  const { boardW: W, boardH: H, height, postW } = POTHOLE_SIGN;
  g.save();
  g.translate(x, groundY);
  g.fillStyle = '#6b5a45';
  g.beginPath();
  g.ellipse(0, 0, 5, 1.6, 0, Math.PI, 0);
  g.fill();
  g.rotate(POTHOLE_SIGN.lean);
  g.fillStyle = '#5a3d24';
  g.fillRect(-postW / 2, -height + 4, postW, height - 4);
  box(g, -W / 2, -height, W, H, SIGN_YELLOW, 1.5, 2);
  const by = -height + H - 7;
  // Road bar, split by a zigzag crack
  g.fillStyle = INK;
  g.fillRect(-W / 2 + 4, by, W - 8, 3.5);
  g.fillStyle = SIGN_YELLOW;
  g.beginPath();
  g.moveTo(-2, by - 0.5);
  g.lineTo(1.5, by + 1.6);
  g.lineTo(-1, by + 4);
  g.lineTo(2.5, by + 4);
  g.lineTo(4, by + 1.6);
  g.lineTo(2, by - 0.5);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.lineJoin = 'miter';
  g.beginPath();
  g.moveTo(0, by - 6);
  g.lineTo(2.5, by - 3);
  g.lineTo(0.5, by - 1);
  g.stroke();
  // Dotted hop over it, ending in an arrow
  g.setLineDash([1.6, 1.8]);
  g.beginPath();
  g.moveTo(-11, by - 1);
  g.quadraticCurveTo(1, -height + 1, 11, by - 2);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(8.5, by - 5);
  g.lineTo(11.5, by - 1.5);
  g.lineTo(13, by - 6);
  g.stroke();
  g.restore();
}

/** Abeokuta's sounds (code-made, our own). Gamedev adds the names to SoundName and calls addSounds. */
export type AbeokutaSoundName = 'crackRumble';
/** The crack's low, soft "krrk" as it opens (3.3): a low rumble with two small grit clicks; 0.4 s. */
export const ABEOKUTA_SOUNDS: Readonly<Record<AbeokutaSoundName, Recipe>> = {
  crackRumble: {
    tones: [
      { f: 70, len: 0.36, wave: 'triangle', to: 46, vol: 0.06 },
      { f: 140, len: 0.12, wave: 'sine', to: 90, vol: 0.025, at: 0.02 },
    ],
    hiss: [
      { len: 0.34, lp: 420, vol: 0.04 },
      { len: 0.035, at: 0.06, bp: 2200, vol: 0.02 },
      { len: 0.035, at: 0.19, bp: 1800, vol: 0.018 },
    ],
  },
};

// ---------------------------------------------------------------- ofada

/** Ofada rice and its dark pepper sauce on an open green leaf, centred near (0, 0), about 28 u across. */
function ofadaLeaf(g: G, time: number, steam: boolean): void {
  // The leaf, open, with a midrib and a curled tip
  g.fillStyle = '#4f9a3c';
  g.beginPath();
  g.moveTo(-14, 3);
  g.quadraticCurveTo(-8, -4, 0, -3);
  g.quadraticCurveTo(10, -4, 15, 1);
  g.quadraticCurveTo(10, 8, 0, 8);
  g.quadraticCurveTo(-10, 8, -14, 3);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.stroke();
  g.strokeStyle = '#2b5e22';
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-13, 3);
  g.lineTo(14, 2);
  g.stroke();
  // The rice: a soft heap of short, pale brown-flecked grains
  g.fillStyle = '#f4eedd';
  g.beginPath();
  g.ellipse(-3.5, 0, 7, 4.6, 0, Math.PI, TAU);
  g.lineTo(3.5, 1);
  g.lineTo(-10.5, 1);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.stroke();
  g.fillStyle = '#c9a678';
  for (const [rx, ry] of [[-7, -1.5], [-4, -3], [-1, -1], [-5, 0]] as const) g.fillRect(rx, ry, 1.2, 0.8);
  // The dark pepper sauce beside it, with a little oil shine and pieces
  g.fillStyle = '#5a1a10';
  g.beginPath();
  g.ellipse(6.5, 0.5, 5.5, 3.4, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = '#c4501f';
  g.fillRect(4, -1, 3, 1.2);
  g.fillStyle = '#e8d4b0';
  g.fillRect(8, 0, 1.6, 1.4);
  if (steam) {
    g.strokeStyle = WHITE;
    g.lineWidth = 1.3;
    g.lineCap = 'round';
    for (const [sx, ph] of [[-4, 0], [3, 1.6]] as const) {
      const sway = Math.sin(time * 3 + ph);
      g.beginPath();
      g.moveTo(sx, -6);
      g.quadraticCurveTo(sx - 3 + sway, -10, sx + sway, -14);
      g.stroke();
    }
  }
}

/** World space. Ofada on the road (4.1), gently bobbing on a soft halo. Pass time 0 to hold still. */
export function drawOfada(g: G, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  const bob = Math.sin(t * 4) * 2;
  g.fillStyle = 'rgba(255,248,220,0.7)';
  g.beginPath();
  g.arc(x, y + bob, 18, 0, TAU);
  g.fill();
  g.save();
  g.translate(x, y + bob + 2);
  g.scale(1.1, 1.1);
  ofadaLeaf(g, t, true);
  g.restore();
}

/** The leaf alone (HUD chip, toast). size 1 is about 32 u across, as drawFoodIcon. Still. */
export function drawOfadaIcon(g: G, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y + 1 * size);
  g.scale(size * 1.05, size * 1.05);
  ofadaLeaf(g, 0, false);
  g.restore();
}

// ---------------------------------------------------------------- traders

/** Abeokuta's three traders (part 7), in the order of OGUN_WORDS.folk.traders.abeokuta. */
export const ABEOKUTA_TRADERS = ['adire', 'cloth', 'ofada'] as const;
export type AbeokutaTrader = (typeof ABEOKUTA_TRADERS)[number];
/** Each stall's board; each matches its trader's call ("Fine adire!", "New cloth!", "Ofada, hot!"). */
export const ABEOKUTA_STALL_WORDS: Readonly<Record<AbeokutaTrader, string>> = { adire: 'FINE ADIRE', cloth: 'NEW CLOTH', ofada: 'HOT OFADA' };

/**
 * World space, scenery behind the walking line (never something to touch). x is the stall's
 * middle; the trader stands just in front of it. About 56 u wide, 60 u tall.
 */
export function drawAbeokutaTraderStall(g: G, kind: AbeokutaTrader, x: number, groundY = GROUND_Y, time = 0): void {
  const t = Number.isFinite(time) ? time : 0;
  g.save();
  g.translate(x, groundY);
  g.fillStyle = '#7b5a3a';
  g.fillRect(-26, -20, 52, 4);
  g.fillRect(-22, -16, 3, 16);
  g.fillRect(19, -16, 3, 16);
  if (kind === 'adire') {
    // A rail with three adire lengths hanging, a folded pile on the table
    g.fillStyle = '#6b4a2b';
    g.fillRect(-24, -52, 48, 2.5);
    drawAdireCloth(g, -22, -50, 13, 24, 0);
    drawAdireCloth(g, -7, -50, 13, 22, 1, true);
    drawAdireCloth(g, 8, -50, 13, 25, 2);
    foldedPile(g, -18, -20, 20, 2);
  } else if (kind === 'cloth') {
    // Bright new rolls of plain made-up prints standing on the table
    const cols = ['#e0572b', '#1aa39a', '#f2b300', '#7d3c98', '#2f6fd6'];
    for (let i = 0; i < 5; i++) {
      box(g, -24 + i * 10, -46 + (i % 2) * 4, 8, 26 - (i % 2) * 4, cols[i]!, 0.8, 2);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let d = 0; d < 3; d++) g.fillRect(-22 + i * 10, -42 + (i % 2) * 4 + d * 7, 3, 2);
    }
  } else {
    // A cooler of warm ofada, a pot of dark sauce, leaf-wrapped packs and steam (never fire)
    box(g, -24, -36, 18, 16, '#1aa39a', 1, 3);
    g.fillStyle = WHITE;
    g.fillRect(-24, -32, 18, 2);
    box(g, -3, -30, 13, 10, '#4a4a50', 1, 3);
    g.fillStyle = '#5a1a10';
    g.fillRect(-2, -31, 11, 2);
    for (const [px, py] of [[16, -23], [23, -23], [19.5, -28]] as const) leafPack(g, px, py, 0.7);
    g.strokeStyle = WHITE;
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(3, -33);
    g.quadraticCurveTo(0 + Math.sin(t * 3), -37, 3 + Math.sin(t * 3), -41);
    g.stroke();
  }
  g.fillStyle = '#6b4a2b';
  g.fillRect(28, -42, 3, 42);
  board(g, 6, -60, 52, ABEOKUTA_STALL_WORDS[kind]);
  g.restore();
}

// ---------------------------------------------------------------- people (part 7)

/**
 * Abeokuta's cast (part 7): 16 looks, every skin tone at least twice, every age, a wheelchair
 * user, glasses, dress from across Nigeria. Adire dyers (a woman at the pot, a man wringing
 * cloth, a teen hanging cloth, an elder woman tying cloth on a low stool); the adire, new cloth
 * and ofada traders; a tailor on a stool; a buyer comparing cloth; a woman in an indigo wrapper
 * with a basket on her head; a man in buba and sokoto with a fila; a woman in a hijab and long
 * dress with shopping; a student; a child (holding a parent's hand); a wheelchair user; an elder
 * in babban riga with glasses. Look codes as folkLook. Never a held broom, helmet or uniform.
 */
export const ABEOKUTA_CAST: readonly FolkLook[] = (
  '2afmcSaLNL. 5amsl-bLF.. 0tfsb-kBN.. 6efrgSgLNL.s 3afmuGaNLLq 1amslKdDGKq 4afrcSgHCHn 6amml-lIM..gs ' +
  '0afmp-jMN.a 5afrc-gLN.g 2amslFbOKO. 4afmuHfQFQl 1tmsa-mBF.b 3cfsp-kGF.. 1amsl-hJM..w 5emmgReIFI.dg'
)
  .split(' ')
  .map(folkLook);

/** The traders in ABEOKUTA_CAST, by stall: they hold up their goods and call their own line. */
export const ABEOKUTA_TRADER_LOOKS: Readonly<Record<AbeokutaTrader, FolkLook>> = {
  adire: ABEOKUTA_CAST[4]!,
  cloth: ABEOKUTA_CAST[5]!,
  ofada: ABEOKUTA_CAST[6]!,
};
/** The four dyers at their pots on the back pavement (scenery behind the walking line). */
export const ABEOKUTA_DYERS: readonly FolkLook[] = ABEOKUTA_CAST.slice(0, 4);
/** The tailor at the sewing machine (sits on a low stool). */
export const ABEOKUTA_TAILOR: FolkLook = ABEOKUTA_CAST[7]!;
/** The child looking at the cloth, and the walker whose hand they hold. */
export const ABEOKUTA_CHILD: readonly [FolkLook, FolkLook] = [ABEOKUTA_CAST[13]!, ABEOKUTA_CAST[9]!];
/** Three people waiting at the bus stop. */
export const ABEOKUTA_BUS_STOP: readonly FolkLook[] = [ABEOKUTA_CAST[10]!, ABEOKUTA_CAST[11]!, ABEOKUTA_CAST[12]!];

/**
 * A tailor's table with a sewing machine (scenery), so the tailor on the stool sits at it.
 * (x, groundY) is the table's middle foot. About 34 u wide.
 */
export function drawTailorTable(g: G, x: number, groundY = GROUND_Y): void {
  g.save();
  g.translate(x, groundY);
  g.fillStyle = '#7b5a3a';
  g.fillRect(-17, -22, 34, 4);
  g.fillRect(-15, -18, 3, 18);
  g.fillRect(12, -18, 3, 18);
  sewing(g, 2, -26, 1.4);
  drawAdireCloth(g, -14, -24, 10, 8, 1, true);
  g.restore();
}

// ---------------------------------------------------------------- the well room (3.7)

/** The Ogun well room (room units, as the Lagos room: floor 300, beam 116, ropes at 60 and 500). */
export const OGUN_ROOM = {
  w: 560,
  floorY: 300,
  beamY: 116,
  arriveX: 60,
  exitX: 500,
} as const;

/** The store keeper (3.7): an elder man in buba and sokoto with a soft fila, on a low stool. Frames: sit, wave0/1, clap0/1. */
export const OGUN_STORE_KEEPER: FolkLook = folkLook('3emsgFbFLL.ds');
/** Where he sits (room units): by the back wall at x 60 to 100, well away from the rope's hang. */
export const OGUN_STORE_KEEPER_SPOT = { x: 86, y: 292 } as const;

const R = {
  deep: '#141a1f',
  wall: '#8d989c',
  wallLight: '#a6b0b2',
  wallDark: '#717c82',
  stone: '#a49f95',
  stoneDark: '#7f7b73',
  ceiling: '#3f3428',
  beam: '#5e4a36',
  beamLight: '#7a6249',
  floor: '#6e6a5e',
  floorTop: '#8a8576',
  plank: '#c09062',
  plankDark: '#8e6440',
  sack: '#e3d3ac',
  sackDark: '#bfa97b',
  sackTie: '#7a5232',
  garri: '#f3ead0',
  shaft: 'rgba(255,248,214,0.16)',
} as const;

/** A tied garri sack, centred at x, its bottom on y. */
function sack(g: G, x: number, y: number, w: number, h: number, seed: number): void {
  g.fillStyle = R.sack;
  g.beginPath();
  g.moveTo(x - w / 2 + 2, y);
  g.quadraticCurveTo(x - w / 2 - 2, y - h * 0.5, x - w / 2 + 3, y - h);
  g.lineTo(x + w / 2 - 3, y - h);
  g.quadraticCurveTo(x + w / 2 + 2, y - h * 0.5, x + w / 2 - 2, y);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = R.sackDark;
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x - w / 2 + 4, y - h * 0.5);
  g.quadraticCurveTo(x, y - h * 0.42, x + w / 2 - 4, y - h * 0.5);
  g.stroke();
  // A small made-up stamp: an indigo ring with a dot (no words, no brand)
  g.strokeStyle = ABK.indigo;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x + (hash(seed) - 0.5) * w * 0.3, y - h * 0.3, Math.min(4, h * 0.18), 0, TAU);
  g.stroke();
}

/**
 * Room units. Stacked garri sacks as a platform: from x to x + w, top exactly at topY, standing
 * on the floor. The top row's flat tops make the landing line (outlined).
 */
export function drawSackStack(g: G, x: number, topY: number, w: number, floorY = OGUN_ROOM.floorY): void {
  const h = floorY - topY;
  const rows = Math.max(1, Math.round(h / 26));
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const n = Math.max(1, Math.round(w / 40) - (r % 2));
    const sw = w / n;
    const off = r % 2 ? sw / 2 : 0;
    const nn = r % 2 ? n - 1 : n;
    for (let i = 0; i < Math.max(1, nn); i++) sack(g, x + off + sw * i + sw / 2, floorY - r * rh, sw - 1, rh + 1, x + r * 7 + i);
  }
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x + 3, topY);
  g.lineTo(x + w - 3, topY);
  g.stroke();
}

/** Room units. A plank shelf on two wooden legs (a one-way platform): top exactly at y. */
export function drawOgunShelf(g: G, x: number, y: number, w: number, floorY = OGUN_ROOM.floorY): void {
  g.fillStyle = R.plankDark;
  g.fillRect(x + 8, y + 6, 5, floorY - y - 6);
  g.fillRect(x + w - 13, y + 6, 5, floorY - y - 6);
  g.fillRect(x + 8, y + (floorY - y) * 0.6, w - 16, 3);
  // A basin of garri on the low rail (out of the way of the landing)
  g.fillStyle = '#2f6fd6';
  g.beginPath();
  g.moveTo(x + w / 2 - 16, y + (floorY - y) * 0.6);
  g.lineTo(x + w / 2 + 16, y + (floorY - y) * 0.6);
  g.lineTo(x + w / 2 + 11, y + (floorY - y) * 0.6 + 10);
  g.lineTo(x + w / 2 - 11, y + (floorY - y) * 0.6 + 10);
  g.closePath();
  g.fill();
  g.fillStyle = R.garri;
  g.beginPath();
  g.ellipse(x + w / 2, y + (floorY - y) * 0.6, 15, 4, 0, Math.PI, TAU);
  g.fill();
  box(g, x, y, w, 7, R.plank, 1.2, 1.5);
  g.fillStyle = R.plankDark;
  g.fillRect(x + 2, y + 4, w - 4, 1);
}

/**
 * The Ijebu garri store room (3.7) behind everything: cool blue-grey plaster walls on a course
 * of granite stones, timber beams, daylight falling through the two ceiling holes (no flame),
 * sacks and enamel basins of fine garri along the back wall, and a high wall shelf of folded
 * adire. World space (room units); pass the camera so dark earth fills a wide screen.
 * Nothing moves but the dust in the light (still in reduced motion).
 */
export function drawOgunWellRoom(g: G, camX: number, viewW: number, time: number, viewH = 420, still = false): void {
  const t = still || !Number.isFinite(time) ? 0 : time;
  const W = OGUN_ROOM.w;
  const F = OGUN_ROOM.floorY;
  const B = OGUN_ROOM.beamY;
  g.fillStyle = R.deep;
  g.fillRect(camX - 10, 0, viewW + 20, viewH);
  // Plaster wall with a soft wash band
  g.fillStyle = R.wall;
  g.fillRect(0, 0, W, F);
  g.fillStyle = R.wallLight;
  g.fillRect(0, 150, W, 26);
  g.fillStyle = R.wallDark;
  for (let i = 0; i < 8; i++) g.fillRect(20 + hash(i + 3) * 500, 130 + hash(i + 13) * 80, 18 + hash(i + 23) * 20, 1.5);
  // A course of rounded granite stones at the foot of the wall
  for (let sx = 0; sx < W; sx += 28) {
    for (const [dy, ox] of [[0, 0], [16, 14]] as const) {
      g.fillStyle = (sx / 28 + dy) % 2 ? R.stone : R.stoneDark;
      g.beginPath();
      g.roundRect(sx + ox - 13, F - 40 + dy, 26, 15, 6);
      g.fill();
    }
  }
  // Ceiling and the light from the two holes
  g.fillStyle = R.ceiling;
  g.fillRect(0, 0, W, B - 12);
  for (const x of [OGUN_ROOM.arriveX, OGUN_ROOM.exitX]) {
    g.fillStyle = R.shaft;
    g.beginPath();
    g.moveTo(x - 12, 0);
    g.lineTo(x + 12, 0);
    g.lineTo(x + 32, F);
    g.lineTo(x - 32, F);
    g.closePath();
    g.fill();
    g.fillStyle = '#f7eecd';
    g.beginPath();
    g.ellipse(x, B - 14, 14, 3, 0, 0, TAU);
    g.fill();
    // Dust motes drifting slowly in the light
    g.fillStyle = 'rgba(255,250,225,0.8)';
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.05 + i / 4 + hash(x + i)) % 1;
      g.fillRect(x - 10 + hash(x + i + 5) * 20 + Math.sin(t + i) * 3, B + p * (F - B - 20), 1.5, 1.5);
    }
  }
  // Beam across, posts at the walls
  g.fillStyle = R.beam;
  g.fillRect(0, B - 12, W, 12);
  g.fillStyle = R.beamLight;
  g.fillRect(0, B - 12, W, 3);
  for (const x of [0, W - 30]) {
    g.fillStyle = R.wallDark;
    g.fillRect(x, 0, 30, F);
    g.fillStyle = R.beam;
    g.fillRect(x + (x ? 6 : 22), B - 12, 8, F - B + 12);
  }
  // The high wall shelf with folded adire (scenery, out of reach)
  box(g, 150, 160, 120, 5, R.plank, 1, 1);
  foldedPile(g, 158, 160, 26, 5);
  foldedPile(g, 192, 160, 26, 3);
  foldedPile(g, 226, 160, 30, 6);
  box(g, 330, 168, 90, 5, R.plank, 1, 1);
  // Measuring bowls and a tied sack on the high shelf
  for (const bx of [344, 364]) {
    g.fillStyle = '#d6336c';
    g.beginPath();
    g.ellipse(bx, 166, 7, 4, 0, 0, Math.PI, true);
    g.fill();
  }
  sack(g, 398, 168, 22, 22, 9);
  // Floor of packed earth
  g.fillStyle = R.floor;
  g.fillRect(0, F, W, viewH - F);
  g.fillStyle = R.floorTop;
  g.fillRect(0, F, W, 4);
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 16; i++) g.fillRect(10 + hash(i + 80) * 540, F + 12 + hash(i + 90) * 100, 4, 2);
  // Along the back wall: basins of garri and a short stack of sacks (behind the shelves)
  for (const [bx, col] of [[40, '#1aa39a'], [180, '#2f6fd6'], [470, '#3f8f4a']] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(bx - 16, F - 12);
    g.lineTo(bx + 16, F - 12);
    g.lineTo(bx + 11, F);
    g.lineTo(bx - 11, F);
    g.closePath();
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = R.garri;
    g.beginPath();
    g.ellipse(bx, F - 12, 15, 5, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#d9c79a';
    for (let i = 0; i < 6; i++) g.fillRect(bx - 8 + i * 3, F - 14 - (i % 2) * 2, 1, 1);
  }
  sack(g, 520, F, 26, 30, 4);
  sack(g, 530, F - 30, 22, 22, 5);
}

/** The Ijebu garri parcel (4.1): a small sack tied in indigo adire cloth, the knot on top. Centred on (0, 0), about 24 x 22. */
function parcel(g: G, line: number): void {
  // The sack
  g.fillStyle = R.sack;
  g.beginPath();
  g.moveTo(-9, 10);
  g.quadraticCurveTo(-12, 0, -7, -6);
  g.lineTo(7, -6);
  g.quadraticCurveTo(12, 0, 9, 10);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = line;
  g.stroke();
  // The adire cloth tied round its middle, with white dots
  g.fillStyle = ABK.indigo;
  g.beginPath();
  g.moveTo(-11, -1);
  g.quadraticCurveTo(0, 2, 11, -1);
  g.lineTo(10.5, 6);
  g.quadraticCurveTo(0, 9, -10.5, 6);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = ABK.indigoPale;
  for (let d = -8; d <= 8; d += 4) g.fillRect(d - 0.7, 2.6, 1.4, 1.4);
  // Fine garri peeping out at the top, and the cloth knot with two ears
  g.fillStyle = R.garri;
  g.beginPath();
  g.ellipse(0, -6, 6, 2, 0, 0, TAU);
  g.fill();
  g.fillStyle = ABK.indigo;
  g.beginPath();
  g.ellipse(-4, -9.5, 3.4, 2, -0.5, 0, TAU);
  g.ellipse(4, -9.5, 3.4, 2, 0.5, 0, TAU);
  g.fill();
  g.stroke();
  box(g, -2, -9, 4, 4, ABK.indigoMid, line * 0.8, 1);
}

/** Room units. The Ijebu garri parcel on its shelf, centred on (x, y): it bobs and glints, so it reads as a gift. */
export function drawIjebuParcel(g: G, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  g.save();
  g.translate(x, y + Math.sin(t * 2.4) * 1.5);
  parcel(g, 1.3);
  const k = (t % 2) / 2;
  if (k < 0.25) {
    g.globalAlpha = 1 - k / 0.25;
    g.strokeStyle = '#fff6c2';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(9, -10);
    g.lineTo(9, -16);
    g.moveTo(6, -13);
    g.lineTo(12, -13);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
}

/** Small still parcel for the HUD, centred on (x, y), about `size` across. */
export function drawIjebuParcelIcon(g: G, x: number, y: number, size = 24): void {
  const s = (Number.isFinite(size) ? size : 24) / 26;
  g.save();
  g.translate(x, y + 1 * s);
  g.scale(s, s);
  parcel(g, 1.6);
  g.restore();
}
