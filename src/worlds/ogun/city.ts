/**
 * Ogun from above (art O6a; docs/ogun.md 6.1 to 6.4 and part 7; decisions 47, 72 to 82). Our own
 * model-town view, the same size and angle as Lagos (src/art/city.ts): 1600 x 1000 map units,
 * blocks in 3 rows of 4, a motor park in the middle, seen from the south. Drawn as Ogun, in
 * Ogun's colour note (indigo, laterite red-brown, granite grey, warm cream, danfo yellow):
 *  - bottom left: the gateway arch over the road in from Lagos (the edge of the map);
 *  - left: Ota's factory estate (saw-tooth sheds) and its truck park;
 *  - middle: the interchange, our own flyover where the town avenue crosses the expressway,
 *    with the motor park and the water point beside it;
 *  - top: Abeokuta's yards and the adire market plot, our own big unnamed granite rocks along
 *    the top edge, and the river crossing the top right under our own bridge;
 *  - right: Ijebu-Ode's garri mill plot; bottom right: Sagamu's kola market plot and the border
 *    market road leaving the map (a busy market road under a plain board; no post, gate, fence
 *    or officer, OG-R7);
 *  - far top left: a small working quarry (no blasting, nobody near the face).
 * No real building, bridge, crest, brand, party colour or person; nothing religious (OG-R1);
 * no held broom (decision 75); market shades are flat cloth on poles, never umbrellas.
 *
 * Lives in the lazy Ogun part: import it only from src/worlds/ogun/ (gamedev, O6b).
 * Light: drawOgunCity paints the still city once (makeOgunCityCanvas); pins, buses and the tax
 * places (drawAdireMarket, drawGarriMill, drawKolaMarket) are drawn on top each frame they move.
 * Reduced motion: the still picture never moves; pass `still` to the places.
 */
import { CITY_MAP, PIN, drawBusShelter, drawCityBus, drawCityLamp, drawPotholeSpot, drawSpotIcon, pinHitBox, type CityBox, type SpotLook } from '../../art/city';
import { TIRED_COLOURS, brightColour, drawCityFolk, drawCityPalm, drawCityTree, fadeColour, tiredColour, tiredRoof } from '../../art/bright';
import { drawFolk, type Folk } from '../../art/places';
import { drawMiniArch } from '../../art/gatewayRoad';
import { CREAM, INK, WHITE } from '../../art/palette';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

export const OGUN_MAP = CITY_MAP;

/** Ogun's colours from above. */
export const OG = {
  land: '#e8d3b2',
  verge: '#c98a5c',
  vergeDark: '#b0704a',
  grass: '#b7cf7d',
  lot: '#f2e5cb',
  kerb: '#c7a47f',
  road: '#5a575d',
  roadEdge: '#e0b25a',
  line: '#f4f1e6',
  fresh: '#3f3e45',
  granite: '#aaa69d',
  graniteLight: '#cdc9bf',
  graniteDark: '#85817a',
  river: '#7fa58b',
  riverDeep: '#6b927a',
  wave: '#d5e5cf',
  indigo: '#2f3f8f',
  indigoPale: '#7f8bc9',
  laterite: '#b5562e',
  zinc: '#b8bfc5',
  zincDark: '#949ca4',
  rust: '#a8653f',
  cream: '#f6e9cc',
  water: '#6fc3e0',
  dim: 'rgba(38,40,78,0.38)',
} as const;

/** Ogun's own walls: cream, ochre, laterite pink, indigo-washed blue, sage, apricot. */
const WALLS = ['#f1d9a6', '#e7b27a', '#e49a7e', '#a9b4e0', '#b9cf9a', '#f0c08e', '#d9c3e6', '#9fc8c0'] as const;

// ---------- Layout ----------

export type OgunSpotId = 'potholes' | 'dryTaps' | 'lightsOut' | 'slowInternet' | 'badRoad';
export const OGUN_SPOT_IDS: readonly OgunSpotId[] = ['potholes', 'dryTaps', 'lightsOut', 'slowInternet', 'badRoad'];
export type OgunSpotLooks = Record<OgunSpotId, SpotLook>;
/** Every spot shows its problem. */
export const OGUN_START_LOOKS: OgunSpotLooks = { potholes: 'problem', dryTaps: 'problem', lightsOut: 'problem', slowInternet: 'problem', badRoad: 'problem' };
/** The pin words (ogun.md 6.2). The card words are gamedev's, in words.ts. */
export const OGUN_SPOT_WORDS: Record<OgunSpotId, string> = { potholes: 'Potholes', dryTaps: 'Dry taps', lightsOut: 'Lights out', slowInternet: 'Slow internet', badRoad: 'Bad road' };

export type OgunPlaceId = 'adire' | 'mill' | 'kola';
export const OGUN_PLACE_IDS: readonly OgunPlaceId[] = ['adire', 'mill', 'kola'];

/** Roads: [from, to] across (y) and up (x) the map. */
const H_ROADS: readonly (readonly [number, number])[] = [
  [100, 126], // far road under the rocks
  [288, 318],
  [522, 596], // the expressway (two lanes each way)
  [802, 834], // the town road
];
const V_ROADS: readonly (readonly [number, number])[] = [
  [70, 132], // the gateway road, in from Lagos at the bottom
  [470, 506],
  [792, 850], // the avenue over the interchange
  [1130, 1166],
  [1480, 1520], // north over the river bridge
];
const ROWS: readonly (readonly [number, number])[] = [
  [126, 288],
  [318, 522],
  [596, 802],
];
const COLS: readonly (readonly [number, number])[] = [
  [132, 470],
  [506, 792],
  [850, 1130],
  [1166, 1480],
];
/** The motor park beside the interchange, and the water point beside it (pin 3). */
export const MOTOR_PARK = { x: 858, y: 604, w: 150, h: 190 } as const;
export const WATER_POINT = { x: 1016, y: 604, w: 106, h: 190 } as const;
/** The flyover deck over the expressway (the interchange, pin 4). */
export const FLYOVER_DECK = { x: 788, y: 458, w: 66, h: 196 } as const;
/** Where the gateway arch stands (base centre) and its size on the map. */
export const OGUN_ARCH = { x: 101, y: 972, s: 3.2 } as const;
/** The river's bank along the top right, and the bridge over it. */
const RIVER_TOP = 0;

export type OgunBlockKind = 'yards' | 'adire' | 'estate' | 'trucks' | 'mill' | 'kola' | 'shops';

export interface OgunBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  d: number;
  kind: OgunBlockKind;
  boxes: readonly CityBox[];
  spot?: OgunSpotId;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const KINDS: Record<string, OgunBlockKind> = { r0c0: 'yards', r0c1: 'adire', r0c2: 'yards', r0c3: 'yards', r1c0: 'estate', r1c3: 'mill', r2c0: 'trucks', r2c3: 'kola' };

