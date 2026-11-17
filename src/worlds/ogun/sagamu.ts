/**
 * Sagamu, Ogun street 3 (art O4a; docs/ogun.md 2.2, 2.3, 2.4, 3.3, 3.6 and 7; decisions 72 to
 * 82). Drawn in code, our own. Lives in the lazy Ogun part: import it only from src/worlds/ogun/
 * (gamedev wires it in O4b).
 *
 * Sagamu's own colour note, so it never feels like Lagos (blue to cream), Ota (lilac to apricot,
 * laterite) or Abeokuta (turquoise to lemon, granite): an evening sky of deep coral down to warm
 * gold, a big low orange sun sitting on the far roads, long thin dusk-pink clouds; far off, plum
 * silhouettes: the interchange (a flyover on tall pillars with ramps, tiny trucks and danfos, lamp
 * dots) and a working quarry edge (grey terraces, a crusher shed, a tipper truck, small workers in
 * plain hard hats walking home, never children, never blasting); the near row on dusk-grey
 * concrete with a kerb of yellow and ink: the kola market under flat cloth shades (never umbrellas:
 * a big umbrella can read as a party sign, like the broom of decision 75), "GARRI IJEBU" with
 * basins, the lorry park (plain cement sacks, a tipper of gravel), "IKOKORE", "VULCANIZER",
 * "BATTERY CHARGING"; warm lit windows and street lamps. Every sign is made up or everyday. No
 * brand, crest, party colour or uniform; nothing religious; nobody holds a broom. Kola is only
 * sold: whole nuts in leaf-lined baskets, never broken, prayed over or read (OG-R1).
 *
 * Screen space (no camera translate): drawSagamuBackdrop. World space: the two roads
 * (drawFlyoverDeck, drawFlyoverStep, drawLowRoad), the hopping gravel (drawGravel and its dust,
 * crumble and knocked frames), drawSagamuStall (the roof platform) and drawSagamuTraderStall.
 * Every moving thing takes `time`; pass `still` (reduced motion) and nothing moves.
 */
import { folkLook } from '../../art/folkCasts';
import type { FolkLook } from '../../art/folk';
import { INK, WHITE } from '../../art/palette';
import { blitLayer, GROUND_Y, type PixelLayer } from '../../art/street';
import type { Recipe } from '../../engine/sound';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** Sagamu's colours (2.4: laterite, granite, indigo touches, with cream and danfo yellow). */
export const SAG = {
  skyTop: '#d9566b',
  skyMid: '#f08a5d',
  skyLow: '#ffd27a',
  sun: '#ff9f2e',
  sunRing: '#ffc46b',
  cloud: '#f7a3a0',
  cloudLight: '#ffd0b8',
  far: '#8c5f86',
  farDark: '#6f4a6f',
  farLight: '#a97c9c',
  quarry: '#b39aa5',
  quarryDark: '#94798a',
  quarryLight: '#cdb7bd',
  lampGlow: '#ffe7a0',
  pave: '#8f828a',
  paveTop: '#6d6169',
  paveLine: '#9d9098',
  kerb: '#f2c230',
  roof: '#5d4e66',
  roofLight: '#7a6a84',
  rose: '#e39a86',
  sand: '#ecc985',
  sage: '#a9c9a0',
  plum: '#b88aa6',
  cream: '#f6e9cc',
  window: '#ffd977',
  sign: '#fff6e4',
  shade: '#3d8f8a',
  shadeB: '#e86f3c',
  shadeC: '#f2b300',
  trunk: '#6b4a2b',
  leaf: '#4f9a3c',
  leafDark: '#2b5e22',
  kolaRed: '#c2464f',
  kolaPink: '#e88b8f',
  kolaCream: '#f1dfb8',
  garri: '#f6e7bd',
  concrete: '#c9c2bd',
  concreteLight: '#e3ddd6',
  concreteDark: '#9a918c',
  tar: '#3e3e42',
  tarLight: '#57575c',
  lane: '#f6f0dc',
  under: '#4b4058',
  gravel: '#4a4247',
  gravelDark: '#2f292d',
  stone: '#d9d2c4',
  stoneWarm: '#d08a52',
  dust: '#d9cbb0',
} as const;

/** Made-up, everyday signs on Sagamu's row (3.6). No brands. */
export const SAGAMU_SIGNS = ['KOLA NUTS', 'GARRI IJEBU', 'IKOKORE', 'VULCANIZER', 'BATTERY CHARGING'] as const;

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
  box(g, x, y, w, 18, SAG.sign, 1.3);
  if (pic) pic(x + 10, y + 9);
  text(g, words, x + w / 2 + (pic ? 7 : 0), y + 9.5, 9, w - (pic ? 22 : 6));
}

function blob(g: G, cx: number, cy: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fill();
}

const num = (t: number): number => (Number.isFinite(t) ? t : 0);

// ---------------------------------------------------------------- kola, garri, sacks

/** One whole kola nut, lobed (never split or broken, OG-R1). */
function kolaNut(g: G, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, r * 1.15, r, 0, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(40,20,20,0.55)';
  g.lineWidth = 0.7;
  g.stroke();
  g.beginPath();
  g.moveTo(x - r * 0.2, y - r * 0.8);
  g.quadraticCurveTo(x + r * 0.15, y, x - r * 0.1, y + r * 0.8);
  g.stroke();
}

/**
 * A round basket lined with broad green leaves and heaped with whole kola nuts, red and cream
 * sorted apart (3.6: traders sorting kola). (x, base) is the basket's bottom middle; w its width.
 */
export function drawKolaBasket(g: G, x: number, base: number, w: number, cream = false): void {
  const h = w * 0.42;
  // Leaves poking over the rim
  g.fillStyle = SAG.leaf;
  for (const [dx, a] of [[-0.42, -0.6], [0.42, 0.6], [-0.1, -0.2], [0.18, 0.3]] as const) {
    g.beginPath();
    g.ellipse(x + dx * w, base - h - 1, w * 0.2, w * 0.08, a, 0, TAU);
    g.fill();
  }
  // Heap of nuts
  const nuts = Math.max(5, Math.round(w / 4));
  for (let i = 0; i < nuts; i++) {
    const px = x - w * 0.36 + (i / (nuts - 1)) * w * 0.72;
    const py = base - h - 2 - Math.sin((i / (nuts - 1)) * Math.PI) * w * 0.12;
    kolaNut(g, px, py, w * 0.075, cream ? (i % 3 ? SAG.kolaCream : '#e8cfa0') : i % 3 ? SAG.kolaRed : SAG.kolaPink);
  }
  // The basket: woven, wider at the top
  g.fillStyle = '#c8954f';
  g.beginPath();
  g.moveTo(x - w / 2, base - h);
  g.lineTo(x + w / 2, base - h);
  g.lineTo(x + w * 0.38, base);
  g.lineTo(x - w * 0.38, base);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = '#8f6330';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let r = 1; r < 3; r++) {
    const yy = base - (h * r) / 3;
    g.moveTo(x - w * (0.38 + (0.12 * r) / 3), yy);
    g.lineTo(x + w * (0.38 + (0.12 * r) / 3), yy);
  }
  g.stroke();
}

