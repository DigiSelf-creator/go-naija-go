/**
 * Go-Slow Hall (docs/design.md S2.7, S2.12 picture 13): our own made-up building, a huge
 * roofed indoor motor park where General Go-Slow jams the traffic. Steel roof trusses, a row
 * of 8 roof lamps (dark in the fight, on one by one at the kind finish), painted lane lines
 * and arrows on a concrete floor, an open roller-shutter door on the left where the hero came
 * in with the "GO-SLOW HALL" board over it, big steel doors on the right behind the jam, a
 * line of traffic cones in front of the jam, and a drain grate by the left wall.
 *
 * A hall, never a temple and never a castle: no domes, towers, arches, crosses, crescents,
 * carved figures or any faith's sign; no castle bricks, no lava, no bridge or axe, no flagpole.
 * Not a real building. No writing but the hall's own name.
 *
 * World space: hall x 0 to 560, floor y 300, the dark apron strip from 360 to the screen
 * bottom (buttons and the hint bar sit on it). Wider screens centre the hall and see its
 * outside walls on both sides.
 *
 * Calls, in order (after g.translate(-camX, 0)):
 * 1. drawHall: the back of the hall (cached at screen pixels with blitLayer), the right doors,
 *    the dim before the lamps come on, the lit lamps and lit floor arrows.
 * 2. the go lights and General Go-Slow (boss.ts), throws.
 * 3. drawHallCones: the cone line, in front of the jam.
 * 4. the hero.
 * 5. drawHallFront: the cut walls and the outside beyond them (cached), so cars driving out
 *    through the right doors disappear behind the wall.
 */
import type { BossMode } from './boss';
import * as P from './palette';
import { drawCone } from './roadside';
import { blitLayer, type PixelLayer } from './street';

const TAU = Math.PI * 2;

export const HALL = {
  w: 560,
  floorY: 300,
  /** Top of the dark apron strip under the floor (the 60 u strip under every scene). */
  apronY: 360,
  /** Hero limits and the cone line (S2.7 layout). */
  heroMinX: 30,
  heroMaxX: 400,
  /** General Go-Slow's heap: bottom centre x. Throws come out of the gap at throwX. */
  bossX: 500,
  throwX: 470,
  /** Drain grate by the left wall: tyres drop in here. */
  drain: [0, 20] as readonly [number, number],
  /** Open roller-shutter door in the back wall, left (the hero walks in here). */
  leftDoor: { x0: 26, x1: 104, top: 196 },
  /** The "GO-SLOW HALL" board over the left door. */
  sign: { x: 10, y: 160, w: 110, h: 26 },
  /** Big steel doors in the back wall, right, behind the jam. */
  rightDoors: { x0: 446, x1: 558, top: 146 },
  /** Cut wall sections: inside faces at x 0 (left) and 566 (right). */
  wallL: 0,
  wallR: 566,
  wallThick: 14,
  /** Roof truss: top and bottom chords. */
  trussTop: 30,
  trussBottom: 66,
  /** Roof lamps: where each hangs (x) and the bottom of the shade (y). */
  lamps: [35, 105, 175, 245, 315, 385, 455, 525] as readonly number[],
  lampY: 96,
  /** Painted floor arrows (centre x), lit left to right at the finish. */
  arrows: [70, 170, 270, 370, 470] as readonly number[],
  arrowY: 329,
} as const;

/** The only writing in the hall: its own made-up name (Q21). */
export const HALL_SIGN_TEXT = 'GO-SLOW HALL';

export const HALL_COLOURS = {
  roof: '#4b535e',
  roofRib: '#3e454f',
  wallHigh: '#e6dcc8',
  wallLow: '#b9c4cf',
  wallBand: '#d68a4a',
  wallLine: 'rgba(0,0,0,0.07)',
  column: '#8fa9c2',
  columnLight: '#b3c8db',
  columnDark: '#5d6873',
  steel: '#66717d',
  steelLight: '#8a95a1',
  window: '#cfe6f2',
  windowBar: '#7b8794',
  floorTop: '#a8a49c',
  floor: '#928e86',
  floorDark: '#7f7b74',
  laneYellow: '#e8c43a',
  laneWhite: '#f1eee6',
  arrowOff: '#c9c5bb',
  arrowOn: '#ffe066',
  apron: '#46423c',
  apronJoint: '#3a3732',
  drain: '#2a2724',
  drainBar: '#6a655c',
  door: '#5f8fa8',
  doorDark: '#4a7389',
  doorRib: '#7eaac0',
  outsideSky: '#bfe4f5',
  outsideRoad: '#5a5a5e',
  shutter: '#9aa3ad',
  signBoard: '#2c5f9e',
  outerWall: '#c8a77c',
  outerWallDark: '#a98a62',
  shadeOff: '#3a4048',
  bulbOff: '#8f8c84',
  bulbOn: '#fff4c0',
  glow: 'rgba(255,226,140,0.22)',
  dim: '#1c2033',
} as const;
const C = HALL_COLOURS;

