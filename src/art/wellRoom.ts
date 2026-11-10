/**
 * The well's secret store room (docs/design.md S2.5): a dry, cool, lamp-lit room
 * under the ground. Earth walls, wooden beams, three hanging clay oil lamps that
 * flicker softly, clay pots, woven baskets, plank shelves, and the exit rope with
 * its bucket. No water anywhere, no blue bricks, nothing from any game's
 * underground. Plus the garri parcel (leaf wrap and string) and its HUD icon.
 *
 * World space, room x 0 to 560, floor at y 300, screen bottom at 420. Wider
 * screens see dark earth beyond the walls.
 */
import { INK } from './palette';
import { drawBucket } from './well';

const TAU = Math.PI * 2;

export const ROOM = {
  w: 560,
  floorY: 300,
  /** The beam the lamps and the room's kobo crate hang from (its bottom edge). */
  beamY: 116,
  lamps: [140, 280, 420] as readonly number[],
  arriveX: 60,
  exitX: 500,
} as const;

export const ROOM_COLOURS = {
  earthDeep: '#1c130d',
  wall: '#8a5a3a',
  wallLight: '#9d6c48',
  wallDark: '#72472c',
  stone: '#a38c74',
  ceiling: '#5b3a24',
  beam: '#6b4528',
  beamLight: '#86593a',
  floor: '#6b4428',
  floorTop: '#8c6040',
  plank: '#c09062',
  plankDark: '#8e6440',
  clay: '#b4643a',
  clayDark: '#8a4527',
  basket: '#c9a15a',
  basketDark: '#9b7638',
  flame: '#ffcf5a',
  flameCore: '#fff3c4',
  glow: 'rgba(255,186,90,0.10)',
  leaf: '#4f8f3a',
  leafDark: '#33672a',
  string: '#7a5232',
  garri: '#efe3c2',
} as const;
const C = ROOM_COLOURS;

function outline(g: CanvasRenderingContext2D, w = 1.2): void {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Soft lamp flicker, 0.85 to 1.1, different for each lamp. */
export function lampFlicker(time: number, i: number): number {
  const t = Number.isFinite(time) ? time : 0;
  return 1 + 0.07 * Math.sin(t * 7.3 + i * 2.1) + 0.05 * Math.sin(t * 13.1 + i * 5.7) - 0.02;
}

function drawPot(g: CanvasRenderingContext2D, x: number, groundY: number, s: number): void {
  g.save();
  g.translate(x, groundY);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(-5, -22);
  g.lineTo(5, -22);
  g.quadraticCurveTo(4, -18, 9, -14);
  g.quadraticCurveTo(14, -6, 7, 0);
  g.lineTo(-7, 0);
  g.quadraticCurveTo(-14, -6, -9, -14);
  g.quadraticCurveTo(-4, -18, -5, -22);
  g.closePath();
  g.fillStyle = C.clay;
  g.fill();
  outline(g, 1.1);
  g.strokeStyle = C.clayDark;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-10, -10);
  g.quadraticCurveTo(0, -7, 10, -10);
  g.stroke();
  // Little zigzag band pressed into the clay
  g.beginPath();
  for (let i = 0; i <= 8; i++) g.lineTo(-8 + i * 2, -14 + (i % 2 ? 1.5 : 0));
  g.stroke();
  g.restore();
}

function drawBasket(g: CanvasRenderingContext2D, x: number, groundY: number, w: number): void {
  const h = w * 0.55;
  g.save();
  g.translate(x, groundY);
  g.beginPath();
  g.moveTo(-w / 2, -h);
  g.lineTo(w / 2, -h);
  g.lineTo(w / 2 - 3, 0);
  g.lineTo(-w / 2 + 3, 0);
  g.closePath();
  g.fillStyle = C.basket;
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = C.basketDark;
  g.lineWidth = 1;
  g.beginPath();
  for (let y = -h + 3; y < 0; y += 4) {
    g.moveTo(-w / 2, y);
    g.lineTo(w / 2, y);
  }
  for (let xx = -w / 2 + 3; xx < w / 2; xx += 5) {
    g.moveTo(xx, -h);
    g.lineTo(xx - 1.5, 0);
  }
  g.stroke();
  g.restore();
  g.beginPath();
  g.moveTo(-w / 2, -h);
  g.lineTo(w / 2, -h);
  g.lineTo(w / 2 - 3, 0);
  g.lineTo(-w / 2 + 3, 0);
  g.closePath();
  outline(g, 1.1);
  // A heap of something dry on top (yam, onions): round lumps
  g.fillStyle = '#d9b98a';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(-w / 4 + i * (w / 4), -h - 2, w * 0.13, 0, TAU);
    g.fill();
    outline(g, 0.8);
  }
  g.restore();
}

