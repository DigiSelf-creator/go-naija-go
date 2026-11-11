/**
 * Hazards: the goat and the rolling tyre. World space; origin is the centre of
 * the feet / bottom of the tyre on the road. Strong ink outlines and bright fills
 * so they stand out from the paler background.
 *
 * The goat is never hurt. When smashed or bounced it trots away, tail up, ears
 * back, with a cheerful bleat bubble.
 */
import * as P from './palette';

const TAU = Math.PI * 2;

/** 'eat' (S2.15): stopped, head down, chewing a fufu ball; use drawGoatEating for it. */
export type GoatMode = 'walk' | 'runAway' | 'eat';

/** Seconds the goat chews a fufu ball before it says "meeh" and trots off (S2.15). */
export const GOAT_EAT_TIME = 0.6;

/** Which eating frame shows at k (0 to 1 over GOAT_EAT_TIME): 0 head down at the ball, 1 head up chewing. Three chews. */
export function goatEatFrame(k: number): 0 | 1 {
  const t = Number.isFinite(k) ? Math.min(Math.max(k, 0), 0.999) : 0;
  return Math.floor(t * 6) % 2 === 1 ? 1 : 0;
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.strokeStyle = P.INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.stroke();
}

/**
 * facing: -1 walks left (towards the hero), 1 walks right.
 * In 'runAway' the goat hops along with motion lines; time drives the legs.
 */
export function drawGoat(g: CanvasRenderingContext2D, x: number, y: number, time: number, mode: GoatMode = 'walk', facing: 1 | -1 = -1): void {
  goat(g, x, y, time, mode, facing, 0);
}

/**
 * The goat eating a fufu ball (S2.15): stopped, legs planted, two frames (head down at the
 * ball, then head up chewing with a full cheek), the bite getting smaller. k 0 to 1 over
 * GOAT_EAT_TIME. In the last fifth the "MEEH!" bubble shows; then the game switches to
 * 'runAway' (which keeps the bubble). The goat is never hurt: it is just fed.
 */
export function drawGoatEating(g: CanvasRenderingContext2D, x: number, y: number, k: number, facing: 1 | -1 = -1): void {
  goat(g, x, y, 0, 'eat', facing, Number.isFinite(k) ? Math.min(Math.max(k, 0), 1) : 0);
}

/** The goat's bleat bubble with the word, centred above (x, y) (unflipped, so it reads). */
export function drawMeehBubble(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = P.WHITE;
  g.strokeStyle = P.INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.roundRect(x - 17, y - 8, 34, 15, 6);
  g.fill();
  g.stroke();
  g.fillStyle = P.INK;
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('MEEH!', x, y);
}

