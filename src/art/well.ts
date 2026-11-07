/**
 * The village well (docs/design.md S2.5, questions.md R4 and R8): a round wall
 * of plastered brick about 48 u wide and 30 u tall, a wooden frame with a log
 * roller and a crank on top, a rope and a bucket. Our own drawing: never a pipe,
 * tube or green cylinder, no water. It is scenery: the hero walks in front of it.
 *
 * World space. x is the well's centre, groundY the road top (wall top at
 * groundY - 30, frame top at groundY - 90).
 *
 * Draw order while the hero goes down or up:
 *   drawWellBack, then the hero inside clipWellMouth (so the wall hides the
 *   part of the hero below the rim), then drawWellFront.
 * When nobody is using it, drawWell does all of it.
 */
import { INK } from './palette';

const TAU = Math.PI * 2;

export const WELL = { w: 48, wallH: 30, frameH: 90 } as const;

export const WELL_COLOURS = {
  plaster: '#e2cda4',
  plasterShade: '#c8ae84',
  brick: '#b5603a',
  mouth: '#1f1712',
  wood: '#7a5232',
  woodLight: '#9a6d45',
  rope: '#b89a6e',
  bucket: '#8d969c',
  bucketDark: '#646d73',
} as const;
const C = WELL_COLOURS;

export type WellKind = 'entrance' | 'exit';

export interface WellState {
  kind: WellKind;
  /** Bucket drop below its resting place, in u (0 = hanging over the mouth). */
  drop?: number;
  /** Crank turn, radians. */
  crank?: number;
  /** Seconds, for the bobbing arrow. */
  time?: number;
  /** Show the soft "go down here" arrow (entrance wells only). Default true for an entrance. */
  arrow?: boolean;
}

// ---------- Timelines (pure, unit tested) ----------

export interface WellMove {
  /** Hero feet y offset from the road top (negative = up on the rim, positive = down the well). */
  heroDy: number;
  /** Hero x offset toward the well centre: 1 = on the rope. */
  toRope: number;
  /** Bucket drop, u. */
  drop: number;
  /** Crank angle, radians. */
  crank: number;
  /** Screen dark, 0 to 1. */
  fade: number;
  done: boolean;
}

/** S2.5 going down: 1.2 s. The hero steps up to the rope (0.25 s), then lowers 90 u with the bucket; the screen fades in the last 0.4 s. */
export const WELL_DOWN_TIME = 1.2;
/** S2.5 going up the room's rope: 1.0 s, the screen fades in the last 0.4 s. */
export const WELL_UP_TIME = 1.0;

const c01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function wellDownAt(t: number): WellMove {
  const s = Number.isFinite(t) ? Math.max(0, t) : 0;
  const step = c01(s / 0.25);
  const lower = c01((s - 0.25) / (WELL_DOWN_TIME - 0.25));
  // Step: a little hop up onto the rim and into the bucket (feet 30 u up). Then down 120 u with the bucket.
  const heroDy = s < 0.25 ? -30 * step - Math.sin(step * Math.PI) * 10 : -30 + lower * 120;
  return {
    toRope: step,
    heroDy: heroDy + 0, // never -0
    // The bucket first dips 11 u to meet the hero's feet at the rim, then lowers with them.
    drop: 11 * step + lower * 120,
    crank: lower * TAU * 3,
    fade: c01((s - (WELL_DOWN_TIME - 0.4)) / 0.4),
    done: s >= WELL_DOWN_TIME,
  };
}

/** Going up the rope in the room: the hero rises 120 u holding the rope; fade in the last 0.4 s. */
export function wellUpAt(t: number): WellMove {
  const s = Number.isFinite(t) ? Math.max(0, t) : 0;
  const k = c01(s / WELL_UP_TIME);
  const e = k * k * (3 - 2 * k);
  return { toRope: 1, heroDy: -e * 120 + 0, drop: 0, crank: -k * TAU * 3, fade: c01((s - (WELL_UP_TIME - 0.4)) / 0.4), done: s >= WELL_UP_TIME };
}

/** The bobbing arrow: rises and falls once every 2 s. Returns the y offset (u). */
export function wellArrowBob(time: number): number {
  return Number.isFinite(time) ? Math.sin((time * TAU) / 2) * 4 : 0;
}

// ---------- Drawing ----------

