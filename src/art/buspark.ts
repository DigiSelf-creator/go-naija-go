/**
 * Street 3, Bus park road (docs/design.md S2.6, S2.12 picture 9): the road into a big motor
 * park in the evening. Orange sky, parked yellow buses, a ticket kiosk and a loading ramp, a
 * vulcanizer with tyre piles and old drums, a suya spot with smoke, a battery charging kiosk,
 * a buka, phone repairs, and a road sign pointing on to Go-Slow Hall.
 * Our own drawings; made-up everyday signs; no company names, logos or party colours.
 * The street lamps are off: lighting them is part of the fixed look later (N1).
 *
 * Layers, back to front (screen space, each scrolls itself with parallax, like street.ts):
 * drawEveningSky, drawEveningSkyline (0.15), drawParkRow (0.5) with drawSuyaSmoke on it.
 * The passing bus from street.ts fits here too. World space: drawShedRoof (a platform).
 *
 * The sky, the skyline and the park row are painted once at the screen's own pixel size and
 * copied 1:1 each frame (blitLayer in street.ts), the caching that made Street 1 fast.
 */
import * as P from './palette';
import { DRUM_BODY, DRUM_HOOP } from './drum';
import { GROUND_Y, blitLayer, type PixelLayer } from './street';

const TAU = Math.PI * 2;

/** The made-up signs from S2.6, plus the everyday "TICKETS" and the way to the hall. */
export const PARK_SIGNS = ['VULCANIZER', 'SUYA SPOT', 'TICKETS', 'BATTERY CHARGING', 'BUKA', 'PHONE REPAIRS'] as const;
export const HALL_SIGN = 'GO-SLOW HALL';

const SKY_STOPS: readonly (readonly [number, string])[] = [
  [0, '#4c4787'],
  [0.4, '#b4607e'],
  [0.62, '#ee8a4e'],
  [0.8, '#ffc770'],
];
const SKY_LOW = '#ffc770';
const PARKED_YELLOW = '#e3c25a';
const FLOOR = '#c7ab84';
const FLOOR_EDGE = '#a98f6b';

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

function sign(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h = 18, board: string = P.SIGN_BOARD, ink: string = P.INK): void {
  inkRect(g, x, y, w, h, 3, board);
  g.fillStyle = ink;
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x + w / 2, y + h / 2 + 0.5, w - 8);
}

// ---------- Evening sky ----------

const skyLayer = { layer: null as PixelLayer | null };

/** The low sun sits just above the far rooftops, so the skyline cuts it. */
function paintSky(g: CanvasRenderingContext2D, viewW: number, viewH: number, upTo: number, groundY: number): void {
  const grad = g.createLinearGradient(0, 0, 0, viewH);
  for (const [k, c] of SKY_STOPS) grad.addColorStop(k, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, viewW, upTo);
  const sx = viewW * 0.68;
  const sy = groundY - 118;
  g.fillStyle = 'rgba(255,214,140,0.35)';
  g.beginPath();
  g.arc(sx, sy, 48, 0, TAU);
  g.fill();
  g.fillStyle = '#ffd98a';
  g.beginPath();
  g.arc(sx, sy, 30, 0, TAU);
  g.fill();
}

export function drawEveningSky(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, viewH = 420, groundY = GROUND_Y): void {
  const flat = viewH * 0.8;
  if (blitLayer(g, skyLayer, `e|${viewW}|${viewH}|${groundY}`, 0, 0, viewW, flat, (cg) => paintSky(cg, viewW, viewH, flat, groundY))) {
    g.fillStyle = SKY_LOW;
    g.fillRect(0, flat, viewW, viewH - flat);
  } else {
    paintSky(g, viewW, viewH, viewH, groundY);
  }
  // Long thin evening clouds drifting
  g.fillStyle = 'rgba(255,190,170,0.75)';
  const span = viewW + 400;
  for (let i = 0; i < 3; i++) {
    const x = ((((i * 360 + 60 - camX * 0.04 - time * 3) % span) + span) % span) - 200;
    const y = 46 + i * 30;
    rr(g, x, y, 120 - i * 20, 6, 3, 'rgba(255,190,170,0.75)');
    rr(g, x + 30, y - 6, 60, 6, 3, 'rgba(255,205,185,0.7)');
  }
}

