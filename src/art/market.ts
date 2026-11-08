/**
 * Street 2, Market road (docs/design.md S2.6, S2.12 picture 9): a busy open market at midday.
 * Stalls under big umbrellas, woven baskets of pepper and tomatoes, cloth stalls, a phone
 * accessories kiosk and a tailor. Our own drawings; made-up everyday signs, no brands.
 *
 * Layers, back to front (screen space, each scrolls itself with parallax, like street.ts):
 * - drawMarketSky: the midday sky, sun high, drifting clouds.
 * - drawMarketFar: far rows of market sheds and umbrella tops (0.15 of the camera).
 * - drawMarketRow: the near stalls and umbrella stands (0.5), plus the market floor.
 * - drawPassingKeke: a small tricycle taxi on the back lane now and then.
 * And in world space, drawMarketStall: a stall whose flat roof is a platform.
 *
 * The sky, the far sheds and the stall row are painted once at the screen's own pixel size and
 * copied 1:1 each frame (blitLayer in street.ts), the same caching that made Street 1 fast.
 *
 * Umbrella and cloth colours: no green, white and red together (party colours), no flags.
 */
import * as P from './palette';
import { GROUND_Y, blitLayer, type PixelLayer, type SignBox } from './street';

const TAU = Math.PI * 2;

/** The made-up signs from S2.6, left to right in each run of stalls. */
export const MARKET_SIGNS = ['FABRICS', 'PEPPER AND TOMATOES', 'PROVISIONS', 'PHONE ACCESSORIES', 'TAILOR'] as const;

/** Umbrella canopies: two colours each, never green, white and red. */
export const UMBRELLA_COLOURS: readonly (readonly [string, string])[] = [
  ['#f2b632', '#2b6cb0'],
  ['#e8743b', '#fff1d6'],
  ['#8e5bb5', '#f6d04d'],
  ['#2b9bc8', '#fff1d6'],
  ['#d9487a', '#ffe08a'],
];

const SKY_TOP = '#4fb0ee';
const SKY_LOW = '#fff0c8';
const FLOOR = '#d8c39a';
const FLOOR_EDGE = '#c2aa7c';

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function inkRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, lw = 1.2): void {
  rr(g, x, y, w, h, r, fill);
  g.strokeStyle = P.INK;
  g.lineWidth = lw;
  g.stroke();
}

// ---------- Sky ----------

const skyLayer = { layer: null as PixelLayer | null };

function paintSky(g: CanvasRenderingContext2D, viewW: number, viewH: number, upTo: number): void {
  const grad = g.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.8, SKY_LOW);
  g.fillStyle = grad;
  g.fillRect(0, 0, viewW, upTo);
  // The midday sun, high and to the left, with a soft halo
  const sx = Math.min(viewW * 0.3, 220);
  g.fillStyle = 'rgba(255,240,170,0.45)';
  g.beginPath();
  g.arc(sx, 40, 36, 0, TAU);
  g.fill();
  g.fillStyle = P.SUN;
  g.beginPath();
  g.arc(sx, 40, 24, 0, TAU);
  g.fill();
}

