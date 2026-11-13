/**
 * Lagos from above (docs/city.md part 5 (b), slice 3 step S3b1): our own model-town view of
 * the area around Ikeja, seen from the south at an angle. Each block shows its roof (top) and
 * its front wall; roads run across and up the map; the lagoon lies along the bottom with a
 * ferry jetty and one of our own bridges running off the map. Not a diamond grid of plots: the
 * blocks are fixed spots of different sizes, set on Lagos-like roads (city.md part 6 rule 2).
 * No castles, troops, build clocks or timers. No real building, bridge, brand, government
 * building, flag or party colour.
 *
 * Map units: the map is CITY_MAP.w x CITY_MAP.h (1600 x 1000). Everything here draws in map
 * units; the camera (gamedev) translates and scales.
 *
 * Light on a cheap phone: drawCity paints the whole still city (ground, roads, lagoon, every
 * block). Call it once into an offscreen canvas (makeCityCanvas does this) and copy that
 * picture each time the camera moves; paint it again only when a spot's look changes.
 * Pins (they bob) and moving buses are drawn on top each frame: both are a handful of shapes.
 *
 * The three problem spots each have three looks (SpotLook): 'problem' (dim, broken), 'ready'
 * (the tools are waiting: there is enough in the bucket) and 'fixed' (lit and busy).
 * Never colour alone: the pins carry an icon and a word, and each look changes shapes too
 * (holes and cones, dark lamp heads, a single signal bar; tools waiting; lamps with light
 * pools, fresh lane paint, signal arcs and people).
 *
 * Tired and bright Lagos (city.md (d), S3d1a). gamedev works out the bright set (d3) and passes
 * it in; art only draws it:
 *   makeCityCanvas(looks, scale, maxPx, { bright: ['r0c0', 'busPark', ...], boom, market, jetty })
 *   - bright: ids from CITY_AREAS (12 blocks, 'busPark', 'shore'); the rest is tired.
 *     Left out: everything bright (the look before S3d1).
 *   - boom: the first boom's flats on r1c1, the long bus shelter and a 4th danfo (jetty stays `jetty`).
 *   - the colour ring: paint a before and an after picture and clip the after one to the ring.
 *   - the flats growing: paint the after picture with { boom: true, flats: false } and draw
 *     drawBoomFlats(g, k) on top (map units), then repaint with { boom: true } at the end.
 *   Coming-soon pins: drawComingSoonPin, SOON_PINS. The meter is src/art/boomMeter.ts.
 */
import {
  BLOCK_LIFE,
  GOODS_KINDS,
  TIRED_COLOURS,
  drawChildrenWithBall,
  drawCityFolk,
  drawCityPalm,
  drawCityTree,
  drawFoldedUmbrella,
  drawFruitUmbrella,
  drawGoods,
  drawKerbSack,
  drawPottedPlant,
  drawProudFolk,
  drawShutter,
  drawWashingLine,
  brightColour,
  fadeColour,
  tiredColour,
  tiredRoof,
  type BlockLife,
} from './bright';
import { CAR_COLOURS, CREAM, INK, KOBO, KOBO_DARK, KOBO_SHINE, SHOP_WALLS, WHITE } from './palette';

export { drawCityFolk } from './bright';

const TAU = Math.PI * 2;

export const CITY_MAP = { w: 1600, h: 1000 } as const;

export type SpotId = 'potholes' | 'lightsOut' | 'slowInternet';
export type SpotLook = 'problem' | 'ready' | 'fixed';
export const SPOT_IDS: readonly SpotId[] = ['potholes', 'lightsOut', 'slowInternet'];
export const SPOT_LOOKS: readonly SpotLook[] = ['problem', 'ready', 'fixed'];
export type SpotLooks = Record<SpotId, SpotLook>;

/** The words on each pin (city.md part 5 (b)). */
export const SPOT_WORDS: Record<SpotId, string> = { potholes: 'Potholes', lightsOut: 'Lights out', slowInternet: 'Slow internet' };

/** City colours (our palette, seen from above). */
export const CITY_COLOURS = {
  land: '#eadfc4',
  grass: '#bcd88a',
  grassDark: '#8fb866',
  lot: '#f3ead3',
  kerb: '#c9b994',
  road: '#5b5b62',
  roadEdge: '#d8c27a',
  roadLine: '#f4f1e6',
  freshRoad: '#3f3f46',
  water: '#5fb3c9',
  waterDeep: '#4a9fb8',
  wave: '#bfe6f0',
  sand: '#f1dfb0',
  glass: '#cfe9f5',
  window: '#ffe08a',
  windowDark: '#5f6670',
  dim: 'rgba(38,40,78,0.38)',
  lampOn: '#ffe27a',
  lampOff: '#4a4a4a',
  wood: '#9a6a3c',
} as const;
const K = CITY_COLOURS;

// ---------- Layout ----------

export interface CityBox {
  /** Footprint on the ground (map units): x, y is its back left corner. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Height: the roof is drawn h units up the screen. */
  h: number;
  wall: string;
  roof: string;
  tank: boolean;
}

export interface CityBlock {
  id: string;
  /** The lot (pavement) on the ground. */
  x: number;
  y: number;
  w: number;
  d: number;
  boxes: readonly CityBox[];
  /** A problem spot on this block, if any. */
  spot?: SpotId;
  /** A market (umbrella stalls in front) or a park (grass, trees, a small pitch); else buildings. */
  kind?: 'market' | 'park';
}

export interface CitySpot {
  id: SpotId;
  /** Where the pin stands (map units, its foot). */
  pin: { x: number; y: number };
  /** The area to centre on (double tap, Mission complete). */
  focus: { x: number; y: number; w: number; h: number };
  /** The block it belongs to, or null for a road spot. */
  block: string | null;
}

/** Roads: [x, y, w, h] on the map. */
const H_ROADS: readonly (readonly [number, number])[] = [
  [92, 120], // far road at the top
  [282, 320], // the street between rows 1 and 2
  [522, 596], // the main road (two lanes each way)
  [802, 834], // the shore road
];
const V_ROADS: readonly (readonly [number, number])[] = [
  [70, 132], // Alausa road (left)
  [470, 506],
  [792, 850], // the middle avenue
  [1130, 1166],
  [1480, 1520],
];
const ROWS: readonly (readonly [number, number])[] = [
  [120, 282],
  [320, 522],
  [596, 802],
];
const COLS: readonly (readonly [number, number])[] = [
  [132, 470],
  [506, 792],
  [850, 1130],
  [1166, 1480],
];
/** The bus park in the middle, south of the main road. */
export const BUS_PARK = { x: 762, y: 596, w: 118, h: 206 } as const;
export const LAGOON_Y = 862;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A roof colour: the wall mixed a third of the way to white. */
function lighter(hex: string, k = 0.38): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number): string => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function makeBoxes(seed: number, x: number, y: number, w: number, d: number, tall: number): CityBox[] {
  const ix = x + 14;
  const iy = y + 12;
  const iw = w - 28;
  const id = d - 40; // room in front for the pavement, lamps and people
  const n = iw > 260 ? 3 : 2;
  const out: CityBox[] = [];
  let at = ix;
  for (let k = 0; k < n; k++) {
    const share = k === n - 1 ? ix + iw - at : Math.round((iw / n) * (0.8 + hash(seed * 7 + k) * 0.4));
    const deep = hash(seed * 3 + k) > 0.45 ? id : Math.round(id * 0.62);
    const wall = SHOP_WALLS[(seed * 3 + k * 5) % SHOP_WALLS.length]!;
    out.push({
      x: at + 4,
      y: iy,
      w: share - 8,
      d: deep,
      h: Math.round(24 + hash(seed * 11 + k) * tall),
      wall,
      roof: lighter(wall),
      tank: hash(seed * 13 + k) > 0.35,
    });
    at += share;
  }
  return out;
}

