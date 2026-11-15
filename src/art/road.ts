/**
 * The challenge road (docs/design.md S3e0 parts 3 to 5 and 10, art S3e1a): a Lagos road of bus
 * stops at midday, our own drawing. Not a path of dots on a map, no islands, nothing from any
 * famous platform game; no real building, bus company, brand or sign, and no writing but the
 * stop names (on the plates, which are the buttons, and the card's stop sign).
 *
 * Road units: the picture is ROAD.w x ROAD.h (680 x 168). Paint it once (drawRoadPicture) at
 * s x devicePixelRatio into a canvas and paint it again only when the Next stop or the jetty
 * changes: idle, the road draws nothing. The stop buttons sit over it at STOP_BOX.
 *
 * Load this file with the road screen (a dynamic import), not with the first page.
 */
import { drawCityBus } from './city';
import { drawHero, type HeroLook } from './hero';
import { INK } from './palette';

export const ROAD = { w: 680, h: 168 } as const;

export type StopId = 'alausa' | 'lane' | 'computerVillage' | 'ikeja' | 'hall' | 'ferry';
/** Road order (part 9's list order): Alausa, the Lane run, Computer Village, Ikeja, Go-Slow Hall, the Ferry. */
export const ROAD_STOPS: readonly StopId[] = ['alausa', 'lane', 'computerVillage', 'ikeja', 'hall', 'ferry'];

export interface RoadBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Part 4's button boxes (road units). The button's face is the plate (drawStopPlate or the CSS tokens). */
export const STOP_BOX: Readonly<Record<StopId, RoadBox>> = {
  alausa: { x: 8, y: 92, w: 112, h: 64 },
  lane: { x: 76, y: 4, w: 112, h: 64 },
  computerVillage: { x: 144, y: 92, w: 112, h: 64 },
  ikeja: { x: 280, y: 92, w: 112, h: 64 },
  hall: { x: 416, y: 92, w: 112, h: 64 },
  ferry: { x: 552, y: 92, w: 112, h: 64 },
};
/** Where the side road leaves the main road. */
export const SIDE_ROAD_X = 132;
/** The main stops with a shelter behind the plate. */
export const SHELTER_STOPS: readonly StopId[] = ['alausa', 'computerVillage', 'ikeja', 'hall'];

/** The plate's colours (part 3) and its sizes, for HTML buttons too. */
export const PLATE = {
  open: '#f2b300',
  locked: '#e6d4ae',
  ink: '#1d1a14',
  outline: 2,
  nameH: 24,
  name: 'bold 12px sans-serif',
  status: 'bold 11px sans-serif',
  line3: '11px sans-serif',
  pad: 6,
  icon: 16,
  badge: '#22a85a',
} as const;