function goat(g: CanvasRenderingContext2D, x: number, y: number, time: number, mode: GoatMode, facing: 1 | -1, eatK: number): void {
  const run = mode === 'runAway';
  const eat = mode === 'eat';
  const chew = eat ? goatEatFrame(eatK) : 0;
  const speed = run ? 18 : 8;
  const s = eat ? 0 : Math.sin(time * speed);
  const hop = run ? -Math.abs(Math.sin(time * 9)) * 6 : 0;
  g.save();
  g.translate(x, y + hop);
  // Drawn facing left; flip to face right.
  g.scale(-facing, 1);

  if (run) {
    g.strokeStyle = P.WHITE;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-26, -24);
    g.lineTo(-36, -24);
    g.moveTo(-26, -16);
    g.lineTo(-40, -16);
    g.stroke();
  }

  // Legs (two-tone hooves)
  g.lineCap = 'round';
  const legs: readonly (readonly [number, number])[] = [[-9, s], [-5, -s], [6, -s], [10, s]];
  for (const [lx, ph] of legs) {
    const swing = ph * (run ? 4 : 2.5);
    g.strokeStyle = P.INK;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(lx, -11);
    g.lineTo(lx + swing, -1);
    g.stroke();
    g.strokeStyle = P.GOAT_COAT;
    g.lineWidth = 2.2;
    g.stroke();
    g.fillStyle = P.GOAT_HOOF;
    g.fillRect(lx + swing - 1.5, -3, 3, 3);
  }

  // Body with a brown patch
  blob(g, -14, -22, 28, 13, 6, P.GOAT_COAT);
  g.fillStyle = P.GOAT_PATCH;
  g.beginPath();
  g.ellipse(4, -17, 5, 3.5, 0.2, 0, TAU);
  g.fill();

  // Tail: up when running away
  g.strokeStyle = P.INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(13, -20);
  g.lineTo(run ? 17 : 17, run ? -28 : -22);
  g.stroke();

  // Head, ears, horns, beard
  g.save();
  // Eating: the head dips to the road (frame 0) or lifts a little to chew (frame 1).
  if (eat) g.translate(chew === 0 ? -16 : -15, chew === 0 ? -9 : -16);
  else g.translate(-14, -22);
  g.rotate(eat ? (chew === 0 ? 0.45 : 0.15) : run ? -0.15 : Math.sin(time * 2) * 0.05);
  blob(g, -10, -8, 12, 11, 4, P.GOAT_COAT);
  // Horns
  g.strokeStyle = P.GOAT_HORN;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(-2, -8);
  g.quadraticCurveTo(1, -14, 4, -13);
  g.stroke();
  // Ear: flops out when walking, swept back when running
  g.fillStyle = P.GOAT_PATCH;
  g.beginPath();
  if (run) g.ellipse(4, -5, 5, 2, 0.3, 0, TAU);
  else g.ellipse(2, -3, 5, 2, 0.6, 0, TAU);
  g.fill();
  // Eye (friendly); closed and happy while eating (drawn below)
  if (!eat) {
    g.fillStyle = P.INK;
    g.beginPath();
    g.arc(-6, -4, 1.2, 0, TAU);
    g.fill();
  }
  // Smile when running away: it is fine, just off to find more grass
  if (run) {
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(-7, 0, 2, 0.2, Math.PI - 0.6);
    g.stroke();
  }
  if (eat) {
    // The bite of fufu at the mouth, smaller with each chew, and a full cheek when chewing
    const bite = 3 * (1 - eatK) + 0.8;
    g.fillStyle = '#fbf8ef';
    g.strokeStyle = P.INK;
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(-10.5, 1.5, bite, 0, TAU);
    g.fill();
    g.stroke();
    if (chew === 1) {
      g.fillStyle = P.GOAT_COAT;
      g.beginPath();
      g.arc(-4.5, 0.5, 2.6, 0, TAU);
      g.fill();
      g.stroke();
    }
    // A happy closed eye while it eats
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(-6, -4.5, 1.4, 0.2, Math.PI - 0.2);
    g.stroke();
  }
  // Beard
  g.fillStyle = '#d8d0bf';
  g.beginPath();
  g.moveTo(-9, 2);
  g.lineTo(-7, 7);
  g.lineTo(-5, 2);
  g.fill();
  g.restore();

  g.restore();

  if (run || (eat && eatK >= 0.8)) {
    // Bleat bubble, unflipped so the word reads
    drawMeehBubble(g, x - facing * 4, y + hop - 44);
  }
}

export const TYRE_R = 11;

/** A rolling tyre resting on y. rot is the roll angle in radians. */
export function drawTyre(g: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  g.save();
  g.translate(x, y - TYRE_R);
  g.rotate(rot);
  g.fillStyle = P.TYRE_BLACK;
  g.beginPath();
  g.arc(0, 0, TYRE_R, 0, TAU);
  g.fill();
  // Light edge so it stands out on the dark road
  g.strokeStyle = '#8a8a8a';
  g.lineWidth = 1.5;
  g.stroke();
  // Tread blocks
  g.fillStyle = '#555';
  for (let i = 0; i < 8; i++) {
    const a = i * (TAU / 8);
    g.fillRect(Math.cos(a) * 9 - 1.5, Math.sin(a) * 9 - 1.5, 3, 3);
  }
  // Rim with spokes, so the roll is easy to see
  g.fillStyle = '#c9c9c9';
  g.beginPath();
  g.arc(0, 0, 5, 0, TAU);
  g.fill();
  g.strokeStyle = '#6a6a6a';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-5, 0);
  g.lineTo(5, 0);
  g.moveTo(0, -5);
  g.lineTo(0, 5);
  g.stroke();
  g.restore();
}