function outline(g: CanvasRenderingContext2D, w = 1.3): void {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

/** A metal bucket, its rim centred on (x, y). */
export function drawBucket(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, 6, Math.PI, TAU);
  g.stroke();
  g.beginPath();
  g.moveTo(-7, 0);
  g.lineTo(7, 0);
  g.lineTo(5.5, 11);
  g.lineTo(-5.5, 11);
  g.closePath();
  g.fillStyle = C.bucket;
  g.fill();
  outline(g, 1.1);
  g.fillStyle = C.bucketDark;
  g.fillRect(-6.4, 4, 12.8, 1.6);
  g.restore();
}

function wallTop(groundY: number): number {
  return groundY - WELL.wallH;
}

/** Back part: the frame, roller, crank, rope, bucket and the dark mouth. */
export function drawWellBack(g: CanvasRenderingContext2D, x: number, groundY: number, s: WellState): void {
  const top = wallTop(groundY);
  const frameTop = groundY - WELL.frameH;
  const rollerY = frameTop + 8;
  const crank = Number.isFinite(s.crank) ? (s.crank as number) : 0;
  const drop = Number.isFinite(s.drop) ? Math.max(0, s.drop as number) : 0;
  // Posts
  for (const px of [x - 21, x + 17]) {
    g.fillStyle = C.wood;
    g.beginPath();
    g.roundRect(px, frameTop, 4, top - frameTop + 4, 1.5);
    g.fill();
    outline(g, 1);
  }
  // Little roof board to keep sun and rain off
  g.fillStyle = C.woodLight;
  g.beginPath();
  g.moveTo(x - 28, frameTop + 1);
  g.lineTo(x, frameTop - 9);
  g.lineTo(x + 28, frameTop + 1);
  g.closePath();
  g.fill();
  outline(g, 1.1);
  // Roller log with rope wound on it
  g.fillStyle = C.woodLight;
  g.beginPath();
  g.roundRect(x - 19, rollerY - 3.5, 38, 7, 3);
  g.fill();
  outline(g, 1);
  g.strokeStyle = C.rope;
  g.lineWidth = 1.2;
  g.beginPath();
  const turn = (crank / TAU) % 1;
  for (let i = 0; i < 6; i++) {
    const rx = x - 9 + ((i + turn) % 6) * 3;
    g.moveTo(rx, rollerY - 3);
    g.lineTo(rx + 1.5, rollerY + 3);
  }
  g.stroke();
  // Crank on the right post: an arm and a handle that turn
  const cx = x + 23;
  const hx = cx + Math.cos(crank) * 6;
  const hy = rollerY + Math.sin(crank) * 6;
  g.strokeStyle = '#4a4440';
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 4, rollerY);
  g.lineTo(cx, rollerY);
  g.lineTo(hx, hy);
  g.stroke();
  g.fillStyle = C.wood;
  g.beginPath();
  g.arc(hx, hy, 2, 0, TAU);
  g.fill();
  outline(g, 0.8);
  // Mouth: the dark inside seen over the back rim
  g.fillStyle = C.plasterShade;
  g.beginPath();
  g.ellipse(x, top, WELL.w / 2, 5, 0, 0, TAU);
  g.fill();
  g.fillStyle = C.mouth;
  g.beginPath();
  g.ellipse(x, top + 0.5, WELL.w / 2 - 4, 3.2, 0, 0, TAU);
  g.fill();
  // Rope and bucket (entrance only; the exit well keeps its rope wound up)
  if (s.kind === 'entrance') {
    const bucketY = top - 20 + drop;
    g.save();
    // Below the rim the bucket is inside the well: hidden
    g.beginPath();
    g.rect(x - 40, frameTop - 20, 80, top + 1 - (frameTop - 20));
    g.clip();
    g.strokeStyle = C.rope;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x, rollerY + 3);
    g.lineTo(x, bucketY - 6);
    g.stroke();
    drawBucket(g, x, bucketY);
    g.restore();
  }
}

