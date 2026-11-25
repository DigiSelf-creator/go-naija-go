/**
 * K3a: fura da nono (docs/kano.md 4.1), Kano's cool drink: a small calabash bowl with white nono
 * and a round fura ball in it. Upright and full, never spilled or thrown; never a weapon. Our own
 * drawing: the calabash has our own carved band of small triangles.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import { KANO_INK as INK } from './gate';

type G = CanvasRenderingContext2D;

/** Fura da nono's colours: the calabash, its carved band, the nono and the fura ball. */
export const FURA = { gourd: '#c98a3e', gourdLight: '#e2ab5c', band: '#7a4a22', nono: '#fbf8ef', ball: '#e6d6b0', fleck: '#a8916a' } as const;

/** The bowl centred near (0, 0), about 28 u across. */
function bowl(g: G, line: number): void {
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = line;
  // The calabash: a deep half-round bowl
  g.fillStyle = FURA.gourd;
  g.beginPath();
  g.moveTo(-13, -2);
  g.bezierCurveTo(-13, 9, -6, 12, 0, 12);
  g.bezierCurveTo(6, 12, 13, 9, 13, -2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = FURA.gourdLight;
  g.beginPath();
  g.ellipse(-7, 4, 2.2, 4.5, 0.3, 0, Math.PI * 2);
  g.fill();
  // Our own carved band of small triangles
  g.fillStyle = FURA.band;
  g.beginPath();
  for (let x = -9; x <= 8; x += 4.5) {
    g.moveTo(x, 2.5);
    g.lineTo(x + 2, 6);
    g.lineTo(x + 4, 2.5);
  }
  g.fill();
  // The white nono filling it to the rim
  g.fillStyle = FURA.nono;
  g.beginPath();
  g.ellipse(0, -2, 13, 3.6, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // The round fura ball sitting in the nono, with millet flecks
  g.fillStyle = FURA.ball;
  g.beginPath();
  g.arc(2.5, -5, 5.2, Math.PI * 0.95, Math.PI * 2.05);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = FURA.fleck;
  for (const [fx, fy] of [[0.5, -7], [3.5, -8.4], [5.2, -5.8], [1.8, -4.6]] as const) g.fillRect(fx, fy, 1.1, 1.1);
  g.fillStyle = '#ffffff';
  g.fillRect(-0.4, -8.3, 1.5, 1.2);
}

/** World space: fura da nono on the road, gently bobbing on a soft cool halo. Pass time 0 to hold still. */
export function drawFura(g: G, x: number, y: number, time: number): void {
  const t = Number.isFinite(time) ? time : 0;
  const bob = Math.sin(t * 4) * 2;
  g.fillStyle = 'rgba(232,246,255,0.75)';
  g.beginPath();
  g.arc(x, y + bob, 18, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.translate(x, y + bob);
  g.scale(1.1, 1.1);
  bowl(g, 1.2);
  g.restore();
}

/** The bowl alone (HUD chip, toast): size 1 is about 32 u across, as drawFoodIcon. Still. */
export function drawFuraIcon(g: G, x: number, y: number, size: number): void {
  const s = Number.isFinite(size) ? size : 1;
  g.save();
  g.translate(x, y - 1 * s);
  g.scale(s * 1.1, s * 1.1);
  bowl(g, 1.3);
  g.restore();
}
