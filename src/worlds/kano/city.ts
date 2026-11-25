/**
 * K6a: Kano from above (docs/kano.md 6.1 to 6.3, 7). Our own model-town view, the same size and
 * angle as Lagos and Ogun: 1600 x 1000 map units, 12 blocks in 3 rows of 4, seen from the south.
 *  - bottom edge: the old red earth wall with our gate (gate.ts), the road in from the south
 *    through it (the Sandy road pin), sand drifted at its foot;
 *  - left: Kurmi market, rows of leather stalls under flat cloth shades;
 *  - middle: the motor park and the market road (the Lights out pin), lamps along it;
 *  - top: Kofar Mata's dye pits behind a low wall, cloth laid out to dry;
 *  - right: Dawanau's grain market with sacks and trucks, a phone mast (Slow internet) and,
 *    once Kano booms, the groundnut pyramid's plot;
 *  - top right: the water yard (Dry taps): a raised tank, a pump house and a row of taps;
 *  - far edges: dry savanna with baobabs, the wall curving away up both sides.
 * Flat-roofed earth houses with small raised corners and round grain stores. No real building,
 * brand or person; no palace, dome, tower or script; nothing religious (KN-R3). Market shades are
 * flat cloth on poles, never umbrellas. No people are painted into the still map: the walkers and
 * the places' people come from the people kit (style 1.8), drawn by gamedev on top.
 *
 * Light: drawKanoCity paints the still city once (makeKanoCityCanvas); pins and places are drawn
 * on top only on frames they move. Imports no value from outside src/worlds/kano/.
 */
import type { SpotLook } from '../../art/city';
import type { FolkLook } from '../../art/folk';
import { KANO, KANO_INK as INK, drawKanoGate, drawKanoWall } from './gate';
import { KURMI_CAST, box, disc } from './kurmi';
import { KOFAR_MATA_CAST } from './kofarMata';
import { DAWANAU_CAST } from './dawanau';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
type R2 = readonly (readonly [number, number])[];

export const KANO_MAP = { w: 1600, h: 1000 } as const;

/** Kano's colours from above (2.5): dry gold ground, earth red, indigo, groundnut tan. */
const SAND = '#e6c98e';
const ZINC = '#bcc2c6';
const DIM = 'rgba(40,36,70,0.38)';
const WATER = '#5fbfe0';

/** Earth walls and painted walls: red earth, ochre, sand, cream, a soft green and a soft blue. */
const WALLS = ['#c8583a', '#d9905a', '#e2b878', '#f2e2c0', '#b8cf9a', '#9fbfe0', '#d87a52', '#e8c690'] as const;

