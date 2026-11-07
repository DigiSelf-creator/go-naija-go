/**
 * Slice 2 street pieces (docs/design.md S2.1, S2.2, S2.6, S2.12 pictures 8, 11, 12):
 * the pavement and gutter strip under the road, big pit cones, the start fence
 * with a parked bus, and the bus park at the street end with a big yellow bus
 * whose door slides open. All WORLD space: call after g.translate(-camX, 0).
 * Our own drawings: plain paint, no writing on the buses, no brands.
 */
import * as P from './palette';
import { GROUND_Y, drawBusShape } from './street';

const TAU = Math.PI * 2;

/** S2.1: the road front ends at y 360; the pavement strip runs to the screen bottom at 420. */
export const PAVEMENT_TOP = 360;
export const VIEW_BOTTOM = 420;

const GUTTER = '#2b2925';
const KERB = '#8d877c';
const KERB_DARK = '#6d685f';
const SLAB = '#4d4943';
const SLAB_JOINT = '#3c3934';

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function outline(g: CanvasRenderingContext2D, w = 1.5): void {
  g.strokeStyle = P.INK;
  g.lineWidth = w;
  g.stroke();
}

// ---------- Pavement and gutter strip ----------

/**
 * The 60 u strip under the road front: a gutter channel with drain slots, a kerb,
 * then plain dark paving slabs. Plain and darker than the road so the see-through
 * buttons read on it. Drawn only under solid road; pits stay dark to the bottom.
 */
export function drawPavement(
  g: CanvasRenderingContext2D,
  camX: number,
  viewW: number,
  ground: readonly (readonly [number, number])[],
  top = PAVEMENT_TOP,
  bottom = VIEW_BOTTOM,
): void {
  const L = camX - 20;
  const R = camX + viewW + 20;
  for (const span of ground) {
    const a = Math.max(span[0], L);
    const b = Math.min(span[1], R);
    if (b <= a) continue;
    // Gutter channel
    g.fillStyle = GUTTER;
    g.fillRect(a, top, b - a, 9);
    // Drain slots every 240 u
    g.fillStyle = '#5a554d';
    for (let x = Math.ceil((a + 30) / 240) * 240 - 30; x < b - 24; x += 240) {
      if (x < a) continue;
      for (let i = 0; i < 4; i++) g.fillRect(x + i * 6, top + 2, 3, 5);
    }
    // Kerb with joints
    g.fillStyle = KERB;
    g.fillRect(a, top + 9, b - a, 7);
    g.fillStyle = KERB_DARK;
    g.fillRect(a, top + 14, b - a, 2);
    for (let x = Math.ceil(a / 36) * 36; x < b; x += 36) g.fillRect(x, top + 9, 1.5, 7);
    // Slabs, staggered rows
    g.fillStyle = SLAB;
    g.fillRect(a, top + 16, b - a, bottom - top - 16);
    g.fillStyle = SLAB_JOINT;
    const rowH = (bottom - top - 16) / 2;
    for (let row = 0; row < 2; row++) {
      const y = top + 16 + row * rowH;
      g.fillRect(a, y, b - a, 1.5);
      const off = row * 24;
      for (let x = Math.ceil((a - off) / 48) * 48 + off; x < b; x += 48) g.fillRect(x, y, 1.5, rowH);
    }
    // Broken edge where the strip meets a pit
    g.fillStyle = P.POTHOLE_RIM;
    for (const [x, dir] of [
      [span[0], 1],
      [span[1], -1],
    ] as const) {
      if (x < L || x > R) continue;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + dir * 4, top + 18);
      g.lineTo(x + dir * 2, top + 34);
      g.lineTo(x + dir * 5, bottom);
      g.lineTo(x, bottom);
      g.closePath();
      g.fill();
    }
  }
}

// ---------- Cones ----------

