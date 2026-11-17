/**
 * W17 C, decision 48 (docs/design.md S3e0 part 6, art S3e1a): the first screen of a street run
 * looks like the same street as its city spot, tired before the fix and bright after it.
 * Tired is warm and proud, never run-down (decision 47, d2). Every piece is scenery in the back
 * layers: nothing here is solid, nothing sits on the walking line, no level changes.
 *
 * Three calls, all painted once into cached pictures (blitLayer), never piece by piece:
 * - drawBackdrop(..., first) in backdrop.ts calls drawFirstBack (between the far skyline and the
 *   row: Computer Village's phone mast) and drawFirstRow (straight after the row: the faded
 *   walls, shutters, goods, people, the kerb sack, cones and lamps), and holds the street's fixed
 *   look back inside a tired stretch (drawFixedLookPast).
 * - drawFirstGround (world space, straight after drawRoad): Alausa's cracks or fresh tarmac, and
 *   the plain street sign.
 *
 * Row pieces use "row units": the row's own half-speed space (screen x = row x - camX * 0.5),
 * laid out over the same numbers as the stretch (FIRST_SCREEN from..to). Ground pieces use world
 * units. The row's base (where the shops meet the pavement) is y = 0 in row pieces.
 */
import type { StreetTheme } from './backdrop';
import { TIRED_MIX, TIRED_SAND } from './bright';
import { FOLK, drawFolk, type Folk } from './places';
import { drawCone } from './roadside';
import { MARKET_TILE_H, paintMarketTile } from './market';
import { PARK_LAMPS, PARK_TILE_H, paintParkTile } from './buspark';
import { FRESH_ROAD, GROUND_Y, SHOP_TILE_H, blitLayer, paintShopTile, type PixelLayer } from './street';
import { drawFixedLook } from './fixedLook';
import { INK, WHITE } from './palette';

export type FirstStreet = 'alausa' | 'computerVillage' | 'ikeja';
export type FirstLook = 'tired' | 'bright';
export const FIRST_STREETS: readonly FirstStreet[] = ['alausa', 'computerVillage', 'ikeja'];

export interface FirstScreen {
  /** The level file's id. */
  level: string;
  theme: StreetTheme;
  /** The stretch, world units (and row units for the row pieces). */
  from: number;
  to: number;
  /** Where the street sign's pole stands, world x. */
  sign: number;
  /** The words on the sign (the only words added). */
  name: string;
}

/** Part 6's table. The look eases back to the street's own over the last FIRST_BLEND units. */
export const FIRST_SCREEN: Readonly<Record<FirstStreet, FirstScreen>> = {
  alausa: { level: 'lagos-1', theme: 'morning', from: 20, to: 760, sign: 260, name: 'Alausa' },
  computerVillage: { level: 'lagos-2', theme: 'market', from: 20, to: 1000, sign: 260, name: 'Computer Village' },
  ikeja: { level: 'lagos-3', theme: 'evening', from: 20, to: 1000, sign: 600, name: 'Ikeja' },
};
export const FIRST_BLEND = 120;

/** The first-screen street for a level id (lagos-1, lagos-2, lagos-3), else null. */
export function firstStreetOf(levelId: string): FirstStreet | null {
  for (const s of FIRST_STREETS) if (FIRST_SCREEN[s].level === levelId) return s;
  return null;
}

/** How much of the first-screen look shows at x: 1 inside the stretch, easing to 0 over its last FIRST_BLEND units. */
export function firstWeight(street: FirstStreet, x: number): number {
  const { to } = FIRST_SCREEN[street];
  if (!Number.isFinite(x) || x >= to) return 0;
  const k = Math.min(1, (to - x) / FIRST_BLEND);
  return k * k * (3 - 2 * k);
}

/** What drawBackdrop takes to draw the first screen: which street, which look, and reduced motion. */
export interface FirstDraw {
  street: FirstStreet;
  look: FirstLook;
  still?: boolean;
}