function drawLamp(g: CanvasRenderingContext2D, x: number, time: number, i: number): void {
  const y = ROOM.beamY + 26;
  const f = lampFlicker(time, i);
  // Glow: a few soft rings (cheap, no gradient)
  g.fillStyle = C.glow;
  for (const r of [70, 50, 32]) {
    g.beginPath();
    g.arc(x, y - 4, r * f, 0, TAU);
    g.fill();
  }
  // Three strings up to the beam
  g.strokeStyle = '#3d2a1c';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x, ROOM.beamY);
  g.lineTo(x - 7, y);
  g.moveTo(x, ROOM.beamY);
  g.lineTo(x + 7, y);
  g.moveTo(x, ROOM.beamY);
  g.lineTo(x, y);
  g.stroke();
  // Flame
  g.save();
  g.translate(x + 5, y - 1);
  g.scale(1, f);
  g.fillStyle = C.flame;
  g.beginPath();
  g.moveTo(0, -9);
  g.quadraticCurveTo(3.5, -3, 0, 0);
  g.quadraticCurveTo(-3.5, -3, 0, -9);
  g.fill();
  g.fillStyle = C.flameCore;
  g.beginPath();
  g.ellipse(0, -2.5, 1.2, 2.2, 0, 0, TAU);
  g.fill();
  g.restore();
  // Clay lamp dish with a spout
  g.beginPath();
  g.moveTo(-8 + x, y);
  g.lineTo(7 + x, y);
  g.lineTo(9 + x, y - 1.5);
  g.lineTo(8 + x, y + 2);
  g.quadraticCurveTo(x, y + 7, x - 8, y);
  g.closePath();
  g.fillStyle = C.clay;
  g.fill();
  outline(g, 1);
}

/**
 * The room behind everything: dark earth beyond the walls, earth walls, beams,
 * light from the two ceiling holes, pots, baskets and the three lamps. World
 * space; pass the camera so the dark earth fills a wide screen.
 */
export function drawWellRoom(g: CanvasRenderingContext2D, camX: number, viewW: number, time: number, viewH = 420): void {
  const L = camX - 10;
  const R = camX + viewW + 10;
  g.fillStyle = C.earthDeep;
  g.fillRect(L, 0, R - L, viewH);
  // Back wall with earth layers and a few stones
  g.fillStyle = C.wall;
  g.fillRect(0, 0, ROOM.w, ROOM.floorY);
  for (const [y, h, col] of [
    [150, 18, C.wallLight],
    [205, 10, C.wallDark],
    [250, 24, C.wallLight],
  ] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= ROOM.w; x += 40) g.lineTo(x, y + Math.sin(x * 0.03) * 3);
    g.lineTo(ROOM.w, y + h);
    for (let x = ROOM.w; x >= 0; x -= 40) g.lineTo(x, y + h + Math.sin(x * 0.025 + 1) * 3);
    g.closePath();
    g.fill();
  }
  g.fillStyle = C.stone;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.ellipse(20 + hash(i) * 520, 130 + hash(i + 20) * 160, 3 + hash(i + 40) * 4, 2 + hash(i + 60) * 2, 0, 0, TAU);
    g.fill();
  }
  // Ceiling
  g.fillStyle = C.ceiling;
  g.fillRect(0, 0, ROOM.w, ROOM.beamY - 12);
  // Light shafts from the two holes in the ceiling (dry daylight, not water)
  for (const x of [ROOM.arriveX, ROOM.exitX]) {
    g.fillStyle = 'rgba(255,240,200,0.12)';
    g.beginPath();
    g.moveTo(x - 12, 0);
    g.lineTo(x + 12, 0);
    g.lineTo(x + 30, ROOM.floorY);
    g.lineTo(x - 30, ROOM.floorY);
    g.closePath();
    g.fill();
    g.fillStyle = '#f4e3b8';
    g.beginPath();
    g.ellipse(x, ROOM.beamY - 14, 14, 3, 0, 0, TAU);
    g.fill();
  }
  // Beam across, and the side posts (the walls the hero cannot pass)
  g.fillStyle = C.beam;
  g.fillRect(0, ROOM.beamY - 12, ROOM.w, 12);
  g.fillStyle = C.beamLight;
  g.fillRect(0, ROOM.beamY - 12, ROOM.w, 3);
  for (const x of [0, ROOM.w - 30]) {
    g.fillStyle = C.wallDark;
    g.fillRect(x, 0, 30, ROOM.floorY);
    g.fillStyle = C.beam;
    g.fillRect(x + 22 - (x ? 16 : 0), ROOM.beamY - 12, 8, ROOM.floorY - ROOM.beamY + 12);
  }
  // Floor of packed earth
  g.fillStyle = C.floor;
  g.fillRect(0, ROOM.floorY, ROOM.w, viewH - ROOM.floorY);
  g.fillStyle = C.floorTop;
  g.fillRect(0, ROOM.floorY, ROOM.w, 4);
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 18; i++) g.fillRect(10 + hash(i + 80) * 540, ROOM.floorY + 12 + hash(i + 90) * 100, 4, 2);
  // Store things along the back wall
  drawPot(g, 44, ROOM.floorY, 0.9);
  drawBasket(g, 160, ROOM.floorY, 26);
  drawPot(g, 226, ROOM.floorY, 1.15);
  drawBasket(g, 336, ROOM.floorY, 22);
  drawPot(g, 452, ROOM.floorY, 0.8);
  drawPot(g, 520, ROOM.floorY, 1.0);
  // Lamps
  ROOM.lamps.forEach((x, i) => drawLamp(g, x, time, i));
}

