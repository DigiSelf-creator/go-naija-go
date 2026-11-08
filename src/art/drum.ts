/**
 * The rolling drum (docs/design.md S2.6, S2.12 picture 7): an empty, plain metal drum
 * lying on its side and rolling left from the vulcanizer. No writing, no brand.
 *
 * Seen a little from the side: the round lid at the front, the body going back up and to
 * the right, with two raised rolling hoops (ridges). So it is taller than the tyre, blue,
 * and ridged, where the tyre is round, black and treaded: it reads by shape, not colour alone.
 *
 * World space. (x, y) is the bottom centre of its 26 x 30 box, on the road.
 * rot is the game's roll angle (distance / 11, as the tyre); the lid turns by the matching
 * amount for its own size, so it rolls without slipping.
 */
import * as P from './palette';

const TAU = Math.PI * 2;

/** The S2.6 box and the drawing's measures. */
export const DRUM = {
  w: 26,
  h: 30,
  /** Lid radius. */
  r: 8,
  /** The back end's offset from the lid centre (depth, up and to the right). */
  dx: 10,
  dy: -14,
  /** The game turns rot by distance / 11. */
  rollR: 11,
} as const;

export const DRUM_BODY = '#2f6db3';
export const DRUM_LID = '#5b9be0';
export const DRUM_HOOP = '#1d4b80';
const DRUM_SHINE = 'rgba(255,255,255,0.55)';
const DRUM_RUST = '#b8642c';

/** The lid centre and the back end centre, from the bottom centre of the box. */
export function drumCentres(x: number, y: number): { fx: number; fy: number; bx: number; by: number } {
  const fx = x - DRUM.w / 2 + DRUM.r;
  const fy = y - DRUM.r;
  return { fx, fy, bx: fx + DRUM.dx, by: fy + DRUM.dy };
}

/** How far the lid has turned for the game's rot (no slipping on the road). */
export function lidTurn(rot: number): number {
  return Number.isFinite(rot) ? (rot * DRUM.rollR) / DRUM.r : 0;
}

export interface DrumLook {
  /** 0 normal, up to 1: squashed flat for a moment when landed on. */
  squash?: number;
  /** Short speed lines behind it (on by default while rolling). */
  lines?: boolean;
}

/** The body silhouette: both end circles joined by their outer tangent lines. */
function bodyPath(g: CanvasRenderingContext2D, fx: number, fy: number, bx: number, by: number, r: number): void {
  const a = Math.atan2(by - fy, bx - fx); // depth direction
  const n1 = a + Math.PI / 2;
  const n2 = a - Math.PI / 2;
  g.beginPath();
  g.arc(bx, by, r, n2, n1); // the far end's outer half
  g.lineTo(fx + Math.cos(n1) * r, fy + Math.sin(n1) * r);
  g.arc(fx, fy, r, n1, n2); // the lid's outer half
  g.closePath();
}

