/**
 * Tired and bright Lagos (docs/city.md part 5 step (d), d2 and d4; S3d1a): the small pieces
 * that make a block look "a bit faded but still warm and proud" or bright and busy.
 *
 * Tired, never bad: warm faded colours (never grey or blue), some shops not open yet, one neat
 * tied sack and a box waiting by the kerb (never spilled, never near food). Every block has
 * someone doing something proud in both looks (sweeping, opening a shutter, setting out goods,
 * reading on a bench, at a sewing machine). No broken glass, no writing on walls, no one
 * begging, no stray animals, no flies or smell lines. All our own shapes, in map units.
 *
 * city.ts puts these together per block (drawCityBlock with `opts.bright`); they are exported
 * for the gallery and for tests. `BLOCK_LIFE` is the d2 table.
 */
import { INK, WHITE } from './palette';

const TAU = Math.PI * 2;

/**
 * The warm sand that tired colours lean toward (d2). A mid sand, darker than the bright pastel
 * roofs, so tired and bright differ in lightness too (greyscale and colour-blind safe), not hue alone.
 */
export const TIRED_SAND = '#c9b48c';
/** How far a tired colour leans toward the sand (Tp, 13 Nov: stronger, about half). */
export const TIRED_MIX = 0.5;
/** Tired roofs (the biggest thing at far zoom) lean this much further toward a warm dusty brown. */
export const TIRED_ROOF_DIM = 0.22;
export const TIRED_ROOF_DUST = '#9a8262';
/** Bright walls and roofs get this much more colour (HSL saturation, times 1 + boost). */
export const BRIGHT_BOOST = 0.18;

/** Tired look colours (d2). Warm and sun-faded, never grey or cold. */
export const TIRED_COLOURS = {
  window: '#5a4a3a',
  shutter: '#8f8578',
  shutterLine: '#6d655a',
  leaves: '#968a50',
  leavesLight: '#ab9e62',
  dryGrass: '#bba468',
  /** The pavement of a tired block: a little dustier than the bright cream. */
  lot: '#e6d4ae',
  kerb: '#b49e74',
  /** Dust on a tired bus park's tarmac (how far it leans toward the sand). */
  roadDust: 0.22,
  /** How far a tired park's grass leans toward the sand (under the dry patches). */
  grassFade: 0.35,
} as const;

/** HSL (each 0 to 1) of a #rrggbb colour. */
function toHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  return { h, s, l };
}

/** Faded colours below this saturation (cool blues and greens go greyish) fade again, so they stay warm. */
export const TIRED_MIN_SAT = 0.2;

/** A tired wall or awning: faded toward the sand; a cool colour that went greyish fades once more, warm. */
export function tiredColour(hex: string): string {
  const c = fadeColour(hex);
  if (c === hex || toHsl(c).s >= TIRED_MIN_SAT) return c;
  return fadeColour(c);
}

/** A tired roof: a tired colour, then a little further toward warm dusty brown. */
export function tiredRoof(hex: string): string {
  return fadeColour(tiredColour(hex), TIRED_ROOF_DIM, TIRED_ROOF_DUST);
}