// ---------- Far skyline at dusk (cached) ----------

const FAR_W = 756;
const FAR_H = 150;
const farLayer = { layer: null as PixelLayer | null };

function paintSkyline(g: CanvasRenderingContext2D): void {
  const step = 54;
  for (let i = 0; i < FAR_W / step; i++) {
    const h = 50 + Math.floor(hash(i + 200) * 70);
    const w = 40 + Math.floor(hash(i + 250) * 12);
    const x = i * step;
    const top = FAR_H - h;
    g.fillStyle = hash(i + 209) > 0.5 ? '#80526f' : '#714862';
    g.fillRect(x, top, w, h);
    // Windows: mostly dark; a few warm lanterns
    for (let y = top + 10, r = 0; y < FAR_H - 12; y += 16, r++) {
      for (let c = 0; c < 3; c++) {
        const lit = hash(i * 13 + r * 5 + c) > 0.82;
        g.fillStyle = lit ? '#ffcf7a' : '#5e3b55';
        g.fillRect(x + 6 + c * ((w - 12) / 3), y, (w - 12) / 3 - 4, 5);
      }
    }
    if (hash(i + 203) > 0.55) {
      g.fillStyle = '#5e3b55';
      g.fillRect(x + 8, top - 10, 12, 10);
    }
  }
  // A plain lattice mast (no logo)
  g.strokeStyle = '#5e3b55';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(600, FAR_H - 60);
  g.lineTo(612, 0);
  g.lineTo(624, FAR_H - 60);
  for (let y = 10; y < FAR_H - 60; y += 14) {
    const half = 2 + (y / (FAR_H - 60)) * 10;
    g.moveTo(612 - half, y);
    g.lineTo(612 + half, y + 14);
  }
  g.stroke();
}

export function drawEveningSkyline(g: CanvasRenderingContext2D, camX: number, viewW: number, groundY = GROUND_Y): void {
  const par = camX * 0.15;
  const y = groundY - FAR_H;
  for (let t = Math.floor(par / FAR_W); t * FAR_W - par < viewW; t++) {
    const x = t * FAR_W - par;
    if (blitLayer(g, farLayer, 'eskyline', x, y, FAR_W, FAR_H, paintSkyline, true)) continue;
    g.save();
    g.translate(x, y);
    paintSkyline(g);
    g.restore();
  }
}

// ---------- The park row (cached) ----------

const ROW_H = 140;
const ROW_BASE = 264;
/** Where each piece starts in the tile, and its width. */
const PART = {
  vulcanizer: [0, 176],
  suya: [176, 116],
  park: [292, 440],
  battery: [732, 136],
  buka: [868, 150],
  phone: [1018, 112],
  hall: [1130, 96],
} as const;
export const PARK_TILE_W = PART.hall[0] + PART.hall[1];
/** The suya grill's middle, from the tile's left edge (smoke rises from here). */
export const SUYA_GRILL_X = PART.suya[0] + 58;

function zincRoof(g: CanvasRenderingContext2D, x: number, y: number, w: number, slope: number): void {
  g.fillStyle = '#9aa5ab';
  g.beginPath();
  g.moveTo(x, y + slope);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + 8);
  g.lineTo(x, y + slope + 8);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let k = x + 5; k < x + w; k += 6) {
    const yy = y + slope * (1 - (k - x) / w);
    g.moveTo(k, yy + 1);
    g.lineTo(k, yy + 8);
  }
  g.stroke();
  g.fillStyle = '#b06a3a';
  g.fillRect(x + w * 0.2, y + slope * 0.8 + 2, 10, 4);
  g.fillRect(x + w * 0.7, y + slope * 0.3 + 3, 7, 3);
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y + slope);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + 8);
  g.lineTo(x, y + slope + 8);
  g.closePath();
  g.stroke();
}

