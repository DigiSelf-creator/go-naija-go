/**
 * The working places of the walkable city (docs/city.md part 5W, W3; step c1), in map units,
 * drawn on top of the still city picture each frame they move:
 *  - the Mama Put: a proud, busy cook at her food stall serving a short queue; each person
 *    takes a plate of rice, stew and dodo and walks off happy. Full tray: she sits and fans
 *    herself and the queue chats.
 *  - the Market: a row of stalls under one long roof, filling with tomatoes, peppers, onions,
 *    yams and plantain; a danfo pulls up, loads goods on its roof rack and drives off. Full
 *    tray: piled high and the danfo waits with its door open.
 * People are every age and dress from across Nigeria, drawn in our own small style, never a
 * real person. No brand on any stall, plate, bag or danfo. The only words are our own
 * "MAMA PUT" (an everyday name already on our street signs).
 *
 * Light: a handful of shapes each; at most 4 queue people, 1 porter and 1 danfo moving.
 * Reduced motion: pass still = true (people stand, no fan, no steam, no walking off) and
 * draw only when an amount changes.
 */
import { drawCityBus } from './city';
import { CREAM, INK, WHITE } from './palette';

const TAU = Math.PI * 2;

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

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, lw = 0.8): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.strokeRect(x, y, w, h);
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

const clamp01 = (k: number): number => (Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1);
const ease = (k: number): number => k * k * (3 - 2 * k);

// ---------- Small people (queue, porter, traders) ----------

/** One townsperson's look: skin, top, bottom, headwear (none, cap-free on purpose). */
export interface Folk {
  skin: string;
  top: string;
  bottom: string;
  head: 'short' | 'afro' | 'gele' | 'scarf' | 'grey' | 'braids';
  headCol: string;
  /** A long robe (kaftan, agbada, boubou) instead of top and bottom. */
  robe?: boolean;
  /** A little shorter (a child or a teen). */
  small?: boolean;
}

/** Every age and dress from across Nigeria: elders, school children, traders, workers. */
export const FOLK: readonly Folk[] = [
  { skin: '#7a4a2a', top: '#e9e1cf', bottom: '#e9e1cf', head: 'grey', headCol: '#b9b4ac', robe: true }, // elder in a white kaftan
  { skin: '#a8693f', top: '#f4f4f4', bottom: '#2b59c3', head: 'braids', headCol: '#1b1410', small: true }, // schoolgirl
  { skin: '#4b2c1a', top: '#e0572b', bottom: '#e0572b', head: 'gele', headCol: '#9b59b6', robe: true }, // woman in ankara and gele
  { skin: '#d9a172', top: '#16a3b8', bottom: '#3b3f4a', head: 'short', headCol: '#1b1410' }, // young man, plain shirt
  { skin: '#a8693f', top: '#13703a', bottom: '#13703a', head: 'scarf', headCol: '#f2b300', robe: true }, // woman in a long dress and headscarf
  { skin: '#7a4a2a', top: '#5a3e8f', bottom: '#5a3e8f', head: 'short', headCol: '#1b1410', robe: true }, // man in agbada
  { skin: '#f1c9a5', top: '#d6336c', bottom: '#2f5d8a', head: 'afro', headCol: '#20140e' }, // woman with an afro
  { skin: '#4b2c1a', top: '#f2b300', bottom: '#5b3a22', head: 'short', headCol: '#1b1410', small: true }, // boy
];

/**
 * A small person standing at (x, y) (feet), about 15 units tall, facing the screen or
 * (back) away. `step` 0..1 moves the feet when walking; `happy` adds a smile and a skip.
 * `plate`: holding a plate of food in front.
 */