const TAU = Math.PI * 2;
const C = {
  skyTop: '#9fd8f3',
  skyLow: '#fbe6b4',
  pave: '#e8d6ac',
  paveEdge: '#c9b48c',
  kerb: '#f4efe0',
  road: '#66666d',
  roadDark: '#57575e',
  dash: '#f4f1e6',
  water: '#58b4d6',
  waterLight: '#8fd3ea',
  sand: '#ecd9a6',
  wood: '#a8763f',
  woodDark: '#6b4a2b',
  leaf: '#4f9a3a',
  leafLight: '#79bf55',
  trunk: '#7a5a3a',
} as const;

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, lw = 0, r = 0): void {
  g.fillStyle = fill;
  g.beginPath();
  if (r > 0) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

/** The width of `text` in the current font, or a guess of `perChar` a letter where there is no measuring (tests). */
function textWidth(g: CanvasRenderingContext2D, text: string, perChar: number): number {
  return (typeof g.measureText === 'function' ? g.measureText(text)?.width : 0) || text.length * perChar;
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/** The main road's gentle two bends: how far the kerb sits below y 130 at x. */
export function roadBend(x: number): number {
  return 4 * Math.sin((x / ROAD.w) * TAU);
}

// ---------- The road picture ----------

const BLOCKS: readonly (readonly [number, number, number, string])[] = [
  // x, width, top, wall
  [0, 52, 30, '#f0a35e'],
  [54, 40, 44, '#9fb6e8'],
  [150, 46, 26, '#7fc4a4'],
  [198, 54, 40, '#e7b98a'],
  [260, 40, 22, '#f2d06b'],
  [302, 48, 36, '#d7a6d9'],
  [352, 44, 28, '#b7d77a'],
  [530, 40, 34, '#e58b8b'],
];

function block(g: CanvasRenderingContext2D, x: number, w: number, top: number, wall: string): void {
  const base = 88;
  rect(g, x, top, w, base - top, wall, 1);
  rect(g, x, top, w, 4, 'rgba(0,0,0,0.14)');
  g.fillStyle = '#cfe9f5';
  for (let y = top + 9; y < base - 14; y += 13) for (let wx = x + 5; wx + 7 < x + w - 3; wx += 11) g.fillRect(wx, y, 7, 6);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let y = top + 9; y < base - 14; y += 13) g.fillRect(x + 5, y, 1.5, 6);
  // A water tank on some roofs
  if ((x / 2) % 3 < 1.5) rect(g, x + w - 16, top - 7, 10, 7, '#5d6670', 0.8, 1);
  // A shop front at street level: a plain awning and an open door
  for (let k = 0; k < Math.floor(w / 6); k++) rect(g, x + k * 6, base - 14, 6, 3, k % 2 ? '#fff8e6' : '#d65a4a');
  rect(g, x + w / 2 - 5, base - 10, 10, 10, '#5b4636');
}

function palm(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.strokeStyle = C.trunk;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + 4, y - 24, x + 2, y - 44);
  g.stroke();
  g.fillStyle = C.leaf;
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55;
    g.beginPath();
    g.ellipse(x + 2 + Math.cos(a) * 10, y - 44 + Math.sin(a) * 6 + 4, 12, 3.2, a, 0, TAU);
    g.fill();
  }
  disc(g, x + 2, y - 43, 2.6, '#8a5a2a');
}

/** A mango tree: a short trunk and a wide round crown with a few mangoes. */
function mango(g: CanvasRenderingContext2D, x: number, y: number): void {
  rect(g, x - 2.5, y - 18, 5, 18, C.trunk);
  disc(g, x, y - 30, 16, C.leaf);
  disc(g, x - 9, y - 26, 10, C.leaf);
  disc(g, x + 9, y - 27, 11, C.leaf);
  disc(g, x - 4, y - 36, 9, C.leafLight);
  for (const [dx, dy] of [[-8, -22], [6, -24], [10, -34], [-2, -28]] as const) disc(g, x + dx, y + dy, 2, '#f2a33a');
}

/** A small roadside kiosk with a plain striped canopy (no writing). */
function kiosk(g: CanvasRenderingContext2D, x: number, y: number): void {
  rect(g, x, y - 22, 20, 22, '#2f8f86', 1, 1);
  rect(g, x + 3, y - 18, 14, 8, '#cfe9f5');
  for (let k = 0; k < 4; k++) rect(g, x - 2 + k * 6, y - 26, 6, 4, k % 2 ? '#fff8e6' : '#e0572b');
  rect(g, x - 2, y - 10, 24, 2.5, '#8a5d36');
}

/** A market umbrella with a little table of oranges. */
function umbrella(g: CanvasRenderingContext2D, x: number, y: number): void {
  rect(g, x - 0.8, y - 26, 1.6, 26, '#5d6670');
  g.fillStyle = '#f2b300';
  g.beginPath();
  g.moveTo(x - 16, y - 22);
  g.quadraticCurveTo(x, y - 36, x + 16, y - 22);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#13703a';
  g.beginPath();
  g.moveTo(x - 5, y - 30);
  g.quadraticCurveTo(x, y - 33, x + 5, y - 30);
  g.lineTo(x + 6, y - 22);
  g.lineTo(x - 6, y - 22);
  g.closePath();
  g.fill();
  rect(g, x - 10, y - 9, 20, 3, '#8a5d36');
  for (let k = 0; k < 4; k++) disc(g, x - 6 + k * 4, y - 10.5, 1.8, '#f39c12');
}

