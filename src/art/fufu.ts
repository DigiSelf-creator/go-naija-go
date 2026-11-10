/**
 * Pepper fufu (docs/design.md S2.15): the bowl, the hot fufu balls, the plugged pothole,
 * the HUD chip icon, and a tyre or drum knocked off the road by a ball.
 *
 * Fufu balls are soft, hot food: soft white and cream only, two small curls of steam, an
 * optional small dot of pepper on top. Never flames, fire, sparks, glow, a trail or any
 * fireball look (CLAUDE.md rule 2). Fufu with egusi is eaten all over Nigeria; it is shown
 * with pride, never as a joke.
 *
 * World space. No gradients or shadowBlur, so every piece is cheap each frame.
 */
import { DRUM, drawDrum } from './drum';
import { TYRE_R, drawTyre } from './hazards';
import * as P from './palette';

const TAU = Math.PI * 2;

/** Sizes and colours (S2.15). */
export const FUFU = {
  /** Ball radius (a ball is 12 u across). */
  ballR: 6,
  /** The bowl food's box: 20 u wide, 16 u tall. */
  bowlW: 20,
  bowlH: 16,
  /** Seconds the settle (sink into a small puff of steam) lasts. */
  settleTime: 0.3,
  /** Seconds a tyre or drum takes to tip and roll off the road. */
  knockTime: 0.4,
  white: '#fbf8ef',
  shade: '#e4dccb',
  /** Steam: a white line with a soft grey edge, so it reads on sky, road and walls. */
  steam: '#ffffff',
  steamEdge: '#b9b2a4',
  pepper: '#c8412b',
  /** The bowl: white enamel with a blue rim. */
  enamel: '#f4f6f8',
  rim: '#2f6fc0',
  egusi: '#e2a33a',
  leaf: '#2f8a3c',
} as const;

function clamp01(k: number): number {
  return Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0;
}

/** One soft curl of steam rising from (x, y), h tall. sway moves its top a little. */
function curl(g: CanvasRenderingContext2D, x: number, y: number, h: number, sway: number, w = 1.4): void {
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - 3 + sway, y - h * 0.45, x + sway * 0.5, y - h * 0.6);
  g.quadraticCurveTo(x + 3 + sway, y - h * 0.8, x + sway, y - h);
  g.strokeStyle = FUFU.steamEdge;
  g.lineWidth = w + 1.2;
  g.stroke();
  g.strokeStyle = FUFU.steam;
  g.lineWidth = w;
  g.stroke();
}

export interface FufuBallLook {
  /** 0 round, 1 fully squashed on landing (wider and flatter, bottom stays on the road). */
  squash?: number;
  /** Roll angle (radians): turns the pepper dot round the ball. */
  spin?: number;
  /** Seconds, for the steam's gentle sway. */
  time?: number;
  /** Draw the two steam curls (default true). */
  steam?: boolean;
  /** Reduced motion: the steam holds still. */
  still?: boolean;
  /** Draw the small pepper dot (default true). */
  pepper?: boolean;
}

/**
 * A hot fufu ball. (x, y) is the ball's centre when round; when squashed the bottom
 * stays at y + FUFU.ballR, so it squashes onto the road.
 */
export function drawFufuBall(g: CanvasRenderingContext2D, x: number, y: number, look: FufuBallLook = {}): void {
  const r = FUFU.ballR;
  const sq = clamp01(look.squash ?? 0);
  const sx = 1 + sq * 0.35;
  const sy = 1 - sq * 0.35;
  const t = look.still ? 0 : Number.isFinite(look.time) ? (look.time as number) : 0;
  g.save();
  g.translate(x, y + r);
  // Steam first, behind the ball, rising from its top.
  if (look.steam !== false) {
    const top = -2 * r * sy;
    curl(g, -2.2, top + 1, 8, Math.sin(t * 3) * 1.2);
    curl(g, 2.4, top, 10, Math.sin(t * 3 + 1.7) * 1.2);
  }
  g.scale(sx, sy);
  g.translate(0, -r);
  // Soft white ball with a cream shade underneath and a dark outline, so it stands out.
  g.fillStyle = FUFU.white;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.fillStyle = FUFU.shade;
  g.beginPath();
  g.arc(0, 0, r, 0.15 * Math.PI, 0.85 * Math.PI);
  g.quadraticCurveTo(0, r * 0.15, Math.cos(0.15 * Math.PI) * r, Math.sin(0.15 * Math.PI) * r);
  g.fill();
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.strokeStyle = P.INK;
  g.lineWidth = 1.3;
  g.stroke();
  // A small soft shine (white, not a glow)
  g.fillStyle = P.WHITE;
  g.beginPath();
  g.ellipse(-2, -2.4, 1.6, 1, -0.5, 0, TAU);
  g.fill();
  // A small dot of pepper on top, turning as it rolls
  if (look.pepper !== false) {
    const a = (Number.isFinite(look.spin) ? (look.spin as number) : 0) - Math.PI / 2;
    const px = Math.cos(a) * r * 0.55;
    const py = Math.sin(a) * r * 0.55;
    g.fillStyle = FUFU.pepper;
    g.beginPath();
    g.arc(px, py, 1.2, 0, TAU);
    g.fill();
  }
  g.restore();
}

