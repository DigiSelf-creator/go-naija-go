/**
 * K4a: the dust whirl (docs/kano.md 3.3 and 5.4; Dawanau first, then Borehole Hall). A small
 * spinning swirl of Harmattan dust, 30 wide and 50 tall, our own drawing: pale rings of dust, thin at
 * the ground and wide at the top, each with an ink outline, dark streaks that spin round them, a curl
 * of dust on top and dry leaves turning round. It sways as it drifts. Never colour alone: the ringed
 * shape, the spinning streaks, the leaves and the soft "fff" (kano.md 8 accessibility).
 *
 * The same whirl rolls out of Rusty Borehole in the hall (BH_HALL floor y 300), so it reads on the
 * grey road, the tan pavement and the hall's sandy floor, at 320 x 240 and in greyscale.
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { Recipe } from '../../engine/sound';
import { KANO_INK as INK } from './gate';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;
const fin = (n: number | undefined, d = 0): number => (n !== undefined && Number.isFinite(n) ? n : d);

/**
 * The whirl's numbers: w x h is its look and hit box (x is its middle, its foot on the ground);
 * it spins spinHz turns a second, sways up to `sway` u at the top (look only) swayHz times a
 * second, and puffs apart over puffS seconds.
 */
export const WHIRL = { w: 30, h: 50, spinHz: 1.4, swayHz: 0.6, sway: 2.5, puffS: 0.45 } as const;

/** The whirl's colours: pale dust, darker rings and streaks, green and brown leaves. */
export const WHIRL_COL = { dust: '#f6e7c1', ring: '#c9a064', streak: '#6e4422', leaf: '#4f7f34', leaf2: '#a8662a', foot: '#cfae74' } as const;

/** How far the top leans now (u, look only; the hit box stays still). 0 in reduced motion. */
export function whirlSway(time: number, seed = 0, still = false): number {
  return still ? 0 : Math.sin(fin(time) * TAU * WHIRL.swayHz + fin(seed)) * WHIRL.sway;
}

/** How far it has puffed apart, `since` seconds after a puff (0 to 1), or null once it is gone. */
export function whirlPuffK(since: number): number | null {
  const s = fin(since, -1);
  return s < 0 || s >= WHIRL.puffS ? null : s / WHIRL.puffS;
}

/** The outline: the larger of w u and px screen px (style 1.8, hazards stand out like the hero). */
function inkW(g: G, w = 1.6, px = 2): number {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const s = m && typeof m.a === 'number' ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 0;
  return s > 0 ? Math.max(w, px / s) : w;
}

/** Half width at height t (0 the foot, 1 the top). */
const half = (t: number): number => 3 + 9.5 * Math.pow(t, 0.8);
/** The bands from the foot up, and how tall each band's ring is. */
const BANDS = 6;
const ringH = (t: number): number => 2.6 + 2.8 * t;