// ---------- The kind finish timeline (S2.7, "The funny, kind finish") ----------

/** Seconds from the third hit. Cars leave at 1.6, 2.05, 2.5 (boss.ts); lamps 3.0 to 4.05. */
export const HALL_FINISH = {
  doorsOpen: 1.4,
  doorSwing: 0.3,
  lampsFrom: 3.0,
  lampGap: 0.15,
  conesFrom: 3.0,
  conesTo: 4.2,
  arrowsFrom: 3.0,
  arrowsTo: 4.2,
} as const;

/** When each roof lamp clicks on, seconds from the third hit: play the 'hallLamp' sound at each. */
export function hallLampTimes(): number[] {
  return HALL.lamps.map((_, i) => HALL_FINISH.lampsFrom + i * HALL_FINISH.lampGap);
}

export interface HallLook {
  /** Seconds each roof lamp has been on (8 entries); below 0 (or missing) is off. */
  lamps?: readonly number[] | undefined;
  /** Right doors: 0 shut, 1 wide open. */
  doors?: number | undefined;
  /** Floor arrows lit, 0 to 1 (left to right). */
  arrows?: number | undefined;
  /** Running clock, for the lit arrows' soft pulse. */
  time?: number | undefined;
  /** Reduced motion: no pulse. */
  still?: boolean | undefined;
}

export interface HallFinish {
  lamps: number[];
  doors: number;
  cones: number;
  arrows: number;
}

function clamp01(k: number): number {
  return Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0;
}

function ease(k: number): number {
  const u = clamp01(k);
  return u * u * (3 - 2 * u);
}

/**
 * The hall at time t of the kind finish (seconds since the third hit). Still (reduced motion):
 * the doors and cones jump to their new place instead of swinging and sliding; the lamps still
 * come on one by one (light, not motion).
 */
export function hallFinishAt(t: number, still = false): HallFinish {
  const tt = Number.isFinite(t) ? t : 0;
  const F = HALL_FINISH;
  const lamps = hallLampTimes().map((at) => tt - at);
  const swing = (tt - F.doorsOpen) / F.doorSwing;
  const slide = (tt - F.conesFrom) / (F.conesTo - F.conesFrom);
  return {
    lamps,
    doors: still ? (swing >= 0 ? 1 : 0) : ease(swing),
    cones: still ? (slide >= 0 ? 1 : 0) : ease(slide),
    arrows: clamp01((tt - F.arrowsFrom) / (F.arrowsTo - F.arrowsFrom)),
  };
}

/**
 * The right doors during the fight and the finish: after a hit they open (0.15 to 0.4 s) to
 * let the car out, then shut again (1.1 to 1.4 s); on the defeat they open at 1.4 s and stay
 * open. Still: open or shut at once.
 */
export function hallDoors(mode: BossMode, t: number, still = false): number {
  const tt = Number.isFinite(t) ? t : 0;
  let k = 0;
  if (mode === 'hit') k = tt < 1.1 ? (tt - 0.15) / 0.25 : 1 - (tt - 1.1) / 0.3;
  else if (mode === 'defeat') k = (tt - HALL_FINISH.doorsOpen) / HALL_FINISH.doorSwing;
  if (still) return k > 0 ? 1 : 0;
  return ease(k);
}

// ---------- Small helpers ----------

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}

function inkRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, lw = 1.2): void {
  g.fillStyle = fill;
  g.strokeStyle = P.INK;
  g.lineWidth = lw;
  g.beginPath();
  g.rect(x, y, w, h);
  g.fill();
  g.stroke();
}