// ---------- Small helpers ----------

const TAU = Math.PI * 2;
const ROW_BASE = 264;
const WINDOW_TIRED = '#5a4a3a';
const SHUTTER = '#8d8173';
const SHUTTER_LINE = '#6f655a';
const CRACK = '#3a332a';

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, lw = 0, r = 1.5): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  if (lw > 0) {
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.stroke();
  }
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function line(g: CanvasRenderingContext2D, col: string, w: number, pts: readonly number[]): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i + 1 < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[0]!, pts[1]!);
    else g.lineTo(pts[i]!, pts[i + 1]!);
  }
  g.stroke();
}

/** A roll-down shutter over a shop front: brown-grey with 4 flat lines across (d2). Up: just the roll at the top. */
export function drawStreetShutter(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, up = false): void {
  if (up) {
    box(g, x - 1, y - 2, w + 2, 6, SHUTTER, 1, 3);
    return;
  }
  box(g, x, y, w, h, SHUTTER, 1.2, 1);
  g.fillStyle = SHUTTER_LINE;
  for (let k = 1; k <= 4; k++) g.fillRect(x + 2, y + (h * k) / 5 - 1, w - 4, 2);
  box(g, x + w / 2 - 5, y + h - 6, 10, 3, '#5d5449');
}

export type StreetGoods = 'tomatoes' | 'cloth' | 'boxes';

/** Goods out in front of an open shop, feet at (x, y): a crate of tomatoes, a rack of cloth or plain boxes. No brand, no writing. */
export function drawStreetGoods(g: CanvasRenderingContext2D, x: number, y: number, kind: StreetGoods): void {
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath();
  g.ellipse(x, y + 1, 16, 3, 0, 0, TAU);
  g.fill();
  if (kind === 'tomatoes') {
    for (let k = 0; k < 6; k++) disc(g, x - 10 + k * 4, y - 13 - (k % 2) * 2, 3.4, k % 3 === 2 ? '#e8502f' : '#d8342a');
    box(g, x - 13, y - 12, 26, 12, '#b8864f', 1.2, 1);
    g.fillStyle = '#9a6a3c';
    g.fillRect(x - 12, y - 7, 24, 1.5);
  } else if (kind === 'cloth') {
    line(g, '#5d6670', 2, [x - 14, y, x - 14, y - 30, x + 14, y - 30, x + 14, y]);
    const cols = ['#e0572b', '#13703a', '#f2b300', '#2b59c3', '#b83280'];
    for (let k = 0; k < 5; k++) box(g, x - 12 + k * 5, y - 29, 4.4, 20 - (k % 2) * 4, cols[k]!);
  } else {
    box(g, x - 14, y - 12, 15, 12, '#c9a26b', 1, 1);
    box(g, x + 1, y - 10, 13, 10, '#d6b47a', 1, 1);
    box(g, x - 9, y - 22, 14, 10, '#c9a26b', 1, 1);
  }
}

/** One neat tied sack and a closed box, waiting for collection (never spilled), feet at (x, y). */
export function drawStreetSack(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath();
  g.ellipse(x + 6, y + 1, 18, 3, 0, 0, TAU);
  g.fill();
  box(g, x + 6, y - 11, 16, 11, '#c9a26b', 1, 1);
  g.fillStyle = '#a8844f';
  g.fillRect(x + 6, y - 8, 16, 1.4);
  g.fillStyle = '#e8e0cc';
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 8, y);
  g.quadraticCurveTo(x - 11, y - 12, x - 3, y - 16);
  g.lineTo(x, y - 16);
  g.quadraticCurveTo(x + 7, y - 12, x + 5, y);
  g.closePath();
  g.fill();
  g.stroke();
  line(g, '#2f9a3a', 2, [x - 4, y - 17.5, x - 1.5, y - 15.5, x + 1, y - 17.5]);
}

/** Proud townspeople at row size (about 36 units tall), standing still. */
const FOLK_SCALE = 2.4;