function tyreStack(g: CanvasRenderingContext2D, x: number, base: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const y = base - 5 - i * 8;
    g.fillStyle = '#262626';
    g.beginPath();
    g.ellipse(x, y, 15, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#4a4a4a';
    g.beginPath();
    g.ellipse(x, y - 1.5, 7, 2.2, 0, 0, TAU);
    g.fill();
  }
}

function uprightDrum(g: CanvasRenderingContext2D, x: number, base: number, body: string): void {
  inkRect(g, x - 10, base - 30, 20, 30, 2, body, 1);
  g.fillStyle = DRUM_HOOP;
  g.fillRect(x - 10, base - 21, 20, 2);
  g.fillRect(x - 10, base - 11, 20, 2);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x - 6, base - 28, 2, 26);
}

function vulcanizer(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.vulcanizer[1];
  // Back wall, plank shed
  rr(g, x0 + 8, base - 92, w - 16, 92, 2, '#a98a6a');
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = x0 + 20; k < x0 + w - 10; k += 14) g.fillRect(k, base - 92, 1.5, 92);
  g.fillStyle = '#6b4a2b';
  g.fillRect(x0 + 6, base - 98, 5, 98);
  g.fillRect(x0 + w - 11, base - 104, 5, 104);
  zincRoof(g, x0, base - 110, w, 10);
  sign(g, PARK_SIGNS[0], x0 + 22, base - 134, w - 44, 20);
  // Tyre picture on the sign's left
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(x0 + 33, base - 124, 6, 0, TAU);
  g.fill();
  g.fillStyle = '#9a9a9a';
  g.beginPath();
  g.arc(x0 + 33, base - 124, 2.4, 0, TAU);
  g.fill();
  // Tyre piles and old drums (the rolling drum's family)
  tyreStack(g, x0 + 30, base, 5);
  tyreStack(g, x0 + 62, base, 3);
  uprightDrum(g, x0 + 96, base, DRUM_BODY);
  uprightDrum(g, x0 + 118, base, '#c8642e');
  // Air compressor: a red tank on small wheels with a coiled hose
  rr(g, x0 + 132, base - 22, 34, 14, 7, '#c0392b');
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(x0 + 138, base - 5, 4, 0, TAU);
  g.arc(x0 + 160, base - 5, 4, 0, TAU);
  g.fill();
  g.strokeStyle = '#222';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(x0 + 149, base - 34, 8, 6, 0, 0, TAU);
  g.stroke();
}

function suya(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.suya[1];
  const gx = x0 + 58;
  // Sign on a pole, with a skewer picture
  g.fillStyle = '#6b4a2b';
  g.fillRect(x0 + 14, base - 112, 4, 112);
  sign(g, PARK_SIGNS[1], x0 + 4, base - 128, 80, 20);
  // Hanging lantern (oil, lit)
  g.fillStyle = '#5a5a5a';
  g.fillRect(x0 + 96, base - 98, 2, 12);
  g.fillStyle = 'rgba(255,200,90,0.35)';
  g.beginPath();
  g.arc(x0 + 97, base - 80, 11, 0, TAU);
  g.fill();
  rr(g, x0 + 92, base - 87, 10, 12, 3, '#ffcf6a');
  // Grill: a long metal box on legs, glowing coals and skewers
  g.fillStyle = '#3a3a3a';
  g.fillRect(gx - 34, base - 44, 3, 44);
  g.fillRect(gx + 31, base - 44, 3, 44);
  inkRect(g, gx - 38, base - 52, 76, 12, 2, '#4a4a4a', 1);
  g.fillStyle = '#ff7a2a';
  g.fillRect(gx - 34, base - 52, 68, 4);
  g.fillStyle = '#ffd04a';
  for (let k = gx - 30; k < gx + 30; k += 9) g.fillRect(k, base - 52, 4, 2);
  for (let i = 0; i < 6; i++) {
    const sx = gx - 30 + i * 12;
    g.fillStyle = '#d9c7a0';
    g.fillRect(sx - 6, base - 57, 14, 1.5);
    g.fillStyle = '#8b3f1f';
    for (let j = 0; j < 3; j++) g.fillRect(sx - 4 + j * 4, base - 59, 3, 4);
  }
  // A tray of sliced onions and pepper on a stool
  rr(g, x0 + 84, base - 22, 26, 4, 1, '#c9c9c9');
  g.fillStyle = '#f3efdc';
  g.fillRect(x0 + 87, base - 25, 8, 3);
  g.fillStyle = '#d63a2a';
  g.fillRect(x0 + 97, base - 25, 8, 3);
  g.fillStyle = '#6b4a2b';
  g.fillRect(x0 + 88, base - 18, 2, 18);
  g.fillRect(x0 + 104, base - 18, 2, 18);
  void w;
}

