/**
 * Shared drawing helpers for the lane run (S3f1): the two-tone look of decision 60/65 in the
 * view from behind. Every shape is filled, then (inside its own outline) a shade band on the
 * lower right and a light edge on the upper left, then a bold ink outline.
 *
 * The bands use one trick: clip to the shape, then stroke the same outline moved a little.
 * Moved down-right, the stroke shows only along the upper-left edge (the light edge); moved
 * left, only along the right edge (the shade). No gradients, blur or filters.
 */
import { INK } from './palette';

export const TAU = Math.PI * 2;

/** Lane art units: 32 u to a metre (the hero is about 50 u tall, as on the streets). */
export const LANE_U = 32;

/** A #rrggbb colour mixed toward another by k (0 keeps a, 1 gives b). Worked out once, then kept. */
const MIXES = new Map<string, string>();
export function mix(a: string, b: string, k: number): string {
  const key = `${a}${b}${k}`;
  let out = MIXES.get(key);
  if (out === undefined) {
    const x = parseInt(a.slice(1), 16);
    const y = parseInt(b.slice(1), 16);
    const ch = (s: number): string => {
      const va = (x >> s) & 255;
      const vb = (y >> s) & 255;
      return Math.round(va + (vb - va) * k)
        .toString(16)
        .padStart(2, '0');
    };
    out = `#${ch(16)}${ch(8)}${ch(0)}`;
    MIXES.set(key, out);
  }
  return out;
}

/** The darker side of a colour (decision 65's shading). */
export const shadeOf = (c: string): string => mix(c, '#2a1a3a', 0.34);
/** The warm dusk light on an edge. */
export const rimOf = (c: string): string => mix(c, '#ffe2b0', 0.42);

export interface Look2 {
  /** Shade band width (u); 0 for none. */
  shade?: number;
  /** Light edge width (u); 0 for none. */
  rim?: number;
  /** Shade and light colours; worked out from the fill when not given. */
  shadeC?: string | undefined;
  rimC?: string | undefined;
  /** Ink outline width (u). */
  line?: number;
  /** Sharp corners (dodge things, design.md S3f0 part 6) instead of round ones. */
  sharp?: boolean;
}

/**
 * Fills the path that `path` adds (it must only add subpaths, never begin one), with the
 * shade band, the light edge and the ink outline.
 */
export function shape(g: CanvasRenderingContext2D, path: () => void, fill: string, o: Look2 = {}): void {
  const shade = o.shade ?? 1.6;
  const rim = o.rim ?? 1.1;
  g.lineJoin = o.sharp ? 'miter' : 'round';
  g.beginPath();
  path();
  g.fillStyle = fill;
  g.fill();
  if (shade > 0 || rim > 0) {
    g.save();
    g.clip();
    if (shade > 0) {
      g.save();
      g.translate(-shade / 2, -shade * 0.18);
      g.beginPath();
      path();
      g.strokeStyle = o.shadeC ?? shadeOf(fill);
      g.lineWidth = shade;
      g.stroke();
      g.restore();
    }
    if (rim > 0) {
      g.translate(rim * 0.4, rim * 0.5);
      g.beginPath();
      path();
      g.strokeStyle = o.rimC ?? rimOf(fill);
      g.lineWidth = rim;
      g.stroke();
    }
    g.restore();
  }
  const line = o.line ?? 1.4;
  if (line > 0) {
    g.beginPath();
    path();
    g.strokeStyle = INK;
    g.lineWidth = line;
    g.stroke();
  }
}

/** A tapered capsule from (x1,y1) radius r1 to (x2,y2) radius r2, as a subpath. */
export function capsule(g: CanvasRenderingContext2D, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = Math.PI / 2;
  g.moveTo(x1 + Math.cos(a + h) * r1, y1 + Math.sin(a + h) * r1);
  g.arc(x1, y1, r1, a + h, a + h * 3);
  g.arc(x2, y2, r2, a - h, a + h);
  g.closePath();
}