/** One orange and white traffic cone, base centred on (x, groundY). About 14 x 22. */
export function drawCone(g: CanvasRenderingContext2D, x: number, groundY = GROUND_Y): void {
  g.save();
  g.translate(x, groundY);
  // Base plate
  rr(g, -8, -3, 16, 3, 1, '#c4501a');
  g.beginPath();
  g.roundRect(-8, -3, 16, 3, 1);
  outline(g, 1);
  // Body
  g.beginPath();
  g.moveTo(-6, -3);
  g.lineTo(-1.8, -22);
  g.quadraticCurveTo(0, -23.5, 1.8, -22);
  g.lineTo(6, -3);
  g.closePath();
  g.fillStyle = '#f26b1d';
  g.fill();
  // Two white bands (shape, not only colour: the cone is a tall stripy point)
  g.save();
  g.clip();
  g.fillStyle = '#ffffff';
  g.fillRect(-8, -16, 16, 3.5);
  g.fillRect(-8, -9.5, 16, 3.5);
  g.restore();
  g.beginPath();
  g.moveTo(-6, -3);
  g.lineTo(-1.8, -22);
  g.quadraticCurveTo(0, -23.5, 1.8, -22);
  g.lineTo(6, -3);
  g.closePath();
  outline(g, 1.2);
  g.restore();
}

/** S2.2 big pit: two cones on each lip of the pit [x0, x1]. */
export function drawBigPitCones(g: CanvasRenderingContext2D, x0: number, x1: number, groundY = GROUND_Y): void {
  drawCone(g, x0 - 22, groundY);
  drawCone(g, x0 - 8, groundY);
  drawCone(g, x1 + 8, groundY);
  drawCone(g, x1 + 22, groundY);
}

// ---------- Start of the street ----------

/**
 * Start of a street: a zinc-sheet compound fence on wooden posts ending at
 * wallX (the hero cannot pass it), with a yellow bus parked on the back lane just
 * past it. Draw before the hero.
 */
export function drawStartFence(g: CanvasRenderingContext2D, wallX: number, groundY = GROUND_Y): void {
  // Parked bus on the back lane, smaller so it reads as further back and never as a platform.
  g.save();
  g.translate(wallX + 64, groundY - 18);
  g.scale(0.72, 0.72);
  drawBusShape(g, 0, 0, 0, false);
  g.restore();

  const x0 = wallX - 80;
  const h = 66;
  // Zinc sheets: blue-grey with ridges, one rusty patch
  g.fillStyle = '#8fa3ad';
  g.fillRect(x0, groundY - h, wallX - x0, h);
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let x = x0 + 3; x < wallX - 1; x += 5) g.fillRect(x, groundY - h, 1.5, h);
  g.fillStyle = 'rgba(176,96,48,0.45)';
  g.beginPath();
  g.ellipse(wallX - 30, groundY - 14, 10, 7, 0.3, 0, TAU);
  g.fill();
  // Top and bottom rails
  g.fillStyle = '#7a5434';
  g.fillRect(x0, groundY - h + 6, wallX - x0, 4);
  g.fillRect(x0, groundY - 16, wallX - x0, 4);
  // Posts
  for (const px of [x0 + 18, x0 + 48, wallX - 6]) {
    rr(g, px, groundY - h - 6, 7, h + 6, 2, '#8a5d36');
    g.beginPath();
    g.roundRect(px, groundY - h - 6, 7, h + 6, 2);
    outline(g, 1.1);
  }
  g.beginPath();
  g.rect(x0, groundY - h, wallX - x0, h);
  outline(g, 1.2);
  // A painted arrow on a small board: this way
  rr(g, wallX - 40, groundY - 50, 30, 16, 3, P.SIGN_BOARD);
  g.beginPath();
  g.roundRect(wallX - 40, groundY - 50, 30, 16, 3);
  outline(g, 1);
  g.fillStyle = '#2fa36b';
  g.beginPath();
  g.moveTo(wallX - 36, groundY - 44);
  g.lineTo(wallX - 22, groundY - 44);
  g.lineTo(wallX - 22, groundY - 48);
  g.lineTo(wallX - 14, groundY - 42);
  g.lineTo(wallX - 22, groundY - 36);
  g.lineTo(wallX - 22, groundY - 40);
  g.lineTo(wallX - 36, groundY - 40);
  g.closePath();
  g.fill();
}