function makeBlocks(): CityBlock[] {
  const blocks: CityBlock[] = [];
  ROWS.forEach(([y0, y1], r) => {
    COLS.forEach(([x0, x1], c) => {
      let x = x0 + 8;
      let w = x1 - x0 - 16;
      // The bus park takes the middle of the bottom row
      if (r === 2 && c === 1) w = BUS_PARK.x - 8 - x;
      if (r === 2 && c === 2) {
        x = BUS_PARK.x + BUS_PARK.w + 8;
        w = x1 - 8 - x;
      }
      const id = `r${r}c${c}`;
      const seed = r * 4 + c + 1;
      const spot: SpotId | undefined = id === 'r2c1' ? 'lightsOut' : id === 'r1c3' ? 'slowInternet' : undefined;
      const tall = r === 1 ? 74 : r === 0 ? 60 : 50;
      const kind = id === 'r2c3' ? 'market' : id === 'r0c2' ? 'park' : undefined;
      const d = y1 - y0 - 16;
      let boxes = makeBoxes(seed, x, y0 + 8, w, d, spot === 'lightsOut' ? 30 : tall);
      // A market keeps a shallow row of shops at the back; a park has one small kiosk
      if (kind === 'market') boxes = boxes.map((q) => ({ ...q, d: Math.round(d * 0.32), h: Math.min(q.h, 46) }));
      if (kind === 'park') boxes = [{ ...boxes[0]!, w: 46, d: 30, h: 18, tank: false }];
      const block: CityBlock = { id, x, y: y0 + 8, w, d, boxes };
      if (spot) block.spot = spot;
      if (kind) block.kind = kind;
      blocks.push(block);
    });
  });
  return blocks;
}

/** The 12 blocks, 3 rows of 4, back row first (the order to draw them). */
export const CITY_BLOCKS: readonly CityBlock[] = makeBlocks();

/** The three problem spots of slice 3 and where their pins stand. */
export const CITY_SPOTS: Record<SpotId, CitySpot> = {
  potholes: { id: 'potholes', pin: { x: 101, y: 430 }, focus: { x: 40, y: 330, w: 130, h: 190 }, block: null },
  lightsOut: { id: 'lightsOut', pin: { x: 640, y: 760 }, focus: { x: 506, y: 596, w: 380, h: 206 }, block: 'r2c1' },
  slowInternet: { id: 'slowInternet', pin: { x: 1300, y: 486 }, focus: { x: 1166, y: 320, w: 314, h: 202 }, block: 'r1c3' },
};

/** Lanes the buses use (map units): along x (dir 'e' or 'w') at y, or along y ('n' or 's') at x. */
export const CITY_BUS_LANES = [
  { dir: 'e', y: 548, from: 0, to: CITY_MAP.w },
  { dir: 'w', y: 576, from: CITY_MAP.w, to: 0 },
  { dir: 's', x: 810, from: 0, to: 600 },
  { dir: 'n', x: 834, from: 600, to: 0 },
  { dir: 'e', y: 818, from: 0, to: CITY_MAP.w },
] as const;

// ---------- Small helpers ----------

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge?: string, ew = 1): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = ew;
    g.strokeRect(x, y, w, h);
  }
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

function stroke(g: CanvasRenderingContext2D, colour: string, w: number, pts: readonly number[]): void {
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

function tree(g: CanvasRenderingContext2D, x: number, y: number, r: number, tired = false): void {
  drawCityTree(g, x, y, r, tired);
}

/** A street lamp standing at (x, y), 33 units tall, head to the right. On: a warm head and a light pool. */
export function drawCityLamp(g: CanvasRenderingContext2D, x0: number, y0: number, on: boolean): void {
  g.save();
  g.translate(x0, y0);
  g.scale(1.5, 1.5);
  const x = 0;
  const y = 0;
  if (on) oval(g, x + 5, y + 2, 13, 5, 'rgba(255,226,122,0.45)');
  stroke(g, '#5d6670', 2, [x, y, x, y - 22, x + 5, y - 22]);
  oval(g, x + 6, y - 22, 4, 2.2, on ? K.lampOn : K.lampOff);
  if (on) disc(g, x + 6, y - 22, 6, 'rgba(255,226,122,0.35)');
  else stroke(g, INK, 0.8, [x + 3, y - 20.5, x + 9, y - 20.5]);
  g.restore();
}

// ---------- Ground: land, roads, lagoon, jetty, bridge, bus park ----------

function road(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, along: 'x' | 'y', lanes: boolean): void {
  rect(g, x, y, w, h, K.road);
  g.fillStyle = K.roadEdge;
  if (along === 'x') {
    g.fillRect(x, y, w, 2);
    g.fillRect(x, y + h - 2, w, 2);
  } else {
    g.fillRect(x, y, 2, h);
    g.fillRect(x + w - 2, y, 2, h);
  }
  if (!lanes) return;
  g.fillStyle = K.roadLine;
  if (along === 'x') for (let xx = x + 10; xx < x + w - 16; xx += 40) g.fillRect(xx, y + h / 2 - 1.5, 20, 3);
  else for (let yy = y + 10; yy < y + h - 16; yy += 40) g.fillRect(x + w / 2 - 1.5, yy, 3, 20);
}

/** Zebra crossing across a road. */
function zebra(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, along: 'x' | 'y'): void {
  g.fillStyle = 'rgba(244,241,230,0.85)';
  if (along === 'x') for (let xx = x; xx < x + w; xx += 8) g.fillRect(xx, y, 4, h);
  else for (let yy = y; yy < y + h; yy += 8) g.fillRect(x, yy, w, 4);
}

function lagoon(g: CanvasRenderingContext2D): void {
  const W = CITY_MAP.w;
  // Sand edge, then water with a soft wavy shore
  rect(g, 0, 834, W, 30, K.sand);
  g.fillStyle = K.water;
  g.beginPath();
  g.moveTo(0, LAGOON_Y);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, LAGOON_Y + Math.sin(x * 0.013) * 5);
  g.lineTo(W, CITY_MAP.h);
  g.lineTo(0, CITY_MAP.h);
  g.closePath();
  g.fill();
  rect(g, 0, 940, W, 60, K.waterDeep);
  g.fillStyle = K.wave;
  for (let i = 0; i < 40; i++) {
    const x = hash(i + 40) * W;
    const y = 880 + hash(i + 90) * 110;
    g.fillRect(x, y, 16 + hash(i) * 18, 2);
  }
}

/** Our own bridge: a plain concrete deck on round piers, leaving the map to the south east. */
function bridge(g: CanvasRenderingContext2D): void {
  const x0 = 1300;
  const y0 = 834;
  const dx = 240;
  const dy = CITY_MAP.h - y0 + 30;
  // Piers
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    const px = x0 + dx * t + 20;
    const py = y0 + dy * t;
    oval(g, px, py + 18, 9, 3, 'rgba(0,0,0,0.18)');
    rect(g, px - 6, py, 12, 18, '#c8bfae', INK, 0.8);
  }
  // Deck
  g.fillStyle = '#d9d2c3';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + 44, y0);
  g.lineTo(x0 + 44 + dx, y0 + dy);
  g.lineTo(x0 + dx, y0 + dy);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = K.road;
  g.beginPath();
  g.moveTo(x0 + 6, y0);
  g.lineTo(x0 + 38, y0);
  g.lineTo(x0 + 38 + dx, y0 + dy);
  g.lineTo(x0 + 6 + dx, y0 + dy);
  g.closePath();
  g.fill();
  stroke(g, K.roadLine, 1.5, [x0 + 22, y0 + 4, x0 + 22 + dx, y0 + dy]);
  // Front edge (side face of the deck)
  g.fillStyle = '#b5ab98';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + dx, y0 + dy);
  g.lineTo(x0 + dx, y0 + dy + 7);
  g.lineTo(x0, y0 + 7);
  g.closePath();
  g.fill();
}