/** Tired: the area under a dusty wash (one fill over its lot and houses), never drawn twice. */
function wash(g: G, add: () => void): void {
  g.fillStyle = 'rgba(199,180,152,0.55)';
  g.beginPath();
  add();
  g.fill();
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function line(g: G, c: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.stroke();
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

// ---------- Layout ----------

export type KanoSpotId = 'sandyRoad' | 'lightsOut' | 'slowInternet' | 'dryTaps';
export const KANO_SPOT_IDS: readonly KanoSpotId[] = ['sandyRoad', 'lightsOut', 'slowInternet', 'dryTaps'];
export type KanoSpotLooks = Record<KanoSpotId, SpotLook>;
export const KANO_START_LOOKS: KanoSpotLooks = { sandyRoad: 'problem', lightsOut: 'problem', slowInternet: 'problem', dryTaps: 'problem' };
/** The pin words (kano.md 6.2). The card words are gamedev's, in words.ts. */
export const KANO_SPOT_WORDS: Record<KanoSpotId, string> = { sandyRoad: 'Sandy road', lightsOut: 'Lights out', slowInternet: 'Slow internet', dryTaps: 'Dry taps' };

export type KanoPlaceId = 'leather' | 'dye' | 'grain' | 'pyramid';
export const KANO_PLACE_IDS: readonly KanoPlaceId[] = ['leather', 'dye', 'grain', 'pyramid'];

/** Roads: [from, to] across (y) and up (x). The across roads run between the outer up roads; the gate road runs on down through the gate. */
export const KANO_H_ROADS: R2 = [[100, 128], [300, 330], [560, 598], [800, 830]];
export const KANO_V_ROADS: R2 = [[70, 110], [470, 504], [776, 830], [1110, 1144], [1480, 1516]];
const ROWS: R2 = [[128, 300], [330, 560], [598, 800]];
const COLS: R2 = [[110, 470], [504, 776], [830, 1110], [1144, 1480]];
/** The motor park (the middle block) and the gate (its base centre and scale; Travel and "To Ogun" sit by it). */
export const KANO_MOTOR_PARK = { x: 512, y: 338, w: 256, h: 214 } as const;
export const KANO_CITY_GATE = { x: 803, y: 992, s: 0.8 } as const;
/** Where the wall's foot runs across the bottom. */
const KANO_WALL_Y = 992;

export type KanoBlockKind = 'homes' | 'shops' | 'kurmi' | 'dye' | 'water' | 'grain' | 'trucks';
export interface KanoBox {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  wall: string;
  store: boolean;
}
export interface KanoBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  d: number;
  kind: KanoBlockKind;
  boxes: readonly KanoBox[];
  spot?: KanoSpotId;
}

const KINDS: Record<string, KanoBlockKind> = { r0c1: 'dye', r0c2: 'dye', r0c3: 'water', r1c0: 'kurmi', r1c3: 'grain', r2c0: 'kurmi', r2c2: 'homes', r0c0: 'homes', r2c3: 'trucks' };

function makeBlocks(): KanoBlock[] {
  const out: KanoBlock[] = [];
  ROWS.forEach(([y0, y1], r) =>
    COLS.forEach(([x0, x1], c) => {
      const id = `r${r}c${c}`;
      if (id === 'r1c1') return; // the motor park
      const x = x0 + 8;
      const w = x1 - x0 - 16;
      const y = y0 + 8;
      const d = y1 - y0 - 16;
      const kind = KINDS[id] ?? 'shops';
      const seed = r * 4 + c + 1;
      const boxes: KanoBox[] = [];
      // Houses along the back: shallow where the block's front is a market, yard or plot
      const yard = kind !== 'homes' && kind !== 'shops';
      const n = w > 260 ? 3 : 2;
      let at = x + 12;
      for (let k = 0; k < n; k++) {
        const share = k === n - 1 ? x + w - 12 - at : Math.round(((w - 24) / n) * (0.8 + hash(seed * 7 + k) * 0.4));
        const deep = yard ? Math.round(d * 0.28) : hash(seed * 3 + k) > 0.4 ? d - 46 : Math.round((d - 46) * 0.6);
        boxes.push({ x: at + 4, y: y + 12, w: share - 8, d: deep, h: Math.round((yard ? 14 : 20) + hash(seed * 11 + k) * 12), wall: WALLS[(seed * 3 + k * 5) % WALLS.length]!, store: !yard && hash(seed * 13 + k) > 0.5 });
        at += share;
      }
      const b: KanoBlock = { id, x, y, w, d, kind, boxes };
      if (id === 'r2c3') b.spot = 'slowInternet';
      if (id === 'r0c3') b.spot = 'dryTaps';
      out.push(b);
    }),
  );
  return out;
}

/** The 11 blocks, back row first (the order to draw them). */
export const KANO_BLOCKS: readonly KanoBlock[] = makeBlocks();

export interface KanoSpot {
  id: KanoSpotId;
  pin: { x: number; y: number };
  focus: { x: number; y: number; w: number; h: number };
  /** Its area id (KANO_CITY_AREAS). */
  area: string;
}

export const KANO_SPOTS: Record<KanoSpotId, KanoSpot> = {
  sandyRoad: { id: 'sandyRoad', pin: { x: 803, y: 884 }, focus: { x: 700, y: 820, w: 206, h: 180 }, area: 'gate' },
  lightsOut: { id: 'lightsOut', pin: { x: 960, y: 578 }, focus: { x: 830, y: 520, w: 280, h: 120 }, area: 'market' },
  slowInternet: { id: 'slowInternet', pin: { x: 1250, y: 700 }, focus: { x: 1144, y: 598, w: 336, h: 202 }, area: 'r2c3' },
  dryTaps: { id: 'dryTaps', pin: { x: 1312, y: 250 }, focus: { x: 1144, y: 128, w: 336, h: 172 }, area: 'r0c3' },
};

/** Where each tax place stands once built (its front middle, where the hero collects). */
export const KANO_PLACES: Record<KanoPlaceId, { x: number; y: number; block: string }> = {
  leather: { x: 290, y: 784, block: 'r2c0' },
  dye: { x: 640, y: 284, block: 'r0c1' },
  grain: { x: 1312, y: 544, block: 'r1c3' },
  pyramid: { x: 1410, y: 784, block: 'r2c3' },
};

/** Area labels (the words come from words.ts; area names only ever praise). */
export const KANO_AREA_LABELS: Record<'kurmi' | 'kofarMata' | 'dawanau' | 'waterYard', { x: number; y: number }> = {
  kurmi: { x: 290, y: 588 },
  kofarMata: { x: 790, y: 140 },
  dawanau: { x: 1312, y: 335 },
  waterYard: { x: 1312, y: 140 },
};

/** Every area id KanoCityOpts.bright understands: the 11 blocks, the motor park, the market road, the gate and the savanna edge. */
export const KANO_CITY_AREAS: readonly string[] = [...KANO_BLOCKS.map((b) => b.id), 'motorPark', 'market', 'gate', 'edge'];

/** Lanes the buses and trucks use: along x (e, w) at y, or along y (n, s) at x. */
export const KANO_BUS_LANES = [
  { dir: 'n', x: 795, from: 1000, to: 140 },
  { dir: 's', x: 811, from: 140, to: 1000 },
  { dir: 'e', y: 572, from: 70, to: 1516 },
  { dir: 'w', y: 588, from: 1516, to: 70 },
] as const;

export interface KanoCityOpts {
  /** Areas drawn bright (KANO_CITY_AREAS); every other is tired. Left out: all bright. */
  bright?: readonly string[];
  /** Built places: their plot front is cleared for the place (drawn on top by gamedev). */
  built?: readonly KanoPlaceId[];
  /** From the first boom: upper floors in the middle, a second shelter, the pyramid's plot pegged out. */
  boom?: boolean;
  /** Kano is switched on (Rusty Borehole beaten): the wall and gate bright. */
  lit?: boolean;
}

export function kanoAreaBright(opts: KanoCityOpts, id: string): boolean {
  return opts.bright === undefined || opts.bright.includes(id);
}

// ---------- Pieces ----------

/** A baobab from above at an angle: a fat trunk and a wide crown of a few bare-ish branches. */
function drawBaobab(g: G, x: number, y: number, s: number): void {
  oval(g, x + 3 * s, y, 12 * s, 3.5 * s, 'rgba(0,0,0,0.13)');
  g.fillStyle = '#9a7a5a';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 5 * s, y);
  g.quadraticCurveTo(x - 6 * s, y - 12 * s, x - 3 * s, y - 18 * s);
  g.lineTo(x + 3 * s, y - 18 * s);
  g.quadraticCurveTo(x + 6 * s, y - 12 * s, x + 5 * s, y);
  g.closePath();
  g.fill();
  g.stroke();
  for (const [dx, dy, r] of [[-8, -21, 6], [0, -24, 7], [8, -21, 6]] as const) oval(g, x + dx * s, y + dy * s, r * s, r * 0.6 * s, '#7f9a44', 0.8);
}