/** Front part: the round plastered wall with a few chips showing the brick under it. */
export function drawWellFront(g: CanvasRenderingContext2D, x: number, groundY: number): void {
  const top = wallTop(groundY);
  const half = WELL.w / 2;
  g.beginPath();
  g.moveTo(x - half, top);
  g.ellipse(x, top, half, 5, 0, Math.PI, 0, true);
  g.lineTo(x + half + 1, groundY - 3);
  g.quadraticCurveTo(x + half, groundY, x + half - 3, groundY);
  g.lineTo(x - half + 3, groundY);
  g.quadraticCurveTo(x - half, groundY, x - half - 1, groundY - 3);
  g.closePath();
  g.fillStyle = C.plaster;
  g.fill();
  // Round shading at the sides, so it reads as a round wall
  g.save();
  g.clip();
  g.fillStyle = C.plasterShade;
  g.fillRect(x + half - 8, top - 6, 10, WELL.wallH + 8);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(x - half + 4, top, 5, WELL.wallH);
  // Chipped plaster showing brick
  g.fillStyle = C.brick;
  for (const [bx, by] of [
    [-12, 9],
    [9, 17],
  ] as const) {
    // A ragged hole in the plaster with two and a half bricks showing
    const px = x + bx;
    const py = top + by;
    g.beginPath();
    g.moveTo(px - 7, py - 3);
    g.lineTo(px - 2, py - 5);
    g.lineTo(px + 6, py - 4);
    g.lineTo(px + 8, py + 1);
    g.lineTo(px + 4, py + 5);
    g.lineTo(px - 5, py + 4);
    g.closePath();
    g.fillStyle = C.brick;
    g.fill();
    g.strokeStyle = 'rgba(70,45,25,0.8)';
    g.lineWidth = 0.8;
    g.stroke();
    g.strokeStyle = '#d9c09a';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(px - 6, py);
    g.lineTo(px + 7, py);
    g.moveTo(px + 1, py - 4.5);
    g.lineTo(px + 1, py);
    g.moveTo(px - 2, py);
    g.lineTo(px - 2, py + 4);
    g.moveTo(px + 5, py);
    g.lineTo(px + 5, py + 4);
    g.stroke();
  }
  // A thin crack
  g.strokeStyle = 'rgba(90,70,40,0.5)';
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(x - 2, top + 4);
  g.lineTo(x + 1, top + 10);
  g.lineTo(x - 1, top + 14);
  g.stroke();
  g.restore();
  g.beginPath();
  g.moveTo(x - half, top);
  g.ellipse(x, top, half, 5, 0, Math.PI, 0, true);
  g.lineTo(x + half + 1, groundY - 3);
  g.quadraticCurveTo(x + half, groundY, x + half - 3, groundY);
  g.lineTo(x - half + 3, groundY);
  g.quadraticCurveTo(x - half, groundY, x - half - 1, groundY - 3);
  g.closePath();
  outline(g, 1.4);
  // Front rim lip
  g.strokeStyle = C.plasterShade;
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, top, half - 1, 4.2, 0, 0, Math.PI);
  g.stroke();
}

/**
 * Clip so whatever is drawn next (the hero going down or coming up) is hidden
 * inside the well, below the rim. Call between g.save() and g.restore().
 */
export function clipWellMouth(g: CanvasRenderingContext2D, x: number, groundY: number): void {
  const top = wallTop(groundY);
  g.beginPath();
  g.rect(x - 4000, -4000, 8000, 8000);
  g.rect(x - WELL.w / 2 + 2, top + 1, WELL.w - 4, 4000);
  g.clip('evenodd');
}

/** The soft "go down here" arrow over the crank, bobbing every 2 s. */
export function drawWellArrow(g: CanvasRenderingContext2D, x: number, groundY: number, time: number): void {
  const y = groundY - WELL.frameH - 26 + wellArrowBob(time);
  g.save();
  g.globalAlpha = 0.85;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [col, w] of [
    ['rgba(29,26,20,0.6)', 6],
    ['#ffffff', 3],
  ] as const) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y - 9);
    g.lineTo(x, y + 6);
    g.moveTo(x - 6, y);
    g.lineTo(x, y + 6);
    g.lineTo(x + 6, y);
    g.stroke();
  }
  g.restore();
}

/** A whole well when nobody is going down it. */
export function drawWell(g: CanvasRenderingContext2D, x: number, groundY: number, s: WellState): void {
  drawWellBack(g, x, groundY, s);
  drawWellFront(g, x, groundY);
  const arrow = s.arrow ?? s.kind === 'entrance';
  if (arrow && s.kind === 'entrance') drawWellArrow(g, x, groundY, Number.isFinite(s.time) ? (s.time as number) : 0);
}

/** Screen fade to dark while going down or up (alpha from wellDownAt / wellUpAt). Screen space. */
export function drawFade(g: CanvasRenderingContext2D, viewW: number, viewH: number, alpha: number): void {
  const a = Number.isFinite(alpha) ? c01(alpha) : 0;
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = '#120c08';
  g.fillRect(0, 0, viewW, viewH);
  g.restore();
}
