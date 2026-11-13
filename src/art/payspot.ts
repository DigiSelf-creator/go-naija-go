/**
 * Pay spots, money and signs for walking the city (docs/city.md part 5W, W2 to W4, W9; step c1).
 *
 * Our own pay spot: a woven mat on the ground with a chalk market price board on a stick
 * beside it, like the boards at a Nigerian market stall, and a faint chalk outline of what
 * will be built standing behind. Never a dashed square plot, never a dollar tile or a green
 * banknote; our money is Naira coins, Power bulbs and Tech chips (the bucket icons).
 *
 * Two kinds of units:
 *  - Map units (drawn under the camera): the mat, the chalk outlines, the road being built.
 *  - Screen px (draw after undoing the camera's scale, like the pins): the price board, tray
 *    bubbles, flying money, the collect line and the edge arrows. Their tap areas are at
 *    least 48 x 48 px at every zoom (priceBoardBox, trayBubbleBox, EDGE_ARROW).
 *
 * Words are drawn with the phone's sans-serif font. The tick in "Done ✓" is drawn, so it shows
 * even where the font has no tick.
 */
import { CREAM, INK, WHITE } from './palette';
import { drawBucketIcon, drawSpotIcon, type BucketKind, type SpotId } from './city';

const TAU = Math.PI * 2;

// ---------- What each board builds (W2 table) ----------

export type BuildId = 'road' | 'mamaPut' | 'market' | 'lamps' | 'mast';
export const BUILD_IDS: readonly BuildId[] = ['road', 'mamaPut', 'market', 'lamps', 'mast'];

/** Each board's bucket, full price (whole naira, or Power or Tech units) and name (W2, W8). */
export const BUILDS: Record<BuildId, { bucket: BucketKind; price: number; name: string }> = {
  road: { bucket: 'naira', price: 10, name: 'New road' },
  mamaPut: { bucket: 'naira', price: 4, name: 'Mama Put' },
  market: { bucket: 'naira', price: 8, name: 'Market' },
  lamps: { bucket: 'power', price: 10, name: 'Lamps' },
  mast: { bucket: 'tech', price: 6, name: 'Mast' },
};