/** A plank shelf against the wall: a one-way platform whose top is exactly at y. */
export function drawShelf(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  // Brackets into the wall
  g.fillStyle = C.plankDark;
  for (const bx of [x + 8, x + w - 14]) {
    g.beginPath();
    g.moveTo(bx, y + 5);
    g.lineTo(bx + 6, y + 5);
    g.lineTo(bx + 6, y + 18);
    g.closePath();
    g.fill();
    outline(g, 0.9);
  }
  g.fillStyle = C.plank;
  g.beginPath();
  g.roundRect(x, y, w, 6, 1.5);
  g.fill();
  outline(g, 1.1);
  g.fillStyle = C.plankDark;
  g.fillRect(x + 2, y + 3.5, w - 4, 1);
}

/** The room's rope and bucket at x (the way back up), or the arriving bucket. bucketY = rim y. */
export function drawRoomRope(g: CanvasRenderingContext2D, x: number, bucketY: number, time = 0): void {
  const sway = Number.isFinite(time) ? Math.sin(time * 1.4) * 1.2 : 0;
  g.strokeStyle = '#b89a6e';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x, ROOM.beamY - 14);
  g.quadraticCurveTo(x + sway * 0.5, (ROOM.beamY + bucketY) / 2, x + sway, bucketY - 6);
  g.stroke();
  drawBucket(g, x + sway, bucketY);
}

/** Where the exit bucket hangs: at a standing hero's hands. */
export const ROOM_ROPE_BUCKET_Y = 236;

// ---------- Garri parcel ----------

function parcelShape(g: CanvasRenderingContext2D): void {
  // A soft leaf bundle about 24 x 18, tied at the top
  g.beginPath();
  g.moveTo(-11, 4);
  g.quadraticCurveTo(-13, -6, -4, -8);
  g.lineTo(4, -8);
  g.quadraticCurveTo(13, -6, 11, 4);
  g.quadraticCurveTo(10, 10, 0, 10);
  g.quadraticCurveTo(-10, 10, -11, 4);
  g.closePath();
}

/**
 * The garri parcel: garri, sugar and epa wrapped in a green leaf and tied with
 * string. Centred on (x, y). It bobs gently and glints, so it reads as a gift.
 */
export function drawGarriParcel(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  g.save();
  g.translate(x, y + Math.sin(t * 2.4) * 1.5);
  parcelShape(g);
  g.fillStyle = C.leaf;
  g.fill();
  outline(g, 1.3);
  // Leaf veins and a folded flap
  g.strokeStyle = C.leafDark;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-9, 3);
  g.quadraticCurveTo(0, 0, 9, 3);
  g.moveTo(-6, -4);
  g.lineTo(-3, 1);
  g.moveTo(6, -4);
  g.lineTo(3, 1);
  g.stroke();
  // Garri peeping out at the top
  g.fillStyle = C.garri;
  g.beginPath();
  g.ellipse(0, -8, 5, 2, 0, 0, TAU);
  g.fill();
  // String around it and a bow on top
  g.strokeStyle = C.string;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-11.5, 1);
  g.quadraticCurveTo(0, 4, 11.5, 1);
  g.moveTo(0, -8);
  g.lineTo(0, 10);
  g.stroke();
  g.beginPath();
  g.ellipse(-3, -11, 3, 1.8, -0.4, 0, TAU);
  g.ellipse(3, -11, 3, 1.8, 0.4, 0, TAU);
  g.stroke();
  // Glint every 2 s
  const k = (t % 2) / 2;
  if (k < 0.25) {
    const a = 1 - k / 0.25;
    g.globalAlpha = a;
    g.strokeStyle = '#fff6c2';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(8, -9);
    g.lineTo(8, -15);
    g.moveTo(5, -12);
    g.lineTo(11, -12);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
}

/** Small still parcel for the HUD, centred on (x, y), scaled so it is about `size` across. */
export function drawParcelIcon(g: CanvasRenderingContext2D, x: number, y: number, size = 24): void {
  const s = (Number.isFinite(size) ? size : 24) / 26;
  g.save();
  g.translate(x, y + 1 * s);
  g.scale(s, s);
  parcelShape(g);
  g.fillStyle = C.leaf;
  g.fill();
  outline(g, 1.6);
  g.strokeStyle = C.string;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-11.5, 1);
  g.quadraticCurveTo(0, 4, 11.5, 1);
  g.moveTo(0, -8);
  g.lineTo(0, 10);
  g.stroke();
  g.beginPath();
  g.ellipse(-3, -11, 3, 1.8, -0.4, 0, TAU);
  g.ellipse(3, -11, 3, 1.8, 0.4, 0, TAU);
  g.stroke();
  g.restore();
}