/** A right-pointing floor arrow centred on (x, y): a short shaft and a wide head. */
function arrowPath(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.beginPath();
  g.moveTo(x - 18, y - 3);
  g.lineTo(x + 4, y - 3);
  g.lineTo(x + 4, y - 8);
  g.lineTo(x + 18, y);
  g.lineTo(x + 4, y + 8);
  g.lineTo(x + 4, y + 3);
  g.lineTo(x - 18, y + 3);
  g.closePath();
}

// ---------- The back of the hall (cached) ----------

const TOP = -80;

function paintBack(g: CanvasRenderingContext2D, x0: number, viewH: number): void {
  g.save();
  g.translate(-x0, -TOP);
  const H = HALL;
  const L = H.wallL;
  const R = H.wallR;
  const fy = H.floorY;
  // Roof underside: corrugated sheets
  rect(g, L, TOP, R - L, H.trussBottom - TOP + 40, C.roof);
  g.fillStyle = C.roofRib;
  for (let x = L; x < R; x += 10) g.fillRect(x, TOP, 4, H.trussTop - TOP);
  // Back wall: pale block wall above, cool painted lower wall, a warm band between
  rect(g, L, H.trussTop + 8, R - L, fy - H.trussTop - 8, C.wallHigh);
  rect(g, L, 214, R - L, fy - 214, C.wallLow);
  rect(g, L, 208, R - L, 6, C.wallBand);
  g.fillStyle = C.wallLine;
  for (let y = 84; y < 208; y += 14) g.fillRect(L, y, R - L, 1);
  for (let y = 84, row = 0; y < 208; y += 14, row++) {
    for (let x = L + (row % 2) * 20; x < R; x += 40) g.fillRect(x, y, 1, 14);
  }
  // High louvre windows between the columns: daylight
  for (let i = 0; i < 4; i++) {
    const wx = 30 + i * 140;
    if (wx + 80 > H.rightDoors.x0 && wx < H.rightDoors.x1) continue;
    inkRect(g, wx, 106, 80, 26, C.window, 1);
    g.fillStyle = C.windowBar;
    for (let k = 1; k < 4; k++) g.fillRect(wx, 106 + k * 6.5, 80, 1.5);
    g.fillRect(wx + 39, 106, 2, 26);
  }
  // Left door: an open roller-shutter doorway, the street outside in daylight
  const d = H.leftDoor;
  rect(g, d.x0, d.top, d.x1 - d.x0, fy - d.top, C.outsideSky);
  rect(g, d.x0, fy - 26, d.x1 - d.x0, 26, C.outsideRoad);
  rect(g, d.x0, fy - 27, d.x1 - d.x0, 2, P.ROAD_EDGE);
  // A far wall and a palm across the road
  rect(g, d.x0, fy - 60, d.x1 - d.x0, 33, '#e8c99b');
  g.fillStyle = '#6a8f4a';
  g.fillRect(d.x0 + 52, fy - 92, 3, 32);
  g.beginPath();
  for (const a of [-2.6, -2.0, -1.2, -0.6]) {
    g.moveTo(d.x0 + 53.5, fy - 92);
    g.quadraticCurveTo(d.x0 + 53.5 + Math.cos(a) * 10, fy - 104, d.x0 + 53.5 + Math.cos(a) * 16, fy - 92 + Math.sin(a + 0.6) * -4);
  }
  g.strokeStyle = '#4f7a35';
  g.lineWidth = 3;
  g.stroke();
  // Rolled-up shutter box and the door frame
  inkRect(g, d.x0 - 4, d.top - 12, d.x1 - d.x0 + 8, 12, C.shutter);
  g.fillStyle = C.columnDark;
  g.fillRect(d.x0 - 4, d.top, 4, fy - d.top);
  g.fillRect(d.x1, d.top, 4, fy - d.top);
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.strokeRect(d.x0 - 4, d.top, 4, fy - d.top);
  g.strokeRect(d.x1, d.top, 4, fy - d.top);
  // The hall's name board over the left door
  const s = H.sign;
  inkRect(g, s.x, s.y, s.w, s.h, C.signBoard, 1.4);
  g.strokeStyle = P.WHITE;
  g.lineWidth = 1.2;
  g.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
  g.fillStyle = P.WHITE;
  g.font = 'bold 11px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(HALL_SIGN_TEXT, s.x + s.w / 2, s.y + s.h / 2 + 0.5, s.w - 12);
  // Right doorway: frame and the outside (the doors themselves are drawn live)
  const r = H.rightDoors;
  rect(g, r.x0, r.top, r.x1 - r.x0, fy - r.top, C.outsideSky);
  rect(g, r.x0, fy - 30, r.x1 - r.x0, 30, C.outsideRoad);
  rect(g, r.x0, fy - 31, r.x1 - r.x0, 2, P.ROAD_EDGE);
  rect(g, r.x0, fy - 66, r.x1 - r.x0, 35, '#e3b98a');
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  inkRect(g, r.x0 - 6, r.top - 8, r.x1 - r.x0 + 12, 8, C.columnDark);
  // Steel columns up to the truss, painted pale blue (so they never look like a light's
  // pole), with the yellow and black striped foot every motor park has
  for (const x of [140, 280, 420]) {
    inkRect(g, x - 6, H.trussBottom, 12, fy - H.trussBottom, C.column, 1);
    rect(g, x - 6, H.trussBottom, 3, fy - H.trussBottom, C.columnLight);
    g.save();
    g.beginPath();
    g.rect(x - 6, fy - 22, 12, 22);
    g.fillStyle = C.laneYellow;
    g.fill();
    g.clip();
    g.strokeStyle = P.INK;
    g.lineWidth = 2.5;
    g.beginPath();
    for (let k = -2; k < 4; k++) {
      g.moveTo(x - 6, fy - 22 + k * 8);
      g.lineTo(x + 6, fy - 22 + k * 8 + 12);
    }
    g.stroke();
    g.restore();
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.strokeRect(x - 6, fy - 22, 12, 22);
  }
  // Roof truss: two chords and a zigzag web, the whole width
  g.strokeStyle = C.steel;
  g.lineWidth = 3;
  g.beginPath();
  for (let x = L, k = 0; x <= R; x += 35, k++) {
    if (k === 0) g.moveTo(x, H.trussBottom);
    g.lineTo(x, k % 2 ? H.trussTop : H.trussBottom);
  }
  g.stroke();
  g.lineWidth = 1.4;
  g.beginPath();
  for (let x = L; x <= R; x += 35) {
    g.moveTo(x, H.trussTop);
    g.lineTo(x, H.trussBottom);
  }
  g.stroke();
  for (const y of [H.trussTop, H.trussBottom]) inkRect(g, L, y - 3, R - L, 6, C.steel, 1);
  g.fillStyle = C.steelLight;
  g.fillRect(L, H.trussTop - 3, R - L, 1.5);
  g.fillRect(L, H.trussBottom - 3, R - L, 1.5);
  // Roof lamps, dark: a rod and a wide steel shade each (the lit look is drawn live on top)
  for (const x of H.lamps) {
    rect(g, x - 1, H.trussBottom + 3, 2, H.lampY - H.trussBottom - 12, C.steel);
    g.beginPath();
    g.moveTo(x - 4, H.lampY - 12);
    g.lineTo(x + 4, H.lampY - 12);
    g.lineTo(x + 13, H.lampY);
    g.lineTo(x - 13, H.lampY);
    g.closePath();
    g.fillStyle = C.shadeOff;
    g.fill();
    g.strokeStyle = P.INK;
    g.lineWidth = 1.1;
    g.stroke();
    g.fillStyle = C.bulbOff;
    g.beginPath();
    g.arc(x, H.lampY + 1, 3.5, 0, Math.PI);
    g.fill();
  }
  // Concrete floor face with painted lanes and arrows
  rect(g, L, fy, R - L, H.apronY - fy, C.floor);
  rect(g, L, fy, R - L, 4, C.floorTop);
  rect(g, L, fy + 7, R - L, 3, C.laneYellow);
  g.fillStyle = C.laneWhite;
  for (let x = L + 8; x < R; x += 40) g.fillRect(x, fy + 48, 22, 2.5);
  g.fillStyle = C.floorDark;
  for (let i = 0; i < 16; i++) g.fillRect(L + hash(i) * (R - L - 8), fy + 14 + hash(i + 30) * 40, 5, 1.5);
  for (const x of H.arrows) {
    arrowPath(g, x, H.arrowY);
    g.fillStyle = C.arrowOff;
    g.fill();
  }
  // Drain grate at the left wall: tyres drop in here
  const [a, b] = H.drain;
  rect(g, a, fy - 1, b - a, 9, C.drain);
  g.fillStyle = C.drainBar;
  for (let x = a + 2; x < b; x += 4) g.fillRect(x, fy - 1, 1.6, 9);
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.strokeRect(a, fy - 1, b - a, 9);
  // Apron strip: plain and darker, so the buttons and the hint bar read on it
  rect(g, L - 40, H.apronY, R - L + 80, viewH - H.apronY, C.apron);
  g.fillStyle = C.apronJoint;
  g.fillRect(L - 40, H.apronY, R - L + 80, 3);
  for (let x = L; x < R + 40; x += 70) g.fillRect(x, H.apronY, 2, viewH - H.apronY);
  g.restore();
}

