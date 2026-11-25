/**
 * K3a: springy cloth (docs/kano.md 3.3, Kofar Mata first). Freshly dyed cloth stretched tight on a
 * low wooden frame to dry: our own simple patterns (no real cloth or brand), wooden legs, a soft
 * sag that dips when you land, a small bounce-arrow sign (no words) beside the first frame, and
 * the "boing" (a talking-drum note bending up) and the cloth beaters' soft "tok-tok".
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { Recipe } from '../../engine/sound';
import { KANO, KANO_INK as INK } from './gate';

type G = CanvasRenderingContext2D;

/** The frame's numbers: 30 u high (its top edge is the landing line); the dip lasts dipS seconds, at most dip u. */
export const CLOTH_FRAME = { h: 30, dipS: 0.4, dip: 6, sag: 2.5 } as const;

/** Our own cloth patterns (three, picked by the frame's x): pale shapes on deep dyed blue. */
export const CLOTH_LOOKS: readonly { base: string; mark: string; kind: 0 | 1 | 2 }[] = [
  { base: KANO.indigo, mark: '#cfdcf5', kind: 0 },
  { base: '#22306c', mark: KANO.gold, kind: 1 },
  { base: '#35509e', mark: KANO.cream, kind: 2 },
];

/**
 * How far the cloth dips now, `since` seconds after a landing: a quick dip that springs back with
 * one small wobble, 0 outside the dip (and always 0 in reduced motion, still).
 */
export function clothDip(since: number, still = false): number {
  if (still || !Number.isFinite(since) || since < 0 || since >= CLOTH_FRAME.dipS) return 0;
  const p = since / CLOTH_FRAME.dipS;
  return CLOTH_FRAME.dip * Math.sin(p * Math.PI * 2.2) * (1 - p) * (p < 0.45 ? 1 : 0.4);
}

/** The pattern marks across the cloth's face (0 to w by y0 to y0 + h). */
function marks(g: G, w: number, y0: number, h: number, kind: number, col: string): void {
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineWidth = 1.2;
  if (kind === 0) {
    // Rows of small rings, our own
    g.beginPath();
    for (let x = 8; x < w - 4; x += 12) {
      g.moveTo(x + 2.2, y0 + h / 2);
      g.arc(x, y0 + h / 2, 2.2, 0, Math.PI * 2);
    }
    g.stroke();
  } else if (kind === 1) {
    // A zigzag band
    g.beginPath();
    g.moveTo(4, y0 + h - 2.4);
    for (let x = 9, i = 1; x <= w - 4; x += 5, i++) g.lineTo(x, y0 + (i % 2 ? 2.6 : h - 2.4));
    g.stroke();
  } else {
    // Stepped squares
    for (let x = 6, i = 0; x < w - 6; x += 9, i++) g.fillRect(x, y0 + (i % 2 ? 1.5 : h - 4.5), 3, 3);
  }
}

export interface ClothFrameOpts {
  /** The dip now (clothDip), u down at the middle. */
  dip?: number;
  /** Which pattern (default: by x). */
  look?: number;
}

/**
 * World space: the springy cloth frame from x to x + w, standing on groundY, its top edge at
 * groundY - 30 (the landing line). The cloth sags a little between the posts and dips when landed
 * on; little drips of fresh dye hang under it (look only).
 */
export function drawClothFrame(g: G, x: number, w: number, groundY: number, o: ClothFrameOpts = {}): void {
  const top = groundY - CLOTH_FRAME.h;
  const dip = Number.isFinite(o.dip) ? o.dip! : 0;
  const c = CLOTH_LOOKS[(o.look ?? Math.abs(Math.round(x / 50))) % CLOTH_LOOKS.length]!;
  const sag = CLOTH_FRAME.sag + dip;
  g.save();
  g.translate(x, 0);
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  // Wooden legs (splayed a little) and the low rail between them
  g.fillStyle = '#8a5f37';
  for (const lx of [3, w - 7]) {
    g.beginPath();
    g.moveTo(lx, top);
    g.lineTo(lx + 4, top);
    g.lineTo(lx + 5 + (lx > 3 ? 2 : -2), groundY);
    g.lineTo(lx - 1 + (lx > 3 ? 2 : -2), groundY);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#a0723f';
  g.fillRect(6, groundY - 9, w - 12, 3);
  // The cloth: a deep blue band whose top dips in a soft curve, its front edge hanging lower
  g.fillStyle = c.base;
  g.beginPath();
  g.moveTo(0, top);
  g.quadraticCurveTo(w / 2, top + sag * 2, w, top);
  g.lineTo(w, top + 9);
  g.quadraticCurveTo(w / 2, top + 9 + sag * 2.2, 0, top + 9);
  g.closePath();
  g.fill();
  g.stroke();
  // The cloth shines a little along its top (fresh dye), then its own pattern
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(5, top + 1.6);
  g.quadraticCurveTo(w / 2, top + 1.6 + sag * 2, w - 5, top + 1.6);
  g.stroke();
  g.save();
  g.translate(0, sag);
  marks(g, w, top + 2.5, 6, c.kind, c.mark);
  g.restore();
  // Ties at the corners, and two small drips under the cloth
  g.fillStyle = KANO.cream;
  g.fillRect(-1, top - 1, 4, 4);
  g.fillRect(w - 3, top - 1, 4, 4);
  g.fillStyle = c.base;
  for (const d of [0.3, 0.68]) {
    g.beginPath();
    g.ellipse(w * d, top + 12 + sag * 2, 1.2, 1.8, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/**
 * World space: the bounce sign beside the first frame: a short post with a round board showing
 * a springy line and an arrow going up (shape, never words or colour alone). x is the post.
 */
export function drawBounceSign(g: G, x: number, groundY: number): void {
  g.save();
  g.translate(x, groundY);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.fillStyle = '#7b5a3a';
  g.fillRect(-1.5, -40, 3, 40);
  g.strokeRect(-1.5, -40, 3, 40);
  g.fillStyle = KANO.yellow;
  g.beginPath();
  g.arc(0, -50, 12, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  // The springy line (a cloth that dips), then the arrow up from its middle
  g.moveTo(-8, -44);
  g.quadraticCurveTo(0, -40, 8, -44);
  g.moveTo(0, -45);
  g.lineTo(0, -58);
  g.moveTo(-4, -54);
  g.lineTo(0, -58.5);
  g.lineTo(4, -54);
  g.stroke();
  g.restore();
}

/**
 * K3a sounds, added by the first load as the wind's whoosh is (gamedev adds the names to
 * KanoSoundName): the cloth's "boing", a low talking-drum note bending up with a soft wooden
 * knock; the cloth beaters' "tok-tok", two soft wood taps (only when the beaters are on screen).
 */
export const KANO_CLOTH_SOUNDS: Readonly<Record<'clothBoing' | 'beaterTok', Recipe>> = {
  clothBoing: {
    tones: [
      { f: 120, len: 0.34, wave: 'sine', peak: 270, to: 210, vol: 0.06 },
      { f: 240, len: 0.2, wave: 'triangle', peak: 420, to: 360, vol: 0.018 },
      { f: 700, len: 0.04, wave: 'triangle', to: 520, vol: 0.012 },
    ],
  },
  beaterTok: {
    tones: [
      { f: 880, len: 0.05, wave: 'triangle', to: 720, vol: 0.016 },
      { f: 800, len: 0.05, wave: 'triangle', to: 660, at: 0.17, vol: 0.013 },
    ],
  },
};
