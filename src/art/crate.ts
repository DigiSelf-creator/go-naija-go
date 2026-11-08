/**
 * Hanging market crates (docs/design.md S2.4, questions.md R5 and R8): a small
 * slatted wooden crate in pale wood with rope handles, hung by one rope from a
 * line strung between two wooden poles, like goods hung outside a shop.
 * Our own look: never yellow or gold, no "?" or "!", no rivets or corner dots,
 * no brick row, never floating with nothing holding it. The stamp on the front
 * is a picture of what is inside: a coin mark, a corn cob, a cup or a bowl.
 *
 * World space. A crate is placed by its centre x and its BOTTOM y (S2.4: bottom
 * 96 u above the surface under it). The rope runs 60 u straight up from the
 * crate top to the line, and the crate swings about the point where the rope
 * meets the line.
 */
import { INK } from './palette';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export type CrateStamp = 'kobo' | 'corn' | 'cup' | 'bowl';
export const CRATE_STAMPS: readonly CrateStamp[] = ['kobo', 'corn', 'cup', 'bowl'];

/** S2.4 numbers. */
export const CRATE = { w: 32, h: 28, rope: 60, heightAboveSurface: 96 } as const;

/** Crate colours: pale and dark wood (orange-brown, never yellow or gold), rope, a dark red stamp. */
export const CRATE_COLOURS = {
  wood: '#d2a77c',
  woodDark: '#a8774d',
  woodShade: '#8c5e3a',
  inside: '#4a3424',
  rope: '#b89a6e',
  ropeDark: '#7d6544',
  stamp: '#7a2e1f',
  pole: '#7a5232',
  line: '#5e4a36',
} as const;

const C = CRATE_COLOURS;

/** y of the overhead line for a crate whose bottom is at bottomY. */
export function crateLineY(bottomY: number): number {
  return bottomY - CRATE.h - CRATE.rope;
}

// ---------- Motion (pure, unit tested) ----------

export interface CrateMotion {
  /** Seconds since the last knock; leave unset if never knocked. */
  sinceKnock?: number | undefined;
  /** 'hit' from below (12 degrees), or 'brush' from the side (8 degrees). */
  knock?: 'hit' | 'brush';
  /** Which way the knock pushed the crate's bottom: 1 right, -1 left. */
  dir?: 1 | -1;
  /** Seconds, for the gentle idle sway. */
  time: number;
  /** prefers-reduced-motion: no sway at all. */
  still?: boolean;
}

/**
 * Swing angle in radians (+ = bottom swings right). A knock swings 12 degrees
 * (a brush 8), easing to 0 over 1.2 s; on top of that every crate sways 1 degree
 * with a 3 s period. Reduced motion: always 0.
 */
export function crateAngle(m: CrateMotion): number {
  if (m.still) return 0;
  const time = Number.isFinite(m.time) ? m.time : 0;
  let a = Math.sin((time * TAU) / 3) * 1;
  const t = m.sinceKnock;
  if (typeof t === 'number' && Number.isFinite(t) && t >= 0 && t < 1.2) {
    a += ((m.knock === 'brush' ? 8 : 12) / SWING_PEAK) * swingShape(t) * (m.dir ?? 1);
  }
  return a * DEG;
}

/** A swing that starts at 0, swings out and back every 0.6 s, and dies away by 1.2 s. */
function swingShape(t: number): number {
  return (1 - t / 1.2) ** 2 * Math.sin((t * TAU) / 0.6);
}
/** The biggest value of swingShape, so a knock's first swing is exactly 12 (or 8) degrees. */
const SWING_PEAK = (() => {
  let m = 0;
  for (let t = 0; t < 0.3; t += 0.0005) m = Math.max(m, swingShape(t));
  return m;
})();

/**
 * The three kobo out of a kobo crate, for t in seconds after the hit: they fan
 * out of the top (straight up, and 30 degrees either side) and rise 30 u in
 * 0.35 s. Offsets from the crate's top centre. After 0.35 s they fly to the HUD
 * (koboFlyAt). Returns [] once the fan is over.
 */
export function koboFanAt(t: number): { x: number; y: number }[] {
  if (!Number.isFinite(t) || t < 0 || t > 0.35) return [];
  const k = t / 0.35;
  const d = 30 * (1 - (1 - k) * (1 - k)); // ease out
  return [-30, 0, 30].map((deg) => ({ x: Math.sin(deg * DEG) * d, y: -Math.cos(deg * DEG) * d - 6 }));
}