/** The ferry jetty: a wooden walkway on posts with a small shade roof and a plain ferry. */
export function drawJetty(g: CanvasRenderingContext2D, x: number, y: number): void {
  // Posts and planks
  for (let k = 0; k < 4; k++) {
    rect(g, x + 2, y + 18 + k * 22, 4, 10, '#6b4a2b');
    rect(g, x + 30, y + 18 + k * 22, 4, 10, '#6b4a2b');
  }
  rect(g, x, y, 36, 96, K.wood, INK, 1);
  g.fillStyle = '#b8864f';
  for (let yy = y + 4; yy < y + 96; yy += 6) g.fillRect(x + 1, yy, 34, 2);
  // Shade roof at the end
  rect(g, x - 4, y + 66, 44, 24, '#4f7cac', INK, 1);
  rect(g, x - 4, y + 90, 44, 4, '#3d6690');
  // The ferry: white hull, blue shade, no name and no colours of anyone
  const fx = x + 44;
  const fy = y + 70;
  g.fillStyle = WHITE;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(fx, fy);
  g.lineTo(fx + 70, fy);
  g.quadraticCurveTo(fx + 86, fy + 10, fx + 70, fy + 20);
  g.lineTo(fx, fy + 20);
  g.closePath();
  g.fill();
  g.stroke();
  rect(g, fx, fy + 20, 70, 6, '#e5e1d6', INK, 0.8);
  rect(g, fx + 8, fy - 12, 50, 12, '#7fd6ff', INK, 0.8);
  g.fillStyle = K.glass;
  for (let k = 0; k < 4; k++) g.fillRect(fx + 12 + k * 12, fy - 9, 8, 6);
  g.fillStyle = K.wave;
  g.fillRect(fx - 6, fy + 28, 90, 2);
}

/**
 * The bus park in the middle: a tarmac yard with bays and a shelter by the main road.
 * Tired (d2): faded lane paint and one faded parked danfo. Bright: fresh paint, 3 parked
 * danfos and 4 people waiting. Boom (d4): a long bus shelter (roof on posts, a bench, 3 people
 * waiting) by the shore road and a 4th danfo.
 */
function busPark(g: CanvasRenderingContext2D, bright: boolean, boom: boolean): void {
  const { x, y, w, h } = BUS_PARK;
  rect(g, x, y, w, h, bright ? '#6a6a71' : fadeColour('#6a6a71', TIRED_COLOURS.roadDust));
  g.fillStyle = bright ? 'rgba(244,241,230,0.85)' : 'rgba(244,241,230,0.28)';
  for (let k = 0; k < 4; k++) g.fillRect(x + 8, y + 60 + k * 36, w - 16, 2);
  // Shelter by the main road
  const post = bright ? '#7d8a96' : fadeColour('#7d8a96');
  rect(g, x + 10, y + 8, 4, 18, post);
  rect(g, x + w - 14, y + 8, 4, 18, post);
  rect(g, x + 6, y + 2, w - 12, 10, bright ? '#4f7cac' : fadeColour('#4f7cac'), INK, 1);
  rect(g, x + 16, y + 20, w - 32, 4, '#8a5d36');
  if (!bright) {
    // One faded danfo waiting for the day
    drawCityBus(g, x + 36, y + 92, 's', true);
    return;
  }
  drawCityBus(g, x + 36, y + 92, 's');
  drawCityBus(g, x + 82, y + 128, 's');
  drawCityBus(g, x + 82, y + 64, 's');
  // 4 people waiting under the shelter
  for (let k = 0; k < 4; k++) drawCityFolk(g, x + 20 + k * 11 + (k > 1 ? 40 : 0), y + 30 + (k % 2) * 3, k * 2 + 1);
  if (!boom) return;
  drawCityBus(g, x + 36, y + 160, 's');
  drawBusShelter(g, x + 8, y + h - 24, w - 16);
}

/** The long bus shelter of the first boom: a roof on four posts, a bench and 3 people waiting. */
export function drawBusShelter(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  oval(g, x + w / 2 + 4, y + 20, w / 2, 3, 'rgba(0,0,0,0.15)');
  for (let k = 0; k < 4; k++) rect(g, x + 3 + (k * (w - 9)) / 3, y + 6, 3, 14, '#7d8a96');
  rect(g, x + 8, y + 13, w - 16, 3, '#9a6a3c', INK, 0.6);
  for (let k = 0; k < 3; k++) drawCityFolk(g, x + 16 + k * 14, y + 16, k * 3 + 2);
  rect(g, x, y, w, 7, '#2f8f86', INK, 1);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x + 2, y + 1.5, w - 4, 1.5);
}

/**
 * The roads, lots, trees, lagoon, jetty, bridge and bus park: everything but the blocks.
 * `opts.bright` (see CityOpts) picks the bus park's and the shore's look.
 */
export function drawCityGround(g: CanvasRenderingContext2D, opts: CityOpts = {}): void {
  const W = CITY_MAP.w;
  rect(g, 0, 0, W, CITY_MAP.h, K.land);
  // A park strip at the top, with trees (more of Lagos lies beyond)
  rect(g, 0, 0, W, 92, K.grass);
  for (let i = 0; i < 22; i++) tree(g, 30 + i * 74 + hash(i) * 30, 30 + hash(i + 5) * 50, 10 + hash(i + 9) * 5);
  for (const [y0, y1] of H_ROADS) road(g, 0, y0, W, y1 - y0, 'x', y1 - y0 > 50);
  for (const [x0, x1] of V_ROADS) road(g, x0, 92, x1 - x0, 742, 'y', x1 - x0 > 50);
  // Crossings where the main roads meet
  zebra(g, 140, 524, 10, 70, 'y');
  zebra(g, 760, 524, 10, 70, 'y');
  zebra(g, 860, 524, 10, 70, 'y');
  zebra(g, 794, 498, 54, 10, 'x');
  busPark(g, areaBright(opts, 'busPark'), opts.boom === true);
  lagoon(g);
  const shore = areaBright(opts, 'shore');
  // The shore road's kerb: fresh white and grey stones when bright
  if (shore) for (let x = 0; x < W; x += 12) rect(g, x, 834, 10, 3, x % 24 === 0 ? WHITE : '#d9d2c3');
  // Palms along the shore promenade
  for (let x = 30; x < W; x += 110) if (x < 380 || x > 480) drawCityPalm(g, x, 852, !shore);
  if (opts.jetty !== false) drawJetty(g, 410, 838);
  bridge(g);
}

// ---------- Blocks ----------

const AWNINGS = ['#c8641e', '#2b59c3', '#13703a', '#9b59b6', '#b4561c'] as const;

/** How a box is drawn: tired (faded, dark windows), its shutter, flats (0 to 1 of the boom's 3 floors), its shadow. */
interface BoxLook {
  tired?: boolean;
  shutter?: 'down' | 'half' | 'up' | 'none';
  flats?: number;
  shadow?: boolean;
}

/** The first boom's new flats (d4): on r1c1's back box, 3 more floors (48 map units). */
export const FLATS = { block: 'r1c1', rise: 48 } as const;