/** A big enamel basin heaped with fine, crisp Ijebu garri; (x, base) bottom middle. */
function garriBasin(g: G, x: number, base: number, w: number, rim = '#2f6fd6'): void {
  const h = w * 0.3;
  g.fillStyle = SAG.garri;
  g.beginPath();
  g.ellipse(x, base - h, w * 0.46, w * 0.3, 0, Math.PI, TAU);
  g.fill();
  g.strokeStyle = '#b89a62';
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#d9bf86';
  for (let i = 0; i < 9; i++) g.fillRect(x - w * 0.3 + hash(i + w) * w * 0.6, base - h - 2 - hash(i + 9) * w * 0.18, 1.3, 1.3);
  g.fillStyle = WHITE;
  g.beginPath();
  g.moveTo(x - w / 2, base - h);
  g.lineTo(x + w / 2, base - h);
  g.lineTo(x + w * 0.36, base);
  g.lineTo(x - w * 0.36, base);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = rim;
  g.fillRect(x - w / 2, base - h, w, 2.2);
}

/** A plain tied sack (cement or garri: no writing, no brand). */
function sack(g: G, x: number, y: number, w: number, h: number, fill = '#d8ccb4'): void {
  box(g, x, y, w, h, fill, 1, w * 0.3);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x + 2, y + h * 0.5);
  g.lineTo(x + w - 2, y + h * 0.5);
  g.stroke();
}

// ---------------------------------------------------------------- sky

const skyLayer = { layer: null as PixelLayer | null };

function paintSky(g: G, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SAG.skyTop);
  grad.addColorStop(0.55, SAG.skyMid);
  grad.addColorStop(1, SAG.skyLow);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // A big, low evening sun on the right, with a soft ring
  blob(g, w * 0.72, h * 0.78, 52, 'rgba(255,196,107,0.55)');
  blob(g, w * 0.72, h * 0.78, 36, SAG.sun);
}