function makeBlocks(): OgunBlock[] {
  const out: OgunBlock[] = [];
  ROWS.forEach(([y0, y1], r) => {
    COLS.forEach(([x0, x1], c) => {
      const id = `r${r}c${c}`;
      if (id === 'r2c2') return; // the motor park and the water point
      const x = x0 + 8;
      const w = x1 - x0 - 16;
      const y = y0 + 8;
      const d = y1 - y0 - 16;
      const kind = KINDS[id] ?? 'shops';
      const seed = r * 4 + c + 1;
      const boxes: CityBox[] = [];
      if (kind === 'estate' || kind === 'trucks') {
        // Long factory sheds (their saw-tooth roofs are drawn by drawShed)
        const n = kind === 'estate' ? 2 : 1;
        for (let k = 0; k < n; k++) boxes.push({ x: x + 12 + k * (w / n), y: y + 12, w: w / n - 24, d: kind === 'estate' ? d - 64 : d * 0.42, h: 30, wall: '#c3c8de', roof: OG.zinc, tank: false });
      } else {
        // Homes and shops: two or three boxes; a build plot keeps a shallow row at the back
        const plot = kind === 'adire' || kind === 'mill' || kind === 'kola';
        const n = w > 260 ? 3 : 2;
        let at = x + 14;
        for (let k = 0; k < n; k++) {
          const share = k === n - 1 ? x + w - 14 - at : Math.round(((w - 28) / n) * (0.8 + hash(seed * 7 + k) * 0.4));
          const deep = plot ? Math.round(d * 0.3) : hash(seed * 3 + k) > 0.4 ? d - 40 : Math.round((d - 40) * 0.62);
          const wall = WALLS[(seed * 3 + k * 5) % WALLS.length]!;
          boxes.push({ x: at + 4, y: y + 12, w: share - 8, d: deep, h: Math.round((plot ? 16 : 24) + hash(seed * 11 + k) * (r === 1 ? 20 : 12)), wall, roof: hash(seed + k) > 0.5 ? OG.zinc : OG.rust, tank: hash(seed * 13 + k) > 0.45 });
          at += share;
        }
      }
      const b: OgunBlock = { id, x, y, w, d, kind, boxes };
      if (id === 'r1c0') b.spot = 'slowInternet';
      out.push(b);
    });
  });
  return out;
}

/** The 11 blocks, back row first (the order to draw them); r2c2 is the motor park and the water point. */
export const OGUN_BLOCKS: readonly OgunBlock[] = makeBlocks();

export interface OgunSpot {
  id: OgunSpotId;
  /** Where the pin stands (its foot). */
  pin: { x: number; y: number };
  /** The area to centre on (double tap, Mission complete). */
  focus: { x: number; y: number; w: number; h: number };
  /** The area id it belongs to (OGUN_CITY_AREAS), or null for a road. */
  area: string | null;
}

export const OGUN_SPOTS: Record<OgunSpotId, OgunSpot> = {
  potholes: { id: 'potholes', pin: { x: 101, y: 430 }, focus: { x: 40, y: 330, w: 130, h: 190 }, area: null },
  dryTaps: { id: 'dryTaps', pin: { x: 1069, y: 690 }, focus: { x: 1000, y: 596, w: 140, h: 206 }, area: 'water' },
  lightsOut: { id: 'lightsOut', pin: { x: 821, y: 470 }, focus: { x: 740, y: 440, w: 170, h: 230 }, area: 'interchange' },
  slowInternet: { id: 'slowInternet', pin: { x: 300, y: 486 }, focus: { x: 132, y: 318, w: 338, h: 204 }, area: 'r1c0' },
  badRoad: { id: 'badRoad', pin: { x: 101, y: 900 }, focus: { x: 20, y: 834, w: 200, h: 166 }, area: 'gate' },
};

/** Where each tax place stands once built (its front middle, the door the hero collects at), on its plot. */
export const OGUN_PLACES: Record<OgunPlaceId, { x: number; y: number; block: string }> = {
  adire: { x: 649, y: 262, block: 'r0c1' },
  mill: { x: 1323, y: 500, block: 'r1c3' },
  kola: { x: 1323, y: 780, block: 'r2c3' },
};

/** The border market road (bottom right, leaving the map): a "Coming soon" pin stands here. */
export const BORDER_PIN = { x: 1470, y: 930 } as const;

/** Area labels for the map (the words come from words.ts; area names only ever praise). */
export const OGUN_AREA_LABELS: Record<'ota' | 'abeokuta' | 'sagamu' | 'ijebuOde', { x: number; y: number }> = {
  ota: { x: 300, y: 590 },
  abeokuta: { x: 649, y: 140 },
  sagamu: { x: 1323, y: 818 },
  ijebuOde: { x: 1323, y: 334 },
};

/** Every area id `OgunCityOpts.bright` understands: the 11 blocks, the motor park, the water point, the interchange, the gateway and the verge. */
export const OGUN_CITY_AREAS: readonly string[] = [...OGUN_BLOCKS.map((b) => b.id), 'motorPark', 'water', 'interchange', 'gate', 'verge'];

/** Lanes the buses and trucks use: along x (e, w) at y, or along y (n, s) at x. */
export const OGUN_BUS_LANES = [
  { dir: 'e', y: 546, from: 0, to: CITY_MAP.w },
  { dir: 'w', y: 576, from: CITY_MAP.w, to: 0 },
  { dir: 'n', x: 112, from: 1000, to: 140 },
  { dir: 'e', y: 818, from: 0, to: CITY_MAP.w },
] as const;

export interface OgunCityOpts {
  /** Areas drawn bright (OGUN_CITY_AREAS); every other is tired. Left out: everything bright. */
  bright?: readonly string[];
  /** Built places: their plot is cleared at the front for the place (drawn on top by gamedev). */
  built?: readonly OgunPlaceId[];
  /** From the first boom: new upper floors in the middle and a second shelter at the motor park. */
  boom?: boolean;
}

// ---------- Small helpers ----------

function rect(g: G, x: number, y: number, w: number, h: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
}