function drawBox(g: CanvasRenderingContext2D, b: CityBox, lit: 'day' | 'dim' | 'glow', o: BoxLook = {}): void {
  const flats = o.flats !== undefined && Number.isFinite(o.flats) ? Math.max(0, Math.min(1, o.flats)) : 0;
  const h = b.h + FLATS.rise * flats;
  const tired = o.tired === true;
  const top = b.y - h;
  const frontY = b.y + b.d - h;
  if (o.shadow !== false) {
    // Shadow on the ground to the east
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath();
    g.moveTo(b.x + b.w, b.y + b.d);
    g.lineTo(b.x + b.w + h * 0.35, b.y + b.d);
    g.lineTo(b.x + b.w + h * 0.35, b.y + b.d - h * 0.5);
    g.lineTo(b.x + b.w, frontY);
    g.closePath();
    g.fill();
  }
  // Front wall
  rect(g, b.x, frontY, b.w, h, tired ? tiredColour(b.wall) : brightColour(b.wall), INK, 1.2);
  // Windows, a row every 12 units; the ground floor is a shop front with an awning.
  // Tired day: 2 of every 3 windows warm brown, no glint. Bright day: glass with a white glint.
  const win = lit === 'dim' ? K.windowDark : lit === 'glow' ? K.window : K.glass;
  const spots: [number, number][] = [];
  for (let yy = frontY + 6; yy < b.y + b.d - 18; yy += 12) for (let xx = b.x + 5; xx < b.x + b.w - 8; xx += 11) spots.push([xx, yy]);
  const brown = tired && lit === 'day';
  g.fillStyle = win;
  spots.forEach(([xx, yy], k) => {
    if (!brown || k % 3 === 2) g.fillRect(xx, yy, 6, 6);
  });
  if (brown) {
    g.fillStyle = TIRED_COLOURS.window;
    spots.forEach(([xx, yy], k) => {
      if (k % 3 !== 2) g.fillRect(xx, yy, 6, 6);
    });
  } else if (lit === 'day') {
    g.fillStyle = WHITE;
    for (const [xx, yy] of spots) g.fillRect(xx + 1, yy + 1, 3, 1);
  }
  if (flats > 0) {
    // Balconies with plants on the new floors
    for (const [xx, yy] of spots) {
      if (yy > frontY + FLATS.rise * flats) continue;
      rect(g, xx - 1, yy + 6, 8, 1.6, '#e9e1cf', INK, 0.4);
      disc(g, xx + 5.5, yy + 5.4, 1.5, '#3f8f4a');
    }
  }
  if (b.h > 20) {
    const awn = AWNINGS[Math.floor(b.x / 7) % AWNINGS.length]!;
    rect(g, b.x + 2, b.y + b.d - 13, b.w - 4, 4, tired ? tiredColour(awn) : brightColour(awn));
    g.fillStyle = win;
    g.fillRect(b.x + 6, b.y + b.d - 8, Math.max(4, b.w - 22), 7);
    if (o.shutter && o.shutter !== 'none') drawShutter(g, b.x + 5, b.y + b.d - 9, Math.max(5, b.w - 20), 9, o.shutter);
    rect(g, b.x + b.w - 12, b.y + b.d - 9, 6, 9, '#5b4636');
  }
  // Roof
  rect(g, b.x, top, b.w, b.d, tired ? tiredRoof(b.roof) : brightColour(b.roof), INK, 1.2);
  g.strokeStyle = 'rgba(29,26,20,0.18)';
  g.lineWidth = 1;
  g.strokeRect(b.x + 4, top + 4, b.w - 8, b.d - 8);
  const tanks = flats > 0 ? [b.x + 14, b.x + b.w - 14] : b.tank ? [b.x + b.w - 14] : [];
  for (const tx of tanks) {
    // A rooftop water tank
    const ty = top + 12;
    rect(g, tx - 6, ty - 8, 12, 8, '#3b4f6b');
    oval(g, tx, ty - 8, 6, 2.5, '#5a7396');
    oval(g, tx, ty, 6, 2.5, '#3b4f6b');
  }
}

/** The street lamps of the lights-out block, along its front pavement. */
function lampXs(b: CityBlock): number[] {
  const out: number[] = [];
  for (let x = b.x + 20; x < b.x + b.w - 10; x += 60) out.push(x);
  return out;
}

/** The phone mast on the slow-internet block: a lattice tower on the biggest roof. */
function mastAt(b: CityBlock): { x: number; y: number } {
  const big = [...b.boxes].sort((p, q) => q.w * q.d - p.w * p.d)[0]!;
  return { x: big.x + big.w * 0.35, y: big.y - big.h + big.d * 0.55 };
}

function drawMast(g: CanvasRenderingContext2D, x: number, y: number, look: SpotLook): void {
  const top = y - 52;
  stroke(g, '#7d8a96', 2, [x - 8, y, x, top, x + 8, y]);
  g.strokeStyle = '#7d8a96';
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 1; k < 5; k++) {
    const yy = y - k * 10;
    const hw = 8 * (1 - (k * 10) / 52);
    g.moveTo(x - hw, yy);
    g.lineTo(x + hw, yy - 10);
    g.moveTo(x + hw, yy);
    g.lineTo(x - hw, yy - 10);
  }
  g.stroke();
  // Dishes on the tower
  rect(g, x - 6, top + 10, 4, 8, '#e5e1d6', INK, 0.6);
  rect(g, x + 2, top + 16, 4, 8, '#e5e1d6', INK, 0.6);
  // Signal bars beside it: one bar lit when slow, all four when fixed
  const bars = look === 'fixed' ? 4 : 1;
  for (let k = 0; k < 4; k++) {
    const bh = 5 + k * 4;
    rect(g, x + 14 + k * 6, top + 24 - bh, 4, bh, k < bars ? '#22a85a' : 'rgba(255,255,255,0.5)', INK, 0.7);
  }
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

/** Tools waiting, for a ready spot: a cable drum, a toolbox and two cones. */
function toolsWaiting(g: CanvasRenderingContext2D, x0: number, y0: number): void {
  g.save();
  g.translate(x0, y0);
  g.scale(1.7, 1.7);
  const x = 0;
  const y = 0;
  oval(g, x + 2, y + 1, 14, 4, 'rgba(0,0,0,0.15)');
  // Cable drum on its side
  oval(g, x - 6, y - 7, 6, 7, '#9a6a3c');
  oval(g, x - 4, y - 7, 6, 7, '#b8864f');
  oval(g, x - 4, y - 7, 2.5, 3, '#6b4a2b');
  // Toolbox
  rect(g, x + 4, y - 7, 11, 7, '#e0572b', INK, 0.8);
  stroke(g, INK, 1, [x + 7, y - 7, x + 7, y - 10, x + 12, y - 10, x + 12, y - 7]);
  cone(g, x + 20, y);
  cone(g, x - 16, y + 2);
  g.restore();
}

function cone(g: CanvasRenderingContext2D, x: number, y: number): void {
  rect(g, x - 4, y - 1.5, 8, 2, '#e0572b');
  g.fillStyle = '#f07a2b';
  g.beginPath();
  g.moveTo(x - 3, y - 1);
  g.lineTo(x, y - 11);
  g.lineTo(x + 3, y - 1);
  g.closePath();
  g.fill();
  g.fillStyle = WHITE;
  g.fillRect(x - 1.8, y - 6, 3.6, 1.6);
}

/**
 * Market umbrellas in rows in front of the shops (our umbrella colours, no writing). Tired: the
 * umbrellas are folded (closed poles) and nobody is at the stalls yet. Bright: open, with a
 * trader at every fifth stall (d2: 5 people with the proud one).
 */
function marketStalls(g: CanvasRenderingContext2D, b: CityBlock, front = true, bright = true): void {
  const cols = ['#f2b300', '#9b59b6', '#16a3b8', '#d63d6c', '#f39c12'];
  const y0 = b.y + Math.round(b.d * 0.32) + 34;
  // Without the front row: the Market's stall row (5W W3) stands there once it is built.
  const end = front ? b.y + b.d - 14 : b.y + b.d - 48;
  let i = 0;
  for (let y = y0; y < end; y += 34)
    for (let x = b.x + 30 + ((y - y0) % 68 ? 18 : 0); x < b.x + b.w - 24; x += 40) {
      oval(g, x + 3, y + 4, 14, 5, 'rgba(0,0,0,0.15)');
      rect(g, x - 9, y - 6, 18, 6, '#8a5d36');
      const c = cols[i++ % cols.length]!;
      if (!bright) {
        drawFoldedUmbrella(g, x, y, fadeColour(c));
        continue;
      }
      stroke(g, '#5d6670', 1.2, [x, y, x, y - 14]);
      oval(g, x, y - 16, 14, 6, c);
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(x, y - 16, 14, 6, 0, 0, TAU);
      g.moveTo(x - 14, y - 16);
      g.lineTo(x + 14, y - 16);
      g.moveTo(x, y - 22);
      g.lineTo(x, y - 10);
      g.stroke();
      if (i % 5 === 1) drawCityFolk(g, x + 12, y + 2, i);
    }
}

/** Is this area drawn bright? (No `bright` list: everything is bright, the look before S3d1.) */
export function areaBright(opts: CityOpts, id: string): boolean {
  return opts.bright === undefined || opts.bright.includes(id);
}

/** The shutter on box `idx` of a block (d2): down on every front but the open one when tired; rolled up when bright. */
function shutterFor(life: BlockLife | undefined, idx: number, tired: boolean): 'down' | 'half' | 'up' | 'none' {
  if (!life || life.shutters === 0) return 'none';
  const opener = life.proud === 'opener' && idx === life.open;
  if (tired) return opener ? 'half' : idx === life.open ? 'none' : 'down';
  return idx !== life.open || opener ? 'up' : 'none';
}

/** The r1c1 box that grows into flats at the first boom: its back box (the one whose front is furthest back). */
export function flatsBox(): CityBox {
  const b = CITY_BLOCKS.find((q) => q.id === FLATS.block)!;
  return [...b.boxes].sort((p, q) => p.y + p.d - (q.y + q.d) || q.w - p.w)[0]!;
}