/** A round grain store: an earth drum under a straw cone (the cone seen from above). */
function grainStore(g: G, x: number, y: number): void {
  box(g, x - 7, y - 10, 14, 10, '#c8784a', 1);
  tri(g, x - 10, y - 9, x, y - 22, x + 10, y - 9, '#e3c06a');
}

/** A small filled triangle with an ink edge. */
function tri(g: G, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, fill: string, lw = 1): void {
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.lineTo(cx, cy);
  g.closePath();
  g.fill();
  if (lw) g.stroke();
}

/** A street lamp from above at an angle: a pole and a head, glowing when on. */
function drawKanoLamp(g: G, x: number, y: number, on: boolean): void {
  if (on) disc(g, x, y - 20, 9, 'rgba(255,220,120,0.4)');
  line(g, '#5d6670', 2, [x, y, x, y - 18, x + 4, y - 20]);
  disc(g, x + 4, y - 20, 2.6, on ? '#ffe27a' : '#7d858c', 0.8);
}

/** A danfo-yellow minibus seen from above, heading e/w/n/s, centred at (x, y). No writing. */
export function drawKanoBus(g: G, x: number, y: number, dir: 'e' | 'w' | 'n' | 's', truck = false): void {
  const w = truck ? 40 : 30;
  const h = truck ? 18 : 16;
  const turn = 'eswn'.indexOf(dir);
  g.save();
  g.translate(x, y);
  g.rotate((turn * Math.PI) / 2);
  box(g, 2 - w / 2, 2 - h / 2, w, h, 'rgba(0,0,0,0.15)', 0);
  box(g, -w / 2, -h / 2, w, h, truck ? '#3f8f4a' : KANO.yellow, 1.1);
  if (truck) {
    // The load of sacks, the cab and its windscreen at the front
    for (let k = 0; k < 6; k++) oval(g, -2 - (k >> 1) * 8, k % 2 ? 4 : -4, 4.6, 3.4, k % 3 ? '#e6cc98' : '#d2a86a', 0.6);
    box(g, 8, -8, 10, 16, '#2b59c3', 1);
    box(g, 15, -6, 3, 12, '#cfe9f5', 0);
  } else {
    box(g, 7, -6, 4, 12, '#2f3b4a', 0);
    box(g, -10, -7, 20, 2, '#2a2a2a', 0);
    box(g, -10, 5, 20, 2, '#2a2a2a', 0);
  }
  g.restore();
}