/** A price in a bucket's words: "₦10", "₦4.50", "Power 10", "Tech 6". */
export function priceWords(bucket: BucketKind, amount: number): string {
  const n = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (bucket === 'naira') return `₦${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return `${bucket === 'power' ? 'Power' : 'Tech'} ${Math.ceil(n)}`;
}

/** Money waiting in a tray: "80 kobo" under ₦1, else "₦1.20" (W3). */
export function trayWords(kobo: number): string {
  const k = Number.isFinite(kobo) ? Math.max(0, Math.round(kobo)) : 0;
  return k < 100 ? `${k} kobo` : `₦${(k / 100).toFixed(2)}`;
}

// ---------- Paying and collecting: timing (W2, W4) ----------

export const PAY = {
  /** Stand still this long on a mat before paying starts (none in Gentle mode). */
  standWait: 0.3,
  /** One piece of money flies this often (s). */
  every: 0.06,
  /** At most this many pieces drawn, whatever the price. */
  maxDrawn: 12,
  /** Each piece's flight (s). */
  flight: 0.4,
  /** Paying takes base + perUnit for each ₦1 (or 1 Power or Tech), at most max (s). */
  base: 0.8,
  perUnit: 0.1,
  max: 1.6,
  /** The "not enough" wobble (s). */
  wobble: 0.4,
  /** The collect line shows this long (s). */
  collectLine: 1.5,
} as const;

/** How long paying `units` takes (s). */
export function payTime(units: number): number {
  const u = Number.isFinite(units) ? Math.max(0, units) : 0;
  return Math.min(PAY.base + PAY.perUnit * u, PAY.max);
}

/** How many pieces fly for `units` (1 to 12). */
export function flyingCount(units: number): number {
  const u = Number.isFinite(units) ? Math.ceil(Math.max(0, units)) : 0;
  return Math.max(1, Math.min(PAY.maxDrawn, u));
}

/** The board's sideways wobble in px at t s after a "not enough" (0 after PAY.wobble). */
export function boardWobble(t: number): number {
  if (!Number.isFinite(t) || t < 0 || t >= PAY.wobble) return 0;
  return Math.sin((t / PAY.wobble) * TAU * 2) * 4 * (1 - t / PAY.wobble);
}

// ---------- Small helpers ----------

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function line(g: CanvasRenderingContext2D, colour: string, w: number, pts: readonly number[]): void {
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

function textW(g: CanvasRenderingContext2D, text: string, px: number): number {
  const m = typeof g.measureText === 'function' ? g.measureText(text) : undefined;
  const w = m?.width;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : text.length * px * 0.6;
}

function tick(g: CanvasRenderingContext2D, x: number, y: number, s: number, colour: string): void {
  line(g, colour, 2.2, [x - s, y, x - s * 0.3, y + s * 0.7, x + s, y - s * 0.8]);
}

// ---------- The woven mat (map units) ----------

export const MAT = { w: 80, h: 56 } as const;

/**
 * The woven pay mat centred on (x, y): straw weave with green and orange bands and a short
 * fringe on each end. `active`: the hero stands on it (a warm edge, and never colour alone:
 * the money flying says it too).
 */
export function drawPayMat(g: CanvasRenderingContext2D, x: number, y: number, active = false): void {
  const w = MAT.w;
  const h = MAT.h;
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fillRect(x0 + 3, y0 + 3, w, h);
  g.fillStyle = '#e8c983';
  g.fillRect(x0, y0, w, h);
  // The weave: short strands, every other one darker, rows offset
  g.fillStyle = '#c99b55';
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 10; c++) if ((r + c) % 2 === 0) g.fillRect(x0 + 2 + c * 7.6, y0 + 2 + r * 7.6, 6.4, 3.2);
  g.fillStyle = '#d9b46c';
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 10; c++) if ((r + c) % 2 === 1) g.fillRect(x0 + 4.4 + c * 7.6, y0 + 1 + r * 7.6, 3.2, 6.4);
  // Coloured bands
  g.fillStyle = '#13703a';
  g.fillRect(x0, y0 + 9, w, 4);
  g.fillRect(x0, y0 + h - 13, w, 4);
  g.fillStyle = '#c8641e';
  g.fillRect(x0, y0 + h / 2 - 2.5, w, 5);
  // Fringe
  g.strokeStyle = '#b48a48';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let k = 0; k < 9; k++) {
    const fy = y0 + 4 + k * ((h - 8) / 8);
    g.moveTo(x0, fy);
    g.lineTo(x0 - 5, fy + 1);
    g.moveTo(x0 + w, fy);
    g.lineTo(x0 + w + 5, fy + 1);
  }
  g.stroke();
  g.strokeStyle = active ? '#f2b300' : '#8a6634';
  g.lineWidth = active ? 3 : 1.5;
  g.strokeRect(x0, y0, w, h);
  g.restore();
}

// ---------- Chalk outlines of what will be built (map units) ----------

type Part = { r: readonly [number, number, number, number] } | { l: readonly number[] } | { c: readonly [number, number, number] };

const OUTLINES: Record<BuildId, readonly Part[]> = {
  // Fresh tarmac on the Alausa road: the strip, its edges and lane marks (x, y = bottom middle)
  road: [{ r: [-31, -182, 62, 182] }, { l: [-27, -182, -27, 0] }, { l: [27, -182, 27, 0] }, ...[0, 1, 2, 3, 4].map((k): Part => ({ l: [0, -170 + k * 36, 0, -152 + k * 36] }))],
  // A food stall: roof, poles, counter, two pots (x, y = the front of the counter)
  mamaPut: [{ r: [-34, -48, 68, 14] }, { l: [-30, -34, -30, 0] }, { l: [30, -34, 30, 0] }, { r: [-28, -14, 56, 12] }, { c: [-12, -20, 6] }, { c: [6, -20, 6] }],
  // A row of three stalls under one long roof
  market: [{ r: [-70, -50, 140, 14] }, ...[-66, -22, 22, 66].map((px): Part => ({ l: [px, -36, px, 0] })), ...[-44, 0, 44].map((tx): Part => ({ r: [tx - 18, -16, 36, 12] }))],
  // Three street lamps
  lamps: [-60, 0, 60].map((lx): Part => ({ l: [lx, 0, lx, -33, lx + 8, -33] })).concat([-60, 0, 60].map((lx): Part => ({ c: [lx + 9, -33, 4] }))),
  // A phone mast: a lattice tower with a dish
  mast: [{ l: [-12, 0, 0, -62, 12, 0] }, { l: [-9, -16, 9, -16] }, { l: [-6, -32, 6, -32] }, { l: [-9, -16, 6, -32, -3, -48] }, { c: [6, -56, 5] }],
};

/**
 * The faint chalk outline of what a board will build, standing behind its mat. (x, y) is the
 * place's front on the ground (for the road: the bottom middle of the road strip). `fill`
 * 0..1 fills the outline in from the bottom up (W2 step 5); then draw the real place.
 */
export function drawBuildOutline(g: CanvasRenderingContext2D, build: BuildId, x: number, y: number, fill = 0): void {
  const parts = OUTLINES[build];
  const f = Number.isFinite(fill) ? Math.min(Math.max(fill, 0), 1) : 0;
  g.save();
  g.translate(x, y);
  if (f > 0) {
    const top = Math.min(...parts.map((p) => ('r' in p ? p.r[1] : 'c' in p ? p.c[1] - p.c[2] : Math.min(...p.l.filter((_, i) => i % 2 === 1)))));
    g.save();
    g.beginPath();
    g.rect(-200, top * f, 400, -top * f + 2);
    g.clip();
    g.fillStyle = 'rgba(255,214,110,0.6)';
    for (const p of parts) {
      if ('r' in p) g.fillRect(...p.r);
      else if ('c' in p) disc(g, p.c[0], p.c[1], p.c[2], 'rgba(255,214,110,0.6)');
    }
    g.restore();
  }
  // A soft dark under-line so the chalk reads on pale pavement, then the chalk itself
  for (const [colour, w] of [['rgba(29,26,20,0.22)', 3.4], ['rgba(255,255,255,0.88)', 1.6]] as const) {
    g.strokeStyle = colour;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const p of parts) {
      g.beginPath();
      if ('r' in p) g.rect(...p.r);
      else if ('c' in p) g.arc(p.c[0], p.c[1], p.c[2], 0, TAU);
      else for (let i = 0; i + 1 < p.l.length; i += 2) (i === 0 ? g.moveTo : g.lineTo).call(g, p.l[i]!, p.l[i + 1]!);
      g.stroke();
    }
  }
  g.restore();
}

// ---------- The chalk price board on a stick (screen px) ----------

export const BOARD = {
  /** Board face height and stick height (px). */
  faceH: 38,
  stickH: 13,
  minW: 56,
  maxW: 96,
  /** At most this wide on a short stick (a tiny screen with no other room): the price may drop to 12 px. */
  tightW: 84,
  price: 14,
  name: 12,
  icon: 15,
  slate: '#2e3d34',
  frame: '#9a6a3c',
  chalk: '#fbf6e6',
} as const;

export interface BoardState {
  /** True once paid in full: "Done ✓". Also when `left` is 0. */
  done?: boolean;
  /** Sideways wobble in px (boardWobble(t)); 0 with reduced motion. */
  wobble?: number;
  /** A short stick (5 px less, so the board is 48 px tall) and at most BOARD.tightW wide: for a tiny screen with no other room. */
  short?: boolean;
}

/** The stick's height for this board. */
function stickOf(st: BoardState): number {
  return st.short ? BOARD.stickH - 5 : BOARD.stickH;
}

interface BoardLayout {
  w: number;
  top: string;
  name: string;
  size: number;
  icon: boolean;
  done: boolean;
}

function boardLayout(g: CanvasRenderingContext2D, build: BuildId, left: number, st: BoardState): BoardLayout {
  const b = BUILDS[build];
  const l = Number.isFinite(left) ? Math.max(0, left) : b.price;
  const done = st.done === true || l <= 0;
  const part = !done && l < b.price;
  const top = done ? 'Done' : part ? `${priceWords(b.bucket, l)} left` : priceWords(b.bucket, l);
  const maxW = st.short ? BOARD.tightW : BOARD.maxW;
  const room = maxW - 12;
  // W16: drop the bucket icon first, then (only if still needed) 12 px bold. The words never change.
  const tries: [number, boolean][] = [[14, true], [14, false], [12, false]];
  let pick: [number, boolean] = [12, false];
  let need = 0;
  for (const [size, icon] of tries) {
    g.font = `bold ${size}px sans-serif`;
    need = textW(g, top, size) + (icon || done ? BOARD.icon + 3 : 0);
    if (need <= room) {
      pick = [size, icon];
      break;
    }
  }
  g.font = `bold ${pick[0]}px sans-serif`;
  need = textW(g, top, pick[0]) + (pick[1] || done ? BOARD.icon + 3 : 0);
  g.font = `${BOARD.name}px sans-serif`;
  const nw = textW(g, b.name, BOARD.name);
  const w = Math.min(maxW, Math.max(BOARD.minW, Math.ceil(Math.max(need, nw) + 14)));
  return { w, top, name: b.name, size: pick[0], icon: pick[1], done };
}

/**
 * The tap area of a board whose stick stands at (x, y) in screen px: the whole board and
 * stick, at least 48 x 48 and at most 96 wide.
 */
export function priceBoardBox(g: CanvasRenderingContext2D, x: number, y: number, build: BuildId, left: number, st: BoardState = {}): { x: number; y: number; w: number; h: number } {
  g.save();
  const { w } = boardLayout(g, build, left, st);
  g.restore();
  const h = BOARD.faceH + stickOf(st) + 2;
  return { x: x - w / 2, y: y - h + 2, w, h: Math.max(48, h) };
}

/**
 * The chalk price board for `build`, its stick's foot at (x, y) in screen px. `left` is what
 * is still to pay (whole naira or units): the full price shows "₦10" / "New road"; less
 * shows "₦4 left"; 0 (or st.done) shows "Done ✓". Bucket icon on the first line (a Power or
 * any board drops it first if the words would not fit, then goes to 12 px bold: W16).
 */
export function drawPriceBoard(g: CanvasRenderingContext2D, x: number, y: number, build: BuildId, left: number, st: BoardState = {}): void {
  g.save();
  const L = boardLayout(g, build, left, st);
  const wob = Number.isFinite(st.wobble) ? Math.max(-6, Math.min(6, st.wobble!)) : 0;
  // Shadow and stick
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(x, y, 8, 3, 0, 0, TAU);
  g.fill();
  g.translate(x, y);
  g.rotate(wob * 0.03);
  g.translate(wob, 0);
  const stick = stickOf(st);
  line(g, INK, 5, [0, 0, 0, -stick - 4]);
  line(g, BOARD.frame, 3, [0, 0, 0, -stick - 4]);
  // Face: wooden frame round a slate
  const top = -stick - BOARD.faceH;
  g.fillStyle = BOARD.frame;
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-L.w / 2, top, L.w, BOARD.faceH, 4);
  g.fill();
  g.stroke();
  g.fillStyle = BOARD.slate;
  g.fillRect(-L.w / 2 + 3, top + 3, L.w - 6, BOARD.faceH - 6);
  // A faint chalk smudge, like a board wiped and written on again
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.fillRect(-L.w / 2 + 6, top + 20, L.w - 14, 3);
  // Line 1: icon and price (or Done and a tick)
  g.font = `bold ${L.size}px sans-serif`;
  const tw = textW(g, L.top, L.size);
  const iconW = L.icon || L.done ? BOARD.icon + 3 : 0;
  const lx = -(tw + iconW) / 2;
  const ly = top + 13;
  if (L.done) tick(g, lx + BOARD.icon / 2, ly, 5, '#7be08f');
  else if (L.icon) drawBucketIcon(g, BUILDS[build].bucket, lx + BOARD.icon / 2, ly, BOARD.icon);
  g.fillStyle = BOARD.chalk;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const fit = (st.short ? BOARD.tightW : BOARD.maxW) - 10;
  g.fillText(L.top, lx + iconW, ly + 0.5, fit - iconW);
  // Line 2: the name
  g.font = `${BOARD.name}px sans-serif`;
  g.textAlign = 'center';
  g.fillText(L.name, 0, top + 28.5, fit);
  g.restore();
}

// ---------- Flying money (screen px) ----------

/** A point on a piece's arc from (x0, y0) to (x1, y1) at k (0..1): up and over, never straight. */
export function moneyArc(x0: number, y0: number, x1: number, y1: number, k: number): { x: number; y: number } {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  const lift = Math.max(30, Math.hypot(x1 - x0, y1 - y0) * 0.35);
  return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p - lift * 4 * p * (1 - p) };
}

/**
 * One coin, bulb or chip flying from (x0, y0) to (x1, y1), k 0..1 over PAY.flight. Coins spin
 * as they fly. Paying: from the hero to the board; collecting: from the place to the hero.
 * Reduced motion: draw none (the numbers just count, with a tick).
 */
export function drawFlyingMoney(g: CanvasRenderingContext2D, kind: BucketKind, x0: number, y0: number, x1: number, y1: number, k: number, size = 16): void {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  if (p >= 1) return;
  const at = moneyArc(x0, y0, x1, y1, p);
  g.save();
  g.translate(at.x, at.y);
  if (kind === 'naira') g.scale(0.3 + 0.7 * Math.abs(Math.cos(p * Math.PI * 3)), 1);
  else g.rotate((p - 0.5) * 0.8);
  drawBucketIcon(g, kind, 0, 0, size);
  g.restore();
}

// ---------- Tray bubbles (screen px) ----------

export const BUBBLE = { h: 34, tail: 9, fullH: 14, minW: 56, maxW: 120, icon: 18, text: 13, ring: '#b4561c' } as const;

function bubbleW(g: CanvasRenderingContext2D, text: string): number {
  g.font = `bold ${BUBBLE.text}px sans-serif`;
  return Math.min(BUBBLE.maxW, Math.max(BUBBLE.minW, Math.ceil(BUBBLE.icon + 6 + textW(g, text, BUBBLE.text) + 16)));
}

/** The tap area of a tray bubble whose tail points at (x, y): at least 56 x 48 px. */
export function trayBubbleBox(g: CanvasRenderingContext2D, x: number, y: number, text: string, full = false): { x: number; y: number; w: number; h: number } {
  g.save();
  const w = bubbleW(g, text);
  g.restore();
  const h = Math.max(48, BUBBLE.h + BUBBLE.tail + (full ? BUBBLE.fullH : 0) + 2);
  return { x: x - w / 2, y: y - h, w, h };
}

/**
 * A tray bubble over a working place, its tail pointing down at (x, y) in screen px: the
 * bucket icon and the amount ("80 kobo", "₦1.20"; trayWords). Full: a thick edge and a band
 * with the word "Full" (never colour alone). `bob` lifts it 0..2 px (0 with reduced motion).
 */
export function drawTrayBubble(g: CanvasRenderingContext2D, x: number, y: number, bucket: BucketKind, text: string, full = false, bob = 0): void {
  g.save();
  const w = bubbleW(g, text);
  const b = Number.isFinite(bob) ? Math.max(0, Math.min(3, bob)) : 0;
  const h = BUBBLE.h + (full ? BUBBLE.fullH : 0);
  const top = y - BUBBLE.tail - h - b;
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(x, y, 6, 2, 0, 0, TAU);
  g.fill();
  // Bubble with a tail
  g.fillStyle = CREAM;
  g.strokeStyle = full ? BUBBLE.ring : INK;
  g.lineWidth = full ? 3 : 1.5;
  g.beginPath();
  g.roundRect(x - w / 2, top, w, h, 10);
  g.moveTo(x - 6, top + h - 0.5);
  g.lineTo(x, y - b - 1);
  g.lineTo(x + 6, top + h - 0.5);
  g.fill();
  g.stroke();
  g.fillStyle = CREAM;
  g.fillRect(x - 5, top + h - 3, 10, 3);
  // Icon and amount
  g.font = `bold ${BUBBLE.text}px sans-serif`;
  const tw = textW(g, text, BUBBLE.text);
  const lx = x - (BUBBLE.icon + 5 + tw) / 2;
  const cy = top + BUBBLE.h / 2;
  drawBucketIcon(g, bucket, lx + BUBBLE.icon / 2, cy, BUBBLE.icon);
  g.fillStyle = INK;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(text, lx + BUBBLE.icon + 5, cy + 0.5, BUBBLE.maxW - BUBBLE.icon - 20);
  if (full) {
    g.fillStyle = BUBBLE.ring;
    g.beginPath();
    g.roundRect(x - w / 2 + 4, top + BUBBLE.h - 2, w - 8, BUBBLE.fullH - 1, 5);
    g.fill();
    g.fillStyle = WHITE;
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillText('Full', x, top + BUBBLE.h + BUBBLE.fullH / 2 - 2.5);
  }
  g.restore();
}

// ---------- The collect line (screen px) ----------

/**
 * "+₦1.20 from Mama Put" rising 24 px over the hero and fading at the end, k 0..1 over
 * PAY.collectLine. Reduced motion: it does not rise. The same look serves the built lines.
 */
export function drawCollectLine(g: CanvasRenderingContext2D, x: number, y: number, text: string, k: number, still = false): void {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  if (p >= 1) return;
  g.save();
  g.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
  const yy = y - (still ? 0 : 24 * Math.min(p / 0.4, 1));
  g.font = 'bold 13px sans-serif';
  const w = textW(g, text, 13) + 18;
  g.fillStyle = CREAM;
  g.strokeStyle = '#13703a';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(x - w / 2, yy - 12, w, 24, 12);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, yy + 0.5);
  g.restore();
}

// ---------- Edge arrows for things off the screen (screen px) ----------

export type EdgeIcon = SpotId | BucketKind;

export const EDGE_ARROW = { r: 22, point: 9, inset: 34 } as const;

/**
 * Where to draw the edge arrow for a thing at (px, py) on screen, or null when it is on the
 * screen (inside the view less `inset`). The arrow sits on the line from the middle of the
 * view (below `topBar` px) towards the thing, kept `inset` px in from every edge.
 */
export function edgeArrowPlace(px: number, py: number, viewW: number, viewH: number, topBar = 0, inset: number = EDGE_ARROW.inset): { x: number; y: number; angle: number } | null {
  if (![px, py, viewW, viewH, topBar, inset].every(Number.isFinite)) return null;
  const x0 = inset;
  const x1 = viewW - inset;
  const y0 = topBar + inset;
  const y1 = viewH - inset;
  if (px >= 0 && px <= viewW && py >= topBar && py <= viewH) return null;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (dx === 0 && dy === 0) return null;
  const sx = dx === 0 ? Infinity : (dx > 0 ? x1 - cx : x0 - cx) / dx;
  const sy = dy === 0 ? Infinity : (dy > 0 ? y1 - cy : y0 - cy) / dy;
  const s = Math.max(0, Math.min(sx, sy));
  return { x: cx + dx * s, y: cy + dy * s, angle: Math.atan2(dy, dx) };
}

/**
 * A round edge sign at (x, y) with the thing's icon (a pin's spot icon, or a bucket icon for a
 * board or tray), and an arrow on its rim pointing at `angle` (radians, 0 = right). 44 px
 * across plus the arrow; tap area EDGE_ARROW.r + 4 round (48 px).
 */
export function drawEdgeArrow(g: CanvasRenderingContext2D, x: number, y: number, angle: number, icon: EdgeIcon): void {
  const a = Number.isFinite(angle) ? angle : 0;
  const R = EDGE_ARROW.r;
  g.save();
  g.translate(x, y);
  // Arrow head on the rim
  g.save();
  g.rotate(a);
  g.fillStyle = '#b4561c';
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(R + EDGE_ARROW.point, 0);
  g.lineTo(R - 3, -9);
  g.lineTo(R - 3, 9);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  disc(g, 0, 0, R, WHITE);
  g.strokeStyle = '#b4561c';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, R - 1.5, 0, TAU);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.stroke();
  if (icon === 'naira' || icon === 'power' || icon === 'tech') drawBucketIcon(g, icon, 0, 0, 26);
  else drawSpotIcon(g, icon, 0, 0);
  g.restore();
}

// ---------- The road being built (map units) ----------

/** The Alausa road strip the Potholes fix covers (map units; matches drawPotholeSpot). */
export const ALAUSA_ROAD = { x0: 70, x1: 132, y0: 330, y1: 512 } as const;

/**
 * Fresh tarmac rolling up the Alausa road over the 'problem' look, k 0..1 (W2 step 5, 1 to
 * 2 s), with a small road roller at its front edge and a little steam off the warm tarmac.
 * At k = 1 repaint the city with potholes 'fixed'. Reduced motion: skip straight to fixed.
 */
export function drawRoadBuild(g: CanvasRenderingContext2D, k: number, time = 0): void {
  const p = Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 1;
  const { x0, x1, y0, y1 } = ALAUSA_ROAD;
  const w = x1 - x0;
  const edge = y1 - (y1 - y0) * p;
  g.save();
  g.fillStyle = '#3f3f46';
  g.fillRect(x0, edge, w, y1 - edge);
  g.fillStyle = '#f5cf3a';
  g.fillRect(x0, edge, 3, y1 - edge);
  g.fillRect(x1 - 3, edge, 3, y1 - edge);
  g.fillStyle = WHITE;
  for (let y = y1 - 28; y > edge + 4; y -= 30) g.fillRect(x0 + w / 2 - 2, y, 4, 20);
  // Steam curls off the fresh part
  const t = Number.isFinite(time) ? time : 0;
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const sy = edge + 14 + i * 22;
    if (sy > y1 - 4) break;
    const sx = x0 + 14 + i * 16;
    const d = Math.sin(t * 4 + i) * 2;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(sx + 4 + d, sy - 5, sx, sy - 10);
    g.stroke();
  }
  if (p < 1) {
    // The road roller at the front edge, rolling up the road
    const ry = edge - 4;
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.ellipse(x0 + w / 2 + 2, ry + 10, 20, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#7d8a96';
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(x0 + 8, ry - 4, w - 16, 9, 4);
    g.fill();
    g.stroke();
    g.fillStyle = '#f2b300';
    g.fillRect(x0 + 18, ry + 5, w - 36, 12);
    g.strokeRect(x0 + 18, ry + 5, w - 36, 12);
    g.fillStyle = '#f6c90e';
    g.fillRect(x0 + 22, ry + 8, w - 44, 7);
    g.strokeRect(x0 + 22, ry + 8, w - 44, 7);
  }
  g.restore();
}