/** Where the proud person of a block stands (feet), map units. */
export function proudSpot(b: CityBlock): { x: number; y: number } {
  const life = BLOCK_LIFE[b.id];
  if (b.kind === 'park') return { x: b.x + b.w * 0.5, y: b.y + b.d - 6 };
  if (b.kind === 'market' || !life || life.open < 0) return { x: b.x + 16, y: b.y + Math.round(b.d * 0.32) + 40 };
  const box = b.boxes[Math.min(life.open, b.boxes.length - 1)]!;
  return { x: box.x + box.w * 0.3, y: box.y + box.d + 10 };
}

/** Where a block's neat kerb sack stands when tired, or null (d2: none where food is sold or served). */
export function kerbSackSpot(b: CityBlock): { x: number; y: number } | null {
  const life = BLOCK_LIFE[b.id];
  if (!life || life.sacks === 0) return null;
  const idx = b.boxes.findIndex((_, k) => k !== life.open);
  const box = b.boxes[idx < 0 ? 0 : idx]!;
  return { x: box.x + box.w * 0.7, y: b.y + b.d - 4 };
}

/** The street lamp of an ordinary block (between its first two buildings). */
function blockLampX(b: CityBlock): number {
  return b.kind === 'park' ? b.x + 58 : b.boxes.length > 1 ? b.boxes[1]!.x - 4 : b.x + 10;
}

/**
 * One block. A block with a spot takes that spot's look; any other block ignores look.
 * `opts.bright` says whether it is tired or bright (d2); `opts.boom` adds the flats on r1c1.
 * Draw blocks in CITY_BLOCKS order (back row first).
 */
export function drawCityBlock(g: CanvasRenderingContext2D, b: CityBlock, look: SpotLook = 'fixed', opts: CityOpts = {}): void {
  const spot = b.spot;
  const bright = areaBright(opts, b.id);
  const tired = !bright;
  const life = BLOCK_LIFE[b.id];
  // The lot: pavement with a kerb and a little green (a little dustier when tired)
  rect(g, b.x, b.y, b.w, b.d, tired ? TIRED_COLOURS.lot : K.lot, tired ? TIRED_COLOURS.kerb : K.kerb, 1.5);
  const front = b.y + b.d;
  if (b.kind === 'park') {
    rect(g, b.x + 6, b.y + 6, b.w - 12, b.d - 12, tired ? fadeColour(K.grass, TIRED_COLOURS.grassFade) : K.grass);
    // A small football pitch
    const px = b.x + 80;
    const py = b.y + 34;
    const pw = b.w - 120;
    const ph = b.d - 70;
    g.fillStyle = tired ? fadeColour('#9ccc6a', TIRED_COLOURS.grassFade) : '#9ccc6a';
    g.fillRect(px, py, pw, ph);
    if (tired) {
      // Dry patches over about 60% of the grass (kept inside the grass)
      g.save();
      g.beginPath();
      g.rect(b.x + 6, b.y + 6, b.w - 12, b.d - 12);
      g.clip();
      for (let k = 0; k < 14; k++) {
        const rx = 16 + hash(k + 70) * 22;
        oval(g, b.x + 14 + hash(k + 50) * (b.w - 28), b.y + 14 + hash(k + 60) * (b.d - 28), rx, rx * 0.55, TIRED_COLOURS.dryGrass);
      }
      g.restore();
    }
    const lineCol = tired ? 'rgba(255,255,255,0.35)' : WHITE;
    g.strokeStyle = lineCol;
    g.lineWidth = 2;
    g.strokeRect(px, py, pw, ph);
    stroke(g, lineCol, 2, [px + pw / 2, py, px + pw / 2, py + ph]);
    g.strokeStyle = lineCol;
    g.beginPath();
    g.arc(px + pw / 2, py + ph / 2, 14, 0, TAU);
    g.stroke();
    for (let k = 0; k < 7; k++) tree(g, b.x + 22 + k * ((b.w - 44) / 6), k % 2 ? b.y + 26 : front - 10, 9 + (k % 3), tired);
    if (bright) drawChildrenWithBall(g, px + pw * 0.3, py + ph * 0.6, b.x);
  } else if (!spot) {
    tree(g, b.x + b.w - 22, front - 8, 9, tired);
    if (b.w > 300) tree(g, b.x + 24, front - 8, 8, tired);
  }
  const lit = spot === 'lightsOut' ? (look === 'fixed' ? 'glow' : 'dim') : spot === 'slowInternet' && look !== 'fixed' ? 'dim' : 'day';
  const fb = opts.boom === true && opts.flats !== false && b.id === FLATS.block ? flatsBox() : null;
  const boxes = [...b.boxes].sort((p, q) => p.y + p.d - (q.y + q.d));
  for (const box of boxes) drawBox(g, box, lit, { tired, shutter: b.kind ? 'none' : shutterFor(life, b.boxes.indexOf(box), tired), flats: box === fb ? 1 : 0 });
  if (b.kind === 'park') {
    // The kiosk: half open when tired, open with its counter when bright
    const k = b.boxes[0]!;
    const ky = k.y + k.d;
    rect(g, k.x + 6, ky - 13, k.w - 16, 8, '#5b4636');
    if (tired) drawShutter(g, k.x + 5, ky - 14, k.w - 14, 9, 'half');
    else {
      drawShutter(g, k.x + 5, ky - 14, k.w - 14, 9, 'up');
      rect(g, k.x + 5, ky - 6, k.w - 14, 2, CREAM, INK, 0.4);
      for (let q = 0; q < 4; q++) disc(g, k.x + 10 + q * 6, ky - 7, 1.4, q % 2 ? '#f39c12' : '#d8342a');
    }
  }
  if (b.kind === 'market') marketStalls(g, b, opts.market !== true, bright);
  if (!spot) drawCityLamp(g, blockLampX(b), front - 3, bright);
  if (spot === 'lightsOut' && look === 'fixed') for (const x of lampXs(b)) drawCityLamp(g, x, front - 6, true);
  if (spot === 'slowInternet' && look === 'fixed') {
    const m = mastAt(b);
    drawMast(g, m.x, m.y, look);
    // Shop screens lit along the front: a busy phone market street, made-up signs only
    for (let x = b.x + 16; x < b.x + b.w - 20; x += 34) rect(g, x, front - 20, 22, 8, '#7fe0ff', INK, 0.8);
  }
  if (life && !spot && b.kind !== 'park') {
    if (tired) {
      const sack = kerbSackSpot(b);
      if (sack) drawKerbSack(g, sack.x, sack.y);
    } else {
      if (!b.kind)
        b.boxes.forEach((box, k) => {
          if (box.h <= 20) return;
          drawGoods(g, box.x + box.w * 0.6, box.y + box.d + 7, GOODS_KINDS[(k + b.boxes.length) % GOODS_KINDS.length]!);
          if (life.extra === 'plants') {
            drawPottedPlant(g, box.x + box.w - 15, box.y + box.d + 4);
            drawPottedPlant(g, box.x + box.w - 3, box.y + box.d + 4);
          }
        });
      if (life.extra === 'fruit') drawFruitUmbrella(g, b.x + b.w * 0.24, front - 5, b.x + 3);
      if (life.extra === 'washing') {
        const big = [...b.boxes].sort((p, q) => q.w * q.d - p.w * p.d)[0]!;
        drawWashingLine(g, big.x + 8, big.x + big.w - 26, big.y - big.h + big.d * 0.5);
      }
      if (b.kind !== 'market') {
        // More people out on the pavement (the proud one is drawn below)
        const n = life.people - 1;
        for (let k = 0; k < n; k++) drawCityFolk(g, b.x + 14 + ((k + 0.5) * (b.w - 28)) / n + (k % 2) * 6, front - 3 - (k % 2) * 7, k * 2 + b.x);
      }
    }
  }
  if (spot && look !== 'fixed') {
    // Dim: the block waits for its fix
    g.fillStyle = K.dim;
    g.fillRect(b.x, Math.min(...b.boxes.map((q) => q.y - q.h)) - 4, b.w, front - Math.min(...b.boxes.map((q) => q.y - q.h)) + 4);
    // Lamps keep their shape on top of the dim, so "dark lamp" reads by shape too
    if (spot === 'lightsOut') for (const x of lampXs(b)) drawCityLamp(g, x, front - 6, false);
    if (spot === 'slowInternet') {
      const m = mastAt(b);
      drawMast(g, m.x, m.y, look);
    }
    if (look === 'ready') toolsWaiting(g, spot === 'lightsOut' ? b.x + b.w - 70 : b.x + 40, front - 10);
  }
  if (spot && tired) {
    const sack = kerbSackSpot(b);
    if (sack) drawKerbSack(g, sack.x, sack.y);
  }
  if (spot && look === 'fixed' && bright) {
    // People are back
    for (let k = 0; k < 9; k++) drawCityFolk(g, b.x + 18 + k * ((b.w - 36) / 8) + (k % 3) * 3, front - 3 - (k % 2) * 7, k + b.x);
  } else if (life) {
    // The proud person: there in both looks, never under the dim cover
    const p = proudSpot(b);
    drawProudFolk(g, p.x, p.y, life.proud, CITY_BLOCKS.indexOf(b) * 3 + 1);
  }
}