/** A parked market bus, side on, plain yellow with black stripes and a roof load. */
function parkedBus(g: CanvasRenderingContext2D, x: number, base: number, facing: 1 | -1, load: string): void {
  g.save();
  g.translate(x, base);
  g.scale(facing, 1);
  const x0 = -66;
  const x1 = 66;
  const top = -60;
  const bot = -9;
  // Roof rack and load
  g.fillStyle = '#5a5a5a';
  g.fillRect(x0 + 8, top - 6, 96, 2);
  for (let rx = x0 + 10; rx < x0 + 104; rx += 18) g.fillRect(rx, top - 6, 2, 6);
  inkRect(g, x0 + 18, top - 15, 30, 10, 4, load, 1);
  inkRect(g, x0 + 52, top - 12, 22, 7, 3, '#b07a45', 1);
  // Body
  g.beginPath();
  g.moveTo(x0, bot);
  g.lineTo(x0, top + 4);
  g.quadraticCurveTo(x0, top, x0 + 4, top);
  g.lineTo(x1 - 26, top);
  g.lineTo(x1 - 6, top + 22);
  g.quadraticCurveTo(x1, top + 24, x1, top + 30);
  g.lineTo(x1, bot);
  g.closePath();
  g.fillStyle = PARKED_YELLOW; // a little softer than the bus the hero boards
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.3;
  g.stroke();
  g.fillStyle = P.BUS_STRIPE;
  g.fillRect(x0, top + 30, x1 - x0, 2.5);
  g.fillRect(x0, top + 38, x1 - x0, 2.5);
  g.fillStyle = P.BUS_GLASS;
  for (let wx = x0 + 6; wx + 17 < x1 - 30; wx += 20) g.fillRect(wx, top + 7, 17, 15);
  g.beginPath();
  g.moveTo(x1 - 28, top + 4);
  g.lineTo(x1 - 24, top + 4);
  g.lineTo(x1 - 9, top + 22);
  g.lineTo(x1 - 28, top + 22);
  g.closePath();
  g.fill();
  // Lights and wheels
  g.fillStyle = '#fff3b0';
  g.fillRect(x1 - 5, bot - 13, 4, 5);
  g.fillStyle = '#e74c3c';
  g.fillRect(x0 + 1, bot - 13, 3, 5);
  for (const wx of [x0 + 26, x1 - 28]) {
    g.fillStyle = P.TYRE_BLACK;
    g.beginPath();
    g.arc(wx, -8, 8, 0, TAU);
    g.fill();
    g.fillStyle = '#9a9a9a';
    g.beginPath();
    g.arc(wx, -8, 3, 0, TAU);
    g.fill();
  }
  g.restore();
}

function streetLamp(g: CanvasRenderingContext2D, x: number, base: number): void {
  // Off for now (the fixed look in N1 lights it)
  g.fillStyle = '#5d6670';
  g.fillRect(x - 1.5, base - 118, 3, 118);
  g.fillRect(x - 1.5, base - 118, 16, 3);
  rr(g, x + 8, base - 117, 12, 5, 2, '#5d6670');
  g.fillStyle = '#d6d2c4';
  g.fillRect(x + 10, base - 112, 8, 2);
}