export function drawFolk(g: CanvasRenderingContext2D, f: Folk, x: number, y: number, o: { step?: number; back?: boolean; plate?: boolean; happy?: boolean; turn?: -1 | 0 | 1 } = {}): void {
  const s = f.small ? 0.85 : 1;
  const step = o.step === undefined || !Number.isFinite(o.step) ? -1 : o.step;
  const lift = step >= 0 ? Math.sin(step * TAU) : 0;
  const hop = o.happy && step >= 0 ? Math.abs(lift) * 0.8 : 0;
  g.save();
  g.translate(x, y);
  oval(g, 0, 0.4, 4.6, 1.6, 'rgba(0,0,0,0.2)');
  g.scale(s, s);
  g.translate(0, -hop);
  // Legs
  line(g, f.robe ? f.skin : f.bottom, 1.8, [-1.3, -5, -1.3, -0.6 - Math.max(0, lift)]);
  line(g, f.robe ? f.skin : f.bottom, 1.8, [1.3, -5, 1.3, -0.6 - Math.max(0, -lift)]);
  // Body
  g.fillStyle = f.top;
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  g.beginPath();
  if (f.robe) {
    g.moveTo(-3, -11.5);
    g.lineTo(3, -11.5);
    g.lineTo(4, -2);
    g.lineTo(-4, -2);
  } else {
    g.moveTo(-3, -11.5);
    g.lineTo(3, -11.5);
    g.lineTo(2.6, -5);
    g.lineTo(-2.6, -5);
  }
  g.closePath();
  g.fill();
  g.stroke();
  if (!f.robe) box(g, -2.6, -6, 5.2, 1.6, f.bottom, 0.5);
  // Arms, or both hands holding a plate
  if (o.plate) {
    line(g, f.skin, 1.4, [-3, -10.5, -1.6, -7.4]);
    line(g, f.skin, 1.4, [3, -10.5, 1.6, -7.4]);
    if (!o.back) drawPlate(g, 0, -7.6, 3.2);
  } else {
    line(g, f.top, 1.5, [-3.2, -10.8, -3.6 + lift * 0.5, -6.6]);
    line(g, f.top, 1.5, [3.2, -10.8, 3.6 - lift * 0.5, -6.6]);
  }
  // Head and hair
  const hy = -14;
  if (f.head === 'afro') disc(g, 0, hy - 0.6, 3.7, f.headCol);
  disc(g, 0, hy, 2.7, f.skin);
  g.fillStyle = f.headCol;
  g.beginPath();
  if (f.head === 'gele') {
    g.moveTo(-3.6, hy - 0.4);
    g.lineTo(-2.4, hy - 4.6);
    g.lineTo(2.8, hy - 5);
    g.lineTo(3.8, hy - 0.6);
    g.closePath();
  } else if (f.head === 'scarf') g.arc(0, hy - 0.2, 3, Math.PI * (o.back ? 0.7 : 1), Math.PI * (o.back ? 2.3 : 2));
  else if (f.head === 'afro') g.arc(0, hy - 0.6, 3.7, Math.PI, TAU);
  else g.arc(0, hy - 0.2, 2.8, Math.PI * (o.back ? 0.8 : 1.1), Math.PI * (o.back ? 2.2 : 1.9));
  g.fill();
  if (f.head === 'braids') line(g, f.headCol, 0.9, [-2.4, hy, -2.6, hy + 4, 2.4, hy, 2.6, hy + 4]);
  if (!o.back) {
    const tx = (o.turn ?? 0) * 0.8;
    disc(g, -0.9 + tx, hy + 0.1, 0.35, INK);
    disc(g, 0.9 + tx, hy + 0.1, 0.35, INK);
    if (o.happy) {
      g.strokeStyle = INK;
      g.lineWidth = 0.45;
      g.beginPath();
      g.arc(tx, hy + 0.7, 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
  }
  g.restore();
}

/** A white enamel plate of rice and stew with fried plantain (dodo) and a little green, r units across. */
export function drawPlate(g: CanvasRenderingContext2D, x: number, y: number, r = 4): void {
  oval(g, x, y, r, r * 0.55, WHITE);
  g.strokeStyle = '#2b59c3';
  g.lineWidth = 0.6;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.55, 0, 0, TAU);
  g.stroke();
  oval(g, x - r * 0.2, y - r * 0.05, r * 0.55, r * 0.3, '#e9a03b'); // rice and stew
  oval(g, x + r * 0.45, y + r * 0.05, r * 0.28, r * 0.18, '#f2b300'); // dodo
  disc(g, x - r * 0.05, y - r * 0.2, r * 0.13, '#c0392b'); // stew
  disc(g, x + r * 0.15, y + r * 0.2, r * 0.12, '#3f8f4a'); // greens
}

// ---------- The Mama Put ----------

/** Seconds of play for one plate (W3). */
export const MAMA_PUT = { plateTime: 6, queueMax: 4, w: 70, h: 50 } as const;

export interface MamaPutState {
  /** Seconds, for the steam and the fan. */
  time?: number;
  /** Where the current plate is, 0..1 over MAMA_PUT.plateTime (serve, walk off, queue moves up). */
  plate?: number;
  /** Plates served so far: picks who stands in the queue, so faces change. */
  served?: number;
  /** People waiting, 0..4. */
  queue?: number;
  /** Tray full: the cook rests and fans herself, the queue chats. */
  full?: boolean;
  /** Going up, 0..1 (poles, roof, counter, then the cook). 1 or unset: built. */
  build?: number;
  /** Reduced motion. */
  still?: boolean;
}

/** The cook: a proud, busy woman in a headscarf and a clean white apron. */
const COOK: Folk = { skin: '#7a4a2a', top: '#c8641e', bottom: '#c8641e', head: 'scarf', headCol: '#2b59c3', robe: true };

/**
 * The Mama Put food stall with its front (the counter's foot) centred on (x, y), the door
 * the hero collects at. About 70 x 50 units, plus the queue to the right (up to 4 people,
 * 11 units apart) and the walk-off path down and right.
 */
export function drawMamaPut(g: CanvasRenderingContext2D, x: number, y: number, st: MamaPutState = {}): void {
  const build = st.build === undefined ? 1 : clamp01(st.build);
  const t = Number.isFinite(st.time) ? st.time! : 0;
  const still = st.still === true;
  const full = st.full === true;
  g.save();
  g.translate(x, y);
  oval(g, 2, 2, 38, 6, 'rgba(0,0,0,0.14)');
  // Poles rise first
  const pole = Math.min(build / 0.4, 1);
  for (const px of [-31, 31]) line(g, '#6b4a2b', 2.2, [px, 0, px, -36 * pole]);
  if (build >= 0.4) {
    // The roof drops in: a striped awning seen from above, its front edge with our sign
    const r = ease(Math.min((build - 0.4) / 0.3, 1));
    g.save();
    g.translate(0, -18 * (1 - r));
    g.globalAlpha = r;
    box(g, -36, -52, 72, 16, '#f3dca2', 1);
    g.fillStyle = '#c8641e';
    for (let k = 0; k < 6; k++) g.fillRect(-36 + k * 12, -52, 6, 16);
    g.strokeRect(-36, -52, 72, 16);
    box(g, -34, -38, 68, 6, CREAM, 0.8);
    g.fillStyle = INK;
    g.font = 'bold 5px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('MAMA PUT', 0, -34.8);
    g.restore();
  }
  if (build >= 0.7) {
    const r = Math.min((build - 0.7) / 0.3, 1);
    g.save();
    g.globalAlpha = r;
    // Back shelf with bowls
    box(g, -28, -30, 56, 6, '#8a5d36');
    oval(g, -18, -28, 5, 2, '#e9e1cf');
    oval(g, 18, -28, 5, 2, '#e9e1cf');
    // The cook behind the counter, ladle up and down; resting: on a stool by the side, fanning
    if (!full) {
      const arm = still ? 0 : Math.sin(t * 5) * 1.5;
      drawFolk(g, COOK, -3, -9, {});
      box(g, -6, -15, 6, 4, WHITE, 0.5); // apron
      line(g, '#8a8f96', 1, [0, -19 + arm, 7, -16 + arm]);
    }
    // Pots on the stove, with steam
    for (const [px, c] of [[-19, '#3a3a40'], [14, '#5d6670']] as const) {
      oval(g, px, -17, 7, 3.4, c);
      oval(g, px, -18, 5.2, 2.2, px < 0 ? '#e9a03b' : '#c0392b');
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(px, -17, 7, 3.4, 0, 0, TAU);
      g.stroke();
      if (!still && !full) {
        const d = Math.sin(t * 3 + px) * 1.5;
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(px, -21);
        g.quadraticCurveTo(px + 3 + d, -25, px, -29);
        g.stroke();
      }
    }
    // The counter with plates waiting
    box(g, -30, -12, 60, 12, '#9a6a3c', 1);
    g.fillStyle = '#b98a55';
    g.fillRect(-30, -12, 60, 3);
    for (const px of [-23, -15, 15, 23]) drawPlate(g, px, -11.5, 3);
    if (full) {
      // Resting: a stool at the side, the cook fanning herself with a woven hand fan
      box(g, -48, -4, 9, 4, '#8a5d36');
      drawFolk(g, COOK, -43.5, -2, {});
      box(g, -48, -8, 9, 4, WHITE, 0.5);
      const fa = still ? 0 : Math.sin(t * 6) * 0.5;
      g.save();
      g.translate(-39, -11);
      g.rotate(-0.6 + fa);
      line(g, '#6b4a2b', 1, [0, 0, 0, -4]);
      oval(g, 0, -6.5, 3, 3.4, '#e8c983');
      g.strokeStyle = '#13703a';
      g.lineWidth = 0.6;
      g.beginPath();
      g.ellipse(0, -6.5, 3, 3.4, 0, 0, TAU);
      g.stroke();
      g.restore();
    }
    g.restore();
  }
  if (build >= 1) drawQueue(g, st, still, full);
  g.restore();
}

function drawQueue(g: CanvasRenderingContext2D, st: MamaPutState, still: boolean, full: boolean): void {
  const n = Math.max(0, Math.min(MAMA_PUT.queueMax, Math.floor(Number.isFinite(st.queue) ? st.queue! : 3)));
  const served = Math.max(0, Math.floor(Number.isFinite(st.served) ? st.served! : 0));
  const p = still || full ? 0.2 : clamp01(st.plate ?? 0);
  const who = (i: number): Folk => FOLK[(served + i) % FOLK.length]!;
  const spot = (i: number): [number, number] => [40 + i * 11, 4 - (i % 2) * 2];
  // Queue moving up (0.6..1): everyone behind the first steps one place forward
  const move = p < 0.6 ? 0 : ease((p - 0.6) / 0.4);
  for (let i = n - 1; i >= 1; i--) {
    const [ax, ay] = spot(i);
    const [bx, by] = spot(i - 1);
    const walking = move > 0 && move < 1;
    drawFolk(g, who(i), ax + (bx - ax) * move, ay + (by - ay) * move, { turn: full ? (i % 2 ? 1 : -1) : -1, ...(walking ? { step: move * 2 } : {}) });
  }
  if (n === 0) return;
  // The first in the queue: waits (0..0.3), takes the plate, then walks off happy (0.3..0.75)
  const [fx, fy] = spot(0);
  if (p < 0.3) drawFolk(g, who(0), fx - (still ? 0 : 3 * ease(p / 0.3)), fy, { turn: -1, plate: still || full ? false : p > 0.2 });
  else if (p < 0.75) {
    const k = (p - 0.3) / 0.45;
    g.save();
    g.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    drawFolk(g, who(0), fx + k * 26, fy + k * 22, { plate: true, happy: true, step: k * 3 });
    g.restore();
  }
  if (full && n >= 2) {
    // The queue chats while they wait: a small bubble with three dots (no words)
    const [cx, cy] = spot(1);
    g.fillStyle = WHITE;
    g.strokeStyle = INK;
    g.lineWidth = 0.6;
    g.beginPath();
    g.roundRect(cx - 5, cy - 26, 11, 6, 3);
    g.fill();
    g.stroke();
    for (let d = 0; d < 3; d++) disc(g, cx - 2.4 + d * 2.6, cy - 23, 0.7, INK);
  }
}

// ---------- The Market ----------

/** Seconds of play for one danfo (W3) and the market's size. */
export const MARKET_PLACE = { danfoTime: 15, w: 150, h: 54 } as const;

export interface MarketState {
  /** How full the tables are, 0..1 (empty baskets to piled high). See danfoTrip. */
  stock?: number;
  /** Going up, 0..1 (poles, roof, tables, then the traders). 1 or unset: built. */
  build?: number;
}

const TRADER_A: Folk = { skin: '#4b2c1a', top: '#f39c12', bottom: '#f39c12', head: 'gele', headCol: '#13703a', robe: true };
const TRADER_B: Folk = { skin: '#a8693f', top: '#e9e1cf', bottom: '#e9e1cf', head: 'grey', headCol: '#b9b4ac', robe: true };
const TRADER_C: Folk = { skin: '#7a4a2a', top: '#2b59c3', bottom: '#2b59c3', head: 'scarf', headCol: '#d6336c', robe: true };

/** Produce on the tables: tomatoes, peppers, onions, yams, plantain. */
type Produce = 'tomato' | 'pepper' | 'onion' | 'yam' | 'plantain';
const TABLES: readonly (readonly [Produce, Produce])[] = [
  ['tomato', 'pepper'],
  ['onion', 'yam'],
  ['plantain', 'tomato'],
];

function heap(g: CanvasRenderingContext2D, kind: Produce, x: number, y: number, n: number): void {
  // A woven tray, then the pile on it (n = 0..6 pieces)
  oval(g, x, y, 7, 2.6, '#c99b55');
  for (let i = 0; i < n; i++) {
    const px = x - 4 + (i % 3) * 4 + (i >= 3 ? 2 : 0);
    const py = y - (i >= 3 ? 3.2 : 0.6);
    if (kind === 'tomato') disc(g, px, py, 1.9, '#d63a2a');
    else if (kind === 'pepper') {
      disc(g, px, py, 1.5, i % 2 ? '#e0402b' : '#f39c12');
      disc(g, px, py - 1.4, 0.5, '#3f8f4a');
    } else if (kind === 'onion') disc(g, px, py, 1.9, '#9b4f6e');
    else if (kind === 'yam') {
      g.fillStyle = '#7a5530';
      g.beginPath();
      g.ellipse(px, py, 3.2, 1.3, 0.3, 0, TAU);
      g.fill();
    } else {
      g.fillStyle = i % 2 ? '#f2c230' : '#a7c447';
      g.beginPath();
      g.ellipse(px, py, 3, 1.1, -0.4, 0, TAU);
      g.fill();
    }
  }
}

/**
 * The market stall row, its front middle at (x, y) (the door the hero collects at): three
 * stalls under one long zinc roof, 150 x 54 units, with traders behind the tables. `stock`
 * fills the tables from empty trays to piled high.
 */
export function drawMarketPlace(g: CanvasRenderingContext2D, x: number, y: number, st: MarketState = {}): void {
  const build = st.build === undefined ? 1 : clamp01(st.build);
  const stock = st.stock === undefined ? 1 : clamp01(st.stock);
  g.save();
  g.translate(x, y);
  oval(g, 0, 2, 76, 6, 'rgba(0,0,0,0.14)');
  const pole = Math.min(build / 0.4, 1);
  for (const px of [-70, -24, 24, 70]) line(g, '#6b4a2b', 2.2, [px, 0, px, -38 * pole]);
  if (build >= 0.4) {
    const r = ease(Math.min((build - 0.4) / 0.3, 1));
    g.save();
    g.translate(0, -18 * (1 - r));
    g.globalAlpha = r;
    // Zinc roof: grey ridges seen from above, a coloured cloth hanging at the front
    box(g, -75, -54, 150, 15, '#a9b2ba', 1);
    g.strokeStyle = '#8a939c';
    g.lineWidth = 1;
    g.beginPath();
    for (let k = -70; k < 75; k += 6) {
      g.moveTo(k, -53);
      g.lineTo(k, -40);
    }
    g.stroke();
    const cloth = ['#f2b300', '#16a3b8', '#d6336c'];
    for (let k = 0; k < 3; k++) box(g, -73 + k * 48.7, -40, 48.7, 4, cloth[k]!, 0.6);
    g.restore();
  }
  if (build >= 0.7) {
    const r = Math.min((build - 0.7) / 0.3, 1);
    g.save();
    g.globalAlpha = r;
    if (build >= 1) {
      drawFolk(g, TRADER_A, -44, -18, {});
      drawFolk(g, TRADER_B, 0, -18, {});
      drawFolk(g, TRADER_C, 44, -18, {});
    }
    TABLES.forEach(([a, b], k) => {
      const tx = -44 + k * 44;
      box(g, tx - 19, -14, 38, 11, '#8a5d36', 1);
      g.fillStyle = '#a8784a';
      g.fillRect(tx - 19, -14, 38, 2.5);
      const n = Math.round(stock * 6);
      heap(g, a, tx - 9, -9, n);
      heap(g, b, tx + 9, -9, Math.max(0, n - (k % 2)));
    });
    // Baskets on the ground at each end
    for (const bx of [-64, 64]) {
      oval(g, bx, -1, 5, 3, '#c99b55');
      g.strokeStyle = '#8a6634';
      g.lineWidth = 0.7;
      g.beginPath();
      g.ellipse(bx, -1, 5, 3, 0, 0, TAU);
      g.stroke();
      if (stock > 0.5) heap(g, bx < 0 ? 'yam' : 'onion', bx, -2, 3);
    }
    g.restore();
  }
  g.restore();
}

// ---------- The danfo that comes for goods ----------

export interface DanfoTrip {
  /** How far along the lane from its stop (map units): negative arriving, positive leaving. */
  dx: number;
  /** Goods on the roof rack, 0..1. */
  load: number;
  door: boolean;
  /** False when no danfo is on screen (between trips). */
  visible: boolean;
  /** The market's tables, 0..1: they fill between trips and empty into the danfo. */
  stock: number;
  /** The porter carrying a basket from the stalls to the danfo, 0..1, or -1 when none. */
  carry: number;
}

/**
 * The market's danfo trip at t (0..1 over MARKET_PLACE.danfoTime): arrives, opens its door,
 * is loaded, shuts, drives off, then the lane is empty while the tables fill again.
 * Full tray (W3): it waits at the stop, loaded, door open, and the tables stay piled high.
 * Reduced motion: use full or t = 0.4 and draw it only when an amount changes.
 */
export function danfoTrip(t: number, full = false): DanfoTrip {
  if (full) return { dx: 0, load: 1, door: true, visible: true, stock: 1, carry: -1 };
  const p = Number.isFinite(t) ? t - Math.floor(t) : 0;
  if (p < 0.2) {
    const k = p / 0.2;
    return { dx: -180 * (1 - ease(k)), load: 0, door: false, visible: true, stock: 1, carry: -1 };
  }
  if (p < 0.6) {
    const k = (p - 0.2) / 0.4;
    return { dx: 0, load: k, door: true, visible: true, stock: 1 - k * 0.7, carry: (k * 3) % 1 };
  }
  if (p < 0.8) {
    const k = (p - 0.6) / 0.2;
    return { dx: 200 * k * k, load: 1, door: false, visible: true, stock: 0.3, carry: -1 };
  }
  return { dx: 0, load: 0, door: false, visible: false, stock: 0.3 + ((p - 0.8) / 0.2) * 0.7, carry: -1 };
}

/**
 * The market's danfo (our plain yellow bus, going 'e') centred on (x, y) on the lane, with a
 * roof rack of sacks and baskets (`load` 0..1) and its sliding door open or shut.
 */
export function drawMarketDanfo(g: CanvasRenderingContext2D, x: number, y: number, load: number, door: boolean): void {
  const l = clamp01(load);
  g.save();
  drawCityBus(g, x, y, 'e');
  // Roof rack
  g.strokeStyle = '#5d6670';
  g.lineWidth = 1;
  g.strokeRect(x - 18, y - 12, 34, 9);
  const goods = Math.round(l * 5);
  const cols = ['#e9e1cf', '#c99b55', '#13703a', '#e9e1cf', '#c8641e'];
  for (let k = 0; k < goods; k++) {
    const gx = x - 14 + k * 7;
    oval(g, gx, y - 7.5, 3.4, 3.2, cols[k]!);
    g.strokeStyle = INK;
    g.lineWidth = 0.6;
    g.beginPath();
    g.ellipse(gx, y - 7.5, 3.4, 3.2, 0, 0, TAU);
    g.stroke();
  }
  // Sliding door on the near wall
  g.fillStyle = door ? '#3a3a40' : '#c99d0a';
  g.fillRect(x + 8, y - 1.5, 7, 9);
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.strokeRect(x + 8, y - 1.5, 7, 9);
  g.restore();
}

/** A porter carrying a basket of produce on the head from (x0, y0) to (x1, y1), k 0..1 (there and back). */
export function drawPorter(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, k: number): void {
  const p = clamp01(k);
  const there = p < 0.5;
  const s = there ? p * 2 : (1 - p) * 2;
  const x = x0 + (x1 - x0) * s;
  const y = y0 + (y1 - y0) * s;
  const f: Folk = { skin: '#7a4a2a', top: '#16a3b8', bottom: '#3b3f4a', head: 'short', headCol: '#1b1410' };
  drawFolk(g, f, x, y, { step: p * 4, back: !there });
  if (there) {
    oval(g, x, y - 18.5, 4.5, 2, '#c99b55');
    disc(g, x - 1.5, y - 19.5, 1.4, '#d63a2a');
    disc(g, x + 1.5, y - 19.6, 1.4, '#f39c12');
  }
}