// ---------- End of the street: bus park ----------

/** S2.6: the yellow bus is parked from end.x - 40 to end.x + 160; its door is at end.x. */
export const END_BUS_BACK = -40;
export const END_BUS_FRONT = 160;
const BUS_TOP = 74;
const DOOR_W = 26;
const DOOR_TOP = 64;

/**
 * Behind the bus: the bus park shelter, a "BUS PARK" board and the bus park wall
 * at wallX (the hero's right limit). Draw before the bus and the hero.
 */
export function drawBusPark(g: CanvasRenderingContext2D, endX: number, wallX: number, groundY = GROUND_Y): void {
  // Shelter: long roof on poles behind the bus
  const sx0 = endX - 150;
  const sx1 = endX + 200;
  g.fillStyle = '#7d8a96';
  for (let x = sx0 + 8; x < sx1; x += 90) g.fillRect(x, groundY - 118, 5, 118);
  rr(g, sx0, groundY - 126, sx1 - sx0, 10, 3, '#3f6f9e');
  g.beginPath();
  g.roundRect(sx0, groundY - 126, sx1 - sx0, 10, 3);
  outline(g, 1.2);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = sx0 + 6; x < sx1 - 4; x += 9) g.fillRect(x, groundY - 124, 2, 7);
  // Benches under it
  g.fillStyle = '#8a5d36';
  g.fillRect(sx0 + 14, groundY - 22, 60, 4);
  g.fillRect(sx0 + 18, groundY - 18, 3, 18);
  g.fillRect(sx0 + 66, groundY - 18, 3, 18);
  // Board on its own pole: everyday words, no brand
  g.fillStyle = P.STOP_POLE;
  g.fillRect(endX - 112, groundY - 150, 4, 150);
  rr(g, endX - 146, groundY - 172, 72, 26, 5, '#1f6f4a');
  g.beginPath();
  g.roundRect(endX - 146, groundY - 172, 72, 26, 5);
  outline(g, 1.4);
  g.fillStyle = P.WHITE;
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BUS PARK', endX - 110, groundY - 158.5);

  // The wall: plastered block wall with a painted band and a cap
  const ww = 60;
  rr(g, wallX, groundY - 96, ww, 96, 2, '#e6d6b8');
  g.fillStyle = '#c96f3b';
  g.fillRect(wallX, groundY - 30, ww, 10);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = groundY - 84; y < groundY - 30; y += 14) g.fillRect(wallX, y, ww, 1.2);
  rr(g, wallX - 3, groundY - 102, ww + 6, 8, 2, '#b9a98c');
  g.beginPath();
  g.rect(wallX, groundY - 96, ww, 96);
  outline(g, 1.4);
}

export interface EndBusState {
  /** Door: 0 shut, 1 slid fully open. */
  door: number;
  /** How far the bus has pulled away to the right, in u. */
  dx?: number;
  /** Seconds, for the engine shake and the wheel turn. */
  time?: number;
  /** Engine running (shakes a little, exhaust puffs). */
  running?: boolean;
}

/**
 * Inside the door and windows (dark, seats). Draw this, then the hero hopping
 * in, then drawEndBus, so the hero goes in through the doorway.
 */
export function drawEndBusInside(g: CanvasRenderingContext2D, endX: number, s: EndBusState, groundY = GROUND_Y): void {
  const x = endX + (s.dx ?? 0);
  g.fillStyle = '#2f2a24';
  g.fillRect(x - DOOR_W / 2, groundY - DOOR_TOP, DOOR_W, DOOR_TOP - 12);
  // A seat back seen through the door
  rr(g, x - 2, groundY - 40, 12, 18, 3, '#7b2d26');
}