function motorPark(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.park[1];
  // Low park wall with a painted band, and an open gateway
  rr(g, x0, base - 34, w, 34, 1, '#e3cfae');
  g.fillStyle = '#c96f3b';
  g.fillRect(x0, base - 14, w, 6);
  // Loading ramp: a concrete wedge up to a raised loading bay, with white chevrons
  const rx = x0 + 150;
  g.fillStyle = '#bdb6a8';
  g.beginPath();
  g.moveTo(rx, base);
  g.lineTo(rx + 44, base - 16);
  g.lineTo(rx + 150, base - 16);
  g.lineTo(rx + 150, base);
  g.closePath();
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = P.WHITE;
  g.lineWidth = 2;
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const cx = rx + 16 + k * 10;
    g.moveTo(cx, base - 2);
    g.lineTo(cx + 5, base - 6 - k * 3);
  }
  g.stroke();
  // Two parked buses: one on the bay, one on the ground facing the other way
  parkedBus(g, rx + 84, base - 16, 1, '#2b6cb0');
  parkedBus(g, x0 + 368, base, -1, '#8e5bb5');
  // Ticket kiosk: a small booth with a window and a ledge
  const kx = x0 + 18;
  inkRect(g, kx, base - 80, 70, 80, 3, '#e2a43c');
  rr(g, kx - 4, base - 86, 78, 8, 2, '#5d6670');
  rr(g, kx + 10, base - 66, 50, 26, 2, '#bfe3f5');
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(kx + 14, base - 63, 5, 20);
  g.fillStyle = '#8a5d36';
  g.fillRect(kx + 6, base - 40, 58, 4);
  sign(g, PARK_SIGNS[2], kx + 6, base - 108, 58, 18);
  // Lamp posts (off)
  streetLamp(g, x0 + 112, base);
  streetLamp(g, x0 + 420, base);
}

function batteryKiosk(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.battery[1];
  inkRect(g, x0 + 6, base - 96, w - 12, 96, 2, '#7fa7c9', 1);
  zincRoof(g, x0, base - 104, w, 6);
  sign(g, PARK_SIGNS[3], x0 + 10, base - 128, w - 20, 20);
  // Lightning picture on the sign's left
  g.fillStyle = '#f2b632';
  g.beginPath();
  const lx = x0 + 22;
  const ly = base - 118;
  g.moveTo(lx + 2, ly - 7);
  g.lineTo(lx - 4, ly + 1);
  g.lineTo(lx, ly + 1);
  g.lineTo(lx - 2, ly + 7);
  g.lineTo(lx + 4, ly - 1);
  g.lineTo(lx, ly - 1);
  g.closePath();
  g.fill();
  // Shelves of plain batteries with red and black posts, wired to a long board
  for (const [sy, n] of [
    [base - 70, 5],
    [base - 44, 5],
  ] as const) {
    g.fillStyle = '#6b4a2b';
    g.fillRect(x0 + 12, sy, w - 24, 3);
    for (let i = 0; i < n; i++) {
      const bx = x0 + 18 + i * 21;
      rr(g, bx, sy - 14, 16, 14, 1, '#2f2f2f');
      g.fillStyle = '#e74c3c';
      g.fillRect(bx + 2, sy - 17, 3, 3);
      g.fillStyle = '#111';
      g.fillRect(bx + 11, sy - 17, 3, 3);
    }
  }
  g.strokeStyle = '#e74c3c';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    g.moveTo(x0 + 21 + i * 21, base - 87);
    g.quadraticCurveTo(x0 + 26 + i * 21, base - 82, x0 + 24 + i * 21, base - 77);
  }
  g.stroke();
  rr(g, x0 + 30, base - 24, 70, 8, 2, '#d8d2c2');
}

