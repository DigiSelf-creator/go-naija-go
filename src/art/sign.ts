/**
 * P2 (docs/design.md S2.13, part 4): the pothole warning sign before every hole you
 * must jump twice for. A hand-painted yellow wooden board on one wooden post, like
 * the painted boards at Lagos roadsides. Our own drawing: not an official road sign
 * (no diamond, no triangle, no red ring) and not any game's sign. No words, no
 * brand, no flag. The picture says it in any colour: a black hole with a ragged rim
 * and a dotted two-hump path (jump, then jump again) ending in an arrow.
 * WORLD space: call after g.translate(-camX, 0). Scenery: draw behind the hero.
 */
import { INK, POTHOLE_RIM } from './palette';
import { GROUND_Y } from './street';

/** Sign measures (u), from S2.13. */
export const POTHOLE_SIGN = { boardW: 34, boardH: 24, height: 56, postW: 4, lean: (3 * Math.PI) / 180 } as const;

/** Bright hand-painted yellow; the fixed look's fresh coat is a touch brighter. */
export const SIGN_YELLOW = '#f7c52d';
const SIGN_YELLOW_FRESH = '#ffd23a';
const SIGN_STREAK = '#fbd967';
const SIGN_EDGE_WEAR = '#d9a722';
const POST = '#5a3d24';
const POST_LIGHT = '#7a5434';
const EARTH = '#6b5a45';

/**
 * Draw the pothole warning sign with its post foot at (x, groundY): board top at
 * groundY - 56. `fresh` is the fixed look after Lagos is switched on (newly painted,
 * no worn edge). Leaves the context as it found it.
 */
export function drawPotholeSign(g: CanvasRenderingContext2D, x: number, groundY = GROUND_Y, fresh = false): void {
  drawSign(g, x, groundY, fresh, false);
}

/**
 * The dash gap sign (S2.16 B4), on the same board and post: a wider hole, the same dotted
 * two-hump path over it, and three speed lines behind the start of the path. It differs
 * from the pothole sign by shape, not colour. Placed 120 u before the gap's left lip.
 */
export function drawDashSign(g: CanvasRenderingContext2D, x: number, groundY = GROUND_Y, fresh = false): void {
  drawSign(g, x, groundY, fresh, true);
}

function drawSign(g: CanvasRenderingContext2D, x: number, groundY: number, fresh: boolean, dash: boolean): void {
  const { boardW: W, boardH: H, height, postW } = POTHOLE_SIGN;
  const top = -height;
  const left = -W / 2;
  g.save();
  g.translate(x, groundY);
  // A little mound of earth round the foot
  g.fillStyle = EARTH;
  g.beginPath();
  g.ellipse(0, 0, 5, 1.6, 0, Math.PI, 0);
  g.fill();
  g.rotate(POTHOLE_SIGN.lean);

  // Post: dark wood from the ground up behind the board
  g.fillStyle = POST;
  g.beginPath();
  g.rect(-postW / 2, top + 4, postW, height - 4);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = POST_LIGHT;
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(-0.6, top + H + 3);
  g.lineTo(-0.6, -3);
  g.stroke();

  // Board: two planks with slightly uneven, hand-cut corners
  const board = (): void => {
    g.beginPath();
    g.moveTo(left + 0.6, top + 0.4);
    g.lineTo(left + W - 0.3, top);
    g.lineTo(left + W, top + H - 0.5);
    g.lineTo(left + 0.3, top + H);
    g.closePath();
  };
  board();
  g.fillStyle = fresh ? SIGN_YELLOW_FRESH : SIGN_YELLOW;
  g.fill();
  // Brush streaks (hand painted) and a worn lower edge when not fresh
  g.save();
  g.clip();
  g.strokeStyle = SIGN_STREAK;
  g.lineWidth = 1;
  g.beginPath();
  for (const [y, x0, x1] of [
    [top + 3, left + 3, left + 14],
    [top + 7, left + 20, left + 31],
    [top + 19, left + 18, left + 30],
  ] as const) {
    g.moveTo(x0, y);
    g.lineTo(x1, y + 0.3);
  }
  g.stroke();
  if (!fresh) {
    g.fillStyle = SIGN_EDGE_WEAR;
    g.fillRect(left, top + H - 1.6, W, 1.6);
  }
  // Plank seam
  g.strokeStyle = 'rgba(29,26,20,0.35)';
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(left, top + H / 2 + 0.5);
  g.lineTo(left + W, top + H / 2);
  g.stroke();
  g.restore();
  board();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();

  // Two nail dots where the board meets the post
  g.fillStyle = INK;
  for (const y of [top + 2.6, top + H - 2.6]) {
    g.beginPath();
    g.arc(0.4, y, 0.8, 0, Math.PI * 2);
    g.fill();
  }

  // Painted picture: a road line broken by a black hole with a ragged rim
  const roadY = top + 15;
  const h0 = dash ? left + 8 : left + 4;
  const h1 = dash ? left + 25 : left + 17.5;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(left + 1.8, roadY);
  g.lineTo(h0, roadY);
  g.moveTo(h1, roadY);
  g.lineTo(left + 31.5, roadY);
  g.stroke();
  // The hole: a flat, rough oval lying in the road, seen a little from above
  const cx = (h0 + h1) / 2;
  const rx = (h1 - h0) / 2;
  const rim = [1, 0.92, 0.98, 0.86, 1, 0.94, 0.88, 1, 0.9, 0.97, 0.85, 1, 0.93, 0.99, 0.87, 1, 0.91, 0.96];
  const hole = (grow: number): void => {
    g.beginPath();
    rim.forEach((k, i) => {
      const ang = (i / rim.length) * Math.PI * 2;
      const px = cx + Math.cos(ang) * (rx * k + grow);
      const py = roadY + 0.6 + Math.sin(ang) * (3.6 * k + grow * 0.6);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.closePath();
  };
  // A worn brown rim round the black hole
  hole(1.2);
  g.fillStyle = POTHOLE_RIM;
  g.fill();
  hole(0);
  g.fillStyle = INK;
  g.fill();

  // Dotted path: up (jump), a small dip, up again (second jump), then down to an arrow
  g.lineWidth = 1.5;
  g.setLineDash([0.1, 2.5]);
  g.beginPath();
  const p0 = dash ? 6.5 : 2.5;
  const sx = dash ? 0.84 : 1;
  const px = (u: number): number => left + p0 + (u - 2.5) * sx;
  g.moveTo(px(2.5), roadY - 2.5);
  g.quadraticCurveTo(px(6), top + 6, px(11), top + 7.5);
  g.quadraticCurveTo(px(14.5), top + 8.6, px(16.5), top + 5.5);
  g.quadraticCurveTo(px(20), top + 1.6, px(24), top + 3.5);
  g.quadraticCurveTo(px(27), top + 5.5, px(27.5), top + 9.5);
  g.stroke();
  g.setLineDash([]);
  if (dash) {
    // Three speed lines behind the start of the path: a run-up at speed
    g.lineWidth = 1.2;
    g.beginPath();
    for (const [y, x0] of [[top + 7, left + 2.2], [top + 10, left + 1.4], [top + 13, left + 2.2]] as const) {
      g.moveTo(x0, y);
      g.lineTo(left + 5.6, y);
    }
    g.stroke();
  }
  // Arrow head pointing right, at the end of the path
  g.beginPath();
  g.moveTo(left + 31.8, top + 11);
  g.lineTo(left + 26.2, top + 8);
  g.lineTo(left + 26.6, top + 13.6);
  g.closePath();
  g.fill();
  g.restore();
}