export type FirstFolkDoing = 'wipe' | 'repair' | 'read' | 'trade' | 'buy' | 'school' | 'stand';

/** One townsperson standing at (x, y) (feet) doing something proud. `f` indexes FOLK (places.ts). */
export function drawFirstFolk(g: CanvasRenderingContext2D, x: number, y: number, f: number, doing: FirstFolkDoing): void {
  const folk: Folk = FOLK[((f % FOLK.length) + FOLK.length) % FOLK.length]!;
  const s = FOLK_SCALE;
  if (doing === 'repair') {
    // A small table with a phone open on it and a little lamp; he works standing behind it
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    drawFolk(g, folk, 0, 0, { turn: 1 });
    g.restore();
    box(g, x - 4, y - 16, 30, 3, '#8a5d36', 1, 1);
    g.fillStyle = '#6b4a2b';
    g.fillRect(x - 1, y - 13, 2.4, 13);
    g.fillRect(x + 21, y - 13, 2.4, 13);
    box(g, x + 4, y - 20, 6, 4, '#2b2f36');
    box(g, x + 12, y - 20, 6, 4, '#7fd6ff', 0.8);
    line(g, '#5d6670', 1.4, [x + 22, y - 16, x + 22, y - 26, x + 17, y - 26]);
    disc(g, x + 16, y - 25, 2, '#ffe27a');
    return;
  }
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  drawFolk(g, folk, 0, 0, { turn: doing === 'read' ? 0 : 1, happy: doing === 'school' || doing === 'buy', reach: doing === 'wipe' });
  g.restore();
  if (doing === 'wipe') {
    // A cloth in her raised hand, wiping her own shop window clean (no broom: decision 75)
    box(g, x + 12.5, y - 38.5, 6.5, 5.5, '#5aa9e6', 0.8, 1.2);
    line(g, '#3b7fb8', 0.8, [x + 14, y - 34.5, x + 17, y - 37]);
    line(g, WHITE, 1.2, [x + 21, y - 40, x + 24, y - 43]);
    line(g, WHITE, 1.2, [x + 22, y - 35, x + 26.5, y - 39.5]);
  } else if (doing === 'read') {
    // By a small bus stop post (a yellow plate, no words), a newspaper held open: grey lines, no words
    g.fillStyle = '#5d6670';
    g.fillRect(x + 16, y - 52, 2.4, 52);
    box(g, x + 11, y - 60, 12, 9, '#f2b300', 1, 1.5);
    box(g, x - 9, y - 26, 18, 12, '#f4f1e6', 0.8, 0.5);
    g.fillStyle = '#9a9a9a';
    for (let k = 0; k < 3; k++) g.fillRect(x - 7, y - 23 + k * 3, 14, 1);
    g.fillStyle = INK;
    g.fillRect(x - 0.4, y - 26, 0.8, 12);
  } else if (doing === 'trade') {
    // A basin of oranges held at the hip
    box(g, x + 6, y - 19, 14, 5, '#b9c2c8', 0.8, 2);
    for (let k = 0; k < 3; k++) disc(g, x + 9 + k * 4, y - 20, 2.4, '#f39c12');
  } else if (doing === 'buy') {
    // A woven bag on the arm
    box(g, x + 6, y - 16, 9, 8, '#c98a3a', 0.8, 2);
    line(g, '#8a5d36', 1, [x + 7, y - 16, x + 10.5, y - 21, x + 14, y - 16]);
  } else if (doing === 'school') {
    // A blue school bag on her back
    box(g, x - 11, y - 28, 6, 10, '#2b59c3', 0.8, 2);
  }
}

// ---------- Where the pieces go, per street (row units, base y = 0) ----------

interface Front {
  /** The shop front's opening: x, top y, width, height (to the base). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tired: shutter down. Bright: rolled up, with these goods out front. */
  shut: boolean;
  goods?: StreetGoods | undefined;
}