/** The hall behind its stop: a wide low hall with a pitched roof and three arched doors. No writing. */
function hall(g: CanvasRenderingContext2D, x: number): void {
  rect(g, x + 4, 40, 104, 48, '#f3e6c8', 1);
  g.fillStyle = '#c96f3b';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 2, 42);
  g.lineTo(x + 56, 16);
  g.lineTo(x + 114, 42);
  g.closePath();
  g.fill();
  g.stroke();
  disc(g, x + 56, 31, 5, '#fff8e6');
  for (let k = 0; k < 3; k++) {
    const dx = x + 22 + k * 34;
    g.fillStyle = '#5b4636';
    g.beginPath();
    g.moveTo(dx - 8, 88);
    g.lineTo(dx - 8, 66);
    g.arc(dx, 66, 8, Math.PI, TAU);
    g.lineTo(dx + 8, 88);
    g.fill();
  }
}

/** A bus stop shelter behind a main stop's plate: a small roof on two posts and a bench. */
export function drawShelter(g: CanvasRenderingContext2D, b: RoadBox): void {
  const { x } = b;
  rect(g, x + 12, 66, 3, 64, '#7d8a96');
  rect(g, x + b.w - 15, 66, 3, 64, '#7d8a96');
  rect(g, x + 16, 108, b.w - 32, 4, '#8a5d36');
  rect(g, x + 6, 60, b.w - 12, 8, '#2f8f86', 1, 2);
  rect(g, x + 8, 61.5, b.w - 16, 1.5, 'rgba(255,255,255,0.4)');
  rect(g, x + 16, 70, b.w - 32, 20, 'rgba(191,227,245,0.55)');
}

/** A yellow danfo seen from the side, wheels on y = 0, about 46 x 22, facing +x. door: its side door open. */
export function drawDanfoSide(g: CanvasRenderingContext2D, x: number, y: number, door = false, scale = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath();
  g.ellipse(0, 0, 25, 2.6, 0, 0, TAU);
  g.fill();
  // Body, a rounded nose, two black stripes (the everyday Lagos danfo, no name, no company)
  g.fillStyle = '#f6c90e';
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-23, -4);
  g.lineTo(-23, -20);
  g.quadraticCurveTo(-23, -23, -19, -23);
  g.lineTo(14, -23);
  g.quadraticCurveTo(19, -23, 21, -16);
  g.lineTo(23, -10);
  g.lineTo(23, -4);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.fillRect(-23, -11, 46, 1.8);
  g.fillRect(-23, -7.5, 46, 1.2);
  // Windows and the windscreen
  g.fillStyle = '#bfe3f5';
  for (let k = 0; k < 3; k++) g.fillRect(-20 + k * 9, -20, 7, 6);
  g.beginPath();
  g.moveTo(14, -20);
  g.lineTo(18.5, -20);
  g.lineTo(21, -14);
  g.lineTo(14, -14);
  g.closePath();
  g.fill();
  // The side door: shut, or open (a dark doorway with a step)
  if (door) {
    rect(g, 6, -21, 7, 17, '#3a3a3a');
    rect(g, 5, -4, 9, 1.6, '#9a9a9a');
  } else rect(g, 6, -20, 7, 6, '#bfe3f5');
  disc(g, 22, -6, 1.3, '#fff3b0');
  // Wheels
  for (const wx of [-14, 13]) {
    disc(g, wx, -3, 4.6, '#222222');
    disc(g, wx, -3, 1.8, '#9a9a9a');
  }
  g.restore();
}

/** The small danfo parked at the Next stop's shelter (road units), a still picture. */
export function drawNextDanfo(g: CanvasRenderingContext2D, stop: StopId): void {
  const b = STOP_BOX[stop];
  drawDanfoSide(g, b.x + 30, 93, false, 0.95);
}

export type JettyLook = 'before' | 'after';

/**
 * The jetty end at the lagoon (road units). Before the first boom: posts in the water and a stack
 * of planks on the shore, no words. After: the jetty on its posts, a small shade roof, and the
 * plain white ferry with its blue cabin, as the city's drawJetty.
 */