/**
 * The first boom's flats growing (d6 boom, 1.0 to 2.2 s): r1c1's back box drawn with `k` (0 to 1)
 * of its 3 new floors, then the box in front of it again so the flats stand behind it. Draw on
 * top of a still picture painted with `{ boom: true, flats: false }`; once grown, paint the
 * still picture again with `{ boom: true }`.
 */
export function drawBoomFlats(g: CanvasRenderingContext2D, k: number): void {
  const b = CITY_BLOCKS.find((q) => q.id === FLATS.block)!;
  const fb = flatsBox();
  const kk = Number.isFinite(k) ? Math.max(0, Math.min(1, k)) : 1;
  const life = BLOCK_LIFE[b.id];
  drawBox(g, fb, 'day', { flats: kk, shadow: false, shutter: shutterFor(life, b.boxes.indexOf(fb), false) });
  for (const box of b.boxes)
    if (box !== fb && box.y + box.d > fb.y + fb.d) drawBox(g, box, 'day', { shadow: false, shutter: shutterFor(life, b.boxes.indexOf(box), false) });
}

// ---------- The potholes spot (a road) ----------

/** The Alausa road spot, from y 330 to 510 on the left road. */
export function drawPotholeSpot(g: CanvasRenderingContext2D, look: SpotLook): void {
  const [x0, x1] = V_ROADS[0]!;
  const w = x1 - x0;
  const y0 = 330;
  const y1 = 512;
  if (look === 'fixed') {
    // Fresh tarmac, bright lane paint and new kerbs
    rect(g, x0, y0, w, y1 - y0, K.freshRoad);
    g.fillStyle = '#f5cf3a';
    g.fillRect(x0, y0, 3, y1 - y0);
    g.fillRect(x1 - 3, y0, 3, y1 - y0);
    g.fillStyle = WHITE;
    g.fillRect(x0 + 4, y0, 1.5, y1 - y0);
    g.fillRect(x1 - 5.5, y0, 1.5, y1 - y0);
    for (let y = y0 + 8; y < y1 - 20; y += 30) g.fillRect(x0 + w / 2 - 2, y, 4, 20);
    // Kerb blocks
    for (let y = y0; y < y1; y += 12) {
      rect(g, x0 - 5, y, 5, 10, y % 24 === 0 ? WHITE : '#d9d2c3');
      rect(g, x1, y, 5, 10, y % 24 === 0 ? WHITE : '#d9d2c3');
    }
    drawCityBus(g, x0 + w / 2 + 8, y0 + 120, 'n');
    return;
  }
  // Worn, cracked road with holes
  rect(g, x0 + 2, y0, w - 4, y1 - y0, '#666169');
  stroke(g, '#3a3530', 1.2, [x0 + 8, y0 + 20, x0 + 20, y0 + 34, x0 + 14, y0 + 48, x0 + 30, y0 + 62]);
  stroke(g, '#3a3530', 1.2, [x1 - 10, y0 + 100, x1 - 22, y0 + 116, x1 - 14, y0 + 130]);
  const holes: [number, number, number][] = [[x0 + 22, y0 + 40, 12], [x0 + 40, y0 + 88, 15], [x0 + 18, y0 + 140, 11]];
  for (const [hx, hy, r] of holes) {
    oval(g, hx, hy, r + 3, (r + 3) * 0.5, '#5c4a38');
    oval(g, hx, hy, r, r * 0.45, '#2a1f17');
    oval(g, hx + 2, hy + 1, r * 0.5, r * 0.2, '#5f8c92');
  }
  cone(g, x0 + 8, y0 + 64);
  cone(g, x1 - 8, y0 + 112);
  if (look === 'ready') {
    // Tarmac heap and a small road roller, ready to go
    g.fillStyle = '#26262b';
    g.beginPath();
    g.moveTo(x0 + 6, y1 - 20);
    g.quadraticCurveTo(x0 + 18, y1 - 38, x0 + 30, y1 - 20);
    g.closePath();
    g.fill();
    rect(g, x0 + 34, y1 - 40, 20, 12, '#f2b300', INK, 1);
    rect(g, x0 + 38, y1 - 50, 12, 10, '#f6c90e', INK, 1);
    oval(g, x0 + 44, y1 - 26, 12, 5, '#7d8a96');
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x0 + 44, y1 - 26, 12, 5, 0, 0, TAU);
    g.stroke();
  }
}

// ---------- The whole still city ----------

/** Default looks: every spot shows its problem. */
export const START_LOOKS: SpotLooks = { potholes: 'problem', lightsOut: 'problem', slowInternet: 'problem' };

/** Still-picture options: `jetty` false hides the ferry jetty; `market` true clears the market block's front umbrella row for the built Market (5W). */
export interface CityOpts {
  jetty?: boolean;
  market?: boolean;
  /**
   * Tired or bright Lagos (city.md (d), d2 and d3). The areas drawn bright: block ids
   * ('r0c0' ... 'r2c3'), 'busPark' and 'shore' (the shore road's kerbs and palms); every other
   * area is drawn tired. Leave it out to draw everything bright. See CITY_AREAS.
   */
  bright?: readonly string[];
  /** From the first boom (d4): the new flats on r1c1, the long bus shelter and a 4th danfo. The jetty is `jetty`. */
  boom?: boolean;
  /** With `boom`: false leaves the flats off, for the picture under drawBoomFlats while the flats grow. */
  flats?: boolean;
}

/** Every area id `CityOpts.bright` understands: the 12 blocks, the bus park and the shore. */
export const CITY_AREAS: readonly string[] = [...CITY_BLOCKS.map((b) => b.id), 'busPark', 'shore'];

/** The whole still city in map units: ground, the potholes spot, then every block back to front. */
export function drawCity(g: CanvasRenderingContext2D, looks: SpotLooks = START_LOOKS, opts: CityOpts = {}): void {
  g.save();
  drawCityGround(g, opts);
  drawPotholeSpot(g, looks.potholes);
  for (const b of CITY_BLOCKS) drawCityBlock(g, b, b.spot ? looks[b.spot] : 'fixed', opts);
  g.restore();
}

/**
 * Paints the still city once into an offscreen canvas, `scale` pixels per map unit (capped so
 * the canvas is at most maxPx wide: a 2048 x 1280 picture is about 10 MB on the phone). Copy
 * it with g.drawImage(canvas, 0, 0, CITY_MAP.w, CITY_MAP.h) in map units. Paint it again only
 * when a look changes. Returns null where there is no document (tests, workers).
 */
export function makeCityCanvas(looks: SpotLooks = START_LOOKS, scale = 1, maxPx = 2048, opts: CityOpts = {}): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const s = Math.max(0.1, Math.min(Number.isFinite(scale) ? scale : 1, maxPx / CITY_MAP.w));
  const c = document.createElement('canvas');
  c.width = Math.ceil(CITY_MAP.w * s);
  c.height = Math.ceil(CITY_MAP.h * s);
  const cg = c.getContext('2d');
  if (!cg) return null;
  cg.scale(s, s);
  drawCity(cg, looks, opts);
  return c;
}

// ---------- Buses ----------