/** The evening sky, its low sun and long thin clouds drifting slowly. Screen space. */
export function drawSagamuSky(g: G, camX: number, viewW: number, time: number, viewH = 420): void {
  const flat = viewH * 0.75;
  if (blitLayer(g, skyLayer, `sag${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, flat))) {
    g.fillStyle = SAG.skyLow;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else paintSky(g, viewW, viewH);
  const span = viewW + 360;
  for (let i = 0; i < 4; i++) {
    const x = ((((i * 290 + 60 - camX * 0.03 - num(time) * 2) % span) + span) % span) - 180;
    const y = 22 + i * 24;
    const len = 90 + (i % 2) * 50;
    g.fillStyle = i % 2 ? SAG.cloudLight : SAG.cloud;
    g.beginPath();
    g.roundRect(x, y, len, 6, 3);
    g.roundRect(x + 24, y - 5, len * 0.5, 6, 3);
    g.fill();
  }
}

// ---------------------------------------------------------------- far: the interchange and the quarry

const FAR_W = 760;
const FAR_H = 190;
/** How far above the road the far layer's foot sits, so the flyover and quarry show over the roofs. */
const FAR_LIFT = 84;
const farLayer = { layer: null as PixelLayer | null };

/** A tiny truck or danfo silhouette with two light dots (far off). */
function tinyVehicle(g: G, x: number, y: number, danfo: boolean): void {
  g.fillStyle = danfo ? '#f2c230' : SAG.farDark;
  g.fillRect(x, y - 7, danfo ? 14 : 18, 6);
  g.fillStyle = SAG.farDark;
  g.fillRect(x + (danfo ? 0 : 13), y - 9, 5, 8);
  g.fillStyle = SAG.lampGlow;
  g.fillRect(x - 1, y - 4, 1.5, 1.5);
}

/** A small quarry worker walking home: plain hard hat, a bag, never near the face. Far off. */
function tinyWorker(g: G, x: number, base: number, hat: string, seed: number): void {
  g.fillStyle = SAG.farDark;
  g.fillRect(x - 1.5, base - 9, 3, 6);
  g.fillRect(x - 1.5, base - 3, 1.2, 3);
  g.fillRect(x + 0.4, base - 3, 1.2, 3);
  blob(g, x, base - 11, 1.8, '#5a3a2a');
  g.fillStyle = hat;
  g.beginPath();
  g.arc(x, base - 12, 2.2, Math.PI, TAU);
  g.fill();
  g.fillRect(x - 2.8, base - 12.3, 5.6, 0.9);
  if (seed % 2) g.fillRect(x + 1.5, base - 7, 2.4, 3);
}

function paintFar(g: G): void {
  const b = FAR_H;
  // The quarry edge on the left: a cut hill with flat grey terraces (no blasting, nobody near the face)
  g.fillStyle = SAG.farLight;
  g.beginPath();
  g.moveTo(0, b);
  g.lineTo(0, b - 96);
  g.quadraticCurveTo(80, b - 130, 170, b - 118);
  g.lineTo(300, b - 80);
  g.lineTo(330, b);
  g.fill();
  for (let i = 0; i < 4; i++) {
    const top = b - 104 + i * 22;
    g.fillStyle = i % 2 ? SAG.quarry : SAG.quarryLight;
    g.beginPath();
    g.moveTo(40 + i * 18, top);
    g.lineTo(220 - i * 6, top + 4);
    g.lineTo(226 - i * 6, top + 22);
    g.lineTo(34 + i * 18, top + 22);
    g.fill();
    g.fillStyle = SAG.quarryDark;
    g.fillRect(40 + i * 18, top + 18, 184 - i * 24, 4);
  }
  // The crusher shed with a sloping belt and a heap of stones; a tipper truck by it
  g.fillStyle = SAG.farDark;
  g.fillRect(236, b - 64, 44, 34);
  g.fillStyle = SAG.roof;
  g.fillRect(232, b - 68, 52, 6);
  g.strokeStyle = SAG.farDark;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(258, b - 64);
  g.lineTo(304, b - 96);
  g.stroke();
  g.fillStyle = SAG.quarryLight;
  g.beginPath();
  g.moveTo(286, b - 30);
  g.quadraticCurveTo(306, b - 58, 330, b - 30);
  g.fill();
  tinyVehicle(g, 196, b - 30, false);
  // Workers walking home along the path at the hill's foot (small, plain hard hats)
  g.fillStyle = SAG.quarryDark;
  g.fillRect(60, b - 31, 180, 2);
  tinyWorker(g, 92, b - 31, WHITE, 1);
  tinyWorker(g, 104, b - 31, '#f2b300', 2);
  tinyWorker(g, 150, b - 31, WHITE, 3);

  // The interchange: a long flyover on tall pillars, a ramp down each side, lamps
  const deckY = b - 92;
  g.fillStyle = SAG.far;
  for (let px = 380; px < FAR_W - 10; px += 70) g.fillRect(px, deckY + 8, 9, b - deckY - 8);
  g.beginPath();
  g.moveTo(340, b - 30);
  g.lineTo(400, deckY);
  g.lineTo(FAR_W, deckY);
  g.lineTo(FAR_W, deckY + 10);
  g.lineTo(404, deckY + 10);
  g.lineTo(354, b - 30);
  g.fill();
  g.fillStyle = SAG.farDark;
  g.fillRect(400, deckY - 4, FAR_W - 400, 4);
  for (let lx = 430; lx < FAR_W; lx += 90) {
    g.fillRect(lx, deckY - 20, 1.5, 16);
    g.fillRect(lx, deckY - 20, 6, 1.5);
    blob(g, lx + 6, deckY - 18, 3.2, 'rgba(255,231,160,0.5)');
    blob(g, lx + 6, deckY - 18, 1.6, SAG.lampGlow);
  }
  tinyVehicle(g, 470, deckY - 4, true);
  tinyVehicle(g, 600, deckY - 4, false);
  // The low road under it, with its own ramp curling off to the right
  g.fillStyle = SAG.farDark;
  g.fillRect(330, b - 30, FAR_W - 330, 6);
  tinyVehicle(g, 520, b - 30, false);
  tinyVehicle(g, 700, b - 30, true);
  // Trees in a line at the foot
  g.fillStyle = SAG.farDark;
  for (const [px, r] of [[20, 14], [330, 12], [352, 9], [740, 13]] as const) {
    g.beginPath();
    g.arc(px, b - 24, r, Math.PI, TAU);
    g.fill();
  }
  g.fillRect(0, b - 24, FAR_W, 24);
}

/** The interchange and the quarry edge far off, at parallax 0.15; painted once and copied. */
export function drawSagamuFar(g: G, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = groundY - FAR_LIFT;
  g.fillStyle = SAG.farDark;
  g.fillRect(0, base - 1, viewW, FAR_LIFT + 1);
  const par = camX * 0.15;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) {
    const x = t * FAR_W - par;
    if (blitLayer(g, farLayer, 'sagFar', x, base - FAR_H, FAR_W, FAR_H, paintFar, true)) continue;
    g.save();
    g.translate(x, base - FAR_H);
    paintFar(g);
    g.restore();
  }
}

/** A danfo crossing the far flyover, the only moving far thing. still: it holds. */
function drawFarDanfo(g: G, camX: number, viewW: number, time: number, groundY: number): void {
  const deckY = groundY - FAR_LIFT - 92;
  const span = viewW + 120;
  const x = ((((num(time) * 26 - camX * 0.15) % span) + span) % span) - 60;
  tinyVehicle(g, x, deckY - 4, true);
}

// ---------------------------------------------------------------- the row

const ROW_TOP = 150;
const ROW_BASE = 264;
const UNITS = [170, 124, 150, 126, 128, 132] as const;
export const SAGAMU_TILE_W = UNITS.reduce((a, b) => a + b, 0);

/** A flat dark zinc roof, gently sloping, with ridges. */
function flatRoof(g: G, x: number, y: number, w: number): void {
  g.fillStyle = SAG.roof;
  g.beginPath();
  g.moveTo(x - 5, y + 6);
  g.lineTo(x - 2, y - 4);
  g.lineTo(x + w + 2, y - 8);
  g.lineTo(x + w + 5, y + 6);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = SAG.roofLight;
  for (let rx = x; rx < x + w; rx += 8) g.fillRect(rx, y - 5, 2, 10);
}

/** A flat cloth shade on four poles (not an umbrella), bright stripes, a scalloped edge. */
function clothShade(g: G, x: number, y: number, w: number, base: number, a: string, b: string): void {
  g.fillStyle = SAG.trunk;
  g.fillRect(x + 3, y, 3, base - y);
  g.fillRect(x + w - 6, y, 3, base - y);
  g.fillStyle = a;
  g.fillRect(x, y - 6, w, 8);
  g.fillStyle = b;
  for (let sx = x + 6; sx < x + w - 4; sx += 14) g.fillRect(sx, y - 6, 6, 8);
  g.fillStyle = a;
  for (let sx = x; sx < x + w; sx += 10) {
    g.beginPath();
    g.arc(sx + 5, y + 2, 5, 0, Math.PI);
    g.fill();
  }
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.strokeRect(x, y - 6, w, 8);
}

/** A street lamp on a pole, glowing warm (evening). */
function lamp(g: G, x: number, base: number, h: number): void {
  g.fillStyle = '#4a4550';
  g.fillRect(x, base - h, 3, h);
  g.fillRect(x, base - h, 14, 3);
  blob(g, x + 13, base - h + 5, 9, 'rgba(255,231,160,0.45)');
  blob(g, x + 13, base - h + 4, 3.5, SAG.lampGlow);
}

/** A lit window, warm yellow with a cross bar. */
function litWindow(g: G, x: number, y: number, w: number, h: number): void {
  box(g, x, y, w, h, SAG.window, 1, 1);
  g.fillStyle = 'rgba(160,100,40,0.35)';
  g.fillRect(x + w / 2 - 0.5, y, 1, h);
  g.fillRect(x, y + h / 2 - 0.5, w, 1);
}

function tyreStack(g: G, x: number, base: number, n: number): void {
  for (let i = 0; i < n; i++) {
    box(g, x, base - (i + 1) * 7, 22, 7, '#2a2a2e', 0.8, 3);
    g.fillStyle = '#55555c';
    g.fillRect(x + 4, base - (i + 1) * 7 + 3, 14, 1.2);
  }
}

/** A plain lorry seen side on, its bed of plain cement sacks or of gravel. */
function lorry(g: G, x: number, base: number, gravel: boolean): void {
  const wheel = (wx: number): void => {
    blob(g, wx, base - 7, 7, '#2a2a2e');
    blob(g, wx, base - 7, 3, '#bfbfbf');
  };
  box(g, x, base - 30, 70, 18, gravel ? '#d08a52' : '#3d8f8a', 1.2, 2);
  if (gravel) {
    g.fillStyle = '#8b8086';
    g.beginPath();
    g.moveTo(x + 2, base - 30);
    g.quadraticCurveTo(x + 35, base - 50, x + 68, base - 30);
    g.fill();
    g.fillStyle = SAG.stone;
    for (let i = 0; i < 10; i++) g.fillRect(x + 10 + hash(i + 3) * 50, base - 34 - hash(i + 7) * 9, 2, 2);
  } else for (let i = 0; i < 5; i++) for (let r = 0; r < 2; r++) sack(g, x + 3 + i * 13 + r * 6, base - 40 - r * 8, 12, 9);
  box(g, x + 70, base - 38, 24, 26, '#f2c230', 1.2, 3);
  litWindow(g, x + 76, base - 34, 13, 9);
  g.fillStyle = '#3a3a40';
  g.fillRect(x, base - 14, 94, 4);
  wheel(x + 14);
  wheel(x + 52);
  wheel(x + 82);
}

/** The ikokore pot on a low stand, steam only (never flames, OG-R4). */
function ikokorePot(g: G, x: number, base: number, s: number): void {
  g.fillStyle = '#4a4a50';
  g.fillRect(x - 10 * s, base - 6 * s, 3 * s, 6 * s);
  g.fillRect(x + 7 * s, base - 6 * s, 3 * s, 6 * s);
  g.fillStyle = '#6b4f3a';
  g.beginPath();
  g.ellipse(x, base - 13 * s, 13 * s, 9 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#e48a3a';
  g.beginPath();
  g.ellipse(x, base - 20 * s, 10 * s, 3 * s, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#f4d7a0';
  g.fillRect(x - 4 * s, base - 21 * s, 2.5 * s, 1.5 * s);
  g.fillRect(x + 2 * s, base - 20 * s, 2 * s, 1.5 * s);
}

function steam(g: G, x: number, y: number, time: number): void {
  g.strokeStyle = WHITE;
  g.lineWidth = 1.3;
  g.lineCap = 'round';
  for (const [dx, ph] of [[-3, 0], [3, 1.7]] as const) {
    const sway = Math.sin(time * 3 + ph);
    g.beginPath();
    g.moveTo(x + dx, y);
    g.quadraticCurveTo(x + dx - 3 + sway, y - 5, x + dx + sway, y - 10);
    g.stroke();
  }
}

/** A charging board: plain phones and lamps on a shelf, each with a small light (no network names). */
function chargeRack(g: G, x: number, y: number, w: number): void {
  box(g, x, y, w, 30, '#3a3442', 1, 2);
  for (let i = 0; i < Math.floor((w - 4) / 9); i++) {
    const px = x + 4 + i * 9;
    box(g, px, y + 5 + (i % 2) * 11, 6, 9, i % 3 ? '#2a2a33' : '#e9e4da', 0.6, 1);
    g.fillStyle = i % 2 ? '#7be08a' : SAG.window;
    g.fillRect(px + 2, y + 6 + (i % 2) * 11, 2, 1.5);
  }
}

function paintRow(g: G): void {
  const B = ROW_TOP;
  let x = 0;
  const [w0, w1, w2, w3, w4, w5] = UNITS;

  // 0. The kola market: two flat cloth shades over tables of leaf-lined kola baskets, "KOLA NUTS"
  board(g, x + 44, B - 112, 84, SAGAMU_SIGNS[0], (cx, cy) => kolaNut(g, cx, cy, 4, SAG.kolaRed));
  g.fillStyle = SAG.trunk;
  g.fillRect(x + 84, B - 94, 3, 6);
  clothShade(g, x + 6, B - 86, 76, B, SAG.shade, SAG.cream);
  clothShade(g, x + 88, B - 80, 76, B, SAG.shadeB, SAG.shadeC);
  for (const [tx, tw] of [[x + 12, 64], [x + 94, 64]] as const) {
    g.fillStyle = '#7b5a3a';
    g.fillRect(tx, B - 26, tw, 4);
    g.fillRect(tx + 4, B - 22, 3, 22);
    g.fillRect(tx + tw - 7, B - 22, 3, 22);
  }
  drawKolaBasket(g, x + 28, B - 26, 26);
  drawKolaBasket(g, x + 60, B - 26, 22, true);
  drawKolaBasket(g, x + 112, B - 26, 24, true);
  drawKolaBasket(g, x + 142, B - 26, 26);
  drawKolaBasket(g, x + 46, B, 24);
  x += w0;

  // 1. GARRI IJEBU: a sand-coloured shop, basins of fine garri on the table, sacks stacked
  flatRoof(g, x + 6, B - 100, w1 - 12);
  box(g, x + 8, B - 96, w1 - 16, 96, SAG.sand, 1.2, 2);
  board(g, x + 14, B - 88, w1 - 28, SAGAMU_SIGNS[1], (cx, cy) => {
    g.fillStyle = SAG.garri;
    g.beginPath();
    g.ellipse(cx, cy + 1, 6, 3, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#2f6fd6';
    g.fillRect(cx - 6, cy + 1, 12, 3);
  });
  litWindow(g, x + 16, B - 64, 30, 24);
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 54, B - 30, 58, 4);
  garriBasin(g, x + 68, B - 30, 26);
  garriBasin(g, x + 96, B - 30, 26, '#e0572b');
  for (let i = 0; i < 3; i++) sack(g, x + 16 + i * 11, B - 16, 11, 16, '#efe3c8');
  sack(g, x + 21, B - 28, 11, 13, '#efe3c8');
  x += w1;

  // 2. The lorry park: a plain lorry of cement sacks, a tipper of gravel, a street lamp
  g.fillStyle = 'rgba(60,40,60,0.18)';
  g.fillRect(x, B - 6, w2, 6);
  lorry(g, x + 4, B - 30, true);
  lorry(g, x + 46, B, false);
  lamp(g, x + w2 - 18, B, 110);
  x += w2;

  // 3. IKOKORE: a rose-pink buka, a pot on a stand with steam, a bench
  flatRoof(g, x + 4, B - 92, w3 - 8);
  box(g, x + 6, B - 88, w3 - 12, 88, SAG.rose, 1.2, 2);
  board(g, x + 12, B - 80, w3 - 24, SAGAMU_SIGNS[2], (cx, cy) => {
    blob(g, cx, cy + 1, 5, '#6b4f3a');
    g.fillStyle = '#e48a3a';
    g.fillRect(cx - 4, cy - 2, 8, 2);
  });
  litWindow(g, x + 14, B - 58, 40, 26);
  box(g, x + 84, B - 54, 26, 54, '#5b4636');
  ikokorePot(g, x + 64, B, 1);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 61, B - 24);
  g.quadraticCurveTo(x + 58, B - 30, x + 62, B - 36);
  g.moveTo(x + 67, B - 24);
  g.quadraticCurveTo(x + 64, B - 30, x + 68, B - 36);
  g.stroke();
  g.fillStyle = '#7b5a3a';
  g.fillRect(x + 12, B - 12, 36, 4);
  g.fillRect(x + 15, B - 8, 3, 8);
  g.fillRect(x + 42, B - 8, 3, 8);
  x += w3;

  // 4. VULCANIZER: an open shed, stacked tyres, a small compressor
  g.fillStyle = '#5d5a66';
  g.fillRect(x + 10, B - 80, 3, 80);
  g.fillRect(x + w4 - 13, B - 80, 3, 80);
  flatRoof(g, x + 6, B - 84, w4 - 12);
  board(g, x + 16, B - 104, w4 - 32, SAGAMU_SIGNS[3], (cx, cy) => {
    blob(g, cx, cy, 6, '#2a2a2e');
    blob(g, cx, cy, 2.5, '#bfbfbf');
  });
  g.fillStyle = 'rgba(40,30,50,0.25)';
  g.fillRect(x + 13, B - 76, w4 - 26, 76);
  tyreStack(g, x + 18, B, 5);
  tyreStack(g, x + 42, B, 3);
  box(g, x + 76, B - 18, 30, 14, '#3d8f8a', 1, 4);
  blob(g, x + 82, B - 3, 3, '#2a2a2e');
  blob(g, x + 100, B - 3, 3, '#2a2a2e');
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 104, B - 12);
  g.quadraticCurveTo(x + 116, B - 2, x + 108, B - 30);
  g.stroke();
  x += w4;

  // 5. BATTERY CHARGING: a plum kiosk, a rack of phones and lamps charging, small lights
  flatRoof(g, x + 4, B - 96, w5 - 8);
  box(g, x + 6, B - 92, w5 - 12, 92, SAG.plum, 1.2, 2);
  board(g, x + 10, B - 84, w5 - 20, SAGAMU_SIGNS[4], (cx, cy) => {
    box(g, cx - 4, cy - 5, 8, 11, '#2a2a33', 0, 1);
    g.fillStyle = '#7be08a';
    g.fillRect(cx - 2, cy - 1, 4, 5);
  });
  chargeRack(g, x + 14, B - 60, 66);
  box(g, x + 88, B - 56, 26, 56, '#5b4636');
  lamp(g, x + w5 - 10, B, 112);
}

const rowLayer = { layer: null as PixelLayer | null };

/** Sagamu's near row at half camera speed, on dusk-grey concrete with a yellow-and-ink kerb. */
export function drawSagamuRow(g: G, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = ROW_BASE - (GROUND_Y - groundY);
  g.fillStyle = SAG.pave;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = SAG.paveTop;
  g.fillRect(0, base, viewW, 3);
  g.fillStyle = SAG.paveLine;
  const off = camX % 30;
  for (let px = -off; px < viewW; px += 30) g.fillRect(px, base + 3, 1.5, groundY - base - 9);
  // The kerb: yellow and ink blocks along the road's edge (reads in grey too)
  const koff = camX % 24;
  for (let px = -koff; px < viewW; px += 24) {
    g.fillStyle = SAG.kerb;
    g.fillRect(px, groundY - 6, 12, 6);
    g.fillStyle = '#2a2a2e';
    g.fillRect(px + 12, groundY - 6, 12, 6);
  }
  const par = camX * 0.5;
  for (let t = Math.floor(par / SAGAMU_TILE_W); t * SAGAMU_TILE_W - par < viewW; t++) {
    const x = t * SAGAMU_TILE_W - par;
    if (blitLayer(g, rowLayer, 'sagamu', x, base - ROW_TOP, SAGAMU_TILE_W, ROW_TOP, paintRow, true)) continue;
    g.save();
    g.translate(x, base - ROW_TOP);
    paintRow(g);
    g.restore();
  }
}

/**
 * Every screen-space layer behind Sagamu's road, back to front: sky, the interchange and quarry
 * far off (with one danfo crossing the far flyover), the row. still (reduced motion): the clouds
 * and the danfo hold still.
 */
export function drawSagamuBackdrop(g: G, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND_Y, still = false): void {
  const t = still ? 0 : num(time);
  drawSagamuSky(g, camX, viewW, t, viewH);
  drawSagamuFar(g, camX, viewW, groundY);
  drawFarDanfo(g, camX, viewW, t, groundY);
  drawSagamuRow(g, camX, viewW, groundY);
}

// ---------------------------------------------------------------- the two roads (3.3)

/** The flyover's sizes: the slab under the landing line, and how far apart its pillars stand. */
export const FLYOVER = { slab: 16, pillarGap: 220, pillarW: 16 } as const;

/** The deck's road top: tar, a pale edge line and dashes, with a light top lip at exactly topY. */
function deckTop(g: G, x: number, topY: number, w: number): void {
  // Concrete slab below the road
  box(g, x, topY, w, FLYOVER.slab, SAG.concrete, 1.5, 2);
  g.fillStyle = SAG.concreteDark;
  g.fillRect(x + 2, topY + FLYOVER.slab - 5, w - 4, 3);
  // The tar road on top, with its edge line and lane dashes
  g.fillStyle = SAG.tar;
  g.fillRect(x + 1.5, topY + 1.5, w - 3, 6);
  g.fillStyle = SAG.lane;
  g.fillRect(x + 1.5, topY + 1.5, w - 3, 1.5);
  for (let d = x + 10; d < x + w - 16; d += 26) g.fillRect(d, topY + 4.5, 12, 1.4);
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x, topY);
  g.lineTo(x + w, topY);
  g.stroke();
}

/** A square concrete pillar from the slab down to the road, set back (behind the walking line). */
function pillar(g: G, x: number, top: number, groundY: number): void {
  const w = FLYOVER.pillarW;
  g.fillStyle = SAG.concreteDark;
  g.fillRect(x - w / 2 - 3, top, w + 6, 5);
  g.fillStyle = SAG.concrete;
  g.fillRect(x - w / 2, top + 5, w, groundY - top - 5);
  g.fillStyle = SAG.concreteLight;
  g.fillRect(x - w / 2 + 2, top + 5, 3, groundY - top - 5);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x + w / 2 - 4, top + 5, 4, groundY - top - 5);
  g.strokeStyle = 'rgba(40,30,40,0.6)';
  g.lineWidth = 1;
  g.strokeRect(x - w / 2, top + 5, w, groundY - top - 5);
}

/**
 * World space. The flyover deck (3.3, a one-way platform): a concrete slab carrying a small tar
 * road, its top edge exactly at topY (the landing line), with short rail posts on its back edge.
 * No gaps. Its pillars, back wall and lamps are drawLowRoad's, drawn behind everything on the low
 * road; draw the deck itself with the other platforms.
 */
export function drawFlyoverDeck(g: G, x: number, topY: number, w: number): void {
  deckTop(g, x, topY, w);
  // Rail posts along the back edge, short and low (behind, never a wall to bump)
  g.fillStyle = SAG.concreteDark;
  for (let px = x + 6; px < x + w - 4; px += 20) g.fillRect(px, topY - 4, 2, 4);
}

/**
 * World space. One plain step up to or down from the deck (3.3; a one-way platform like the
 * deck): a short slab of the same road on two thin square legs (open below, so the road under it
 * reads as walkable), with yellow-and-ink chevrons on its face pointing the way of the run. Its
 * top edge is exactly topY. Plain on purpose: no bricks, no blocks, no pipes.
 */
export function drawFlyoverStep(g: G, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  const under = topY + FLYOVER.slab;
  if (groundY - under > 2) {
    g.fillStyle = SAG.concrete;
    g.fillRect(x + 8, under, 8, groundY - under);
    g.fillRect(x + w - 16, under, 8, groundY - under);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(x + 13, under, 3, groundY - under);
    g.fillRect(x + w - 11, under, 3, groundY - under);
  }
  deckTop(g, x, topY, w);
  // Chevrons on the slab's face
  g.save();
  g.beginPath();
  g.rect(x + 2, topY + 8, w - 4, FLYOVER.slab - 10);
  g.clip();
  g.fillStyle = SAG.kerb;
  g.fillRect(x + 2, topY + 8, w - 4, FLYOVER.slab - 10);
  g.fillStyle = '#2a2a2e';
  for (let cx = x + 6; cx < x + w; cx += 12) {
    g.beginPath();
    g.moveTo(cx, topY + 8);
    g.lineTo(cx + 4, topY + 8);
    g.lineTo(cx + 8, topY + 11);
    g.lineTo(cx + 4, topY + 14);
    g.lineTo(cx, topY + 14);
    g.lineTo(cx + 4, topY + 11);
    g.fill();
  }
  g.restore();
}

/**
 * World space. The low road under the deck (3.3), for a deck from x0 to x1 with its top at
 * deckTopY: a plain back wall of concrete panels in the deck's shade, the deck's square pillars
 * set back on it (every FLYOVER.pillarGap, the first and last 40 u in from the ends), a soft
 * shade on the road top, and warm lamps under the slab. Leaves the walking line clear and bright
 * enough for mud, gravel, the secret well and the hero to read. Draw it after the road and before
 * mud, the well, hazards and the platforms. still: the lamps hold one glow.
 */
export function drawLowRoad(g: G, x0: number, x1: number, deckTopY: number, groundY = GROUND_Y, time = 0, still = false): void {
  const under = deckTopY + FLYOVER.slab;
  const h = groundY - under;
  if (h <= 0 || x1 <= x0) return;
  // The back wall in panels, in the deck's cool shade
  g.fillStyle = SAG.under;
  g.fillRect(x0, under, x1 - x0, h);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  for (let px = x0 + 30; px < x1; px += 60) g.fillRect(px, under + 6, 1.5, h - 12);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(x0, under + h * 0.55, x1 - x0, 1.5);
  const first = x0 + 40;
  const last = x1 - 40;
  const n = Math.max(1, Math.round((last - first) / FLYOVER.pillarGap));
  for (let i = 0; i <= n; i++) pillar(g, first + ((last - first) * i) / n, under, groundY);
  // A soft shade on the road's top just under the deck
  g.fillStyle = 'rgba(30,20,40,0.28)';
  g.fillRect(x0, groundY, x1 - x0, 6);
  // Lamps under the slab, glowing warm (a slow, gentle breathe; still holds)
  const t = still ? 0 : num(time);
  for (let lx = x0 + 70; lx < x1 - 20; lx += 160) {
    const k = 0.5 + 0.08 * Math.sin(t * 1.6 + lx);
    g.fillStyle = `rgba(255,231,160,${k * 0.35})`;
    g.beginPath();
    g.moveTo(lx - 5, under + 4);
    g.lineTo(lx + 5, under + 4);
    g.lineTo(lx + 26, groundY);
    g.lineTo(lx - 26, groundY);
    g.closePath();
    g.fill();
    box(g, lx - 6, under, 12, 4, '#4a4550', 0, 1);
    blob(g, lx, under + 4, 2.5, SAG.lampGlow);
  }
}

// ---------------------------------------------------------------- hopping gravel (3.3)

/** The gravel's numbers (3.3): size, speed, hop height and timing. */
export const GRAVEL = { w: 18, h: 16, speed: 70, hop: 40, period: 0.7, air: 0.35 } as const;

export type GravelFrame = 'sit' | 'rise' | 'top' | 'fall' | 'land';

/**
 * Where the gravel is in its hop at time t (seconds since it woke): its height above the road
 * (0 to GRAVEL.hop, a smooth arc while in the air) and which frame to draw. The first half of each
 * period is on the road (it lands, then sits), the second half in the air. still: 'sit', 0.
 */
export function gravelHop(t: number, still = false): { lift: number; frame: GravelFrame } {
  if (still || !Number.isFinite(t)) return { lift: 0, frame: 'sit' };
  const p = ((t % GRAVEL.period) + GRAVEL.period) % GRAVEL.period;
  const ground = GRAVEL.period - GRAVEL.air;
  if (p < ground) return { lift: 0, frame: p < 0.08 ? 'land' : 'sit' };
  const k = (p - ground) / GRAVEL.air;
  const lift = GRAVEL.hop * 4 * k * (1 - k);
  return { lift, frame: k < 0.35 ? 'rise' : k < 0.65 ? 'top' : 'fall' };
}

/** The lump: broken tar and stones, ink outlined with a pale rim so it stands out on the dark road. */
function lump(g: G, sx: number, sy: number, seed: number): void {
  g.save();
  g.scale(sx, sy);
  g.fillStyle = SAG.gravel;
  g.beginPath();
  g.moveTo(-9, 0);
  g.lineTo(-9, -6);
  g.lineTo(-6, -12);
  g.lineTo(-1, -16);
  g.lineTo(4, -14);
  g.lineTo(8, -10);
  g.lineTo(9, -4);
  g.lineTo(8, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = '#c9c2bd';
  g.lineWidth = 3;
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke();
  // Darker tar side and a broken top face
  g.fillStyle = SAG.gravelDark;
  g.beginPath();
  g.moveTo(3, -1);
  g.lineTo(8, -1);
  g.lineTo(8, -9);
  g.lineTo(4, -13);
  g.closePath();
  g.fill();
  // Stones set in it, cream and laterite
  const stones: readonly (readonly [number, number, number, string])[] = [
    [-5, -4, 2.2, SAG.stone],
    [-1, -9, 2.4, SAG.stoneWarm],
    [3, -5, 1.8, SAG.stone],
    [-4, -10, 1.5, SAG.stone],
    [1, -13, 1.4, SAG.stoneWarm],
  ];
  for (const [x, y, r, c] of stones) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x + (seed % 2 ? 0.5 : 0), y, r * 1.2, r, 0.4, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(30,20,20,0.6)';
    g.lineWidth = 0.6;
    g.stroke();
  }
  g.restore();
}

/**
 * World space. The hopping gravel (3.3): x is its middle, y the bottom of the lump (the road line
 * minus its lift, from gravelHop). The frame squashes it on landing and stretches it in the air,
 * with a small tumble; a soft shadow stays on the road below while it is up (pass groundY). Not
 * colour alone: a lumpy shape, a pale rim, stones.
 */
export function drawGravel(g: G, x: number, y: number, frame: GravelFrame = 'sit', groundY = y, seed = 0): void {
  const lift = Math.max(0, groundY - y);
  if (lift > 1) {
    const s = Math.max(0.4, 1 - lift / 80);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.ellipse(x, groundY, 8 * s, 2.2 * s, 0, 0, TAU);
    g.fill();
  }
  const look = {
    sit: [1, 1, 0],
    land: [1.18, 0.78, 0],
    rise: [0.88, 1.14, -0.12],
    top: [1, 1, -0.22],
    fall: [0.92, 1.08, -0.3],
  }[frame] ?? [1, 1, 0];
  g.save();
  g.translate(x, y);
  g.rotate(look[2]!);
  lump(g, look[0]!, look[1]!, seed);
  g.restore();
}

/** World space. The dust puff where the gravel lands (k 0 to 1 over about 0.25 s). */
export function drawGravelDust(g: G, x: number, groundY = GROUND_Y, k = 0): void {
  const t = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  if (t >= 1) return;
  g.fillStyle = `rgba(217,203,176,${0.85 * (1 - t)})`;
  for (const d of [-1, 1]) {
    g.beginPath();
    g.arc(x + d * (8 + t * 10), groundY - 3 - t * 4, 3.5 + t * 3, 0, TAU);
    g.fill();
  }
  g.beginPath();
  g.arc(x, groundY - 2 - t * 3, 3 + t * 2, 0, TAU);
  g.fill();
}

/**
 * World space. The gravel crumbling into dust (bounced on, amala, ikokore): k 0 to 1 over about
 * 0.35 s. Stones scatter and fall, a dust cloud swells and fades; nothing sharp flies at the hero.
 */
export function drawGravelCrumble(g: G, x: number, groundY = GROUND_Y, k = 0): void {
  const t = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  if (t >= 1) return;
  g.fillStyle = `rgba(217,203,176,${0.9 * (1 - t)})`;
  g.beginPath();
  g.ellipse(x, groundY - 6 - t * 6, 10 + t * 12, 6 + t * 5, 0, 0, TAU);
  g.fill();
  const bits: readonly (readonly [number, number, string])[] = [
    [-1, -1.3, SAG.stone],
    [1, -1.1, SAG.stoneWarm],
    [-0.5, -1.6, SAG.gravel],
    [0.6, -1.7, SAG.stone],
    [0, -1.2, SAG.gravel],
  ];
  for (const [vx, vy, c] of bits) {
    const bx = x + vx * 22 * t;
    const by = groundY - 8 + vy * 30 * t + 60 * t * t;
    box(g, bx - 2, Math.min(by, groundY - 3) - 2, 4, 3.5, c, 0.6, 1);
  }
}

/** World space. The gravel knocked off the road by fufu (k 0 to 1): it flips away up and right. */
export function drawGravelKnocked(g: G, x: number, y: number, k = 0): void {
  const t = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  g.save();
  g.globalAlpha = 1 - t * 0.6;
  g.translate(x + t * 50, y - t * 60 + t * t * 30);
  g.rotate(t * 5);
  lump(g, 1, 1, 0);
  g.restore();
}

// ---------------------------------------------------------------- sounds

/** Sagamu's sounds (code-made, our own). Gamedev adds the names to SoundName and calls addSounds. */
export type SagamuSoundName = 'gravelTk' | 'gravelCrumble';
export const SAGAMU_SOUNDS: Readonly<Record<SagamuSoundName, Recipe>> = {
  /** The small "tk" as the gravel lands (3.3): a dry click and a tiny thud; 0.06 s. Quiet. */
  gravelTk: {
    tones: [{ f: 220, len: 0.05, wave: 'triangle', to: 140, vol: 0.035 }],
    hiss: [{ len: 0.03, bp: 2600, vol: 0.03 }],
  },
  /** The lump crumbling to dust (bounce, amala, ikokore): a soft crunch with grit; 0.3 s. */
  gravelCrumble: {
    tones: [{ f: 160, len: 0.14, wave: 'triangle', to: 80, vol: 0.05 }],
    hiss: [
      { len: 0.28, lp: 1800, vol: 0.04 },
      { len: 0.03, at: 0.05, bp: 3000, vol: 0.02 },
      { len: 0.03, at: 0.12, bp: 2400, vol: 0.018 },
      { len: 0.03, at: 0.2, bp: 2000, vol: 0.015 },
    ],
  },
};

// ---------------------------------------------------------------- the roof platform

/**
 * World space. Sagamu's roof platform (drawThemeStall): a kola market shade, a flat striped cloth
 * top on a timber frame (never an umbrella), its top edge exactly topY (the landing line), with
 * kola baskets on a table under it.
 */
export function drawSagamuStall(g: G, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  g.fillStyle = SAG.trunk;
  g.fillRect(x + 6, topY + 8, 4, groundY - topY - 8);
  g.fillRect(x + w - 10, topY + 8, 4, groundY - topY - 8);
  if (groundY - topY > 40) {
    g.fillStyle = '#7b5a3a';
    g.fillRect(x + 12, groundY - 24, w - 24, 4);
    for (let px = x + 30; px < x + w - 20; px += 34) drawKolaBasket(g, px, groundY - 24, 22, (px - x) % 68 > 30);
  }
  // The scalloped cloth edge
  g.fillStyle = SAG.shadeB;
  for (let sx = x + 2; sx < x + w - 4; sx += 10) {
    g.beginPath();
    g.arc(sx + 5, topY + 9, 5, 0, Math.PI);
    g.fill();
  }
  box(g, x, topY, w, 10, SAG.shadeB, 1.5, 3);
  g.fillStyle = SAG.shadeC;
  for (let sx = x + 8; sx < x + w - 8; sx += 16) g.fillRect(sx, topY + 1.5, 7, 7);
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x + 2, topY);
  g.lineTo(x + w - 2, topY);
  g.stroke();
}

// ---------------------------------------------------------------- traders

/** Sagamu's three traders (part 7), in the order of OGUN_WORDS.folk.traders.sagamu. */
export const SAGAMU_TRADERS = ['kola', 'garri', 'ikokore'] as const;
export type SagamuTrader = (typeof SAGAMU_TRADERS)[number];
/** Each stall's board; each matches its trader's call ("Fresh kola!", "Garri Ijebu!", "Ikokore, hot!"). */
export const SAGAMU_STALL_WORDS: Readonly<Record<SagamuTrader, string>> = { kola: 'FRESH KOLA', garri: 'GARRI IJEBU', ikokore: 'HOT IKOKORE' };

/**
 * World space, scenery behind the walking line (never something to touch). x is the stall's
 * middle; the trader stands just in front of it. About 56 u wide, 60 u tall. Kola is only sold:
 * whole nuts in leaf-lined baskets (OG-R1). Steam only, never flames.
 */
export function drawSagamuTraderStall(g: G, kind: SagamuTrader, x: number, groundY = GROUND_Y, time = 0): void {
  const t = num(time);
  g.save();
  g.translate(x, groundY);
  g.fillStyle = '#7b5a3a';
  g.fillRect(-26, -20, 52, 4);
  g.fillRect(-22, -16, 3, 16);
  g.fillRect(19, -16, 3, 16);
  if (kind === 'kola') {
    // Two leaf-lined baskets, red kola and cream kola sorted apart, a small measuring bowl
    drawKolaBasket(g, -12, -20, 22);
    drawKolaBasket(g, 12, -20, 20, true);
    blob(g, 25, -22, 3, '#8f6330');
  } else if (kind === 'garri') {
    // Two basins of fine garri and a measuring bowl resting on top
    garriBasin(g, -12, -20, 24);
    garriBasin(g, 13, -20, 22, '#e0572b');
    g.fillStyle = '#d6336c';
    g.beginPath();
    g.ellipse(-8, -28, 5, 2.5, 0, 0, Math.PI);
    g.fill();
  } else {
    // The ikokore pot on its stand with bowls stacked beside it; steam only
    ikokorePot(g, -6, -20, 0.9);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i % 2 ? '#e9e4da' : '#2f6fd6';
      g.beginPath();
      g.ellipse(15, -21 - i * 3, 7, 2.5, 0, 0, Math.PI);
      g.fill();
    }
    steam(g, -6, -40, t);
  }
  g.fillStyle = '#6b4a2b';
  g.fillRect(28, -42, 3, 42);
  board(g, 6, -60, 52, SAGAMU_STALL_WORDS[kind]);
  g.restore();
}

// ---------------------------------------------------------------- people (part 7)

/**
 * Sagamu's cast (part 7): 16 looks, every skin tone at least twice, every age, a wheelchair user,
 * glasses, dress from across Nigeria. A kola trader in babban riga and cap and a kola buyer in iro
 * and buba with a gele (bargaining and laughing together); a garri trader measuring with a bowl;
 * the ikokore seller (an elder woman at her pot); a porter with a load on his head; travellers
 * with bags waiting for buses (a teen with a backpack, an elder in a kaftan with glasses and a
 * box, a woman in a hijab and long dress, a man in isiagu, an elder in an etibo shirt); the
 * mechanic at the vulcanizer (plain shirt and trousers, no uniform); a child with a parent; a teen
 * in sport clothes; and three at the bus stop (a wheelchair user, a woman in ankara, an elder
 * woman with a gele). The quarry workers are drawn small in the far layer. Never a held broom,
 * helmet or uniform. Look codes as folkLook.
 */
export const SAGAMU_CAST: readonly FolkLook[] = (
  '4ammlReINIh 1afrcGaPFPl 6afmbSgDKDh 2efrgSgCJCn 5amsl-lFO.g 0tfsp-kBL.c 3emsgKdQBQfg 2afmuHfSFSa ' +
  '1amml-lMK.. 6amrl-hJM.l 0emsg-iNL..d 5cfsp-kGB.. 3tmsl-nAL.i 4amsa-lEO..w 6afrb-jRB.a 5efmgGaTDT.'
)
  .split(' ')
  .map(folkLook);

/** The traders in SAGAMU_CAST, by stall: they hold up their goods and call their own line. */
export const SAGAMU_TRADER_LOOKS: Readonly<Record<SagamuTrader, FolkLook>> = {
  kola: SAGAMU_CAST[0]!,
  garri: SAGAMU_CAST[2]!,
  ikokore: SAGAMU_CAST[3]!,
};
/** The kola buyer who bargains and laughs with the kola trader (stand them face to face). */
export const SAGAMU_KOLA_BUYER: FolkLook = SAGAMU_CAST[1]!;
/** The porter with a load on a head pad, and the mechanic at the vulcanizer's compressor. */
export const SAGAMU_PORTER: FolkLook = SAGAMU_CAST[4]!;
export const SAGAMU_MECHANIC: FolkLook = SAGAMU_CAST[8]!;
/** Travellers waiting for buses at the interchange. */
export const SAGAMU_TRAVELLERS: readonly FolkLook[] = [SAGAMU_CAST[5]!, SAGAMU_CAST[6]!, SAGAMU_CAST[7]!, SAGAMU_CAST[9]!, SAGAMU_CAST[10]!];
/** The child and the walker whose hand they hold. */
export const SAGAMU_CHILD: readonly [FolkLook, FolkLook] = [SAGAMU_CAST[11]!, SAGAMU_CAST[7]!];
/** Three people waiting at the bus stop. */
export const SAGAMU_BUS_STOP: readonly FolkLook[] = [SAGAMU_CAST[13]!, SAGAMU_CAST[14]!, SAGAMU_CAST[15]!];
