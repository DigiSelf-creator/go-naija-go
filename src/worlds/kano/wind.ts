/**
 * K2a: how the Harmattan wind shows on a Kano street (docs/kano.md 3.3, 8 accessibility, 9.1).
 * Never colour alone: the wind sign's arrow, the streamers and pennants that point the way the
 * wind blows, and thin dust streaks that cross the sky the same way. Each piece is baked once (two
 * flutter frames for a side) and copied; nothing is blurred or filtered. The haze stays on the far
 * rows (kurmi.ts); these streaks sit in the sky above the play line, never over it (KN-R6).
 *
 * Lives in the lazy Kano part and imports no value from outside src/worlds/kano/.
 */
import type { Recipe } from '../../engine/sound';
import { KANO, KANO_INK as INK } from './gate';
import { kanoStrip, type KanoSlot } from './layer';

const TAU = Math.PI * 2;
type G = CanvasRenderingContext2D;

/** "back": behind you (blows to +x, the way you run); "face": in your face (blows to -x). */
export type WindDir = 'back' | 'face';
/** A level's wind stretch as the file writes it: [x, width, dir]. */
export type WindStretch = readonly [number, number, WindDir];

/** Sizes in world units. Fade: the streamers and streaks come in this far before a stretch and go after it. */
export const WIND_LOOK = { signH: 78, ropeH: 86, poleGap: 160, fade: 150, streakTop: 22, streakBottom: 108, flutterHz: 5 } as const;

/** +1 for a wind blowing to +x (behind you), -1 for one in your face. */
export const windSign = (dir: WindDir): 1 | -1 => (dir === 'back' ? 1 : -1);

/**
 * How much wind shows at x (0 to 1) and which way: full inside a stretch, fading to nothing over
 * WIND_LOOK.fade either side. The strongest stretch wins. Pure; for the streaks and the whoosh.
 */
export function windShow(winds: readonly WindStretch[], x: number, fade: number = WIND_LOOK.fade): { dir: WindDir | null; k: number } {
  let best: { dir: WindDir | null; k: number } = { dir: null, k: 0 };
  if (!Number.isFinite(x)) return best;
  for (const [a, w, dir] of winds) {
    const out = x < a ? a - x : x > a + w ? x - a - w : 0;
    const k = fade > 0 ? Math.max(0, 1 - out / fade) : out === 0 ? 1 : 0;
    if (k > best.k) best = { dir, k };
  }
  return best;
}

/** The flutter frame (0 or 1) at a time; still (reduced motion) holds frame 0. */
export function windFrame(time: number, still = false): 0 | 1 {
  if (still || !Number.isFinite(time)) return 0;
  return Math.floor(time * WIND_LOOK.flutterHz) % 2 === 0 ? 0 : 1;
}

const slots = new Map<string, KanoSlot>();
function slot(key: string): KanoSlot {
  let s = slots.get(key);
  if (!s) slots.set(key, (s = { layer: null }));
  return s;
}

/** A long cloth streamer from (0, 0) trailing `len` the way s points, waving with frame f. */
function streamer(g: G, s: number, len: number, f: number, col: string, band: string): void {
  const wv = f ? 2.6 : -2.6;
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(s * len * 0.35, -wv, s * len * 0.65, wv, s * len, wv * 0.4 + 2);
  g.lineTo(s * len * 0.96, wv * 0.4 + 5);
  g.bezierCurveTo(s * len * 0.65, wv + 6, s * len * 0.35, 6 - wv, 0, 7);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = band;
  g.fillRect(Math.min(0, s * len * 0.4), 2.6, len * 0.4, 1.8);
}