/**
 * A yellow bus seen from above at an angle, centred on (x, y) on the ground. 'e' and 'w' go
 * across the map (about 46 x 14 on the ground), 'n' and 's' up and down (about 16 x 34).
 */
export function drawCityBus(g: CanvasRenderingContext2D, x: number, y: number, dir: 'e' | 'w' | 'n' | 's', faded = false): void {
  const H = 10;
  const side = faded ? fadeColour('#e3b50c') : '#e3b50c';
  const top = faded ? fadeColour('#f6c90e') : '#f6c90e';
  g.save();
  g.translate(x, y);
  oval(g, 3, 6, dir === 'e' || dir === 'w' ? 26 : 11, 5, 'rgba(0,0,0,0.18)');
  if (dir === 'e' || dir === 'w') {
    const f = dir === 'e' ? 1 : -1;
    // Side wall
    rect(g, -23, -2, 46, H, side, INK, 1);
    g.fillStyle = '#bfe3f5';
    for (let k = 0; k < 5; k++) g.fillRect(-20 + k * 8, 0, 6, 4);
    g.fillStyle = INK;
    g.fillRect(-23, 5, 46, 1.5);
    disc(g, -14, H - 1, 2.6, '#222222');
    disc(g, 14, H - 1, 2.6, '#222222');
    // Roof
    rect(g, -23, -2 - 12, 46, 12, top, INK, 1);
    g.fillStyle = '#bfe3f5';
    g.fillRect(f > 0 ? 17 : -23, -13, 6, 10);
  } else {
    // Front or back face
    rect(g, -8, 6, 16, H, side, INK, 1);
    g.fillStyle = '#bfe3f5';
    g.fillRect(-6, 7.5, 12, dir === 's' ? 5 : 3);
    if (dir === 's') {
      disc(g, -5, 14, 1.2, '#fff3b0');
      disc(g, 5, 14, 1.2, '#fff3b0');
    }
    // Roof
    rect(g, -8, -26, 16, 32, top, INK, 1);
    g.fillStyle = INK;
    g.fillRect(-8, -12, 16, 1.5);
    g.fillStyle = '#bfe3f5';
    g.fillRect(-6, dir === 's' ? 0 : -24, 12, 5);
  }
  g.restore();
}

/** A plain car seen from above (the go-slow later; no taxi or brand colours). */
export function drawCityCar(g: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  const c = CAR_COLOURS[i % CAR_COLOURS.length]!;
  oval(g, x + 2, y + 4, 12, 3.5, 'rgba(0,0,0,0.18)');
  rect(g, x - 11, y - 2, 22, 6, c, INK, 0.8);
  rect(g, x - 7, y - 8, 14, 7, lighter(c), INK, 0.8);
}

// ---------- Pins ----------

/** Pin sizes in screen px (draw pins after the camera's scale is undone). */
export const PIN = { r: 18, tagH: 16, stem: 10, word: 'bold 12px sans-serif' } as const;

/** The tap area round a pin standing at (x, y): at least 48 x 56, the word included. */
export function pinHitBox(x: number, y: number): { x: number; y: number; w: number; h: number } {
  const h = PIN.stem + PIN.tagH + PIN.r * 2 + 6;
  return { x: x - 32, y: y - h, w: 64, h: h + 4 };
}

/** A spot's icon (the one in its pin), centred on (x, y), about 24 across. For pin edge arrows. */
export function drawSpotIcon(g: CanvasRenderingContext2D, spot: SpotId, x: number, y: number): void {
  if (spot === 'potholes') {
    // A cracked road with a hole
    rect(g, x - 11, y - 7, 22, 14, '#5b5b62', INK, 1);
    g.fillStyle = K.roadLine;
    g.fillRect(x - 1, y - 7, 2, 4);
    g.fillRect(x - 1, y + 3, 2, 4);
    oval(g, x + 4, y + 1, 5, 2.6, '#2a1f17');
    stroke(g, '#2a1f17', 1.2, [x - 9, y - 4, x - 5, y, x - 8, y + 4]);
  } else if (spot === 'lightsOut') {
    // A dark lamp: pole, head, no light
    stroke(g, '#5d6670', 2.4, [x - 4, y + 11, x - 4, y - 8, x + 3, y - 8]);
    oval(g, x + 5, y - 8, 6, 3, K.lampOff);
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x + 5, y - 8, 6, 3, 0, 0, TAU);
    g.stroke();
    stroke(g, INK, 1.2, [x + 1, y - 2, x + 9, y + 6]);
    stroke(g, INK, 1.2, [x + 9, y - 2, x + 1, y + 6]);
  } else {
    // A phone mast with one bar
    stroke(g, '#5d6670', 1.8, [x - 9, y + 11, x - 5, y - 11, x - 1, y + 11]);
    stroke(g, '#5d6670', 1, [x - 8, y + 4, x - 2, y - 3, x - 7, y + 6]);
    for (let k = 0; k < 3; k++) {
      const bh = 5 + k * 4;
      rect(g, x + 2 + k * 4, y + 9 - bh, 3, bh, k === 0 ? INK : WHITE, INK, 0.8);
    }
  }
}

/**
 * A problem pin standing at (x, y), in screen px: a round sign (r 18) with the spot's icon, a
 * stem, and the word under it on a cream tag. 'ready': a tick badge and the word "Ready".
 * `bob` lifts it (0 to 2 px, none with reduced motion). The shadow stays on the ground.
 */
export function drawProblemPin(g: CanvasRenderingContext2D, x: number, y: number, spot: SpotId, state: 'problem' | 'ready' = 'problem', bob = 0): void {
  const b = Number.isFinite(bob) ? Math.max(0, Math.min(4, bob)) : 0;
  g.save();
  oval(g, x, y, 9, 3, 'rgba(0,0,0,0.25)');
  g.translate(x, y - b);
  const word = state === 'ready' ? 'Ready' : SPOT_WORDS[spot];
  // Stem
  stroke(g, INK, 2.5, [0, 0, 0, -PIN.stem]);
  // Word tag
  g.font = PIN.word;
  const tw = Math.max(40, (typeof g.measureText === 'function' ? g.measureText(word)?.width ?? word.length * 7 : word.length * 7) + 12);
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
  // Round sign
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
  drawSpotIcon(g, spot, 0, cy);
  if (state === 'ready') {
    // Tick badge, top right
    disc(g, 13, cy - 13, 8, '#22a85a');
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(13, cy - 13, 8, 0, TAU);
    g.stroke();
    stroke(g, WHITE, 2.4, [9, cy - 13, 12, cy - 10, 17, cy - 16]);
  }
  g.restore();
}

// ---------- Coming-soon pins (the first boom, d4) ----------

export type SoonId = 'goSlow' | 'crowdedBuses';
export const SOON_IDS: readonly SoonId[] = ['goSlow', 'crowdedBuses'];
/** Where each coming-soon pin stands (map units, its foot): d4. */
export const SOON_PINS: Record<SoonId, { x: number; y: number }> = { goSlow: { x: 488, y: 559 }, crowdedBuses: { x: 821, y: 640 } };
export const SOON_WORDS: Record<SoonId, string> = { goSlow: 'Go-slow', crowdedBuses: 'Crowded buses' };
/** The second word line on a coming-soon pin, and its font (d4: bold 11 px). */
export const SOON_LINE = 'Coming soon';
export const SOON_TAG = { lineH: 13, font: 'bold 11px sans-serif' } as const;

/** A coming-soon icon centred on (x, y), about 24 across: a short queue of plain cars, or a bus full of people. */
export function drawSoonIcon(g: CanvasRenderingContext2D, id: SoonId, x: number, y: number): void {
  if (id === 'goSlow') {
    // Three plain cars nose to tail on a strip of road
    rect(g, x - 12, y - 2, 24, 12, '#5b5b62', INK, 1);
    const cols = ['#e0572b', '#2b59c3', '#2fa36b'];
    for (let k = 0; k < 3; k++) {
      const cx = x - 8 + k * 8;
      rect(g, cx - 3.5, y - 6 + k * 2.5, 7, 5, cols[k]!, INK, 0.8);
      rect(g, cx - 2, y - 8.5 + k * 2.5, 4, 2.5, '#bfe3f5', INK, 0.6);
    }
  } else {
    // A bus seen from the front, full: heads at every window
    rect(g, x - 10, y - 8, 20, 17, '#f6c90e', INK, 1.2);
    rect(g, x - 8, y - 6, 16, 7, '#bfe3f5', INK, 0.6);
    const skins = ['#7a4a2a', '#d9a172', '#4b2c1a', '#a8693f', '#f1c9a5'];
    for (let k = 0; k < 5; k++) disc(g, x - 6.4 + k * 3.2, y - 1.6, 1.4, skins[k]!);
    disc(g, x - 6, y + 5, 1.4, '#fff3b0');
    disc(g, x + 6, y + 5, 1.4, '#fff3b0');
    rect(g, x - 9, y + 9, 4, 2, '#222222');
    rect(g, x + 5, y + 9, 4, 2, '#222222');
  }
}