export function drawJettyEnd(g: CanvasRenderingContext2D, look: JettyLook): void {
  if (look === 'before') {
    for (let k = 0; k < 4; k++) {
      rect(g, 612 + k * 16, 56 - k * 4, 4, 14, C.woodDark, 0.8);
      rect(g, 610 + k * 16, 68 - k * 4, 8, 1.5, C.waterLight);
    }
    for (let k = 0; k < 4; k++) rect(g, 590 + (k % 2) * 2, 80 - k * 4, 26, 4, k % 2 ? '#b8864f' : C.wood, 0.8, 1);
    return;
  }
  // The ferry first, moored on the far side of the jetty
  const fx = 626;
  const fy = 40;
  g.fillStyle = '#ffffff';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(fx, fy);
  g.lineTo(fx + 44, fy);
  g.quadraticCurveTo(fx + 54, fy + 6, fx + 44, fy + 12);
  g.lineTo(fx, fy + 12);
  g.closePath();
  g.fill();
  g.stroke();
  rect(g, fx, fy + 12, 44, 4, '#e5e1d6', 0.8);
  rect(g, fx + 6, fy - 9, 30, 9, '#7fd6ff', 0.8);
  g.fillStyle = '#2f5d8a';
  for (let k = 0; k < 4; k++) g.fillRect(fx + 9 + k * 7, fy - 7, 4, 4);
  rect(g, fx - 4, fy + 18, 58, 1.5, C.waterLight);
  // The jetty: planks on posts from the shore out over the water, a shade roof at the end
  for (let k = 0; k < 4; k++) rect(g, 606 + k * 20, 64, 3, 12, C.woodDark);
  rect(g, 596, 58, 84, 7, C.wood, 1);
  g.fillStyle = '#b8864f';
  for (let x = 600; x < 678; x += 6) g.fillRect(x, 59, 2, 5);
  rect(g, 650, 42, 2.5, 16, C.woodDark);
  rect(g, 672, 42, 2.5, 16, C.woodDark);
  rect(g, 646, 36, 32, 7, '#4f7cac', 1, 1);
}

export interface RoadPictureOpts {
  /** The jetty end's look (before or after the first boom). */
  jetty: JettyLook;
  /** The Next stop (a small danfo parked at its shelter), or null when none is Next. */
  next: StopId | null;
}

/**
 * The whole road picture in road units (0, 0) to (680, 168): sky, low blocks, trees, a kiosk and a
 * market umbrella, the shelters, the main road with its two gentle bends, kerbs and lane dashes,
 * the side road up to the Lane run stop with three stuck danfos queued on it, the lagoon shore and
 * the jetty end. The plates (the buttons) go on top.
 */
export function drawRoadPicture(g: CanvasRenderingContext2D, opts: RoadPictureOpts): void {
  const { w, h } = ROAD;
  g.save();
  const sky = g.createLinearGradient(0, 0, 0, 70);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyLow);
  g.fillStyle = C.pave;
  g.fillRect(0, 0, w, h);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, 90);
  // The lagoon at the right end, with a sandy shore
  g.fillStyle = C.water;
  g.beginPath();
  g.moveTo(566, 0);
  g.quadraticCurveTo(586, 60, 600, 100);
  g.quadraticCurveTo(640, 132, w, 128);
  g.lineTo(w, 0);
  g.closePath();
  g.fill();
  g.fillStyle = C.waterLight;
  for (let k = 0; k < 6; k++) g.fillRect(600 + (k % 3) * 24, 12 + k * 14, 12, 1.5);
  g.strokeStyle = C.sand;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(566, 0);
  g.quadraticCurveTo(586, 60, 600, 100);
  g.quadraticCurveTo(640, 132, w, 128);
  g.stroke();
  for (const [x, wd, top, wall] of BLOCKS) block(g, x, wd, top, wall);
  hall(g, STOP_BOX.hall.x);
  // The pavement, the trees, the kiosk and the umbrella along the edges
  g.fillStyle = C.pave;
  g.beginPath();
  g.moveTo(0, 88);
  g.lineTo(590, 88);
  g.quadraticCurveTo(604, 104, 612, 132);
  g.lineTo(0, 132);
  g.closePath();
  g.fill();
  g.fillStyle = C.paveEdge;
  g.fillRect(0, 88, 586, 2);
  palm(g, 268, 90);
  mango(g, 404, 90);
  kiosk(g, 534, 90);
  umbrella(g, 22, 90);
  palm(g, 196, 70);
  // The side road climbs from the main road to the Lane run stop
  g.fillStyle = C.road;
  g.beginPath();
  g.moveTo(SIDE_ROAD_X - 11, 134);
  g.quadraticCurveTo(SIDE_ROAD_X - 14, 96, SIDE_ROAD_X - 10, 60);
  g.lineTo(SIDE_ROAD_X + 10, 60);
  g.quadraticCurveTo(SIDE_ROAD_X + 14, 96, SIDE_ROAD_X + 11, 134);
  g.closePath();
  g.fill();
  g.strokeStyle = C.kerb;
  g.lineWidth = 1.5;
  g.stroke();
  // Three danfos stuck nose to tail (seen from the front, coming down to the main road)
  for (const y of [84, 110, 136]) {
    g.save();
    g.translate(SIDE_ROAD_X, y);
    g.scale(0.56, 0.56);
    drawCityBus(g, 0, 0, 's');
    g.restore();
  }
  for (const s of SHELTER_STOPS) drawShelter(g, STOP_BOX[s]);
  // The main road: kerb, tarmac and dashes bending gently twice, ending at the shore
  const end = 620;
  g.fillStyle = C.road;
  g.beginPath();
  g.moveTo(0, 130 + roadBend(0));
  for (let x = 0; x <= end; x += 10) g.lineTo(x, 130 + roadBend(x));
  g.quadraticCurveTo(end + 20, 148, end, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  g.strokeStyle = C.kerb;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = C.roadDark;
  g.fillRect(0, h - 3, end, 3);
  g.fillStyle = C.dash;
  for (let x = 4; x < end - 16; x += 22) g.fillRect(x, 160 + roadBend(x) * 0.4, 11, 2.5);
  drawJettyEnd(g, opts.jetty);
  if (opts.next) drawNextDanfo(g, opts.next);
  g.restore();
}