function paintSign(g: G, s: number, f: number): void {
  // Drawn into a 90 x 96 strip; the pole stands at (45, 92).
  g.save();
  g.translate(45, 92);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  // Foot, pole and the knob on top
  g.fillStyle = '#8a6a4a';
  g.fillRect(-6, -3, 12, 3);
  g.strokeRect(-6, -3, 12, 3);
  g.fillStyle = '#e9e4d8';
  g.fillRect(-1.6, -WIND_LOOK.signH, 3.2, WIND_LOOK.signH - 3);
  g.strokeRect(-1.6, -WIND_LOOK.signH, 3.2, WIND_LOOK.signH - 3);
  g.fillStyle = KANO.gold;
  g.beginPath();
  g.arc(0, -WIND_LOOK.signH - 2, 3, 0, TAU);
  g.fill();
  g.stroke();
  // The long cloth streamer at the top, flying the way the wind blows
  g.save();
  g.translate(1, -WIND_LOOK.signH + 1);
  streamer(g, s, 38, f, KANO.yellow, KANO.indigo);
  g.restore();
  // The arrow board, halfway up: a cream board, a thick ink arrow pointing with the wind
  g.save();
  g.translate(0, -44);
  g.fillStyle = KANO.cream;
  g.beginPath();
  g.roundRect(-17, -9, 34, 18, 3);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(-12 * s, -2.5);
  g.lineTo(3 * s, -2.5);
  g.lineTo(3 * s, -7);
  g.lineTo(13 * s, 0);
  g.lineTo(3 * s, 7);
  g.lineTo(3 * s, 2.5);
  g.lineTo(-12 * s, 2.5);
  g.closePath();
  g.fill();
  g.restore();
  g.restore();
}

/**
 * World space: the wind sign at a stretch's start (x on the ground line). A pole with a long cloth
 * streamer and an arrow board, both pointing the way the wind blows. About 78 u tall.
 */
export function drawWindSign(g: G, x: number, groundY: number, dir: WindDir, time = 0, still = false): void {
  const s = windSign(dir);
  const f = windFrame(time, still);
  kanoStrip(g, slot(`sign${dir}${f}`), `kanoSign${dir}${f}`, x - 45, groundY - 92, 90, 96, (cg) => paintSign(cg, s, f));
}

const PENNANTS = [KANO.yellow, KANO.indigo, '#f08a24', '#1aa39a', KANO.cream] as const;

/** One stretch of bunting, a pole at the left of a poleGap-wide tile, 110 u tall, rope ropeH up. */
function paintBunting(g: G, s: number, f: number): void {
  const W = WIND_LOOK.poleGap;
  const base = 106;
  const top = base - WIND_LOOK.ropeH;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.fillStyle = '#8a6a4a';
  g.fillRect(2, top - 6, 3, WIND_LOOK.ropeH + 6);
  g.strokeRect(2, top - 6, 3, WIND_LOOK.ropeH + 6);
  // The rope, sagging, a little more pushed along in the wind on frame 1
  const sag = f ? 9 : 7;
  g.strokeStyle = '#5a4632';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(3.5, top);
  g.quadraticCurveTo(W / 2, top + sag * 2, W + 3.5, top);
  g.stroke();
  // Pennants streaming sideways: each a triangle whose tip points the way the wind blows
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const px = 16 + i * ((W - 22) / n);
    const t = px / W;
    const py = top + sag * 4 * t * (1 - t);
    const len = 15 + ((i + f) % 2) * 2;
    const drop = f ? 6 : 4;
    g.fillStyle = PENNANTS[i % PENNANTS.length]!;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + s * len, py + drop);
    g.lineTo(px, py + 9);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // A cloth pegged to the rope's middle, its free end lifted the way the wind blows
  const cx = W * 0.5 + s * 10;
  const cy = top + sag * 4 * (cx / W) * (1 - cx / W);
  const lift = s * (f ? 10 : 7);
  g.fillStyle = '#e0572b';
  g.beginPath();
  g.moveTo(cx - 7, cy);
  g.lineTo(cx + 7, cy);
  g.lineTo(cx + 7 + lift, cy + 13);
  g.lineTo(cx - 7 + lift, cy + 15);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = KANO.cream;
  g.fillRect(cx - 5 + lift * 0.4, cy + 6, 10, 2);
  // Leaves blowing along, low over the pavement
  g.fillStyle = '#7f9a4a';
  for (let i = 0; i < 4; i++) {
    const lx = 20 + i * 38 + s * f * 8;
    const ly = base - 18 - ((i * 7) % 16) - f * 2;
    g.beginPath();
    g.ellipse(lx, ly, 3.2, 1.4, s * 0.5 + i * 0.4, 0, TAU);
    g.fill();
  }
}