/** Flight to the HUD counter: 0.4 s, eased, from a fan end point to the counter (both in the same space). */
export function koboFlyAt(t: number, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number; done: boolean } {
  const k = Number.isFinite(t) ? Math.min(1, Math.max(0, t / 0.4)) : 1;
  const e = k * k * (3 - 2 * k);
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, done: k >= 1 };
}

/**
 * A food out of a food crate: pops 24 u above the crate top in 0.25 s, then
 * drops straight down at 90 u/s until its centre reaches restY (road: 272).
 * Never moves sideways.
 */
export function foodPopAt(t: number, crateBottomY: number, restY: number): { y: number; landed: boolean } {
  const top = crateBottomY - CRATE.h;
  const peak = top - 24;
  const s = Number.isFinite(t) ? Math.max(0, t) : 0;
  if (s < 0.25) {
    const k = s / 0.25;
    return { y: top + (peak - top) * (1 - (1 - k) * (1 - k)), landed: false };
  }
  const y = peak + (s - 0.25) * 90;
  return y >= restY ? { y: restY, landed: true } : { y, landed: false };
}

// ---------- Drawing ----------

function outline(g: CanvasRenderingContext2D, w = 1.3): void {
  g.strokeStyle = INK;
  g.lineWidth = w;
  g.stroke();
}

/**
 * Two wooden poles standing on groundY at x0 and x1 with a line strung between
 * them at lineY (sagging a little). Draw before the crates.
 */
export function drawCrateLine(g: CanvasRenderingContext2D, x0: number, x1: number, lineY: number, groundY: number): void {
  for (const x of [x0, x1]) {
    g.fillStyle = C.pole;
    g.beginPath();
    g.roundRect(x - 3, lineY - 8, 6, groundY - lineY + 8, 2);
    g.fill();
    outline(g, 1.1);
    // Fork at the top where the line is tied
    g.strokeStyle = C.pole;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, lineY - 6);
    g.lineTo(x - 4, lineY - 12);
    g.moveTo(x, lineY - 6);
    g.lineTo(x + 4, lineY - 12);
    g.stroke();
  }
  g.strokeStyle = C.line;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x0, lineY - 2);
  g.quadraticCurveTo((x0 + x1) / 2, lineY + 6, x1, lineY - 2);
  g.stroke();
}