// ---------- Icons (16 px), one path set for the canvas (Path2D) and for HTML (SVG) ----------

export type RoadIcon = 'padlock' | 'bus' | 'tick' | 'ferry' | 'parcel' | 'house' | 'soundOn' | 'soundOff' | 'left' | 'right';
export const ROAD_ICONS: readonly RoadIcon[] = ['padlock', 'bus', 'tick', 'ferry', 'parcel', 'house', 'soundOn', 'soundOff', 'left', 'right'];

/** [path, fill or '', stroke width (0 = none)]; stroke is always the ink (or `ink` on dark buttons). */
type Part = readonly [string, string, number];
const CREAM = '#fffaf0';
const SPEAKER = 'M1.5 6H4.5L8.5 2.5V13.5L4.5 10H1.5Z';

/** Every icon in dark ink with cream cut-outs, so it reads on yellow, on sand and in greyscale. */
const ICON_PARTS: Readonly<Record<RoadIcon, readonly Part[]>> = {
  padlock: [
    ['M4.8 7.5V5.2A3.2 3.2 0 0 1 11.2 5.2V7.5', '', 2],
    ['M3 7H13V15H3Z', INK, 0],
    ['M8 9.4A1.3 1.3 0 1 1 7.99 9.4ZM7.3 10.8H8.7V13H7.3Z', CREAM, 0],
  ],
  bus: [
    ['M1 4.5Q1 3 2.5 3H12.5Q14 3 14.6 5L15.2 8V12.5H1Z', INK, 0],
    ['M2.5 4.8H5.2V7.6H2.5ZM6.4 4.8H9.1V7.6H6.4ZM10.3 4.8H12.9L13.6 7.6H10.3Z', CREAM, 0],
    ['M4.5 11.8A1.8 1.8 0 1 1 4.49 11.8ZM11.5 11.8A1.8 1.8 0 1 1 11.49 11.8Z', INK, 0],
    ['M4.5 13A0.6 0.6 0 1 1 4.49 13ZM11.5 13A0.6 0.6 0 1 1 11.49 13Z', CREAM, 0],
  ],
  tick: [['M2.5 8.6L6.2 12.2L13.6 4', '', 2.6]],
  ferry: [
    ['M1 9.5H15L12.8 13.5H3.2Z', INK, 0],
    ['M4 5.5H12V9.5H4Z', INK, 0],
    ['M5.3 6.6H7V8.3H5.3ZM7.9 6.6H9.6V8.3H7.9ZM10.5 6.6H11V8.3H10.5Z', CREAM, 0],
    ['M7.3 3H8.7V5.5H7.3Z', INK, 0],
    ['M1 15.2Q2.75 14.2 4.5 15.2T8 15.2T11.5 15.2T15 15.2', '', 1.1],
  ],
  parcel: [
    ['M2 5.5H14V14.5H2Z', '#c9a26b', 1.4],
    ['M8 5.5V14.5M2 9.5H14', '', 1.4],
    ['M8 5.5C6 2 3.5 3.5 6 5.5M8 5.5C10 2 12.5 3.5 10 5.5', '', 1.2],
  ],
  house: [
    ['M1.5 8.3L8 2.2L14.5 8.3', '', 2],
    ['M3.5 7.2L8 3.2L12.5 7.2V14.5H3.5Z', INK, 0],
    ['M6.6 10H9.4V14.5H6.6Z', CREAM, 0],
  ],
  soundOn: [
    [SPEAKER, INK, 0],
    ['M10.6 5.6Q12.4 8 10.6 10.4M12.6 3.6Q15.6 8 12.6 12.4', '', 1.5],
  ],
  soundOff: [
    [SPEAKER, INK, 0],
    ['M10.6 5.8L14.6 10.2M14.6 5.8L10.6 10.2', '', 1.7],
  ],
  left: [['M10 3L5 8L10 13', '', 2.6]],
  right: [['M6 3L11 8L6 13', '', 2.6]],
};