const backLayer = { layer: null as PixelLayer | null };

// ---------- Live layers ----------

function drawRightDoors(g: CanvasRenderingContext2D, open: number): void {
  const r = HALL.rightDoors;
  const fy = HALL.floorY;
  const half = (r.x1 - r.x0) / 2;
  const k = clamp01(open);
  // Each leaf swings in towards us: it narrows from its hinge (seen edge-on when open).
  const lw = Math.max(5, half * (1 - k * 0.92));
  for (const side of [-1, 1] as const) {
    const hinge = side < 0 ? r.x0 : r.x1;
    const x = side < 0 ? hinge : hinge - lw;
    const top = r.top - k * 6;
    const bottom = fy + k * 6;
    inkRect(g, x, top, lw, bottom - top, k > 0.5 ? C.doorDark : C.door, 1.3);
    if (lw > 14) {
      g.fillStyle = C.doorRib;
      for (let i = 1; i < 6; i++) {
        const rx = x + (lw * i) / 6;
        g.fillRect(rx - 0.75, top + 6, 1.5, bottom - top - 12);
      }
      // A handle near the middle when shut
      if (k < 0.3) {
        g.fillStyle = P.INK;
        g.fillRect(side < 0 ? x + lw - 6 : x + 3, fy - 80, 3, 14);
      }
    }
  }
}