/** The tap area round a coming-soon pin standing at (x, y): at least 48 x 56, both word lines included. */
export function soonPinHitBox(x: number, y: number, id: SoonId): { x: number; y: number; w: number; h: number } {
  const h = PIN.stem + PIN.tagH + SOON_TAG.lineH + PIN.r * 2 + 6;
  const w = Math.max(64, SOON_WORDS[id].length * 7.5 + 16);
  return { x: x - w / 2, y: y - h, w, h: h + 4 };
}

/**
 * A coming-soon pin standing at (x, y), screen px (d4): the normal pin (round sign with its icon,
 * stem, word tag) with a small padlock badge and a second word line "Coming soon" (bold 11 px).
 * A calm grey-blue ring, not the problem orange. `bob` lifts it (0 to 2 px; 4 px bounce as it drops in).
 */
export function drawComingSoonPin(g: CanvasRenderingContext2D, x: number, y: number, id: SoonId, bob = 0): void {
  const b = Number.isFinite(bob) ? Math.max(0, Math.min(4, bob)) : 0;
  g.save();
  oval(g, x, y, 9, 3, 'rgba(0,0,0,0.25)');
  g.translate(x, y - b);
  stroke(g, INK, 2.5, [0, 0, 0, -PIN.stem]);
  const word = SOON_WORDS[id];
  const measure = (t: string, font: string): number => {
    g.font = font;
    return typeof g.measureText === 'function' ? (g.measureText(t)?.width ?? t.length * 7) : t.length * 7;
  };
  const tw = Math.max(48, measure(word, PIN.word) + 12, measure(SOON_LINE, SOON_TAG.font) + 12);
  const tagH = PIN.tagH + SOON_TAG.lineH;
  const tagY = -PIN.stem - tagH;
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-tw / 2, tagY, tw, tagH, 5);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = PIN.word;
  g.fillText(word, 0, tagY + PIN.tagH / 2 + 0.5);
  g.font = SOON_TAG.font;
  g.fillText(SOON_LINE, 0, tagY + PIN.tagH + SOON_TAG.lineH / 2 - 1.5);
  const cy = tagY - 2 - PIN.r;
  disc(g, 0, cy, PIN.r, WHITE);
  g.strokeStyle = '#5d6670';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, cy, PIN.r - 1.5, 0, TAU);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, cy, PIN.r, 0, TAU);
  g.stroke();
  drawSoonIcon(g, id, 0, cy);
  // Padlock badge, top right
  disc(g, 13, cy - 13, 8, CREAM);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(13, cy - 13, 8, 0, TAU);
  g.stroke();
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(13, cy - 14.5, 2.6, Math.PI, TAU);
  g.stroke();
  rect(g, 9.5, cy - 14.5, 7, 6, '#5d6670', INK, 1);
  disc(g, 13, cy - 11.8, 0.9, CREAM);
  g.restore();
}

// ---------- Bucket icons: Naira, Power, Tech ----------
export type BucketKind = 'naira' | 'power' | 'tech';
export const BUCKETS: readonly BucketKind[] = ['naira', 'power', 'tech'];
export const BUCKET_WORDS: Record<BucketKind, string> = { naira: 'Naira', power: 'Power', tech: 'Tech' };

/**
 * A bucket icon centred on (x, y), `size` across. Naira: a gold coin with a drawn naira sign
 * (lines, not a font letter). Power: a glowing bulb with a small lightning bolt. Tech: a chip
 * with signal bars over it.
 */
export function drawBucketIcon(g: CanvasRenderingContext2D, kind: BucketKind, x: number, y: number, size = 24): void {
  const s = (Number.isFinite(size) && size > 0 ? size : 24) / 24;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (kind === 'naira') {
    disc(g, 0, 0, 11, KOBO_DARK);
    disc(g, 0, -0.8, 10, KOBO);
    disc(g, -3.5, -4.5, 2.2, KOBO_SHINE);
    stroke(g, KOBO_DARK, 2, [-4, 5, -4, -6, 4, 5, 4, -6]);
    stroke(g, KOBO_DARK, 1.4, [-7, -2, 7, -2]);
    stroke(g, KOBO_DARK, 1.4, [-7, 1.5, 7, 1.5]);
  } else if (kind === 'power') {
    disc(g, 0, -3, 11, 'rgba(255,226,122,0.45)');
    disc(g, 0, -3, 8, '#fff3b0');
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, -3, 8, 0, TAU);
    g.stroke();
    rect(g, -4, 5, 8, 6, '#9aa3ad', INK, 1.2);
    stroke(g, INK, 1, [-4, 7.5, 4, 7.5]);
    g.fillStyle = '#f4a62a';
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(1.5, -10);
    g.lineTo(-3.5, -2);
    g.lineTo(0, -2);
    g.lineTo(-1.5, 4);
    g.lineTo(3.5, -4.5);
    g.lineTo(0, -4.5);
    g.closePath();
    g.fill();
    g.stroke();
  } else {
    // Chip with legs
    for (let k = -1; k <= 1; k++) {
      stroke(g, INK, 1.4, [-11, 4 + k * 4, 11, 4 + k * 4]);
      stroke(g, INK, 1.4, [k * 4, -4, k * 4, 12]);
    }
    rect(g, -7, -2, 14, 12, '#2f5d8a', INK, 1.4);
    rect(g, -3.5, 1.5, 7, 5, '#7fd6ff');
    // Signal bars over it
    for (let k = 0; k < 3; k++) {
      const bh = 2.5 + k * 2.5;
      rect(g, -6 + k * 4.5, -4.5 - bh, 3, bh, '#22a85a', INK, 0.8);
    }
  }
  g.restore();
}

/** The same bucket icons as SVG markup (24 x 24) for HTML chips and cards. */
export function bucketIconSvg(kind: BucketKind): string {
  const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true" focusable="false">';
  if (kind === 'naira')
    return `${open}<circle r="11" fill="${KOBO_DARK}"/><circle cy="-0.8" r="10" fill="${KOBO}"/><circle cx="-3.5" cy="-4.5" r="2.2" fill="${KOBO_SHINE}"/><path d="M-4 5V-6L4 5V-6" fill="none" stroke="${KOBO_DARK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M-7-2H7M-7 1.5H7" stroke="${KOBO_DARK}" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  if (kind === 'power')
    return `${open}<circle cy="-3" r="11" fill="#ffe27a" fill-opacity=".45"/><circle cy="-3" r="8" fill="#fff3b0" stroke="${INK}" stroke-width="1.4"/><rect x="-4" y="5" width="8" height="6" fill="#9aa3ad" stroke="${INK}" stroke-width="1.2"/><path d="M1.5-10L-3.5-2H0L-1.5 4L3.5-4.5H0Z" fill="#f4a62a" stroke="${INK}" stroke-linejoin="round"/></svg>`;
  return `${open}<path d="M-11 0H11M-11 4H11M-11 8H11M-4-4V12M0-4V12M4-4V12" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><rect x="-7" y="-2" width="14" height="12" fill="#2f5d8a" stroke="${INK}" stroke-width="1.4"/><rect x="-3.5" y="1.5" width="7" height="5" fill="#7fd6ff"/><g fill="#22a85a" stroke="${INK}" stroke-width=".8"><rect x="-6" y="-7" width="3" height="2.5"/><rect x="-1.5" y="-9.5" width="3" height="5"/><rect x="3" y="-12" width="3" height="7.5"/></g></svg>`;
}