/** The icon as SVG markup for an HTML button (aria-hidden; the words beside it are spoken). `ink` recolours the strokes and dark fills (e.g. '#fffaf0' on a dark arrow button). */
export function roadIconSvg(icon: RoadIcon, size: number = PLATE.icon, ink: string = INK): string {
  const paths = ICON_PARTS[icon]
    .map(([d, fill, sw]) => {
      const f = fill === INK ? ink : fill || 'none';
      const s = sw > 0 ? ` stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : '';
      return `<path d="${d}" fill="${f}"${s}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/** The icon on a canvas, top left at (x, y), `size` units square. Needs Path2D (draws nothing without it). */
export function drawRoadIcon(g: CanvasRenderingContext2D, icon: RoadIcon, x: number, y: number, size: number = PLATE.icon, ink: string = INK): void {
  if (typeof Path2D === 'undefined') return;
  g.save();
  g.translate(x, y);
  g.scale(size / 16, size / 16);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [d, fill, sw] of ICON_PARTS[icon]) {
    const p = new Path2D(d);
    if (fill) {
      g.fillStyle = fill === INK ? ink : fill;
      g.fill(p);
    }
    if (sw > 0) {
      g.strokeStyle = ink;
      g.lineWidth = sw;
      g.stroke(p);
    }
  }
  g.restore();
}

/** The round dark edge-arrow button (44 x 44) with the arrow as a shape, as SVG markup. */
export function edgeArrowSvg(dir: 'left' | 'right', size = 44): string {
  const inner = roadIconSvg(dir, 22, CREAM).replace('<svg ', '<svg x="11" y="11" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="20" fill="${INK}" fill-opacity=".85" stroke="${CREAM}" stroke-width="2"/>${inner}</svg>`;
}

// ---------- The stop plate ----------

export type PlateState = 'locked' | 'open' | 'next' | 'done' | 'soon' | 'built';

export interface PlateWords {
  name: string;
  status: string;
  line3?: string | undefined;
  /** The hall with a saved garri parcel: a parcel icon after the name. */
  parcel?: boolean | undefined;
}

/** The icon each state shows left of its status line (a shape for every state: part 3's table). */
export function plateIcon(state: PlateState, ferry = false): RoadIcon {
  if (ferry || state === 'soon' || state === 'built') return 'ferry';
  if (state === 'locked') return 'padlock';
  if (state === 'done') return 'tick';
  return 'bus';
}

/** The plate's fill for a state: danfo yellow when it can be played, sand when locked or the ferry. */
export function plateFill(state: PlateState): string {
  return state === 'locked' || state === 'soon' || state === 'built' ? PLATE.locked : PLATE.open;
}

/** The Next pennant as SVG (44 x 18): a dark flag with an arrow shape and the word "Next". Place its left edge 46 px in from the plate's right, 10 px above its top. */
export function nextPennantSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 18" width="44" height="18" aria-hidden="true" focusable="false"><path d="M1 1H43L38 9L43 17H1Z" fill="${INK}" stroke="${CREAM}" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 9H13M10 5.5L13.5 9L10 12.5" fill="none" stroke="${CREAM}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="16" y="13" font-family="sans-serif" font-weight="bold" font-size="10" fill="${CREAM}">Next</text></svg>`;
}

/** The round tick badge as SVG (20 x 20). Centre it on the plate's top right corner, 4 px in. */
export function tickBadgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="9" fill="${PLATE.badge}" stroke="${INK}" stroke-width="2"/><path d="M5.5 10.3L8.6 13.2L14.4 6.8" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function pennant(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = INK;
  g.strokeStyle = CREAM;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x + 1, y + 1);
  g.lineTo(x + 43, y + 1);
  g.lineTo(x + 38, y + 9);
  g.lineTo(x + 43, y + 17);
  g.lineTo(x + 1, y + 17);
  g.closePath();
  g.fill();
  g.stroke();
  g.strokeStyle = CREAM;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x + 5, y + 9);
  g.lineTo(x + 13, y + 9);
  g.moveTo(x + 10, y + 5.5);
  g.lineTo(x + 13.5, y + 9);
  g.lineTo(x + 10, y + 12.5);
  g.stroke();
  g.fillStyle = CREAM;
  g.font = 'bold 10px sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText('Next', x + 16, y + 13);
}