function drawLitLamp(g: CanvasRenderingContext2D, x: number, age: number): void {
  const H = HALL;
  const y = H.lampY;
  // A soft cone of light down to the floor and a pool on it
  g.fillStyle = C.glow;
  g.beginPath();
  g.moveTo(x - 12, y);
  g.lineTo(x + 12, y);
  g.lineTo(x + 34, H.floorY);
  g.lineTo(x - 34, H.floorY);
  g.closePath();
  g.fill();
  g.beginPath();
  g.ellipse(x, H.floorY + 3, 34, 4, 0, 0, TAU);
  g.fill();
  // The bulb, and a bright flash for the first moment it clicks on
  const flash = age < 0.12 ? 1 - age / 0.12 : 0;
  g.fillStyle = 'rgba(255,240,180,0.35)';
  g.beginPath();
  g.arc(x, y + 2, 14 + flash * 8, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,244,200,0.7)';
  g.beginPath();
  g.arc(x, y + 2, 7 + flash * 5, 0, TAU);
  g.fill();
  g.fillStyle = C.bulbOn;
  g.beginPath();
  g.arc(x, y + 1, 4, 0, Math.PI);
  g.fill();
  // Shade inside lights up warm
  g.fillStyle = '#ffd77a';
  g.beginPath();
  g.moveTo(x - 11, y - 1.5);
  g.lineTo(x + 11, y - 1.5);
  g.lineTo(x + 12.5, y);
  g.lineTo(x - 12.5, y);
  g.closePath();
  g.fill();
}

/**
 * The back of Go-Slow Hall, world space (after g.translate(-camX, 0)). camX and viewW say what
 * the screen shows; viewH is the bottom of the screen in world units. The still parts are
 * painted once at screen pixels and copied each frame; only the doors, the dim, the lit lamps
 * and lit arrows are drawn live.
 */