interface Person {
  x: number;
  f: number;
  doing: FirstFolkDoing;
}

interface Plan {
  tileH: number;
  paintRow: (g: CanvasRenderingContext2D) => void;
  fronts: readonly Front[];
  /** Windows the row draws with glass: tired paints 2 of every 3 warm brown. */
  windows: readonly (readonly [number, number, number, number])[];
  sack: number;
  tired: Person;
  bright: readonly Person[];
}

/** Street 1's shops (street.ts paintShops): k * 124 + 4 wide 116; the awning's bottom is the front's top. */
function shopFront(k: number, shut: boolean, goods?: StreetGoods): Front {
  const x = k * 124 + 4;
  const top = -(96 + (k % 3) * 10) + 49;
  return { x: x + 6, y: top, w: 104, h: -top, shut, goods };
}

const PLANS: Record<FirstStreet, Plan> = {
  alausa: {
    tileH: SHOP_TILE_H,
    paintRow: paintShopTile,
    fronts: [shopFront(1, true, 'tomatoes'), shopFront(3, true, 'cloth')],
    // Glass of shops 0, 2, 4 and 5 (shops 1 and 3 are shuttered)
    windows: [0, 2, 4, 5].map((k) => [k * 124 + 54, -48, 56, 28] as const),
    sack: 560,
    tired: { x: 296, f: 4, doing: 'wipe' },
    bright: [
      { x: 236, f: 2, doing: 'trade' },
      { x: 340, f: 1, doing: 'school' },
      { x: 478, f: 6, doing: 'buy' },
      { x: 610, f: 5, doing: 'stand' },
    ],
  },
  computerVillage: {
    tileH: MARKET_TILE_H,
    paintRow: paintMarketTile,
    // Market stalls (market.ts): k * 192 + 4 wide 132, the valance bottom at top + 28
    fronts: [1, 2].map((k) => ({ x: k * 192 + 9, y: -112 + (k % 2) * 6 + 28, w: 122, h: 112 - (k % 2) * 6 - 28, shut: true, goods: k === 1 ? ('tomatoes' as const) : ('boxes' as const) })),
    windows: [],
    sack: 700,
    tired: { x: 640, f: 3, doing: 'repair' },
    bright: [
      { x: 176, f: 2, doing: 'trade' },
      { x: 330, f: 7, doing: 'stand' },
      { x: 470, f: 1, doing: 'school' },
      { x: 680, f: 6, doing: 'buy' },
    ],
  },
  ikeja: {
    tileH: PARK_TILE_H,
    paintRow: paintParkTile,
    // The ticket kiosk's window (buspark.ts motorPark: kiosk at 310) and the battery kiosk's front (732)
    fronts: [
      { x: 320, y: -66, w: 50, h: 26, shut: true },
      { x: 744, y: -78, w: 112, h: 78, shut: true, goods: 'boxes' },
    ],
    windows: [],
    sack: 690,
    tired: { x: 540, f: 5, doing: 'read' },
    bright: [
      { x: 140, f: 0, doing: 'stand' },
      { x: 270, f: 2, doing: 'trade' },
      { x: 540, f: 1, doing: 'school' },
      { x: 660, f: 3, doing: 'buy' },
    ],
  },
};

/** What each first screen holds (for tests and qa): fronts shut when tired, the kerb sack's row x, the people. */
export function firstPieces(street: FirstStreet): { shutters: number; sack: number; tiredPeople: number; brightPeople: number; people: readonly number[] } {
  const p = PLANS[street];
  return { shutters: p.fronts.filter((f) => f.shut).length, sack: p.sack, tiredPeople: 1, brightPeople: p.bright.length, people: [p.tired.x, ...p.bright.map((b) => b.x)] };
}

// ---------- The back layer: Computer Village's mast ----------

/** Our own phone mast (a plain lattice tower, no brand), foot at (x, 0) on the row base. */
export const MAST = { x: 430, h: 200 } as const;