export function drawDrum(g: CanvasRenderingContext2D, x: number, y: number, rot: number, look: DrumLook = {}): void {
  const squash = Math.min(1, Math.max(0, Number.isFinite(look.squash) ? (look.squash as number) : 0));
  const r = DRUM.r;
  g.save();
  g.translate(x, y);
  // Squashed about the road line: shorter and a bit wider
  if (squash > 0) g.scale(1 + squash * 0.18, 1 - squash * 0.3);
  const { fx, fy, bx, by } = drumCentres(0, 0);
  const a = Math.atan2(by - fy, bx - fx);

  // Speed lines behind it (it rolls left, so they trail to the right, at lid height)
  if (look.lines ?? true) {
    g.strokeStyle = P.WHITE;
    g.globalAlpha = 0.75;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(16, -8);
    g.lineTo(25, -8);
    g.moveTo(18, -15);
    g.lineTo(30, -15);
    g.stroke();
    g.globalAlpha = 1;
  }

  // Body
  bodyPath(g, fx, fy, bx, by, r);
  g.fillStyle = DRUM_BODY;
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  g.stroke();
  // A long shine along the top of the body (light from above stays put as it rolls)
  const n1 = a - Math.PI / 2; // towards the top-left side
  g.strokeStyle = DRUM_SHINE;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(fx + Math.cos(n1) * (r - 2.5) + 2, fy + Math.sin(n1) * (r - 2.5) + 0.5);
  g.lineTo(bx + Math.cos(n1) * (r - 2.5) - 1, by + Math.sin(n1) * (r - 2.5) + 0.5);
  g.stroke();
  // Two raised hoops (ridges): the outer half of a ring at 1/3 and 2/3 of the depth
  g.lineWidth = 1.5;
  for (const k of [0.33, 0.66]) {
    const cx = fx + (bx - fx) * k;
    const cy = fy + (by - fy) * k;
    g.strokeStyle = DRUM_HOOP;
    g.beginPath();
    g.arc(cx, cy, r + 0.3, a - Math.PI / 2, a + Math.PI / 2);
    g.stroke();
  }
  // A little rust near the back, so it reads as an old drum, not a toy
  g.fillStyle = DRUM_RUST;
  g.beginPath();
  g.ellipse(bx + 2, by + 5, 2.2, 1.4, a, 0, TAU);
  g.fill();

  // The lid: lighter, with a rim ring and two caps that turn as it rolls
  g.fillStyle = DRUM_LID;
  g.beginPath();
  g.arc(fx, fy, r, 0, TAU);
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.6;
  g.stroke();
  g.strokeStyle = DRUM_HOOP;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(fx, fy, r - 2.4, 0, TAU);
  g.stroke();
  const turn = lidTurn(rot);
  g.fillStyle = P.INK;
  g.beginPath();
  g.arc(fx + Math.cos(turn) * 4.2, fy + Math.sin(turn) * 4.2, 2, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(fx + Math.cos(turn + 2.6) * 4.4, fy + Math.sin(turn + 2.6) * 4.4, 1.2, 0, TAU);
  g.fill();
  // A white scuff on the rim, the clearest sign of the roll at speed
  g.strokeStyle = P.WHITE;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(fx, fy, r - 1, turn + 3.9, turn + 4.6);
  g.stroke();
  g.restore();
}

/**
 * After a bounce: a bright metal "clang" ring, short strike lines and pale blue sparkles.
 * k runs 0 to 1 over the 0.3 s; nothing is drawn outside that.
 */
export function drawDrumSparkle(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  if (!(k >= 0 && k < 1)) return;
  const cy = y - DRUM.h / 2;
  g.save();
  g.globalAlpha = 1 - k;
  // Ring
  g.strokeStyle = '#d6ecff';
  g.lineWidth = 2.5 * (1 - k) + 0.5;
  g.beginPath();
  g.arc(x, cy, 8 + k * 16, 0, TAU);
  g.stroke();
  // Strike lines
  g.strokeStyle = P.WHITE;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = i * (TAU / 6) + 0.3;
    const r0 = 12 + k * 12;
    g.moveTo(x + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    g.lineTo(x + Math.cos(ang) * (r0 + 6), cy + Math.sin(ang) * (r0 + 6));
  }
  g.stroke();
  // Four-point sparkles
  g.fillStyle = P.SPARKLE;
  for (let i = 0; i < 4; i++) {
    const ang = i * (TAU / 4) + 0.8;
    const d = 6 + k * 20;
    const sx = x + Math.cos(ang) * d;
    const sy = cy + Math.sin(ang) * d;
    const s = 3.5 * (1 - k * 0.5);
    g.beginPath();
    g.moveTo(sx, sy - s);
    g.lineTo(sx + s * 0.3, sy - s * 0.3);
    g.lineTo(sx + s, sy);
    g.lineTo(sx + s * 0.3, sy + s * 0.3);
    g.lineTo(sx, sy + s);
    g.lineTo(sx - s * 0.3, sy + s * 0.3);
    g.lineTo(sx - s, sy);
    g.lineTo(sx - s * 0.3, sy - s * 0.3);
    g.closePath();
    g.fill();
  }
  g.restore();
}

/**
 * Smashed by amala: the drum dents flat on the road and its lid pops off and spins away up
 * and to the right, with a puff of dust; everything fades over k = 0 to 1.
 */
export function drawDrumSmash(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  if (!(k >= 0 && k < 1)) return;
  g.save();
  g.globalAlpha = 1 - k * k;
  // Dented body, flatter as k grows
  const flat = Math.min(1, k * 3);
  g.save();
  g.translate(x, y);
  g.scale(1 + flat * 0.25, 1 - flat * 0.55);
  const { fx, fy, bx, by } = drumCentres(0, 0);
  bodyPath(g, fx, fy, bx, by, DRUM.r);
  g.fillStyle = DRUM_BODY;
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.6;
  g.stroke();
  // The dent: a dark crease across the body
  g.strokeStyle = DRUM_HOOP;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(fx - 2, fy - 7);
  g.lineTo(fx + 4, fy - 2);
  g.lineTo(fx + 9, fy - 9);
  g.stroke();
  g.restore();
  // The lid flies off, turning
  const lx = x - 4 + k * 26;
  const ly = y - 14 - Math.sin(k * Math.PI) * 26;
  g.save();
  g.translate(lx, ly);
  g.rotate(k * 9);
  g.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(k * 9)));
  g.fillStyle = DRUM_LID;
  g.beginPath();
  g.arc(0, 0, DRUM.r - 1, 0, TAU);
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
  // Dust puff along the road
  g.fillStyle = 'rgba(230,220,200,0.85)';
  for (let i = 0; i < 3; i++) {
    const px = x - 12 + i * 12 + (i - 1) * k * 10;
    g.beginPath();
    g.arc(px, y - 3 - k * 4, 3 + k * 6, 0, TAU);
    g.fill();
  }
  g.restore();
}