/** An ellipse subpath. */
export function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  // Four cubic curves (a close match for an ellipse), so the shape keeps its true box.
  const k = 0.5523;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const P = (u: number, v: number): [number, number] => [x + u * rx * c - v * ry * sn, y + u * rx * sn + v * ry * c];
  const m = P(1, 0);
  g.moveTo(m[0], m[1]);
  const quad: [number, number, number, number, number, number][] = [
    [1, k, k, 1, 0, 1],
    [-k, 1, -1, k, -1, 0],
    [-1, -k, -k, -1, 0, -1],
    [k, -1, 1, -k, 1, 0],
  ];
  for (const q of quad) {
    const a1 = P(q[0], q[1]);
    const a2 = P(q[2], q[3]);
    const e = P(q[4], q[5]);
    g.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], e[0], e[1]);
  }
  g.closePath();
}

/** A polygon subpath from flat x, y pairs. */
export function poly(g: CanvasRenderingContext2D, pts: readonly number[]): void {
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.closePath();
}

/** A filled dot, no outline. */
export function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

/** A plain stroked line (or polyline) from flat pairs. */
export function line(g: CanvasRenderingContext2D, pts: readonly number[], c: string, w: number): void {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.stroke();
}

/** The small four-point sparkle that marks a burst thing (part 6), centred on (x, y). */
export function sparkle4(g: CanvasRenderingContext2D, x: number, y: number, r: number, c = '#fff6c2'): void {
  const k = r * 0.28;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + k, y - k, x + r, y);
  g.quadraticCurveTo(x + k, y + k, x, y + r);
  g.quadraticCurveTo(x - k, y + k, x - r, y);
  g.quadraticCurveTo(x - k, y - k, x, y - r);
  g.closePath();
  g.fillStyle = c;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = Math.max(0.6, r * 0.14);
  g.stroke();
}

/** A seeded number from 0 to 1 (the same i always gives the same number). */
export function rand(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** A canvas to draw a ready-made picture into, or null where none can be made (tests, very old phones). */
export function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas | null {
  const W = Math.max(1, Math.ceil(w));
  const H = Math.max(1, Math.ceil(h));
  try {
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(W, H);
  } catch {
    /* no canvas here */
  }
  return null;
}

/** A ready-made picture and where its anchor (the thing's ground centre) sits in it, in pixels. */
export interface Baked {
  img: HTMLCanvasElement | OffscreenCanvas;
  /** Anchor in the picture, in pixels. */
  ax: number;
  ay: number;
  /** Pixels per metre it was made at. */
  ppm: number;
}

/** Box in u round the anchor: left, right, top (negative is up), bottom. */
export interface UBox {
  l: number;
  r: number;
  t: number;
  b: number;
}

/**
 * Draws `draw` (in u, anchor at 0,0) into a new picture at `ppm` pixels per metre.
 * Null when no canvas can be made.
 */
export function bake(box: UBox, ppm: number, draw: (g: CanvasRenderingContext2D) => void): Baked | null {
  const k = ppm / LANE_U;
  const pad = 2;
  const c = makeCanvas((box.r - box.l) * k + pad * 2, (box.b - box.t) * k + pad * 2);
  const g = c?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
  if (!c || !g) return null;
  const ax = -box.l * k + pad;
  const ay = -box.t * k + pad;
  g.translate(ax, ay);
  g.scale(k, k);
  draw(g);
  return { img: c, ax, ay, ppm };
}

/**
 * Draws a ready-made picture with its anchor at (x, y), scaled to `ppm` pixels per metre.
 * One draw call.
 */
export function blitBaked(g: CanvasRenderingContext2D, b: Baked, x: number, y: number, ppm: number, alpha = 1): void {
  const k = ppm / b.ppm;
  if (!(k > 0)) return;
  const a = g.globalAlpha;
  if (alpha < 1) g.globalAlpha = a * alpha;
  g.drawImage(b.img as CanvasImageSource, x - b.ax * k, y - b.ay * k, b.img.width * k, b.img.height * k);
  g.globalAlpha = a;
}