/**
 * World space, behind the walking line: bunting with pennants, a cloth on its line and blowing
 * leaves along a wind stretch from x0 to x1, all pointing the way the wind blows. Poles stand at
 * fixed places every WIND_LOOK.poleGap from x0 (so they scroll with the street).
 */
export function drawWindStreamers(g: G, x0: number, x1: number, groundY: number, dir: WindDir, time = 0, still = false, L = -Infinity, R = Infinity): void {
  const s = windSign(dir);
  const f = windFrame(time, still);
  const W = WIND_LOOK.poleGap;
  for (let x = x0; x + W <= x1 + 1; x += W) {
    if (x + W < L || x > R) continue;
    kanoStrip(g, slot(`bunt${dir}${f}`), `kanoBunt${dir}${f}`, x, groundY - 106, W + 8, 110, (cg) => paintBunting(cg, s, f));
  }
  // The last pole
  const end = x0 + Math.floor((x1 - x0 + 1) / W) * W;
  if (end >= L && end <= R) {
    g.fillStyle = '#8a6a4a';
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.fillRect(end + 2, groundY - WIND_LOOK.ropeH - 6, 3, WIND_LOOK.ropeH + 6);
    g.strokeRect(end + 2, groundY - WIND_LOOK.ropeH - 6, 3, WIND_LOOK.ropeH + 6);
  }
}

const STREAK_W = 520;
const STREAK_H = WIND_LOOK.streakBottom - WIND_LOOK.streakTop;

/** Thin pale dust streaks, each a long taper with a round head on the side the wind blows to. */
function paintStreaks(g: G, s: number): void {
  for (let i = 0; i < 9; i++) {
    const len = 50 + ((i * 37) % 50);
    const y = 6 + ((i * 29) % (STREAK_H - 12));
    const hx = (i * 61 + 30) % STREAK_W;
    const tx = hx - s * len;
    const r = i % 3 ? 1.6 : 2;
    g.fillStyle = i % 3 ? '#fff5dc' : '#dcb878';
    g.beginPath();
    g.moveTo(tx, y);
    g.quadraticCurveTo((tx + hx) / 2, y - r, hx, y - r);
    g.arc(hx, y, r, -Math.PI / 2, Math.PI / 2, s < 0);
    g.quadraticCurveTo((tx + hx) / 2, y + r, tx, y);
    g.fill();
    // Two dust grains running ahead of the head
    g.fillRect(hx + s * 6, y - 0.6, 1.4, 1.2);
    g.fillRect(hx + s * 11, y + 0.4, 1.2, 1.1);
  }
}

/**
 * Screen space, over the sky and far rows only (y 22 to 108, above the play line): thin dust
 * streaks crossing the sky the way the wind blows. k (0 to 1) fades them in and out (windShow).
 * One baked strip a side, copied as it slides; still: they hold still but stay in view.
 */
export function drawDustStreaks(g: G, viewW: number, dir: WindDir, k: number, time = 0, still = false, camX = 0): void {
  if (!(k > 0)) return;
  const s = windSign(dir);
  const t = still || !Number.isFinite(time) ? 0 : time;
  const off = (((s * t * 220 - (Number.isFinite(camX) ? camX : 0) * 0.2) % STREAK_W) + STREAK_W) % STREAK_W;
  const a = g.globalAlpha;
  g.globalAlpha = a * Math.min(1, k);
  for (let x = off - STREAK_W; x < viewW; x += STREAK_W) {
    kanoStrip(g, slot(`streak${dir}`), `kanoStreak${dir}`, Math.round(x), WIND_LOOK.streakTop, STREAK_W + 14, STREAK_H, (cg) => paintStreaks(cg, s));
  }
  g.globalAlpha = a;
}

/** The soft "whoosh" while you are in a wind stretch (Sound on): low airy hiss, 0.9 s, played again while in it. */
export const KANO_WIND_SOUNDS: Readonly<Record<'windWhoosh', Recipe>> = {
  windWhoosh: {
    tones: [{ f: 150, len: 0.9, wave: 'sine', peak: 200, to: 130, vol: 0.012 }],
    hiss: [
      { len: 0.9, lp: 900, vol: 0.035 },
      { len: 0.55, at: 0.2, bp: 1500, vol: 0.012 },
    ],
  },
};