function buka(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.buka[1];
  inkRect(g, x0 + 4, base - 100, w - 8, 100, 2, '#e9a65c', 1);
  sign(g, PARK_SIGNS[4], x0 + 30, base - 124, w - 60, 20);
  // Pot picture on the sign's left
  rr(g, x0 + 38, base - 117, 12, 8, 2, '#c0392b');
  // Open front with a short curtain, a counter of big pots
  rr(g, x0 + 14, base - 84, w - 28, 56, 2, '#5b4636');
  g.fillStyle = '#d9487a';
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.arc(x0 + 21 + i * 15, base - 84, 7.5, 0, Math.PI);
    g.fill();
  }
  g.fillStyle = '#8a5d36';
  g.fillRect(x0 + 10, base - 32, w - 20, 6);
  for (let i = 0; i < 4; i++) {
    const px = x0 + 22 + i * 30;
    rr(g, px, base - 50, 24, 18, 4, '#c9cdd1');
    rr(g, px - 2, base - 53, 28, 4, 2, '#aab0b5');
    g.fillStyle = '#6b6b6b';
    g.fillRect(px + 10, base - 57, 4, 4);
  }
  // Benches
  g.fillStyle = '#6b4a2b';
  g.fillRect(x0 + 12, base - 14, 50, 4);
  g.fillRect(x0 + 16, base - 10, 3, 10);
  g.fillRect(x0 + 56, base - 10, 3, 10);
  g.fillRect(x0 + 84, base - 14, 50, 4);
  g.fillRect(x0 + 88, base - 10, 3, 10);
  g.fillRect(x0 + 128, base - 10, 3, 10);
}

function phoneRepairs(g: CanvasRenderingContext2D, x0: number, base: number): void {
  const w = PART.phone[1];
  // A kiosk under a table umbrella
  const cx = x0 + w / 2;
  g.fillStyle = '#6b6b6b';
  g.fillRect(cx - 1.5, base - 92, 3, 60);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#fff1d6' : '#e8743b';
    g.beginPath();
    g.moveTo(cx, base - 94);
    g.ellipse(cx, base - 86, 44, 18, 0, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
    g.closePath();
    g.fill();
  }
  inkRect(g, x0 + 10, base - 38, w - 20, 38, 2, '#4f7cac', 1);
  rr(g, x0 + 14, base - 34, w - 28, 14, 1, '#bfe3f5');
  for (let i = 0; i < 5; i++) {
    rr(g, x0 + 20 + i * 15, base - 32, 8, 11, 2, P.INK);
    g.fillStyle = '#7fd6ff';
    g.fillRect(x0 + 21.5 + i * 15, base - 30.5, 5, 7);
  }
  sign(g, PARK_SIGNS[5], x0 + 8, base - 130, w - 16, 18);
  g.fillStyle = '#6b6b6b';
  g.fillRect(cx - 1, base - 112, 2, 18);
}

function hallSign(g: CanvasRenderingContext2D, x0: number, base: number): void {
  // A road sign on two posts: the way on to Go-Slow Hall, with a big arrow
  const w = PART.hall[1];
  g.fillStyle = '#5d6670';
  g.fillRect(x0 + 16, base - 80, 4, 80);
  g.fillRect(x0 + w - 20, base - 80, 4, 80);
  inkRect(g, x0 + 4, base - 112, w - 8, 40, 4, '#2c5f9e', 1.4);
  g.strokeStyle = P.WHITE;
  g.lineWidth = 1.2;
  g.beginPath();
  g.roundRect(x0 + 7, base - 109, w - 14, 34, 3);
  g.stroke();
  g.fillStyle = P.WHITE;
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(HALL_SIGN, x0 + w / 2, base - 100, w - 18);
  // Arrow pointing on (right)
  const ay = base - 86;
  g.fillRect(x0 + 24, ay - 2, 36, 4);
  g.beginPath();
  g.moveTo(x0 + 58, ay - 8);
  g.lineTo(x0 + 70, ay);
  g.lineTo(x0 + 58, ay + 8);
  g.closePath();
  g.fill();
}