/** Tools waiting by a spot once it can be paid for: a cone, a wheelbarrow and a shovel. */
function toolsWaiting(g: G, x: number, y: number): void {
  tri(g, x - 4, y, x, y - 10, x + 4, y, '#f08a24');
  box(g, x + 8, y - 9, 14, 7, '#5d8fb0', 1);
  line(g, '#6b4a2b', 1.4, [x + 24, y, x + 30, y - 14]);
}

/** A flat cloth shade on four poles over a stall (never an umbrella): `c` striped with `c2`. */
export function drawKanoShade(g: G, x: number, y: number, w: number, d: number, c: string, c2: string): void {
  for (const px of [x + 2, x + w - 2]) line(g, '#6b4a2b', 1.2, [px, y + d, px, y + d - 10]);
  box(g, x, y - 10, w, d, c, 1);
  g.fillStyle = c2;
  for (let k = x + 4; k < x + w - 2; k += 8) g.fillRect(k, y - 10, 3, d);
}

/** A dye pit from above: an earth rim round deep indigo (scenery only, nobody near the edge). */
export function drawCityDyePit(g: G, x: number, y: number): void {
  oval(g, x, y, 9, 5.4, '#b9774f', 0.9);
  oval(g, x, y + 0.4, 6.4, 3.6, '#1f2a66');
}

/** A cloth laid out to dry, seen from above: deep indigo with our own pale stripes or dots. */
function clothDry(g: G, x: number, y: number, k: number): void {
  box(g, x, y, 16, 8, KANO.indigo, 0.6);
  g.fillStyle = '#e8ecff';
  for (let i = 1 + (k % 2); i < 16; i += 4) g.fillRect(x + i, y + 1, 1, 6);
}

/** The phone mast: lattice, dishes and signal bars (one when slow, four when fixed). */
function mast(g: G, x: number, y: number, look: SpotLook): void {
  const top = y - 52;
  line(g, '#7d8a96', 2, [x - 8, y, x, top, x + 8, y]);
  line(g, '#7d8a96', 1, [x - 7, y - 8, x + 6, y - 20, x - 4, y - 32, x + 3, y - 42]);
  const bars = look === 'fixed' ? 4 : 1;
  for (let k = 0; k < 4; k++) box(g, x + 14 + k * 6, top + 19 - k * 4, 4, 5 + k * 4, k < bars ? '#22a85a' : 'rgba(255,255,255,0.5)', 0.7);
  disc(g, x, top - 2, look === 'fixed' ? 3.5 : 2.5, look === 'fixed' ? '#f4a62a' : '#8a8a8a');
}

// ---------- The ground ----------

function road(g: G, x: number, y: number, w: number, h: number, dashes: boolean): void {
  const across = w > h;
  box(g, x, y, w, h, '#c9a978', 0);
  box(g, x + (across ? 0 : 2), y + (across ? 2 : 0), w - (across ? 0 : 4), h - (across ? 4 : 0), '#5b5650', 0);
  if (dashes) for (let k = 6; k < (across ? w : h); k += 24) box(g, across ? x + k : x + w / 2 - 1, across ? y + h / 2 - 1 : y + k, across ? 12 : 2, across ? 2 : 12, '#f4efe0', 0);
}

/**
 * The ground: savanna round the edge (baobabs, dry grass, the wall curving up both sides), the
 * roads, the motor park, the market road's lamps and stalls, and the wall and gate at the bottom
 * with the Sandy road spot on the gate road.
 */