/**
 * A signal plate of 4 rising boxes (filled = bars working; the rest outlined), left foot at (x, y).
 * Shape, not colour: the count of filled boxes reads in greyscale.
 */
export function drawSignalBars(g: CanvasRenderingContext2D, x: number, y: number, filled: number, size = 1): void {
  box(g, x - 3 * size, y - 22 * size, 32 * size, 25 * size, '#fffaf0', 1.2, 3 * size);
  for (let k = 0; k < 4; k++) {
    const h = (6 + k * 4.5) * size;
    const bx = x + k * 7 * size;
    if (k < filled) box(g, bx, y - h, 5 * size, h, '#22a85a', 1, 0.5);
    else {
      g.strokeStyle = INK;
      g.lineWidth = 1;
      g.strokeRect(bx + 0.5, y - h + 0.5, 5 * size - 1, h - 1);
    }
  }
}

function paintMast(g: CanvasRenderingContext2D, look: FirstLook): void {
  const { x, h } = MAST;
  const steel = look === 'tired' ? '#8f8a80' : '#6b7480';
  // Three legs narrowing to the top, cross braces, a platform and three panels
  line(g, steel, 3, [x - 22, 0, x - 5, -h + 20]);
  line(g, steel, 3, [x + 22, 0, x + 5, -h + 20]);
  g.lineWidth = 1.4;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const y0 = -k * 30;
    const y1 = -(k + 1) * 30;
    const w0 = 22 - (k * 17) / 6;
    const w1 = 22 - ((k + 1) * 17) / 6;
    g.moveTo(x - w0, y0);
    g.lineTo(x + w1, y1);
    g.moveTo(x + w0, y0);
    g.lineTo(x - w1, y1);
  }
  g.stroke();
  line(g, steel, 3, [x, -h + 20, x, -h]);
  box(g, x - 12, -h + 18, 24, 4, steel);
  for (const dx of [-12, -2, 8]) box(g, x + dx, -h + 24, 5, 16, look === 'tired' ? '#d6d0c2' : '#eef2f5', 0.8, 1);
  drawSignalBars(g, x + 28, -h + 56, look === 'tired' ? 1 : 4);
}

/** The mast's top light (bright only): blinks once every 2 s; steady with reduced motion. Row units. */
function mastLight(g: CanvasRenderingContext2D, x: number, y: number, time: number, still: boolean): void {
  const on = still || time % 2 < 0.35;
  disc(g, x, y, 3.5, on ? '#ff6a3d' : '#8a4a3a');
  if (on) {
    g.fillStyle = 'rgba(255,120,80,0.3)';
    g.beginPath();
    g.arc(x, y, 8, 0, TAU);
    g.fill();
  }
}

const backSlot = { layer: null as PixelLayer | null };

/**
 * Screen space, between the far skyline and the row (drawBackdrop calls it). Only Computer
 * Village has a back piece: the mast, 1 bar of 4 (tired) or 4 of 4 with a blinking light (bright).
 */
export function drawFirstBack(g: CanvasRenderingContext2D, first: FirstDraw, camX: number, viewW: number, groundY = GROUND_Y, time = 0): void {
  if (first.street !== 'computerVillage') return;
  const base = ROW_BASE - (GROUND_Y - groundY);
  const x = MAST.x - camX * 0.5;
  if (x + 70 < 0 || x - 40 > viewW) return;
  const left = MAST.x - 40;
  const top = MAST.h + 10;
  const paint = (cg: CanvasRenderingContext2D): void => {
    cg.translate(-left, top);
    paintMast(cg, first.look);
  };
  if (!blitLayer(g, backSlot, `mast-${first.look}`, left - camX * 0.5, base - top, 110, top, paint, true)) {
    g.save();
    g.translate(-camX * 0.5, base);
    paintMast(g, first.look);
    g.restore();
  }
  if (first.look === 'bright') mastLight(g, x, base - MAST.h, time, first.still === true);
}