export function drawHall(g: CanvasRenderingContext2D, camX: number, viewW: number, viewH = 420, look: HallLook = {}): void {
  const H = HALL;
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, H.apronY + 1) : 420;
  const x0 = H.wallL - 40;
  const w = H.wallR - x0 + 40;
  if (!blitLayer(g, backLayer, `hall|${bottom}`, x0, TOP, w, bottom - TOP, (cg) => paintBack(cg, x0, bottom))) {
    g.save();
    g.translate(x0, TOP);
    paintBack(g, x0, bottom);
    g.restore();
  }
  void camX;
  void viewW;
  drawRightDoors(g, look.doors ?? 0);
  // Before the lamps: the hall is a little dim (lit only by the windows and the doors)
  const lamps = look.lamps ?? [];
  const on = H.lamps.filter((_, i) => (lamps[i] ?? -1) >= 0).length;
  const dim = 0.2 * (1 - on / H.lamps.length);
  if (dim > 0.001) {
    g.globalAlpha = dim;
    g.fillStyle = C.dim;
    g.fillRect(H.wallL, TOP, H.wallR - H.wallL, H.apronY - TOP);
    g.globalAlpha = 1;
  } else if (on > 0) {
    // Every lamp on: a soft warm wash, the hall switched on
    g.globalAlpha = 0.08;
    g.fillStyle = '#ffd36b';
    g.fillRect(H.wallL, TOP, H.wallR - H.wallL, H.apronY - TOP);
    g.globalAlpha = 1;
  }
  H.lamps.forEach((x, i) => {
    const age = lamps[i] ?? -1;
    if (Number.isFinite(age) && age >= 0) drawLitLamp(g, x, age);
  });
  // Floor arrows light up left to right, pointing the way out
  const lit = clamp01(look.arrows ?? 0) * H.arrows.length;
  const time = Number.isFinite(look.time) ? (look.time as number) : 0;
  H.arrows.forEach((x, i) => {
    const k = clamp01(lit - i);
    if (k <= 0) return;
    const pulse = look.still ? 1 : 0.85 + 0.15 * Math.sin(time * 4 - i * 0.7);
    g.globalAlpha = k * 0.35 * pulse;
    g.fillStyle = C.arrowOn;
    g.beginPath();
    g.ellipse(x, H.arrowY, 26, 11, 0, 0, TAU);
    g.fill();
    g.globalAlpha = k;
    arrowPath(g, x, H.arrowY);
    g.fillStyle = C.arrowOn;
    g.fill();
    g.strokeStyle = '#b88a10';
    g.lineWidth = 1;
    g.stroke();
    g.globalAlpha = 1;
  });
}

// ---------- The cone line ----------

/** The cones in front of the jam (x on the floor), and where each slides aside to. */
export const HALL_CONES: readonly { x: number; toX: number }[] = [
  { x: 408, toX: 386 },
  { x: 424, toX: 398 },
  { x: 440, toX: 470 },
  { x: 456, toX: 484 },
];

/** Where the cones are when the slide is k of the way (0 in line, 1 aside): x, y and size. */
export function hallConesAt(k: number): { x: number; y: number; s: number }[] {
  const u = clamp01(k);
  return HALL_CONES.map((c) => ({ x: c.x + (c.toX - c.x) * u, y: HALL.floorY - 10 * u, s: 1 - 0.18 * u }));
}

/**
 * The cone line at the hero's right limit (x 400), with a striped bar resting on the cones.
 * slide 0: in line; 1: slid aside to open the way (they move back towards the wall, so
 * they look smaller and higher), with a little dust as they go.
 */