function drawKanoGround(g: G, looks: KanoSpotLooks = KANO_START_LOOKS, opts: KanoCityOpts = {}): void {
  const { w: W, h: H } = KANO_MAP;
  const edge = !kanoAreaBright(opts, 'edge');
  const lit = opts.lit === true;
  box(g, 0, 0, W, H, '#e9d3a0', 0);
  // The savanna: the top strip, the side strips and the sandy strip inside the wall
  g.fillStyle = '#d9c27e';
  g.fillRect(0, 0, W, 100);
  g.fillRect(0, 0, 70, H);
  g.fillRect(1516, 0, 84, H);
  for (let i = 0; i < 7; i++) {
    drawBaobab(g, 150 + i * 210 + hash(i) * 60, 70 + hash(i + 4) * 22, 1.3);
    if (i < 4) drawBaobab(g, i % 2 ? 34 : 1560, 220 + i * 190, 1);
  }
  if (edge)
    wash(g, () => {
      g.rect(0, 0, W, 100);
      g.rect(0, 100, 70, H);
      g.rect(1516, 100, 84, H);
    });
  // The wall curving away up both sides (a band of red earth seen from above)
  const wc = lit ? KANO.red : '#b98670';
  for (const s of [1, -1]) {
    const x0 = s > 0 ? 0 : W;
    g.strokeStyle = INK;
    g.lineWidth = 16;
    g.beginPath();
    g.moveTo(x0 + s * 80, KANO_WALL_Y - 40);
    g.quadraticCurveTo(x0 + s * 16, KANO_WALL_Y - 60, x0 + s * 14, 180);
    g.stroke();
    g.strokeStyle = wc;
    g.lineWidth = 13;
    g.stroke();
  }
  // Sand inside the wall
  box(g, 70, 830, 1446, KANO_WALL_Y - 830, SAND, 0);
  for (const [y0, y1] of KANO_H_ROADS) road(g, 70, y0, 1446, y1 - y0, y1 - y0 > 34);
  for (const [x0, x1] of KANO_V_ROADS) road(g, x0, 100, x1 - x0, 730, x1 - x0 > 50);
  road(g, 776, 830, 54, 170, true);
  motorPark(g, kanoAreaBright(opts, 'motorPark'), opts.boom === true);
  marketRoad(g, looks.lightsOut, !kanoAreaBright(opts, 'market'));
  // The wall and our gate across the bottom; the road goes out through the gate
  drawKanoWall(g, 0, 770, KANO_WALL_Y, 0.9, lit);
  drawKanoWall(g, 836, W, KANO_WALL_Y, 0.9, lit);
  drawKanoGate(g, KANO_CITY_GATE.x, KANO_WALL_Y, KANO_CITY_GATE.s, { lit, still: true });
  sandyRoad(g, looks.sandyRoad, !kanoAreaBright(opts, 'gate'));
}

function motorPark(g: G, bright: boolean, boom: boolean): void {
  const { x, y, w, h } = KANO_MOTOR_PARK;
  box(g, x, y, w, h, SAND, 1.2);
  // The shelter (zinc on posts) with a bench, and bays of buses
  for (let k = 0; k < (boom ? 2 : 1); k++) {
    box(g, x + 14 + k * 128, y + 10, 100, 22, ZINC, 1);
    box(g, x + 18 + k * 128, y + 36, 92, 4, '#8a5d36', 0);
  }
  const n = bright ? 6 : 2;
  for (let k = 0; k < n; k++) drawKanoBus(g, x + 21 + k * 38, y + 100 + (k % 2) * 56, 'n');
  drawBaobab(g, x + w - 18, y + h - 4, 1);
  if (!bright) wash(g, () => g.rect(x, y, w, h));
}

function marketRoad(g: G, look: SpotLook, tired: boolean): void {
  // Stalls along both kerbs of the market road (flat cloth shades)
  for (let k = 0; k < 8; k++) {
    const x = 846 + k * 32;
    drawKanoShade(g, x, 548, 24, 10, [KANO.indigo, '#e0572b', '#13703a', KANO.gold][k % 4]!, KANO.cream);
  }
  if (tired) wash(g, () => g.rect(840, 520, 270, 40));
  const on = look === 'fixed';
  if (!on) {
    g.fillStyle = DIM;
    g.fillRect(830, 520, 280, 96);
  }
  for (let k = 0; k < 5; k++) {
    drawKanoLamp(g, 846 + k * 64, 556, on);
    drawKanoLamp(g, 846 + k * 64, 612, on);
  }
  if (look === 'ready') toolsWaiting(g, 1050, 616);
  if (on) {
    drawKanoBus(g, 900, 573, 'e', true);
    drawKanoBus(g, 1040, 588, 'w');
  }
}

function sandyRoad(g: G, look: SpotLook, tired: boolean): void {
  if (look === 'fixed') {
    if (!tired) drawKanoBus(g, 795, 858, 'n');
    return;
  }
  // Sand blown over the gate road in soft heaps, a cart waiting
  for (let k = 0; k < 3; k++) oval(g, 803 + (k % 2 ? 12 : -10), 842 + k * 16, 24, 7, k % 2 ? SAND : '#cfae72', 0.6);
  if (look === 'ready') toolsWaiting(g, 840, 880);
}

// ---------- Blocks ----------

/**
 * A Kano house seen from above at an angle: an earth (or painted) front with small windows and a
 * wooden door, a flat roof with a raised rim, small raised corners and a water spout.
 */