function disc(g: G, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function oval(g: G, x: number, y: number, rx: number, ry: number, fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

function line(g: G, colour: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

function poly(g: G, pts: readonly number[], fill: string, lw = 0): void {
  g.fillStyle = fill;
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.closePath();
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

const clamp01 = (k: number | undefined): number => (k !== undefined && Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1);
const tint = (c: string, tired: boolean): string => (tired ? tiredColour(c) : brightColour(c));

/** Is this area drawn bright? */
export function ogunAreaBright(opts: OgunCityOpts, id: string): boolean {
  return opts.bright === undefined || opts.bright.includes(id);
}

// ---------- Pieces: rocks, a cone, buckets, trucks ----------

/** One of our own smooth granite rocks (no shrine, steps or carving): a big rounded hump, foot at (x, y). */
export function drawOgunRock(g: G, x: number, y: number, w: number, h: number): void {
  oval(g, x + w * 0.08, y, w * 0.55, h * 0.12, 'rgba(0,0,0,0.14)');
  g.fillStyle = OG.granite;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w / 2, y - h * 0.7, x - w * 0.2, y - h, x + w * 0.05, y - h);
  g.bezierCurveTo(x + w * 0.35, y - h, x + w / 2, y - h * 0.55, x + w / 2, y);
  g.closePath();
  g.fill();
  g.stroke();
  // Light on the left, a soft streak of shade on the right
  g.fillStyle = OG.graniteLight;
  g.beginPath();
  g.ellipse(x - w * 0.12, y - h * 0.68, w * 0.18, h * 0.16, -0.4, 0, TAU);
  g.fill();
  line(g, OG.graniteDark, 1.2, [x + w * 0.28, y - h * 0.6, x + w * 0.34, y - h * 0.2]);
}

function cone(g: G, x: number, y: number): void {
  rect(g, x - 4, y - 1.5, 8, 2, '#e0572b');
  poly(g, [x - 3, y - 1, x, y - 11, x + 3, y - 1], '#f07a2b');
  rect(g, x - 1.8, y - 6, 3.6, 1.6, WHITE);
}

function bucket(g: G, x: number, y: number, c: string, full: boolean): void {
  rect(g, x - 2.6, y - 5, 5.2, 5, c, 0.6);
  oval(g, x, y - 5, 2.6, 1, full ? OG.water : '#5b4636');
}

/**
 * A truck seen from above at an angle, centred on (x, y): 'tipper' (an open bed of gravel),
 * 'lorry' (plain sacks) or 'tanker' (a round tank). No writing, brand or company colour.
 * 'e'/'w' across the map (about 50 x 16), 'n'/'s' up and down (about 18 x 40). `load` 0..1 fills a lorry.
 */
export function drawOgunTruck(g: G, x: number, y: number, dir: 'e' | 'w' | 'n' | 's', kind: 'tipper' | 'lorry' | 'tanker', faded = false, load = 1): void {
  const f = (c: string): string => (faded ? fadeColour(c) : c);
  const cab = f(kind === 'tanker' ? '#e9e4d8' : kind === 'tipper' ? '#e0572b' : '#2f5d8a');
  g.save();
  g.translate(x, y);
  const across = dir === 'e' || dir === 'w';
  if (!across) g.rotate(dir === 'n' ? -Math.PI / 2 : Math.PI / 2);
  if (dir === 'w') g.scale(-1, 1);
  oval(g, 2, 7, 27, 5, 'rgba(0,0,0,0.18)');
  // Side wall, wheels, then the top: the cab at the front (+x), the bed or tank behind
  rect(g, -25, -2, 50, 9, f('#4a4d55'), 1);
  for (const wx of [-17, -9, 16]) disc(g, wx, 7, 2.8, '#222222');
  rect(g, 12, -14, 13, 14, cab, 1);
  rect(g, 21, -12, 3.4, 10, '#bfe3f5');
  if (kind === 'tanker') {
    rect(g, -25, -15, 36, 15, f('#d7dadf'), 1);
    rect(g, -25, -9, 36, 2, f('#aab0b8'));
    disc(g, -7, -11, 2.4, f('#aab0b8'));
  } else {
    rect(g, -25, -15, 36, 15, f(kind === 'tipper' ? '#c9a46a' : '#8a5d36'), 1);
    if (kind === 'tipper') {
      g.fillStyle = f('#9a9790');
      g.beginPath();
      g.ellipse(-7, -8, 15, 5, 0, 0, TAU);
      g.fill();
      for (let k = 0; k < 7; k++) disc(g, -18 + k * 5, -8 + (k % 2) * 2, 1.4, f('#cdc9bf'));
    } else {
      const n = Math.round(clamp01(load) * 6);
      for (let k = 0; k < n; k++) rect(g, -23 + (k % 3) * 11, -13 + Math.floor(k / 3) * 6, 10, 5, f('#efe6cf'), 0.5);
    }
  }
  g.restore();
}

// ---------- Ground: the land, the top edge, roads, the interchange, the gateway, the border road ----------

function road(g: G, x: number, y: number, w: number, h: number, along: 'x' | 'y', lanes: boolean, tired = false): void {
  rect(g, x, y, w, h, tired ? fadeColour(OG.road, 0.18) : OG.road);
  g.fillStyle = OG.roadEdge;
  if (along === 'x') {
    g.fillRect(x, y, w, 2);
    g.fillRect(x, y + h - 2, w, 2);
  } else {
    g.fillRect(x, y, 2, h);
    g.fillRect(x + w - 2, y, 2, h);
  }
  if (!lanes) return;
  g.fillStyle = OG.line;
  if (along === 'x') for (let xx = x + 10; xx < x + w - 16; xx += 40) g.fillRect(xx, y + h / 2 - 1.5, 20, 3);
  else for (let yy = y + 10; yy < y + h - 16; yy += 40) g.fillRect(x + w / 2 - 1.5, yy, 3, 20);
}

/** The small quarry far off, top left: grey terraces, a crusher shed, a stone heap and a tipper. No blasting, nobody near the face (OG-R5). */
function quarry(g: G): void {
  poly(g, [0, 0, 250, 0, 236, 30, 200, 60, 140, 82, 60, 92, 0, 94], '#b9b2a6');
  for (let k = 0; k < 4; k++) {
    const t = k * 14;
    poly(g, [0, 8 + t, 220 - k * 30, 8 + t, 210 - k * 30, 16 + t, 0, 16 + t], k % 2 ? '#a19a8e' : '#c9c2b6');
  }
  rect(g, 150, 54, 30, 18, '#8a939c', 1);
  line(g, '#5d6670', 2, [180, 60, 206, 44]);
  poly(g, [200, 74, 214, 56, 230, 74], '#9a9790', 0.8);
  drawOgunTruck(g, 110, 80, 'e', 'tipper', false);
}

/** The river along the top right with our own plain bridge (no real bridge): brown-green water, canoes far off. */
function river(g: G): void {
  g.fillStyle = OG.river;
  g.beginPath();
  g.moveTo(1080, RIVER_TOP);
  g.quadraticCurveTo(1330, 104, 1600, 70);
  g.lineTo(1600, 18);
  g.quadraticCurveTo(1360, 40, 1170, RIVER_TOP);
  g.closePath();
  g.fill();
  g.strokeStyle = '#c9a774';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = OG.wave;
  for (let i = 0; i < 12; i++) g.fillRect(1180 + i * 34, 30 + (i % 3) * 9 + i * 1.6, 14, 1.5);
  // Two canoes far off
  for (const [cx, cy] of [[1290, 50], [1400, 62]] as const) {
    oval(g, cx, cy, 11, 2.6, '#7a5232', 0.6);
    disc(g, cx + 2, cy - 2.6, 1.6, '#4b2c1a');
  }
  // The bridge: a plain concrete deck on round piers, the road crossing north
  const [x0, x1] = V_ROADS[4]!;
  for (const py of [30, 66]) rect(g, x0 + 6, py, 6, 10, '#c8bfae', 0.8);
  rect(g, x0 - 6, 0, x1 - x0 + 12, 100, '#d9d2c3', 1);
  rect(g, x0, 0, x1 - x0, 100, OG.road);
  for (let yy = 4; yy < 96; yy += 22) rect(g, (x0 + x1) / 2 - 1.2, yy, 2.4, 12, OG.line);
  for (const ex of [x0 - 6, x1 + 3]) for (let yy = 2; yy < 98; yy += 8) rect(g, ex, yy, 3, 5, '#eee8dc');
}

/** The interchange: our own flyover carrying the avenue over the expressway, on round pillars, with ramps and parapets. */
function flyover(g: G, tired: boolean, lampsOn: boolean): void {
  const { x, y, w, h } = FLYOVER_DECK;
  // Shadow on the expressway to the east, and the pillars under the deck
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.fillRect(x + w, 524, 18, 70);
  for (const py of [532, 586]) {
    rect(g, x + 8, py - 12, 8, 12, '#c8bfae', 0.8);
    rect(g, x + w - 16, py - 12, 8, 12, '#c8bfae', 0.8);
  }
  // Side face under the south ramp, then the deck with its parapets
  poly(g, [x, y + h - 60, x + w, y + h - 60, x + w, y + h, x, y + h], tired ? '#b1a796' : '#c2b9a8', 1);
  rect(g, x, y, w, h - 54, tired ? fadeColour(OG.road, 0.2) : OG.road, 1);
  rect(g, x - 3, y, 4, h - 54, '#e6e0d3', 0.6);
  rect(g, x + w - 1, y, 4, h - 54, '#e6e0d3', 0.6);
  g.fillStyle = tired ? 'rgba(244,241,230,0.45)' : OG.line;
  for (let yy = y + 8; yy < y + h - 70; yy += 26) g.fillRect(x + w / 2 - 1.5, yy, 3, 14);
  // Lamps along both parapets (pin 4: off until fixed)
  for (const ly of [494, 548, 602]) {
    drawCityLamp(g, x - 2, ly, lampsOn);
    drawCityLamp(g, x + w - 12, ly, lampsOn);
  }
}

/** The motor park beside the interchange: bays, a shelter and danfos. Tired: one faded danfo. */
function motorPark(g: G, bright: boolean, boom: boolean): void {
  const { x, y, w, h } = MOTOR_PARK;
  rect(g, x, y, w, h, bright ? '#6a6a71' : fadeColour('#6a6a71', TIRED_COLOURS.roadDust));
  g.fillStyle = bright ? 'rgba(244,241,230,0.85)' : 'rgba(244,241,230,0.28)';
  for (let k = 0; k < 4; k++) g.fillRect(x + 8, y + 56 + k * 34, w - 16, 2);
  rect(g, x + 6, y + 2, w - 12, 10, bright ? OG.indigo : fadeColour(OG.indigo), 1);
  for (const px of [x + 10, x + w - 14]) rect(g, px, y + 12, 4, 14, '#7d8a96');
  if (!bright) {
    drawCityBus(g, x + 40, y + 96, 's', true);
    return;
  }
  drawCityBus(g, x + 40, y + 96, 's');
  drawCityBus(g, x + 80, y + 128, 's');
  drawCityBus(g, x + 118, y + 70, 's');
  for (let k = 0; k < 4; k++) drawCityFolk(g, x + 22 + k * 12 + (k > 1 ? 50 : 0), y + 28 + (k % 2) * 3, k * 2 + 3);
  if (boom) drawBusShelter(g, x + 8, y + h - 24, w - 16);
}

/**
 * The water point by the motor park (pin 3, "Dry taps"): a tank on four legs, a small pump house
 * with a plain solar panel, a low tap stand with four taps on a concrete apron.
 * problem: dry, cracked ground, a neat row of empty buckets, nobody waiting. ready: the tools
 * wait. fixed: water runs, a queue of adults and teens with buckets and a child holding a
 * parent's hand (never a child carrying water alone).
 */
function waterPoint(g: G, look: SpotLook, bright: boolean): void {
  const { x, y, w, h } = WATER_POINT;
  const wet = look === 'fixed';
  rect(g, x, y, w, h, bright ? OG.lot : TIRED_COLOURS.lot, 0);
  g.strokeStyle = bright ? OG.kerb : TIRED_COLOURS.kerb;
  g.lineWidth = 1.5;
  g.strokeRect(x, y, w, h);
  // The tank on its legs
  for (const lx of [x + 16, x + 44]) line(g, '#7d8a96', 2, [lx, y + 66, lx, y + 26]);
  line(g, '#7d8a96', 1, [x + 16, y + 56, x + 44, y + 36, x + 16, y + 36, x + 44, y + 56]);
  rect(g, x + 10, y + 6, 40, 22, tint('#3b6aa8', !bright), 1);
  oval(g, x + 30, y + 6, 20, 5, tint('#5a86c0', !bright), 1);
  // Pump house with a plain solar panel
  rect(g, x + 62, y + 30, 32, 26, tint('#f1d9a6', !bright), 1);
  rect(g, x + 60, y + 16, 36, 14, '#2f4f7f', 1);
  g.strokeStyle = '#8fb0d8';
  g.lineWidth = 0.6;
  for (let k = 1; k < 4; k++) line(g, '#8fb0d8', 0.6, [x + 60 + k * 9, y + 16, x + 60 + k * 9, y + 30]);
  rect(g, x + 72, y + 42, 10, 14, wet ? '#ffd98a' : '#5b4636', 0.6);
  // The apron and the tap stand
  rect(g, x + 8, y + 82, w - 16, 44, wet ? '#c9cfd2' : '#d8cdb8', 1);
  rect(g, x + 14, y + 86, w - 28, 8, '#a9a39a', 0.8);
  for (let k = 0; k < 4; k++) {
    const tx = x + 22 + k * 20;
    line(g, '#5d6670', 2, [tx, y + 90, tx, y + 98]);
    if (wet) {
      line(g, OG.water, 1.6, [tx, y + 99, tx, y + 108]);
      oval(g, tx, y + 110, 5, 1.6, 'rgba(111,195,224,0.55)');
    }
  }
  if (!wet) {
    // Dry, cracked ground and a neat row of empty buckets
    for (let k = 0; k < 3; k++) line(g, '#b59c74', 0.8, [x + 14 + k * 28, y + 118, x + 22 + k * 28, y + 112, x + 18 + k * 28, y + 106]);
    for (let k = 0; k < 4; k++) bucket(g, x + 22 + k * 20, y + 124, ['#2b59c3', '#e0572b', '#13703a', '#f2b300'][k]!, false);
    if (look === 'ready') toolsWaiting(g, x + 30, y + 168);
    return;
  }
  // The queue: adults and teens with buckets, a child holding a parent's hand
  const Q: readonly Folk[] = [
    { skin: '#4b2c1a', top: '#2f3f8f', bottom: '#2f3f8f', head: 'gele', headCol: '#f2b300', robe: true },
    { skin: '#d9a172', top: '#e0572b', bottom: '#3b3f4a', head: 'short', headCol: '#1b1410', small: true },
    { skin: '#7a4a2a', top: '#13703a', bottom: '#13703a', head: 'scarf', headCol: '#e9e1cf', robe: true },
    { skin: '#a8693f', top: '#f4f4f4', bottom: '#5b3a22', head: 'short', headCol: '#1b1410' },
  ];
  Q.forEach((f, k) => {
    drawFolk(g, f, x + 22 + k * 20, y + 140 + (k % 2) * 4, { happy: true });
    bucket(g, x + 28 + k * 20, y + 142 + (k % 2) * 4, ['#2b59c3', '#e0572b', '#13703a', '#f2b300'][k]!, k < 2);
  });
  // A parent and child hand in hand, walking up to the queue
  drawFolk(g, { skin: '#f1c9a5', top: '#9b59b6', bottom: '#9b59b6', head: 'braids', headCol: '#1b1410', robe: true }, x + 40, y + 172, { happy: true });
  drawFolk(g, { skin: '#f1c9a5', top: '#f2b300', bottom: '#2b59c3', head: 'afro', headCol: '#20140e', small: true }, x + 50, y + 173, { happy: true });
  line(g, '#f1c9a5', 1.2, [x + 43, y + 165, x + 47, y + 166]);
}

/** Tools waiting for a ready spot: a cable drum, a toolbox and two cones. */
function toolsWaiting(g: G, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.scale(1.6, 1.6);
  oval(g, 2, 1, 14, 4, 'rgba(0,0,0,0.15)');
  oval(g, -6, -7, 6, 7, '#9a6a3c');
  oval(g, -4, -7, 6, 7, '#b8864f');
  oval(g, -4, -7, 2.5, 3, '#6b4a2b');
  rect(g, 4, -7, 11, 7, '#e0572b', 0.8);
  line(g, INK, 1, [7, -7, 7, -10, 12, -10, 12, -7]);
  cone(g, 20, 0);
  cone(g, -16, 2);
  g.restore();
}

/**
 * The gateway (pin 7, "Bad road"): the road in from Lagos leaves the map at the bottom under the
 * arch (our own drawing, gateway.ts). problem: a broken, holed road and the arch faded.
 * ready: tools wait. fixed: smooth road, fresh lines, the arch bright.
 */
function gateway(g: G, look: SpotLook): void {
  const [x0, x1] = V_ROADS[0]!;
  const w = x1 - x0;
  const fixed = look === 'fixed';
  rect(g, x0, 834, w, 166, fixed ? OG.fresh : '#686369');
  if (fixed) {
    g.fillStyle = '#f5cf3a';
    g.fillRect(x0, 834, 3, 166);
    g.fillRect(x1 - 3, 834, 3, 166);
    g.fillStyle = WHITE;
    for (let y = 842; y < 1000; y += 30) g.fillRect(x0 + w / 2 - 2, y, 4, 18);
    drawCityBus(g, x0 + w / 2 + 10, 900, 'n');
  } else {
    for (const [hx, hy, r] of [[x0 + 20, 860, 12], [x0 + 42, 908, 15], [x0 + 18, 950, 10]] as const) {
      oval(g, hx, hy, r + 3, (r + 3) * 0.5, '#5c4a38');
      oval(g, hx, hy, r, r * 0.45, '#2a1f17');
      oval(g, hx + 2, hy + 1, r * 0.5, r * 0.2, '#5f8c92');
    }
    line(g, '#3a3530', 1.2, [x0 + 8, 880, x0 + 22, 892, x0 + 12, 930]);
    cone(g, x0 + 8, 886);
    cone(g, x1 - 8, 936);
    if (look === 'ready') toolsWaiting(g, x1 + 24, 880);
  }
  drawMiniArch(g, OGUN_ARCH.x, OGUN_ARCH.y, OGUN_ARCH.s, fixed);
}

/** A flat cloth shade on four poles (never an umbrella), seen from above: a stripe of our own cloth. */
export function drawClothShade(g: G, x: number, y: number, w: number, d: number, c: string, c2: string): void {
  for (const px of [x + 2, x + w - 2]) line(g, '#6b4a2b', 1.4, [px, y + d, px, y + d - 12]);
  rect(g, x, y - 12, w, d, c, 0.8);
  g.fillStyle = c2;
  for (let k = 3; k < w - 3; k += 8) g.fillRect(x + k, y - 12, 3, d);
}

/**
 * The border market road (OG-R7): a busy, happy market road leaving the map at the bottom right
 * under a plain "BORDER MARKET" board: flat cloth shades, sacks, cloth and traders. No border
 * post, gate, fence, customs or officers.
 */
function borderRoad(g: G, tired: boolean): void {
  poly(g, [1300, 834, 1352, 834, 1600, 962, 1600, 1000, 1548, 1000], tired ? fadeColour('#6b6168', 0.2) : '#6b6168');
  line(g, OG.roadEdge, 2, [1300, 834, 1548, 1000]);
  line(g, OG.roadEdge, 2, [1352, 834, 1600, 962]);
  // Stalls along both sides, flat shades only
  const cloth: readonly (readonly [string, string])[] = [[OG.indigo, '#ffffff'], ['#e0572b', '#f6e9cc'], ['#13703a', '#f2b300'], ['#f2b300', OG.indigo]];
  for (let k = 0; k < 4; k++) {
    const t = 0.18 + k * 0.22;
    const lx = 1300 + 248 * t;
    const ly = 834 + 166 * t;
    drawClothShade(g, lx - 44, ly + 4, 30, 14, tint(cloth[k]![0], tired), cloth[k]![1]);
    rect(g, lx - 40, ly + 8, 10, 6, '#efe6cf', 0.5);
    if (!tired || k % 2 === 0) drawCityFolk(g, lx - 20, ly + 14, k * 3 + 1);
    const rx = 1352 + 248 * t;
    const ry = 834 + 128 * t;
    drawClothShade(g, rx + 14, ry - 8, 30, 14, tint(cloth[(k + 2) % 4]![0], tired), cloth[(k + 2) % 4]![1]);
    if (!tired || k % 2 === 1) drawCityFolk(g, rx + 10, ry + 2, k * 5 + 2);
  }
  // The plain board on two posts, with our own words
  line(g, '#5d6670', 2.4, [1318, 872, 1318, 852]);
  line(g, '#5d6670', 2.4, [1398, 872, 1398, 852]);
  rect(g, 1308, 838, 100, 18, CREAM, 1.4);
  g.fillStyle = INK;
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BORDER MARKET', 1358, 847.5, 94);
}

/**
 * The ground: land, the top edge (quarry, rocks, river and bridge), roads, the interchange, the
 * motor park and water point, the verge with palms, the gateway and the border market road.
 */
export function drawOgunGround(g: G, looks: OgunSpotLooks = OGUN_START_LOOKS, opts: OgunCityOpts = {}): void {
  const W = CITY_MAP.w;
  const verge = ogunAreaBright(opts, 'verge');
  rect(g, 0, 0, W, CITY_MAP.h, OG.land);
  // The top edge: dry grass, the quarry, our own rocks, trees between, the river
  rect(g, 0, 0, W, 100, OG.grass);
  quarry(g);
  for (let i = 0; i < 9; i++) drawOgunRock(g, 300 + i * 92 + hash(i) * 30, 70 + hash(i + 3) * 24, 70 + hash(i + 7) * 60, 34 + hash(i + 2) * 34);
  for (let i = 0; i < 8; i++) drawCityTree(g, 282 + i * 104 + hash(i + 20) * 30, 94, 9, !verge);
  river(g);
  for (const [y0, y1] of H_ROADS) road(g, 0, y0, W, y1 - y0, 'x', y1 - y0 > 50);
  for (const [x0, x1] of V_ROADS) road(g, x0, 100, x1 - x0, 734, 'y', x1 - x0 > 50);
  // The expressway's middle: a low concrete divider with yellow edges
  rect(g, 0, 557, W, 4, '#d3cdc2');
  g.fillStyle = OG.roadEdge;
  g.fillRect(0, 556, W, 1);
  g.fillRect(0, 561, W, 1);
  // The bottom: laterite verges with palms (Ogun's red-brown earth)
  rect(g, 0, 834, W, 166, verge ? OG.verge : fadeColour(OG.verge, 0.3));
  g.fillStyle = verge ? OG.vergeDark : fadeColour(OG.vergeDark, 0.3);
  for (let i = 0; i < 40; i++) g.fillRect(hash(i + 60) * W, 850 + hash(i + 61) * 140, 10 + hash(i) * 14, 2);
  for (let x = 180; x < 1260; x += 96) drawCityPalm(g, x, 880 + (x % 3) * 24, !verge);
  for (let i = 0; i < 6; i++) drawOgunRock(g, 230 + i * 190 + hash(i + 40) * 60, 950 + hash(i + 41) * 36, 36 + hash(i + 42) * 30, 18 + hash(i + 43) * 16);
  borderRoad(g, !verge);
  motorPark(g, ogunAreaBright(opts, 'motorPark'), opts.boom === true);
  waterPoint(g, looks.dryTaps, ogunAreaBright(opts, 'water'));
  flyover(g, !ogunAreaBright(opts, 'interchange'), looks.lightsOut === 'fixed');
  if (looks.lightsOut !== 'fixed') {
    const { x, y, w, h } = FLYOVER_DECK;
    g.fillStyle = OG.dim;
    g.fillRect(x - 30, y - 40, w + 60, h + 40);
    for (const ly of [494, 548, 602]) {
      drawCityLamp(g, x - 2, ly, false);
      drawCityLamp(g, x + w - 12, ly, false);
    }
    if (looks.lightsOut === 'ready') toolsWaiting(g, x + w + 34, 640);
  } else for (let k = 0; k < 2; k++) drawCityBus(g, 821 + (k ? 12 : -12), 500 + k * 70, k ? 's' : 'n');
  drawPotholeSpot(g, looks.potholes);
  gateway(g, looks.badRoad);
}

// ---------- Blocks ----------

/** A home or shop seen from above at an angle: walls, louvre windows, a door, a zinc roof with its ridge. */
function house(g: G, b: CityBox, tired: boolean, dim: boolean, rise = 0): void {
  const h = b.h + rise;
  const top = b.y - h;
  const frontY = b.y + b.d - h;
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(b.x + b.w, b.y, h * 0.35, b.d);
  rect(g, b.x, frontY, b.w, h, tint(b.wall, tired), 1.2);
  // Windows with louvres (dark when the block waits for its fix)
  for (let yy = frontY + 6; yy < b.y + b.d - 16; yy += 12)
    for (let xx = b.x + 5; xx < b.x + b.w - 8; xx += 11) {
      rect(g, xx, yy, 6, 6, dim ? '#5f6670' : tired ? TIRED_COLOURS.window : '#cfe9f5');
      if (!dim) line(g, tired ? '#7d6a55' : '#8fb0c8', 0.6, [xx, yy + 2, xx + 6, yy + 2, xx + 6, yy + 4, xx, yy + 4]);
    }
  // A door and an indigo awning stripe over the shop front
  if (b.h > 18) {
    rect(g, b.x + 2, b.y + b.d - 13, b.w - 4, 4, tint(OG.indigo, tired));
    g.fillStyle = tired ? '#d9cfbf' : WHITE;
    for (let k = b.x + 5; k < b.x + b.w - 4; k += 8) g.fillRect(k, b.y + b.d - 12, 2, 2);
    rect(g, b.x + b.w - 12, b.y + b.d - 9, 6, 9, '#5b4636');
  }
  // Zinc roof: two slopes and a ridge; rusty patches when tired
  const roof = tired ? tiredRoof(b.roof) : b.roof;
  rect(g, b.x, top, b.w, b.d, roof, 1.2);
  rect(g, b.x + 1, top + b.d / 2, b.w - 2, b.d / 2 - 1, fadeColour(roof, 0.18, '#3a3530'));
  line(g, 'rgba(29,26,20,0.3)', 1, [b.x, top + b.d / 2, b.x + b.w, top + b.d / 2]);
  g.fillStyle = 'rgba(29,26,20,0.12)';
  for (let k = b.x + 4; k < b.x + b.w - 2; k += 5) g.fillRect(k, top + 1, 1, b.d - 2);
  if (tired) for (let k = 0; k < 2; k++) oval(g, b.x + b.w * (0.3 + k * 0.4), top + b.d * (0.3 + k * 0.4), 5, 2.5, 'rgba(150,80,40,0.35)');
  if (b.tank) {
    const tx = b.x + b.w - 14;
    rect(g, tx - 6, top + 4, 12, 8, '#3b4f6b');
    oval(g, tx, top + 4, 6, 2.5, '#5a7396');
  }
}

/** A factory shed with a saw-tooth roof (glazed north faces), plain walls and big doors. No name or logo. */
function shed(g: G, b: CityBox, tired: boolean, dim: boolean): void {
  const top = b.y - b.h;
  const frontY = b.y + b.d - b.h;
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(b.x + b.w, frontY + 10, 12, b.h);
  rect(g, b.x, frontY, b.w, b.h, tint(b.wall, tired), 1.2);
  for (let k = 0; k < 3; k++) {
    const dx = b.x + 12 + k * ((b.w - 40) / 2);
    rect(g, dx, b.y + b.d - 20, 20, 20, tired ? '#9a8f80' : '#6a7489', 1);
    for (let yy = b.y + b.d - 17; yy < b.y + b.d; yy += 4) line(g, 'rgba(255,255,255,0.25)', 0.6, [dx + 1, yy, dx + 19, yy]);
  }
  rect(g, b.x, top, b.w, b.d, tired ? tiredRoof(OG.zinc) : OG.zinc, 1.2);
  for (let yy = top + 6; yy < top + b.d - 4; yy += 14) {
    rect(g, b.x + 2, yy, b.w - 4, 5, dim ? '#4f5866' : tired ? '#a9b3bb' : '#bfe3f5');
    line(g, OG.zincDark, 1, [b.x + 2, yy + 5, b.x + b.w - 2, yy + 5]);
  }
}

/** The phone mast on the estate's shed: lattice, dishes, signal bars (one when slow, four when fixed). */
function mast(g: G, x: number, y: number, look: SpotLook): void {
  const top = y - 52;
  line(g, '#7d8a96', 2, [x - 8, y, x, top, x + 8, y]);
  for (let k = 1; k < 5; k++) {
    const hw = 8 * (1 - (k * 10) / 52);
    line(g, '#7d8a96', 1, [x - hw, y - k * 10, x + hw, y - k * 10 - 10]);
  }
  rect(g, x - 6, top + 10, 4, 8, '#e5e1d6', 0.6);
  rect(g, x + 2, top + 16, 4, 8, '#e5e1d6', 0.6);
  const bars = look === 'fixed' ? 4 : 1;
  for (let k = 0; k < 4; k++) rect(g, x + 14 + k * 6, top + 19 - k * 4, 4, 5 + k * 4, k < bars ? '#22a85a' : 'rgba(255,255,255,0.5)', 0.7);
  if (look === 'fixed') {
    disc(g, x, top - 2, 3.5, '#f4a62a');
    g.strokeStyle = '#f4a62a';
    g.lineWidth = 2;
    for (const r of [9, 15]) {
      g.beginPath();
      g.arc(x, top - 2, r, -Math.PI * 0.85, -Math.PI * 0.15);
      g.stroke();
    }
  } else disc(g, x, top - 2, 2.5, '#8a8a8a');
}

/** An adire cloth line between two posts: our own patterns only (circles, stripes, dots, folds). */
export function drawAdireLine(g: G, x0: number, x1: number, y: number, tired = false, sway = 0): void {
  line(g, '#6b4a2b', 1.4, [x0, y + 16, x0, y - 2]);
  line(g, '#6b4a2b', 1.4, [x1, y + 16, x1, y - 2]);
  line(g, '#5d6670', 0.7, [x0, y - 1, x1, y - 1]);
  const n = Math.max(1, Math.floor((x1 - x0 - 6) / 13));
  for (let k = 0; k < n; k++) drawAdireCloth(g, x0 + 4 + k * 13, y - 1, 10, 13, k, tired, sway * (k % 2 ? 1 : -1));
}

/** One hanging adire cloth, top left at (x, y): deep indigo with our own pale pattern `k` (0 circles, 1 stripes, 2 dots, 3 folds). */
export function drawAdireCloth(g: G, x: number, y: number, w: number, h: number, k: number, tired = false, sway = 0): void {
  const c = tired ? '#5f6aa3' : OG.indigo;
  const p = tired ? '#c9cde3' : '#e8ecff';
  poly(g, [x, y, x + w, y, x + w + sway, y + h, x + sway, y + h], c, 0.6);
  g.fillStyle = p;
  g.strokeStyle = p;
  g.lineWidth = 0.8;
  const m = ((k % 4) + 4) % 4;
  if (m === 0) {
    for (const [cx, cy] of [[0.3, 0.3], [0.7, 0.62]] as const) {
      g.beginPath();
      g.arc(x + w * cx + sway * cy, y + h * cy, w * 0.18, 0, TAU);
      g.stroke();
    }
  } else if (m === 1) for (let yy = 2; yy < h; yy += 3.4) g.fillRect(x + sway * (yy / h), y + yy, w, 1);
  else if (m === 2) for (let i = 0; i < 6; i++) g.fillRect(x + 1.5 + (i % 2) * (w / 2), y + 2 + Math.floor(i / 2) * (h / 3.2), 1.6, 1.6);
  else line(g, p, 0.8, [x + 1, y + 3, x + w / 2, y + h / 2, x + w - 1, y + 3, x + w - 1 + sway, y + h - 2, x + w / 2 + sway, y + h / 2 + 2, x + 1 + sway, y + h - 2]);
}

/** A dye pot (a wide clay pot of deep indigo dye, seen from above). Scenery only. */
export function drawDyePot(g: G, x: number, y: number, tired = false): void {
  oval(g, x + 1, y + 2, 8, 3, 'rgba(0,0,0,0.15)');
  oval(g, x, y, 7.5, 5, '#9a5a34', 0.8);
  oval(g, x, y - 1, 5.6, 3.4, tired ? '#3a3f66' : '#1f2a66');
  oval(g, x - 1.6, y - 1.8, 1.6, 0.8, 'rgba(255,255,255,0.4)');
}

/** One block: its lot, homes or sheds, its people and its look (tired, bright, spot). Draw in OGUN_BLOCKS order. */
export function drawOgunBlock(g: G, b: OgunBlock, look: SpotLook = 'fixed', opts: OgunCityOpts = {}): void {
  const tired = !ogunAreaBright(opts, b.id);
  const front = b.y + b.d;
  rect(g, b.x, b.y, b.w, b.d, tired ? TIRED_COLOURS.lot : OG.lot);
  g.strokeStyle = tired ? TIRED_COLOURS.kerb : OG.kerb;
  g.lineWidth = 1.5;
  g.strokeRect(b.x, b.y, b.w, b.d);
  const dim = b.spot === 'slowInternet' && look !== 'fixed';
  const built = (id: OgunPlaceId): boolean => opts.built?.includes(id) === true;
  if (b.kind === 'trucks') {
    // The truck park: a laterite yard with parked trucks and a loading shed
    rect(g, b.x + 6, b.y + b.d * 0.5, b.w - 12, b.d * 0.5 - 8, tired ? fadeColour(OG.verge, 0.3) : OG.verge);
    drawOgunTruck(g, b.x + 60, front - 36, 'e', 'lorry', tired, 0.5);
    drawOgunTruck(g, b.x + 150, front - 30, 'e', 'tipper', tired);
    if (!tired) drawOgunTruck(g, b.x + 250, front - 36, 'e', 'tanker', false);
  }
  const rise = opts.boom === true && b.id === 'r1c1' ? 30 : 0;
  for (const box of [...b.boxes].sort((p, q) => p.y + p.d - (q.y + q.d))) {
    if (b.kind === 'estate' || b.kind === 'trucks') shed(g, box, tired, dim);
    else house(g, box, tired, false, rise);
  }
  if (b.kind === 'yards' || b.kind === 'adire') {
    // Back yards with adire cloth on the lines, dye pots in the adire yards
    const cy = b.y + b.d * (b.kind === 'adire' ? 0.42 : 0.7);
    drawAdireLine(g, b.x + 20, b.x + Math.min(b.w - 20, 150), cy, tired);
    if (b.kind === 'adire' && !built('adire')) {
      for (let k = 0; k < 4; k++) drawDyePot(g, b.x + 190 + k * 22, cy + 10, tired);
      if (!tired) drawCityFolk(g, b.x + 178, cy + 14, 4);
    }
  }
  if (b.kind === 'mill' && !built('mill')) {
    // The plot waits: a cleared yard of laterite, stacked blocks and a garri sack or two
    rect(g, b.x + 40, b.y + b.d * 0.48, b.w - 80, b.d * 0.4, tired ? fadeColour(OG.verge, 0.4) : OG.verge);
    for (let k = 0; k < 3; k++) rect(g, b.x + 60 + k * 12, front - 30, 10, 6, '#c9c2b6', 0.6);
    oval(g, b.x + 120, front - 26, 8, 5, '#efe6cf', 0.6);
  }
  if (b.kind === 'kola' && !built('kola')) {
    for (let k = 0; k < 3; k++) drawClothShade(g, b.x + 40 + k * 90, front - 34, 60, 18, tint(['#e0572b', OG.indigo, '#13703a'][k]!, tired), tired ? '#d9cfbf' : '#f6e9cc');
  }
  if (b.spot === 'slowInternet') {
    const s = b.boxes[0]!;
    mast(g, s.x + s.w * 0.6, s.y - s.h + s.d * 0.5, look);
    if (look === 'fixed' && !tired) {
      // The factories are busy: a truck at the loading door and workers in plain shirts
      drawOgunTruck(g, b.x + b.w * 0.5, front - 22, 'e', 'lorry', false, 1);
      for (let k = 0; k < 6; k++) drawCityFolk(g, b.x + 24 + k * 22, front - 4 - (k % 2) * 5, k + 5);
    }
    if (look !== 'fixed') {
      g.fillStyle = OG.dim;
      g.fillRect(b.x, b.y - 34, b.w, b.d + 34);
      mast(g, s.x + s.w * 0.6, s.y - s.h + s.d * 0.5, look);
      if (look === 'ready') toolsWaiting(g, b.x + 40, front - 10);
    }
  }
  if (b.kind === 'shops' || b.kind === 'yards') {
    drawCityTree(g, b.x + b.w - 22, front - 8, 9, tired);
    drawCityLamp(g, b.x + 12, front - 3, !tired);
    const n = tired ? 1 : 4;
    for (let k = 0; k < n; k++) drawCityFolk(g, b.x + 30 + ((k + 0.5) * (b.w - 60)) / n, front - 3 - (k % 2) * 6, k * 2 + b.x);
  }
}

/** The whole still Ogun city in map units: the ground, every spot, then every block back to front. */
export function drawOgunCity(g: G, looks: OgunSpotLooks = OGUN_START_LOOKS, opts: OgunCityOpts = {}): void {
  g.save();
  drawOgunGround(g, looks, opts);
  for (const b of OGUN_BLOCKS) drawOgunBlock(g, b, b.spot ? looks[b.spot] : 'fixed', opts);
  g.restore();
}

/** Paints the still Ogun city once (as Lagos's makeCityCanvas): `scale` px a map unit, at most maxPx wide. Null without a document. */
export function makeOgunCityCanvas(looks: OgunSpotLooks = OGUN_START_LOOKS, scale = 1, maxPx = 2048, opts: OgunCityOpts = {}): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const s = Math.max(0.1, Math.min(Number.isFinite(scale) ? scale : 1, maxPx / CITY_MAP.w));
  const c = document.createElement('canvas');
  c.width = Math.ceil(CITY_MAP.w * s);
  c.height = Math.ceil(CITY_MAP.h * s);
  const cg = c.getContext('2d');
  if (!cg) return null;
  cg.scale(s, s);
  drawOgunCity(cg, looks, opts);
  return c;
}

// ---------- Pins (screen px, as Lagos's PIN sizes) ----------

/** A spot's icon centred on (x, y), about 24 across. Potholes, lamps and the mast are Lagos's; dry taps and the gateway are Ogun's. */
export function drawOgunSpotIcon(g: G, spot: OgunSpotId, x: number, y: number): void {
  if (spot === 'potholes' || spot === 'lightsOut' || spot === 'slowInternet') return drawSpotIcon(g, spot, x, y);
  if (spot === 'dryTaps') {
    // A tap with no water and an empty bucket under it
    line(g, '#5d6670', 3, [x - 9, y - 6, x + 2, y - 6, x + 2, y - 1]);
    rect(g, x - 2, y - 11, 7, 3, '#5d6670', 0.8);
    line(g, INK, 1, [x - 2, y + 1, x + 6, y + 1]);
    poly(g, [x - 5, y + 3, x + 9, y + 3, x + 7, y + 11, x - 3, y + 11], WHITE, 1);
    line(g, INK, 1.2, [x + 6, y - 4, x + 11, y - 9]);
    line(g, INK, 1.2, [x + 6, y - 9, x + 11, y - 4]);
  } else {
    // The little arch over a cracked road
    rect(g, x - 11, y + 2, 22, 9, '#5b5b62', 1);
    line(g, '#2a1f17', 1.4, [x - 6, y + 3, x - 2, y + 7, x - 5, y + 10]);
    oval(g, x + 5, y + 7, 3.4, 1.8, '#2a1f17');
    drawMiniArch(g, x, y + 2, 0.5, false);
  }
}

/** The tap area round an Ogun pin at (x, y): at least 48 x 56 (the same as Lagos's pins). */
export const ogunPinHitBox = pinHitBox;

/**
 * An Ogun pin standing at (x, y), screen px: a round sign with the spot's icon, a stem and its word
 * on a cream tag (as Lagos's drawProblemPin). 'ready': a tick badge and "Ready". `bob` 0 to 2 px (0 with reduced motion).
 */
export function drawOgunPin(g: G, x: number, y: number, spot: OgunSpotId, state: 'problem' | 'ready' = 'problem', bob = 0): void {
  const b = Number.isFinite(bob) ? Math.max(0, Math.min(4, bob)) : 0;
  g.save();
  oval(g, x, y, 9, 3, 'rgba(0,0,0,0.25)');
  g.translate(x, y - b);
  line(g, INK, 2.5, [0, 0, 0, -PIN.stem]);
  const word = state === 'ready' ? 'Ready' : OGUN_SPOT_WORDS[spot];
  g.font = PIN.word;
  const m = typeof g.measureText === 'function' ? g.measureText(word)?.width : undefined;
  const tw = Math.max(40, (typeof m === 'number' && Number.isFinite(m) ? m : word.length * 7) + 12);
  const tagY = -PIN.stem - PIN.tagH;
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-tw / 2, tagY, tw, PIN.tagH, 5);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(word, 0, tagY + PIN.tagH / 2 + 0.5);
  const cy = tagY - 2 - PIN.r;
  disc(g, 0, cy, PIN.r, WHITE);
  g.strokeStyle = state === 'ready' ? '#13703a' : '#b4561c';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, cy, PIN.r - 1.5, 0, TAU);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, cy, PIN.r, 0, TAU);
  g.stroke();
  drawOgunSpotIcon(g, spot, 0, cy);
  if (state === 'ready') {
    disc(g, 13, cy - 13, 8, '#22a85a');
    g.strokeStyle = INK;
    g.beginPath();
    g.arc(13, cy - 13, 8, 0, TAU);
    g.stroke();
    line(g, WHITE, 2.4, [9, cy - 13, 12, cy - 10, 17, cy - 16]);
  }
  g.restore();
}

/** The border market's coming-soon icon (for Lagos's coming-soon pin look): a stall shade over sacks and cloth. */
export function drawBorderIcon(g: G, x: number, y: number): void {
  rect(g, x - 11, y - 9, 22, 6, OG.indigo, 1);
  g.fillStyle = WHITE;
  for (let k = -9; k < 11; k += 5) g.fillRect(x + k, y - 9, 2, 6);
  line(g, '#6b4a2b', 1.4, [x - 9, y - 3, x - 9, y + 10]);
  line(g, '#6b4a2b', 1.4, [x + 9, y - 3, x + 9, y + 10]);
  oval(g, x - 3, y + 6, 4.4, 4, '#efe6cf', 0.8);
  rect(g, x + 2, y + 4, 6, 6, '#e0572b', 0.8);
}