/**
 * The big yellow bus, front facing right, wheels on groundY, door centred on endX.
 * The body is drawn with the door opening cut out, so whatever was drawn inside
 * (drawEndBusInside, the hero) shows through it.
 */
export function drawEndBus(g: CanvasRenderingContext2D, endX: number, s: EndBusState, groundY = GROUND_Y): void {
  const t = Number.isFinite(s.time) ? (s.time as number) : 0;
  const dx = Number.isFinite(s.dx) ? (s.dx as number) : 0;
  const door = Math.min(1, Math.max(0, Number.isFinite(s.door) ? s.door : 0));
  const shake = s.running ? Math.sin(t * 40) * 0.5 : 0;
  const x0 = endX + END_BUS_BACK + dx;
  const x1 = endX + END_BUS_FRONT + dx;
  const dxDoor = endX + dx;
  const top = groundY - BUS_TOP + shake;
  const bot = groundY - 12 + shake;

  g.save();
  // Body with the door hole cut out (even-odd)
  // Roof rack with a tied load (a market bus, not a school bus)
  g.fillStyle = '#5a5a5a';
  g.fillRect(x0 + 10, top - 7, x1 - x0 - 60, 2.5);
  for (let rx = x0 + 12; rx < x1 - 50; rx += 22) g.fillRect(rx, top - 7, 2, 7);
  rr(g, x0 + 22, top - 17, 34, 11, 4, '#2fa36b');
  rr(g, x0 + 60, top - 14, 26, 8, 3, '#c8641e');
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(x0 + 22, top - 17, 34, 11, 4);
  g.roundRect(x0 + 60, top - 14, 26, 8, 3);
  g.moveTo(x0 + 39, top - 17);
  g.lineTo(x0 + 39, top - 6);
  g.stroke();
  // Boxy body with a short sloped nose
  g.beginPath();
  g.moveTo(x0, bot);
  g.lineTo(x0, top + 4);
  g.quadraticCurveTo(x0, top, x0 + 4, top);
  g.lineTo(x1 - 34, top);
  g.lineTo(x1 - 8, top + 30);
  g.quadraticCurveTo(x1, top + 32, x1, top + 40);
  g.lineTo(x1, bot);
  g.closePath();
  if (door > 0) g.rect(dxDoor - DOOR_W / 2, groundY - DOOR_TOP + shake, DOOR_W, DOOR_TOP - 12);
  g.fillStyle = P.BUS_YELLOW;
  g.fill('evenodd');
  outline(g, 1.6);
  // Side mirror
  g.fillStyle = P.INK;
  g.fillRect(x1 - 4, top + 26, 2, 10);
  g.fillRect(x1 - 1, top + 24, 4, 7);
  // Black side stripes
  g.fillStyle = P.BUS_STRIPE;
  for (const y of [top + 34, top + 44]) {
    g.fillRect(x0, y, dxDoor - DOOR_W / 2 - x0, 3);
    g.fillRect(dxDoor + DOOR_W / 2, y, x1 - dxDoor - DOOR_W / 2, 3);
  }
  // Windows (behind and ahead of the door) and the windscreen
  g.fillStyle = P.BUS_GLASS;
  for (let wx = x0 + 8; wx + 22 < dxDoor - DOOR_W / 2 - 2; wx += 26) g.fillRect(wx, top + 8, 22, 20);
  for (let wx = dxDoor + DOOR_W / 2 + 6; wx + 22 < x1 - 38; wx += 26) g.fillRect(wx, top + 8, 22, 20);
  // Windscreen along the slope
  g.beginPath();
  g.moveTo(x1 - 36, top + 5);
  g.lineTo(x1 - 32, top + 5);
  g.lineTo(x1 - 12, top + 28);
  g.lineTo(x1 - 36, top + 28);
  g.closePath();
  g.fill();
  // Sliding door: a panel that slides back over the body as it opens
  const panelX = dxDoor - DOOR_W / 2 - door * (DOOR_W - 4);
  rr(g, panelX, groundY - DOOR_TOP + shake, DOOR_W, DOOR_TOP - 12, 2, '#e9b90b');
  g.beginPath();
  g.roundRect(panelX, groundY - DOOR_TOP + shake, DOOR_W, DOOR_TOP - 12, 2);
  outline(g, 1.2);
  g.fillStyle = P.BUS_GLASS;
  g.fillRect(panelX + 4, groundY - DOOR_TOP + 6 + shake, DOOR_W - 8, 16);
  g.fillStyle = P.INK;
  g.fillRect(panelX + (door > 0.5 ? DOOR_W - 6 : 3), groundY - 36 + shake, 3, 7);
  // Lights
  g.fillStyle = '#fff3b0';
  g.fillRect(x1 - 6, bot - 16, 5, 6);
  g.fillStyle = '#e74c3c';
  g.fillRect(x0 + 1, bot - 16, 4, 6);
  // Bumpers
  rr(g, x0 - 3, bot - 6, 10, 5, 2, '#6b6b6b');
  rr(g, x1 - 7, bot - 6, 10, 5, 2, '#6b6b6b');
  // Wheels, turning as it pulls away
  for (const wx of [x0 + 34, x1 - 36]) {
    g.fillStyle = P.TYRE_BLACK;
    g.beginPath();
    g.arc(wx, groundY - 10, 10, 0, TAU);
    g.fill();
    g.fillStyle = '#9a9a9a';
    g.beginPath();
    g.arc(wx, groundY - 10, 4, 0, TAU);
    g.fill();
    const a = dx / 10;
    g.strokeStyle = '#5a5a5a';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(wx + Math.cos(a) * 4, groundY - 10 + Math.sin(a) * 4);
    g.lineTo(wx + Math.cos(a) * 8, groundY - 10 + Math.sin(a) * 8);
    g.stroke();
  }
  // Exhaust puffs behind when the engine runs
  if (s.running) {
    g.fillStyle = 'rgba(200,200,200,0.6)';
    for (let i = 0; i < 3; i++) {
      const k = (t * 2 + i / 3) % 1;
      g.globalAlpha = 0.6 * (1 - k);
      g.beginPath();
      g.arc(x0 - 6 - k * 22, groundY - 8 - k * 10, 3 + k * 5, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
}

export interface BusEndFrame extends EndBusState {
  /** The hero's hop into the door: 0 at the start spot, 1 inside. */
  hop: number;
  /** Hero still drawn (false once inside). */
  heroShown: boolean;
}

/** S2.6 street end timings, in s from the moment the hero reaches the door. */
export const BUS_END = { doorOpen: 0.2, hopEnd: 0.8, doorShut: 1.0, pullAway: 2.2 } as const;

/**
 * Where the bus end sequence is at t seconds: the door slides open, the hero
 * hops in (0.6 s), the door shuts and the bus pulls away to the right (1.4 s,
 * speeding up). The Street cleared screen opens at 2.2 s.
 */
export function busEndAt(t: number): BusEndFrame {
  const T = BUS_END;
  const c = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
  const s = Number.isFinite(t) ? Math.max(0, t) : 0;
  const door = s < T.doorOpen ? s / T.doorOpen : s < T.hopEnd ? 1 : 1 - c((s - T.hopEnd) / (T.doorShut - T.hopEnd));
  const hop = c((s - T.doorOpen) / (T.hopEnd - T.doorOpen));
  const drive = Math.max(0, s - T.hopEnd);
  // Even speed-up: about 600 u gone in 1.4 s, so the bus leaves any screen.
  const dx = 0.5 * 612 * drive * drive;
  return { door, hop, heroShown: s < T.hopEnd, dx, time: s, running: s >= T.hopEnd };
}