function house(g: G, b: KanoBox, rise: number): void {
  const h = b.h + rise;
  const top = b.y - h;
  const front = b.y + b.d - h;
  const wall = b.wall;
  box(g, b.x + b.w, b.y, h * 0.35, b.d, 'rgba(0,0,0,0.12)', 0);
  box(g, b.x, front, b.w, h, wall, 1.2);
  for (let yy = front + 5; yy < b.y + b.d - 14; yy += 12) for (let xx = b.x + 6; xx < b.x + b.w - 8; xx += 13) box(g, xx, yy, 5, 6, '#3a3f55', 0);
  box(g, b.x + b.w - 13, b.y + b.d - 10, 7, 10, b.w % 2 ? '#2f8a6e' : '#2b59c3', 0.8);
  // The flat roof: a little lighter than the wall, its rim, the raised corners and a spout
  box(g, b.x, top, b.w, b.d, wall, 1.2);
  box(g, b.x, top, b.w, b.d, 'rgba(255,243,214,0.25)', 0);
  for (const cx of [b.x, b.x + b.w]) for (const cy of [top, top + b.d]) tri(g, cx - 3, cy + 1, cx, cy - 6, cx + 3, cy + 1, wall);
  line(g, '#6b4a2b', 1.6, [b.x + b.w * 0.3, top + b.d, b.x + b.w * 0.3, top + b.d + 4]);
  // On some roofs, a mat of peppers drying in the sun
  const r = hash(b.x * 3 + b.y);
  const mx = b.x + 8 + r * (b.w - 50);
  const my = top + 8 + r * Math.max(0, b.d - 34);
  if (r > 0.4) {
    box(g, mx, my, 30, 18, '#e3c06a', 0.8);
    g.fillStyle = '#c8302a';
    for (let i = 0; i < 12; i++) g.fillRect(mx + 3 + (i % 6) * 4.4, my + 4 + (i > 5 ? 7 : 0), 2.4, 2.4);
  }
}

/** One block: its lot, houses and its look (tired, bright, spot). Draw in KANO_BLOCKS order. */
export function drawKanoBlock(g: G, b: KanoBlock, look: SpotLook = 'fixed', opts: KanoCityOpts = {}): void {
  const tired = !kanoAreaBright(opts, b.id);
  const front = b.y + b.d;
  const built = (id: KanoPlaceId): boolean => opts.built?.includes(id) === true;
  box(g, b.x, b.y, b.w, b.d, '#f1e2bd', 0);
  g.strokeStyle = '#c9a978';
  g.lineWidth = 1.5;
  g.strokeRect(b.x, b.y, b.w, b.d);
  const rise = opts.boom === true && (b.id === 'r1c2' || b.id === 'r2c1') ? 22 : 0;
  for (const bx of b.boxes) house(g, bx, rise);
  for (const bx of b.boxes) if (bx.store) grainStore(g, bx.x + bx.w / 2, bx.y + bx.d + 22);
  const mid = b.y + b.d * 0.62;
  switch (b.kind) {
    case 'kurmi': {
      // Rows of leather stalls: flat shades with bags and sandals in browns and reds
      const rows = b.id === 'r2c0' && built('leather') ? 1 : 2;
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < 6; k++) {
          const x = b.x + 18 + k * 54;
          const y = b.y + b.d * 0.5 + r * 34;
          drawKanoShade(g, x, y, 40, 14, ['#8a4b2a', KANO.red, '#b8742f'][(k + r) % 3]!, KANO.cream);
          box(g, x + 6, y + 6, 28, 4, '#8a4b2a', 0.5);
        }
      break;
    }
    case 'dye': {
      // A low earth wall round the yard, the pits and cloth laid out to dry
      const yy = b.y + b.d * 0.42;
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.strokeRect(b.x + 10, yy, b.w - 20, b.d * 0.52);
      g.strokeStyle = '#c8784a';
      g.lineWidth = 4;
      g.strokeRect(b.x + 10, yy, b.w - 20, b.d * 0.52);
      const open = b.id === 'r0c1' && built('dye');
      for (let k = 0; k < (open ? 3 : 6); k++) drawCityDyePit(g, b.x + 36 + (k % 3) * 34, yy + 22 + (k > 2 ? 26 : 0));
      for (let k = 0; k < 6; k++) clothDry(g, b.x + 150 + (k % 3) * 22, yy + 14 + (k > 2 ? 20 : 0), k);
      break;
    }
    case 'water': {
      // The water yard: a raised tank on legs, a pump house, a low wall of taps and cans in a row
      const tx = b.x + 70;
      line(g, '#6f6a62', 2.4, [tx - 14, front - 20, tx - 11, front - 64, tx + 11, front - 64, tx + 14, front - 20]);
      box(g, tx - 22, front - 92, 44, 30, '#3b6fa8', 1.2);
      oval(g, tx, front - 92, 22, 5, look === 'fixed' ? WATER : '#5d8fcf', 1);
      box(g, b.x + 110, front - 54, 60, 34, '#e2b878', 1.2);
      box(g, b.x + 180, front - 30, 130, 10, '#c8784a', 1);
      for (let k = 0; k < 6; k++) {
        const x = b.x + 192 + k * 20;
        line(g, '#5d6670', 2, [x, front - 30, x, front - 36, x + 4, front - 36]);
        if (look === 'fixed') line(g, WATER, 1.6, [x + 4, front - 34, x + 4, front - 22]);
        box(g, x - 2, front - 16, 8, 9, ['#f6c90e', '#2f8a6e', '#2b59c3', '#e0572b'][k % 4]!, 0.7);
      }
      break;
    }
    case 'grain':
    case 'trucks': {
      // Grain sacks stacked in the yard, an open shed, trucks parked; the mast on the truck yard
      const keep = !(b.kind === 'grain' && built('grain'));
      if (keep) {
        box(g, b.x + 20, mid - 10, 110, 30, ZINC, 1.2);
        for (let k = 0; k < 12; k++) oval(g, b.x + 150 + (k % 6) * 12, mid + 14 - (k > 5 ? 7 : 0), 6, 4, ['#e6cc98', '#d2a86a'][k % 2]!, 0.7);
      }
      if (b.kind === 'trucks') {
        for (let k = 0; k < (tired ? 1 : 3); k++) drawKanoBus(g, b.x + 40 + k * 40, front - 30, 'n', true);
        if (opts.boom === true && !built('pyramid')) plot(g, KANO_PLACES.pyramid.x, KANO_PLACES.pyramid.y, 90);
      } else if (keep) drawKanoBus(g, b.x + 250, front - 22, 'e', true);
      break;
    }
    default:
      drawBaobab(g, b.x + b.w - 22, front - 4, 1);
      if (b.kind === 'shops') for (let k = 0; k < 3; k++) drawKanoShade(g, b.x + 20 + k * 52, front - 22, 40, 12, [KANO.gold, '#13703a', KANO.indigo][k]!, KANO.cream);
      drawKanoLamp(g, b.x + 12, front - 2, !tired);
  }
  if (tired)
    wash(g, () => {
      g.rect(b.x, b.y, b.w, b.d);
      for (const k of b.boxes) g.rect(k.x, k.y - k.h - 7, k.w + 4, k.d + k.h + 8);
    });
  // A spot waiting for its fix: dim over the block, tools once it can be paid for, the mast on top
  if (b.spot && look !== 'fixed') {
    g.fillStyle = DIM;
    g.fillRect(b.x, b.y - 40, b.w, b.d + 40);
    if (look === 'ready') toolsWaiting(g, b.x + 20, front - 8);
  }
  if (b.kind === 'trucks') mast(g, b.boxes[0]!.x + b.boxes[0]!.w * 0.6, b.boxes[0]!.y - b.boxes[0]!.h + b.boxes[0]!.d * 0.5, look);
}