function drawStamp(g: CanvasRenderingContext2D, stamp: CrateStamp): void {
  // Centred on (0, 0), about 14 u across, painted in one dark red like a stencil.
  g.strokeStyle = C.stamp;
  g.fillStyle = C.stamp;
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  switch (stamp) {
    case 'kobo': {
      // A small stack of coins seen from the side, with one coin standing in front
      for (const y of [4, 1.5, -1]) {
        g.beginPath();
        g.ellipse(-2, y, 4.6, 1.6, 0, 0, TAU);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(3.6, 1, 3.4, 4.6, 0, 0, TAU);
      g.fillStyle = '#e6c9a6';
      g.fill();
      g.stroke();
      g.beginPath();
      g.ellipse(3.6, 1, 1.4, 2.4, 0, 0, TAU);
      g.stroke();
      break;
    }
    case 'corn': {
      // Cob on a slant with two husk leaves
      g.save();
      g.rotate(-0.5);
      g.beginPath();
      g.ellipse(0, -1, 3, 6, 0, 0, TAU);
      g.stroke();
      g.beginPath();
      for (const y of [-4, -1, 2]) {
        g.moveTo(-2.2, y);
        g.lineTo(2.2, y);
      }
      g.moveTo(0, -6);
      g.lineTo(0, 4);
      g.stroke();
      g.beginPath();
      g.moveTo(-1, 4);
      g.quadraticCurveTo(-6, 6, -5, 8);
      g.moveTo(1, 4);
      g.quadraticCurveTo(6, 6, 5, 8);
      g.stroke();
      g.restore();
      break;
    }
    case 'cup': {
      // A plain cup with a handle and a little heap of garri on top
      g.beginPath();
      g.moveTo(-5, -3);
      g.lineTo(-4, 5);
      g.lineTo(4, 5);
      g.lineTo(5, -3);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.arc(6, 1, 2.4, -1.4, 1.4);
      g.stroke();
      g.beginPath();
      g.moveTo(-4.5, -3);
      g.quadraticCurveTo(0, -7, 4.5, -3);
      g.fill();
      break;
    }
    case 'bowl': {
      // A round bowl with a rounded swallow on top (amala), and a spoon of soup line
      g.beginPath();
      g.moveTo(-6.5, -0.5);
      g.lineTo(6.5, -0.5);
      g.quadraticCurveTo(6, 6, 0, 6);
      g.quadraticCurveTo(-6, 6, -6.5, -0.5);
      g.stroke();
      g.beginPath();
      g.arc(0, -0.8, 3.6, Math.PI, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(-2, 6);
      g.lineTo(2, 6);
      g.lineTo(2.6, 7.6);
      g.lineTo(-2.6, 7.6);
      g.closePath();
      g.fill();
      break;
    }
  }
}

export interface CrateLook {
  stamp: CrateStamp;
  /** Emptied: the lid hangs open, the stamp still shows. */
  open: boolean;
  /** Swing in radians (crateAngle). */
  angle: number;
  /** Lid opening, 0 shut to 1 hanging open (for the 0.15 s it takes). Defaults to open ? 1 : 0. */
  lid?: number;
}

/**
 * One hanging crate: centre x, bottom y. Draws its own rope up to the line
 * (crateLineY). The swing turns the rope and crate about the line point.
 */
export function drawCrate(g: CanvasRenderingContext2D, x: number, bottomY: number, look: CrateLook): void {
  const { w, h, rope } = CRATE;
  const lineY = bottomY - h - rope;
  const a = Number.isFinite(look.angle) ? look.angle : 0;
  const lidK = Math.min(1, Math.max(0, typeof look.lid === 'number' && Number.isFinite(look.lid) ? look.lid : look.open ? 1 : 0));
  g.save();
  g.translate(x, lineY);
  g.rotate(-a); // + angle swings the bottom right
  // Knot on the line and the rope
  g.strokeStyle = C.ropeDark;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, rope - 2);
  g.stroke();
  g.strokeStyle = C.rope;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, rope - 2);
  g.stroke();
  g.fillStyle = C.ropeDark;
  g.beginPath();
  g.arc(0, 0, 2.2, 0, TAU);
  g.fill();
  // Rope sling: two short ropes from the end of the hanging rope to the top corners
  g.strokeStyle = C.ropeDark;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-w / 2 + 3, rope + 1);
  g.lineTo(0, rope - 3);
  g.lineTo(w / 2 - 3, rope + 1);
  g.stroke();

  g.translate(0, rope);
  // The open crate shows its dark inside behind the hanging lid
  if (lidK > 0) {
    g.fillStyle = C.inside;
    g.fillRect(-w / 2 + 2, 0, w - 4, 4);
  }
  // Body: a frame of dark wood with pale slats and gaps between them
  g.fillStyle = C.woodDark;
  g.beginPath();
  g.roundRect(-w / 2, 0, w, h, 2.5);
  g.fill();
  g.fillStyle = C.wood;
  const slatH = 7;
  for (let i = 0; i < 3; i++) g.fillRect(-w / 2 + 3, 3 + i * (slatH + 1.5), w - 6, slatH);
  // Corner posts (plain, no rivets)
  g.fillStyle = C.woodShade;
  g.fillRect(-w / 2, 0, 3, h);
  g.fillRect(w / 2 - 3, 0, 3, h);
  g.beginPath();
  g.roundRect(-w / 2, 0, w, h, 2.5);
  outline(g);
  // Rope handles on the sides
  g.strokeStyle = C.ropeDark;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(-w / 2, h * 0.45, 3, Math.PI * 0.5, Math.PI * 1.5);
  g.moveTo(w / 2, h * 0.45 - 3);
  g.arc(w / 2, h * 0.45, 3, -Math.PI * 0.5, Math.PI * 0.5);
  g.stroke();
  // Stamp on a pale patch
  g.save();
  g.translate(0, h / 2 + 0.5);
  g.fillStyle = '#e6c9a6';
  g.beginPath();
  g.ellipse(0, 0, 9, 9, 0, 0, TAU);
  g.fill();
  drawStamp(g, look.stamp);
  g.restore();
  // Lid: a board on the top; when open it hangs down the left side on its rope hinge
  g.save();
  g.translate(-w / 2, 0);
  g.rotate(lidK * 2.05);
  g.fillStyle = C.wood;
  g.beginPath();
  g.roundRect(0, -3, w, 3.5, 1);
  g.fill();
  outline(g, 1.1);
  g.fillStyle = C.woodShade;
  g.fillRect(w * 0.3, -2.5, 1.2, 2.5);
  g.fillRect(w * 0.65, -2.5, 1.2, 2.5);
  g.restore();
  g.restore();
}

/** y of a crate's top edge (where the kobo fan and the food pop start). Draw the kobo with drawKobo. */
export function crateTopY(bottomY: number): number {
  return bottomY - CRATE.h;
}
