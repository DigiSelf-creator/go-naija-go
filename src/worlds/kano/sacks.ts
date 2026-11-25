/**
 * K4a: grain sacks (docs/kano.md 2.2, 3.3, 3.6; KN-R5). Our own drawings of tied woven sacks:
 * - Sack steps: stacked sacks drawn as Dawanau's steps. They are rocks under another look (the
 *   `sacks` field, [x, width, height]); the top is exactly the landing line, outlined.
 * - The front stack that hides Dawanau's secret well: the hero walks behind it; the well's down
 *   arrow peeks over its top (OG-R34).
 * - The groundnut pyramid: our own small stepped stack of groundnut sacks, a proud nod to the
 *   pyramids of long ago; far scenery on Dawanau and a city build after the first boom (K6a).
 *
 * Every sack is plain: a painted band and a tie, never a word, mark, crest or brand. Lives in the
 * lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import { KANO, KANO_INK as INK } from './gate';

type G = CanvasRenderingContext2D;

/** Sack colours: sun-pale woven sacks with their own bands (green, indigo, red earth). */
export const SACK = { body: '#e6cc98', light: '#f3e2bb', dark: '#b8955e', tie: '#8a6634', bands: ['#3f8f4a', KANO.indigo, '#c8583a'] as readonly string[] } as const;

/** The well's front stack: w wide, h high, centred on the well (the arrow's foot stays above h). */
export const SACK_FRONT = { w: 104, h: 96 } as const;

/**
 * One sack lying down, x to x + w, y to y + h, a tie at one end and a band; it never draws
 * outside its box (so a stack's top is exactly its landing line).
 */
export function sack(g: G, x: number, y: number, w: number, h: number, band: string, tieRight = true, lw = 1.1): void {
  const r = Math.min(h / 2, 6);
  g.fillStyle = SACK.body;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.stroke();
  g.fillStyle = SACK.light;
  g.fillRect(x + r, y + 1.5, w - 2 * r, Math.max(1, h * 0.14));
  g.fillStyle = SACK.dark;
  g.fillRect(x + r, y + h - 2.5, w - 2 * r, 1.2);
  // A band round its middle, and the tied end
  const bx = x + w * (tieRight ? 0.38 : 0.52);
  g.fillStyle = band;
  g.fillRect(bx, y + 1, Math.max(2, w * 0.1), h - 2);
  const tx = tieRight ? x + w - 3 : x + 3;
  g.strokeStyle = SACK.tie;
  g.lineWidth = Math.max(1, lw);
  g.beginPath();
  g.moveTo(tx, y + h * 0.3);
  g.lineTo(tx, y + h * 0.7);
  g.stroke();
}

/** Rows of sacks laid like bricks over x to x + w, from groundY up to top. */
function stack(g: G, x: number, w: number, top: number, groundY: number, rh = 25): void {
  const rows = Math.max(1, Math.round((groundY - top) / rh));
  const h = (groundY - top) / rows;
  for (let r = 0; r < rows; r++) {
    const y = groundY - (r + 1) * h;
    const n = Math.max(1, Math.round(w / 36));
    const sw = w / n;
    const off = r % 2 ? sw / 2 : 0;
    // Odd rows shift half a sack; their ends are half sacks, so the sides stay straight
    const xs: [number, number][] = [];
    if (off) xs.push([x, off]);
    for (let i = 0; i < n; i++) {
      const a = x + off + i * sw;
      xs.push([a, Math.min(sw, x + w - a)]);
    }
    xs.forEach(([a, ww], i) => {
      if (ww > 2) sack(g, a + 0.5, y + 0.5, ww - 1, h - 1, SACK.bands[(r + i + Math.round(x / 50)) % 3]!, (r + i) % 2 === 0);
    });
  }
}

/**
 * World space: a sack step from x to x + w, h high, standing on the road. Its top edge is exactly
 * groundY - h (the landing line, drawn as one firm outline).
 */
export function drawSackSteps(g: G, x: number, w: number, h: number, groundY: number): void {
  const top = groundY - h;
  g.save();
  g.lineJoin = 'round';
  stack(g, x, w, top, groundY);
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(x + 2, top);
  g.lineTo(x + w - 2, top);
  g.stroke();
  g.restore();
}

/**
 * World space: the front stack of sacks before Dawanau's secret well (x is the well's middle),
 * drawn in front of the hero. `alpha` lets the game show the hero through it while behind it.
 */
export function drawSackFront(g: G, x: number, groundY: number, alpha = 1): void {
  const { w, h } = SACK_FRONT;
  g.save();
  g.globalAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  g.lineJoin = 'round';
  stack(g, x - w / 2, w, groundY - h + 24, groundY);
  // The top row is shorter, two sacks centred (still wider than the well)
  sack(g, x - 34, groundY - h + 0.5, 33, 23, SACK.bands[1]!, false);
  sack(g, x + 1, groundY - h + 0.5, 33, 23, SACK.bands[0]!);
  g.restore();
}

/**
 * The groundnut pyramid: our own stepped stack of groundnut sacks, its bottom middle at (cx,
 * base), 9 sacks wide (about 110 u at s 1) and 9 rows high, a few loose nuts at its foot. `lit`
 * (once Kano booms) gives the bright sacks and a gold top; else the faded, dusty look.
 */
export function drawGroundnutPyramid(g: G, cx: number, base: number, s = 1, lit = false): void {
  const k = Number.isFinite(s) && s > 0 ? s : 1;
  const sw = 12 * k;
  const sh = 7 * k;
  g.save();
  g.lineJoin = 'round';
  for (let r = 0; r < 9; r++) {
    const n = 9 - r;
    for (let i = 0; i < n; i++) sack(g, cx - (n * sw) / 2 + i * sw, base - (r + 1) * sh, sw - 0.6 * k, sh - 0.6 * k, lit ? SACK.bands[(r + i) % 3]! : SACK.dark, i % 2 === 0, 0.8 * k);
  }
  if (lit) {
    g.fillStyle = KANO.gold;
    g.strokeStyle = INK;
    g.lineWidth = 0.8 * k;
    g.beginPath();
    g.moveTo(cx - 3 * k, base - 9 * sh);
    g.lineTo(cx, base - 9 * sh - 5 * k);
    g.lineTo(cx + 3 * k, base - 9 * sh);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#c98d4e';
  for (const d of [-62, -55, 57, 64]) {
    g.beginPath();
    g.ellipse(cx + d * k, base - 1.2 * k, 1.8 * k, 1.1 * k, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