/** The unbuilt look of a place's front: a pegged plot with a string, so the build board has room. */
export function plot(g: G, x: number, y: number, w: number): void {
  g.save();
  g.setLineDash([3, 3]);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1;
  g.strokeRect(x - w / 2, y - 40, w, 40);
  g.restore();
  for (const px of [x - w / 2, x + w / 2]) for (const py of [y - 40, y]) line(g, '#8a5d36', 1.6, [px, py, px, py - 4]);
}

/** The whole still Kano city in map units: the ground, then every block back to front. */
export function drawKanoCity(g: G, looks: KanoSpotLooks = KANO_START_LOOKS, opts: KanoCityOpts = {}): void {
  g.save();
  g.lineJoin = 'round';
  drawKanoGround(g, looks, opts);
  for (const b of KANO_BLOCKS) drawKanoBlock(g, b, b.spot ? looks[b.spot] : 'fixed', opts);
  g.restore();
}

/** Paints the still Kano city once: `scale` px a map unit, at most maxPx wide. Null without a document. */
export function makeKanoCityCanvas(looks: KanoSpotLooks = KANO_START_LOOKS, scale = 1, maxPx = 2048, opts: KanoCityOpts = {}): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const s = Math.max(0.1, Math.min(Number.isFinite(scale) ? scale : 1, maxPx / KANO_MAP.w));
  const c = document.createElement('canvas');
  c.width = Math.ceil(KANO_MAP.w * s);
  c.height = Math.ceil(KANO_MAP.h * s);
  const cg = c.getContext('2d');
  if (!cg) return null;
  cg.scale(s, s);
  drawKanoCity(cg, looks, opts);
  return c;
}

// ---------- Pins (screen px, Lagos's pin sizes) ----------

/** Lagos's pin sizes (src/art/city.ts PIN), kept here so the part imports no value. */
const KANO_PIN = { r: 18, tagH: 16, stem: 10, word: 'bold 12px sans-serif' } as const;