// ---------- The row layer ----------

function paintLamp(g: CanvasRenderingContext2D, x: number, on: boolean): void {
  // The park row's lamp head (buspark.ts streetLamp: head at x + 8..20, y -117..-112)
  if (!on) {
    box(g, x + 9, -113, 10, 3, '#3a3a3e', 0, 1);
    return;
  }
  const grad = g.createRadialGradient(x + 14, -108, 0, x + 14, -108, 40);
  grad.addColorStop(0, 'rgba(255,216,110,0.6)');
  grad.addColorStop(1, 'rgba(255,216,110,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x + 14, -108, 40, 0, TAU);
  g.fill();
  box(g, x + 9, -113, 10, 3, '#fff4c2', 0, 1.5);
}

/** The row layer's pieces, drawn with the row base at y = 0 (row units). */
export function paintFirstRow(g: CanvasRenderingContext2D, street: FirstStreet, look: FirstLook): void {
  const plan = PLANS[street];
  const { to } = FIRST_SCREEN[street];
  if (look === 'tired') {
    // The row itself again, then 50% toward warm sand (d2's TIRED_MIX), easing out over the blend
    g.save();
    g.beginPath();
    g.rect(0, -plan.tileH, to, plan.tileH);
    g.clip();
    plan.paintRow(g);
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createLinearGradient(to - FIRST_BLEND, 0, to, 0);
    const [r, gg, b] = [1, 3, 5].map((i) => parseInt(TIRED_SAND.slice(i, i + 2), 16));
    grad.addColorStop(0, `rgba(${r},${gg},${b},${TIRED_MIX})`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, -plan.tileH, to, plan.tileH);
    // Roofs a further 22% toward dusty brown: the top band of each building reads darker in greyscale too
    g.fillStyle = 'rgba(154,130,98,0.22)';
    g.fillRect(0, -plan.tileH, to - FIRST_BLEND, plan.tileH * 0.3);
    g.restore();
    // 2 of every 3 windows warm brown, no glint
    plan.windows.forEach(([x, y, w, h], i) => {
      if (i % 3 !== 2 && x + w < to - FIRST_BLEND) box(g, x, y, w, h, WINDOW_TIRED, 0, 2);
    });
  }
  for (const f of plan.fronts) {
    if (look === 'tired' && f.shut) drawStreetShutter(g, f.x, f.y, f.w, f.h);
    else {
      drawStreetShutter(g, f.x, f.y, f.w, f.h, true);
      if (f.goods) drawStreetGoods(g, f.x + f.w / 2, 10, f.goods);
    }
  }
  if (street === 'computerVillage') {
    // Three small shop screens on the phone stall's back wall (stall 3): tired 2 of 3 dark, bright all lit with a glint
    for (let k = 0; k < 3; k++) {
      const x = 3 * 192 + 30 + k * 30;
      const lit = look === 'bright' || k === 1;
      box(g, x, -70, 22, 15, lit ? '#7fd6ff' : '#2b2f36', 1.2, 1.5);
      if (lit) {
        g.fillStyle = '#ffffff';
        g.fillRect(x + 3, -67, 1, 9);
      }
    }
  }
  if (street === 'ikeja') for (const x of PARK_LAMPS) paintLamp(g, x, look === 'bright');
  if (look === 'tired') {
    drawStreetSack(g, plan.sack, 14);
    drawFirstFolk(g, plan.tired.x, 12, plan.tired.f, plan.tired.doing);
    if (street === 'alausa') {
      // Two cones at 70% size, resting against a shop wall at the back: never on the road band
      for (const cx of [430, 452]) {
        g.save();
        g.translate(cx, 4);
        g.scale(0.7, 0.7);
        drawCone(g, 0, 0);
        g.restore();
      }
    }
  } else for (const p of plan.bright) drawFirstFolk(g, p.x, 12, p.f, p.doing);
}

const rowSlot = { layer: null as PixelLayer | null };
/** How far below the row base the row layer reaches (the pavement, for people and goods). */
const ROW_DOWN = 30;

/** Screen space, straight after the street's row (drawBackdrop calls it). Painted once, copied while in view. */
export function drawFirstRow(g: CanvasRenderingContext2D, first: FirstDraw, camX: number, viewW: number, groundY = GROUND_Y): void {
  const { street, look } = first;
  const plan = PLANS[street];
  const { to } = FIRST_SCREEN[street];
  const base = ROW_BASE - (GROUND_Y - groundY);
  const x = -camX * 0.5;
  if (x + to + 40 < 0 || x > viewW) {
    // Out of view: let the picture go (it is about the size of one row tile); painted again if the hero walks back
    rowSlot.layer = null;
    return;
  }
  const paint = (cg: CanvasRenderingContext2D): void => {
    cg.translate(0, plan.tileH);
    paintFirstRow(cg, street, look);
  };
  // The layer's top left is the row tile's own (base - tileH), so the repainted row lands on the same pixels.
  if (blitLayer(g, rowSlot, `first-${street}-${look}`, x, base - plan.tileH, to + 40, plan.tileH + ROW_DOWN, paint, true)) return;
  g.save();
  g.translate(x, base);
  paintFirstRow(g, street, look);
  g.restore();
}

/**
 * The street's fixed look (after the hall), held back inside a tired stretch: drawn only right of
 * the stretch's end. A bright stretch draws it everywhere, as usual.
 */
export function drawFixedLookPast(g: CanvasRenderingContext2D, theme: string, first: FirstDraw | null | undefined, camX: number, viewW: number, viewH: number, groundY = GROUND_Y): void {
  if (!first || first.look === 'bright') {
    drawFixedLook(g, theme, camX, viewW, groundY);
    return;
  }
  const edge = FIRST_SCREEN[first.street].to - camX * 0.5;
  if (edge >= viewW) return;
  g.save();
  g.beginPath();
  g.rect(Math.max(0, edge), 0, viewW, viewH);
  g.clip();
  drawFixedLook(g, theme, camX, viewW, groundY);
  g.restore();
}

// ---------- The ground: cracks, fresh tarmac, the street sign ----------

/** Alausa's 5 thin cracks on the road's front face (world x, length): y 306 to 330, never on the walking line. */
export const ALAUSA_CRACKS: readonly (readonly [number, number])[] = [
  [110, 18],
  [236, 12],
  [372, 24],
  [498, 16],
  [612, 10],
];

function crack(g: CanvasRenderingContext2D, x: number, len: number, groundY: number, i: number): void {
  const y = groundY + 8 + (i % 3) * 6;
  const step = len / 3;
  const pts: number[] = [x, y];
  for (let k = 1; k <= 3; k++) pts.push(x + k * step, y + (k % 2 ? 3 : -2) + (k === 3 ? 4 : 0));
  line(g, CRACK, 1.5, pts);
}

/**
 * World space, straight after drawRoad (behind every crate, coin and hazard). Tired Alausa: the
 * cracks. Bright Alausa: fresh tarmac from the road's start (x -400 on every street) to the stretch's end, easing back to the old paint. Every street:
 * the plain street sign.
 */
export function drawFirstGround(g: CanvasRenderingContext2D, first: FirstDraw, camX: number, viewW: number, groundY = GROUND_Y, viewH = 420): void {
  const { street, look } = first;
  const fs = FIRST_SCREEN[street];
  if (camX > fs.to + 40) return;
  if (street === 'alausa') {
    if (look === 'tired') ALAUSA_CRACKS.forEach(([x, len], i) => crack(g, x, len, groundY, i));
    else freshRoad(g, Math.max(-400, camX - 20), Math.min(fs.to, camX + viewW + 20), fs.to, groundY, viewH);
  }
  drawStreetSign(g, fs.sign, groundY, fs.name);
}

function freshRoad(g: CanvasRenderingContext2D, a: number, b: number, to: number, groundY: number, viewH: number): void {
  // The same paint as drawRoad(..., fresh = true), fading out over the last FIRST_BLEND units in 6 steps
  const steps = 12;
  const solid = to - FIRST_BLEND;
  for (let i = -1; i < steps; i++) {
    const x0 = i < 0 ? a : Math.max(a, solid + (i * FIRST_BLEND) / steps);
    const x1 = i < 0 ? Math.min(b, solid) : Math.min(b, solid + ((i + 1) * FIRST_BLEND) / steps);
    if (x1 <= x0) continue;
    g.globalAlpha = i < 0 ? 1 : 1 - (i + 0.5) / steps;
    g.fillStyle = FRESH_ROAD.tar;
    g.fillRect(x0, groundY, x1 - x0, viewH - groundY);
    g.fillStyle = FRESH_ROAD.edge;
    g.fillRect(x0, groundY, x1 - x0, 5);
    g.fillStyle = FRESH_ROAD.edgeLine;
    g.fillRect(x0, groundY + 8, x1 - x0, 2);
    for (let x = Math.ceil(x0 / 60) * 60; x < x1; x += 60) g.fillRect(x, groundY + 28, Math.min(40, x1 - x), 4);
  }
  g.globalAlpha = 1;
}

/** The plain street sign: a cream plate #fffaf0, a 2-unit dark outline, bold dark words (at least 12 screen px). */
export const STREET_SIGN = { plate: '#fffaf0', ink: INK, pole: '#4f5359', minPx: 12, top: 178 } as const;

const signSlot = { layer: null as PixelLayer | null };

/** The sign's lines: one, or two when a long name would make a wide plate (a wide plate could read as a ledge). */
export function signLines(name: string): string[] {
  const words = name.split(' ');
  return words.length > 1 && name.length > 10 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
}

function paintSign(g: CanvasRenderingContext2D, name: string, unitPx: number, cx: number, top: number): { w: number; h: number } {
  const font = Math.max(14, STREET_SIGN.minPx / unitPx);
  const lines = signLines(name);
  g.font = `bold ${font}px sans-serif`;
  const tw = Math.max(...lines.map((l) => (typeof g.measureText === 'function' ? g.measureText(l)?.width : 0) || l.length * font * 0.6));
  const w = tw + font * 1.1;
  const h = lines.length * font * 1.15 + font * 0.6;
  const pole = STREET_SIGN.pole;
  g.fillStyle = pole;
  g.fillRect(cx - 2.5, top + h - 2, 5, STREET_SIGN.top - h + 2);
  g.fillRect(cx - 5, STREET_SIGN.top - 4, 10, 4);
  g.fillStyle = STREET_SIGN.plate;
  g.strokeStyle = STREET_SIGN.ink;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(cx - w / 2, top, w, h, 3);
  g.fill();
  g.stroke();
  g.fillStyle = STREET_SIGN.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, cx, top + font * 0.3 + font * 1.15 * (i + 0.5)));
  return { w, h };
}

/**
 * World space: the plain street sign, pole foot at (x, groundY - 4) at the back of the road edge.
 * Scenery, not solid; the plate sits well above jump height and has a pole under it so it reads as
 * a sign, not a ledge. The words are sized in screen pixels (at least 12 px bold at 320 x 240).
 */
export function drawStreetSign(g: CanvasRenderingContext2D, x: number, groundY: number, name: string): void {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const unitPx = m && m.d > 0 ? m.d : 1;
  const span = 260;
  const foot = groundY - 4;
  const top = foot - STREET_SIGN.top;
  const paint = (cg: CanvasRenderingContext2D): void => void paintSign(cg, name, unitPx, span / 2, 0);
  if (blitLayer(g, signSlot, `sign-${name}`, x - span / 2, top, span, STREET_SIGN.top + 2, paint, true)) return;
  g.save();
  g.translate(x - span / 2, top);
  paint(g);
  g.restore();
}