function paintParkRow(g: CanvasRenderingContext2D): void {
  const base = ROW_H;
  vulcanizer(g, PART.vulcanizer[0], base);
  suya(g, PART.suya[0], base);
  motorPark(g, PART.park[0], base);
  batteryKiosk(g, PART.battery[0], base);
  buka(g, PART.buka[0], base);
  phoneRepairs(g, PART.phone[0], base);
  hallSign(g, PART.hall[0], base);
  // Evening light: a warm wash over everything just drawn (only where something was drawn)
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,120,60,0.12)';
  g.fillRect(0, 0, PARK_TILE_W, ROW_H);
  g.restore();
}

const rowLayer = { layer: null as PixelLayer | null };

/** Where each copy of the park row starts on screen (x), for the row and the smoke. */
export function parkTiles(camX: number, viewW: number): number[] {
  const par = camX * 0.5;
  const out: number[] = [];
  for (let t = Math.floor(par / PARK_TILE_W); t * PARK_TILE_W - par < viewW; t++) out.push(t * PARK_TILE_W - par);
  return out;
}

/** The park row at half camera speed, the ground in front of it, and the suya smoke. */
export function drawParkRow(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, groundY = GROUND_Y): void {
  const base = ROW_BASE - (GROUND_Y - groundY);
  g.fillStyle = FLOOR;
  g.fillRect(0, base, viewW, groundY - base);
  g.fillStyle = FLOOR_EDGE;
  g.fillRect(0, base, viewW, 3);
  for (const x of parkTiles(camX, viewW)) {
    if (!blitLayer(g, rowLayer, 'park', x, base - ROW_H, PARK_TILE_W, ROW_H, paintParkRow, true)) {
      g.save();
      g.translate(x, base - ROW_H);
      paintParkRow(g);
      g.restore();
    }
    const sx = x + SUYA_GRILL_X;
    if (sx > -60 && sx < viewW + 60) drawSuyaSmoke(g, sx, base - 56, time);
  }
}

/** Soft grey smoke curling up from the grill at (x, y); three puffs, always moving. */
export function drawSuyaSmoke(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let i = 0; i < 3; i++) {
    const k = (((time * 0.5 + i / 3) % 1) + 1) % 1;
    g.globalAlpha = 0.65 * (1 - k);
    g.fillStyle = '#f1ebe4';
    g.beginPath();
    g.arc(x - 10 + i * 10 + Math.sin(time * 1.5 + i * 2) * 4 - k * 10, y - k * 46, 5 + k * 9, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

// ---------- Zinc shed roof (platform, world space) ----------

/**
 * World space. A roadside shed whose flat zinc roof is a platform: its top edge is exactly at
 * topY (the landing line). Old tyres or a bench under it.
 */
export function drawShedRoof(g: CanvasRenderingContext2D, x: number, topY: number, w: number, groundY = GROUND_Y): void {
  const seed = Math.floor(x / 50);
  // Posts
  g.fillStyle = '#5d6670';
  g.fillRect(x + 6, topY + 10, 4, groundY - topY - 10);
  g.fillRect(x + w - 10, topY + 10, 4, groundY - topY - 10);
  if (groundY - topY > 40) {
    if (seed % 2 === 0) {
      for (let i = 0; x + 26 + i * 34 < x + w - 20; i++) tyreStack(g, x + 26 + i * 34, groundY, 2 + (i % 2));
    } else {
      g.fillStyle = '#8a5d36';
      g.fillRect(x + 14, groundY - 18, w - 28, 4);
      g.fillRect(x + 18, groundY - 14, 3, 14);
      g.fillRect(x + w - 21, groundY - 14, 3, 14);
    }
  }
  // Roof: corrugated zinc sheet with a bright top edge and a rust patch
  rr(g, x, topY, w, 10, 2, '#a3adb3');
  g.fillStyle = '#dfe5e8';
  g.fillRect(x + 2, topY + 1, w - 4, 2.5);
  g.fillStyle = 'rgba(0,0,0,0.2)';
  for (let i = x + 6; i < x + w - 4; i += 6) g.fillRect(i, topY + 4, 1.5, 6);
  g.fillStyle = '#b06a3a';
  g.fillRect(x + w * 0.3, topY + 4, 10, 4);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, topY, w, 10, 2);
  g.stroke();
}
