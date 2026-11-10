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

export type GoatMode = 'walk' | 'runAway';

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
  const run = mode === 'runAway';
  const speed = run ? 18 : 8;
  const s = Math.sin(time * speed);
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
  g.translate(-14, -22);
  g.rotate(run ? -0.15 : Math.sin(time * 2) * 0.05);
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
  // Eye (friendly)
  g.fillStyle = P.INK;
  g.beginPath();
  g.arc(-6, -4, 1.2, 0, TAU);
  g.fill();
  // Smile when running away: it is fine, just off to find more grass
  if (run) {
    g.strokeStyle = P.INK;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(-7, 0, 2, 0.2, Math.PI - 0.6);
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

  if (run) {
    // Bleat bubble, unflipped so the word reads
    const bx = x - facing * 4;
    const by = y + hop - 44;
    g.fillStyle = P.WHITE;
    g.strokeStyle = P.INK;
    g.lineWidth = 1.2;
    g.beginPath();
    g.roundRect(bx - 17, by - 8, 34, 15, 6);
    g.fill();
    g.stroke();
    g.fillStyle = P.INK;
    g.font = 'bold 9px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('MEEH!', bx, by);
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