function badge(g: CanvasRenderingContext2D, cx: number, cy: number): void {
  disc(g, cx, cy, 9, PLATE.badge);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 9, 0, TAU);
  g.stroke();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(cx - 4.5, cy + 0.3);
  g.lineTo(cx - 1.4, cy + 3.2);
  g.lineTo(cx + 4.4, cy - 3.2);
  g.stroke();
}

/**
 * A stop plate on a canvas (the gallery, or a canvas-drawn road), in road units at box b. The HTML
 * button can copy it: PLATE's colours and fonts, roadIconSvg, nextPennantSvg and tickBadgeSvg.
 * `bob` lifts the Next plate (part 3: 2 px once a second; 0 with reduced motion).
 */
export function drawStopPlate(g: CanvasRenderingContext2D, b: RoadBox, state: PlateState, words: PlateWords, bob = 0, ferry = false): void {
  const { x, w, h } = b;
  const y = b.y - (state === 'next' ? bob : 0);
  g.save();
  rect(g, x + 2, y + 3, w, h, 'rgba(0,0,0,0.18)', 0, 6);
  rect(g, x, y, w, h, plateFill(state), PLATE.outline, 6);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(x + 2, y + PLATE.nameH, w - 4, 1.5);
  g.fillStyle = PLATE.ink;
  g.textBaseline = 'middle';
  g.font = PLATE.name;
  g.textAlign = 'center';
  const nameW = textWidth(g, words.name, 7);
  const iconGap = words.parcel ? 16 : 0;
  g.fillText(words.name, x + w / 2 - iconGap / 2, y + 13, w - 2 * PLATE.pad - iconGap);
  if (words.parcel) drawRoadIcon(g, 'parcel', x + w / 2 + nameW / 2 - iconGap / 2 + 2, y + 6, 14);
  drawRoadIcon(g, plateIcon(state, ferry), x + PLATE.pad + 2, y + 27, PLATE.icon);
  g.fillStyle = PLATE.ink;
  g.font = PLATE.status;
  g.textAlign = 'left';
  g.fillText(words.status, x + PLATE.pad + 22, y + 35.5, w - PLATE.pad * 2 - 22);
  if (words.line3) {
    g.font = PLATE.line3;
    g.fillText(words.line3, x + PLATE.pad + 2, y + 52, w - PLATE.pad * 2 - 2);
  }
  if (state === 'next') pennant(g, x + w - 46, y - 10);
  if (state === 'done' || state === 'built') badge(g, x + w - 4, y + 4);
  g.restore();
}

// ---------- The stop card's picture ----------

/** Part 5's cuts from the still city picture (map units, 4 by 3). The hall has no cut (its hall picture); the Lane run uses Ikeja's or Computer Village's. */
export const CARD_CUTS: Readonly<Record<'alausa' | 'computerVillage' | 'ikeja' | 'ferry', RoadBox>> = {
  alausa: { x: 0, y: 335, w: 240, h: 180 },
  computerVillage: { x: 1163, y: 301, w: 320, h: 240 },
  ikeja: { x: 536, y: 579, w: 320, h: 240 },
  ferry: { x: 290, y: 760, w: 320, h: 240 },
};