function leaf(g: G, x: number, y: number, a: number, col: string, s = 1): void {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.fillStyle = col;
  g.strokeStyle = INK;
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(0, 0, 3 * s, 1.5 * s, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.restore();
}

export interface WhirlOpts {
  /** Reduced motion: no spin or sway (a still swirl). */
  still?: boolean;
  /** Its own phase, so two whirls never turn as one (default: by x). */
  seed?: number;
  /** Puffing apart now, 0 to 1 (whirlPuffK); nothing is drawn after 1. */
  puff?: number | null;
}

/**
 * World space: a dust whirl with its foot at (x, groundY), 30 wide and 50 tall: six rings of
 * dust stacked from a thin foot to a wide top, each one outlined, twisting a little from side to
 * side as it spins, a dark streak running round each ring (together they make a turning spiral),
 * a curl of dust at the top and three dry leaves going round. With `puff` it breaks into soft
 * round puffs that spread, rise and fade, and its leaves fly off.
 */
export function drawDustWhirl(g: G, x: number, groundY: number, time: number, o: WhirlOpts = {}): void {
  const still = o.still === true;
  const seed = fin(o.seed, x * 0.37);
  const t = still ? 0 : fin(time);
  const spin = t * TAU * WHIRL.spinHz + seed;
  const puff = o.puff === undefined || o.puff === null ? -1 : Math.min(1, Math.max(0, fin(o.puff)));
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (puff >= 0) {
    // Puffing apart: six soft puffs spread out and up, fading, with specks; the leaves fly off
    g.globalAlpha = 1 - puff;
    g.strokeStyle = WHIRL_COL.ring;
    g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + seed;
      const px = x + Math.cos(a) * (5 + 9 * puff);
      const py = groundY - 24 + Math.sin(a) * (8 + 8 * puff) - 8 * puff;
      g.fillStyle = WHIRL_COL.dust;
      g.beginPath();
      g.arc(px, py, 5 + 2 * puff, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = WHIRL_COL.streak;
      g.fillRect(px + Math.cos(a) * 6, py + Math.sin(a) * 6, 1.4, 1.4);
    }
    leaf(g, x - 5 - 7 * puff, groundY - 30 - 14 * puff, spin + puff * 4, WHIRL_COL.leaf);
    leaf(g, x + 5 + 7 * puff, groundY - 20 - 14 * puff, -spin - puff * 5, WHIRL_COL.leaf2);
    g.restore();
    return;
  }
  const lean = whirlSway(t, seed, still);
  // Each band's middle: leaning with the sway, twisting a little side to side as it spins
  const cx = (i: number): number => x + lean * (i / (BANDS - 1)) + (still ? 0 : Math.sin(spin * 0.5 + i * 1.1) * 1.4);
  const yAt = (i: number): number => groundY - 4 - (WHIRL.h - 4 - ringH(1) - 4) * (i / (BANDS - 1));
  // A little dust on the ground round its foot
  g.fillStyle = WHIRL_COL.foot;
  g.beginPath();
  g.ellipse(x, groundY - 1.5, 9, 1.5, 0, 0, TAU);
  g.fill();
  const ink = inkW(g);
  for (let i = 0; i < BANDS; i++) {
    const k = i / (BANDS - 1);
    const c = cx(i);
    const y = yAt(i);
    const rx = half(k);
    const ry = ringH(k);
    // The ring of dust, outlined (the one above covers its back)
    g.fillStyle = WHIRL_COL.dust;
    g.strokeStyle = INK;
    g.lineWidth = ink;
    g.beginPath();
    g.ellipse(c, y, rx, ry, 0, 0, TAU);
    g.fill();
    g.stroke();
    // Its shade underneath, and a dark streak going round its front
    g.strokeStyle = WHIRL_COL.ring;
    g.lineWidth = 1.3;
    g.beginPath();
    g.ellipse(c, y - 0.6, rx - 1.6, ry - 1.4, 0, 0.35, Math.PI - 0.35);
    g.stroke();
    const a = (((still ? i * 0.7 + 0.4 : spin + i * 0.7) % TAU) + TAU) % TAU;
    const a0 = Math.max(0.15, a - 0.6);
    const a1 = Math.min(Math.PI - 0.15, a + 0.6);
    if (a1 > a0 + 0.3) {
      g.strokeStyle = WHIRL_COL.streak;
      g.lineWidth = 1.8;
      g.beginPath();
      g.ellipse(c, y, rx - 0.8, ry - 0.6, 0, a0, a1);
      g.stroke();
    }
  }
  // A curl of dust lifting off the top
  const top = cx(BANDS - 1);
  const ty = yAt(BANDS - 1);
  const side = Math.cos(spin) >= 0 ? 1 : -1;
  g.strokeStyle = INK;
  g.lineWidth = ink;
  g.beginPath();
  g.moveTo(top - side * 6, ty - 1);
  g.quadraticCurveTo(top, ty - ringH(1) - 3, top + side * 7, ty - ringH(1) + 0.5);
  g.stroke();
  // Three dry leaves turning round it (smaller and fainter while behind)
  for (let i = 0; i < 3; i++) {
    const n = 1 + i * 1.5;
    const a = spin * 1.2 + i * 2.1;
    const front = Math.sin(a) > 0;
    g.globalAlpha = front ? 1 : 0.55;
    leaf(g, cx(n) + Math.cos(a) * (half(n / (BANDS - 1)) - 3), yAt(n) + Math.sin(a) * 1.6, a, i === 1 ? WHIRL_COL.leaf2 : WHIRL_COL.leaf, front ? 1 : 0.8);
  }
  g.restore();
}

/** Screen space: a small still whirl for a card or chip (the "Puff the dust whirls!" mission), size px tall. */
export function drawWhirlIcon(g: G, x: number, y: number, size = 24): void {
  const s = fin(size, 24) / WHIRL.h;
  g.save();
  g.translate(x, y + (WHIRL.h * s) / 2);
  g.scale(s, s);
  drawDustWhirl(g, 0, 0, 0, { still: true, seed: 0.6 });
  g.restore();
}

/**
 * K4a sounds (gamedev adds the names to KanoSoundName, as the wind's whoosh): `whirlFff`, a soft
 * airy "fff" while a whirl is on screen (0.5 s, played again while it is); `whirlPuff`, a soft
 * dusty "pff" as it puffs apart (landed on, eaten by fura, amala or fufu, or at the hall's wall).
 */
export const KANO_WHIRL_SOUNDS: Readonly<Record<'whirlFff' | 'whirlPuff', Recipe>> = {
  whirlFff: {
    tones: [{ f: 220, len: 0.45, wave: 'sine', peak: 260, to: 200, vol: 0.006, vib: { hz: 6, depth: 0.05 } }],
    hiss: [{ len: 0.5, bp: 2600, vol: 0.02 }],
  },
  whirlPuff: {
    tones: [{ f: 260, len: 0.12, wave: 'triangle', to: 150, vol: 0.03 }],
    hiss: [{ len: 0.25, lp: 1800, vol: 0.05 }],
  },
};