/** A small round puff of steam at (x, y), k 0 to 1 (draw nothing after 1). */
export function drawFufuSteamPuff(g: CanvasRenderingContext2D, x: number, y: number, k: number, size = 1): void {
  if (!(k < 1)) return;
  const t = clamp01(k);
  g.globalAlpha = 0.85 * (1 - t);
  g.fillStyle = FUFU.steam;
  g.strokeStyle = FUFU.steamEdge;
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 5 * size * (1 + t * 0.6);
    const py = y - (4 + t * 12 + (i === 1 ? 3 : 0)) * size;
    g.beginPath();
    g.arc(px, py, (3 + t * 2.5) * size, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.globalAlpha = 1;
}

/**
 * A ball at the end of its roll, sinking into a small puff of steam. (x, y) is where the
 * ball's bottom meets the road; k 0 to 1 over FUFU.settleTime. Draw nothing after 1.
 */
export function drawFufuSettle(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  if (!(k < 1)) return;
  const t = clamp01(k);
  const r = FUFU.ballR;
  if (t < 0.7) {
    const sink = t / 0.7;
    g.save();
    g.translate(x, y);
    g.scale(1 + sink * 0.3, 1 - sink);
    g.fillStyle = FUFU.white;
    g.strokeStyle = P.INK;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(0, -r, r, 0, TAU);
    g.fill();
    g.restore();
  }
  drawFufuSteamPuff(g, x, y, t, 0.8);
}

/**
 * A pothole plugged with fufu: a pale, slightly domed patch level with the road.
 * Draw it over the gap [x0, x1] after the road (it covers the hole's top). The dome
 * rises at most 2 u above groundY in the middle, so it reads as part of the road.
 */
export function drawFufuPlug(g: CanvasRenderingContext2D, x0: number, x1: number, groundY: number, viewH = 360): void {
  const w = x1 - x0;
  if (!(w > 0)) return;
  // Road below the patch, so the hole is gone
  g.fillStyle = P.ROAD;
  g.fillRect(x0, groundY + 10, w, Math.max(0, viewH - groundY - 10));
  // The patch: cream, domed a little on top, rounded underneath, a little wider than the gap
  const a = x0 - 3;
  const b = x1 + 3;
  g.beginPath();
  g.moveTo(a, groundY + 1);
  g.quadraticCurveTo((a + b) / 2, groundY - 4, b, groundY + 1);
  g.lineTo(b, groundY + 10);
  g.quadraticCurveTo((a + b) / 2, groundY + 18, a, groundY + 10);
  g.closePath();
  g.fillStyle = FUFU.white;
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.2;
  g.stroke();
  // Soft dimples and a cream shade along the bottom, so it reads as pressed fufu, not paint
  g.fillStyle = FUFU.shade;
  g.beginPath();
  g.moveTo(a + 2, groundY + 9);
  g.quadraticCurveTo((a + b) / 2, groundY + 16, b - 2, groundY + 9);
  g.quadraticCurveTo((a + b) / 2, groundY + 12, a + 2, groundY + 9);
  g.fill();
  for (let px = x0 + 12; px < x1 - 6; px += 22) {
    g.beginPath();
    g.ellipse(px, groundY + 4, 3, 1.2, 0, 0, TAU);
    g.fill();
  }
  // A thin road edge line continues over it (the road is whole again)
  g.fillStyle = P.ROAD_EDGE;
  g.fillRect(x0, groundY - 0.5, w, 1.5);
}

/**
 * The bowl of pepper fufu, centred at (0, 0) in the current transform: a white enamel
 * bowl with a blue rim, three soft fufu balls, a small dish of egusi beside it and one
 * small curl of steam. About 20 u wide and 16 u tall (the dish sits in front at the right).
 */
export function fufuBowl(g: CanvasRenderingContext2D, time = 0): void {
  // Bowl body (white enamel), blue rim on top
  g.beginPath();
  g.moveTo(-10, 0);
  g.lineTo(10, 0);
  g.quadraticCurveTo(9, 8, 0, 8);
  g.quadraticCurveTo(-9, 8, -10, 0);
  g.closePath();
  g.fillStyle = FUFU.enamel;
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = FUFU.rim;
  g.beginPath();
  g.roundRect(-10.5, -1.5, 21, 2.6, 1.3);
  g.fill();
  g.stroke();
  // Three soft balls sitting in the bowl
  for (const [bx, by, br] of [[-4.5, -3.5, 4], [4.5, -3.5, 4], [0, -6.5, 4.2]] as const) {
    g.fillStyle = FUFU.white;
    g.beginPath();
    g.arc(bx, by, br, 0, TAU);
    g.fill();
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.stroke();
  }
  g.fillStyle = FUFU.pepper;
  g.beginPath();
  g.arc(0.8, -9.2, 0.9, 0, TAU);
  g.fill();
  // Small dish of egusi in front at the right: yellow-orange with green leaf bits
  g.fillStyle = FUFU.enamel;
  g.beginPath();
  g.ellipse(9, 6, 5, 2.4, 0, 0, TAU);
  g.fill();
  g.strokeStyle = P.INK;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = FUFU.egusi;
  g.beginPath();
  g.ellipse(9, 5.6, 3.6, 1.4, 0, 0, TAU);
  g.fill();
  g.fillStyle = FUFU.leaf;
  g.fillRect(7.2, 5, 1.2, 0.9);
  g.fillRect(10, 5.4, 1.2, 0.9);
  // One small curl of steam
  curl(g, 0, -11, 5, Math.sin(time * 3) * 1, 1.2);
}

/**
 * The HUD chip icon (S2.15 "HUD and words"): a fufu ball with two steam curls, its own
 * shape (never colour alone). Fits a box `size` u wide and tall, centred at (x, y).
 */
export function drawFufuIcon(g: CanvasRenderingContext2D, x: number, y: number, size = 26): void {
  const k = size / 26;
  g.save();
  g.translate(x, y);
  g.scale(k * 1.05, k * 1.05);
  // Ball centre low in the box so the two curls fit above it (ball and steam about 23 u tall)
  drawFufuBall(g, 0, 5.5, { still: true });
  g.restore();
}

/**
 * A tyre knocked off the road by a ball: it tips, hops back and rolls off the back of the
 * road into the roadside, getting smaller, then fades. (x, y) is where it stood on the road;
 * k 0 to 1 over FUFU.knockTime; rot its roll angle when hit. Draw nothing after 1.
 */
export function drawTyreKnocked(g: CanvasRenderingContext2D, x: number, y: number, k: number, rot = 0): void {
  if (!(k < 1)) return;
  const t = clamp01(k);
  g.save();
  knockFrame(g, x, y, t, TYRE_R);
  drawTyre(g, 0, 0, (Number.isFinite(rot) ? rot : 0) + t * 5);
  g.restore();
  g.globalAlpha = 1;
}

/** The same for the rolling drum. (x, y) is the bottom centre of its box. */
export function drawDrumKnocked(g: CanvasRenderingContext2D, x: number, y: number, k: number, rot = 0): void {
  if (!(k < 1)) return;
  const t = clamp01(k);
  g.save();
  knockFrame(g, x, y, t, DRUM.h / 2);
  drawDrum(g, 0, 0, (Number.isFinite(rot) ? rot : 0) + t * 5, { lines: false });
  g.restore();
  g.globalAlpha = 1;
}

/** Shared motion: a small hop back (up the screen), a tip, a shrink, a fade in the last 40 percent. */
function knockFrame(g: CanvasRenderingContext2D, x: number, y: number, t: number, half: number): void {
  const hop = -Math.sin(t * Math.PI) * 10;
  const back = -t * 24;
  const s = 1 - t * 0.3;
  g.translate(x + t * 6, y + back + hop);
  // Tip about its middle
  g.translate(0, -half * s);
  g.rotate(t * 0.6);
  g.scale(s, s);
  g.translate(0, half);
  g.globalAlpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
}