/** Copies a cut of the still city picture (painted at `cityScale` pixels per map unit) into a w x h box at (0, 0). One image draw. */
export function drawCardCut(g: CanvasRenderingContext2D, city: CanvasImageSource, cityScale: number, cut: RoadBox, w: number, h: number): void {
  g.drawImage(city, cut.x * cityScale, cut.y * cityScale, cut.w * cityScale, cut.h * cityScale, 0, 0, w, h);
}

/** The fallback picture (the city picture is not ready): plain warm sand with a road band. */
export function drawCardFallback(g: CanvasRenderingContext2D, w: number, h: number): void {
  rect(g, 0, 0, w, h, '#e6d4ae');
  rect(g, 0, h * 0.72, w, h * 0.28, '#c9b48c');
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 4; x < w; x += w / 6) g.fillRect(x, h * 0.86, w / 12, h * 0.02);
}

export interface CardOverlay {
  /** The stop name on the sign (the only place the name is drawn). */
  name: string;
  /** The hero the player built (every body, skin, hair and outfit). */
  hero: HeroLook;
  /** Seconds, for the cloth sway; with `still`, nothing moves. */
  time?: number;
  still?: boolean;
  /** False: the sign only (the ferry). */
  bus?: boolean;
}

/** Where the overlay's pieces sit, at card width w (all scale with w / 112). */
export function cardOverlayLayout(w: number, h: number): { u: number; sign: RoadBox; bus: { x: number; y: number; scale: number }; hero: { x: number; y: number; scale: number } } {
  const u = w / 112;
  return {
    u,
    sign: { x: 4 * u, y: 4 * u, w: 104 * u, h: 17 * u },
    bus: { x: 74 * u, y: h - 6 * u, scale: 1.45 * u },
    hero: { x: 85 * u, y: h - 11 * u, scale: 0.56 * u },
  };
}

/**
 * Drawn over the card's picture at card size (0, 0, w, h; 112 x 84, 160 x 120 or 240 x 180): a
 * danfo-yellow bus stop sign with the stop's name (bold 11 px at 112 wide, never cut), a yellow
 * danfo with its door open, and the hero you built stepping in (about 30 px tall at 112 wide).
 */
export function drawCardOverlay(g: CanvasRenderingContext2D, w: number, h: number, o: CardOverlay): void {
  const L = cardOverlayLayout(w, h);
  const { u } = L;
  g.save();
  // The sign: a pole down the left, a yellow plate as wide as the name needs
  let font = 11 * u;
  g.font = `bold ${font}px sans-serif`;
  let tw = textWidth(g, o.name, font * 0.6);
  const room = L.sign.w - 10 * u;
  if (tw > room) {
    font *= room / tw;
    tw = room;
    g.font = `bold ${font}px sans-serif`;
  }
  const sw = tw + 10 * u;
  const sx = L.sign.x;
  const sy = L.sign.y;
  rect(g, sx + 6 * u, sy + L.sign.h - 1, 2.4 * u, h - sy - L.sign.h - 3 * u, '#5d6670');
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(sx + 7.2 * u, h - 3 * u, 4 * u, 1.2 * u, 0, 0, TAU);
  g.fill();
  rect(g, sx, sy, sw, L.sign.h, PLATE.open, Math.max(1, 1.5 * u), 3 * u);
  g.fillStyle = PLATE.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(o.name, sx + sw / 2, sy + L.sign.h / 2 + 0.5 * u);
  if (o.bus !== false) {
    drawDanfoSide(g, L.bus.x, L.bus.y, true, L.bus.scale);
    // The hero steps up into the open door: walking, facing the bus, one foot on the step
    g.save();
    g.translate(L.hero.x, L.hero.y);
    g.scale(L.hero.scale, L.hero.scale);
    drawHero(g, o.hero, { phase: 0.3, inAir: false, facing: 1, glow: false, gait: 'walk', time: o.time ?? 0, still: o.still === true });
    g.restore();
    // The door's far jamb in front of the hero, so the hero is stepping in, not standing by
    const k = L.bus.scale;
    rect(g, L.bus.x + 12.6 * k, L.bus.y - 21 * k, 2 * k, 17 * k, '#f6c90e', Math.max(0.8, 0.8 * k));
  }
  g.restore();
}