/** The tap area round a pin at (x, y): at least 48 x 56, the word included (as Lagos's pinHitBox). */
export function kanoPinHitBox(x: number, y: number): { x: number; y: number; w: number; h: number } {
  const h = KANO_PIN.stem + KANO_PIN.tagH + KANO_PIN.r * 2 + 6;
  return { x: x - 32, y: y - h, w: 64, h: h + 4 };
}

/** A spot's icon centred on (x, y), about 24 across. */
export function drawKanoSpotIcon(g: G, spot: KanoSpotId, x: number, y: number): void {
  g.save();
  g.lineJoin = 'round';
  if (spot === 'sandyRoad') {
    box(g, x - 11, y - 1, 22, 10, '#5b5b62', 1);
    tri(g, x - 10, y + 5, x - 1, y - 7, x + 10, y + 5, SAND);
  } else if (spot === 'lightsOut') {
    line(g, '#5d6670', 2.4, [x - 3, y + 11, x - 3, y - 6, x + 4, y - 9]);
    disc(g, x + 5, y - 8, 4, '#7d858c', 1);
    line(g, INK, 1.2, [x + 5, y - 1, x + 11, y + 5]);
    line(g, INK, 1.2, [x + 11, y - 1, x + 5, y + 5]);
  } else if (spot === 'slowInternet') {
    line(g, '#5d6670', 1.8, [x - 8, y + 10, x - 3, y - 10, x + 2, y + 10]);
    for (let k = 0; k < 3; k++) box(g, x + 4 + k * 3.6, y + 4 - k * 3.6, 2.6, 4 + k * 3.6, k ? '#ffffff' : '#22a85a', 0.6);
  } else {
    line(g, '#5d6670', 3, [x - 9, y - 6, x + 2, y - 6, x + 2, y - 1]);
    box(g, x - 2, y - 11, 7, 3, '#5d6670', 0.8);
    box(g, x - 4, y + 3, 12, 8, '#ffffff', 1);
    line(g, INK, 1.2, [x + 6, y - 4, x + 11, y - 9]);
    line(g, INK, 1.2, [x + 6, y - 9, x + 11, y - 4]);
  }
  g.restore();
}

/**
 * A Kano pin standing at (x, y), screen px: a round sign with the spot's icon, a stem and its word
 * on a cream tag (as Lagos and Ogun). 'ready': a tick badge and "Ready". `bob` 0 to 4 px (0 with reduced motion).
 */
export function drawKanoPin(g: G, x: number, y: number, spot: KanoSpotId, state: 'problem' | 'ready' = 'problem', bob = 0): void {
  const P = KANO_PIN;
  const b = Number.isFinite(bob) ? Math.max(0, Math.min(4, bob)) : 0;
  g.save();
  oval(g, x, y, 9, 3, 'rgba(0,0,0,0.25)');
  g.translate(x, y - b);
  line(g, INK, 2.5, [0, 0, 0, -P.stem]);
  const word = state === 'ready' ? 'Ready' : KANO_SPOT_WORDS[spot];
  g.font = P.word;
  const m = g.measureText?.(word)?.width;
  const tw = Math.max(40, (typeof m === 'number' && m > 0 ? m : word.length * 7) + 12);
  const tagY = -P.stem - P.tagH;
  g.fillStyle = KANO.cream;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-tw / 2, tagY, tw, P.tagH, 5);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(word, 0, tagY + P.tagH / 2 + 0.5);
  const cy = tagY - 2 - P.r;
  disc(g, 0, cy, P.r, '#ffffff', 1);
  g.strokeStyle = state === 'ready' ? '#13703a' : '#b4561c';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, cy, P.r - 2, 0, TAU);
  g.stroke();
  drawKanoSpotIcon(g, spot, 0, cy);
  if (state === 'ready') {
    disc(g, 13, cy - 13, 8, '#22a85a', 1);
    line(g, '#ffffff', 2.4, [9, cy - 13, 12, cy - 10, 17, cy - 16]);
  }
  g.restore();
}

// ---------- People (drawn by the people kit, style 1.8) ----------

/** Who walks about Kano from above: the three street casts in turn, 16 looks, every skin tone, no child alone, nobody seated. */
export const KANO_CITY_CAST: readonly FolkLook[] = (() => {
  const ok = (l: FolkLook): boolean => l.age !== 'child' && !l.chair && !l.stool;
  const lists = [KURMI_CAST, KOFAR_MATA_CAST, DAWANAU_CAST].map((c) => c.filter(ok));
  const pool: FolkLook[] = [];
  for (let i = 0; i < 16; i++) for (const c of lists) if (c[i]) pool.push(c[i]!);
  // Every skin tone first, then the rest in turn
  const out = pool.filter((l, i) => pool.findIndex((o) => o.skin === l.skin) === i);
  for (const l of pool) if (out.length < 16 && !out.includes(l)) out.push(l);
  return out;
})();