/** A bright wall or roof: the same colour with `k` more saturation (lightness kept). */
export function brightColour(hex: string, k: number = BRIGHT_BOOST): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !Number.isFinite(k)) return hex;
  const { h, s: s0, l } = toHsl(hex);
  if (s0 === 0) return hex.toLowerCase();
  const s = Math.min(1, s0 * (1 + k));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number): number => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const hx = (v: number): string => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${hx(hue(h + 1 / 3))}${hx(hue(h))}${hx(hue(h - 1 / 3))}`;
}

/** A #rrggbb colour mixed `k` of the way toward `to` (default: tired, 50% toward warm sand). */
export function fadeColour(hex: string, k: number = TIRED_MIX, to: string = TIRED_SAND): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !Number.isFinite(a) || !Number.isFinite(k)) return hex;
  const ch = (s: number): string => {
    const p = (a >> s) & 255;
    const q = (b >> s) & 255;
    return Math.round(p + (q - p) * Math.max(0, Math.min(1, k)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

// ---------- The d2 table ----------

/** What the proud person on each block is doing (tired and bright). */
export type ProudKind = 'trader' | 'sweeper' | 'reader' | 'opener' | 'tailor' | 'setter' | 'schoolgirl' | 'repairer' | 'basket' | 'waiter' | 'newspaper';
export const PROUD_KINDS: readonly ProudKind[] = ['trader', 'sweeper', 'reader', 'opener', 'tailor', 'setter', 'schoolgirl', 'repairer', 'basket', 'waiter', 'newspaper'];

/** The one thing a bright block adds beyond goods and people. */
export type BrightExtra = 'plants' | 'fruit' | 'pitch' | 'washing' | 'goods' | 'flats' | 'screens' | 'lamps' | 'umbrellas';

export interface BlockLife {
  /** Shop fronts (one per building box). */
  fronts: number;
  /** Tired: how many have the shutter down (every front but `open`). */
  shutters: number;
  /** Tired: neat kerb sacks (0 where food is sold or served). */
  sacks: number;
  /** The proud person (both looks) and the box they stand at. */
  proud: ProudKind;
  open: number;
  /** Tired people (always 1) and bright people (the proud one included). */
  tiredPeople: number;
  people: number;
  extra: BrightExtra;
}

/** d2, block by block (ids as CITY_BLOCKS). */
export const BLOCK_LIFE: Readonly<Record<string, BlockLife>> = {
  r0c0: { fronts: 3, shutters: 2, sacks: 1, proud: 'trader', open: 1, tiredPeople: 1, people: 4, extra: 'plants' },
  r0c1: { fronts: 2, shutters: 1, sacks: 1, proud: 'sweeper', open: 0, tiredPeople: 1, people: 4, extra: 'fruit' },
  r0c2: { fronts: 1, shutters: 0, sacks: 0, proud: 'reader', open: 0, tiredPeople: 1, people: 3, extra: 'pitch' },
  r0c3: { fronts: 3, shutters: 2, sacks: 1, proud: 'opener', open: 2, tiredPeople: 1, people: 4, extra: 'washing' },
  r1c0: { fronts: 3, shutters: 2, sacks: 1, proud: 'tailor', open: 0, tiredPeople: 1, people: 4, extra: 'goods' },
  r1c1: { fronts: 2, shutters: 1, sacks: 1, proud: 'setter', open: 1, tiredPeople: 1, people: 4, extra: 'flats' },
  r1c2: { fronts: 2, shutters: 1, sacks: 1, proud: 'schoolgirl', open: 0, tiredPeople: 1, people: 4, extra: 'goods' },
  r1c3: { fronts: 3, shutters: 2, sacks: 1, proud: 'repairer', open: 1, tiredPeople: 1, people: 9, extra: 'screens' },
  r2c0: { fronts: 3, shutters: 2, sacks: 1, proud: 'basket', open: 2, tiredPeople: 1, people: 4, extra: 'goods' },
  r2c1: { fronts: 2, shutters: 1, sacks: 1, proud: 'waiter', open: 0, tiredPeople: 1, people: 9, extra: 'lamps' },
  r2c2: { fronts: 2, shutters: 1, sacks: 0, proud: 'newspaper', open: 1, tiredPeople: 1, people: 4, extra: 'goods' },
  r2c3: { fronts: 3, shutters: 0, sacks: 0, proud: 'setter', open: -1, tiredPeople: 1, people: 5, extra: 'umbrellas' },
};

/** Totals when every block is tired: 15 shutters (d2's rows; its totals line says 18), 9 kerb sacks, 12 people. */
export function tiredTotals(): { shutters: number; sacks: number; people: number } {
  let shutters = 0;
  let sacks = 0;
  let people = 0;
  for (const l of Object.values(BLOCK_LIFE)) {
    shutters += l.shutters;
    sacks += l.sacks;
    people += l.tiredPeople;
  }
  return { shutters, sacks, people };
}

// ---------- Small helpers ----------

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge?: string, ew = 0.6): void {
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

function line(g: CanvasRenderingContext2D, colour: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

// ---------- People ----------

const SKINS = ['#f1c9a5', '#d9a172', '#a8693f', '#7a4a2a', '#4b2c1a'] as const;
const TOPS = ['#e0572b', '#2b59c3', '#f2b300', '#1aa39a', '#9b59b6', '#e9e1cf', '#d6336c'] as const;

/** A tiny person seen from above at an angle (feet at x, y), about 12 units tall. */
export function drawCityFolk(g: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  oval(g, x + 1, y + 0.5, 3, 1.2, 'rgba(0,0,0,0.15)');
  oval(g, x, y - 3.5, 2.6, 3.8, TOPS[Math.abs(i) % TOPS.length]!);
  disc(g, x, y - 8.5, 2.2, SKINS[(Math.abs(i) * 3) % SKINS.length]!);
}

/**
 * The proud person of a block (d2), feet at (x, y): a townsperson with what they are doing.
 * `i` picks skin and clothes (every skin of the hero builder shows up across the blocks).
 */
export function drawProudFolk(g: CanvasRenderingContext2D, x: number, y: number, kind: ProudKind, i = 0): void {
  switch (kind) {
    case 'trader': {
      // Behind a small table of tomatoes and peppers
      drawCityFolk(g, x, y - 3, i);
      rect(g, x - 7, y - 3, 14, 4, '#8a5d36', INK);
      for (let k = 0; k < 4; k++) disc(g, x - 5 + k * 3.3, y - 3.6, 1.3, k % 2 ? '#2f9a3a' : '#d8342a');
      break;
    }
    case 'sweeper': {
      // A broom in both hands, sweeping her own front
      drawCityFolk(g, x, y, i);
      line(g, '#8a5d36', 1, [x + 2, y - 5, x + 7, y + 0.5]);
      g.fillStyle = '#d9b86a';
      g.beginPath();
      g.moveTo(x + 5.5, y - 0.5);
      g.lineTo(x + 10, y + 1.2);
      g.lineTo(x + 8, y + 2.2);
      g.closePath();
      g.fill();
      break;
    }
    case 'reader': {
      // An elder reading on a bench: grey hair, a book open in the hands
      rect(g, x - 8, y - 4, 16, 2.5, '#9a6a3c', INK);
      line(g, '#6b4a2b', 1, [x - 7, y - 1.5, x - 7, y + 1, x + 7, y + 1, x + 7, y - 1.5]);
      oval(g, x + 1, y + 0.5, 3, 1.2, 'rgba(0,0,0,0.15)');
      oval(g, x, y - 5.5, 2.8, 3.4, '#e9e1cf');
      disc(g, x, y - 10, 2.2, SKINS[(Math.abs(i) * 3) % SKINS.length]!);
      g.fillStyle = '#c9c4bb';
      g.beginPath();
      g.arc(x, y - 10.4, 2.3, Math.PI, TAU);
      g.fill();
      rect(g, x - 2.5, y - 6.5, 5, 3, WHITE, INK, 0.4);
      line(g, INK, 0.4, [x, y - 6.5, x, y - 3.5]);
      break;
    }
    case 'opener': {
      // Arms up, lifting his shutter for the day
      drawCityFolk(g, x, y, i);
      line(g, SKINS[(Math.abs(i) * 3) % SKINS.length]!, 1, [x - 2, y - 6, x - 3, y - 11]);
      line(g, SKINS[(Math.abs(i) * 3) % SKINS.length]!, 1, [x + 2, y - 6, x + 3, y - 11]);
      break;
    }
    case 'tailor': {
      // At a sewing machine on a table, bright cloth beside it
      drawCityFolk(g, x, y - 3, i);
      rect(g, x - 8, y - 3, 16, 4, '#8a5d36', INK);
      rect(g, x - 5, y - 6.5, 6, 3.5, '#2b2f36', INK, 0.4);
      disc(g, x + 1.5, y - 5, 1.4, '#c9c4bb');
      rect(g, x + 2.5, y - 4.5, 5, 1.6, '#d6336c');
      break;
    }
    case 'setter': {
      // Setting out goods from a crate
      drawCityFolk(g, x, y, i);
      rect(g, x + 3, y - 3, 7, 4, '#b8864f', INK);
      for (let k = 0; k < 3; k++) disc(g, x + 4.6 + k * 2, y - 3.3, 1, k === 1 ? '#f2b300' : '#d8342a');
      break;
    }
    case 'schoolgirl': {
      // Off to school: a blue bag on her back, hair in two puffs
      oval(g, x + 1, y + 0.5, 2.6, 1, 'rgba(0,0,0,0.15)');
      rect(g, x - 3.6, y - 6.5, 2.4, 3.4, '#2b59c3', INK, 0.4);
      oval(g, x, y - 3, 2.2, 3.2, '#f4f4f4');
      line(g, '#2b59c3', 1.4, [x - 1.5, y - 1, x + 1.5, y - 1]);
      disc(g, x, y - 7.5, 2, SKINS[(Math.abs(i) * 3 + 1) % SKINS.length]!);
      disc(g, x - 1.8, y - 9.2, 1, '#1b1410');
      disc(g, x + 1.8, y - 9.2, 1, '#1b1410');
      break;
    }
    case 'repairer': {
      // A phone repairer at his table: two phones and a little lamp
      drawCityFolk(g, x, y - 3, i);
      rect(g, x - 8, y - 3, 16, 4, '#8a5d36', INK);
      rect(g, x - 6, y - 4.2, 2.4, 3.6, '#2b2f36');
      rect(g, x - 2.5, y - 4.2, 2.4, 3.6, '#2b2f36');
      line(g, '#5d6670', 0.8, [x + 4, y - 3, x + 4, y - 7, x + 6, y - 7]);
      disc(g, x + 6.3, y - 6.6, 1, '#ffe27a');
      break;
    }
    case 'basket': {
      // A basket of fruit carried on the head
      drawCityFolk(g, x, y, i);
      oval(g, x, y - 11.4, 3.8, 1.6, '#c9a26b');
      disc(g, x - 1.4, y - 12.4, 1.1, '#f39c12');
      disc(g, x + 1.2, y - 12.6, 1.1, '#2f9a3a');
      g.strokeStyle = '#8a6a3a';
      g.lineWidth = 0.4;
      g.beginPath();
      g.ellipse(x, y - 11.4, 3.8, 1.6, 0, 0, TAU);
      g.stroke();
      break;
    }
    case 'waiter': {
      // Waiting at the stop: a plain stop post with a yellow plate (no words)
      line(g, '#5d6670', 1, [x + 6, y + 0.5, x + 6, y - 14]);
      rect(g, x + 3.5, y - 16.5, 5, 3.5, '#f2b300', INK, 0.5);
      drawCityFolk(g, x, y, i);
      break;
    }
    case 'newspaper': {
      // Reading a newspaper held open (no words on it, just grey lines)
      drawCityFolk(g, x, y, i);
      rect(g, x - 3.5, y - 7.5, 7, 4.5, '#f4f1e6', INK, 0.4);
      line(g, '#9a9a9a', 0.4, [x - 2.5, y - 6, x + 2.5, y - 6]);
      line(g, '#9a9a9a', 0.4, [x - 2.5, y - 4.6, x + 2.5, y - 4.6]);
      break;
    }
  }
}

/** Two children playing with a ball (the park when bright). */
export function drawChildrenWithBall(g: CanvasRenderingContext2D, x: number, y: number, i = 0): void {
  g.save();
  g.translate(x, y);
  g.scale(0.82, 0.82);
  drawCityFolk(g, -10, 0, i + 2);
  drawCityFolk(g, 10, -2, i + 5);
  g.restore();
  disc(g, x, y - 1, 1.6, WHITE);
  g.strokeStyle = INK;
  g.lineWidth = 0.4;
  g.beginPath();
  g.arc(x, y - 1, 1.6, 0, TAU);
  g.stroke();
}

// ---------- Shop fronts ----------

/**
 * A roll-down shutter over a shop window (x, y, w, h in map units). 'down': brown-grey with 4
 * flat lines across. 'half': down over the top half (being lifted). 'up': only the thin roll at
 * the top shows.
 */
export function drawShutter(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, state: 'down' | 'half' | 'up'): void {
  if (state === 'up') {
    rect(g, x, y - 1, w, 2, TIRED_COLOURS.shutter, INK, 0.4);
    return;
  }
  const hh = state === 'half' ? h * 0.5 : h;
  rect(g, x, y, w, hh, TIRED_COLOURS.shutter, INK, 0.5);
  g.fillStyle = TIRED_COLOURS.shutterLine;
  const n = state === 'half' ? 2 : 4;
  for (let k = 1; k <= n; k++) g.fillRect(x + 0.5, y + (hh * k) / (n + 1) - 0.3, w - 1, 0.7);
}

export type GoodsKind = 'tomatoes' | 'cloth' | 'boxes';
export const GOODS_KINDS: readonly GoodsKind[] = ['tomatoes', 'cloth', 'boxes'];

/** Goods out in front of an open shop (feet at x, y): a crate of tomatoes, a rack of cloth or a stack of plain boxes (no brand, no writing). */
export function drawGoods(g: CanvasRenderingContext2D, x: number, y: number, kind: GoodsKind): void {
  oval(g, x + 1, y + 0.5, 5, 1.3, 'rgba(0,0,0,0.14)');
  if (kind === 'tomatoes') {
    rect(g, x - 4.5, y - 3.5, 9, 3.5, '#b8864f', INK, 0.5);
    for (let k = 0; k < 4; k++) disc(g, x - 3.2 + k * 2.2, y - 3.8, 1.2, '#d8342a');
  } else if (kind === 'cloth') {
    line(g, '#5d6670', 0.7, [x - 5, y, x - 5, y - 8, x + 5, y - 8, x + 5, y]);
    const cols = ['#e0572b', '#13703a', '#f2b300', '#2b59c3'];
    for (let k = 0; k < 4; k++) rect(g, x - 4.4 + k * 2.3, y - 7.6, 2, 5.6, cols[k]!);
  } else {
    rect(g, x - 4.5, y - 3.5, 5, 3.5, '#c9a26b', INK, 0.4);
    rect(g, x + 0.5, y - 3.5, 4, 3.5, '#d6b47a', INK, 0.4);
    rect(g, x - 2.5, y - 6.5, 5, 3, '#c9a26b', INK, 0.4);
  }
}

/** A neat tied sack and a closed box by the kerb, waiting to be collected (never spilled). */
export function drawKerbSack(g: CanvasRenderingContext2D, x: number, y: number): void {
  oval(g, x + 2, y + 0.6, 6, 1.5, 'rgba(0,0,0,0.14)');
  rect(g, x + 1.5, y - 3.2, 5, 3.2, '#c9a26b', INK, 0.4);
  line(g, '#a8844f', 0.4, [x + 1.5, y - 2.2, x + 6.5, y - 2.2]);
  g.fillStyle = '#e8e0cc';
  g.strokeStyle = INK;
  g.lineWidth = 0.4;
  g.beginPath();
  g.moveTo(x - 3, y);
  g.quadraticCurveTo(x - 4, y - 4, x - 1, y - 5);
  g.lineTo(x, y - 5);
  g.quadraticCurveTo(x + 3, y - 4, x + 2, y);
  g.closePath();
  g.fill();
  g.stroke();
  // The tie at the top
  line(g, '#2f9a3a', 0.8, [x - 1.6, y - 5.6, x - 0.5, y - 5, x + 0.6, y - 5.6]);
}

// ---------- Trees, plants, extras ----------

/**
 * A round tree at (x, y) (trunk foot), radius r. Tired: 80% size with dull olive-ochre leaves.
 */
export function drawCityTree(g: CanvasRenderingContext2D, x: number, y: number, r: number, tired = false): void {
  const rr = tired ? r * 0.8 : r;
  oval(g, x + 3, y + 2, rr, rr * 0.5, 'rgba(0,0,0,0.12)');
  rect(g, x - 1.5, y - 8, 3, 8, '#7a5a3a');
  disc(g, x, y - 12, rr, tired ? TIRED_COLOURS.leaves : '#8fb866');
  disc(g, x - rr * 0.3, y - 14, rr * 0.6, tired ? TIRED_COLOURS.leavesLight : '#a6cf72');
}

/** A palm on the shore (x, y = foot). Tired: a little smaller, olive-brown fronds. */
export function drawCityPalm(g: CanvasRenderingContext2D, x: number, y: number, tired = false): void {
  const h = tired ? 19 : 22;
  line(g, '#7a5a3a', 2.2, [x, y, x + 1, y - h]);
  g.fillStyle = tired ? TIRED_COLOURS.leaves : '#3f8f4a';
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    g.beginPath();
    g.ellipse(x + 1 + Math.cos(a) * 6, y - h + Math.sin(a) * 3, tired ? 6 : 7, 2, a, 0, TAU);
    g.fill();
  }
}

/** A potted plant by a door. */
export function drawPottedPlant(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#c0643a';
  g.beginPath();
  g.moveTo(x - 2.2, y - 3);
  g.lineTo(x + 2.2, y - 3);
  g.lineTo(x + 1.5, y);
  g.lineTo(x - 1.5, y);
  g.closePath();
  g.fill();
  disc(g, x, y - 5, 2.6, '#3f8f4a');
  disc(g, x - 0.8, y - 5.8, 1.2, '#7cc06a');
}

/** A fruit seller's umbrella over a small table of fruit (a seller beside it). */
export function drawFruitUmbrella(g: CanvasRenderingContext2D, x: number, y: number, i = 0): void {
  oval(g, x + 3, y + 1, 11, 3, 'rgba(0,0,0,0.14)');
  rect(g, x - 6, y - 4, 12, 4, '#8a5d36', INK, 0.5);
  const fruit = ['#f39c12', '#2f9a3a', '#f2d06b', '#d8342a'];
  for (let k = 0; k < 4; k++) disc(g, x - 4 + k * 2.7, y - 4.4, 1.2, fruit[k]!);
  line(g, '#5d6670', 1, [x, y - 4, x, y - 15]);
  oval(g, x, y - 16, 11, 4.5, '#e0572b');
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  g.beginPath();
  g.ellipse(x, y - 16, 11, 4.5, 0, 0, TAU);
  g.moveTo(x - 11, y - 16);
  g.lineTo(x + 11, y - 16);
  g.stroke();
  oval(g, x - 5, y - 16.5, 4, 2, '#f2b300');
  drawCityFolk(g, x + 9, y + 1, i);
}

/** Washing drying on a line across a roof (x0..x1 at y). */
export function drawWashingLine(g: CanvasRenderingContext2D, x0: number, x1: number, y: number): void {
  line(g, '#5d6670', 0.8, [x0, y + 3, x0, y - 6]);
  line(g, '#5d6670', 0.8, [x1, y + 3, x1, y - 6]);
  line(g, '#5d6670', 0.4, [x0, y - 5.5, x1, y - 5.5]);
  const cols = ['#2b59c3', WHITE, '#e0572b', '#f2b300', '#13703a', '#d6336c'];
  const n = Math.max(2, Math.floor((x1 - x0 - 4) / 6));
  for (let k = 0; k < n; k++) rect(g, x0 + 3 + k * 6, y - 5.5, 4, 5 + (k % 2), cols[k % cols.length]!, INK, 0.3);
}

/** A folded market umbrella: a pole with the shade closed round it (the market before it opens). */
export function drawFoldedUmbrella(g: CanvasRenderingContext2D, x: number, y: number, colour: string): void {
  line(g, '#5d6670', 1.2, [x, y, x, y - 24]);
  g.fillStyle = colour;
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(x, y - 25);
  g.lineTo(x + 2.4, y - 18);
  g.lineTo(x + 1.2, y - 9);
  g.lineTo(x - 1.2, y - 9);
  g.lineTo(x - 2.4, y - 18);
  g.closePath();
  g.fill();
  g.stroke();
  line(g, INK, 0.5, [x - 2, y - 15, x + 2, y - 15]);
}