export function drawMarketSky(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, viewH = 420): void {
  const flat = viewH * 0.8;
  if (blitLayer(g, skyLayer, `m|${viewW}|${viewH}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, viewH, flat))) {
    g.fillStyle = SKY_LOW;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else {
    paintSky(g, viewW, viewH, viewH);
  }
  // A few small, high clouds drifting
  g.fillStyle = P.CLOUD;
  const span = viewW + 300;
  for (let i = 0; i < 3; i++) {
    const x = ((((i * 330 + 120 - camX * 0.05 - time * 5) % span) + span) % span) - 150;
    const y = 30 + i * 22;
    g.beginPath();
    g.arc(x, y, 10, 0, TAU);
    g.arc(x + 14, y - 6, 13, 0, TAU);
    g.arc(x + 30, y, 9, 0, TAU);
    g.fill();
    g.fillRect(x, y, 30, 9);
  }
}

// ---------- Far market sheds (cached) ----------

const FAR_W = 640;
const FAR_H = 120;
const farLayer = { layer: null as PixelLayer | null };

function paintFar(g: CanvasRenderingContext2D): void {
  // Umbrella tops first, peeking over the shed roofs
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 72 + hash(i + 40) * 20;
    const y = 52 + hash(i + 41) * 14;
    const pair = UMBRELLA_COLOURS[i % UMBRELLA_COLOURS.length]!;
    g.globalAlpha = 0.55;
    g.fillStyle = pair[0];
    g.beginPath();
    g.ellipse(x, y, 20, 9, 0, Math.PI, TAU);
    g.fill();
    g.globalAlpha = 1;
  }
  // Long sheds with low pitched zinc roofs, pale so they sit far back
  for (let i = 0; i < 6; i++) {
    const x = i * 108 - 6 + hash(i) * 10;
    const w = 96 + hash(i + 7) * 30;
    const top = 62 + hash(i + 3) * 18;
    g.fillStyle = i % 2 ? '#e3cfa9' : '#d9c7a6';
    g.fillRect(x, top + 10, w, FAR_H - top - 10);
    // Roof
    g.fillStyle = i % 3 === 0 ? '#aebdc6' : '#b9c6cc';
    g.beginPath();
    g.moveTo(x - 6, top + 12);
    g.lineTo(x + w * 0.5, top);
    g.lineTo(x + w + 6, top + 12);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.06)';
    for (let k = x; k < x + w; k += 7) g.fillRect(k, top + 9, 1.5, 4);
    // Openings in shade
    g.fillStyle = '#c4ad86';
    for (let k = x + 8; k + 16 < x + w; k += 24) g.fillRect(k, top + 26, 16, FAR_H - top - 26);
  }
  // A water tank on legs
  g.fillStyle = '#a7b6be';
  g.fillRect(470, 30, 3, 50);
  g.fillRect(492, 30, 3, 50);
  rr(g, 462, 14, 40, 20, 4, '#9fb0b8');
}

export function drawMarketFar(g: CanvasRenderingContext2D, camX: number, viewW: number, groundY = GROUND_Y): void {
  const par = camX * 0.15;
  const y = groundY - 40 - FAR_H;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) {
    const x = t * FAR_W - par;
    if (blitLayer(g, farLayer, 'mfar', x, y, FAR_W, FAR_H, paintFar, true)) continue;
    g.save();
    g.translate(x, y);
    paintFar(g);
    g.restore();
  }
}

// ---------- Near stall row (cached) ----------

/** One stall (132 u) and one umbrella stand (60 u) for each sign. */
const UNIT_W = 192;
const STALL_W = 132;
export const MARKET_TILE_W = UNIT_W * MARKET_SIGNS.length;
const ROW_H = 134; // tile height; the stall bases sit on its bottom edge
const ROW_BASE = 264; // where the stalls meet the market floor (as the street 1 shops)

/** Where each stall's sign board sits in the row tile (paintMarketRow below): x from the tile's left, y up from the row's base. */
export const MARKET_SIGN_BOXES: readonly SignBox[] = MARKET_SIGNS.map((_, k) => ({ x: k * UNIT_W + 10, y: -112 + (k % 2) * 6 - 6, w: STALL_W - 12, h: 20 }));
/** The left post of each stall in the row tile (the fixed look hangs a street lamp on it). */
export const MARKET_POSTS: readonly number[] = MARKET_SIGNS.map((_, k) => k * UNIT_W + 6.5);

const WALLS = ['#e9b98a', '#f0d48a', '#a9cfa6', '#a9c0e8', '#e2a9c8'] as const;

function drawSignIcon(g: CanvasRenderingContext2D, k: number, x: number, y: number): void {
  g.strokeStyle = P.INK;
  g.lineWidth = 1.2;
  switch (k) {
    case 0: // folded cloth
      rr(g, x - 7, y - 5, 14, 4, 1, '#2d3a8c');
      rr(g, x - 7, y - 1, 14, 4, 1, '#e0a526');
      rr(g, x - 7, y + 3, 14, 4, 1, '#b83280');
      break;
    case 1: // tomato and pepper
      g.fillStyle = '#d63a2a';
      g.beginPath();
      g.arc(x - 3, y + 1, 5, 0, TAU);
      g.fill();
      g.fillStyle = '#f07d22';
      g.beginPath();
      g.ellipse(x + 5, y + 1, 2.5, 5, 0.4, 0, TAU);
      g.fill();
      g.fillStyle = '#3a8a3a';
      g.fillRect(x - 4, y - 5, 2, 2);
      break;
    case 2: // tin and box
      rr(g, x - 7, y - 5, 6, 11, 1, '#f39c12');
      rr(g, x, y - 2, 8, 8, 1, '#b07a45');
      break;
    case 3: // phone and cable
      rr(g, x - 6, y - 7, 8, 14, 2, P.INK);
      g.fillStyle = '#7fd6ff';
      g.fillRect(x - 5, y - 5, 6, 9);
      g.beginPath();
      g.moveTo(x + 2, y + 4);
      g.quadraticCurveTo(x + 9, y + 8, x + 7, y - 2);
      g.stroke();
      break;
    case 4: // needle and thread
      g.strokeStyle = P.INK;
      g.beginPath();
      g.moveTo(x - 6, y + 6);
      g.lineTo(x + 6, y - 6);
      g.stroke();
      g.strokeStyle = '#d9487a';
      g.beginPath();
      g.moveTo(x + 5, y - 5);
      g.quadraticCurveTo(x + 9, y + 2, x, y + 4);
      g.stroke();
      break;
  }
}

/** A woven basket heaped with round produce. */
function basket(g: CanvasRenderingContext2D, x: number, y: number, w: number, fills: readonly string[], seed: number): void {
  // Heap
  for (let i = 0; i < 7; i++) {
    const px = x + 4 + ((i * 7) % (w - 8)) + hash(seed + i) * 3;
    const py = y - 2 - (i % 3) * 3 - (i > 2 && i < 5 ? 3 : 0);
    g.fillStyle = fills[i % fills.length] ?? '#d63a2a';
    g.beginPath();
    g.arc(px, py, 3.6, 0, TAU);
    g.fill();
  }
  // Basket: woven, wider at the top
  g.fillStyle = '#c79a55';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - 3, y + 11);
  g.lineTo(x + 3, y + 11);
  g.closePath();
  g.fill();
  g.strokeStyle = '#8f6a33';
  g.lineWidth = 1;
  g.beginPath();
  for (let k = x + 3; k < x + w - 2; k += 4) {
    g.moveTo(k, y + 1);
    g.lineTo(k + 1, y + 10);
  }
  g.moveTo(x + 1, y + 5);
  g.lineTo(x + w - 1, y + 5);
  g.stroke();
}

function goods(g: CanvasRenderingContext2D, k: number, x: number, base: number): void {
  const table = base - 30;
  switch (k) {
    case 0: {
      // FABRICS: cloth lengths hanging from a rail, each with its own printed pattern
      g.fillStyle = '#6b4a2b';
      g.fillRect(x + 8, base - 88, STALL_W - 16, 3);
      const cloth = ['#2d3a8c', '#e0a526', '#b83280', '#1f8a8a', '#e0602b', '#6a3d9a'];
      for (let i = 0; i < 7; i++) {
        const cx = x + 12 + i * 16;
        const c = cloth[i % cloth.length]!;
        rr(g, cx, base - 86, 14, 50, 1, c);
        g.fillStyle = 'rgba(255,248,230,0.75)';
        const pat = i % 3;
        for (let yy = base - 80; yy < base - 40; yy += 8) {
          if (pat === 0) {
            g.beginPath();
            g.arc(cx + 4, yy, 1.6, 0, TAU);
            g.arc(cx + 10, yy + 4, 1.6, 0, TAU);
            g.fill();
          } else if (pat === 1) {
            g.beginPath();
            g.moveTo(cx + 7, yy - 3);
            g.lineTo(cx + 11, yy + 1);
            g.lineTo(cx + 7, yy + 5);
            g.lineTo(cx + 3, yy + 1);
            g.closePath();
            g.fill();
          } else {
            g.fillRect(cx, yy, 14, 1.6);
            g.fillRect(cx + 6, yy + 3, 2, 3);
          }
        }
      }
      // Folded cloth stacked on the table
      g.fillStyle = '#8a5d36';
      g.fillRect(x + 6, table, STALL_W - 12, 5);
      for (let s = 0; s < 3; s++) {
        for (let j = 0; j < 3; j++) rr(g, x + 14 + s * 38, table - 5 - j * 5, 30, 5, 1, cloth[(s * 2 + j) % cloth.length]!);
      }
      break;
    }
    case 1: {
      // PEPPER AND TOMATOES: baskets heaped high, and a big basin in front
      g.fillStyle = '#8a5d36';
      g.fillRect(x + 6, table, STALL_W - 12, 5);
      basket(g, x + 10, table - 11, 34, ['#d63a2a', '#e8452f', '#c9302c'], 1);
      basket(g, x + 50, table - 11, 34, ['#f07d22', '#d63a2a', '#f5a524'], 2);
      basket(g, x + 90, table - 11, 34, ['#c4211b', '#e8452f', '#f07d22'], 3);
      rr(g, x + 40, base - 12, 52, 10, 4, '#b9c2c8');
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#d63a2a' : '#f07d22';
        g.beginPath();
        g.arc(x + 46 + i * 5.6, base - 13, 3.2, 0, TAU);
        g.fill();
      }
      break;
    }
    case 2: {
      // PROVISIONS: shelves of plain tins and boxes, and sacks on the floor
      g.fillStyle = '#8a5d36';
      for (const sy of [base - 80, base - 56]) g.fillRect(x + 10, sy, STALL_W - 20, 3);
      const tins = ['#f39c12', '#2b6cb0', '#d9487a', '#e8c547', '#8e5bb5'];
      for (let i = 0; i < 12; i++) rr(g, x + 14 + i * 9, base - 92, 7, 12, 1, tins[i % tins.length]!);
      for (let i = 0; i < 6; i++) rr(g, x + 14 + i * 18, base - 70, 15, 14, 1, i % 2 ? '#c99a62' : '#b07a45');
      g.fillStyle = '#8a5d36';
      g.fillRect(x + 6, table, STALL_W - 12, 5);
      for (let i = 0; i < 3; i++) {
        rr(g, x + 14 + i * 36, base - 26, 28, 26, 8, '#efe3c6');
        g.fillStyle = '#c9b48a';
        g.fillRect(x + 14 + i * 36, base - 16, 28, 3);
      }
      break;
    }
    case 3: {
      // PHONE ACCESSORIES: a glass case and a peg board of cases and cables
      rr(g, x + 14, base - 92, STALL_W - 28, 50, 2, '#e8e1d2');
      const cases = ['#2b9bc8', '#d9487a', '#f2b632', '#8e5bb5', '#e8743b'];
      for (let i = 0; i < 5; i++) {
        rr(g, x + 20 + i * 20, base - 86, 12, 20, 3, cases[i]!);
        g.fillStyle = P.INK;
        g.fillRect(x + 23 + i * 20, base - 83, 3, 3);
      }
      g.strokeStyle = '#333';
      g.lineWidth = 1.4;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const cx = x + 22 + i * 20;
        g.moveTo(cx, base - 62);
        g.quadraticCurveTo(cx + 8, base - 46, cx + 2, base - 50);
      }
      g.stroke();
      // Glass counter case
      rr(g, x + 8, table - 14, STALL_W - 16, 30, 2, '#5a6e86');
      rr(g, x + 11, table - 11, STALL_W - 22, 14, 1, '#bfe3f5');
      for (let i = 0; i < 6; i++) rr(g, x + 16 + i * 17, table - 8, 9, 8, 1, cases[(i + 2) % cases.length]!);
      break;
    }
    case 4: {
      // TAILOR: finished clothes on hangers, a sewing machine on the table
      g.fillStyle = '#6b4a2b';
      g.fillRect(x + 8, base - 92, STALL_W - 16, 3);
      const robes = ['#2b6cb0', '#e0a526', '#6a3d9a', '#1f8a8a'];
      for (let i = 0; i < 4; i++) {
        const cx = x + 26 + i * 27;
        const c = robes[i]!;
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(cx - 12, base - 84);
        g.lineTo(cx + 12, base - 84);
        g.lineTo(cx + 9, base - 42);
        g.lineTo(cx - 9, base - 42);
        g.closePath();
        g.fill();
        // Embroidered neck
        g.strokeStyle = '#fff1c2';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(cx - 4, base - 84);
        g.lineTo(cx, base - 76);
        g.lineTo(cx + 4, base - 84);
        g.moveTo(cx, base - 76);
        g.lineTo(cx, base - 64);
        g.stroke();
      }
      g.fillStyle = '#8a5d36';
      g.fillRect(x + 6, table, STALL_W - 12, 5);
      // Sewing machine
      rr(g, x + 40, table - 16, 40, 8, 3, '#2a2a2a');
      rr(g, x + 40, table - 22, 8, 14, 2, '#2a2a2a');
      rr(g, x + 72, table - 22, 10, 14, 2, '#2a2a2a');
      g.fillStyle = '#c9c9c9';
      g.beginPath();
      g.arc(x + 85, table - 14, 4, 0, TAU);
      g.fill();
      // Measuring tape
      g.strokeStyle = '#f2d06b';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + 92, table);
      g.quadraticCurveTo(x + 100, table + 14, x + 108, table);
      g.stroke();
      break;
    }
  }
  // Table legs (for every stall)
  g.fillStyle = '#6b4a2b';
  g.fillRect(x + 14, table + 5, 3, 25);
  g.fillRect(x + STALL_W - 17, table + 5, 3, 25);
}

function umbrellaStand(g: CanvasRenderingContext2D, k: number, cx: number, base: number): void {
  const pair = UMBRELLA_COLOURS[k % UMBRELLA_COLOURS.length]!;
  const cy = base - 74;
  const r = 34;
  // Pole
  g.fillStyle = '#6b6b6b';
  g.fillRect(cx - 1.5, cy, 3, base - cy);
  // Canopy: eight panels in two colours, a scalloped edge
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI + (i * Math.PI) / 8;
    const a1 = a0 + Math.PI / 8;
    g.fillStyle = i % 2 ? pair[1] : pair[0];
    g.beginPath();
    g.moveTo(cx, cy - 2);
    g.ellipse(cx, cy, r, 20, 0, a0, a1);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = 'rgba(29,26,20,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, cy, r, 20, 0, Math.PI, TAU);
  g.stroke();
  g.fillStyle = pair[0];
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.arc(cx - r + 4.25 + i * 8.5, cy, 4.25, 0, Math.PI);
    g.fill();
  }
  g.fillStyle = P.INK;
  g.fillRect(cx - 1.5, cy - 24, 3, 5);
  // Small table with produce from across the country
  const ty = base - 22;
  g.fillStyle = '#8a5d36';
  g.fillRect(cx - 24, ty, 48, 4);
  g.fillRect(cx - 20, ty + 4, 3, 18);
  g.fillRect(cx + 17, ty + 4, 3, 18);
  switch (k % 5) {
    case 0: // yams
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#8b5a3c' : '#7a4e33';
        g.beginPath();
        g.ellipse(cx - 14 + i * 9, ty - 4 - (i === 1 || i === 2 ? 3 : 0), 7, 3.5, 0.2, 0, TAU);
        g.fill();
      }
      break;
    case 1: // onions in a net bag
      rr(g, cx - 16, ty - 16, 32, 16, 6, '#c9603a');
      g.strokeStyle = 'rgba(255,230,190,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        g.moveTo(cx - 14 + i * 9, ty - 15);
        g.lineTo(cx - 10 + i * 9, ty - 1);
      }
      g.stroke();
      break;
    case 2: // plantain bunch
      g.fillStyle = '#e8c547';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(cx - 12 + i * 6, ty - 7, 2.6, 8, 0.3, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#5b8a2e';
      g.fillRect(cx - 14, ty - 15, 28, 3);
      break;
    case 3: // garden eggs in a tray
      rr(g, cx - 18, ty - 5, 36, 5, 2, '#c79a55');
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? '#f3efdc' : '#b8d48a';
        g.beginPath();
        g.arc(cx - 14 + i * 5.6, ty - 8, 3.4, 0, TAU);
        g.fill();
      }
      break;
    case 4: // oranges in a basin
      rr(g, cx - 16, ty - 7, 32, 7, 3, '#b9c2c8');
      g.fillStyle = '#f39c12';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(cx - 12 + i * 6, ty - 9 - (i % 2) * 2, 3.6, 0, TAU);
        g.fill();
      }
      break;
  }
}

function paintMarketRow(g: CanvasRenderingContext2D): void {
  const base = ROW_H;
  for (let k = 0; k < MARKET_SIGNS.length; k++) {
    const x = k * UNIT_W + 4;
    const top = base - 112 + (k % 2) * 6;
    // Back wall and posts
    rr(g, x + 2, top + 18, STALL_W - 4, base - top - 18, 2, WALLS[k] ?? WALLS[0]);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x + 2, top + 18, STALL_W - 4, 4);
    g.fillStyle = '#6b4a2b';
    g.fillRect(x, top + 2, 5, base - top - 2);
    g.fillRect(x + STALL_W - 5, top + 2, 5, base - top - 2);
    goods(g, k, x, base);
    // Tarp roof edge with a scalloped valance in the stall's colour
    const pair = UMBRELLA_COLOURS[(k + 2) % UMBRELLA_COLOURS.length]!;
    rr(g, x - 4, top + 14, STALL_W + 8, 8, 2, pair[0]);
    g.fillStyle = pair[1];
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.arc(x - 4 + 7 + i * 14, top + 22, 6, 0, Math.PI);
      g.fill();
    }
    // Sign board on top, with a small picture so non-readers know the stall too
    inkRect(g, x + 6, top - 6, STALL_W - 12, 20, 3, P.SIGN_BOARD);
    drawSignIcon(g, k, x + 18, top + 4);
    g.fillStyle = P.INK;
    g.font = 'bold 9px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(MARKET_SIGNS[k] ?? '', x + STALL_W / 2 + 8, top + 4.5, STALL_W - 40);
    umbrellaStand(g, k, x + STALL_W + 30, base);
  }
  // A light midday haze over the row (only where something was drawn), so the stall roofs,
  // hazards and hero in front read first
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,248,230,0.16)';
  g.fillRect(0, 0, MARKET_TILE_W, ROW_H);
  g.restore();
}

const rowLayer = { layer: null as PixelLayer | null };

/** The stalls at half camera speed, and the market floor down to the road. */
export function drawMarketRow(g: CanvasRenderingContext2D, camX: number, viewW: number, groundY = GROUND_Y): void {
  const base = ROW_BASE - (GROUND_Y - groundY);
  g.fillStyle = FLOOR;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = FLOOR_EDGE;
  g.fillRect(0, base, viewW, 3);
  const par = camX * 0.5;
  for (let t = Math.floor(par / MARKET_TILE_W); t * MARKET_TILE_W - par < viewW; t++) {
    const x = t * MARKET_TILE_W - par;
    if (blitLayer(g, rowLayer, 'mrow', x, base - ROW_H, MARKET_TILE_W, ROW_H, paintMarketRow, true)) continue;
    g.save();
    g.translate(x, base - ROW_H);
    paintMarketRow(g);
    g.restore();
  }
}

// ---------- Passing keke ----------

/** A small three-wheeled taxi, wheels on y = 0, facing +x. Plain paint, no writing. */
export function drawKekeShape(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 16) * 0.6;
  g.save();
  g.translate(x, y + bob);
  // Canopy and roof
  inkRect(g, -26, -44, 44, 6, 3, '#2a2a2a', 1.2);
  g.fillStyle = '#2a2a2a';
  g.fillRect(-24, -40, 3, 16);
  // Body: rounded back, sloped front with a windscreen
  g.beginPath();
  g.moveTo(-28, -6);
  g.lineTo(-28, -24);
  g.quadraticCurveTo(-28, -30, -20, -30);
  g.lineTo(6, -30);
  g.lineTo(20, -38);
  g.lineTo(26, -38);
  g.lineTo(28, -6);
  g.closePath();
  g.fillStyle = P.BUS_YELLOW;
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  g.stroke();
  g.fillStyle = P.BUS_GLASS;
  g.beginPath();
  g.moveTo(10, -30);
  g.lineTo(20, -36);
  g.lineTo(24, -36);
  g.lineTo(24, -22);
  g.lineTo(10, -22);
  g.closePath();
  g.fill();
  // Open side and a seat
  g.fillStyle = '#3a3a3a';
  g.fillRect(-18, -28, 22, 14);
  rr(g, -16, -20, 14, 6, 2, '#7b2d26');
  g.fillStyle = P.BUS_STRIPE;
  g.fillRect(-28, -12, 56, 3);
  // Wheels
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(-18, -5, 6, 0, TAU);
  g.arc(20, -5, 6, 0, TAU);
  g.fill();
  g.fillStyle = '#9a9a9a';
  g.beginPath();
  g.arc(-18, -5, 2, 0, TAU);
  g.arc(20, -5, 2, 0, TAU);
  g.fill();
  g.restore();
}

/** Screen space: a keke passing on the back lane now and then (small, so it reads as far). */
export function drawPassingKeke(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, groundY = GROUND_Y): void {
  const span = viewW + 700;
  const x = ((((time * 70 - camX * 0.7) % span) + span) % span) - 200;
  g.save();
  g.translate(x, groundY - 26);
  g.scale(0.55, 0.55);
  drawKekeShape(g, 0, 0, time);
  g.restore();
}

// ---------- Market stall roof (platform, world space) ----------

/**
 * World space. A market stall whose flat plank roof is a platform: the top edge is exactly at
 * topY (the landing line). A cloth valance hangs under it; produce or cloth sits under it.
 */
export function drawMarketStall(g: CanvasRenderingContext2D, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  const seed = Math.floor(x / 50);
  const pair = UMBRELLA_COLOURS[seed % UMBRELLA_COLOURS.length]!;
  // Poles
  g.fillStyle = P.STALL_POLE;
  g.fillRect(x + 6, topY + 10, 4, groundY - topY - 10);
  g.fillRect(x + w - 10, topY + 10, 4, groundY - topY - 10);
  if (groundY - topY > 40) {
    const ty = groundY - 22;
    g.fillStyle = P.STALL_TABLE;
    g.fillRect(x + 4, ty, w - 8, 5);
    g.fillRect(x + 12, ty + 5, 3, 17);
    g.fillRect(x + w - 15, ty + 5, 3, 17);
    if (seed % 2 === 0) {
      for (let bx = x + 10; bx + 30 < x + w - 6; bx += 36) basket(g, bx, ty - 11, 30, ['#d63a2a', '#f07d22', '#e8452f'], bx);
    } else {
      const cloth = ['#2d3a8c', '#e0a526', '#b83280', '#1f8a8a'];
      for (let i = 0; i * 26 + 30 < w - 8; i++) {
        for (let j = 0; j < 3; j++) rr(g, x + 10 + i * 26, ty - 5 - j * 5, 22, 5, 1, cloth[(i + j) % cloth.length]!);
      }
    }
  }
  // Valance hanging under the roof
  g.fillStyle = pair[1];
  for (let i = 0; x + 4 + i * 12 < x + w - 4; i++) {
    g.beginPath();
    g.arc(x + 10 + i * 12, topY + 10, 6, 0, Math.PI);
    g.fill();
  }
  g.fillStyle = pair[0];
  g.fillRect(x + 2, topY + 8, w - 4, 4);
  // Roof: planks with a bright top edge, outlined so the landing line reads
  rr(g, x, topY, w, 10, 3, '#a8763f');
  g.fillStyle = '#e2b77a';
  g.fillRect(x + 2, topY + 1, w - 4, 2.5);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = x + 22; i < x + w - 6; i += 24) g.fillRect(i, topY + 3, 1.5, 7);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, topY, w, 10, 3);
  g.stroke();
}