export function drawHallCones(g: CanvasRenderingContext2D, slide = 0): void {
  const u = clamp01(slide);
  const at = hallConesAt(u);
  if (u < 0.05) {
    // The bar across the cone tops: orange and white stripes, one shape (never colour alone)
    const a = at[0]!;
    const b = at[at.length - 1]!;
    g.save();
    g.beginPath();
    g.roundRect(a.x - 4, HALL.floorY - 26, b.x - a.x + 8, 5, 2);
    g.fillStyle = P.WHITE;
    g.fill();
    g.clip();
    g.fillStyle = '#f26b1d';
    for (let x = a.x - 4; x < b.x + 4; x += 10) g.fillRect(x, HALL.floorY - 26, 5, 5);
    g.restore();
    g.beginPath();
    g.roundRect(a.x - 4, HALL.floorY - 26, b.x - a.x + 8, 5, 2);
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.stroke();
  }
  for (const c of at) {
    g.save();
    g.translate(c.x, c.y);
    g.scale(c.s, c.s);
    drawCone(g, 0, 0);
    g.restore();
  }
  if (u > 0 && u < 1) {
    // Dust behind each sliding cone
    g.globalAlpha = 0.6 * (1 - u);
    g.fillStyle = '#d9c9a3';
    for (const c of at) {
      g.beginPath();
      g.arc(c.x - 6, c.y - 2, 3 + u * 3, 0, TAU);
      g.arc(c.x + 6, c.y - 3, 2 + u * 2, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

// ---------- The cut walls and the outside (in front) ----------

function paintSide(g: CanvasRenderingContext2D, x0: number, w: number, side: -1 | 1, viewH: number): void {
  const H = HALL;
  g.save();
  g.translate(-x0, -TOP);
  const fy = H.floorY;
  // Outside wall of the hall: warm painted blocks under the roof edge, a vent, the ground
  const L = x0;
  const R = x0 + w;
  rect(g, L, TOP, w, fy - TOP, C.outerWall);
  g.fillStyle = C.outerWallDark;
  for (let y = 40; y < fy; y += 16) g.fillRect(L, y, w, 1.5);
  for (let y = 40, row = 0; y < fy; y += 16, row++) {
    for (let x = Math.floor(L / 48) * 48 + (row % 2) * 24; x < R; x += 48) g.fillRect(x, y, 1.5, 16);
  }
  rect(g, L, 230, w, 8, C.wallBand);
  rect(g, L, TOP, w, H.trussTop + 8 - TOP, C.roof);
  rect(g, L, H.trussTop + 2, w, 6, C.roofRib);
  // Ground outside: a strip of pavement, then the same dark apron
  rect(g, L, fy, w, H.apronY - fy, '#b9ad98');
  rect(g, L, fy, w, 4, '#cfc4b0');
  rect(g, L, H.apronY, w, viewH - H.apronY, C.apron);
  // The cut wall section itself: thick, with the roof edge over it
  const wx = side < 0 ? H.wallL - H.wallThick : H.wallR;
  inkRect(g, wx, H.trussTop - 6, H.wallThick, fy - H.trussTop + 6, C.outerWallDark, 1.4);
  g.fillStyle = C.wallBand;
  g.fillRect(wx + 1, 208, H.wallThick - 2, 6);
  // A small louvre vent on the outside wall, a step out from the cut
  const vx = side < 0 ? wx - 70 : wx + H.wallThick + 40;
  inkRect(g, vx, 120, 30, 22, '#9b8467', 1);
  g.fillStyle = '#6f5e48';
  for (let k = 1; k < 4; k++) g.fillRect(vx + 2, 120 + k * 5.5, 26, 1.5);
  g.restore();
}

const leftLayer = { layer: null as PixelLayer | null };
const rightLayer = { layer: null as PixelLayer | null };

/**
 * In front of everything but the HUD: the two cut walls and, on screens wider than the hall,
 * the hall's outside walls beyond them. Cars that drive out through the right doors go
 * behind the right wall here. World space; camX and viewW say what the screen shows.
 */
export function drawHallFront(g: CanvasRenderingContext2D, camX: number, viewW: number, viewH = 420): void {
  const H = HALL;
  const bottom = Number.isFinite(viewH) ? Math.max(viewH, H.apronY + 1) : 420;
  const cx = Number.isFinite(camX) ? camX : 0;
  const vw = Number.isFinite(viewW) ? viewW : H.w;
  // Painted out to a little past the screen edge, in steps of 64 u so a few widths share a copy.
  const leftFrom = Math.min(H.wallL - H.wallThick, Math.floor((cx - 8) / 64) * 64);
  const rightTo = Math.max(H.wallR + H.wallThick, Math.ceil((cx + vw + 8) / 64) * 64);
  const pieces: [typeof leftLayer, number, number, -1 | 1][] = [
    [leftLayer, leftFrom, H.wallL - leftFrom, -1],
    [rightLayer, H.wallR, rightTo - H.wallR, 1],
  ];
  for (const [slot, x0, w, side] of pieces) {
    if (!(w > 0)) continue;
    const paint = (cg: CanvasRenderingContext2D): void => paintSide(cg, x0, w, side, bottom);
    if (!blitLayer(g, slot, `hs|${side}|${x0}|${w}|${bottom}`, x0, TOP, w, bottom - TOP, paint)) {
      g.save();
      g.translate(x0, TOP);
      paint(g);
      g.restore();
    }
  }
}
